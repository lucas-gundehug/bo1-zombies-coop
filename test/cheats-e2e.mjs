// The cheat menu on the real vel.gg: one browser with the extension, a map, the game script, its commands.
//   node test/cheats-e2e.mjs [map=kino] [scenario=load]
// Scenarios: load (the script reports ready), off (with the setting off nothing loads), actions (every command, Task 2).
// PROFILE=<dir> reuses a browser profile (the map packs are downloaded once per profile and kept), default in the OS
// temp folder. SHOTS=<dir> saves a screenshot after each step.
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
  await page.goto(`https://vel.gg/bsz/${MAP}/`, { waitUntil: "domcontentloaded" });
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

async function waitReady(timeoutMs = 90000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const state = await readDvar("cheats_state", 3000);
    if (state?.startsWith("ready=1")) return state;
    await wait(2000);
  }
  return null;
}

const scenarios = {
  async load() {
    await setCheats(true);
    await startMap();
    const state = await waitReady();
    await snap("ready");
    log("cheats_state:", state);
    assert.ok(state, "the game script never reported ready");
    const ok = await page.evaluate(() => window.__bo1Coop.cheats.ok);
    assert.equal(ok, true, "session.cheats.ok");
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
  log(`FAIL ${MAP} ${SCENARIO}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await context.close();
}
