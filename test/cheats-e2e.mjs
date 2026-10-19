// The cheat menu on the real vel.gg: one browser with the extension, a map, the game script, its commands.
//   node test/cheats-e2e.mjs [map=kino] [scenario=load]
// Scenarios: load (the script reports ready), off (with the setting off nothing loads), actions (every command, Task 2).
// PROFILE=<dir> reuses a browser profile (the map packs are downloaded once per profile and kept), default in the OS
// temp folder. SHOTS=<dir> saves a screenshot after each step. HORDE=1 plays vel.gg's Hell mode (?horde=1).
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MAP = process.argv[2] ?? "kino";
const SCENARIO = process.argv[3] ?? "load";
const PROFILE = process.env.PROFILE ?? path.join(os.tmpdir(), "bo1-cheats-profile");
const SHOTS = process.env.SHOTS ?? null;
const extension = path.resolve(process.env.EXT ?? "extension");
const t0 = Date.now();
const log = (...args) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(6), ...args);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const context = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  viewport: { width: 1100, height: 650 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
// Automated windows are refused pointer lock, which the game needs to leave "click to start" (as in test/e2e.mjs).
await context.addInitScript(() => {
  let locked = null;
  Object.defineProperty(Document.prototype, "pointerLockElement", { configurable: true, get: () => locked });
  const notify = () => setTimeout(() => document.dispatchEvent(new Event("pointerlockchange")), 0);
  Element.prototype.requestPointerLock = function () {
    locked = this;
    notify();
    return Promise.resolve();
  };
  Document.prototype.exitPointerLock = function () {
    locked = null;
    notify();
  };
});
const page = context.pages()[0] ?? (await context.newPage());
page.on("pageerror", (error) => log("[pageerror]", error.message));

// Every "name" is: "value^7" line the engine prints for a cheats_* dvar, latest value per name.
const dvars = new Map();
page.on("console", (message) => {
  const match = message.text().match(/^"(cheats_\w+)" is: "(.*?)\^7"/);
  if (match) dvars.set(match[1], match[2]);
  else if (/cheats|script compile|unknown function|bad syntax/i.test(message.text())) log("[game]", message.text().slice(0, 300));
});

let shot = 0;
const snap = async (label) => {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${String(++shot).padStart(2, "0")}-${MAP}-${label}.png`) });
};

/** Sends a console command through the extension's engine mailbox (retries while the previous one is pending). */
async function command(text) {
  for (let i = 0; i < 100; i += 1) {
    if (await page.evaluate((t) => window.__bo1Coop?.engine?.command(t) === true, text)) return;
    await wait(50);
  }
  throw new Error(`engine did not take "${text}"`);
}

/** Asks the engine for a dvar's value and waits for the printed answer. */
async function readDvar(name, timeoutMs = 5000) {
  dvars.delete(name);
  await command(name);
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (dvars.has(name)) return dvars.get(name);
    await wait(100);
  }
  return null;
}

async function setCheats(on) {
  await page.goto("https://vel.gg/bsz/", { waitUntil: "domcontentloaded" });
  await page.evaluate((v) => localStorage.setItem("bo1coop.cheats", v), on ? "1" : "0");
}

async function startMap() {
  await page.goto(`https://vel.gg/bsz/${MAP}/${process.env.HORDE ? "?horde=1" : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.innerText?.trim() === "PLAY"), null, { timeout: 60000 });
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.innerText?.trim() === "PLAY").click());
  log("loading", MAP);
  const end = Date.now() + 15 * 60000;
  while (Date.now() < end) {
    const screen = await page.evaluate(() => window.five?.screen ?? null);
    if (screen === "playing") return;
    await page.mouse.click(550, 325).catch(() => {});
    await wait(3000);
  }
  throw new Error("the map never started");
}

async function waitReady(timeoutMs = 180000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const state = await readDvar("cheats_state", 3000);
    if (state?.startsWith("ready=1")) return state;
    await wait(2000);
  }
  return null;
}

