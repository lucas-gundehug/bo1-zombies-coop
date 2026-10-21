# bo1-zombies-coop (Lucas's fork)

Fork of `AllanLotta/bo1-zombies-coop` (remote `upstream`) with a cheat menu in Fun mode (see `README.md`, which is the fork's own). Lucas does not
code; the agent writes, tests and maintains everything. Talk to him in plain English.

## Keeping up with upstream

vel.gg changes its engine often and upstream follows within a day or so. When the card says "vel.gg updated its game
engine" or upstream has a new release: `git fetch upstream && git merge upstream/main`, rebuild, run the checks below (on a new engine also
`node test/cheats-e2e.mjs kino findview`, see the map paragraph),
then publish a fork release (see Release). `README.md` is the fork's own: on a merge conflict there keep ours and
carry over only what changed for users (install steps, new features). Keep fork changes small and inside `src/cheats/`,
`src/net/` (direct links) or `src/map/` (the in-game map), so merges stay easy. The upstream files the fork touches: `src/main.js`,
`src/session/hooks.js`, `src/session/session.js`, `src/session/messages.js`, `src/session/lobby.js`, `src/fun/fun.js`,
`src/net/pump-worker.js`, `src/net/pump.js`, `src/ui/view.js`, `src/ui/card.js`, `src/ui/styles.js`,
`src/ui/strings.js`, `scripts/build.mjs`, `src/util/updates.js`, `extension/manifest.json`, `package.json`,
`test/ui-preview.mjs`, `test/e2e.mjs`, `README.md`.

## The cheat menu in one paragraph

