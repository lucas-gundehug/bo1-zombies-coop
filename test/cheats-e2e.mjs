// The cheat menu on the real vel.gg: one browser with the extension, a map, the game script, its commands.
//   node test/cheats-e2e.mjs [map=kino] [scenario=load]
// Scenarios: load (the script reports ready), off (with the setting off nothing loads), actions (every command, Task 2),
// findview (where a new engine keeps my view, for src/map/view.js), box (the Mystery Box on the map, two matches).
// PROFILE=<dir> reuses a browser profile (the map packs are downloaded once per profile and kept), default in the OS
// temp folder. SHOTS=<dir> saves a screenshot after each step. HORDE=1 plays vel.gg's Hell mode (?horde=1). The window stays
// off-screen; SHOW=1 puts it on screen.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { viewAddresses } from "../src/map/view.js";

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
  args: [
    // off-screen unless SHOW=1 (Lucas's choice: no test windows on his screens), and never throttled for being hidden
    ...(process.env.SHOW ? [] : ["--window-position=-32000,-32000"]),
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-background-timer-throttling",
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
  ],
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
/** Sends one cheat command straight to the console and waits for its result: { ok, code, detail }. */
async function run(cmd, timeoutMs = 20000) {
  seq += 1;
  const mine = seq;
  await command(`set cheats_cmd "${mine} ${cmd}"`);
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const entry = ((await readDvar("cheats_results", 2000)) ?? "").split(";").find((e) => e.startsWith(`${mine} `));
    if (entry) {
      const [, status, code = "", ...rest] = entry.split(" ");
      log(`  ${cmd} -> ${entry}`);
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
  // Quick clicks through the card (the bridge sends them in turn): every one answered, perks still free.
  async race() {
    await setCheats(true);
    await startMap();
    assert.ok(await waitReady(), "ready");
    await command("god");
    await page.waitForFunction(() => window.__bo1Coop.cheats.perks.length > 0, null, { timeout: 30000 });
    const before = await score();
    await page.evaluate(() => {
      const c = window.__bo1Coop.cheats;
      const shown = c.onResult;
      window.__results = [];
      c.onResult = (r, s) => {
        window.__results.push([r.seq, r.ok, r.code, s.action, s.arg]);
        shown(r, s);
      };
      const h = window.__bo1Coop.card.handlers;
      h.cheatPerk("specialty_armorvest");
      h.cheatPerk("specialty_fastreload");
      h.cheatGive("ray_gun_zm");
    });
    await page.waitForFunction(() => window.__results.length >= 3, null, { timeout: 120000 }).catch(() => {});
    const results = await page.evaluate(() => window.__results);
    log("results:", JSON.stringify(results));
    assert.equal(results.length, 3, "every click answered");
    assert.ok(results.every((r) => r[1]), "every click worked");
    assert.equal(await score(), before, "two perks at once are still free");
  },
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
  },
  // Through the card as a player would: N opens it in game, a perk and a weapon button, the notices.
  async ui() {
    await setCheats(true);
    await startMap();
    assert.ok(await waitReady(), "ready");
    await command("god");
    await page.waitForFunction(() => window.__bo1Coop.cheats.perks.length > 0 && window.__bo1Coop.cheats.weapons.length > 0, null, { timeout: 30000 });
    assert.equal(await compact(), true, "the card is hidden while playing");
    await page.keyboard.press("n");
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
  // The map's side of the game script (src/cheats/gsc/_map.gsc): live data, door state, the one-off dump.
  async "map-script"() {
    await setCheats(true);
    await startMap();
    assert.ok(await waitReady(), "ready");
    await until((s) => s.lists >= 1, 30000, "lists published");
    const live = async () => {
      const value = (await readDvar("cheats_map_live")) ?? "";
      const v = Number(value.match(/^v=(\d+)/)?.[1] ?? NaN);
      const players = (value.match(/ p=(.*)$/)?.[1] ?? "").split(";").filter(Boolean).map((e) => e.split(",").map(Number));
      return { v, players };
    };
    const end = Date.now() + 10000;
    let me = null;
    while (Date.now() < end && !me) {
      me = (await live()).players.find((p) => p[0] === 0 && p.length === 7 && p[5] >= 0 && p[6] === 0) ?? null;
      if (!me) await wait(500);
    }
    log("live, player 0:", JSON.stringify(me));
    assert.ok(me, "player 0 in cheats_map_live with a room, alive");
    const mapState = async () => {
      const value = (await readDvar("cheats_map_state")) ?? "";
      return Object.fromEntries(value.split(" ").filter(Boolean).map((pair) => pair.split("=")));
    };
    const before = await mapState();
    log("map state:", JSON.stringify(before));
    const [, rooms, doors] = before.sig?.match(/^z(\d+)d(\d+)c\d+$/) ?? [];
    assert.ok(Number(rooms) >= 1, `sig ${before.sig}`);
    assert.equal(before.doors?.length ?? 0, Number(doors), "one door bit per door");
    assert.equal(before.rooms?.length, Number(rooms), "one room bit per room");
    // MAPDOOR=<i> opens another door than the first (a debris pile on Five: 8)
    const door = Number(process.env.MAPDOOR ?? 0);
    if (Number(doors) > door) {
      // the door hook works only for tests (it makes every door free for a second)
      assert.equal((await run(`mapdoor ${door}`)).code, "test_only", "mapdoor without cheats_test");
      await command("set cheats_test 1");
      const v0 = (await live()).v;
      assert.equal((await run(`mapdoor ${door}`)).ok, true, `mapdoor ${door}`);
      const doorEnd = Date.now() + 5000;
      let after = null;
      while (Date.now() < doorEnd) {
        const { v } = await live();
        after = await mapState();
        if (v > v0 && after.doors[door] === "1") break;
        await wait(300);
      }
      log(`after mapdoor ${door}:`, JSON.stringify(after));
      assert.equal(after.doors[door], "1", `door ${door} open`);
    }
    await command("set cheats_map_dump 1");
    let count = 0;
    for (let i = 0; i < 20 && !count; i += 1) {
      count = Number(await readDvar("cheats_map_dump_count", 2000)) || 0;
      if (!count) await wait(1000);
    }
    assert.ok(count > 0, "dump chunks");
    for (let i = 0; i < count; i += 1) {
      const chunk = await readDvar(`cheats_map_dump_${i}`);
      assert.ok(chunk && chunk.length < 400, `dump chunk ${i}: ${chunk?.length}`);
    }
    log("dump chunks:", count);
  },
  // The Mystery Box on the map, in two matches (the game shuffles its box spots every match): the map marks the one spot
  // where the game's box stands, and every spot in a fire sale. With SHOTS, pictures from around the marked spot.
  async box() {
    await setCheats(true);
    for (let match = 0; match < 2; match += 1) {
      await startMap();
      assert.ok(await waitReady(), "ready");
      await until((s) => s.lists >= 1, 30000, "lists published");
      await command("god");
      await page.waitForFunction(() => window.__bo1Coop.map.planOk === true && window.__bo1Coop.minimap.model, null, { timeout: 20000 });
      const said = (await readDvar("cheats_map_state")).match(/ box=(\S*)/)[1];
      const marked = await page.evaluate(() => window.__bo1Coop.minimap.model.pois.filter((p) => p.kind === "box" && p.active).map((p) => p.at));
      log(`match ${match}: the game says box=${said}, the map marks ${JSON.stringify(marked)}`);
      const [x, y] = said.split(":").map(Number);
      assert.equal(marked.length, 1, "one box marked");
      assert.ok(Math.hypot(marked[0][1] - x, marked[0][2] - y) < 64, "the marked spot is where the game's box is");
      if (match === 1) {
        // the power-up drops 80 units in front of me: walk into it
        assert.equal((await run("powerup 0 fire_sale")).ok, true, "fire sale");
        await page.keyboard.down("w");
        await wait(1200);
        await page.keyboard.up("w");
        await page.waitForFunction(() => window.__bo1Coop.map.state?.box.length > 1, null, { timeout: 15000 });
        const all = await page.evaluate(() => window.__bo1Coop.minimap.model.pois.filter((p) => p.kind === "box").every((p) => p.active));
        log("fire sale: every spot marked:", all);
        assert.ok(all, "every spot marked in a fire sale");
      }
      if (SHOTS) {
        // the box's height from the dump, then a look at it from each side
        await command("set cheats_map_dump 1");
        let count = 0;
        for (let i = 0; i < 20 && !count; i += 1) {
          count = Number(await readDvar("cheats_map_dump_count", 2000)) || 0;
          if (!count) await wait(1000);
        }
        let text = "";
        for (let i = 0; i < count; i += 1) text += await readDvar(`cheats_map_dump_${i}`);
        const z = [...text.matchAll(/P,box,-,(-?\d+),(-?\d+),(-?\d+)/g)].map((m) => m.slice(1).map(Number)).find(([bx, by]) => Math.hypot(bx - x, by - y) < 64)[2];
        for (const [dx, dy, yaw] of [[0, -120, 90], [0, 120, -90], [-120, 0, 0], [120, 0, 180]]) {
          await command(`setviewpos ${x + dx} ${y + dy} ${z + 40} ${yaw}`);
          await wait(800);
          await snap(`box-match${match}-yaw${yaw}`);
        }
      }
    }
  },
  // The whole map in one browser: M opens it without pausing or taking the mouse, a bought door disappears from it, M
  // closes it, and the game runs as smoothly with it open.
  async map() {
    await setCheats(true);
    await startMap();
    assert.ok(await waitReady(), "ready");
    await until((s) => s.lists >= 1, 30000, "lists published");
    await page.waitForFunction(() => window.__bo1Coop.map.planOk === true, null, { timeout: 20000 });
    const frames = (ms) =>
      page.evaluate(
        (duration) =>
          new Promise((resolve) => {
            const gaps = [];
            let last = performance.now();
            const end = last + duration;
            const step = (t) => {
              gaps.push(t - last);
              last = t;
              if (t < end) requestAnimationFrame(step);
              else {
                gaps.sort((a, b) => a - b);
                resolve({ median: gaps[Math.floor(gaps.length / 2)], p95: gaps[Math.floor(gaps.length * 0.95)], frames: gaps.length });
              }
            };
            requestAnimationFrame(step);
          }),
        ms,
      );
    // the game's own icons were read from the pack: every perk machine on this map, and the box
    const needed = await page.evaluate(() => {
      const plan = window.__bo1Coop.map.plan;
      const ids = new Set(plan.pois.filter((p) => p.kind === "perk").map((p) => p.id));
      if (plan.pois.some((p) => p.kind === "box")) ids.add("box");
      return [...ids];
    });
    await page.waitForFunction((ids) => ids.every((id) => window.__bo1Coop.map.icons.has(id)), needed, { timeout: 30000 });
    log("icons:", JSON.stringify(needed));
    // the corner minimap is on by itself, with the room; the setting turns it off; frames are as smooth either way
    await page.waitForFunction(() => window.__bo1Coop.minimap.shown && window.__bo1Coop.minimap.model?.room, null, { timeout: 10000 });
    log("minimap room:", await page.evaluate(() => window.__bo1Coop.minimap.model.room));
    await snap("minimap");
    // it follows me every frame and turns with me: facing a known way, then walking, my arrow moves in nearly every frame
    const [vx, vy, vz] = await page.evaluate(() => window.five.views.at(-1).origin);
    await command(`setviewpos ${vx} ${vy} ${vz + 60} 37`); // setviewpos takes the eye height
    await page.waitForFunction(() => Math.abs(window.__bo1Coop.minimap.model.players.find((p) => p.me).yaw - 37) < 0.5, null, { timeout: 3000 });
    await page.keyboard.down("w");
    const walk = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let frames = 0;
          let moved = 0;
          let last = null;
          const end = performance.now() + 2000;
          const step = (t) => {
            const me = window.__bo1Coop.minimap.model.players.find((p) => p.me);
            frames += 1;
            if (last && (me.x !== last.x || me.y !== last.y)) moved += 1;
            last = me;
            if (t < end) requestAnimationFrame(step);
            else resolve({ frames, moved, fromEngine: window.__bo1Coop.minimap.fromEngine });
          };
          requestAnimationFrame(step);
        }),
    );
    await page.keyboard.up("w");
    log("walking, the minimap moved in", JSON.stringify(walk));
    assert.equal(walk.fromEngine, true, "my view is read from the engine");
    assert.ok(walk.moved >= walk.frames * 0.8, `my arrow moved in ${walk.moved} of ${walk.frames} frames`);
    await snap("minimap-turned");
    const withMinimap = await frames(10000);
    await page.evaluate(() => window.__bo1Coop.card.handlers.minimapSetting());
    await page.waitForFunction(() => !window.__bo1Coop.minimap.shown, null, { timeout: 2000 });
    const closed = await frames(10000);
    log("frames with the minimap:", JSON.stringify(withMinimap), "without:", JSON.stringify(closed));
    assert.ok(withMinimap.p95 <= closed.p95 * 1.2 + 2, `frame time with the minimap: p95 ${withMinimap.p95.toFixed(1)} ms vs ${closed.p95.toFixed(1)} ms without`);
    await page.evaluate(() => window.__bo1Coop.card.handlers.minimapSetting());
    await page.waitForFunction(() => window.__bo1Coop.minimap.shown, null, { timeout: 2000 });
    await page.keyboard.press("m");
    await page.waitForFunction(() => !window.__bo1Coop.minimap.shown, null, { timeout: 2000 }); // hidden under the big map
    const opened = await page.evaluate(() => {
      const c = window.__bo1Coop;
      return { open: c.map.open, screen: window.five?.screen, menuOpen: c.engine.menuOpen(), locked: Boolean(document.pointerLockElement) };
    });
    log("after N:", JSON.stringify(opened));
    assert.deepEqual(opened, { open: true, screen: "playing", menuOpen: false, locked: true });
    await page.waitForFunction(() => window.__bo1Coop.mapOverlay.model?.status === "ok" && window.__bo1Coop.mapOverlay.model.room, null, { timeout: 5000 });
    const model = await page.evaluate(() => {
      const m = window.__bo1Coop.mapOverlay.model;
      return { room: m.room, floor: m.floor, doors: m.doors.map((d) => d.index), players: m.players.length, stale: m.stale };
    });
    log("model:", JSON.stringify(model));
    assert.equal(model.stale, false);
    assert.ok(model.doors.includes(0), "door 0 shown closed");
    await snap("map-open");
    const open = await frames(10000);
    log("frames closed:", JSON.stringify(closed), "open:", JSON.stringify(open));
    assert.ok(open.p95 <= closed.p95 * 1.2 + 2, `frame time with the map open: p95 ${open.p95.toFixed(1)} ms vs ${closed.p95.toFixed(1)} ms closed`);
    await command("set cheats_test 1");
    assert.equal((await run("mapdoor 0")).ok, true, "mapdoor 0");
    await page.waitForFunction(() => !window.__bo1Coop.mapOverlay.model.doors.some((d) => d.index === 0), null, { timeout: 2000 });
    await snap("map-door-open");
    await page.keyboard.press("m");
    await page.waitForFunction(() => window.__bo1Coop.mapOverlay.host.style.display === "none", null, { timeout: 2000 });
    await page.waitForFunction(() => window.__bo1Coop.minimap.shown, null, { timeout: 2000 }); // back once the big map closes
    assert.equal(await page.evaluate(() => window.five?.screen), "playing");
  },
  // Where this engine keeps my view (src/map/view.js): stands still, turns to a known facing, and looks through the
  // engine's static data for my x and y followed by that yaw. Prints the entry to put in VIEWS when vel.gg ships a new
  // engine. On a build already listed there, the minimap must show the facing it found.
  async findview() {
    await setCheats(true);
    await startMap();
    assert.ok(await waitReady(), "ready");
    await command("god");
    await page.waitForFunction(() => window.__bo1Coop.minimap.shown, null, { timeout: 30000 });
    await wait(1500); // vel.gg's own report is a second behind: after standing still it is where I am
    const [x, y, z] = await page.evaluate(() => window.five.views.at(-1).origin);
    await command(`setviewpos ${x} ${y} ${z + 60} 37`); // setviewpos takes the eye height
    await wait(1000);
    const found = await page.evaluate(
      ([x, y]) => {
        const f32 = new Float32Array(window.__bo1Coop.engine.buffer);
        const hits = [];
        for (let i = 0; i < 160e6 / 4; i += 1) {
          if (Math.abs(f32[i] - x) < 1 && Math.abs(f32[i + 1] - y) < 1 && Math.abs(f32[i + 4] - 37) < 0.01) hits.push([i * 4, f32[i + 2]]);
        }
        return { hash: window.__bo1Coop.hash, hits };
      },
      [x, y],
    );
    log("found", JSON.stringify(found));
    // the client's two copies: the eye one about 60 units above the feet one, near it (the server keeps a copy at the
    // feet too, which only the host has)
    const pairs = found.hits.flatMap(([a, az]) => found.hits.filter(([, bz]) => bz - az > 40 && bz - az < 80).map(([b]) => [a, b]));
    assert.ok(pairs.length, "a view at the feet with one at the eye");
    const [feet, eye] = pairs.sort((p, q) => Math.abs(p[1] - p[0]) - Math.abs(q[1] - q[0]))[0];
    log(`VIEWS entry: "${found.hash}": { feet: ${feet}, eye: ${eye} },`);
    if (viewAddresses(found.hash)) {
      assert.deepEqual(viewAddresses(found.hash), { feet, eye });
      const yaw = await page.evaluate(() => window.__bo1Coop.minimap.model.players.find((p) => p.me).yaw);
      assert.ok(Math.abs(yaw - 37) < 0.5, `the minimap's facing: ${yaw}`);
    }
  },
  // Health levels: player 0's health follows the level (read where Fun mode reads entity fields, src/fun/fun.js)
  async health() {
    await setCheats(true);
    await startMap();
    assert.ok(await waitReady(), "ready");
    await command("god"); // no zombie may change the numbers while we read them
    const health = () => page.evaluate(() => {
      const { build, engine } = window.__bo1Coop;
      return engine.int(build.fun.entities + build.fun.ent.health);
    });
    // the entity's maxHealth sits right after health
    const maxHealth = () => page.evaluate(() => {
      const { build, engine } = window.__bo1Coop;
      return engine.int(build.fun.entities + build.fun.ent.health + 4);
    });
    // A hit, faked by writing the health: the game's own regeneration (_gameskill, setnormalhealth) must bring it back
    // to the full level. It heals to the client's session max, which the level must have moved too: a light hit, and a
    // deep one (below the "very hurt" line, where regeneration is slow).
    const regenerates = async (full, label) => {
      for (const ratio of [0.6, 0.1]) {
        const hurt = Math.max(1, Math.round(full * ratio));
        await page.evaluate((h) => {
          const { build, engine } = window.__bo1Coop;
          engine.setInt(build.fun.entities + build.fun.ent.health, h);
        }, hurt);
        const end = Date.now() + 40000;
        let now = hurt;
        while (Date.now() < end && now !== full) {
          await wait(250);
          now = await health();
        }
        log(`${label}: hurt to ${hurt}, regenerated to ${now}`);
        assert.equal(now, full, `${label}: regenerates from ${hurt} to the full ${full}`);
      }
    };
    const start = await health();
    log("health at the start:", start);
    for (const pct of [200, 300]) {
      assert.equal((await run(`health 0 ${pct}`)).ok, true, `health ${pct}`);
      await wait(800);
      const now = await health();
      log(`health ${pct}%:`, now);
      assert.equal(now, Math.round((start * pct) / 100), `health at ${pct}%`);
      await regenerates(now, `${pct}%`);
    }
    assert.equal((await run("health 0 50")).code, "bad_health", "50% is refused");
    // Juggernog bought at 300%: the level goes on top of Juggernog's maximum, and the player stays at full health
    assert.equal((await run("perk 0 specialty_armorvest", 60000)).ok, true, "Juggernog");
    await wait(2000);
    const jug300 = await maxHealth();
    log("health / maximum with Juggernog at 300%:", await health(), jug300);
    assert.equal(await health(), jug300, "full health after Juggernog at 300%");
    await regenerates(jug300, "Juggernog at 300%");
    // back to 100%: Juggernog's own maximum, a third of the above
    assert.equal((await run("health 0 100")).ok, true, "health 100 with Juggernog");
    await wait(1500);
    const jug = await maxHealth();
    log("maximum health with Juggernog:", jug);
    assert.ok(jug > start, "Juggernog raised the maximum");
    assert.equal(jug300, jug * 3, "300% of Juggernog's maximum");
    await regenerates(jug, "Juggernog at 100%");
    assert.equal((await run("health 0 200")).ok, true, "health 200 with Juggernog");
    await wait(1500);
    log("maximum health with Juggernog at 200%:", await maxHealth());
    assert.equal(await maxHealth(), jug * 2, "200% of Juggernog's maximum");
    await regenerates(jug * 2, "Juggernog at 200%");
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
