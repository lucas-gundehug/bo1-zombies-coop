// Screenshots of the card in every state, staged on vel.gg's landing page without loading the game (one light
// browser). Used for the README images.
//   node test/ui-preview.mjs [locale=pt-BR] [outdir=/tmp/bo1-ui] [scale=1]
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const LOCALE = process.argv[2] ?? "pt-BR";
const OUT = process.argv[3] ?? "/tmp/bo1-ui";
const SCALE = Number(process.argv[4] ?? 1);
fs.mkdirSync(OUT, { recursive: true });
const extension = path.resolve("extension");
const ctx = await chromium.launchPersistentContext("/tmp/bo1-ui-profile", {
  headless: false, locale: LOCALE, viewport: { width: 1100, height: 900 }, deviceScaleFactor: SCALE,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, `--lang=${LOCALE}`],
});
const ROOM = "n3m0-a447-ajbr-sj80";

// Stands in for the engine and the network so the card can be put in any state.
const fake = ({ screen, mem = true, coop }) => {
  const c = window.__bo1Coop;
  window.five = window.five ?? {};
  Object.defineProperty(window.five, "screen", { configurable: true, get: () => screen });
  if (mem) {
    const clients = coop.clients ?? [];
    c.engine = new Proxy({}, { get: (_, k) => k === "serverSlots" ? () => clients : k === "connectionState" ? () => 10 : k === "menuOpen" ? () => false : k === "command" ? () => true : k === "int" && coop.fun ? () => 2500 : k === "byte" ? () => 1 : () => 0 });
  }
  c.build = c.build ?? { introState: 0 };
  if (coop.fun) {
    c.build.fun = { entities: 0, entitySize: 0, ent: { client: 0, flags: 0, health: 0 }, entFlags: {}, client: { score: 0, ammoSlots: 0 }, clientFlags: {}, cheatsDvar: 0 };
    Object.assign(c.fun, coop.fun);
  }
  c.queues = { seats: { 1: { port: 2406 }, 2: { port: 2407 }, 3: { port: 2408 } } };
  for (const [k, v] of Object.entries(coop.set ?? {})) c[k] = v;
  for (const g of coop.guests ?? []) c.guests.set(g.seat, { present: true, state: null, pause: false, slot: null, leftAt: 0, kicks: 0, lastKickAt: 0, sent: {}, ...g });
  c.pump?.terminate?.();
  c.pump = { postMessage() {} };
  // Keep the socket and stats as staged, whatever the real worker reports.
  const stats = coop.stats;
  if (stats) Object.defineProperty(c, "stats", { configurable: true, get: () => stats, set() {} });
  Object.defineProperty(c, "socket", { configurable: true, get: () => coop.socket ?? "open", set() {} });
};

