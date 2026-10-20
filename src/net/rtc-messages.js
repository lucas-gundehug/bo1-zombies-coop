// Signaling for direct links: the WebRTC offer, answer and ICE candidates players swap through the relay before a
// direct link exists. Only a guest offers and only the host answers; each attempt has a number `n`, so an answer or
// candidate from an attempt that was given up is recognized and dropped.
import { MAX_GUESTS } from "../../relay/src/protocol.js";

export const RTC_TYPES = Object.freeze(["rtc-offer", "rtc-answer", "rtc-ice"]);
/** A link sends its gathered candidates at most this often, in batches, to stay well under the relay's text limit. */
export const CANDIDATE_FLUSH_MS = 250;
/** A link not open this long after its offer is given up. */
export const CONNECT_TIMEOUT_MS = 8000;

export const MAX_SDP = 3000;
/** An rtc-ice message is kept to this many bytes of JSON, well under the relay's MAX_TEXT_BYTES (4096). */
export const MAX_ICE_JSON = 3500;
const MAX_CANDIDATES = 8;
export const MAX_CANDIDATE = 512;
const MAX_MID = 16;
const MAX_ATTEMPT = 1e6;
const ACCEPTS = { host: ["rtc-offer", "rtc-ice"], guest: ["rtc-answer", "rtc-ice"] };

const isSeat = (seat) => Number.isInteger(seat) && seat >= 1 && seat <= MAX_GUESTS;
const isText = (value, max) => typeof value === "string" && value.length >= 1 && value.length <= max;

function candidate(value) {
  if (!value || typeof value !== "object" || !isText(value.c, MAX_CANDIDATE)) return null;
  if (value.m !== null && !(typeof value.m === "string" && value.m.length <= MAX_MID)) return null;
  if (value.i !== null && !(Number.isInteger(value.i) && value.i >= 0 && value.i <= 15)) return null;
  return { c: value.c, m: value.m, i: value.i };
}

/**
 * A signaling message this side may act on, reduced to its known fields, or null. The host takes offers and
 * candidates from a guest seat (`from`, stamped by the relay); a guest takes answers and candidates.
 */
export function parseRtc(message, { role }) {
  if (!message || typeof message !== "object" || !ACCEPTS[role]?.includes(message.t)) return null;
  const { t, n } = message;
  if (!Number.isInteger(n) || n < 1 || n > MAX_ATTEMPT) return null;
  if (role === "host" && !isSeat(message.from)) return null;
  const out = { t, n };
  if (t === "rtc-ice") {
    if (!Array.isArray(message.cands) || message.cands.length < 1 || message.cands.length > MAX_CANDIDATES) return null;
    const cands = message.cands.map(candidate);
    if (cands.includes(null)) return null;
    out.cands = cands;
  } else {
    if (!isText(message.sdp, MAX_SDP)) return null;
    out.sdp = message.sdp;
  }
  if (role === "host") out.from = message.from;
  return out;
}

export function batchCandidates(list) {
  const batches = [];
  for (let i = 0; i < list.length; i += MAX_CANDIDATES) batches.push(list.slice(i, i + MAX_CANDIDATES));
  return batches;
}

/** How long a guest waits before its next attempt after `failures` failed ones in a row. */
export const retryDelay = (failures) => [5000, 15000, 30000][failures] ?? 60000;
