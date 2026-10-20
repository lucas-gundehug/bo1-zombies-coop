# bo1-zombies-coop (Lucas's fork)

Fork of `AllanLotta/bo1-zombies-coop` (remote `upstream`) with a cheat menu in Fun mode (see `README.md`, which is the fork's own). Lucas does not
code; the agent writes, tests and maintains everything. Talk to him in plain English.

## Keeping up with upstream

vel.gg changes its engine often and upstream follows within a day or so. When the card says "vel.gg updated its game
engine" or upstream has a new release: `git fetch upstream && git merge upstream/main`, rebuild, run the checks below,
then publish a fork release (see Release). `README.md` is the fork's own: on a merge conflict there keep ours and
carry over only what changed for users (install steps, new features). Keep fork changes small and inside `src/cheats/`
and `src/map/`, so merges stay easy. The upstream files the fork touches: `src/main.js`, `src/session/hooks.js`,
`src/session/messages.js`, `src/fun/fun.js`, `src/ui/view.js`, `scripts/build.mjs`, `src/util/updates.js`,
`extension/manifest.json`, `package.json`, `test/ui-preview.mjs`, `test/e2e.mjs`, `README.md`.

## The cheat menu in one paragraph

vel.gg's engine stacks game-script mods named in `fs_mods` (`MisaDev4/bo1-zombies-decompiled`, `mods/_stack`). At engine
start (`src/session/hooks.js` → `src/cheats/setup.js`) the extension writes `mods/cheats` and, when vel.gg shipped none,
`mods/_stack` into the pack folder the engine's `fs_b` names (OPFS), and appends `cheats` to `fs_mods` (never for a
guest, and after `prepareHost` captured the settings guests copy). `src/cheats/gsc/_cheats.gsc` polls the `cheats_cmd`
dvar and publishes `cheats_*` dvars; `src/cheats/bridge.js` reads them by sending the dvar's name as a console command
and catching the engine's `"name" is: "value^7"` print in `console.log`. M opens the card without pausing
(`src/cheats/hotkey.js`): vel.gg presses Escape for the game whenever it sees the pointer lock lost, so the one unlock M
causes is hidden from it.

## The map in one paragraph

N in a game opens the map panel (`src/map/`) without pausing and without taking the mouse (`src/map/hotkey.js`; a canvas
in its own shadow root, `src/map/overlay.js`). The same mod's `src/cheats/gsc/_map.gsc` captures the rooms
(`level.zones`), the door and debris triggers and the box spots once, in one order, when the lists are published, and
publishes `cheats_map_live` (every player, every 0.25 s) and `cheats_map_state` (doors, rooms, box, power; its counter
goes up on a change). The bridge hands `cheats_map_*` prints to `src/map/live.js`; the host forwards them to guests as
`mapp` / `maps` control messages (`src/map/net.js`), so every player running the fork sees the map. Floor plans are
bundled per map (`src/map/plans/<slug>.json`): `node scripts/map-plan.mjs <slug|all>` loads the map, asks the script
for a one-off dump (each room's path nodes) and builds the plan; the raw dumps stay in `scripts/map-dumps/`, and
`node scripts/map-plan.mjs rebuild` remakes the plans from them (after changing the floors or names in
`src/map/names.js`). A plan whose `sig` doesn't match the game hides the doors, so regenerate the plans when vel.gg
changes a map. Findings behind it: `docs/superpowers/specs/2026-10-20-in-game-map-spike.md`.

## Checks

- `npm run check`: lint, build, `test/cheats.test.mjs` and `test/map.test.mjs` (unit), `test/patch.test.mjs` (engine
  patches).
- In the real game (Playwright, downloads the map once per profile): `node test/cheats-e2e.mjs kino actions` (every
  command), `kino ui` (M and the card's buttons), `kino load` / `kino off`, `<map> sweep` (everything once on a map),
  `HORDE=1` for Hell mode. `PROFILE=<dir>` reuses a browser profile with the packs already downloaded. The map:
  `<map> map-script` (the script's data; `MAPDOOR=8` on Five opens a debris pile), `<map> map` (N, a door opening,
  smoothness), and in co-op `MAP=1 node test/e2e.mjs 2 kino` (the guest's map, the host's dot gliding).
- Things learned in game: the script's lists are published 2 s after everyone spawned (wait for `lists>=1`); unfreezing
  keeps zombie spawning paused until the round ends, or one extra zombie spawns. A bought door keeps its trigger with
  `_door_open` set (debris may delete it); hidden box spots and Moon's Juggernog and Speed Cola triggers sit 10,000
  units down (`chest.orig_origin` is a box's real place).

## Release

Bump `extension/manifest.json` `version` (4 parts, e.g. `2.2.2.1`; the third part follows upstream), `npm run build`,
`node scripts/package.mjs` (needs `zip`; on Windows without it, zip the contents of `extension/` with Python's
`zipfile`, `manifest.json` at the top level), then `gh release create v<version> dist/bo1-zombies-coop.zip` on
`lucas-gundehug/bo1-zombies-coop`. The card's update notice reads this fork's releases.

## Lucas's relay

Worker `bo1-zombies-coop-relay` on Lucas's Cloudflare account, served only at `https://blackops.gundelach.pw` (Worker
custom domain on the `gundelach.pw` zone; its workers.dev address is off). Deploy it with `npm run relay:deploy:own`
(`relay/wrangler.gundelach.jsonc`), never with `relay/wrangler.jsonc`, which would turn the workers.dev address back
on. Live check: `node test/relay.test.mjs https://blackops.gundelach.pw`. It runs on the Workers Free plan (100,000
requests a day); keep it there. Changes to the domain or DNS need Lucas's yes first.

## Rules

- Commits use `lucas.g@live.dk`. Work on a branch; Lucas merges.
- Never weaken a test to make it pass. Run `npm run check` before every commit.
