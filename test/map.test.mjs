// Unit tests for the in-game map's pure parts (no browser, no game).
//   node test/map.test.mjs
import assert from "node:assert/strict";
import { fitView, floorOf, toScreen, validPlan } from "../src/map/plan.js";

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
