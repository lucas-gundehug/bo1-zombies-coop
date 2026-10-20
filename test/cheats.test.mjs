// Unit tests for the cheat menu's pure parts (no browser, no game).
//   node test/cheats.test.mjs
import assert from "node:assert/strict";
import { addCheatsMod, modBase } from "../src/cheats/mod.js";
import { gameSettings } from "../src/game/page.js";
import { perkName, powerupName, weaponName } from "../src/cheats/names.js";
import { onCheatsKey, onPointerLock } from "../src/cheats/hotkey.js";
import { FORK_VERSION } from "../src/cheats/version.js";
import { isNewer } from "../src/util/updates.js";
import { readFileSync } from "node:fs";
import { cheatCommand, cheatsTick, createBridge, onCheatsLine, parseDvarPrint, parseState, sendCheat } from "../src/cheats/bridge.js";
import { cheatActions, cheatBlocks } from "../src/cheats/section.js";

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("addCheatsMod inserts fs_mods cheats before +devmap", () => {
  const args = ["+set", "name", "x", "+devmap", "zombie_theater"];
  addCheatsMod(args, { horde: false });
  assert.deepEqual(args, ["+set", "name", "x", "+set", "fs_mods", "cheats", "+devmap", "zombie_theater"]);
});

test("addCheatsMod appends to vel.gg's own fs_mods and flags Hell mode", () => {
  const args = ["+set", "fs_mods", "horde zinfo", "+devmap", "zombie_moon"];
  addCheatsMod(args, { horde: true });
  assert.deepEqual(args, ["+set", "fs_mods", "horde zinfo cheats", "+set", "cheats_horde", "1", "+devmap", "zombie_moon"]);
});

test("addCheatsMod twice leaves one cheats", () => {
  const args = ["+set", "fs_mods", "zinfo", "+devmap", "zombie_moon"];
  addCheatsMod(args, { horde: false });
  addCheatsMod(args, { horde: false });
  assert.equal(args[2], "zinfo cheats");
  assert.equal(args.filter((a) => a === "fs_mods").length, 1);
});

test("what the host captured for guests is not changed by addCheatsMod", () => {
  const args = ["+set", "fs_mods", "horde zinfo", "+devmap", "zombie_theater"];
  const settings = gameSettings(args);
  addCheatsMod(args, { horde: true });
  assert.deepEqual(settings, [["fs_mods", "horde zinfo"]]);
});

test("modBase reads the pack folder from the engine's fs_b", () => {
  assert.equal(modBase(["+set", "fs_b", "/opfs/pack-kino/files", "+set", "fs_h", "/opfs/user"]), "pack-kino/files");
  assert.equal(modBase(["+set", "fs_h", "/opfs/user"]), null);
  assert.equal(modBase(["+set", "fs_b", "C:/game"]), null);
});

test("parseDvarPrint reads the engine's answer for a cheats dvar", () => {
  assert.deepEqual(parseDvarPrint('"cheats_perks" is: "specialty_rof,specialty_armorvest^7" default: "^7"'), { name: "cheats_perks", value: "specialty_rof,specialty_armorvest" });
  assert.equal(parseDvarPrint('"sv_cheats" is: "1^7" default: "0^7"'), null);
  assert.equal(parseDvarPrint("WEB_GL_COPIES frames=60"), null);
});

test("parseState turns the published state into numbers and booleans", () => {
  assert.deepEqual(parseState("ready=1 seq=4 round=12 frozen=1 power=0 horde=0 lists=2"), { ready: true, seq: 4, round: 12, frozen: true, power: false, horde: false, lists: 2 });
});

test("cheatCommand builds the console command and refuses unsafe text", () => {
  assert.equal(cheatCommand(5, "give", "all", "ray_gun_zm"), 'set cheats_cmd "5 give all ray_gun_zm"');
  assert.equal(cheatCommand(6, "next"), 'set cheats_cmd "6 next"');
  assert.throws(() => cheatCommand(1, "give", 0, 'x"; quit'));
  assert.throws(() => cheatCommand(1, "give", 0, "two words"));
});

const fakeSession = () => ({ cheats: { ok: true, ...createBridge() }, fun: { queue: [] } });

