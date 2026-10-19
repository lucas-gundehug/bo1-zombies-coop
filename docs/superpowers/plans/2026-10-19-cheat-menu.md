# Cheat Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fun mode gets per-map weapons, perks, power-ups and Pack-a-Punch for any player, plus a round editor and freeze round, driven by a game script the extension loads through vel.gg's mod stack.

**Architecture:** The extension writes a GSC mod (`mods/cheats`, plus `mods/_stack` when vel.gg has none) into the map pack's OPFS folder and adds `cheats` to `fs_mods` before the engine starts (solo and host only). The script polls a `cheats_cmd` dvar for commands and publishes the map's lists and its state in `cheats_*` dvars; the extension reads those by sending the dvar's name as a console command and catching the engine's `"name" is: "value^7"` print in `console.log` (the hook `watchConsole` already uses). Fun mode renders the new sections from that state.

**Tech Stack:** Plain JS (ES modules) bundled with esbuild, Chrome MV3 content script in the MAIN world, GSC (BO1 game script), Playwright for in-game checks, `node:assert` scripts for unit tests.

**Spec:** `docs/superpowers/specs/2026-10-19-cheat-menu-design.md`

## Global Constraints

- Friends keep the public extension and must still join: the guest path is untouched, the session protocol and engine patches are unchanged, and `cheats` is never forwarded to guests.
- With the cheat menu unused, a game plays like the original; a settings switch "Cheat menu" (default on) turns the whole mod off, and then Fun mode is exactly upstream's.
- vel.gg's own `fs_mods` (Hell mode `horde zinfo`, `noperks`, `zinfo`) keep working: append `cheats`, never overwrite files vel.gg ships.
- Every action either works or the card says why; no silent buttons.
- New code lives in `src/cheats/`; edits to upstream files stay small (merges from `upstream/main` must stay easy).
- Card text in English and Portuguese, like `src/fun/fun.js`.
- Commits use `lucas.g@live.dk`; `npm run check` passes before every commit.

## Review Focus

1. Hell mode (`fs_mods "horde zinfo"`): the game still starts, and the round section is hidden with a reason — `test/cheats.test.mjs` pins the arg merge; Task 6 checks it in game.
2. A map without a power switch or perk machines (Nacht, Shi No Numa, Shangri-La, Moon): a perk request answers "can't give this perk here" instead of hanging — Task 2's `perk` handler must time out and report; Task 6 checks these maps.
3. A player who joins mid-game, or a slot that is no longer there: commands for a missing player report "player not in game" — Task 2.
4. Commands sent faster than the script polls (double clicks): none lost or run twice — sequence numbers, Task 3 test.
5. The OPFS write fails or is slow (storage blocked): the game still starts without the mod and the card shows "Cheat menu could not load" — Task 1.

---

### Task 1: Ship the mod into the game

**Files:**
- Create: `src/cheats/gsc/_hooks.gsc`, `src/cheats/gsc/_cheats.gsc` (stub that only publishes `cheats_state "ready=1"`), `src/cheats/gsc/_stack/_modstack.gsc`, `src/cheats/gsc/_stack/_zombiemode_ffotd.gsc` (copied verbatim from `MisaDev4/bo1-zombies-decompiled` `mods/_stack/maps/`, first line a marker comment `// bo1-coop-cheats` added)
- Create: `src/cheats/mod.js`, `src/cheats/files.js`, `src/cheats/opfs.js`
- Modify: `scripts/build.mjs` (esbuild `loader: { ".gsc": "text" }`), `src/session/hooks.js` (callMain), `src/main.js` (start the write early), `src/ui/view.js` (settings switch), `src/util/settings.js` users only through `readSetting/saveSetting`
- Test: `test/cheats.test.mjs`; add `node test/cheats.test.mjs` to `package.json` `check`

