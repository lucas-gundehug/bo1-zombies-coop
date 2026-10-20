// The map between players: the host forwards what its game script publishes, guests draw it. Control messages through
// send() (src/net/pump.js), so they take whichever path the co-op link uses.
//   { t: "mapp", p: [[n, x, y, z, yaw, room, s], ...] }                 per live reading, at most 4 a second
//   { t: "maps", slug, sig, doors: "0101", rooms: "110", box: [1], power: 0 }   when it changes, and every 5 s
import { MAP_SLUGS } from "../game/page.js";
import { send } from "../net/pump.js";
import { floorOf } from "./plan.js";
import { pushSample } from "./track.js";

const STATE_REPEAT_MS = 5000;
const MAX_PLAYERS = 4;
const SLUGS = Object.values(MAP_SLUGS);
const bitText = (bits) => bits.map((b) => (b ? "1" : "0")).join("");

/** Host: called every tick after the live data was read. */
export function sendMap(session, now) {
  const map = session.map;
  if (!session.peer) return;
  if (map.liveReads !== map.sentReads) {
    map.sentReads = map.liveReads;
    const p = [...map.live].filter(([, e]) => e.read === map.liveReads).map(([n, e]) => [n, e.x, e.y, e.z, e.yaw, e.room, e.s]);
    send(session, { t: "mapp", p });
  }
  const state = map.state;
  if (!state) return;
  const message = { t: "maps", slug: map.slug, sig: state.sig, doors: bitText(state.doors), rooms: bitText(state.rooms), box: state.box, power: state.power ? 1 : 0 };
  const key = JSON.stringify(message);
  if (key === map.sentStateKey && now - map.sentStateAt < STATE_REPEAT_MS) return;
  map.sentStateKey = key;
  map.sentStateAt = now;
  send(session, message);
}

const validEntry = (e) => Array.isArray(e) && e.length === 7 && e.every(Number.isFinite) && Number.isInteger(e[0]) && e[0] >= 1 && e[0] <= MAX_PLAYERS;
const bits = (text) => typeof text === "string" && /^[01]{0,256}$/.test(text);

/** Guest: a map message from the host. Anything malformed is ignored whole. */
export function onMapMessage(session, message) {
  const map = session.map;
  if (!map) return;
  const now = Date.now();
  if (message.t === "mapp") {
    if (!Array.isArray(message.p) || message.p.length > MAX_PLAYERS || !message.p.every(validEntry)) return;
    for (const [n, x, y, z, yaw, room, s] of message.p) {
      map.live.set(n, { x, y, z, yaw, room, s, floor: map.plan ? floorOf(map.plan, z, x, y) : 0, at: now });
      if (!map.tracks.has(n)) map.tracks.set(n, []);
      pushSample(map.tracks.get(n), now, x, y, yaw);
    }
  } else if (message.t === "maps") {
    const { slug, sig, doors, rooms, box, power } = message;
    if (!SLUGS.includes(slug) || typeof sig !== "string" || !bits(doors) || !bits(rooms)) return;
    if (!Array.isArray(box) || box.length > 8 || !box.every(Number.isInteger)) return;
    if (slug !== map.slug) return;
    map.state = { v: null, sig, doors: [...doors].map((c) => c === "1"), rooms: [...rooms].map((c) => c === "1"), box, power: power === 1, at: now };
    map.planOk = Boolean(map.plan) && sig === map.plan.sig;
  }
}
