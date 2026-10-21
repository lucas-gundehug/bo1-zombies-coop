// Unit tests for the in-game map's pure parts (no browser, no game).
//   node test/map.test.mjs
import assert from "node:assert/strict";
import { fitView, floorOf, toScreen, validPlan } from "../src/map/plan.js";
import { createMap } from "../src/map/state.js";
import { iconsNeeded, mapTick, onMapLine, parseLive, parseMapState } from "../src/map/live.js";
import { createBridge, onCheatsLine } from "../src/cheats/bridge.js";
import { SLOT } from "../src/engine/builds.js";
import { pushSample, sampleTrack } from "../src/map/track.js";
import { mapModel } from "../src/map/model.js";
import { ROOMS, roomName } from "../src/map/names.js";
import { PLAYER_COLORS } from "../src/ui/card.js";
import { onMapMessage } from "../src/map/net.js";
import { onMapKey } from "../src/map/hotkey.js";
import { buildPlan } from "../scripts/plan-build.mjs";
import { decodeDxt, ICON_FILES, parseIwi, zipEntries } from "../src/map/icons.js";
import { minimapActions, minimapCanvasSize, minimapSettingBlocks, minimapNorth, minimapPlace, minimapTurn, minimapVisible } from "../src/map/minimap.js";
import { planFor } from "../src/map/plans/index.js";
import { FLOORS as FLOOR_TABLE } from "../src/map/names.js";
import { myView, viewAddresses } from "../src/map/view.js";

const KNOWN_BUILD = "42be1c35025afa61ed1f0fc4558ca15c45c49b37dfdc458d3ebbe30f8c958036";
import { MAP_SLUGS } from "../src/game/page.js";

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

/** A small two-floor plan: a long hall downstairs (room 0), a side room (1), a room upstairs (2). */
function fixturePlan() {
  return {
    v: 1,
    slug: "kino",
    sig: "z3d2",
    floors: [
      { name: "Ground floor", below: 120 },
      { name: "Upstairs", below: null },
    ],
    rooms: [
      { id: "foyer_zone", label: [0, 500, 250], rects: [[0, 0, 0, 1000, 500]] },
      { id: "side_zone", label: [0, 1200, 250], rects: [[0, 1000, 0, 1400, 500]] },
      { id: "balcony_zone", label: [1, 250, 250], rects: [[1, 0, 0, 500, 500]] },
    ],
    doors: [
      { kind: "door", cost: 1000, at: [0, 1000, 250], rooms: [0, 1] },
      { kind: "debris", cost: 750, at: [1, 250, 0], rooms: [0, 2] },
    ],
    pois: [
      { kind: "perk", id: "specialty_armorvest", at: [0, 100, 100] },
      { kind: "box", id: null, at: [0, 900, 400] },
    ],
  };
}

/** A one-floor plan whose only room is `w` × `h` world units. */
const boxPlan = (w, h) => ({
  v: 1,
  slug: "nacht",
  sig: "z1d0",
  floors: [{ name: "Ground floor", below: null }],
  rooms: [{ id: "start_zone", label: [0, w / 2, h / 2], rects: [[0, 0, 0, w, h]] }],
  doors: [],
  pois: [],
});

test("floorOf picks the floor for a feet height", () => {
  const plan = fixturePlan();
  assert.equal(floorOf(plan, 0), 0);
  assert.equal(floorOf(plan, 119), 0);
  assert.equal(floorOf(plan, 200), 1);
  assert.equal(floorOf(boxPlan(10, 10), -5000), 0);
  assert.equal(floorOf(boxPlan(10, 10), 5000), 0);
});

test("a floor with an area only takes points inside it (Moon's No Man's Land)", () => {
  const plan = boxPlan(100, 100);
  plan.floors = [
    { name: "No Man's Land", below: null, area: [10000, -20000, 20000, -10000] },
    { name: "Lower", below: -250 },
    { name: "Upper", below: null },
  ];
  assert.equal(floorOf(plan, -600, 14000, -14500), 0);
  assert.equal(floorOf(plan, -600, 0, 3000), 1);
  assert.equal(floorOf(plan, 50, 0, 3000), 2);
  assert.equal(validPlan(plan), true);
  plan.floors[0].area = [1, 2, 3];
  assert.equal(validPlan(plan), false);
});

test("validPlan accepts a good plan", () => {
  assert.equal(validPlan(fixturePlan()), true);
  assert.equal(validPlan(boxPlan(100, 100)), true);
});

test("validPlan rejects a door naming a room past the end", () => {
  const plan = fixturePlan();
  plan.doors[0].rooms = [0, 3];
  assert.equal(validPlan(plan), false);
});

test("validPlan rejects a rect with 4 numbers", () => {
  const plan = fixturePlan();
  plan.rooms[1].rects = [[0, 1000, 0, 1400]];
  assert.equal(validPlan(plan), false);
});

test("validPlan rejects what is not a plan", () => {
  assert.equal(validPlan(null), false);
  assert.equal(validPlan({}), false);
  assert.equal(validPlan({ ...fixturePlan(), floors: [] }), false);
  const plan = fixturePlan();
  plan.rooms[2].rects = [[2, 0, 0, 500, 500]]; // floor 2 does not exist
  assert.equal(validPlan(plan), false);
});

test("fitView keeps a wide floor unrotated in a wide box", () => {
  const view = fitView(boxPlan(2000, 500), 0, 800, 600, 0);
  assert.equal(view.rotate, 0);
  assert.ok(Math.abs(view.scale - 0.4) < 1e-9);
});

test("fitView turns a tall floor a quarter in a wide box", () => {
  const view = fitView(boxPlan(500, 2000), 0, 800, 600, 0);
  assert.equal(view.rotate, 90);
  assert.ok(Math.abs(view.scale - 0.4) < 1e-9);
});

