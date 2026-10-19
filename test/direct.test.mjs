// Unit tests for direct connections' pure parts (no browser, no game).
//   node test/direct.test.mjs
import assert from "node:assert/strict";
import { batchCandidates, CANDIDATE_FLUSH_MS, CONNECT_TIMEOUT_MS, parseRtc, retryDelay, RTC_TYPES } from "../src/net/rtc-messages.js";

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