**Interfaces:**
- Produces: `addCheatsMod(args: string[], { horde: boolean }): void` (mod.js) — puts `cheats` into the `+set fs_mods <value>` pair (appending to an existing value, space separated, no duplicate) or inserts `+set fs_mods cheats` before `+devmap`; with `horde` also inserts `+set cheats_horde 1` (the caller passes `currentHorde()` from src/game/page.js).
- Produces: `MOD_FILES: Array<{ path: string, text: string }>` (files.js) — paths relative to `pack-<slug>/files/`: `mods/cheats/maps/cheats/_hooks.gsc`, `mods/cheats/maps/cheats/_cheats.gsc`, `mods/_stack/maps/_modstack.gsc`, `mods/_stack/maps/_zombiemode_ffotd.gsc`.
- Produces: `writeModFiles(slug: string): Promise<boolean>` (opfs.js) — writes every file; a `_stack` file is skipped when it exists and does not start with the marker; resolves false on any error.
- Produces: `session.cheats = { enabled: boolean, loading: Promise<boolean>|null, ok: boolean|null, ... }` created in `main.js`; `enabled` from setting `cheats` (default `"1"`).

- [ ] **Step 1: Write the failing tests** in `test/cheats.test.mjs`:
  - `addCheatsMod(["+set","name","x","+devmap","zombie_theater"], { horde: false })` → `["+set","name","x","+set","fs_mods","cheats","+devmap","zombie_theater"]`
  - `addCheatsMod(["+set","fs_mods","horde zinfo","+devmap","zombie_moon"], { horde: true })` → fs_mods value `"horde zinfo cheats"` and `+set cheats_horde 1` before `+devmap`
  - calling it twice leaves one `cheats`
  - `const s = gameSettings(args); addCheatsMod(args, { horde: true });` → `s` still deep-equals `[["fs_mods","horde zinfo"]]` (what the host captured for guests is not changed afterwards)
- [ ] **Step 2:** `node test/cheats.test.mjs` → FAIL (module not found).
- [ ] **Step 3: Implement** `mod.js`, `files.js`, `opfs.js` and the build loader. In `hooks.js` `callMain`: when `session.cheats.enabled` and `session.mode !== "guest"`, `await session.cheats.loading`; if true call `addCheatsMod(args)` **after** `prepareHost` (so `session.gameSettings` never contains `cheats`), else set `session.cheats.ok = false`. The solo branch becomes async the same way the host branch already is. In `main.js` start `session.cheats.loading = writeModFiles(currentSlug())` at startup when a map slug is known and the mode is not guest. Settings section: a `kv` + toggle button "Cheat menu: On/Off" (`act: "cheatsToggle"`, saves setting, notice "Reload the page to apply").
- [ ] **Step 4:** `node test/cheats.test.mjs` → PASS; `npm run check` → lint, build and patch test pass.
- [ ] **Step 5: In-game check:** `node test/cheats-e2e.mjs kino` (create it now: Playwright persistent profile with `extension/` loaded, the pointer-lock stub from `test/e2e.mjs`, opens `https://vel.gg/bsz/kino/`, clicks the setup `PLAY` button, clicks the canvas until the game runs, then sends `cheats_state` via `window.__bo1Coop.engine.command` and waits up to 60 s for a console line matching `"cheats_state" is: "ready=1`). Expected: found. Also run with the setting off: no `fs_mods` in the args (log `window.__args` captured by an init script) and no line.
- [ ] **Step 6: Commit** `feat(cheats): load a game-script mod through vel.gg's mod stack`.

### Task 2: The game script

**Files:**
- Modify: `src/cheats/gsc/_cheats.gsc` (full version)
- Test: `test/cheats-e2e.mjs` (extend)

**Interfaces:**
- Consumes: dvar `cheats_cmd` = `"<seq> <action> <target> [arg]"`; `target` is a client number (`GetEntityNumber()`) or `all`.
- Actions: `give <t> <weaponId>`, `pap <t>`, `perk <t> <perkId>`, `powerup <t> <powerupId>`, `round <n>`, `next`, `freeze 1|0`.
- Produces dvars (values ≤ 400 chars each):
  - `cheats_state` = `ready=1 seq=<last seq> round=<n> frozen=0|1 power=0|1 horde=0|1 lists=<k>` (`lists` increments when lists change)
  - `cheats_weapons_count` = chunk count; `cheats_weapons_<i>` = comma-separated ids from `level.zombie_weapons` (base weapons only)
  - `cheats_perks` = comma-separated `script_noteworthy` of `zombie_vending` triggers
  - `cheats_powerups` = comma-separated keys of `level.zombie_include_powerups`
  - `cheats_result` = `<seq> ok|err <code> [detail]`; codes: `no_player`, `no_weapon`, `no_upgrade`, `has_upgrade`, `no_perk`, `perk_failed`, `no_powerup`, `bad_round`, `horde`