test("fitView puts every corner of the floor inside the box", () => {
  for (const [w, h] of [
    [2000, 500],
    [500, 2000],
  ]) {
    const plan = boxPlan(w, h);
    const view = fitView(plan, 0, 800, 600, 20);
    for (const [x, y] of [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ]) {
      const [sx, sy] = toScreen(view, x, y);
      assert.ok(sx >= 20 - 1e-6 && sx <= 780 + 1e-6, `x ${sx} for ${w}x${h}`);
      assert.ok(sy >= 20 - 1e-6 && sy <= 580 + 1e-6, `y ${sy} for ${w}x${h}`);
    }
  }
});

test("north is up on an unrotated map", () => {
  const view = fitView(boxPlan(2000, 500), 0, 800, 600, 0);
  const [, south] = toScreen(view, 100, 0);
  const [, north] = toScreen(view, 100, 400);
  assert.ok(north < south);
  const [west] = toScreen(view, 0, 100);
  const [east] = toScreen(view, 1000, 100);
  assert.ok(east > west);
});

test("fitView uses only the asked floor's rooms", () => {
  const plan = fixturePlan();
  const view = fitView(plan, 1, 800, 600, 0); // upstairs is 500 x 500
  assert.ok(Math.abs(view.scale - 1.2) < 1e-9);
});

// ---- live data on the host (src/map/live.js) ----

/** A host session in a game: the host (slot 0) and one guest in slot 1 (seat 1, player 2). */
function hostSession(plan = fixturePlan()) {
  const session = {
    mode: "host",
    name: "Lucas",
    cheats: { ok: true },
    fun: { queue: [] },
    guests: new Map([[1, { seat: 1, present: true, slot: { slot: 1, state: SLOT.active }, state: { name: "jonas" } }]]),
    map: createMap(),
  };
  session.map.slug = plan.slug;
  session.map.plan = plan;
  return session;
}

test("parseLive reads the version and every player", () => {
  const live = parseLive("v=3 p=0,100,-200,64,90,2,0;1,5,6,7,-45,-1,1");
  assert.equal(live.v, 3);
  assert.deepEqual(live.players, [
    { ent: 0, x: 100, y: -200, z: 64, yaw: 90, room: 2, s: 0 },
    { ent: 1, x: 5, y: 6, z: 7, yaw: -45, room: -1, s: 1 },
  ]);
  assert.equal(parseLive("garbage"), null);
  assert.deepEqual(parseLive("v=4 p=0,1,2,3;1,5,6,7,-45,-1,1").players.map((p) => p.ent), [1]);
  assert.deepEqual(parseLive("v=5 p=").players, []);
});

test("parseMapState reads doors, rooms, box and power", () => {
  assert.deepEqual(parseMapState("sig=z3d2 doors=01 rooms=110 box=1 power=0"), { sig: "z3d2", doors: [false, true], rooms: [true, true, false], box: [1], power: false });
  assert.deepEqual(parseMapState("sig=z1d0 doors= rooms=1 box=0,3 power=1"), { sig: "z1d0", doors: [], rooms: [true], box: [0, 3], power: true });
  assert.equal(parseMapState("nothing here"), null);
});

test("a guest who is reconnecting keeps their dot", () => {
  const session = hostSession();
  Object.assign(session.guests.get(1), { present: false, slot: { slot: 1, state: SLOT.reconnecting } });
  onMapLine(session, "cheats_map_live", "v=1 p=0,100,-200,64,90,2,0;1,5,6,7,-45,0,0");
  assert.equal(session.map.live.get(2)?.x, 5);
  const model = mapModel(session, Date.now(), { mine: { x: 100, y: -200, z: 64, yaw: 90 } });
  assert.deepEqual(
    model.players.map((p) => [p.n, p.letter]),
    [
      [1, "L"],
      [2, "J"],
    ],
  );
});

test("a seat whose player left the game has no dot", () => {
  const session = hostSession();
  Object.assign(session.guests.get(1), { present: false, slot: null });
  onMapLine(session, "cheats_map_live", "v=1 p=0,100,-200,64,90,2,0;1,5,6,7,-45,0,0");
  assert.equal(session.map.live.has(2), false);
});

test("live samples are stored under each player's number", () => {
  const session = hostSession();
  onMapLine(session, "cheats_map_live", "v=1 p=0,100,-200,64,90,2,0;1,5,6,200,-45,0,1;3,1,1,1,0,0,0");
  assert.deepEqual([...session.map.live.keys()].sort(), [1, 2]);
  const guest = session.map.live.get(2);
  assert.equal(guest.room, 0);
  assert.equal(guest.s, 1);
  assert.equal(guest.floor, 1);
  assert.equal(session.map.live.get(1).floor, 0);
});

test("a state with the plan's sig makes the plan usable, another sig does not", () => {
  const session = hostSession();
  onMapLine(session, "cheats_map_live", "v=1 p=0,100,-200,64,90,2,0");
  onMapLine(session, "cheats_map_state", "sig=z3d2 doors=01 rooms=110 box=1 power=0");
  assert.equal(session.map.planOk, true);
  assert.equal(session.map.state.v, 1);
  onMapLine(session, "cheats_map_state", "sig=z3d3 doors=011 rooms=110 box=1 power=0");
  assert.equal(session.map.planOk, false);
});

test("a new live version asks for the state once", () => {
  const session = hostSession();
  onMapLine(session, "cheats_map_live", "v=1 p=0,100,-200,64,90,2,0");
  assert.deepEqual(session.fun.queue, ["cheats_map_state"]);
  onMapLine(session, "cheats_map_state", "sig=z3d2 doors=01 rooms=110 box=1 power=0");
  session.fun.queue.length = 0;
  onMapLine(session, "cheats_map_live", "v=1 p=0,100,-200,64,90,2,0");
  assert.deepEqual(session.fun.queue, []);
  onMapLine(session, "cheats_map_live", "v=2 p=0,100,-200,64,90,2,0");
  assert.deepEqual(session.fun.queue, ["cheats_map_state"]);
});

