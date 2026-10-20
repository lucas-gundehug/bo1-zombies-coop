// The host's side of the map: reads what the game script (src/cheats/gsc/_map.gsc) publishes, through the cheat
// bridge's console reads.
//   cheats_map_live    v=<state counter> p=<ent>,<x>,<y>,<z>,<yaw>,<room>,<s>;...   every 0.25 s (s: 0 alive, 1 downed,
//                      2 spectating; room: index into the plan's rooms, or -1)
//   cheats_map_state   sig=<sig> doors=<0/1 per door> rooms=<0/1 per room> box=<chest indices> power=<0|1>
//                      rewritten when it changes, and the counter goes up
import { askDvar } from "../cheats/bridge.js";
import { SLOT } from "../engine/builds.js";
import { funPlayers } from "../fun/fun.js";
import { currentZone, MAP_SLUGS, screen } from "../game/page.js";
import { floorOf } from "./plan.js";
import { planFor } from "./plans/index.js";
import { pushSample } from "./track.js";
import { sendMap } from "./net.js";

const LIVE_EVERY_MS = 250;
const BITS = /^[01]*$/;

export function parseLive(value) {
  const match = String(value).match(/^v=(\d+) p=(.*)$/);
  if (!match) return null;
  const players = [];
  for (const entry of match[2].split(";")) {
    const n = entry.split(",").map(Number);
    if (n.length !== 7 || !n.every(Number.isInteger)) continue;
    const [ent, x, y, z, yaw, room, s] = n;
    players.push({ ent, x, y, z, yaw, room, s });
  }
  return { v: Number(match[1]), players };
}

export function parseMapState(value) {
  const raw = Object.fromEntries(
    String(value)
      .split(" ")
      .filter((pair) => pair.includes("="))
      .map((pair) => [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)]),
  );
  if (!raw.sig || !BITS.test(raw.doors ?? "x") || !BITS.test(raw.rooms ?? "x")) return null;
  const bits = (text) => [...text].map((c) => c === "1");
  const box = (raw.box ?? "").split(",").filter(Boolean).map(Number).filter(Number.isInteger);
  return { sig: raw.sig, doors: bits(raw.doors), rooms: bits(raw.rooms), box, power: raw.power === "1" };
}

/**
 * Host: who is in the game, [{ slot, n, name }] (slot = entity number, n = lobby number). Fun mode's list, plus guests
 * whose connection is coming back (their player stays in the game meanwhile, so their dot stays too).
 */
export function mapPlayers(session) {
  const players = funPlayers(session);
  for (const g of session.guests?.values() ?? []) {
    if (g.present || g.slot?.state !== SLOT.reconnecting || players.some((p) => p.slot === g.slot.slot)) continue;
    players.push({ slot: g.slot.slot, n: g.seat + 1, name: g.state?.name || `Player ${g.seat + 1}` });
  }
  return players;
}

/** Takes one cheats_map_* dvar the console printed (the cheat bridge hands them over). */
export function onMapLine(session, name, value) {
  const map = session.map;
  if (!map) return;
  const now = Date.now();
  if (name === "cheats_map_live") {
    const live = parseLive(value);
    if (!live) return;
    const numbers = new Map(mapPlayers(session).map((p) => [p.slot, p.n]));
    map.liveReads += 1;
    for (const p of live.players) {
      const n = numbers.get(p.ent);
      if (!n) continue;
      map.live.set(n, { x: p.x, y: p.y, z: p.z, yaw: p.yaw, room: p.room, s: p.s, floor: map.plan ? floorOf(map.plan, p.z, p.x, p.y) : 0, at: now, read: map.liveReads });
      if (!map.tracks.has(n)) map.tracks.set(n, []);
      pushSample(map.tracks.get(n), now, p.x, p.y, p.yaw);
    }
    map.liveV = live.v;
    // A lower counter is a restarted game (game over in the same page): its state is new, not old.
    if (map.state?.v !== live.v) askDvar(session, "cheats_map_state");
  } else if (name === "cheats_map_state") {
    const state = parseMapState(value);
    if (!state) return;
    map.state = { ...state, v: map.liveV, at: now };
    map.planOk = Boolean(map.plan) && state.sig === map.plan.sig;
  }
}

/** Called every tick: follows the map being played, and on the host asks the game script for the live data. */
export function mapTick(session, now, { playing = screen() === "playing", slug = currentSlugOf(session) } = {}) {
  const map = session.map;
  if (!map) return;
  if (slug !== map.slug) {
    Object.assign(map, { slug, plan: planFor(slug), state: null, planOk: false, liveV: null });
    map.live.clear();
    map.tracks.clear();
  }
  if (!playing) {
    // out of the game (game over, back to the menu): what it showed belongs to that game, and a restart starts clean
    if (map.live.size || map.state) Object.assign(map, { state: null, planOk: false, liveV: null });
    map.live.clear();
    map.tracks.clear();
    return;
  }
  if (session.mode === "guest" || !session.cheats?.ok) return;
  if (now - map.lastAskAt >= LIVE_EVERY_MS) {
    map.lastAskAt = now;
    askDvar(session, "cheats_map_live");
  }
  if (session.mode === "host") sendMap(session, now);
}

const currentSlugOf = (session) => (session.mode === "guest" ? (session.hostInfo?.slug ?? null) : (MAP_SLUGS[session.zone ?? currentZone()] ?? null));