let seq = 0;
/** Sends one cheat command and waits for its result: { ok, code, detail }. */
async function run(cmd, timeoutMs = 20000) {
  seq += 1;
  const mine = seq;
  await command(`set cheats_cmd "${mine} ${cmd}"`);
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const result = await readDvar("cheats_result", 2000);
    if (result?.startsWith(`${mine} `)) {
      const [, status, code = "", ...rest] = result.split(" ");
      log(`  ${cmd} -> ${result}`);
      return { ok: status === "ok", code, detail: rest.join(" ") };
    }
    await wait(300);
  }
  throw new Error(`no result for "${cmd}"`);
}

/** The game script's published state as an object (numbers and booleans). */
async function state() {
  const value = (await readDvar("cheats_state")) ?? "";
  return Object.fromEntries(value.split(" ").filter(Boolean).map((pair) => pair.split("=")).map(([k, v]) => [k, Number(v)]));
}

/** Waits until the published state satisfies `test`. */
async function until(test, timeoutMs, what) {
  const end = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < end) {
    last = await state();
    if (test(last)) return last;
    await wait(1000);
  }
  throw new Error(`${what}: last state ${JSON.stringify(last)}`);
}

/** Player 0's points, read where Fun mode reads them (src/fun/fun.js). */
const score = () =>
  page.evaluate(() => {
    const { build, engine } = window.__bo1Coop;
    const f = build.fun;
    const client = engine.int(f.entities + f.ent.client);
    return engine.int(client + f.client.score);
  });

// Wonder weapons first: the sweep gives the first one the map lists.
const WONDER = ["microwavegundw_zm", "microwavegun_zm", "shrink_ray_zm", "humangun_zm", "sniper_explosive_zm", "freezegun_zm", "thundergun_zm", "tesla_gun_zm", "ray_gun_zm"];

async function lists() {
  await until((s) => s.lists >= 1, 30000, "lists published");
  const chunks = Number(await readDvar("cheats_weapons_count"));
  const weapons = [];
  for (let i = 0; i < chunks; i += 1) weapons.push(...((await readDvar(`cheats_weapons_${i}`)) ?? "").split(",").filter(Boolean));
  const perks = ((await readDvar("cheats_perks")) ?? "").split(",").filter(Boolean);
  const powerups = ((await readDvar("cheats_powerups")) ?? "").split(",").filter(Boolean);
  return { weapons, perks, powerups };
}

/** Clicks a button in the card (its shadow root is closed; the session keeps a reference to it). */
const clickCard = (selector) =>
  page.evaluate((s) => {
    const button = window.__bo1Coop.card.root.querySelector(s);
    if (!button) throw new Error(`no ${s} in the card`);
    button.click();
  }, selector);
const cardText = (pattern, timeout) => page.waitForFunction((p) => new RegExp(p).test(window.__bo1Coop.card.root.textContent), pattern, { timeout });
const compact = () => page.evaluate(() => window.__bo1Coop.card.host.classList.contains("compact"));