test("after a restart (lower version) the next state replaces the old one", () => {
  const session = hostSession();
  onMapLine(session, "cheats_map_live", "v=7 p=0,100,-200,64,90,2,0");
  onMapLine(session, "cheats_map_state", "sig=z3d2 doors=11 rooms=111 box=1 power=1");
  session.fun.queue.length = 0;
  onMapLine(session, "cheats_map_live", "v=0 p=0,100,-200,64,90,2,0");
  assert.deepEqual(session.fun.queue, ["cheats_map_state"]);
  onMapLine(session, "cheats_map_state", "sig=z3d2 doors=00 rooms=100 box=0 power=0");
  assert.deepEqual(session.map.state.doors, [false, false]);
  assert.equal(session.map.state.v, 0);
});

test("mapTick asks for the live data at most every 250 ms", () => {
  const session = hostSession();
  const tick = (now) => mapTick(session, now, { playing: true, slug: "kino" });
  tick(1000);
  tick(1100);
  tick(1249);
  assert.deepEqual(session.fun.queue, ["cheats_map_live"]);
  session.fun.queue.length = 0;
  tick(1250);
  assert.deepEqual(session.fun.queue, ["cheats_map_live"]);
});

test("mapTick asks nothing on a guest, without the script, or outside a game", () => {
  const guest = hostSession();
  guest.mode = "guest";
  mapTick(guest, 1000, { playing: true, slug: "kino" });
  const noScript = hostSession();
  noScript.cheats.ok = false;
  mapTick(noScript, 1000, { playing: true, slug: "kino" });
  const menu = hostSession();
  mapTick(menu, 1000, { playing: false, slug: "kino" });
  assert.deepEqual([guest.fun.queue, noScript.fun.queue, menu.fun.queue], [[], [], []]);
});

test("cheats_map_ lines reach the map through the cheat bridge", () => {
  const session = hostSession();
  session.cheats = { ...createBridge(), ok: true };
  onCheatsLine(session, '"cheats_map_live" is: "v=1 p=0,100,-200,64,90,2,0^7" default: "^7"');
  assert.equal(session.map.live.get(1).room, 2);
});

// ---- gliding tracks and the model the panel draws (src/map/track.js, src/map/model.js) ----

test("sampleTrack glides between samples and turns the short way round", () => {
  const track = [];
  pushSample(track, 0, 0, 0, 350);
  pushSample(track, 250, 100, 0, 10);
  const mid = sampleTrack(track, 125);
  assert.ok(Math.abs(mid.x - 50) < 1e-9);
  assert.ok(Math.abs(mid.yaw % 360) < 1e-9);
  assert.deepEqual(sampleTrack(track, 400), { x: 100, y: 0, yaw: 10 });
  assert.deepEqual(sampleTrack(track, -50), { x: 0, y: 0, yaw: 350 });
  assert.equal(sampleTrack([], 100), null);
});

test("a track keeps its last 8 samples", () => {
  const track = [];
  for (let i = 0; i < 12; i += 1) pushSample(track, i * 250, i, 0, 0);
  assert.equal(track.length, 8);
  assert.equal(track[0].x, 4);
});

test("onMapLine feeds the gliding tracks", () => {
  const session = hostSession();
  onMapLine(session, "cheats_map_live", "v=1 p=1,5,6,7,-45,0,0");
  onMapLine(session, "cheats_map_live", "v=1 p=1,15,6,7,-45,0,0");
  assert.deepEqual(session.map.tracks.get(2).map((s) => s.x), [5, 15]);
});

/** A host session with the host (n 1) and Jonas (n 2) both seen just now, and a matching state. */
function modelSession(now) {
  const session = hostSession();
  session.map.live.set(1, { x: 100, y: 100, z: 50, yaw: 90, room: 0, s: 0, floor: 0, at: now });
  session.map.live.set(2, { x: 1100, y: 200, z: 50, yaw: 0, room: 1, s: 0, floor: 0, at: now });
  pushSample((session.map.tracks.set(2, []), session.map.tracks.get(2)), now - 500, 1000, 200, 0);
  pushSample(session.map.tracks.get(2), now - 250, 1100, 200, 0);
  session.map.state = { v: 1, sig: "z3d2", doors: [false, true], rooms: [true, false, false], box: [0], power: false, at: now };
  session.map.planOk = true;
  return session;
}
const MINE = { x: 120, y: 130, z: 50, yaw: 45 };

test("mapModel draws each player with their colour and first letter; mine from my camera", () => {
  const now = 100000;
  const model = mapModel(modelSession(now), now, { mine: MINE });
  assert.equal(model.status, "ok");
  const [me, jonas] = model.players;
  assert.deepEqual([me.n, me.letter, me.color, me.me, me.x, me.y, me.yaw], [1, "L", PLAYER_COLORS[0], true, 120, 130, 45]);
  assert.deepEqual([jonas.n, jonas.letter, jonas.color, jonas.me], [2, "J", PLAYER_COLORS[1], false]);
  assert.equal(model.room, "Lobby"); // kino has a name table: foyer_zone is the Lobby
  assert.deepEqual(model.rooms.map((r) => r.name), ["Lobby", "Side", "Balcony"]);
  assert.deepEqual(model.legend.map((l) => l.name), ["Lucas", "jonas"]);
});

test("others are drawn 400 ms in the past, between two samples", () => {
  const now = 100000;
  const jonas = mapModel(modelSession(now), now, { mine: MINE }).players[1];
  assert.ok(Math.abs(jonas.x - 1040) < 1e-9, `x ${jonas.x}`); // 400 ms back from now: 0.4 of the way from 1000 to 1100
});

test("my dot is where I am this frame, on the floor my feet are on", () => {
  const now = 100000;
  const me = mapModel(modelSession(now), now, { mine: { x: 300, y: 250, z: 200, yaw: -30 } }).players[0];
  assert.deepEqual([me.x, me.y, me.yaw, me.floor], [300, 250, -30, 1]); // z 200 is above the ground floor's 120
});

