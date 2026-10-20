// Which path each message takes: a seat's direct link while both its data channels are open, the relay otherwise.
// Runs in the pump worker. On a guest, seat 0 is the link to the host.
import { isPeerMessage, MAX_GUESTS, parseControl } from "../../relay/src/protocol.js";
import { RTC_TYPES } from "./rtc-messages.js";

/** A direct link whose pings have gone unanswered this long is treated as down (the relay takes over) until one is. */
export const LINK_STALE_MS = 1500;

export function createRoutes() {
  return {
    /** seat -> { game, control }: the data channels the page handed over for that link */
    links: new Map(),
    /** Host: the guest seats the relay says are in the room. */
    relaySeats: new Set(),
  };
}

/**
 * Both channels open and, once the worker has heard from the link (`aliveAt`, the last answered ping), heard from it
 * within LINK_STALE_MS: a path that broke without closing (Wi-Fi roam, router drop) keeps its channels "open" for
 * about 30 s, and the relay carries the seat meanwhile.
 */
export function isDirect(routes, seat, now = performance.now()) {
  const link = routes.links.get(seat);
  if (link?.game?.readyState !== "open" || link?.control?.readyState !== "open") return false;
  return link.aliveAt === undefined || now - link.aliveAt < LINK_STALE_MS;
}

export const packetPath = (routes, seat, now = performance.now()) => (isDirect(routes, seat, now) ? "direct" : "relay");

/**
 * Where a control message goes. Signaling always takes the relay (it is what sets the direct link up). A host
 * broadcast reaches each guest once: directly, or through the relay addressed to that seat; with no direct seat it
 * stays one relay broadcast, as before direct links existed.
 */
export function controlRoutes(routes, message, hosting, now = performance.now()) {
  const relay = [{ via: "relay", message }];
  if (RTC_TYPES.includes(message.t)) return relay;
  if (!hosting) return isDirect(routes, 0, now) ? [{ via: "direct", seat: 0 }] : relay;
  if (message.to !== undefined) return isDirect(routes, message.to, now) ? [{ via: "direct", seat: message.to }] : relay;
  const direct = [...routes.links.keys()].filter((seat) => isDirect(routes, seat, now)).sort((a, b) => a - b);
  if (!direct.length) return relay;
  const viaRelay = [...routes.relaySeats].filter((seat) => !direct.includes(seat)).sort((a, b) => a - b);
  return [...direct.map((seat) => ({ via: "direct", seat })), ...viaRelay.map((seat) => ({ via: "relay", message: { ...message, to: seat } }))];
}

const isSeat = (seat) => Number.isInteger(seat) && seat >= 1 && seat <= MAX_GUESTS;

/**
 * A control message read from a direct link, or null. A peer may not send what only the relay sends (welcome, peer,
 * error), as the relay itself refuses (isPeerMessage); on the host the link's seat replaces any `from` or `seat` the
 * peer wrote, as the relay's stamp does.
 */
export function fromDirect(text, seat, hosting) {
  const message = parseControl(text);
  if (!isPeerMessage(message)) return null;
  if (hosting) {
    delete message.seat;
    message.from = seat;
  }
  return message;
}

/** Host: keeps `relaySeats` in step with the relay's own `welcome` and `peer` messages. */
export function relayPresence(routes, message) {
  if (message?.t === "welcome" && Array.isArray(message.guests)) {
    routes.relaySeats = new Set(message.guests.filter(isSeat));
  } else if (message?.t === "peer" && isSeat(message.seat)) {
    if (message.present) routes.relaySeats.add(message.seat);
    else routes.relaySeats.delete(message.seat);
  }
}
