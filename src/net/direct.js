// Direct links between players (page side). A guest offers a WebRTC connection to the host through the relay; the
// host answers. Each connection's two data channels ("game": unordered, no retransmits, like UDP; "control": reliable)
// are handed to the pump worker as soon as they exist, and the worker sends over them while they are open
// (src/net/routes.js). Everything here is signaling and bookkeeping: no game data passes through the page.
import { validSeat } from "../session/session.js";
import { syncPresence } from "../session/messages.js";
import { postToPump, send } from "./pump.js";
import { CANDIDATE_FLUSH_MS, CONNECT_TIMEOUT_MS, MAX_CANDIDATE, MAX_ICE_JSON, MAX_SDP, parseRtc, retryDelay } from "./rtc-messages.js";

export const ICE_SERVERS = Object.freeze([{ urls: "stun:stun.cloudflare.com:3478" }, { urls: "stun:stun.l.google.com:19302" }]);

/** session.direct: one link per guest seat on the host, one link (seat 0) to the host on a guest. */
export function createDirect(session, { RTCPeerConnection = globalThis.RTCPeerConnection, now = Date.now } = {}) {
  // test/e2e.mjs sets __bo1CoopDirect = false on a page to make that player use the relay only.
  const enabled = globalThis.__bo1CoopDirect !== false && typeof RTCPeerConnection === "function";
  const hosting = () => session.mode === "host";
  const links = new Map(); // seat -> { n, pc, startedAt, open, remoteSet, waiting, gathered, flushedAt }
  let attempt = 0;
  let linkIds = 0; // tags each link handed to the worker, so a late report about a replaced link is recognized
  let failures = 0;
  let nextOfferAt = 0;

  function connect(seat, n) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS.map((server) => ({ ...server })) });
    const link = { seat, n, id: (linkIds += 1), pc, startedAt: now(), open: false, remoteSet: false, waiting: [], gathered: [], flushedAt: 0 };
    links.set(seat, link);
    const game = pc.createDataChannel("game", { negotiated: true, id: 1, ordered: false, maxRetransmits: 0 });
    const control = pc.createDataChannel("control", { negotiated: true, id: 2 });
    postToPump(session, { type: "link", seat, id: link.id, game, control }, [game, control]);
    pc.onicecandidate = ({ candidate }) => {
      // the other side would refuse a longer one (parseRtc)
      if (candidate?.candidate && candidate.candidate.length <= MAX_CANDIDATE) {
        link.gathered.push({ c: candidate.candidate, m: candidate.sdpMid ?? null, i: candidate.sdpMLineIndex ?? null });
      }
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(pc.connectionState)) fail(seat, link, `connection ${pc.connectionState}`);
    };
    return link;
  }

  function close(seat) {
    const link = links.get(seat);
    if (!link) return;
    links.delete(seat);
    link.pc.onicecandidate = link.pc.onconnectionstatechange = null;
    try {
      link.pc.close();
    } catch {
      // already closed
    }
    postToPump(session, { type: "unlink", seat, id: link.id });
    if (session.links.delete(seat)) syncPresence(session, seat);
  }

  /** Gives a link up. A guest tries again after a back-off; the host waits for the guest's next offer. */
  function fail(seat, link, why) {
    if (links.get(seat) !== link) return;
    session.note(`direct link ${seat} given up (${why})`);
    close(seat);
    if (!hosting()) {
      nextOfferAt = now() + retryDelay(failures);
      failures += 1;
    }
  }

  async function offer() {
    attempt += 1;
    const link = connect(0, attempt);
    try {
      const description = await link.pc.createOffer();
      await link.pc.setLocalDescription(description);
      // The offer as created, without candidates (they follow as rtc-ice); one the relay would refuse is not sent.
      if (description.sdp.length > MAX_SDP) throw new Error(`offer too long (${description.sdp.length})`);
      if (links.get(0) === link) send(session, { t: "rtc-offer", n: link.n, sdp: description.sdp });
    } catch (error) {
      fail(0, link, error?.message ?? error);
    }
  }

  async function answer({ n, sdp, from: seat }) {
    close(seat);
    const link = connect(seat, n);
    try {
      await link.pc.setRemoteDescription({ type: "offer", sdp });
      remoteReady(link);
      const description = await link.pc.createAnswer();
      await link.pc.setLocalDescription(description);
      if (description.sdp.length > MAX_SDP) throw new Error(`answer too long (${description.sdp.length})`);
      if (links.get(seat) === link) send(session, { t: "rtc-answer", n, sdp: description.sdp, to: seat });
    } catch (error) {
      fail(seat, link, error?.message ?? error);
    }
  }

  function remoteReady(link) {
    link.remoteSet = true;
    for (const candidate of link.waiting.splice(0)) addCandidate(link, candidate);
  }

  function addCandidate(link, { c, m, i }) {
    link.pc.addIceCandidate({ candidate: c, sdpMid: m, sdpMLineIndex: i }).catch(() => {});
  }

  /** Sends gathered candidates: up to 8 per message and MAX_ICE_JSON bytes, one message per CANDIDATE_FLUSH_MS. */
  function flushCandidates(link) {
    if (!link.gathered.length || now() - link.flushedAt < CANDIDATE_FLUSH_MS) return;
    const message = { t: "rtc-ice", n: link.n, cands: [], ...(hosting() ? { to: link.seat } : {}) };
    while (link.gathered.length && message.cands.length < 8) {
      message.cands.push(link.gathered[0]);
      if (message.cands.length > 1 && JSON.stringify(message).length > MAX_ICE_JSON) {
        message.cands.pop();
        break;
      }
      link.gathered.shift();
    }
    link.flushedAt = now();
    send(session, message);
  }

  return {
    onSignal(raw) {
      if (!enabled) return;
      const message = parseRtc(raw, { role: hosting() ? "host" : "guest" });
      if (!message) return;
      if (message.t === "rtc-offer") {
        answer(message);
        return;
      }
      const link = links.get(hosting() ? message.from : 0);
      if (!link || link.n !== message.n) return;
      if (message.t === "rtc-answer") {
        if (link.remoteSet) return;
        link.pc
          .setRemoteDescription({ type: "answer", sdp: message.sdp })
          .then(() => remoteReady(link))
          .catch((error) => fail(link.seat, link, error?.message ?? error));
      } else {
        for (const candidate of message.cands) {
          if (link.remoteSet) addCandidate(link, candidate);
          else link.waiting.push(candidate);
        }
      }
    },

    /** From the pump worker: both channels of link `id` opened, or one of them closed. */
    onLink(seat, open, id) {
      const link = links.get(seat);
      if (!link || link.id !== id) return; // about a link this page has replaced or given up already
      if (open) {
        link.open = true;
        failures = 0;
        session.links.set(seat, "direct");
        session.note(`direct link ${seat} open`);
        syncPresence(session, seat);
      } else {
        if (session.links.delete(seat)) syncPresence(session, seat);
        fail(seat, link, "channel closed");
      }
    },

    tick() {
      if (!enabled) return;
      for (const link of [...links.values()]) {
        if (!link.open && now() - link.startedAt > CONNECT_TIMEOUT_MS) fail(link.seat, link, "timeout");
        else flushCandidates(link);
      }
      if (!hosting() && session.relayPeer && validSeat(session.seat) && !links.has(0) && now() >= nextOfferAt) offer();
    },

    /** Test hook (test/e2e.mjs DROP_DIRECT_S): drops a link as a network failure would. */
    drop(seat) {
      const link = links.get(seat);
      if (link) fail(seat, link, "dropped");
    },

    state(seat) {
      if (!enabled) return "relay";
      if (session.links.get(seat) === "direct") return "direct";
      return links.has(seat) ? "connecting" : "relay";
    },
  };
}
