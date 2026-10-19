// Unit tests for direct connections' pure parts (no browser, no game).
//   node test/direct.test.mjs
import assert from "node:assert/strict";
import { batchCandidates, CANDIDATE_FLUSH_MS, CONNECT_TIMEOUT_MS, parseRtc, retryDelay, RTC_TYPES } from "../src/net/rtc-messages.js";
import { controlRoutes, createRoutes, isDirect, packetPath, relayPresence } from "../src/net/routes.js";

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const cand = (c = "candidate:1 1 udp 2122260223 192.168.1.10 50000 typ host") => ({ c, m: "0", i: 0 });

test("signaling types and timings", () => {
  assert.deepEqual(RTC_TYPES, ["rtc-offer", "rtc-answer", "rtc-ice"]);
  assert.equal(CANDIDATE_FLUSH_MS, 250);
  assert.equal(CONNECT_TIMEOUT_MS, 8000);
});

test("parseRtc: the host takes an offer from a guest seat", () => {
  assert.deepEqual(parseRtc({ t: "rtc-offer", n: 3, sdp: "v=0", from: 2 }, { role: "host" }), { t: "rtc-offer", n: 3, sdp: "v=0", from: 2 });
});

test("parseRtc: a guest never takes an offer", () => {
  assert.equal(parseRtc({ t: "rtc-offer", n: 3, sdp: "v=0" }, { role: "guest" }), null);
});

test("parseRtc: the host never takes an answer", () => {
  assert.equal(parseRtc({ t: "rtc-answer", n: 3, sdp: "v=0", from: 1 }, { role: "host" }), null);
});

test("parseRtc: a guest takes an answer without a from", () => {
  assert.deepEqual(parseRtc({ t: "rtc-answer", n: 1, sdp: "v=0", to: 1 }, { role: "guest" }), { t: "rtc-answer", n: 1, sdp: "v=0" });
});

test("parseRtc: the host needs a valid from seat", () => {
  assert.equal(parseRtc({ t: "rtc-offer", n: 1, sdp: "v=0" }, { role: "host" }), null);
  assert.equal(parseRtc({ t: "rtc-offer", n: 1, sdp: "v=0", from: 4 }, { role: "host" }), null);
  assert.equal(parseRtc({ t: "rtc-offer", n: 1, sdp: "v=0", from: 0 }, { role: "host" }), null);
});

test("parseRtc: sdp longer than 3000 characters is refused", () => {
  assert.ok(parseRtc({ t: "rtc-answer", n: 1, sdp: "x".repeat(3000) }, { role: "guest" }));
  assert.equal(parseRtc({ t: "rtc-answer", n: 1, sdp: "x".repeat(3001) }, { role: "guest" }), null);
  assert.equal(parseRtc({ t: "rtc-answer", n: 1, sdp: "" }, { role: "guest" }), null);
});

test("parseRtc: the attempt number must be a whole number from 1", () => {
  for (const n of [0, 1.5, -1, "1", null, 1e6 + 1]) assert.equal(parseRtc({ t: "rtc-answer", n, sdp: "v=0" }, { role: "guest" }), null, String(n));
});

test("parseRtc: candidates come in batches of 1 to 8", () => {
  assert.deepEqual(parseRtc({ t: "rtc-ice", n: 2, cands: [cand()] }, { role: "guest" }), { t: "rtc-ice", n: 2, cands: [cand()] });
  assert.equal(parseRtc({ t: "rtc-ice", n: 2, cands: [] }, { role: "guest" }), null);
  assert.equal(parseRtc({ t: "rtc-ice", n: 2, cands: Array.from({ length: 9 }, () => cand()) }, { role: "guest" }), null);
});

test("parseRtc: a candidate is checked field by field", () => {
  const ok = (c) => parseRtc({ t: "rtc-ice", n: 1, cands: [c] }, { role: "guest" }) !== null;
  assert.ok(ok({ c: "x".repeat(512), m: null, i: null }));
  assert.ok(!ok({ c: "x".repeat(513), m: "0", i: 0 }));
  assert.ok(!ok({ c: 5, m: "0", i: 0 }));
  assert.ok(!ok({ c: "a", m: "x".repeat(17), i: 0 }));
  assert.ok(!ok({ c: "a", m: "0", i: 16 }));
  assert.ok(!ok({ c: "a", m: "0", i: 0.5 }));
  assert.ok(!ok(null));
});

test("parseRtc: the host takes candidates with a from seat", () => {
  assert.deepEqual(parseRtc({ t: "rtc-ice", n: 1, cands: [cand()], from: 3 }, { role: "host" }), { t: "rtc-ice", n: 1, cands: [cand()], from: 3 });
});

