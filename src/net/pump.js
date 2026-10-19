// Page side of the packet pump: starts the worker (its bundled source is inlined at build time) and relays its
// messages into the session.
import { relayClosed } from "../session/messages.js";

export function startPump(session, onControl) {
  const url = URL.createObjectURL(new Blob([__PUMP_WORKER_SOURCE__], { type: "text/javascript" }));
  const worker = new Worker(url, { name: "bo1-coop-pump" });
  worker.onmessage = ({ data: message }) => {
    if (message.type === "socket") {
      session.onSocket(message);
      if (message.state !== "open") relayClosed(session);
    } else if (message.type === "link") session.direct?.onLink(message.seat, message.open);
    else if (message.type === "control") onControl(session, message.message);
    else if (message.type === "stats") session.stats = message.stats;
  };
  worker.onerror = (event) => session.fail("workerFailed", event.message);
  worker.postMessage({ type: "connect", relay: session.relay, room: session.room, role: session.mode, guestId: session.guestId });
  return worker;
}

/** Sends a control message to the other player(s): over a direct link where one is open, else the relay. */
export function send(session, message) {
  session.pump?.postMessage({ type: "send", message });
}

export function postToPump(session, message, transfer = []) {
  session.pump?.postMessage(message, transfer);
}