const scenarios = {
  // Everything once on this map; writes what happened to SWEEP_OUT (JSON) and fails only when the script never loads.
  async sweep() {
    await setCheats(true);
    await startMap();
    assert.ok(await waitReady(), "the game script never reported ready");
    await command("god");
    const found = await lists();
    log("weapons:", found.weapons.join(" "));
    log("perks:", found.perks.join(" "));
    log("power-ups:", found.powerups.join(" "));
    const results = {};
    const weapon = WONDER.find((w) => found.weapons.includes(w)) ?? found.weapons[0];
    results[`give ${weapon}`] = await run(`give 0 ${weapon}`);
    await wait(2500);
    results.pap = await run("pap 0");
    for (const perk of found.perks) results[`perk ${perk}`] = await run(`perk 0 ${perk}`, 40000);
    if (found.powerups.length) results[`powerup ${found.powerups[0]}`] = await run(`powerup 0 ${found.powerups[0]}`);
    const horde = (await state()).horde === 1;
    results["round 5"] = await run("round 5");
    if (!horde)
      await until((s) => s.round === 5, 60000, "round 5").then(
        () => (results["round 5 reached"] = { ok: true }),
        (e) => (results["round 5 reached"] = { ok: false, code: e.message }),
      );
    await snap("sweep");
    if (process.env.SWEEP_OUT) fs.writeFileSync(process.env.SWEEP_OUT, JSON.stringify({ map: MAP, horde, ...found, results }, null, 2));
    for (const [what, r] of Object.entries(results)) log(r.ok ? "ok  " : "ERR ", what, r.ok ? "" : `${r.code} ${r.detail ?? ""}`);
    log("debug:", await readDvar("cheats_debug"));
  },
  // Through the card as a player would: M opens it in game, a perk and a weapon button, the notices.
  async ui() {
    await setCheats(true);
    await startMap();
    assert.ok(await waitReady(), "ready");
    await command("god");
    await page.waitForFunction(() => window.__bo1Coop.cheats.perks.length > 0 && window.__bo1Coop.cheats.weapons.length > 0, null, { timeout: 30000 });
    assert.equal(await compact(), true, "the card is hidden while playing");
    await page.keyboard.press("m");
    await page.waitForFunction(() => !window.__bo1Coop.card.host.classList.contains("compact"), null, { timeout: 5000 });
    assert.equal(await page.evaluate(() => window.__bo1Coop.engine.menuOpen()), false, "M must not open the pause menu");
    await clickCard('button[data-act="cheatPerk"][data-arg="specialty_armorvest"]');
    await cardText("Juggernog given to", 40000);
    assert.equal(await page.evaluate(() => window.__bo1Coop.engine.menuOpen()), false, "still not paused after using the card");
    await clickCard('button[data-act="cheatGive"][data-arg="thundergun_zm"]');
    await cardText("Thundergun given to", 20000);
    await snap("ui");
    await page.mouse.click(300, 400); // back into the game takes the mouse and hides the card
    await page.waitForFunction(() => window.__bo1Coop.card.host.classList.contains("compact"), null, { timeout: 5000 });
  },
  async actions() {
    // Also sends "clear" (zombies left this round = 0, every zombie killed): what makes a round end on its own.
    await setCheats(true);
    await startMap();
    assert.ok(await waitReady(), "the game script never reported ready");
    await command("god"); // the test player stands still; zombies must not end the game
    await until((s) => s.lists >= 1, 30000, "lists published");
    const chunks = Number(await readDvar("cheats_weapons_count"));
    const weapons = [];
    for (let i = 0; i < chunks; i += 1) weapons.push(...(await readDvar(`cheats_weapons_${i}`)).split(","));
    const perks = (await readDvar("cheats_perks")).split(",");
    const powerups = (await readDvar("cheats_powerups")).split(",");
    log("weapons:", weapons.join(" "));
    log("perks:", perks.join(" "));
    log("power-ups:", powerups.join(" "));
    assert.ok(weapons.includes("ray_gun_zm") && weapons.length > 10, "weapon list");
    assert.ok(perks.includes("specialty_armorvest"), "perk list");
    assert.ok(powerups.includes("full_ammo"), "power-up list");

    assert.equal((await run("give 0 ray_gun_zm")).ok, true, "give");
    await wait(2000);
    assert.equal((await run("pap 0")).ok, true, "pap");
    await wait(2000);
    assert.equal((await run("pap 0")).code, "has_upgrade", "pap twice");
    const before = await score();
    assert.equal((await run("perk 0 specialty_armorvest", 30000)).ok, true, "perk");
    assert.equal(await score(), before, "a perk is free");
    assert.equal((await run("powerup 0 full_ammo")).ok, true, "power-up");
    assert.equal((await run("give 3 ray_gun_zm")).code, "no_player", "missing player");
    assert.equal((await run("give 0 not_a_weapon_zm")).code, "no_weapon", "unknown weapon");
    await snap("given");

    assert.equal((await run("round 10")).ok, true, "round 10");
    await until((s) => s.round === 10, 60000, "round 10");
    assert.equal((await run("round 3")).ok, true, "round 3");
    await until((s) => s.round === 3, 60000, "back to round 3");

    assert.equal((await run("freeze 1")).ok, true, "freeze");
    await wait(5000);
    assert.equal((await run("clear")).ok, true, "clear");
    await wait(20000);
    const frozen = await state();
    assert.equal(frozen.round, 3, "a frozen round does not advance");
    assert.equal(frozen.frozen, 1, "state says frozen");
    await snap("frozen");
    log("frozen state:", JSON.stringify(frozen));
    assert.equal((await run("freeze 0")).ok, true, "unfreeze");
    await wait(5000);
    log("after unfreezing:", JSON.stringify(await state()));
    await until((s) => s.round === 4, 60000, "the round moves on after unfreezing");
  },
  async freeze() {
    await setCheats(true);
    await startMap();
    assert.ok(await waitReady(), "ready");
    await command("god");
    await until((s) => s.active === 1, 60000, "round active");
    await run("freeze 1");
    await wait(3000);
    await run("clear");
    for (let i = 0; i < 4; i += 1) {
      log("frozen:", JSON.stringify(await state()));
      await wait(3000);
    }
    await run("freeze 0");
    for (let i = 0; i < 16; i += 1) {
      log("after:", JSON.stringify(await state()));
      await wait(4000);
    }
  },
  async load() {
    await setCheats(true);
    await startMap();
    const state = await waitReady();
    await snap("ready");
    log("cheats_state:", state);
    assert.ok(state, "the game script never reported ready");
    const ok = await page.evaluate(() => window.__bo1Coop.cheats.ok);
    assert.equal(ok, true, "session.cheats.ok");
    // the card's side (src/cheats/bridge.js) gets the map's lists by itself
    await page.waitForFunction(() => window.__bo1Coop.cheats.weapons.length > 10 && window.__bo1Coop.cheats.perks.length > 0 && window.__bo1Coop.cheats.round > 0, null, { timeout: 30000 });
    const seen = await page.evaluate(() => ({ weapons: window.__bo1Coop.cheats.weapons.length, perks: window.__bo1Coop.cheats.perks, powerups: window.__bo1Coop.cheats.powerups, round: window.__bo1Coop.cheats.round }));
    log("card side:", JSON.stringify(seen));
  },
  async off() {
    await setCheats(false);
    await startMap();
    await wait(15000);
    const state = await readDvar("cheats_state", 3000);
    const ok = await page.evaluate(() => window.__bo1Coop.cheats.ok);
    log("cheats_state:", state, "ok:", ok);
    assert.equal(state, null, "the script must not run with the setting off");
    assert.equal(ok, null, "no mod handed to the engine");
    await setCheats(true);
  },
};

try {
  if (!scenarios[SCENARIO]) throw new Error(`unknown scenario ${SCENARIO}`);
  await scenarios[SCENARIO]();
  log(`PASS ${MAP} ${SCENARIO}`);
} catch (error) {
  await snap("failed").catch(() => {});
  const inside = await page
    .evaluate(() => {
      const s = window.__bo1Coop;
      const c = s.cheats;
      return { screen: window.five?.screen, menuOpen: s.engine?.menuOpen(), ok: c.ok, ready: c.ready, seq: c.seq, lastSeq: c.lastSeq, resultSeq: c.resultSeq, outbox: c.outbox, queue: s.fun.queue, notice: s.fun.notice, panel: c.panel, log: s.log.slice(-5) };
    })
    .catch((e) => e.message);
  log("inside:", JSON.stringify(inside));
  log(`FAIL ${MAP} ${SCENARIO}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await context.close();
}