test("parseRtc: anything else is refused", () => {
  assert.equal(parseRtc(null, { role: "guest" }), null);
  assert.equal(parseRtc({ t: "state", n: 1 }, { role: "guest" }), null);
  assert.equal(parseRtc({ t: "rtc-answer", n: 1, sdp: 5 }, { role: "guest" }), null);
});

test("batchCandidates splits into groups of at most 8", () => {
  const list = Array.from({ length: 19 }, (_, i) => cand(`c${i}`));
  const batches = batchCandidates(list);
  assert.deepEqual(batches.map((b) => b.length), [8, 8, 3]);
  assert.deepEqual(batches.flat(), list);
  assert.deepEqual(batchCandidates([]), []);
});

test("retryDelay backs off to a minute", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(retryDelay), [5000, 15000, 30000, 60000, 60000, 60000]);
});

const open = () => ({ readyState: "open" });
const link = (game = open(), control = open()) => ({ game, control });
const routesWith = (links, relaySeats = []) => {
  const routes = createRoutes();
  for (const [seat, l] of Object.entries(links)) routes.links.set(Number(seat), l);
  for (const seat of relaySeats) routes.relaySeats.add(seat);
  return routes;
};

test("isDirect needs both channels open", () => {
  const routes = routesWith({ 1: link(), 2: link(open(), { readyState: "connecting" }), 3: link({ readyState: "closed" }) });
  assert.deepEqual([1, 2, 3, 0].map((s) => isDirect(routes, s)), [true, false, false, false]);
  assert.equal(packetPath(routes, 1), "direct");
  assert.equal(packetPath(routes, 3), "relay");
});

test("controlRoutes: a guest sends to the host directly when the link is open", () => {
  const message = { t: "state", phase: "connected" };
  assert.deepEqual(controlRoutes(routesWith({ 0: link() }), message, false), [{ via: "direct", seat: 0 }]);
  assert.deepEqual(controlRoutes(createRoutes(), message, false), [{ via: "relay", message }]);
});

test("controlRoutes: signaling always goes through the relay", () => {
  const offer = { t: "rtc-offer", n: 1, sdp: "v=0" };
  assert.deepEqual(controlRoutes(routesWith({ 0: link() }), offer, false), [{ via: "relay", message: offer }]);
  const answer = { t: "rtc-answer", n: 1, sdp: "v=0", to: 2 };
  assert.deepEqual(controlRoutes(routesWith({ 2: link() }, [2]), answer, true), [{ via: "relay", message: answer }]);
});

test("controlRoutes: the host sends to one seat on that seat's path", () => {
  const routes = routesWith({ 2: link() }, [1, 2]);
  const toTwo = { t: "info", to: 2 };
  const toOne = { t: "info", to: 1 };
  assert.deepEqual(controlRoutes(routes, toTwo, true), [{ via: "direct", seat: 2 }]);
  assert.deepEqual(controlRoutes(routes, toOne, true), [{ via: "relay", message: toOne }]);
});

test("controlRoutes: a broadcast with no direct seat is one relay message", () => {
  const message = { t: "lobby", players: [] };
  assert.deepEqual(controlRoutes(routesWith({}, [1, 2, 3]), message, true), [{ via: "relay", message }]);
});

test("controlRoutes: a mixed broadcast reaches each seat once, on its own path", () => {
  const message = { t: "lobby", players: [] };
  assert.deepEqual(controlRoutes(routesWith({ 1: link() }, [1, 2, 3]), message, true), [
    { via: "direct", seat: 1 },
    { via: "relay", message: { ...message, to: 2 } },
    { via: "relay", message: { ...message, to: 3 } },
  ]);
});

test("controlRoutes: a closed game channel puts the seat back on the relay", () => {
  const message = { t: "lobby" };
  assert.deepEqual(controlRoutes(routesWith({ 1: link({ readyState: "closed" }) }, [1]), message, true), [{ via: "relay", message }]);
});

test("relayPresence follows the relay's welcome and peer messages", () => {
  const routes = createRoutes();
  relayPresence(routes, { t: "welcome", guests: [1, 3] });
  assert.deepEqual([...routes.relaySeats].sort(), [1, 3]);
  relayPresence(routes, { t: "peer", seat: 2, present: true });
  relayPresence(routes, { t: "peer", seat: 1, present: false });
  assert.deepEqual([...routes.relaySeats].sort(), [2, 3]);
  relayPresence(routes, { t: "welcome", guests: [] });
  assert.deepEqual([...routes.relaySeats], []);
  relayPresence(routes, { t: "peer", seat: 9, present: true });
  relayPresence(routes, { t: "state", from: 2 });
  assert.deepEqual([...routes.relaySeats], []);
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
