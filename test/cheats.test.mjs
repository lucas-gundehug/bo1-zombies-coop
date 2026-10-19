// Unit tests for the cheat menu's pure parts (no browser, no game).
//   node test/cheats.test.mjs
import assert from "node:assert/strict";
import { addCheatsMod, modBase } from "../src/cheats/mod.js";
import { gameSettings } from "../src/game/page.js";
import { perkName, powerupName, weaponName } from "../src/cheats/names.js";
import { cheatCommand, cheatsTick, createBridge, onCheatsLine, parseDvarPrint, parseState, sendCheat } from "../src/cheats/bridge.js";

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

test("commands go out in order, one per 250 ms", () => {
  const session = fakeSession();
  sendCheat(session, "give", 0, "ray_gun_zm");
  sendCheat(session, "pap", 0);
  cheatsTick(session, 1000, true);
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
  assert.ok(session.fun.queue.includes("cheats_result"));
  onCheatsLine(session, '"cheats_result" is: "1 err perk_failed specialty_rof^7" default: "^7"');
  assert.deepEqual(results, [[{ seq: 1, ok: false, code: "perk_failed", detail: "specialty_rof" }, { action: "perk", target: 1, arg: "specialty_rof" }]]);
  onCheatsLine(session, '"cheats_result" is: "1 err perk_failed specialty_rof^7" default: "^7"');
  assert.equal(results.length, 1, "a result is reported once");
});

test("known ids get their in-game names", () => {
  assert.equal(weaponName("microwavegundw_zm"), "Zap Guns");
  assert.equal(weaponName("m1911_zm"), "M1911");
  assert.equal(weaponName("thundergun_zm"), "Thundergun");
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