test("where my view can't be read, my dot glides between the script's samples like everyone's", () => {
  const now = 100000;
  const session = modelSession(now);
  session.map.tracks.set(1, []);
  pushSample(session.map.tracks.get(1), now - 500, 0, 100, 0);
  pushSample(session.map.tracks.get(1), now - 250, 100, 100, 90);
  const me = mapModel(session, now, { mine: null }).players[0];
  assert.ok(Math.abs(me.x - 40) < 1e-9 && Math.abs(me.yaw - 36) < 1e-9, `${me.x} ${me.yaw}`);
  assert.equal(me.floor, 0);
});

test("myView reads my position and facing from the engine's memory where the build is known", () => {
  const at = viewAddresses(KNOWN_BUILD);
  const buffer = new ArrayBuffer(at.eye + 64);
  const f32 = new Float32Array(buffer);
  f32.set([10, 20, 30, 0, 0, 0], at.feet >> 2);
  f32.set([11.5, 22.25, 90, 5, -135.5, 0], at.eye >> 2);
  const session = { hash: KNOWN_BUILD, engine: { buffer } };
  assert.deepEqual(myView(session), { x: 11.5, y: 22.25, z: 30, yaw: -135.5 });
  f32[(at.eye >> 2) + 4] = 60; // the next frame sees the new facing
  assert.equal(myView(session).yaw, 60);
  assert.equal(myView({ hash: "another build", engine: { buffer } }), null);
  assert.equal(myView({ hash: KNOWN_BUILD }), null, "before the engine runs");
  assert.equal(myView({ hash: KNOWN_BUILD, engine: { buffer: new ArrayBuffer(at.eye + 64) } }), null, "all zero: no game yet");
});

test("a downed player gets a ring, a spectator is left out", () => {
  const now = 100000;
  const session = modelSession(now);
  session.map.live.get(2).s = 1;
  assert.equal(mapModel(session, now, { mine: MINE }).players[1].downed, true);
  session.map.live.get(2).s = 2;
  const model = mapModel(session, now, { mine: MINE });
  assert.deepEqual(model.players.map((p) => p.n), [1]);
  assert.deepEqual(model.legend.map((l) => l.letter), ["L"]);
});

test("a player not heard from for 2 s is dropped with their track; a new one shows up", () => {
  const now = 100000;
  const session = modelSession(now);
  session.map.live.get(2).at = now - 2100;
  const model = mapModel(session, now, { mine: MINE });
  assert.deepEqual(model.players.map((p) => p.n), [1]);
  assert.equal(session.map.tracks.has(2), false);
  onMapLine(session, "cheats_map_live", "v=1 p=0,100,100,50,90,0,0;1,1100,200,50,0,1,0");
  assert.deepEqual(mapModel(session, Date.now(), { mine: MINE }).players.map((p) => p.n), [1, 2]);
});

test("closed doors and room states come from the state", () => {
  const now = 100000;
  const model = mapModel(modelSession(now), now, { mine: MINE });
  assert.deepEqual(
    model.doors.map((d) => d.index),
    [0],
  );
  assert.equal(model.doors[0].cost, 1000);
  assert.deepEqual(
    model.rooms.map((r) => [r.open, r.current]),
    [
      [true, true],
      [false, false],
      [false, false],
    ],
  );
  const box = model.pois.find((p) => p.kind === "box");
  assert.equal(box.active, true);
  assert.equal(model.stale, false);
});

test("with a plan that doesn't match, players stay but doors and rooms are hidden", () => {
  const now = 100000;
  const session = modelSession(now);
  session.map.planOk = false;
  const model = mapModel(session, now, { mine: MINE });
  assert.deepEqual(model.doors, []);
  assert.ok(model.rooms.every((r) => r.open === null));
  assert.equal(model.stale, true);
  assert.equal(model.players.length, 2);
});

test("with a plan that doesn't match, the room you're in is not named or outlined", () => {
  const now = 100000;
  const session = modelSession(now);
  session.map.planOk = false;
  const model = mapModel(session, now, { mine: MINE });
  assert.equal(model.room, null);
  assert.ok(model.rooms.every((r) => !r.current));
});

test("a name that is not text (from another player's game) still draws", () => {
  const now = 100000;
  const session = modelSession(now);
  session.guests.get(1).state.name = 42;
  const model = mapModel(session, now, { mine: MINE });
  assert.equal(model.players[1].letter, "4");
  session.guests.get(1).state.name = { evil: true };
  assert.equal(typeof mapModel(session, now, { mine: MINE }).players[1].letter, "string");
  const guest = modelSession(now);
  Object.assign(guest, { mode: "guest", seat: 1, name: "jonas", lobby: { players: [{ n: 1, name: ["x"] }] } });
  assert.equal(typeof mapModel(guest, now, { mine: MINE }).players[0].letter, "string");
});

test("leaving the game forgets its players and state (a restart starts clean)", () => {
  const session = hostSession();
  onMapLine(session, "cheats_map_live", "v=1 p=0,100,-200,64,90,2,0");
  onMapLine(session, "cheats_map_state", "sig=z3d2 doors=01 rooms=110 box=1 power=0");
  mapTick(session, 1000, { playing: false, slug: "kino" });
  assert.equal(session.map.live.size, 0);
  assert.equal(session.map.tracks.size, 0);
  assert.equal(session.map.state, null);
  session.fun.queue.length = 0;
  // the new game's first reading has v=1 again: its state must be asked for, not taken as already known
  onMapLine(session, "cheats_map_live", "v=1 p=0,100,-200,64,90,2,0");
  assert.deepEqual(session.fun.queue, ["cheats_map_state"]);
});

test("no plan, waiting, and no data", () => {
  const now = 100000;
  const noPlan = modelSession(now);
  noPlan.map.plan = null;
  assert.equal(mapModel(noPlan, now, { mine: MINE }).status, "noPlan");
  const empty = hostSession();
  empty.map.openedAt = now - 1000;
  assert.equal(mapModel(empty, now, { mine: MINE }).status, "waiting");
  empty.map.openedAt = now - 5001;
  assert.equal(mapModel(empty, now, { mine: MINE }).status, "noData");
});

