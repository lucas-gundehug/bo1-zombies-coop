// Unit tests for the cheat menu's pure parts (no browser, no game).
//   node test/cheats.test.mjs
import assert from "node:assert/strict";
import { addCheatsMod, modBase } from "../src/cheats/mod.js";
import { gameSettings } from "../src/game/page.js";

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
