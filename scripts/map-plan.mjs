// Makes the in-game map's floor plans (src/map/plans/<slug>.json) from the real game on vel.gg.
//   node scripts/map-plan.mjs <slug|all>     loads each map, asks the game script for its dump, saves the dump to
//                                            scripts/map-dumps/<slug>.txt and builds the plan from it
//   node scripts/map-plan.mjs rebuild        builds every plan again from the saved dumps (no game; after changing
//                                            the floors in src/map/names.js or the builder)
// PROFILE=<dir> reuses a browser profile with the map packs already downloaded (as test/cheats-e2e.mjs).
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildPlan } from "./plan-build.mjs";
import { FLOORS } from "../src/map/names.js";
import { validPlan } from "../src/map/plan.js";

const SLUGS = ["nacht", "verruckt", "shinonuma", "riese", "kino", "five", "ascension", "cotd", "shangrila", "moon"];
const DUMPS = path.resolve("scripts/map-dumps");
const PLANS = path.resolve("src/map/plans");
const arg = process.argv[2] ?? "all";
const t0 = Date.now();
const log = (...args) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(6), ...args);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
fs.mkdirSync(DUMPS, { recursive: true });
fs.mkdirSync(PLANS, { recursive: true });

/** Builds and writes one plan from its saved dump. `sig` (from the live game) must match when given. */
function writePlan(slug, sig) {
  const dump = fs.readFileSync(path.join(DUMPS, `${slug}.txt`), "utf8");
  const plan = buildPlan(dump, { slug, floors: FLOORS[slug] ?? [{ name: "Ground floor", below: null }] });
  if (!validPlan(plan)) throw new Error(`${slug}: the plan is not valid`);
  if (sig && plan.sig !== sig) throw new Error(`${slug}: plan sig ${plan.sig}, game ${sig}`);
  fs.writeFileSync(path.join(PLANS, `${slug}.json`), JSON.stringify(plan));
  log(`${slug}: ${plan.rooms.length} rooms, ${plan.doors.length} doors, ${plan.pois.length} points, ${plan.rooms.reduce((n, r) => n + r.rects.length, 0)} rects`);
}

async function dumpFromGame(slugs) {
  const extension = path.resolve("extension");
  const context = await chromium.launchPersistentContext(process.env.PROFILE ?? path.join(os.tmpdir(), "bo1-cheats-profile"), {
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
  const dvars = new Map();
  page.on("console", (message) => {
    const match = message.text().match(/^"(cheats_\w+)" is: "(.*?)\^7"/);
    if (match) dvars.set(match[1], match[2]);
  });
  const command = async (text) => {
    for (let i = 0; i < 100; i += 1) {
      if (await page.evaluate((t) => window.__bo1Coop?.engine?.command(t) === true, text)) return;
      await wait(50);
    }
    throw new Error(`engine did not take "${text}"`);
  };
  const readDvar = async (name, timeoutMs = 5000) => {
    dvars.delete(name);
    await command(name);
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      if (dvars.has(name)) return dvars.get(name);
      await wait(100);
    }
    return null;
  };
  const until = async (name, test, timeoutMs) => {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const value = await readDvar(name, 3000).catch(() => null); // the engine may be busy for a moment
      if (value != null && test(value)) return value;
      await wait(1500);
    }
    throw new Error(`${name} never ready`);
  };
  try {
    await page.goto("https://vel.gg/bsz/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.setItem("bo1coop.cheats", "1"));
    for (const slug of slugs) {
      await page.goto(`https://vel.gg/bsz/${slug}/`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.innerText?.trim() === "PLAY"), null, { timeout: 120000 });
      await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.innerText?.trim() === "PLAY").click());
      log("loading", slug);
      const end = Date.now() + 20 * 60000;
      while ((await page.evaluate(() => window.five?.screen ?? null)) !== "playing") {
        if (Date.now() > end) throw new Error(`${slug} never started`);
        await page.mouse.click(550, 325).catch(() => {});
        await wait(3000);
      }
      await until("cheats_state", (v) => /lists=[1-9]/.test(v), 600000).catch(async (error) => {
        await page.screenshot({ path: path.resolve(`.superpowers/map-plan-${slug}-failed.png`) }).catch(() => {});
        throw error;
      });
      const sig = (await until("cheats_map_state", (v) => v.startsWith("sig="), 30000)).match(/^sig=(\S+)/)[1];
      await command("set cheats_map_dump 1");
      const count = Number(await until("cheats_map_dump_count", (v) => Number(v) > 0, 60000));
      const chunks = [];
      for (let i = 0; i < count; i += 1) {
        const chunk = await readDvar(`cheats_map_dump_${i}`);
        if (!chunk) throw new Error(`${slug}: chunk ${i} missing`);
        chunks.push(chunk);
      }
      fs.writeFileSync(path.join(DUMPS, `${slug}.txt`), chunks.join(";"));
      log(`${slug}: dump of ${count} chunks, sig ${sig}`);
      writePlan(slug, sig);
    }
  } finally {
    await context.close();
  }
}

if (arg === "rebuild") {
  for (const slug of SLUGS) if (fs.existsSync(path.join(DUMPS, `${slug}.txt`))) writePlan(slug);
} else {
  if (arg !== "all" && !SLUGS.includes(arg)) throw new Error(`unknown map ${arg}`);
  await dumpFromGame(arg === "all" ? SLUGS : [arg]);
}