- [ ] **Step 1: Extend `test/cheats-e2e.mjs`** with a scenario helper `run(cmd)` (sends `set cheats_cmd "<seq> ..."`, then polls `cheats_result` until its seq matches, 20 s timeout) and assertions on Kino:
  - `give 0 ray_gun_zm` → `ok`; `pap 0` → `ok`; `pap 0` again → `err has_upgrade`
  - `perk 0 specialty_armorvest` → `ok` within 15 s (power turned on), score unchanged afterwards (read `fun` score address as Fun mode does)
  - `powerup 0 full_ammo` → `ok`
  - `round 10` → `cheats_state` shows `round=10`; `round 3` → `round=3` (backwards)
  - `freeze 1`, `ai axis delete` (console), wait 15 s → round unchanged; `freeze 0` → round advances within 30 s
  - `give 3 ray_gun_zm` → `err no_player`
- [ ] **Step 2:** Run it → FAIL (stub script).
- [ ] **Step 3: Implement the script.** Follow `mods/sandbox/maps/sandbox/_sandbox.gsc` (decompiled repo) for give (`weapon_give`), pack (`pad_pack_current_weapon`), power (`use_elec_switch` trigger), perk (notify the vending trigger), power-up drop (`specific_powerup_drop` 80 units in front of the player, floor traced), round jump (`sandbox_goto_round`, including its wait for `start_of_round`). Decisions the sandbox does not make:
  - Perk is free: remember `score`, add 20000, notify the machine, wait until `HasPerk` (15 s max), then set the score back. Already owned → `ok`.
  - Perk with no power switch, or power still off after 10 s: `level notify` the machine's own power event and retry; if `HasPerk` is still false → `err perk_failed <perk>`.
  - Freeze: a level thread; while frozen, when `get_enemy_count() == 0 && level.zombie_total == 0`, set `level.zombie_total = 1` and `flag_clear("spawn_zombies")`; on unfreeze set `level.zombie_total = 0` and `flag_set("spawn_zombies")`. A round jump keeps the freeze.
  - Hell mode (`GetDvarInt("cheats_horde") == 1`, set by Task 1): `round`, `next`, `freeze` → `err horde`.
  - Poll `cheats_cmd` every 0.05 s; ignore a seq ≤ the last handled one; republish `cheats_state` every 0.5 s.
- [ ] **Step 4:** Run `node test/cheats-e2e.mjs kino` → all assertions pass.
- [ ] **Step 5: Commit** `feat(cheats): game script for weapons, perks, power-ups and rounds`.

### Task 3: Bridge between card and script

**Files:**
- Create: `src/cheats/bridge.js`
- Modify: `src/fun/fun.js` (`watchConsole` passes each line to the bridge; `funTick` calls `cheatsTick`)
- Test: `test/cheats.test.mjs`

**Interfaces:**
- Produces: `parseDvarPrint(line: string): { name: string, value: string } | null` — matches `"cheats_x" is: "value^7" default: ...`.
- Produces: `parseState(value: string): { ready, seq, round, frozen, power, horde, lists }` (numbers/booleans).
- Produces: `cheatCommand(seq: number, action: string, target: number|"all", arg?: string): string` → `set cheats_cmd "<seq> <action> <target> <arg>"`; rejects args containing `"`, `;` or spaces.
- Produces: `cheatsTick(session)` — while the map plays: query `cheats_state` every 1 s; when `lists` changes, query `cheats_weapons_count`, each chunk, `cheats_perks`, `cheats_powerups`; send at most one queued command per 250 ms through `session.fun.queue`; after a command, query `cheats_result` until its seq matches.
- Produces: `sendCheat(session, action, target, arg)`; state in `session.cheats`: `{ ready, round, frozen, power, horde, weapons: string[], perks: string[], powerups: string[], pending: number|null, lastResult: {seq, ok, code, detail}|null }`.

