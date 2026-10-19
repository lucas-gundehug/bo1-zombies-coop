// Unit tests for direct connections' pure parts (no browser, no game).
//   node test/direct.test.mjs
import assert from "node:assert/strict";
import { batchCandidates, CANDIDATE_FLUSH_MS, CONNECT_TIMEOUT_MS, parseRtc, retryDelay, RTC_TYPES } from "../src/net/rtc-messages.js";
import { controlRoutes, createRoutes, fromDirect, isDirect, packetPath, relayPresence } from "../src/net/routes.js";

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

test("fromDirect: a peer cannot pass itself off as the relay", () => {
  for (const t of ["welcome", "peer", "error"]) assert.equal(fromDirect(JSON.stringify({ t, seat: 2, present: true }), 1, true), null, t);
  assert.equal(fromDirect(JSON.stringify({ t: "error", code: "room_full" }), 0, false), null);
});

test("fromDirect: the host stamps the link's seat over anything the peer claims", () => {
  assert.deepEqual(fromDirect(JSON.stringify({ t: "state", from: 3, seat: 3, phase: "x" }), 1, true), { t: "state", from: 1, phase: "x" });
  assert.deepEqual(fromDirect(JSON.stringify({ t: "lobby", players: [] }), 0, false), { t: "lobby", players: [] });
  assert.equal(fromDirect("not json", 1, true), null);
});

// --- page side (src/net/direct.js) with a fake RTCPeerConnection and a fake pump worker ---

globalThis.document ??= { documentElement: { dataset: {} } };
globalThis.location ??= { search: "", pathname: "/bsz/kino", href: "https://vel.gg/bsz/kino", origin: "https://vel.gg" };
const { createDirect, ICE_SERVERS } = await import("../src/net/direct.js");
const { onControl, relayClosed } = await import("../src/session/messages.js");