test("friends on another floor show on that floor's button", () => {
  const now = 100000;
  const session = modelSession(now);
  session.map.live.get(2).floor = 1;
  const model = mapModel(session, now, { mine: MINE });
  assert.deepEqual(
    model.floors.map((f) => [f.name, f.current, f.others]),
    [
      ["Ground floor", true, []],
      ["Upstairs", false, ["J"]],
    ],
  );
});

test("a guest sees itself as me, with names from the host's lobby", () => {
  const now = 100000;
  const session = modelSession(now);
  Object.assign(session, { mode: "guest", seat: 1, name: "jonas", lobby: { players: [{ n: 1, name: "Lucas" }, { n: 2, name: "" }] } });
  const model = mapModel(session, now, { mine: MINE });
  assert.deepEqual(
    model.players.map((p) => [p.n, p.letter, p.me]),
    [
      [1, "L", false],
      [2, "J", true],
    ],
  );
});

test("every room on every map has a name in the table", () => {
  for (const slug of Object.values(MAP_SLUGS)) {
    const unnamed = planFor(slug).rooms.filter((r) => !ROOMS[slug]?.[r.id]).map((r) => r.id);
    assert.deepEqual(unnamed, [], slug);
  }
});

test("roomName reads a technical name when the table has none", () => {
  assert.equal(roomName("nacht", "foyer_zone"), "Foyer");
  assert.equal(roomName("nacht", "west_balcony_zone"), "West balcony");
  assert.equal(roomName("nacht", "labs_zone3"), "Labs 3");
});

// ---- the map to guests (src/map/net.js) ----

/** A host session with a guest in the room, collecting what it sends. */
function sendingSession() {
  const session = hostSession();
  session.peer = true;
  session.sent = [];
  session.pump = { postMessage: (m) => m.type === "send" && session.sent.push(m.message) };
  return session;
}
const sentOf = (session, t) => session.sent.filter((m) => m.t === t);

test("the host sends positions per reading, and the state once until it changes", () => {
  const session = sendingSession();
  const tick = (now) => mapTick(session, now, { playing: true, slug: "kino" });
  onMapLine(session, "cheats_map_live", "v=1 p=0,100,-200,64,90,2,0;1,5,6,7,-45,0,1");
  onMapLine(session, "cheats_map_state", "sig=z3d2 doors=01 rooms=110 box=1 power=0");
  tick(1000);
  tick(1100); // no new reading: nothing new
  onMapLine(session, "cheats_map_live", "v=1 p=0,110,-200,64,90,2,0;1,5,6,7,-45,0,1");
  tick(1250);
  assert.equal(sentOf(session, "mapp").length, 2);
  assert.deepEqual(sentOf(session, "mapp")[1].p, [
    [1, 110, -200, 64, 90, 2, 0],
    [2, 5, 6, 7, -45, 0, 1],
  ]);
  assert.deepEqual(sentOf(session, "maps"), [{ t: "maps", slug: "kino", sig: "z3d2", doors: "01", rooms: "110", box: [1], power: 0 }]);
  onMapLine(session, "cheats_map_state", "sig=z3d2 doors=11 rooms=111 box=1 power=0");
  tick(1500);
  assert.equal(sentOf(session, "maps").length, 2);
  tick(6600);
  assert.equal(sentOf(session, "maps").length, 3, "repeated after 5 s");
});

test("nothing is sent while no guest is in the room", () => {
  const session = sendingSession();
  session.peer = false;
  onMapLine(session, "cheats_map_live", "v=1 p=0,100,-200,64,90,2,0");
  onMapLine(session, "cheats_map_state", "sig=z3d2 doors=01 rooms=110 box=1 power=0");
  mapTick(session, 1000, { playing: true, slug: "kino" });
  assert.deepEqual(session.sent, []);
});

/** A guest (seat 1) in the same map as the host. */
function guestSession() {
  const session = hostSession();
  Object.assign(session, { mode: "guest", seat: 1, name: "jonas", cheats: { ok: null } });
  return session;
}

test("a guest fills its map from the host's messages", () => {
  const session = guestSession();
  onMapMessage(session, { t: "mapp", p: [[1, 100, -200, 64, 90, 0, 0], [2, 5, 6, 200, -45, 2, 1]] });
  assert.deepEqual([...session.map.tracks.keys()], [1, 2]);
  assert.equal(session.map.live.get(2).floor, 1);
  onMapMessage(session, { t: "maps", slug: "kino", sig: "z3d2", doors: "01", rooms: "110", box: [1], power: 1 });
  assert.equal(session.map.planOk, true);
  assert.deepEqual(session.map.state.doors, [false, true]);
  assert.equal(session.map.state.power, true);
});

test("a guest ignores malformed map messages whole", () => {
  const session = guestSession();
  for (const p of [[[1, 2, 3, 4, 5]], [[1, NaN, 3, 4, 5, 6, 0]], [[7, 1, 2, 3, 4, 5, 0]], [[1, 1, 1, 1, 1, 1, 0], [1, 1, 1, 1, 1, 1, 0], [2, 1, 1, 1, 1, 1, 0], [3, 1, 1, 1, 1, 1, 0], [4, 1, 1, 1, 1, 1, 0]], "x"]) {
    onMapMessage(session, { t: "mapp", p });
  }
  assert.equal(session.map.live.size, 0);
  onMapMessage(session, { t: "maps", slug: "atlantis", sig: "z3d2", doors: "01", rooms: "110", box: [1], power: 0 });
  onMapMessage(session, { t: "maps", slug: "kino", sig: "z3d2", doors: "0x", rooms: "110", box: [1], power: 0 });
  onMapMessage(session, { t: "maps", slug: "kino", sig: "z3d2", doors: "01", rooms: "110", box: [1, 2, 3, 4, 5, 6, 7, 8, 9], power: 0 });
  assert.equal(session.map.state, null);
});