const scenes = [
  { name: "1-solo", url: "/bsz/", run: null },
  { name: "2-host-lobby", url: `/bsz/?coop=host&coopRoom=${ROOM}`, run: { screen: "ready", coop: {
    set: { zone: "zombie_theater", name: "Allan", peer: true, gate: false },
    clients: [{ slot: 1, state: 5, loopback: true, port: 2406 }, { slot: 2, state: 3, loopback: true, port: 2407 }],
    guests: [{ seat: 1, state: { phase: "connected", name: "Rafa" } }, { seat: 2, state: { phase: "joining", name: "Bruno" } }, { seat: 3, state: { phase: "loading", name: "" } }],
    stats: { rtt: 142, rtts: { 1: 38, 2: 142, 3: 260 }, lost: 0 } } } },
  { name: "3-host-picking", url: `/bsz/?coop=host&coopRoom=${ROOM}`, run: { screen: "landing", mem: false, coop: { set: { name: "Allan" }, stats: { rtt: null, rtts: {} } } } },
  { name: "4-guest-joining", url: `/bsz/?coop=join&coopRoom=${ROOM}`, run: { screen: "loading", coop: {
    set: { phase: "loading", seat: 2, peer: true, name: "Bruno", hostInfo: { slug: "kino", zone: "zombie_theater" },
      lobby: { t: "lobby", slug: "kino", horde: false, playing: false, players: [
        { n: 1, name: "Allan", host: true, status: "lobby", tone: "ok" }, { n: 2, name: "Rafa", status: "ready", tone: "ok", ping: 38 },
        { n: 3, name: "Bruno", status: "loading", tone: "wait", ping: 90 }, { n: 4, name: "", status: "free", tone: "" }] } },
    stats: { rtt: 91 } } } },
  { name: "5-guest-lobby-settings", url: `/bsz/?coop=join&coopRoom=${ROOM}`, run: { screen: "ready", coop: {
    set: { phase: "connected", seat: 1, peer: true, name: "Rafa", showSettings: true, hostInfo: { slug: "kino", zone: "zombie_theater" }, hostState: { screen: "ready", ready: true },
      usage: { fraction: 0.12, resetsAt: new Date(Date.now() + 5 * 3600e3).toISOString() },
      lobby: { t: "lobby", slug: "kino", horde: true, playing: false, players: [
        { n: 1, name: "Allan", host: true, status: "lobby", tone: "ok" }, { n: 2, name: "Rafa", status: "ready", tone: "ok", ping: 38 },
        { n: 3, name: "Bruno", status: "ready", tone: "ok", ping: 142 }, { n: 4, name: "Leo", status: "turn", tone: "wait", ping: 210 }] } },
    stats: { rtt: 38, lost: 0 } } } },
  { name: "6-guest-error", url: `/bsz/?coop=join&coopRoom=${ROOM}`, run: { screen: "error", coop: {
    set: { phase: "failed", seat: 3, peer: true, name: "Leo", lastStep: 3, error: null },
    stats: { rtt: 120 } } } },
  { name: "7-host-ingame-pill", url: `/bsz/?coop=host&coopRoom=${ROOM}`, run: { screen: "playing", coop: {
    set: { zone: "zombie_theater", name: "Allan", peer: true },
    clients: [{ slot: 1, state: 5, loopback: true, port: 2406 }, { slot: 2, state: 5, loopback: true, port: 2407 }],
    guests: [{ seat: 1, state: { phase: "connected", name: "Rafa" } }, { seat: 2, state: { phase: "connected", name: "Bruno" } }],
    stats: { rtt: 64, rtts: { 1: 38, 2: 64 } } } } },
  { name: "8-host-fun", tall: true, url: `/bsz/?coop=host&coopRoom=${ROOM}`, run: { screen: "ready", coop: {
    set: { zone: "zombie_theater", name: "Allan", peer: true },
    clients: [{ slot: 1, state: 5, loopback: true, port: 2406 }],
    guests: [{ seat: 1, state: { phase: "connected", name: "Rafa" }, slot: { slot: 1, state: 5 } }],
    fun: { open: true, infiniteClip: true, passive: true, timescale: 1, jump: 150, gravity: 400,
      players: { 0: { god: true, demigod: false, notarget: false, noclip: false, ufo: false, speed: 1.5 }, 1: { god: true, demigod: false, notarget: true, noclip: false, ufo: false, speed: 1 } } },
    stats: { rtt: 38, rtts: { 1: 38 } } } } },
  { name: "9-host-cheats", tall: true, url: `/bsz/#coop=host&coopRoom=${ROOM}&coopRelay=http%3A%2F%2F127.0.0.1%3A9`, run: { screen: "ready", coop: {
    set: { zone: "zombie_theater", name: "Allan", peer: true, cheats: { enabled: true, ok: true, ready: true, round: 7, frozen: true, power: false, horde: false, target: 1, noticeArea: "perks",
      weapons: ["knife_ballistic_bowie_zm", "crossbow_explosive_zm", "thundergun_zm", "ray_gun_zm", "zombie_cymbal_monkey", "china_lake_zm", "m72_law_zm", "claymore_zm", "hk21_zm", "rpk_zm", "l96a1_zm", "galil_zm", "famas_zm", "spas_zm", "cz75dw_zm", "python_zm", "m1911_zm"],
      perks: ["specialty_quickrevive", "specialty_fastreload", "specialty_rof", "specialty_armorvest", "specialty_additionalprimaryweapon"],
      powerups: ["fire_sale", "carpenter", "full_ammo", "double_points", "insta_kill", "nuke"] } },
    clients: [{ slot: 1, state: 5, loopback: true, port: 2406 }],
    guests: [{ seat: 1, state: { phase: "connected", name: "Rafa" }, slot: { slot: 1, state: 5 } }],
    fun: { open: true, notice: "Juggernog given to Rafa.", noticeAt: Date.now() + 3600e3, timescale: 1, jump: 39, gravity: 800, players: {} },
    stats: { rtt: 38, rtts: { 1: 38 } } } } },
];

