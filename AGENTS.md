# bo1-zombies-coop (Lucas's fork)

Fork of `AllanLotta/bo1-zombies-coop` (remote `upstream`) with a cheat menu in Fun mode (see `README.md`, which is the fork's own). Lucas does not
code; the agent writes, tests and maintains everything. Talk to him in plain English.

## Keeping up with upstream

vel.gg changes its engine often and upstream follows within a day or so. When the card says "vel.gg updated its game
engine" or upstream has a new release: `git fetch upstream && git merge upstream/main`, rebuild, run the checks below,
then publish a fork release (see Release). `README.md` is the fork's own: on a merge conflict there keep ours and
carry over only what changed for users (install steps, new features). Keep fork changes small and inside `src/cheats/`, so merges stay easy. The
upstream files the fork touches: `src/main.js`, `src/session/hooks.js`, `src/fun/fun.js`, `src/ui/view.js`,
`scripts/build.mjs`, `src/util/updates.js`, `extension/manifest.json`, `package.json`, `test/ui-preview.mjs`, `README.md`.

## The cheat menu in one paragraph

vel.gg's engine stacks game-script mods named in `fs_mods` (`MisaDev4/bo1-zombies-decompiled`, `mods/_stack`). At engine
start (`src/session/hooks.js` → `src/cheats/setup.js`) the extension writes `mods/cheats` and, when vel.gg shipped none,
`mods/_stack` into the pack folder the engine's `fs_b` names (OPFS), and appends `cheats` to `fs_mods` (never for a
guest, and after `prepareHost` captured the settings guests copy). `src/cheats/gsc/_cheats.gsc` polls the `cheats_cmd`
dvar and publishes `cheats_*` dvars; `src/cheats/bridge.js` reads them by sending the dvar's name as a console command
and catching the engine's `"name" is: "value^7"` print in `console.log`. M opens the card without pausing
(`src/cheats/hotkey.js`): vel.gg presses Escape for the game whenever it sees the pointer lock lost, so the one unlock M
causes is hidden from it.

## Checks

- `npm run check`: lint, build, `test/cheats.test.mjs` (unit), `test/patch.test.mjs` (engine patches).
- In the real game (Playwright, downloads the map once per profile): `node test/cheats-e2e.mjs kino actions` (every
  command), `kino ui` (M and the card's buttons), `kino load` / `kino off`, `<map> sweep` (everything once on a map),
  `HORDE=1` for Hell mode. `PROFILE=<dir>` reuses a browser profile with the packs already downloaded.
- Things learned in game: the script's lists are published 2 s after everyone spawned (wait for `lists>=1`); unfreezing
  keeps zombie spawning paused until the round ends, or one extra zombie spawns.

## Release

Bump `extension/manifest.json` `version` (4 parts, e.g. `2.2.2.1`; the third part follows upstream), `npm run build`,
`node scripts/package.mjs` (needs `zip`), then `gh release create v<version> dist/bo1-zombies-coop.zip` on
`lucas-gundehug/bo1-zombies-coop`. The card's update notice reads this fork's releases.

## Rules

- Commits use `lucas.g@live.dk`. Work on a branch; Lucas merges.
- Never weaken a test to make it pass. Run `npm run check` before every commit.