test("map messages stay small", () => {
  const p = [1, 2, 3, 4].map((n) => [n, -12345, 23456, -789, -179, 22, 1]);
  assert.ok(JSON.stringify({ t: "mapp", p }).length < 1000);
  const bits = "01".repeat(32);
  assert.ok(JSON.stringify({ t: "maps", slug: "shangrila", sig: "z64d64", doors: bits, rooms: bits, box: [1, 2, 3, 4, 5, 6, 7, 8], power: 1 }).length < 1000);
});

// ---- plans from the game's dump (scripts/plan-build.mjs) ----

const DUMP = [
  "Z,a_zone,0,0,0;Z,b_zone,500,0,0;Z,empty_zone,900,900,0",
  "D,door,250,0,0,1000,t1;P,perk,specialty_armorvest,10,10,0;P,box,-,100,0,0;P,box,-,600,0,200",
  "N,0,0,0,0;N,100,0,0,0;N,500,0,0,1;N,600,0,200,1",
].join(";");
const FLOORS = [
  { name: "Ground floor", below: 120 },
  { name: "Upstairs", below: null },
];

test("buildPlan turns the dump into a valid plan", () => {
  const plan = buildPlan(DUMP, { slug: "kino", floors: FLOORS });
  assert.equal(validPlan(plan), true);
  // rooms, doors, and a checksum of the doors (index × (cost + |x| + |y|)): door 0 costs 1000 at (250, 0)
  assert.equal(plan.sig, "z3d1c1250");
  assert.deepEqual(
    plan.rooms.map((r) => r.id),
    ["a_zone", "b_zone", "empty_zone"],
  );
  assert.deepEqual(plan.doors, [{ kind: "door", cost: 1000, at: [0, 250, 0], rooms: [0, 1] }]);
  assert.deepEqual(plan.pois, [
    { kind: "perk", id: "specialty_armorvest", at: [0, 10, 10] },
    { kind: "box", id: null, at: [0, 100, 0] },
    { kind: "box", id: null, at: [1, 600, 0] },
  ]);
});

test("buildPlan draws rooms only on the floors their nodes are on", () => {
  const plan = buildPlan(DUMP, { slug: "kino", floors: FLOORS });
  assert.ok(plan.rooms[0].rects.every((r) => r[0] === 0));
  assert.deepEqual([...new Set(plan.rooms[1].rects.map((r) => r[0]))].sort(), [0, 1]);
  const covers = (room, x, y, f) => room.rects.some(([rf, x0, y0, x1, y1]) => rf === f && x >= x0 && x <= x1 && y >= y0 && y <= y1);
  assert.ok(covers(plan.rooms[0], 0, 0, 0) && covers(plan.rooms[0], 100, 0, 0));
  assert.ok(covers(plan.rooms[1], 600, 0, 1));
  assert.ok(!covers(plan.rooms[0], 600, 0, 1));
});

test("a cell between two rooms goes to the nearer room's node", () => {
  const plan = buildPlan(DUMP, { slug: "kino", floors: FLOORS });
  const owner = (x, y) => plan.rooms.findIndex((room) => room.rects.some(([f, x0, y0, x1, y1]) => f === 0 && x > x0 && x < x1 && y > y0 && y < y1));
  assert.equal(owner(110, 10), 0);
  assert.equal(owner(490, 10), 1);
});

test("a room's name goes on the floor with most of its nodes, not its biggest patch elsewhere", () => {
  // room b: two nodes spread out downstairs (the bigger patch), three on one spot upstairs (most nodes)
  const dump = DUMP.replace("N,500,0,0,1;N,600,0,200,1", "N,400,0,0,1;N,560,0,0,1;N,600,0,200,1;N,600,0,201,1;N,601,0,200,1");
  const plan = buildPlan(dump, { slug: "kino", floors: FLOORS });
  const area = ([, x0, y0, x1, y1]) => (x1 - x0) * (y1 - y0);
  const biggest = plan.rooms[1].rects.reduce((a, b) => (area(b) > area(a) ? b : a));
  assert.equal(biggest[0], 0, "the fixture's biggest patch is downstairs");
  assert.equal(plan.rooms[1].label[0], 1);
});

test("a room without nodes gets a small square at its volume", () => {
  const plan = buildPlan(DUMP, { slug: "kino", floors: FLOORS });
  const [[f, x0, y0, x1, y1]] = plan.rooms[2].rects;
  assert.equal(f, 0);
  assert.ok(x0 < 900 && x1 > 900 && y0 < 900 && y1 > 900);
  assert.deepEqual(plan.rooms[2].label, [0, 900, 900]);
});

test("every map has a valid bundled plan", () => {
  for (const slug of Object.values(MAP_SLUGS)) {
    const plan = planFor(slug);
    assert.ok(plan, `no plan for ${slug}`);
    assert.equal(plan.slug, slug);
    assert.match(plan.sig, new RegExp(`^z${plan.rooms.length}d${plan.doors.length}c\\d+$`));
    assert.ok(plan.rooms.length >= 3, `${slug}: ${plan.rooms.length} rooms`);
  }
  assert.ok(planFor("kino").rooms.length >= 10);
  assert.equal(planFor("atlantis"), null);
});

test("maps with a power switch show it (Der Riese and Verrückt one, Shangri-La two, Nacht none)", () => {
  const switches = (slug) => planFor(slug).pois.filter((p) => p.kind === "power").length;
  for (const slug of ["riese", "verruckt", "kino", "five", "moon", "ascension", "cotd"]) assert.equal(switches(slug), 1, slug);
  assert.equal(switches("shangrila"), 2);
  assert.equal(switches("nacht"), 0);
});