vel.gg's engine stacks game-script mods named in `fs_mods` (`MisaDev4/bo1-zombies-decompiled`, `mods/_stack`). At engine
start (`src/session/hooks.js` → `src/cheats/setup.js`) the extension writes `mods/cheats` and, when vel.gg shipped none,
`mods/_stack` into the pack folder the engine's `fs_b` names (OPFS), and appends `cheats` to `fs_mods` (never for a
guest, and after `prepareHost` captured the settings guests copy). `src/cheats/gsc/_cheats.gsc` polls the `cheats_cmd`
dvar and publishes `cheats_*` dvars; `src/cheats/bridge.js` reads them by sending the dvar's name as a console command
and catching the engine's `"name" is: "value^7"` print in `console.log`. N opens the card without pausing
(`src/cheats/hotkey.js`): vel.gg presses Escape for the game whenever it sees the pointer lock lost, so the one unlock N
causes is hidden from it. (The keys were swapped in 2.2.2.5 at Lucas's request: M was the cheat menu, N the map.) Health levels (100–500 %, `health <target> <pct>`) multiply the player's own `maxhealth`
(100, or Juggernog's 250); `cheats_health_loop` notices when the game resets it (a perk, a revive, a respawn) and puts
the level back on top.

## Direct links in one paragraph

Game packets and control messages go straight between each guest and the host over WebRTC; the relay only introduces
players (signaling: `rtc-offer` / `rtc-answer` / `rtc-ice`, `src/net/rtc-messages.js`) and is the per-guest fallback.
The guest offers, the host answers (`src/net/direct.js`, page side, one `RTCPeerConnection` per link, STUN only, no
TURN). Each link has two pre-negotiated data channels, `game` (id 1, unordered, no retransmits) and `control` (id 2,
reliable), transferred to the pump worker right after creation (`postMessage(ch, [ch])`, Chrome 155+); the worker
sends per seat over them while both are open, else over the relay (`src/net/routes.js`), and a host broadcast reaches
each guest once on its own path. Direct control messages get the relay's `from` stamp and may not use the relay's own
types (`fromDirect`). Presence is "relay says present OR direct link open" (`syncPresence`, `relayClosed` in
`src/session/messages.js`), so a game with direct links outlives the relay. A relay restart must not drop direct links
(after the host's own `welcome` the links stay); a guest the host's live relay connection saw leave and come back gets
a fresh link (`relayLeft`), and a new offer for a seat always replaces its link. Players on a direct link see each other's IP address (Lucas accepted this). The card shows Direct / Relay per
player. Other features (the in-game map) send through `send()` and get the direct path for free; `session.links`
says which seats are direct.

## The map in one paragraph

M in a game opens the map panel (`src/map/`) without pausing and without taking the mouse (`src/map/hotkey.js`; a canvas
in its own shadow root, `src/map/overlay.js`). The same mod's `src/cheats/gsc/_map.gsc` captures the rooms
(`level.zones`) and the door and debris triggers once, in one order, when the lists are published, and
publishes `cheats_map_live` (every player, every 0.25 s) and `cheats_map_state` (doors, rooms, box, power; its counter
goes up on a change). The box goes by where it stands (`box=<x>:<y>`, `*` in a fire sale), matched to the plan's
nearest spot on the host page (`boxSpots`), because the game shuffles `level.chests` every match. The bridge hands `cheats_map_*` prints to `src/map/live.js`; the host forwards them to guests as
`mapp` / `maps` control messages (`src/map/net.js`), so every player running the fork sees the map. Floor plans are
bundled per map (`src/map/plans/<slug>.json`): `node scripts/map-plan.mjs <slug|all>` loads the map, asks the script
for a one-off dump (each room's path nodes) and builds the plan; the raw dumps stay in `scripts/map-dumps/`, and
`node scripts/map-plan.mjs rebuild` remakes the plans from them (after changing the floors or names in
`src/map/names.js`). A plan whose `sig` doesn't match the game hides the doors, so regenerate the plans when vel.gg
changes a map. Findings behind it: `docs/superpowers/specs/2026-10-20-in-game-map-spike.md`.
The perk and Mystery Box icons are the game's own: `src/map/icons.js` reads them at run time from the map pack's
`.iwd` archives in OPFS (`pack-<slug>/files/main`, zip files of `.iwi` images; perks in `iw_06` / `iw_36`, the box's
`minimap_icon_mystery_box` in `iw_05`) and decodes their DXT data, so no game artwork is in the repo; without them the
map draws text labels. The corner minimap (`src/map/minimap.js`, on unless Settings → Minimap is off) is MW2-style
(Lucas's pick): it turns the cached drawing of the floor around the player every frame so they face up, N on the rim,
and hides while the big map is open. Your own position and facing come from the engine's memory every frame
(`src/map/view.js`): vel.gg's `five.views` updates only about once a second and its angles stay 0. The client keeps
the view as six floats (origin, angles) at the feet and at the eye, at one static address per engine build (`VIEWS`,
keyed by the engine hash). After vel.gg ships a new engine, run `node test/cheats-e2e.mjs kino findview` and add the
entry it prints; until then the map falls back to the game script's 4-a-second samples.

## Checks

- `npm run check`: lint, build, `test/cheats.test.mjs` and `test/map.test.mjs` (unit), `test/patch.test.mjs` (engine
  patches), `test/direct.test.mjs` (direct links: signaling checks, routing, page side with a fake `RTCPeerConnection`, card).
- Direct links in the real game: `test/e2e.mjs` checks each guest is direct; `NODIRECT=2` (or `all`) puts players on
  the relay only, `DROP_DIRECT_S=<s>` drops the first guest's link mid-game, `RELAY_DOWN_S=<s>` cuts the relay
  mid-game; the end prints each player's relay traffic. Use your own `PROFILE=/tmp/<name>` and a relay on its own port
  (`npx wrangler dev --config relay/wrangler.jsonc --port <port>`) when another session may be testing too.
- In the real game (Playwright, downloads the map once per profile): `node test/cheats-e2e.mjs kino actions` (every
  command), `kino ui` (N and the card's buttons), `kino load` / `kino off`, `<map> sweep` (everything once on a map),
  `HORDE=1` for Hell mode. `PROFILE=<dir>` reuses a browser profile with the packs already downloaded. The map:
  `<map> map-script` (the script's data; `MAPDOOR=8` on Five opens a debris pile), `<map> map` (N, a door opening,
  smoothness), `kino health` (levels and Juggernog stacking, read from entity memory), and in co-op `MAP=1 node test/e2e.mjs 2 kino` (the guest's map, the host's dot gliding).
- Things learned in game: the script's lists are published 2 s after everyone spawned (wait for `lists>=1`); unfreezing
  keeps zombie spawning paused until the round ends, or one extra zombie spawns. A bought door keeps its trigger with
  `_door_open` set (debris may delete it); hidden box spots and Moon's Juggernog and Speed Cola triggers sit 10,000
  units down (`chest.orig_origin` is a box's real place). `level.chests` comes in a new random order every match,
  so a chest index never matches the plan (`<map> box` checks two matches and a fire sale). Power switches: `use_elec_switch` (most maps),
  `use_power_switch` (Der Riese), `use_master_switch` (Verrückt), `power_trigger_left` / `_right` (Shangri-La); all set
  the `power_on` flag.

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

- Commits use `lucas.g@live.dk`. Work on a branch and open a PR, then merge it and publish the release yourself once
  the checks pass; don't ask Lucas first (his choice, 2026-10-21).
- Never weaken a test to make it pass. Run `npm run check` before every commit.
