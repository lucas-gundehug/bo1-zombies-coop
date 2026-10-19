// Unit tests for the in-game map's pure parts (no browser, no game).
//   node test/map.test.mjs
import assert from "node:assert/strict";
import { fitView, floorOf, toScreen, validPlan } from "../src/map/plan.js";
import { createMap } from "../src/map/state.js";
import { mapTick, onMapLine, parseLive, parseMapState } from "../src/map/live.js";
import { createBridge, onCheatsLine } from "../src/cheats/bridge.js";
import { SLOT } from "../src/engine/builds.js";
import { pushSample, sampleTrack } from "../src/map/track.js";
import { mapModel } from "../src/map/model.js";
import { roomName } from "../src/map/names.js";
import { PLAYER_COLORS } from "../src/ui/card.js";

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
const VIEW = { origin: [120, 130, 110], angles: [0, 45, 0] };

test("mapModel draws each player with their colour and first letter; mine from my camera", () => {
  const now = 100000;
  const model = mapModel(modelSession(now), now, { view: VIEW });
  assert.equal(model.status, "ok");
  const [me, jonas] = model.players;
  assert.deepEqual([me.n, me.letter, me.color, me.me, me.x, me.y, me.yaw], [1, "L", PLAYER_COLORS[0], true, 120, 130, 45]);
  assert.deepEqual([jonas.n, jonas.letter, jonas.color, jonas.me], [2, "J", PLAYER_COLORS[1], false]);
  assert.equal(model.room, "Foyer");
  assert.deepEqual(model.legend.map((l) => l.name), ["Lucas", "jonas"]);
});

test("others are drawn 300 ms in the past, between two samples", () => {
  const now = 100000;
  const jonas = mapModel(modelSession(now), now, { view: VIEW }).players[1];
  assert.ok(Math.abs(jonas.x - 1080) < 1e-9, `x ${jonas.x}`); // 300 ms back from the newest: 0.8 of the way from 1000 to 1100
});

test("a downed player gets a ring, a spectator is left out", () => {
  const now = 100000;
  const session = modelSession(now);
  session.map.live.get(2).s = 1;
  assert.equal(mapModel(session, now, { view: VIEW }).players[1].downed, true);
  session.map.live.get(2).s = 2;
  const model = mapModel(session, now, { view: VIEW });
  assert.deepEqual(model.players.map((p) => p.n), [1]);
  assert.deepEqual(model.legend.map((l) => l.letter), ["L"]);
});

test("a player not heard from for 2 s is dropped with their track; a new one shows up", () => {
  const now = 100000;
  const session = modelSession(now);
  session.map.live.get(2).at = now - 2100;
  const model = mapModel(session, now, { view: VIEW });
  assert.deepEqual(model.players.map((p) => p.n), [1]);
  assert.equal(session.map.tracks.has(2), false);
  onMapLine(session, "cheats_map_live", "v=1 p=0,100,100,50,90,0,0;1,1100,200,50,0,1,0");
  assert.deepEqual(mapModel(session, Date.now(), { view: VIEW }).players.map((p) => p.n), [1, 2]);
});

test("closed doors and room states come from the state", () => {
  const now = 100000;
  const model = mapModel(modelSession(now), now, { view: VIEW });
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
  const model = mapModel(session, now, { view: VIEW });
  assert.deepEqual(model.doors, []);
  assert.ok(model.rooms.every((r) => r.open === null));
  assert.equal(model.stale, true);
  assert.equal(model.players.length, 2);
});

test("no plan, waiting, and no data", () => {
  const now = 100000;
  const noPlan = modelSession(now);
  noPlan.map.plan = null;
  assert.equal(mapModel(noPlan, now, { view: VIEW }).status, "noPlan");
  const empty = hostSession();
  empty.map.openedAt = now - 1000;
  assert.equal(mapModel(empty, now, { view: VIEW }).status, "waiting");
  empty.map.openedAt = now - 5001;
  assert.equal(mapModel(empty, now, { view: VIEW }).status, "noData");
});

test("friends on another floor show on that floor's button", () => {
  const now = 100000;
  const session = modelSession(now);
  session.map.live.get(2).floor = 1;
  const model = mapModel(session, now, { view: VIEW });
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
  const model = mapModel(session, now, { view: VIEW });
  assert.deepEqual(
    model.players.map((p) => [p.n, p.letter, p.me]),
    [
      [1, "L", false],
      [2, "J", true],
    ],
  );
});

test("roomName reads a technical name when the table has none", () => {
  assert.equal(roomName("nacht", "foyer_zone"), "Foyer");
  assert.equal(roomName("nacht", "west_balcony_zone"), "West balcony");
  assert.equal(roomName("nacht", "labs_zone3"), "Labs 3");
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