test("commands go out in order, at most one per 250 ms", () => {
  const session = fakeSession();
  sendCheat(session, "give", 0, "ray_gun_zm");
  sendCheat(session, "pap", 0);
  cheatsTick(session, 1000, true);
  onCheatsLine(session, '"cheats_state" is: "ready=1 seq=1 round=1 frozen=0 power=0 horde=0 lists=0^7" default: "^7"');
  cheatsTick(session, 1100, true);
  cheatsTick(session, 1300, true);
  const sent = session.fun.queue.filter((c) => c.startsWith("set cheats_cmd"));
  assert.deepEqual(sent, ['set cheats_cmd "1 give 0 ray_gun_zm"', 'set cheats_cmd "2 pap 0"']);
});

test("nothing is sent or asked while the map is not playing, or when the mod did not load", () => {
  const session = fakeSession();
  sendCheat(session, "next");
  cheatsTick(session, 1000, false);
  assert.deepEqual(session.fun.queue, []);
  session.cheats.ok = false;
  cheatsTick(session, 2000, true);
  assert.deepEqual(session.fun.queue, []);
});

test("the lists are asked for once the state says they are published, and assembled", () => {
  const session = fakeSession();
  cheatsTick(session, 1000, true);
  assert.ok(session.fun.queue.includes("cheats_state"));
  onCheatsLine(session, '"cheats_state" is: "ready=1 seq=0 round=1 frozen=0 power=0 horde=0 lists=1^7" default: "^7"');
  assert.equal(session.cheats.round, 1);
  cheatsTick(session, 2000, true);
  assert.ok(session.fun.queue.includes("cheats_weapons_count") && session.fun.queue.includes("cheats_perks") && session.fun.queue.includes("cheats_powerups"));
  onCheatsLine(session, '"cheats_weapons_count" is: "2^7" default: "^7"');
  assert.ok(session.fun.queue.includes("cheats_weapons_0") && session.fun.queue.includes("cheats_weapons_1"));
  onCheatsLine(session, '"cheats_weapons_1" is: "m1911_zm^7" default: "^7"');
  onCheatsLine(session, '"cheats_weapons_0" is: "ray_gun_zm,thundergun_zm^7" default: "^7"');
  onCheatsLine(session, '"cheats_perks" is: "specialty_armorvest^7" default: "^7"');
  assert.deepEqual(session.cheats.weapons, ["ray_gun_zm", "thundergun_zm", "m1911_zm"]);
  assert.deepEqual(session.cheats.perks, ["specialty_armorvest"]);
});

test("a result is matched to the command it answers", () => {
  const session = fakeSession();
  const results = [];
  session.cheats.onResult = (result, sent) => results.push([result, sent]);
  sendCheat(session, "perk", 1, "specialty_rof");
  cheatsTick(session, 1000, true);
  cheatsTick(session, 1600, true);
  assert.ok(session.fun.queue.includes("cheats_results"));
  onCheatsLine(session, '"cheats_results" is: "1 err perk_failed specialty_rof^7" default: "^7"');
  assert.deepEqual(results, [[{ seq: 1, ok: false, code: "perk_failed", detail: "specialty_rof" }, { action: "perk", target: 1, arg: "specialty_rof" }]]);
  onCheatsLine(session, '"cheats_results" is: "1 err perk_failed specialty_rof^7" default: "^7"');
  assert.equal(results.length, 1, "a result is reported once");
});

test("known ids get their in-game names", () => {
  assert.equal(weaponName("microwavegundw_zm"), "Zap Guns");
  assert.equal(weaponName("m1911_zm"), "M1911");
  assert.equal(weaponName("thundergun_zm"), "Thundergun");
  assert.equal(weaponName("kar98k_scoped_zombie"), "Scoped Kar98k");
  assert.equal(weaponName("mine_bouncing_betty"), "Bouncing Betties");
  assert.equal(perkName("specialty_armorvest"), "Juggernog");
  assert.equal(perkName("specialty_additionalprimaryweapon"), "Mule Kick");
  assert.equal(powerupName("full_ammo"), "Max Ammo");
  assert.equal(powerupName("minigun"), "Death Machine");
});

test("unknown ids get a readable fallback", () => {
  assert.equal(weaponName("foo_bar_zm"), "Foo Bar");
  assert.equal(weaponName("zombie_new_thing"), "New Thing");
  assert.equal(perkName("specialty_newperk"), "Newperk");
  assert.equal(powerupName("free_stuff"), "Free Stuff");
});

