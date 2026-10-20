# In-game Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A big map panel, toggled with N during a game, that shows every player (colour dot with the first letter of their name, view direction, gliding smoothly), the room you're in, the rooms and doors not yet opened (with price), and the perk machines, Mystery Box, Pack-a-Punch and power switch. The host and every guest running the fork see it.

**Architecture:** The floor plan of each map is dumped once from the game by a Playwright script, turned into a compact JSON plan and bundled. While playing, the host's game script publishes the live data (players, open doors and rooms, box, power) in `cheats_map_*` dvars that the existing bridge reads through the console. The host's extension draws it and forwards it to guests as two control messages through `send()` (direct link or relay, whichever is up). Every machine draws its own dot from its own camera every frame and glides the others between the samples it receives. The overlay is a canvas in its own closed shadow root that doesn't take the mouse.

**Tech Stack:** Plain ES modules bundled by esbuild (`scripts/build.mjs`, `.gsc` loaded as text), BO1 GSC (the `cheats` mod), Canvas 2D, Playwright for real-game tests, Node's `assert` for unit tests.

**Spec:** `docs/superpowers/specs/2026-10-20-in-game-map-design.md` (read it first). Also read `AGENTS.md`.

## Global Constraints

- One mod: the map's game script lives in the existing `cheats` mod (`src/cheats/files.js` `MOD_FILES`), no second mod.
- Fork code goes in `src/map/`. Upstream files get the smallest hooks; every upstream file touched is added to the list in `AGENTS.md`.
- Dvar values stay under ~400 characters. Longer data is split into numbered chunks (`cheats_map_dump_<i>`, like `cheats_weapons_<i>`).
- Console commands go one per 50 ms tick through `session.fun.queue`, shared with the cheat menu and Fun mode. The map asks for at most 4 dvars a second at steady state.
- Map messages go through `send()` only (`src/net/pump.js`). Positions at most 4 a second from the host, state on change plus every 5 s. Every message is well under 4096 bytes.
- The map never takes the pointer lock, never pauses, and nothing on it is clickable.
- Card text is English only (as `src/cheats/strings.js`).
- Commits use `lucas.g@live.dk`, end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, on branch `feat/in-game-map`. Run `npm run check` before every commit. Never weaken a test.
- Nothing may cost money on Cloudflare. No relay change.

## Review Focus

1. **A downed, dead or spectating player**: a downed player's dot stays, with a red ring. A spectator (dead, waiting for the next round) is not drawn and is left out of the legend. No crash, no dot stuck at the death spot. Test in Task 5.
2. **A player joins or leaves mid-game**: a new player's dot appears with their colour and letter within a second. A player who left disappears within 2 s, and no stale dot is left gliding. Test in Task 5.
3. **The bundled plan doesn't match the game** (vel.gg changed a map, or an older plan): players are still drawn, but doors and room states are hidden, and the panel says the map's doors may be out of date. Never a wrong door. Test in Task 4 (`sig` mismatch).
4. **Game over and restart in the same page**: the script's state counter starts again from 0. The map takes the new state instead of ignoring it as old. Test in Task 4.
5. **A level without a plan** (unknown slug, a future map), **or no data at all** (host on the original extension, cheat menu off): N still opens the panel, which explains why there's no map. No error. Test in Task 5.

---

### Task 1: Spike in the real game (throwaway, decides the data sources)

Finds out what the game script can reach before anything is built on it. Nothing from this task is merged except the findings document.

**Files:**
- Create (throwaway, never committed): `src/cheats/gsc/_probe.gsc`, plus a temporary `MOD_FILES` entry and a `_hooks.gsc` line that threads it from `main_end`; `test/map-probe.mjs` built from `test/cheats-e2e.mjs` (`startMap`, `command`, `readDvar`).
- Create (committed): `docs/superpowers/specs/2026-10-20-in-game-map-spike.md`

**Interfaces:**
- Produces: the findings document, which later tasks read. It answers each question below with the exact GSC used and the numbers seen on Kino, Five and Moon.