class FakePc {
  static all = [];
  constructor(config) {
    this.config = config;
    this.channels = [];
    this.remote = null;
    this.added = [];
    this.connectionState = "new";
    FakePc.all.push(this);
  }
  createDataChannel(label, options) {
    const channel = { label, options, readyState: "connecting" };
    this.channels.push(channel);
    return channel;
  }
  async createOffer() {
    return { type: "offer", sdp: "offer-sdp" };
  }
  async createAnswer() {
    return { type: "answer", sdp: "answer-sdp" };
  }
  async setLocalDescription(description) {
    this.localDescription = description;
  }
  async setRemoteDescription(description) {
    this.remote = description;
  }
  async addIceCandidate(candidate) {
    this.added.push(candidate);
  }
  close() {
    this.closed = true;
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeSession(mode) {
  const posted = [];
  return {
    mode,
    seat: mode === "guest" ? 1 : null,
    peer: false,
    relayPeer: mode === "guest",
    links: new Map(),
    relayGuests: new Set(),
    guests: new Map(),
    log: [],
    note() {},
    posted,
    pump: { postMessage: (message, transfer) => posted.push({ message, transfer }) },
  };
}
const sent = (session, t) => session.posted.filter((p) => p.message.type === "send" && p.message.message.t === t).map((p) => p.message.message);

function directFor(session) {
  FakePc.all = [];
  const clock = { t: 1000 };
  session.direct = createDirect(session, { RTCPeerConnection: FakePc, now: () => clock.t });
  return { direct: session.direct, clock };
}

test("guest: offers once, with a game and a control channel handed to the pump", async () => {
  const session = fakeSession("guest");
  const { direct } = directFor(session);
  direct.tick();
  await settle();
  direct.tick();
  await settle();
  assert.equal(FakePc.all.length, 1);
  const pc = FakePc.all[0];
  assert.deepEqual(pc.config.iceServers, ICE_SERVERS);
  assert.deepEqual(ICE_SERVERS, [{ urls: "stun:stun.cloudflare.com:3478" }, { urls: "stun:stun.l.google.com:19302" }]);
  const [game, control] = pc.channels;
  assert.deepEqual([game.label, game.options], ["game", { negotiated: true, id: 1, ordered: false, maxRetransmits: 0 }]);
  assert.deepEqual([control.label, control.options], ["control", { negotiated: true, id: 2 }]);
  const link = session.posted.find((p) => p.message.type === "link");
  assert.deepEqual(link.message, { type: "link", seat: 0, game, control });
  assert.deepEqual(link.transfer, [game, control]);
  assert.deepEqual(sent(session, "rtc-offer"), [{ t: "rtc-offer", n: 1, sdp: "offer-sdp" }]);
  assert.equal(direct.state(0), "connecting");
});

test("guest: no offer before the relay has seated it with the host present", async () => {
  const session = fakeSession("guest");
  session.relayPeer = false;
  const { direct } = directFor(session);
  direct.tick();
  await settle();
  assert.equal(FakePc.all.length, 0);
});

test("guest: an answer for another attempt is ignored", async () => {
  const session = fakeSession("guest");
  const { direct } = directFor(session);
  direct.tick();
  await settle();
  direct.onSignal({ t: "rtc-answer", n: 7, sdp: "stale" });
  await settle();
  assert.equal(FakePc.all[0].remote, null);
  direct.onSignal({ t: "rtc-answer", n: 1, sdp: "answer-sdp" });
  await settle();
  assert.deepEqual(FakePc.all[0].remote, { type: "answer", sdp: "answer-sdp" });
});

test("guest: candidates before the answer wait for it, then are applied", async () => {
  const session = fakeSession("guest");
  const { direct } = directFor(session);
  direct.tick();
  await settle();
  direct.onSignal({ t: "rtc-ice", n: 1, cands: [{ c: "candidate:1", m: "0", i: 0 }] });
  await settle();
  assert.deepEqual(FakePc.all[0].added, []);
  direct.onSignal({ t: "rtc-answer", n: 1, sdp: "answer-sdp" });
  await settle();
  assert.deepEqual(FakePc.all[0].added, [{ candidate: "candidate:1", sdpMid: "0", sdpMLineIndex: 0 }]);
});

test("guest: gathered candidates go out in batches, at most every 250 ms", async () => {
  const session = fakeSession("guest");
  const { direct, clock } = directFor(session);
  direct.tick();
  await settle();
  const pc = FakePc.all[0];
  for (let k = 0; k < 10; k += 1) pc.onicecandidate({ candidate: { candidate: `candidate:${k}`, sdpMid: "0", sdpMLineIndex: 0 } });
  pc.onicecandidate({ candidate: null });
  direct.tick();
  assert.deepEqual(sent(session, "rtc-ice").map((m) => m.cands.length), [8]);
  clock.t += 249;
  direct.tick();
  assert.equal(sent(session, "rtc-ice").length, 1);
  clock.t += 1;
  direct.tick();
  assert.deepEqual(sent(session, "rtc-ice").map((m) => m.cands.length), [8, 2]);
  assert.equal(sent(session, "rtc-ice")[1].n, 1);
});

test("guest: a link not open after 8 s is given up, and the next try waits 5 s", async () => {
  const session = fakeSession("guest");
  const { direct, clock } = directFor(session);
  direct.tick();
  await settle();
  clock.t += 8001;
  direct.tick();
  await settle();
  assert.ok(FakePc.all[0].closed);
  assert.ok(session.posted.some((p) => p.message.type === "unlink" && p.message.seat === 0));
  assert.equal(direct.state(0), "relay");
  clock.t += 4999;
  direct.tick();
  await settle();
  assert.equal(FakePc.all.length, 1);
  clock.t += 1;
  direct.tick();
  await settle();
  assert.equal(FakePc.all.length, 2);
  assert.deepEqual(sent(session, "rtc-offer").map((m) => m.n), [1, 2]);
});

test("guest: with __bo1CoopDirect = false it never offers and reports the relay", async () => {
  globalThis.__bo1CoopDirect = false;
  try {
    const session = fakeSession("guest");
    const { direct } = directFor(session);
    direct.tick();
    await settle();
    assert.equal(FakePc.all.length, 0);
    assert.equal(direct.state(0), "relay");
  } finally {
    delete globalThis.__bo1CoopDirect;
  }
});

test("guest: the host stays present over the direct link when the relay goes", async () => {
  const session = fakeSession("guest");
  const { direct } = directFor(session);
  onControl(session, { t: "welcome", seat: 1, peer: true });
  assert.equal(session.peer, true);
  direct.tick();
  await settle();
  direct.onLink(0, true);
  assert.equal(direct.state(0), "direct");
  relayClosed(session);
  assert.equal(session.peer, true);
  direct.onLink(0, false);
  assert.equal(session.peer, false);
  assert.ok(session.hostLeftAt > 0);
});

test("host: answers a guest's offer on that guest's own link", async () => {
  const session = fakeSession("host");
  const { direct } = directFor(session);
  direct.onSignal({ t: "rtc-offer", n: 4, sdp: "offer-sdp", from: 2 });
  await settle();
  const pc = FakePc.all[0];
  assert.deepEqual(pc.remote, { type: "offer", sdp: "offer-sdp" });
  assert.deepEqual(sent(session, "rtc-answer"), [{ t: "rtc-answer", n: 4, sdp: "answer-sdp", to: 2 }]);
  const link = session.posted.find((p) => p.message.type === "link");
  assert.equal(link.message.seat, 2);
  direct.onSignal({ t: "rtc-ice", n: 3, cands: [{ c: "old", m: "0", i: 0 }], from: 2 });
  direct.onSignal({ t: "rtc-ice", n: 4, cands: [{ c: "new", m: "0", i: 0 }], from: 2 });
  await settle();
  assert.deepEqual(pc.added.map((c) => c.candidate), ["new"]);
});

test("host: a guest is present while the relay or its direct link has it", async () => {
  const session = fakeSession("host");
  const { direct } = directFor(session);
  onControl(session, { t: "peer", seat: 2, present: true });
  assert.equal(session.guests.get(2).present, true);
  direct.onSignal({ t: "rtc-offer", n: 1, sdp: "offer-sdp", from: 2 });
  await settle();
  direct.onLink(2, true);
  relayClosed(session);
  assert.equal(session.guests.get(2).present, true);
  assert.equal(session.peer, true);
  direct.onLink(2, false);
  assert.equal(session.guests.get(2).present, false);
  assert.ok(session.guests.get(2).leftAt > 0);
  assert.equal(session.peer, false);
});

test("host: a seat the relay hands out again drops the old direct link", async () => {
  const session = fakeSession("host");
  const { direct } = directFor(session);
  onControl(session, { t: "peer", seat: 2, present: true });
  direct.onSignal({ t: "rtc-offer", n: 1, sdp: "offer-sdp", from: 2 });
  await settle();
  direct.onLink(2, true);
  onControl(session, { t: "peer", seat: 2, present: false });
  assert.equal(direct.state(2), "direct");
  onControl(session, { t: "peer", seat: 2, present: true });
  assert.ok(FakePc.all[0].closed);
  assert.equal(direct.state(2), "relay");
  assert.equal(session.guests.get(2).present, true);
});

test("host: its own relay reconnect keeps the direct links", async () => {
  const session = fakeSession("host");
  const { direct } = directFor(session);
  onControl(session, { t: "peer", seat: 1, present: true });
  direct.onSignal({ t: "rtc-offer", n: 1, sdp: "offer-sdp", from: 1 });
  await settle();
  direct.onLink(1, true);
  relayClosed(session);
  onControl(session, { t: "welcome", guests: [1] });
  assert.equal(direct.state(1), "direct");
});

test("host: a guest the relay lost while its link was down has left", async () => {
  const session = fakeSession("host");
  directFor(session);
  onControl(session, { t: "peer", seat: 1, present: true });
  onControl(session, { t: "peer", seat: 1, present: false });
  assert.equal(session.guests.get(1).present, false);
  assert.equal(session.guests.has(3), false);
});

// --- the card (src/session/lobby.js, src/ui/view.js) ---

globalThis.window ??= {};
const { hostRoster, guestRoster } = await import("../src/session/lobby.js");
const { connectionText } = await import("../src/session/lobby.js");

test("hostRoster: each present guest shows its path, the host and free seats none", async () => {
  const session = fakeSession("host");
  const { direct } = directFor(session);
  session.name = "Lucas";
  session.stats = { rtts: { 1: 12, 2: 40 } };
  onControl(session, { t: "peer", seat: 1, present: true });
  onControl(session, { t: "peer", seat: 2, present: true });
  direct.onSignal({ t: "rtc-offer", n: 1, sdp: "offer-sdp", from: 1 });
  await settle();
  direct.onLink(1, true);
  const { players } = hostRoster(session);
  assert.deepEqual(players.map((p) => p.path), [null, "direct", "relay", null]);
});

test("guestRoster: a guest's own row shows its own path", async () => {
  const session = fakeSession("guest");
  const { direct } = directFor(session);
  session.name = "Friend";
  session.phase = "connected";
  session.lobby = { players: [{ n: 1, host: true }, { n: 2, path: "relay" }, { n: 3, path: "relay" }, { n: 4 }] };
  direct.tick();
  await settle();
  direct.onSignal({ t: "rtc-answer", n: 1, sdp: "answer-sdp" });
  await settle();
  direct.onLink(0, true);
  const players = guestRoster(session);
  assert.equal(players[1].path, "direct");
  assert.equal(players[2].path, "relay");
});

test("connectionText: a guest sees its own path, the host a count", () => {
  assert.equal(connectionText({ mode: "guest", direct: { state: () => "direct" } }), "Direct");
  assert.equal(connectionText({ mode: "guest", direct: { state: () => "connecting" } }), "Connecting…");
  assert.equal(connectionText({ mode: "guest", direct: null }), "Relay");
  const host = { mode: "host", guests: new Map([[1, { seat: 1, present: true }], [2, { seat: 2, present: true }], [3, { seat: 3, present: false }]]), links: new Map([[1, "direct"]]) };
  assert.equal(connectionText(host), "1 Direct, 1 Relay");
  assert.equal(connectionText({ mode: "host", guests: new Map(), links: new Map() }), null);
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