test("M opens the cheat panel in game without pausing, and frees the mouse", () => {
  const session = { cheats: { panel: false }, fun: { open: false } };
  let freed = 0;
  let locked = 0;
  const ctx = { playing: true, available: true, freeMouse: () => (freed += 1), lockMouse: () => (locked += 1) };
  const event = { code: "KeyM", repeat: false, ctrlKey: false, altKey: false, metaKey: false };
  assert.equal(onCheatsKey(session, event, ctx), true, "handled (the game must not see it)");
  assert.equal(session.cheats.panel, true);
  assert.equal(session.fun.open, true, "Fun mode section opens with it");
  assert.equal(freed, 1);
  assert.equal(onCheatsKey(session, event, ctx), true);
  assert.equal(session.cheats.panel, false, "M again closes it");
  assert.equal(locked, 1, "and gives the mouse back to the game");
});

test("M does nothing for a guest, outside a game, on key repeat or with a modifier", () => {
  const event = { code: "KeyM", repeat: false, ctrlKey: false, altKey: false, metaKey: false };
  const fresh = () => ({ cheats: { panel: false }, fun: { open: false } });
  const ctx = { playing: true, available: true, freeMouse: () => {}, lockMouse: () => {} };
  for (const [what, e, c] of [
    ["guest", event, { ...ctx, available: false }],
    ["menu", event, { ...ctx, playing: false }],
    ["repeat", { ...event, repeat: true }, ctx],
    ["ctrl", { ...event, ctrlKey: true }, ctx],
    ["other key", { ...event, code: "KeyN" }, ctx],
  ]) {
    const session = fresh();
    assert.equal(onCheatsKey(session, e, c), false, what);
    assert.equal(session.cheats.panel, false, what);
  }
});

test("taking the mouse back into the game closes the panel", () => {
  const session = { cheats: { panel: true }, fun: { open: true } };
  onPointerLock(session, true);
  assert.equal(session.cheats.panel, false);
});

test("the fork's version matches the manifest, and a fork release is not newer than itself", () => {
  const manifest = JSON.parse(readFileSync(new URL("../extension/manifest.json", import.meta.url)));
  assert.equal(FORK_VERSION, manifest.version);
  assert.equal(isNewer(`v${FORK_VERSION}`, FORK_VERSION), false);
  assert.equal(isNewer("v2.2.3.1", FORK_VERSION), true);
});

test("review I1: the next command waits until the script has taken the previous one", () => {
  const session = fakeSession();
  sendCheat(session, "give", 0, "ray_gun_zm");
  sendCheat(session, "perk", 0, "specialty_armorvest");
  cheatsTick(session, 1000, true);
  cheatsTick(session, 1300, true);
  cheatsTick(session, 1600, true);
  const sent = () => session.fun.queue.filter((c) => c.startsWith("set cheats_cmd"));
  assert.equal(sent().length, 1, "not before the script took seq 1 (a paused server would lose it)");
  onCheatsLine(session, '"cheats_state" is: "ready=1 seq=1 round=1 frozen=0 power=0 horde=0 lists=0^7" default: "^7"');
  cheatsTick(session, 1900, true);
  assert.equal(sent().length, 2);
});

test("review I2: every result in the script's recent list is reported once, even an older seq after a newer one", () => {
  const session = fakeSession();
  const results = [];
  session.cheats.onResult = (result, sent) => results.push([result.seq, result.ok, result.code, sent.action]);
  sendCheat(session, "perk", 0, "specialty_armorvest");
  sendCheat(session, "give", 0, "ray_gun_zm");
  onCheatsLine(session, '"cheats_results" is: "2 ok;1 err perk_failed specialty_armorvest^7" default: "^7"');
  assert.deepEqual(results, [[2, true, "", "give"], [1, false, "perk_failed", "perk"]]);
  onCheatsLine(session, '"cheats_results" is: "2 ok;1 err perk_failed specialty_armorvest^7" default: "^7"');
  assert.equal(results.length, 2, "reported once");
});

test("review I2: results are asked for as long as a command is unanswered", () => {
  const session = fakeSession();
  sendCheat(session, "perk", "all", "specialty_armorvest");
  onCheatsLine(session, '"cheats_state" is: "ready=1 seq=0 round=1 frozen=0 power=0 horde=0 lists=0^7" default: "^7"');
  cheatsTick(session, 1000, true);
  session.fun.queue.length = 0;
  cheatsTick(session, 70000, true);
  assert.ok(session.fun.queue.includes("cheats_results"), "still asking 69 s later");
});