// Fork: the in-game map (N), staged from a bundled plan: three players in three open rooms, the rest closed.
const stageMap = ({ plan, players }) => {
  const c = window.__bo1Coop;
  const later = Date.now() + 3600e3; // samples "from the future" never go stale while the shot is taken
  const open = plan.rooms.map((r) => r.label[0] === 0);
  const spots = plan.rooms.map((r, i) => [i, r.label]).filter(([, l]) => l[0] === 0).slice(0, players.length);
  Object.assign(c.map, { slug: plan.slug, plan, planOk: true, open: true, openedAt: Date.now() });
  c.map.state = { v: 1, sig: plan.sig, doors: plan.doors.map((d, i) => i % 3 === 0), rooms: open.map((o, i) => o && i < 4), box: [0], power: true, at: later };
  window.five.views = [];
  spots.forEach(([room, [, x, y]], i) => {
    const yaw = 40 + 90 * i;
    c.map.live.set(i + 1, { x, y, z: 0, yaw, room, s: i === 2 ? 1 : 0, floor: 0, at: later });
    c.map.tracks.set(i + 1, [{ at: later, x, y, yaw }]);
    if (i === 0) window.five.views.push({ origin: [x, y, 60], angles: [0, yaw, 0], ms: 1, flags: 0 });
  });
  c.mapOverlay.show(c);
};
const mapScenes = ["kino", "five", "moon"].flatMap((slug) => [
  { name: `10-map-${slug}`, slug, size: { width: 1280, height: 720 } },
  { name: `11-map-${slug}-small`, slug, size: { width: 1100, height: 650 } },
]);

// ONLY=<text> shoots only the scenes whose name contains it.
for (const scene of mapScenes.filter((s) => (!process.env.ONLY || s.name.includes(process.env.ONLY)) && fs.existsSync(`src/map/plans/${s.slug}.json`))) {
  const page = await ctx.newPage();
  await page.setViewportSize(scene.size);
  await page.goto(`https://vel.gg/bsz/#coop=host&coopRoom=${ROOM}&coopRelay=http%3A%2F%2F127.0.0.1%3A9`);
  await page.waitForFunction(() => window.__bo1Coop?.mapOverlay);
  const zone = Object.entries({ zombie_theater: "kino", zombie_pentagon: "five", zombie_moon: "moon" }).find(([, s]) => s === scene.slug)[0];
  await page.evaluate(fake, { screen: "playing", coop: { set: { zone, name: "Lucas", peer: true }, clients: [{ slot: 1, state: 5, loopback: true, port: 2406 }, { slot: 2, state: 5, loopback: true, port: 2407 }],
    guests: [{ seat: 1, state: { phase: "connected", name: "Jonas" }, slot: { slot: 1, state: 5 } }, { seat: 2, state: { phase: "connected", name: "Mads" }, slot: { slot: 2, state: 5 } }], stats: { rtt: 38, rtts: { 1: 38, 2: 40 } } } });
  await page.evaluate(stageMap, { plan: JSON.parse(fs.readFileSync(`src/map/plans/${scene.slug}.json`, "utf8")), players: ["Lucas", "Jonas", "Mads"] });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${scene.name}.png` });
  console.log("shot", scene.name);
  await page.close();
}

for (const scene of scenes.filter((s) => !process.env.ONLY || s.name.includes(process.env.ONLY))) {
  const page = await ctx.newPage();
  if (scene.tall) await page.setViewportSize({ width: 1100, height: 2600 });
  await page.goto(`https://vel.gg${scene.url}${scene.url.includes("?") ? "&coopRelay=http%3A%2F%2F127.0.0.1%3A9" : ""}`);
  await page.waitForFunction(() => window.__bo1Coop?.card);
  if (scene.run) await page.evaluate(fake, scene.run);
  await page.waitForTimeout(600);
  const box = await page.locator("bo1-coop-card").boundingBox();
  const card = await page.evaluate(() => {
    const host = document.querySelector("bo1-coop-card");
    return { w: host.offsetWidth, h: host.offsetHeight };
  });
  const clip = { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: Math.max(card.w, box.width) + 16, height: Math.min(scene.tall ? 2580 : 880, Math.max(card.h, box.height) + 16) };
  await page.screenshot({ path: `${OUT}/${scene.name}.png`, clip });
  console.log("shot", scene.name, clip.width, "x", clip.height);
  await page.close();
}
await ctx.close();