test("the floors of a plan match the floor table", () => {
  assert.deepEqual(
    planFor("five").floors.map((f) => f.name),
    FLOOR_TABLE.five.map((f) => f.name),
  );
  assert.equal(planFor("riese").floors.length, 1);
  // Moon's No Man's Land, where the game starts, is its own floor
  assert.equal(floorOf(planFor("moon"), -679, 13929, -14020), 0);
});

// ---- the game's own icons (src/map/icons.js) ----

/** A zip central directory with stored entries: [[name, size, localHeaderOffset], ...]. */
function centralDirectory(entries) {
  const parts = entries.map(([name, size, offset]) => {
    const n = Buffer.from(name);
    const b = Buffer.alloc(46 + n.length);
    b.writeUInt32LE(0x02014b50, 0);
    b.writeUInt16LE(0, 10); // stored
    b.writeUInt32LE(size, 20);
    b.writeUInt32LE(size, 24);
    b.writeUInt16LE(n.length, 28);
    b.writeUInt32LE(offset, 42);
    n.copy(b, 46);
    return b;
  });
  return new Uint8Array(Buffer.concat(parts));
}

/** An .iwi as the game stores it: 48-byte header, the mips smallest first, the full size last. */
function iwi(format, width, height, mip0) {
  const head = Buffer.alloc(48);
  head.write("IWi", 0, "latin1");
  head[3] = 13;
  head[4] = format;
  head.writeUInt16LE(width, 6);
  head.writeUInt16LE(height, 8);
  head.writeUInt16LE(1, 10);
  const small = Buffer.alloc(16); // a stand-in for the smaller mips
  head.writeUInt32LE(48 + small.length + mip0.length, 16);
  head.writeUInt32LE(48 + small.length, 20);
  return new Uint8Array(Buffer.concat([head, small, Buffer.from(mip0)]));
}

test("zipEntries lists the files of an archive's central directory", () => {
  const cd = centralDirectory([
    ["images/specialty_juggernaut_zombies.iwi", 1440, 100],
    ["sound/x.wav", 5, 2000],
  ]);
  assert.deepEqual(zipEntries(cd), [
    { name: "images/specialty_juggernaut_zombies.iwi", method: 0, size: 1440, offset: 100 },
    { name: "sound/x.wav", method: 0, size: 5, offset: 2000 },
  ]);
});

test("parseIwi finds the full-size image at the end of the file", () => {
  const mip0 = new Uint8Array(8).fill(7);
  const image = parseIwi(iwi(0x0b, 4, 4, mip0));
  assert.deepEqual([image.width, image.height, image.format], [4, 4, "dxt1"]);
  assert.deepEqual([...image.data], [...mip0]);
  assert.equal(parseIwi(new Uint8Array([1, 2, 3])), null);
  assert.equal(parseIwi(iwi(0x07, 4, 4, mip0)), null, "a format the map can't decode");
});

test("decodeDxt turns a DXT1 block into pixels", () => {
  // color0 red (0xF800), color1 blue (0x001F); first row index 0 (red), second row index 1 (blue)
  const block = [0x00, 0xf8, 0x1f, 0x00, 0b00000000, 0b01010101, 0, 0];
  const rgba = decodeDxt(new Uint8Array(block), 4, 4, "dxt1");
  assert.deepEqual([...rgba.slice(0, 4)], [255, 0, 0, 255]);
  assert.deepEqual([...rgba.slice(16, 20)], [0, 0, 255, 255]);
});

test("decodeDxt reads DXT5 alpha and DXT3 alpha", () => {
  const color = [0x00, 0xf8, 0x1f, 0x00, 0, 0, 0, 0]; // all red
  // DXT5: alpha0 255, alpha1 0; the first pixel takes alpha0 (255), the second alpha1 (0)
  const dxt5 = [255, 0, 0b00001000, 0, 0, 0, 0, 0, ...color]; // pixel 0 index 0, pixel 1 index 1
  const a5 = decodeDxt(new Uint8Array(dxt5), 4, 4, "dxt5");
  assert.equal(a5[3], 255);
  assert.equal(a5[7], 0);
  // DXT3: 4 bits per pixel; the first pixel 0xF (255), the second 0x0
  const dxt3 = [0x0f, 0, 0, 0, 0, 0, 0, 0, ...color];
  const a3 = decodeDxt(new Uint8Array(dxt3), 4, 4, "dxt3");
  assert.deepEqual([a3[3], a3[7]], [255, 0]);
});

test("each perk has its game icon file, the box too", () => {
  assert.equal(ICON_FILES.specialty_armorvest, "images/specialty_juggernaut_zombies.iwi");
  assert.equal(ICON_FILES.specialty_additionalprimaryweapon, "images/specialty_three_guns_zombies.iwi");
  assert.equal(ICON_FILES.box, "images/minimap_icon_mystery_box.iwi");
  assert.equal(Object.keys(ICON_FILES).length, 9);
});

// ---- the corner minimap (src/map/minimap.js) ----

test("the minimap shows in a game with map data, and hides for the big map, the setting, or no data", () => {
  const now = 100000;
  const session = modelSession(now);
  session.map.minimap = true;
  assert.equal(minimapVisible(session, now, { playing: true }), true);
  assert.equal(minimapVisible(session, now, { playing: false }), false, "not in a game");
  session.map.open = true;
  assert.equal(minimapVisible(session, now, { playing: true }), false, "the big map is open");
  session.map.open = false;
  session.map.minimap = false;
  assert.equal(minimapVisible(session, now, { playing: true }), false, "turned off in settings");
  const empty = hostSession();
  empty.map.minimap = true;
  assert.equal(minimapVisible(empty, now, { playing: true }), false, "no data yet");
  const noPlan = modelSession(now);
  noPlan.map.minimap = true;
  noPlan.map.plan = null;
  assert.equal(minimapVisible(noPlan, now, { playing: true }), false, "no plan for this level");
});

test("the minimap hides when there is no player of mine to center on (spectating, paused)", () => {
  const now = 100000;
  const session = modelSession(now);
  session.map.minimap = true;
  session.map.live.get(1).s = 2; // I bled out and spectate
  assert.equal(minimapVisible(session, now, { playing: true }), false);
});