test("review I4: M typed into a text field is text, not the hotkey", () => {
  const session = { cheats: { panel: true }, fun: { open: true } };
  const ctx = { playing: true, available: true, freeMouse: () => {}, lockMouse: () => {} };
  const input = { tagName: "INPUT", isContentEditable: false };
  const event = { code: "KeyM", repeat: false, ctrlKey: false, altKey: false, metaKey: false, composedPath: () => [input] };
  assert.equal(onCheatsKey(session, event, ctx), false);
  assert.equal(session.cheats.panel, true);
});

test("review M1: modBase with fs_b as the last argument does not throw", () => {
  assert.equal(modBase(["+set", "fs_b"]), null);
});

test("after a game restart in the same page (the script counts from 0 again) commands still go out", () => {
  const session = fakeSession();
  sendCheat(session, "next");
  cheatsTick(session, 1000, true);
  onCheatsLine(session, '"cheats_state" is: "ready=1 seq=1 round=3 frozen=0 power=0 horde=0 lists=1^7" default: "^7"');
  onCheatsLine(session, '"cheats_state" is: "ready=1 seq=0 round=1 frozen=0 power=0 horde=0 lists=1^7" default: "^7"');
  sendCheat(session, "next");
  cheatsTick(session, 2000, true);
  assert.ok(session.fun.queue.includes('set cheats_cmd "2 next"'));
});

// ---- health levels ----

const PLAYERS = [
  { slot: 0, n: 1, name: "Lucas" },
  { slot: 1, n: 2, name: "Jonas" },
];
const healthSession = () => {
  const session = fakeSession();
  session.fun.notice = null;
  session.cheats.target = 1;
  return { session, actions: cheatActions(session, () => PLAYERS) };
};
const healthChips = (session) => cheatBlocks(session, PLAYERS).find((b) => b.kind === "chips" && b.chips.some((c) => c.act === "cheatHealth")).chips;

test("a health level goes to the chosen player", () => {
  const { session, actions } = healthSession();
  actions.cheatHealth("200");
  assert.match(session.cheats.outbox.at(-1)[1], /^set cheats_cmd "\d+ health 1 200"$/);
  assert.match(session.fun.notice, /200%.*Jonas/);
});

test("the card shows each player's health level once the game confirms it", () => {
  const { session, actions } = healthSession();
  assert.deepEqual(
    healthChips(session).map((c) => [c.label, c.on]),
    [
      ["100%", true],
      ["150%", false],
      ["200%", false],
      ["300%", false],
      ["500%", false],
    ],
  );
  actions.cheatHealth("300");
  const [seq] = session.cheats.outbox.at(-1);
  session.cheats.sent.get(seq).until = Date.now() + 10000;
  session.cheats.lastSeq = seq;
  onCheatsLine(session, `"cheats_results" is: "${seq} ok^7" default: "^7"`);
  assert.equal(session.cheats.health[1], 300);
  assert.equal(healthChips(session).find((c) => c.on).label, "300%");
  assert.match(session.fun.notice, /300%.*Jonas/);
  session.cheats.target = 0;
  assert.equal(healthChips(session).find((c) => c.on).label, "100%", "Lucas is still normal");
});

test("health for everyone sets every player's level", () => {
  const { session, actions } = healthSession();
  session.cheats.target = "all";
  actions.cheatHealth("150");
  const [seq] = session.cheats.outbox.at(-1);
  session.cheats.sent.get(seq).until = Date.now() + 10000;
  session.cheats.lastSeq = seq;
  onCheatsLine(session, `"cheats_results" is: "${seq} ok^7" default: "^7"`);
  assert.deepEqual(session.cheats.health, { 0: 150, 1: 150 });
  assert.equal(healthChips(session).find((c) => c.on).label, "150%");
});

test("a restarted game (the script counts from 0) forgets the health levels", () => {
  const session = fakeSession();
  session.cheats.health = { 0: 200 };
  onCheatsLine(session, '"cheats_state" is: "ready=1 seq=5 round=3 frozen=0 power=0 horde=0 lists=1^7" default: "^7"');
  onCheatsLine(session, '"cheats_state" is: "ready=1 seq=0 round=1 frozen=0 power=0 horde=0 lists=1^7" default: "^7"');
  assert.deepEqual(session.cheats.health, {});
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