- [ ] **Step 1: Failing tests**: `parseDvarPrint('"cheats_perks" is: "specialty_rof,specialty_armorvest^7" default: ""')` → `{ name: "cheats_perks", value: "specialty_rof,specialty_armorvest" }`; a line for another dvar or noise → null; `parseState("ready=1 seq=4 round=12 frozen=1 power=0 horde=0 lists=2")` → `{ ready: true, seq: 4, round: 12, frozen: true, power: false, horde: false, lists: 2 }`; `cheatCommand(5, "give", "all", "ray_gun_zm")` → `set cheats_cmd "5 give all ray_gun_zm"`; `cheatCommand(1, "give", 0, 'x"; quit')` throws; two `sendCheat` calls in one tick produce seq 1 and 2 in order (fake session with a queue array).
- [ ] **Step 2:** `node test/cheats.test.mjs` → FAIL.
- [ ] **Step 3: Implement** `bridge.js` and the two hooks in `fun.js`.
- [ ] **Step 4:** Tests pass; `npm run check` passes.
- [ ] **Step 5: Commit** `feat(cheats): bridge between the card and the game script`.

### Task 4: Friendly names

**Files:**
- Create: `src/cheats/names.js`
- Test: `test/cheats.test.mjs`

**Interfaces:**
- Produces: `weaponName(id)`, `perkName(id)`, `powerupName(id)` → display string. Tables for the known ids (all of `WEAPONS` in `src/fun/fun.js`, plus Moon/Shangri-La/CotD/Ascension wonder weapons and equipment: `microwavegundw_zm` "Zap Guns", `microwavegun_zm` "Wave Gun", `zombie_quantum_bomb` "QED", `shrink_ray_zm` "31-79 JGb215", `humangun_zm` "V-R11", `zombie_nesting_dolls` "Matryoshka Dolls", `sniper_explosive_zm` "Scavenger", `freezegun_zm` "Winter's Howl", `tesla_gun_zm` "Wunderwaffe DG-2", `zombie_black_hole_bomb` "Gersh Device"; perks: Juggernog, Quick Revive, Speed Cola, Double Tap, Stamin-Up (`specialty_longersprint`), PhD Flopper (`specialty_flakjacket`), Deadshot (`specialty_deadshot`), Mule Kick (`specialty_additionalprimaryweapon`); power-ups: Max Ammo (`full_ammo`), Insta-Kill (`insta_kill`), Double Points (`double_points`), Nuke (`nuke`), Carpenter (`carpenter`), Fire Sale (`fire_sale`), Death Machine (`minigun`), Bonfire Sale (`bonfire_sale`), and any others seen in Task 6). Fallback: strip `_zm`/`zombie_`/`specialty_`, underscores to spaces, title case.

- [ ] **Step 1: Failing tests**: `weaponName("microwavegundw_zm") === "Zap Guns"`, `perkName("specialty_armorvest") === "Juggernog"`, `powerupName("full_ammo") === "Max Ammo"`, `weaponName("m1911_zm") === "M1911"`, fallback `weaponName("foo_bar_zm") === "Foo Bar"`.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS, `npm run check`.
- [ ] **Step 5: Commit** `feat(cheats): readable names for weapons, perks and power-ups`.

### Task 5: The Fun mode sections

**Files:**
- Create: `src/cheats/section.js`
- Modify: `src/fun/fun.js` (`funSection` uses the cheat blocks instead of the fixed weapon grid when `session.cheats.ready`; `funActions` spreads `cheatActions`), `src/ui/card.js` only if a needed block kind is missing
- Test: `test/ui-preview.mjs` (add a "cheats" state)

**Interfaces:**
- Consumes: `session.cheats` (Task 3), `sendCheat` (Task 3), names (Task 4), `funPlayers` (fun.js).
- Produces: `cheatBlocks(session): Block[]` and `cheatActions(session): Record<string, (arg) => void>` with acts `cheatTarget` (arg slot or `all`), `cheatGive` (arg weapon id), `cheatPap`, `cheatPerk`, `cheatPowerup`, `cheatRound` (field `round`), `cheatNext`, `cheatFreeze`.