test("the minimap's canvas size is whole pixels at any display scaling", () => {
  assert.deepEqual(minimapCanvasSize(1), { w: 200, h: 226 });
  assert.deepEqual(minimapCanvasSize(1.25), { w: 250, h: 283 });
  assert.ok(Number.isInteger(minimapCanvasSize(1.1).h));
});

test("iconsNeeded is the map's perks and the box", () => {
  assert.deepEqual(iconsNeeded(fixturePlan()).sort(), ["box", "specialty_armorvest"]);
  assert.deepEqual(iconsNeeded(planFor("kino")).sort(), ["box", "specialty_additionalprimaryweapon", "specialty_armorvest", "specialty_fastreload", "specialty_quickrevive", "specialty_rof"]);
});

test("icons are read once the game is playing, and again later if some were missing", async () => {
  const session = hostSession();
  const calls = [];
  let result = new Map([["box", {}]]);
  const loadIcons = (slug) => (calls.push(slug), Promise.resolve(result));
  mapTick(session, 1000, { playing: false, slug: "kino", loadIcons });
  assert.deepEqual(calls, [], "not before the game runs (the pack may not be downloaded yet)");
  mapTick(session, 1000, { playing: true, slug: "kino", loadIcons });
  mapTick(session, 1050, { playing: true, slug: "kino", loadIcons });
  assert.deepEqual(calls, ["kino"]);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(session.map.icons.size, 1);
  result = new Map([["box", {}], ["specialty_armorvest", {}]]); // all this map has: the fixture plan's one perk and the box
  mapTick(session, 1000 + 16000, { playing: true, slug: "kino", loadIcons });
  assert.deepEqual(calls, ["kino", "kino"], "tried again: the perk's icon was missing");
  await new Promise((r) => setTimeout(r, 0));
  mapTick(session, 1000 + 40000, { playing: true, slug: "kino", loadIcons });
  assert.equal(calls.length, 2, "every icon this map needs: no more reading");
});

test("parseIwi refuses sizes its data can't hold, or that are too big for an icon", () => {
  assert.equal(parseIwi(iwi(0x0b, 8, 8, new Uint8Array(8))), null, "8x8 DXT1 needs 32 bytes");
  assert.equal(parseIwi(iwi(0x0b, 4096, 4, new Uint8Array(8192))), null, "wider than 1024");
});

test("the minimap setting turns it off and on, and is saved", () => {
  const saved = {};
  const session = hostSession();
  session.map.minimap = true;
  const actions = minimapActions(session, (key, value) => (saved[key] = value));
  actions.minimapSetting();
  assert.equal(session.map.minimap, false);
  assert.equal(saved.minimap, "0");
  actions.minimapSetting();
  assert.equal(session.map.minimap, true);
  assert.equal(saved.minimap, "1");
  const blocks = minimapSettingBlocks(session);
  assert.ok(blocks.some((b) => b.kind === "buttons" && b.buttons[0].act === "minimapSetting"));
});

const near = (actual, expected) => assert.ok(actual.every((v, i) => Math.abs(v - expected[i]) < 1e-9), `${actual} vs ${expected}`);

test("the minimap turns with me: what I look at is straight up, I am in the middle", () => {
  assert.equal(minimapTurn(90), 0); // looking north: north up, not turned
  // 100 units = 11 px. Looking north, a point north of me is above me; looking east, a point east of me is
  near(minimapPlace({ x: 0, y: 0, yaw: 90 }, 0, 100), [100, 89]);
  near(minimapPlace({ x: 0, y: 0, yaw: 0 }, 100, 0), [100, 89]);
  // looking east, north is on my left; looking south-west, a point north-east of me is behind me
  near(minimapPlace({ x: 0, y: 0, yaw: 0 }, 0, 100), [89, 100]);
  near(minimapPlace({ x: 50, y: 50, yaw: 225 }, 50 + 100 / Math.SQRT2, 50 + 100 / Math.SQRT2), [100, 111]);
  near(minimapPlace({ x: 7, y: 8, yaw: 33 }, 7, 8), [100, 100]);
});

test("the minimap's N sits on the rim toward north", () => {
  near(minimapNorth(90), [100, 10]); // looking north: top middle
  near(minimapNorth(0), [10, 100]); // looking east: left
  near(minimapNorth(-90), [100, 190]); // looking south: bottom
  near(minimapNorth(45), [10, 10]); // looking north-east: north is up and left, in the corner
});

// ---- the M key (src/map/hotkey.js) ----

const key = (code, extra = {}) => ({ code, repeat: false, ctrlKey: false, altKey: false, metaKey: false, composedPath: () => [{ tagName: "CANVAS" }], ...extra });

test("M in a game toggles the map", () => {
  const session = hostSession();
  assert.equal(onMapKey(session, key("KeyM"), { playing: true }), true);
  assert.equal(session.map.open, true);
  assert.ok(session.map.openedAt > 0);
  assert.equal(onMapKey(session, key("KeyM"), { playing: true }), true);
  assert.equal(session.map.open, false);
});

test("M is left alone outside a game, with modifiers, repeated, or typed into a field", () => {
  const session = hostSession();
  const cases = [
    [key("KeyM"), false],
    [key("KeyM", { ctrlKey: true }), true],
    [key("KeyM", { altKey: true }), true],
    [key("KeyM", { metaKey: true }), true],
    [key("KeyM", { repeat: true }), true],
    [key("KeyM", { composedPath: () => [{ tagName: "INPUT" }] }), true],
    [key("KeyM", { composedPath: () => [{ tagName: "DIV", isContentEditable: true }] }), true],
    [key("KeyN"), true],
  ];
  for (const [event, playing] of cases) assert.equal(onMapKey(session, event, { playing }), false);
  assert.equal(session.map.open, false);
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name}\n     ${error.message.split("\n").join("\n     ")}`);
  }
}
console.log(`${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
