// What the map panel draws, worked out from the map state (src/map/state.js) once per frame. The renderer
// (src/map/overlay.js) only draws what this returns.
import { PLAYER_COLORS } from "../ui/card.js";
import { mapPlayers } from "./live.js";
import { floorOf } from "./plan.js";
import { roomName } from "./names.js";
import { RENDER_DELAY_MS, sampleTrack } from "./track.js";
import { myView } from "./view.js";

const GONE_MS = 2000; // a player not heard from this long has left
const NO_DATA_MS = 5000; // the map was opened this long ago and nothing came

const text = (value) => (typeof value === "string" ? value : value == null ? "" : String(value));

/** Player number -> name: the host knows who is in its game, a guest reads the host's lobby. Names come from other
 * players' games, so anything that is not text is made text. */
function names(session) {
  if (session.mode !== "guest") return new Map(mapPlayers(session).map((p) => [p.n, text(p.name)]));
  const known = new Map((session.lobby?.players ?? []).map((p) => [p.n, text(p?.name)]));
  if (Number.isInteger(session.seat)) known.set(session.seat + 1, text(session.name));
  return known;
}

const myNumber = (session) => (session.mode === "guest" ? session.seat + 1 : 1);

/**
 * `mine` is my own player this frame ({ x, y, z, yaw }, src/map/view.js), or null where it can't be read: then my dot
 * glides between the game script's samples like everyone else's.
 */
export function mapModel(session, now, { mine = myView(session) } = {}) {
  const map = session.map;
  const plan = map.plan;
  if (!plan) return { status: "noPlan" };
  const me = myNumber(session);
  const known = names(session);
  const players = [];
  for (const [n, entry] of map.live) {
    if (now - entry.at > GONE_MS) {
      map.live.delete(n);
      map.tracks.delete(n);
      continue;
    }
    if (entry.s === 2) continue;
    const name = known.get(n) || "";
    let at = sampleTrack(map.tracks.get(n) ?? [], now - RENDER_DELAY_MS) ?? { x: entry.x, y: entry.y, yaw: entry.yaw };
    let floor = entry.floor;
    if (n === me && mine) {
      at = { x: mine.x, y: mine.y, yaw: mine.yaw };
      floor = floorOf(plan, mine.z, mine.x, mine.y);
    }
    players.push({ n, name, letter: (name.trim()[0] ?? String(n)).toUpperCase(), color: PLAYER_COLORS[n - 1] ?? PLAYER_COLORS[0], ...at, floor, room: entry.room, downed: entry.s === 1, me: n === me });
  }
  players.sort((a, b) => a.n - b.n);
  const myDot = players.find((p) => p.me);
  if (!players.length && !map.state) {
    const waited = map.openedAt != null && now - map.openedAt > NO_DATA_MS;
    return { status: waited ? "noData" : "waiting" };
  }
  const floor = myDot?.floor ?? 0;
  // a room index only means something in the plan the game was captured with
  const room = map.planOk && myDot && myDot.room >= 0 && plan.rooms[myDot.room] ? myDot.room : -1;
  const state = map.planOk ? map.state : null;
  let boxIndex = -1;
  return {
    status: "ok",
    room: room >= 0 ? roomName(plan.slug, plan.rooms[room].id) : null,
    floor,
    floors: plan.floors.map((f, i) => ({ name: f.name, current: i === floor, others: i === floor ? [] : players.filter((p) => !p.me && p.floor === i).map((p) => p.letter) })),
    rooms: plan.rooms.map((r, i) => ({ index: i, name: roomName(plan.slug, r.id), open: state ? Boolean(state.rooms[i]) : null, current: i === room })),
    doors: state ? plan.doors.flatMap((d, i) => (state.doors[i] ? [] : [{ index: i, cost: d.cost, kind: d.kind, at: d.at }])) : [],
    pois: plan.pois.map((p) => {
      if (p.kind === "box") boxIndex += 1;
      const active = p.kind === "box" ? Boolean(state?.box.includes(boxIndex)) : p.kind === "power" ? Boolean(state?.power) : false;
      return { kind: p.kind, id: p.id, at: p.at, active };
    }),
    players: players.map(({ n, letter, color, x, y, yaw, floor: f, downed, me: isMe }) => ({ n, letter, color, x, y, yaw, floor: f, downed, me: isMe })),
    legend: players.map((p) => ({ letter: p.letter, name: p.name, color: p.color })),
    stale: Boolean(map.state && !map.planOk),
  };
}