Layout, in this order, using the existing block kinds (`label`, `chips`, `grid`, `buttons`, `input`, `callout`):
1. "Give to" chips: each player from `funPlayers` plus "Everyone"; default the host (slot 0). Only shown with more than one player.
2. "Weapons" grid from `cheats.weapons`, plus a "Pack-a-Punch (weapon in hand)" button above it.
3. "Perks" grid from `cheats.perks`; first-use note "Turns the power on".
4. "Power-ups" grid from `cheats.powerups`.
5. "Rounds": text "Round N", input `round` with button "Go", button "Next round", chip "Freeze round" (on/off from `cheats.frozen`); hidden in Hell mode with the text "Round controls are not available in Hell mode."
6. Result notices through Fun mode's `say()`: ok → "<name> given to <player>" etc.; each `err` code → its own sentence (`no_player` "That player is no longer in the game.", `perk_failed` "Could not give <perk> on this map.", `has_upgrade` "That weapon is already Pack-a-Punched.", `no_upgrade` "That weapon can't be Pack-a-Punched.", `horde` "Not available in Hell mode.", `bad_round` "Pick a round from 1 to 255.").
7. While `session.cheats.ok === false`: callout "Cheat menu could not load; Fun mode works as before." and the old fixed weapon grid.

- [ ] **Step 1:** Add a `cheats` state to `test/ui-preview.mjs` (fake `session.cheats` with Kino's lists, two players) and render it → card lacks the sections (FAIL by inspection of the screenshot).
- [ ] **Step 2: Implement** `section.js` and the `fun.js` wiring; strings in en and pt.
- [ ] **Step 3:** `node test/ui-preview.mjs en-US <scratch dir>` → screenshot shows the sections, nothing overflows the 312 px card. `npm run check` passes.
- [ ] **Step 4: Commit** `feat(cheats): weapons, perks, power-ups and rounds in Fun mode`.

### Task 6: Every map, Hell mode and co-op

**Files:**
- Modify: `test/cheats-e2e.mjs` (map list argument, Hell mode flag, UI-driven checks through the card's open shadow root in test builds via an `attachShadow` init-script override), and fixes in `_cheats.gsc` / `names.js` that the runs show.

- [ ] **Step 1:** For each map slug (`nacht verruckt shinonuma riese kino five ascension cotd shangrila moon`): load, record `cheats_weapons_*`, `cheats_perks`, `cheats_powerups`, give the first wonder weapon of the list, `pap`, every listed perk, one power-up, `round 5`. Expected: all `ok`, or a clear `err` on maps without that thing (Nacht: no perks list). Moon must list `microwavegundw_zm`.
- [ ] **Step 2:** Hell mode on Kino (vel.gg's own Hell toggle; confirm args contain `fs_mods horde zinfo cheats`): the game starts, give/perk work, round actions answer `err horde`.
- [ ] **Step 3:** Co-op: `npm run relay:dev`, host with this build, guest with the upstream release (`EXT=<unzipped upstream 2.2.2>`), via `test/e2e.mjs 2 kino`; the guest joins and plays; then from the host card give the guest a weapon and a perk → both `ok`, visible on the guest.
- [ ] **Step 4:** Fix what failed, rerun the failing map, add new ids to `names.js` tests.
- [ ] **Step 5: Commit** `test(cheats): verified on all ten maps, Hell mode and co-op`.

### Task 7: Release for Lucas

**Files:**
- Modify: `extension/manifest.json` (`name` "BO1 Zombies Co-op + Cheats", `version` "2.2.2.1"), `src/util/updates.js` (`LATEST` → `lucas-gundehug/bo1-zombies-coop`, guide → the fork's README install section), `README.md` (short "Cheat menu" section at the top: what it does, install from Releases, "remove the other version first")
- Create: `AGENTS.md` (fork rules: merge `upstream/main` when vel.gg changes; mod mechanism in one paragraph; run `npm run check` and `test/cheats-e2e.mjs kino`; commits as `lucas.g@live.dk`), `CLAUDE.md` containing `@AGENTS.md`

- [ ] **Step 1:** `npm run check` → pass; `npm run build && node scripts/package.mjs` → `dist/bo1-zombies-coop.zip`.
- [ ] **Step 2:** Push the branch, open a PR in the fork, merge after Lucas's go; `gh release create v2.2.2.1 dist/bo1-zombies-coop.zip` on the fork.
- [ ] **Step 3:** Give Lucas the install steps for his gaming laptop (download the zip from the release, unzip, chrome://extensions → remove the old one → Developer mode → Load unpacked).
- [ ] **Step 4: Commit** `chore: release 2.2.2.1 with the cheat menu`.