- [ ] **Step 1: Probe the rooms.** Publish `level.zones` keys, each zone's `.volumes.size` and `.is_enabled`, and, for the host, the zone the player is in (`IsTouching` over each zone's volumes). Walk nowhere: the spawn room must report as enabled and as the player's zone.
- [ ] **Step 2: Probe room shapes.** Try, one per run (an unknown function is a compile error that stops the whole mod from loading, so never put two unproven calls in one run): `GetAllNodes()` (count, a sample `.origin`), and volume bounds via `vol GetPointInBounds( 1, 1, 1 )` / `( -1, -1, -1 )`. For nodes, find each one's zone by moving one spawned `script_origin` to the node and testing `IsTouching` against the volumes. Record node count, zone coverage (share of nodes with a zone), the dump size in characters, and how long reading it in 380-character chunks takes through the console.
- [ ] **Step 3: Probe doors and debris.** `GetEntArray( "zombie_door", "targetname" )` and `"zombie_debris"`: `origin`, `zombie_cost`, `target`, `script_noteworthy` (power doors are `"electric_door"`), `script_flag` (which zones it opens). Then open one (give points with Fun mode, notify `"trigger"` with the player, as the decompiled repo's `mods/sandbox` does) and record what marks it opened: the entity removed (`!IsDefined`), or a field such as `_door_open`. Record how the triggers of one door are grouped (same `target`).
- [ ] **Step 4: Probe the points of interest.** `zombie_vending` (`script_noteworthy` is the perk), `zombie_vending_upgrade` (Pack-a-Punch), `use_elec_switch` (power), `level.chests` and `level.chest_index` (box spots and the current one). Note the maps where one is missing or named differently (Moon, Shangri-La, Call of the Dead, Five's Pack-a-Punch room).
- [ ] **Step 5: Probe players' states and floors.** Per player: `GetEntityNumber()`, `origin`, `GetPlayerAngles()[1]`, downed (`player maps\_laststand::player_is_in_laststand()`) and spectating (`player.sessionstate == "spectator"`). On Kino and Five, record the feet height on each floor, so the floor boundaries can be hand-written.
- [ ] **Step 6: Check a guest can carry the data.** With `test/e2e.mjs` and `CHEATS=1` (two players, local relay), send a dummy `{ t: "mapp", ... }` control message from the host every 250 ms and confirm the guest's `onGuestMessage` sees it at that rate.
- [ ] **Step 7: Write the findings** to `docs/superpowers/specs/2026-10-20-in-game-map-spike.md`: per question, the GSC that works, the numbers, and the source chosen for room shapes (nodes or volume boxes). **If no source gives room shapes, or doors can't be told apart as open or closed, stop and report to Lucas before Task 2.** Remove the probe files and the temporary `MOD_FILES` and `_hooks.gsc` lines.
- [ ] **Step 8: Commit the findings**

```bash
git add docs/superpowers/specs/2026-10-20-in-game-map-spike.md
git commit -m "docs: in-game map spike findings"
```

---

### Task 2: The plan format and its geometry

**Files:**
- Create: `src/map/plan.js`
- Create: `test/map.test.mjs`
- Modify: `package.json` (`check` also runs `node test/map.test.mjs`)

**Interfaces:**
- Produces, in `src/map/plan.js`:
  - The plan JSON shape (every later task uses it):
    ```js
    {
      v: 1, slug: "kino", sig: "z18d24",          // sig = "z" + room count + "d" + door count, as the live script reports it
      floors: [{ name: "Ground floor", below: 120 }, { name: "Upstairs", below: null }], // feet z < below → that floor; last has null
      rooms: [{ id: "foyer_zone", label: [0, 120, -340], rects: [[0, x0, y0, x1, y1], ...] }], // [floor, ...world units]
      doors: [{ kind: "door" | "debris" | "power", cost: 1000, at: [0, x, y], rooms: [2, 5] }],
      pois: [{ kind: "perk" | "pap" | "power" | "box", id: "specialty_armorvest" | null, at: [0, x, y] }], // boxes in chest order
    }
    ```
    The index of a room, door or box in these arrays is what the live data refers to.
  - `validPlan(plan) -> boolean`: shape check used on load (bad plan → treated as no plan).
  - `floorOf(plan, z) -> number`: index of the floor for a feet height.
  - `fitView(plan, floor, width, height, margin) -> { scale, rotate, tx, ty }`: fits that floor's rects into the box; `rotate` is 0 or 90, whichever gives the larger scale; map north (world +y) is up when `rotate` is 0.
  - `toScreen(view, x, y) -> [sx, sy]`

- [ ] **Step 1: Write the failing tests** in `test/map.test.mjs` (same `tests`/`test` runner style as `test/cheats.test.mjs`) with a hand-made two-floor plan fixture:
  - `floorOf` returns 0 for z = 0 and 1 for z = 200 with `below: 120`, and 0 for any z on a one-floor plan.
  - `validPlan` accepts the fixture and rejects a plan whose door names a room index past the end, or whose rect has 4 numbers.
  - `fitView` of a 2000×500 floor into 800×600 gives `rotate: 0`; of a 500×2000 floor gives `rotate: 90`; the floor's corners land inside the box after `toScreen`, and world +y points up on screen (larger y → smaller sy) when `rotate` is 0.
- [ ] **Step 2: Run** `node test/map.test.mjs`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/map/plan.js` with the four functions above.
- [ ] **Step 4: Run** `node test/map.test.mjs`. Expected: all pass. Run `npm run check`. Expected: lint, build and all test files pass.
- [ ] **Step 5: Commit**: `feat(map): plan format and geometry`

---

### Task 3: The game script (dump and live data)

**Files:**
- Create: `src/cheats/gsc/_map.gsc`
- Modify: `src/cheats/files.js` (add `{ path: "mods/cheats/maps/cheats/_map.gsc", text: map }`)
- Modify: `src/cheats/gsc/_cheats.gsc` (`main_end` threads `maps\cheats\_map::map_main()`; the `cheats_cmd` switch gets `case "mapdoor":`)
- Modify: `test/cheats-e2e.mjs` (new scenario `map-script`)

**Interfaces:**
- Consumes: the sources and exact GSC recorded in the spike findings.
- Produces (dvars; names start with `cheats_` so `parseDvarPrint` and `watchConsole` already route them):
  - `cheats_map_live`, refreshed every 0.25 s once everyone has spawned: `v=<state counter> p=<ent>,<x>,<y>,<z>,<yaw>,<room>,<s>;...`, integers; `room` is the index into the plan's rooms or -1; `s` is 0 alive, 1 downed, 2 spectating.
  - `cheats_map_state`, rewritten whenever it changes (the counter `v` then goes up by one): `sig=<sig> doors=<one 0/1 per door, 1 = open> rooms=<one 0/1 per room, 1 = enabled> box=<chest indices, comma-separated> power=<0|1>`.
  - `cheats_map_dump_count` and `cheats_map_dump_<i>`, written once when the console sets `cheats_map_dump 1`: everything static the plan builder needs (format is the builder's call, recorded at the top of `_map.gsc`).
  - Command `mapdoor <i>` on `cheats_cmd`: opens door `i` the way buying it would (test hook only; not in the card). It answers in `cheats_results` like other commands.
  - Rooms, doors and chests are captured once, in one order, at the same moment the cheat menu publishes its lists (`all_players_spawned` + 2 s). The dump and the live data both use that capture, so their indices agree.

- [ ] **Step 1: Write the failing real-game scenario** `map-script` in `test/cheats-e2e.mjs`: start the map, wait for `ready=1`, then assert:
  - `cheats_map_live` has an entry for entity 0 with `room >= 0` and `s=0` within 10 s of `lists>=1`.
  - `cheats_map_state` `sig` has the form `z<rooms>d<doors>` with rooms ≥ 1, and `doors` and `rooms` bit strings of those lengths.
  - After `run("mapdoor 0")`, the state counter goes up and door 0's bit becomes `1` within 5 s.
  - After `set cheats_map_dump 1`, every `cheats_map_dump_<i>` up to the count reads back non-empty and under 400 characters.
- [ ] **Step 2: Run** `npm run build && node test/cheats-e2e.mjs kino map-script`. Expected: FAIL (no `cheats_map_live`).
- [ ] **Step 3: Implement** `_map.gsc`, the `MOD_FILES` entry, and the two `_cheats.gsc` hooks.
- [ ] **Step 4: Run** the scenario on `kino`, `five` and `moon`, and once with `HORDE=1` on `kino`. Expected: PASS on all four. Run `node test/cheats-e2e.mjs kino actions` to prove the cheat menu still works. Expected: PASS. Run `npm run check`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(map): game script publishes live map data and a one-off dump`

---

### Task 4: Reading the live data on the host

**Files:**
- Create: `src/map/live.js`
- Create: `src/map/state.js`
- Modify: `src/cheats/bridge.js` (`onCheatsLine` hands names starting with `cheats_map_` to `onMapLine` and returns)
- Modify: `src/main.js` (`session.map = createMap()` in `start()`; `mapTick(session, Date.now())` in `tick()` after `funTick`)
- Test: `test/map.test.mjs`

**Interfaces:**
- Consumes: the dvar formats from Task 3; `validPlan`, `floorOf` from Task 2.
- Produces:
  - `createMap() -> MapState`, in `src/map/state.js`: `{ open: false, slug: null, plan: null, tracks: new Map() /* n -> Track (Task 5) */, live: new Map() /* n -> { room, s, floor, at } */, state: null /* { v, sig, doors, rooms, box, power, at } */, planOk: false, lastAskAt: -Infinity, sentStateAt: 0, sentStateKey: null }`.
  - `parseLive(value) -> { v, players: [{ ent, x, y, z, yaw, room, s }] } | null` and `parseMapState(value) -> { sig, doors: boolean[], rooms: boolean[], box: number[], power: boolean } | null`, in `src/map/live.js`.
  - `onMapLine(session, name, value)`: on `cheats_map_live`, stores each player's sample under their lobby number `n` (entity number → `n` through `funPlayers(session)` slots; an entity with no player there is skipped) and asks for `cheats_map_state` when `v` differs from the stored one; on `cheats_map_state`, stores it with `v` and sets `planOk = state.sig === plan.sig`.
  - `mapTick(session, now)`: host or solo only, while `screen() === "playing"` and `session.cheats.ok`. Asks for `cheats_map_live` every 250 ms (through the same `ask` helper as the bridge: export it from `bridge.js` as `askDvar(session, name)`). Loads the plan for the current slug on slug change. Calls `sendMap(session, now)` (Task 6; a no-op stub until then).
  - Plans are loaded by `planFor(slug) -> plan | null` from `src/map/plans/index.js` (Task 7 fills it in; until then it exports an empty table).

- [ ] **Step 1: Write the failing tests**:
  - `parseLive("v=3 p=0,100,-200,64,90,2,0;1,5,6,7,-45,-1,1")` gives `v: 3` and two players with those numbers; `parseLive("garbage")` gives `null`; an entry with a missing field is skipped.
  - `parseMapState("sig=z3d2 doors=01 rooms=110 box=1 power=0")` gives `doors: [false, true]`, `rooms: [true, true, false]`, `box: [1]`, `power: false`.
  - With a plan fixture whose `sig` is `z3d2`: after `onMapLine` with a matching state, `planOk` is true; after one with `sig=z3d3`, `planOk` is false and the stored doors are kept out of what Task 5 draws (Review Focus 3).
  - A live `v` lower than the stored one (game restarted, Review Focus 4) asks for `cheats_map_state` again and the next state replaces the old one.
  - `mapTick` asks for `cheats_map_live` at most once per 250 ms, and not at all when `session.mode === "guest"` or `session.cheats.ok` is false.
- [ ] **Step 2: Run** `node test/map.test.mjs`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** `live.js`, `state.js`, the bridge hand-off and `askDvar` export, and the `main.js` hooks.
- [ ] **Step 4: Run** `node test/map.test.mjs` and `npm run check`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(map): host reads live map data from the game script`

---

### Task 5: Gliding tracks and what to draw

**Files:**
- Create: `src/map/track.js`
- Create: `src/map/model.js`
- Create: `src/map/strings.js`
- Test: `test/map.test.mjs`

**Interfaces:**
- Consumes: `MapState` (Task 4), `floorOf` (Task 2), `PLAYER_COLORS` from `src/ui/card.js`, `latestView()` from `src/game/page.js`, `roomName(slug, id)` and `floorName(slug, i)` (Task 7; until then, `src/map/names.js` exports both with only the fallback: `foyer_zone` → "Foyer", floor i → "Floor i+1").
- Produces:
  - `pushSample(track, at, x, y, yaw)` and `sampleTrack(track, at) -> { x, y, yaw } | null` in `src/map/track.js`. A track keeps the last 8 samples. `sampleTrack` interpolates linearly between the two samples around `at`, turns yaw the short way round (350° → 10° passes 0°), holds the newest sample past the end (no guessing ahead), and gives `null` for an empty track.
  - `RENDER_DELAY_MS = 300` (others are drawn this far in the past, so there are always two samples to glide between at 4 a second).
  - `mapModel(session, now) -> Model` in `src/map/model.js`, the only input the renderer gets:
    ```js
    {
      status: "ok" | "noPlan" | "waiting" | "noData",  // noData: nothing received 5 s after the map was opened in a game
      room: "Lobby" | null, floor: 0, floors: [{ name, current, others: ["J"] }],
      rooms: [{ index, open: true | null /* null when !planOk */, current: false }],
      doors: [{ index, cost, kind, at }],              // closed ones only; [] when !planOk
      pois: [{ kind, id, at, active }],                // box: active = current spot; power: active = power on
      players: [{ n, letter, color, x, y, yaw, floor, downed, me }], // spectators left out
      legend: [{ letter, name, color }], stale: false  // stale: !planOk (show the out-of-date note)
    }
    ```
    The own player (`me`) takes x, y and yaw from `latestView()` (yaw is `angles[1]`) and floor and room from their own live entry. Others come from `sampleTrack(track, now - RENDER_DELAY_MS)`. A player with no sample for 2 s is dropped, and so is their track (Review Focus 2). The letter is the first letter of the name, uppercased, or the player number when the name is empty.
  - `M` text constants in `src/map/strings.js`: `noPlan: "There's no map for this level yet."`, `waiting: "Waiting for the map…"`, `noData: "No map in this game. The host needs this version of the extension, with the cheat menu on."`, `stale: "This level changed since its map was made, so doors aren't shown."`, `close: "N to close"`, `youAreIn: "You are in"`.

- [ ] **Step 1: Write the failing tests**:
  - `sampleTrack` halfway between samples at t=0 (x=0, yaw=350) and t=250 (x=100, yaw=10) gives x=50 and yaw=0; past the newest it returns the newest; empty gives null.
  - `mapModel` with a two-player fixture (host "Lucas" n=1, guest "jonas" n=2): letters "L" and "J", colours `PLAYER_COLORS[0]` and `[1]`, `me` set only on n=1 (session.mode "host").
  - A player with `s=1` has `downed: true`; with `s=2` is absent from `players` and `legend` (Review Focus 1).
  - A player whose last sample is 2.1 s old is absent and their track is deleted; a player who appears in a new live sample shows up on the next model (Review Focus 2).
  - With `planOk` false, `doors` is empty, every `rooms[i].open` is null, and `stale` is true; players are still present (Review Focus 3).
  - No plan for the slug → `status: "noPlan"`; plan but no live or state data 5 s after the map was opened while playing → `status: "noData"` (Review Focus 5).
  - A friend on floor 1 while I'm on floor 0 → `floors[1].others` is `["J"]`.
- [ ] **Step 2: Run** `node test/map.test.mjs`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** `track.js`, `model.js`, `strings.js`, and the fallback `names.js`.
- [ ] **Step 4: Run** `node test/map.test.mjs` and `npm run check`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(map): gliding player tracks and the map model`

---

### Task 6: Sending the map to guests

**Files:**
- Create: `src/map/net.js`
- Modify: `src/session/messages.js` (`onGuestMessage`: `case "mapp": case "maps": onMapMessage(session, message); break;`)
- Modify: `src/map/live.js` (`mapTick` calls the real `sendMap`)
- Test: `test/map.test.mjs`

**Interfaces:**
- Consumes: `MapState`, `send()` from `src/net/pump.js`, `pushSample` (Task 5).
- Produces:
  - Host → guests, `{ t: "mapp", p: [[n, x, y, z, yaw, room, s], ...] }`, sent once per new `cheats_map_live` reading (so at most 4 a second), only while `session.peer`.
  - Host → guests, `{ t: "maps", slug, sig, doors: "0101", rooms: "110", box: [1], power: 0 }`, sent when it changes and every 5 s regardless (like `broadcastLobby`), only while `session.peer`.
  - `sendMap(session, now)` and `onMapMessage(session, message)` in `src/map/net.js`. On a guest, `onMapMessage` stores samples with the receive time (`Date.now()`) and fills the same `MapState` fields the host fills, so `mapModel` needs no guest branch beyond `me` (`n === session.seat + 1`) and names from `guestRoster(session)`.
  - Validation: `p` is an array of at most 4 entries of 7 finite numbers with `n` in 1..4; bit strings match `/^[01]{0,256}$/`; `box` is at most 8 integers; `slug` is a known slug. Anything else is ignored whole.

- [ ] **Step 1: Write the failing tests**:
  - With a stubbed `session.pump.postMessage` collecting messages: two `mapTick` readings with the same state produce two `mapp` and one `maps`; a changed door bit produces a second `maps`; 5 s later an unchanged state is sent again.
  - Nothing is sent while `session.peer` is false.
  - `onMapMessage` on a guest session with a valid `mapp` fills two tracks; one with 5 entries, a NaN, or `n: 7` changes nothing; an unknown slug in `maps` changes nothing.
  - The JSON of a 4-player `mapp` and of a `maps` for a plan with 64 doors and 64 rooms are each under 1000 bytes.
- [ ] **Step 2: Run** `node test/map.test.mjs`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** `net.js`, the `messages.js` hook, and the `mapTick` call.
- [ ] **Step 4: Run** `node test/map.test.mjs` and `npm run check`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(map): host forwards the map to guests`

---

### Task 7: Plans for all ten maps, with readable names

**Files:**
- Create: `scripts/map-plan.mjs` (Playwright: `node scripts/map-plan.mjs <slug|all>`, `PROFILE=` as in `test/cheats-e2e.mjs`)
- Create: `scripts/plan-build.mjs` (pure: dump text → plan object)
- Create: `src/map/plans/<slug>.json` for `nacht verruckt shinonuma riese kino five ascension cotd shangrila moon`
- Modify: `src/map/plans/index.js` (imports the ten JSON files; `planFor(slug)` returns a plan only if `validPlan`)
- Modify: `src/map/names.js` (`ROOMS[slug][zoneId]`, `FLOORS[slug] = [{ name, below }]`)
- Test: `test/map.test.mjs`

**Interfaces:**
- Consumes: the dump from Task 3, `validPlan` (Task 2), the room-shape source from the spike findings.
- Produces: `buildPlan(dumpText, { slug, floors }) -> plan` in `scripts/plan-build.mjs`. If the spike chose path nodes: mark the 48-unit grid cells around each node of a room, per floor, then merge each row's runs of cells into rects and merge equal runs on consecutive rows. If it chose volume boxes: one rect per volume, clipped to its floor. `label` is the centre of the room's largest rect. A door's `rooms` are the two zones its `script_flag` names (spike Step 3).

- [ ] **Step 1: Write the failing tests**: `buildPlan` on a small hand-written dump (two rooms, one door, one perk, two box spots, nodes on two heights) gives a plan that passes `validPlan`, with two rooms, the door joining room 0 and 1 at its cost, the perk's id, boxes in dump order, rects only on the floor their nodes are on, and `sig: "z2d1"`.
- [ ] **Step 2: Run** `node test/map.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `plan-build.mjs` and `map-plan.mjs`. The script starts the map, waits for `lists>=1`, sets `cheats_map_dump 1`, reads every chunk, builds the plan with that map's `FLOORS`, checks that `sig` equals the live `cheats_map_state` sig, and writes `src/map/plans/<slug>.json` (compact, no indentation, coordinates rounded to whole units).
- [ ] **Step 4: Generate** the ten plans: `PROFILE=<dir> node scripts/map-plan.mjs all`. Expected: ten files written, each `sig` matching the game. On Kino and Five, write `FLOORS` boundaries from the spike's heights first. Then write `ROOMS` names for each map from the dumped zone ids and what each room is in the game (spawn room, named areas). Any id left out falls back to the readable form.
- [ ] **Step 5: Check the bundle size.** Run `npm run build` and compare `extension/coop.js` with its size before the plans (about 214 KB). Expected: the ten plans add under 400 KB. If they add more, coarsen the grid to 64 units and regenerate.
- [ ] **Step 6: Run** `node test/map.test.mjs` and `npm run check`. Expected: PASS, including a test that every bundled plan passes `validPlan` and that `planFor("kino").sig` has at least 10 rooms.
- [ ] **Step 7: Commit**: `feat(map): floor plans and room names for all ten maps`

---

### Task 8: The overlay and the N key

**Files:**
- Create: `src/map/overlay.js`
- Create: `src/map/hotkey.js`
- Modify: `src/main.js` (create the overlay and `installMapKey(session)` next to `installCheatsKey`)
- Modify: `test/ui-preview.mjs` (a map preview from a fixture plan and model, for screenshots without the game)
- Test: `test/map.test.mjs`

**Interfaces:**
- Consumes: `mapModel` (Task 5), `fitView` and `toScreen` (Task 2), `M` strings, the card's colour tokens from `src/ui/styles.js`.
- Produces:
  - `onMapKey(session, event, { playing }) -> boolean`, in `src/map/hotkey.js`: `KeyN` without Ctrl, Alt or Meta, not a repeat, not typed into an input, textarea, select or contenteditable (same `composedPath` check as `onCheatsKey`), only while `playing`; toggles `session.map.open` and returns true. `installMapKey(session)` adds capturing `keydown` and `keyup` listeners on `window` that stop the event when it was ours. It never touches the pointer lock.
  - `class MapOverlay` in `src/map/overlay.js`: a `bo1-coop-map` element with a closed shadow root and a canvas, `position: fixed; inset: 0; pointer-events: none`, above the game and below the co-op card. `show(session)` starts a `requestAnimationFrame` loop that draws `mapModel(session, Date.now())` until `session.map.open` is false or `screen()` is no longer `"playing"`, then hides and stops (a closed map costs nothing). Rooms and labels of the current floor are drawn into a cached offscreen canvas per floor and size. Doors, points of interest and players are redrawn each frame.
  - Look (option B from the mockup `.superpowers/brainstorm/805-1792449458/content/big-map-v2.html`): a panel at 12% from the left and right edges and 8% from the top and bottom, background `rgba(18,17,16,.9)`, 1 px `#34302b` border, 10 px radius. Top row: "You are in" + room name on the left, floor chips on the right (the current one filled `#e2552f`; others show the letters of friends on that floor). Bottom row: the legend, and `N to close` on the right. Open rooms are filled `#2a2622`, unopened `#1d1a17` with a dim outline, the current room has a 3 px `#e2552f` outline and an `#f07a4f` label. Closed doors are a lock tag with the price in `#f4c542` (power doors show a lightning bolt instead of a price). Players are 11 px-radius dots in their colour with a black ring (red when downed), the letter inside, and a short line in their facing direction. Status texts (`noPlan`, `waiting`, `noData`, `stale`) are centred in the panel.

- [ ] **Step 1: Write the failing tests** for `onMapKey`: N while playing toggles `open` and returns true; N while not playing, with Ctrl, as a repeat, or with an input as the composed target returns false and changes nothing; M returns false.
- [ ] **Step 2: Run** `node test/map.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `hotkey.js`, `overlay.js` and the `main.js` wiring.
- [ ] **Step 4: Run** `node test/map.test.mjs` and `npm run check`. Expected: PASS.
- [ ] **Step 5: Check the look** with `npm run preview` and a screenshot of the map preview at 1280×720 and 1100×650. Expected: matches option B, text readable, nothing cut off.
- [ ] **Step 6: Commit**: `feat(map): the map panel and the N key`

---

### Task 9: Real-game checks, co-op, smoothness, docs

**Files:**
- Modify: `test/cheats-e2e.mjs` (scenario `map`: the whole map in one browser)
- Modify: `test/e2e.mjs` (`MAP=1`, fork: the guest's map)
- Modify: `src/cheats/strings.js` (`note` and the "turn off" text mention that the map needs the cheat menu on)
- Modify: `AGENTS.md` (a paragraph on the map like the cheat-menu one; checks; add `src/session/messages.js`, `test/e2e.mjs` and any other upstream file touched to the list), `README.md` ("Use it": press N for the map; friends need this version to see it)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write the `map` scenario**: start the map, wait for `lists>=1`, press `n` with `page.keyboard`, then assert `session.map.open` is true, the model's `status` is `"ok"` with `room` not null, the game is still `"playing"` with `engine.menuOpen()` false, and the pointer is still locked. Then `run("mapdoor 0")` and assert door 0 is gone from the model within 2 s. Press `n` again and assert the overlay element is hidden. With `SHOTS=`, screenshot with the map open.
- [ ] **Step 2: Measure smoothness** in the same scenario: frame intervals from `requestAnimationFrame` over 10 s with the map closed, then 10 s open. Log median and 95th percentile for both. Assert the open 95th percentile is at most the closed one × 1.2 + 2 ms.
- [ ] **Step 3: Run** `node test/cheats-e2e.mjs <map> map` on all ten maps, plus `HORDE=1` on `kino`, and `node test/cheats-e2e.mjs kino actions`. Expected: PASS everywhere. Look at the Kino, Five and Moon screenshots: rooms recognisable, doors at the right places.
- [ ] **Step 4: Write the co-op check** `MAP=1` in `test/e2e.mjs`: once everyone is in, on the first guest's page wait until its map model has both players and `status: "ok"`, press `n` there, and assert the host's dot moves smoothly on the guest (sampled positions over 2 s change in at least 20 different frames). Also run with `GUEST_EXT=<the 2.2.2.1 release unzipped>`: the guest on the old build plays on without errors, and the host's map still works.
- [ ] **Step 5: Run** `npm run relay:dev`, then `MAP=1 CHEATS=1 node test/e2e.mjs 2 kino` and the `GUEST_EXT` variant. Expected: PASS.
- [ ] **Step 6: Update** the strings, `AGENTS.md` and `README.md`. Run `npm run check`. Expected: PASS.
- [ ] **Step 7: Commit and push**: `feat(map): real-game checks for the map, docs`, then `git push`, and open a PR from `feat/in-game-map` to `main` on `lucas-gundehug/bo1-zombies-coop` with the test results and the smoothness numbers. Ask Lucas to try it on his laptop with a friend before merging. The release (version bump, zip, `gh release create`) follows his merge, as in AGENTS.md.
