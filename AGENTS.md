# bo1-zombies-coop (Lucas's fork)

Fork of `AllanLotta/bo1-zombies-coop` (remote `upstream`) with a cheat menu in Fun mode (see `README.md`, which is the fork's own). Lucas does not
code; the agent writes, tests and maintains everything. Talk to him in plain English.

## Keeping up with upstream

vel.gg changes its engine often and upstream follows within a day or so. When the card says "vel.gg updated its game
engine" or upstream has a new release: `git fetch upstream && git merge upstream/main`, rebuild, run the checks below,
then publish a fork release (see Release). `README.md` is the fork's own: on a merge conflict there keep ours and
carry over only what changed for users (install steps, new features). Keep fork changes small and inside `src/cheats/`
or `src/net/` (direct links), so merges stay easy. The upstream files the fork touches: `src/main.js`,
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
and catching the engine's `"name" is: "value^7"` print in `console.log`. M opens the card without pausing
(`src/cheats/hotkey.js`): vel.gg presses Escape for the game whenever it sees the pointer lock lost, so the one unlock M
causes is hidden from it.

## Direct links in one paragraph

Game packets and control messages go straight between each guest and the host over WebRTC; the relay only introduces
players (signaling: `rtc-offer` / `rtc-answer` / `rtc-ice`, `src/net/rtc-messages.js`) and is the per-guest fallback.
The guest offers, the host answers (`src/net/direct.js`, page side, one `RTCPeerConnection` per link, STUN only, no
TURN). Each link has two pre-negotiated data channels, `game` (id 1, unordered, no retransmits) and `control` (id 2,
reliable), transferred to the pump worker right after creation (`postMessage(ch, [ch])`, Chrome 155+); the worker
sends per seat over them while both are open, else over the relay (`src/net/routes.js`), and a host broadcast reaches
each guest once on its own path. Direct control messages get the relay's `from` stamp and may not use the relay's own
types (`fromDirect`). Presence is "relay says present OR direct link open" (`syncPresence`, `relayClosed` in
`src/session/messages.js`), so a game with direct links outlives the relay. A relay hiccup must not drop direct links
(the relay re-announcing a seat keeps its link; a new offer for a seat replaces it). Players on a direct link see each other's IP address (Lucas accepted this). The card shows Direct / Relay per
player. Other features (the in-game map) send through `send()` and get the direct path for free; `session.links`
says which seats are direct.

## Checks

- `npm run check`: lint, build, `test/cheats.test.mjs` (unit), `test/patch.test.mjs` (engine patches),
  `test/direct.test.mjs` (direct links: signaling checks, routing, page side with a fake `RTCPeerConnection`, card).
- Direct links in the real game: `test/e2e.mjs` checks each guest is direct; `NODIRECT=2` (or `all`) puts players on
  the relay only, `DROP_DIRECT_S=<s>` drops the first guest's link mid-game, `RELAY_DOWN_S=<s>` cuts the relay
  mid-game; the end prints each player's relay traffic. Use your own `PROFILE=/tmp/<name>` and a relay on its own port
  (`npx wrangler dev --config relay/wrangler.jsonc --port <port>`) when another session may be testing too.
- In the real game (Playwright, downloads the map once per profile): `node test/cheats-e2e.mjs kino actions` (every
  command), `kino ui` (M and the card's buttons), `kino load` / `kino off`, `<map> sweep` (everything once on a map),
  `HORDE=1` for Hell mode. `PROFILE=<dir>` reuses a browser profile with the packs already downloaded.
- Things learned in game: the script's lists are published 2 s after everyone spawned (wait for `lists>=1`); unfreezing
  keeps zombie spawning paused until the round ends, or one extra zombie spawns.

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
