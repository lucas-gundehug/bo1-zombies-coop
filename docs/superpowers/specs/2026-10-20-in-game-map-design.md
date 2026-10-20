# In-game map for the cheat-menu fork — design

Date: 2026-10-20. Owner: Lucas (does not code; Claude builds and maintains it). Status: approved by Lucas in
conversation on 2026-10-20. Starting brief:
`docs/ideas/2026-10-19-map.md`. How the fork works and how to test in the real game: `AGENTS.md`.

## Intent

Lucas plays BO1 Zombies on vel.gg/bsz with friends through this fork. He gets lost: "I get lost in the game about
where my friends are, what room I'm in, what doors I have not unlocked yet and would like a map for that." The map
answers those three questions at a glance, without stopping play. No teleport.

How he plays: he usually hosts, and his friends install this fork too and join him. Everyone running the fork must
see the map. That holds whoever hosts, as long as the host also runs the fork.

## Goals

A **big map panel** that opens and closes with **N** during a game. It shows:

- **Players**: a dot per player in their co-op colour (`PLAYER_COLORS` in `src/ui/card.js`, by lobby slot), with
  the **first letter of their name inside the dot** and a short line showing which way they look. The dots **glide
  smoothly** (Lucas preferred smooth over once-a-second jumps).
- **The room you are in**: highlighted on the map (orange outline in the mockup), with its readable name at the top
  of the panel ("Lobby", not `foyer_zone`).
- **Rooms**: every room of the map, with the ones not opened yet greyed out (dashed in the mockup), so you can see
  where a closed door leads.
- **Closed doors and debris**: a lock tag with the price at each one still closed. Opened ones disappear.
- **Points of interest**: perk machines (labelled by perk), the Mystery Box where it is right now, Pack-a-Punch,
  and the power switch.
- **Floors**: on maps with several levels, the map shows the floor you are on and switches by itself when you
  change floors. Floor buttons at the top name the floors and show the letters of friends who are on another floor
  (builder's call; Lucas has seen this in the play-back and did not object).
- **Legend** under the map: each player's letter and name in their colour.

**Layout: option B from the mockup** (Lucas chose it). A large panel in the middle of the screen, in the cheat menu
card's style (`src/ui/styles.js` colours: dark background, `--accent` orange). The game stays visible around the
edges, so zombies coming are still noticed. The mockup: `.superpowers/brainstorm/805-1792449458/content/big-map-v2.html`
(local only, not committed).

**Behaviour:**

- **Nothing pauses**, for anyone, while the map is open (like the M cheat menu).
- **The map does not take the mouse** (builder's call). The game keeps its pointer lock, so you can walk, aim and
  shoot with the map open. Nothing on the map is clickable. This also avoids the pointer-unlock trick `hotkey.js`
  needs for M. N is caught before the game sees it, and typing an "n" into a text field is not caught (as M does).
- **Who sees it**: the host and every guest running the fork. A guest on the original extension sees no map, and
  nothing changes for them. Solo games have the map too.
- The map is available whenever the fork's game script is loaded (see "Constraints" for when that is).

## Non-goals

- **The small corner map** that moves with you. It comes later, as its own project. When it comes: north stays up,
  and your arrow turns.
- Teleporting, or any click-to-act on the map.
- Showing zombies, power-ups on the floor, or anything the three questions don't need.
- A picture-quality map. The game has no overview image; the map is a schematic drawn from the game's data.

## Anti-goals (it fails if...)

- Opening the map pauses the game, freezes your view, or makes you lose control for even a moment.
- The game runs noticeably worse with the map open on Lucas's gaming laptop.
- The map shows a door as closed after it was opened (or the other way round) for more than a moment, or puts a
  friend in the wrong room.
- It breaks co-op for anyone: a guest on the original extension, a host without the fork, or the cheat menu.
- It uses up the relay's free daily allowance noticeably faster for a guest who falls back to the relay (see
  "Constraints").

## Constraints

- **One mod.** Extend the existing game script (`src/cheats/gsc/_cheats.gsc`, or a sibling `.gsc` in the same mod
  folder written by `src/cheats/setup.js`), not a second mod. Fork code goes in `src/map/` (or `src/cheats/`), and
  upstream files get the smallest possible hooks, so `git merge upstream/main` stays easy (AGENTS.md).
- **The game script only runs on the host.** It sees every player and every door. Guests never load the mod
  (`wantsCheats` excludes guests). So the host's extension is the only one that can read the live data, and it must
  pass the data on to guests.
- **Reading the script's data** goes through the console: the script sets `cheats_*`-style dvars; the bridge sends
  the dvar's name and catches the `"name" is: "value^7"` print (`src/cheats/bridge.js`). One dvar value stays under
  about 400 characters; longer data is split into numbered chunks. Console commands go one per tick (50 ms) through
  `session.fun.queue`, shared with the cheat menu and Fun mode, so the map must not crowd them out.
- **Your own camera without the console**: `latestView()` in `src/game/page.js` gives the local player's camera
  position and angles (vel.gg's `window.five.views`) every frame, on host and guests alike. The host already sends
  its own view to guests as the `pos` control message.
- **Direct connections are coming** (`feat/direct-connection`, design in
  `docs/superpowers/specs/2026-10-20-direct-connection-design.md` on that branch, approved by Lucas). Every control
  message sent with `send()` goes straight between host and guest over a reliable WebRTC data channel while the
  direct link is up, and over the relay only for a guest whose direct link failed. Messages arriving either way carry
  the same `from` stamp, so the map's code doesn't need to know which path a message took. The map therefore sends
  its live data as ordinary control messages through `send()` and gets the direct path for free; it must not build a
  channel of its own. Whichever of the two branches merges second is rebased on the first (both touch
  `src/session/messages.js`).
- **The relay is only the fallback, but it still has limits.** For a guest on the relay (no direct link, or an older
  build), Cloudflare's free plan allows 100,000 Durable Object requests a day, 20 incoming WebSocket messages count
  as one request (`relay/src/usage.js`), and the per-socket rate limits are host 80 text messages a second, guest 20
  (`relay/src/room.js`). A text message is at most 4096 bytes on either path. So map messages stay small and are
  not sent every tick per player; positions a few times a second are enough, since the receiver glides between
  them. Sending more often while every guest is direct is the builder's call, but it must drop back when any guest
  is on the relay (the pump worker's per-seat path, once direct connections exist). The fork must never cause
  Cloudflare costs.
- **When the script is loaded:** today only when the cheat menu setting is on (the default) and the engine patch
  worked. The map needs the same script. The builder decides whether the map gets its own on/off setting (then the
  mod loads when either is on). Turning the cheat menu off must not silently take the map away without that being
  clear in the card.
- **New message types are safe.** The relay forwards any message type it doesn't use itself (`isPeerMessage` in
  `relay/src/protocol.js`), on upstream's relay and on a player's own. A guest on the original extension drops
  unknown types (the switch in `onGuestMessage`, `src/session/messages.js`).
- **Version mismatch.** A guest on an older fork version may get map messages it doesn't understand; it must
  ignore unknown messages, and an older host simply sends none (the guest then shows no map, or a short "the host
  needs the latest version for the map" note; builder's call).
- **All ten maps**: Nacht, Verrückt, Shi No Numa, Der Riese, Kino, Five, Ascension, Call of the Dead, Shangri-La,
  Moon (`MAP_SLUGS` in `src/game/page.js`), plus Hell mode where the map is the same.
- Checks per AGENTS.md: `npm run check` before every commit; real-game tests with Playwright; never weaken a test.

## How it works (decided so far)

**Static per map, live per moment** (from the brief, kept):

1. **Floor plans, made once and bundled.** For each map, a Playwright script (like `test/cheats-e2e.mjs`) loads
   the map, lets the game script dump what never changes: room outlines, room technical names, floor heights,
   door and debris positions with price and which rooms they join, and the fixed points of interest (perk
   machines, Pack-a-Punch, power switch, Mystery Box spots). The result is saved as JSON in the repo (e.g.
   `src/map/plans/<map>.json`) and bundled into the extension. Every player has it, so none of it travels during
   a game. Room outlines come from the game's own data (path nodes grouped by room, or the room volumes); which
   source works is the first thing the spike finds out.
2. **Readable room names**: a hand-written table per map (like `src/cheats/names.js`), with a readable fallback
   made from the technical name (`foyer_zone` → "Foyer").
3. **Live data from the host.** The game script publishes, a few times a second, every player's position, view
   direction and room, and, when they change, which doors are open, which rooms are open, and where the Mystery
   Box is. The host's extension reads it through the bridge and draws it.
4. **Live data to guests.** The host's extension sends the live data to guests as a new control message through
   `send()` (`src/net/pump.js`, handled in `src/session/messages.js`): over the direct link once that exists, over
   the relay otherwise. Rare changes
   (doors, box) are sent when they change and repeated now and then so a lost message heals; positions are sent a
   few times a second.
5. **Smooth dots.** Your own dot comes straight from your own camera (`latestView()`), every frame, on every
   machine. Other players' dots are drawn slightly in the past and glide between the positions received.
6. **Drawing.** A canvas or SVG overlay in the extension's own page layer (not inside the 312 px card),
   scaled to fit the map's floor. It is drawn only while open, so a closed map costs nothing.

## What the builder must verify early (a spike in the real game, before the full build)

On Kino, Five and Moon at least:

- That the game script can reach the rooms (`level.zones` and their volumes), tell which are open, and tell which
  room each player is in.
- That it can list closed doors and debris with price, notice when one opens, and find the rooms each one joins.
- Which source gives usable room shapes (path nodes, room volumes, or something else), how big that data is per
  map, and how long reading it out through the console takes.
- How floors can be told apart (by height) on Kino and Five.
- That a guest's extension receives the live data in co-op (host in one browser, guest in another: `test/e2e.mjs`
  with `CHEATS=1` / `GUEST_EXT=`), and that the dots glide.
- That an overlay redrawn every frame keeps the game smooth.

If a source turns out not to exist, come back to Lucas with what the map can show instead before building on.

## Left to the builder

- Exact message format, dvar names, how often each part is refreshed (within the relay and console limits above).
- Map styling details beyond the mockup: sizes, icons, how perk machines are labelled, how stairs and floors are
  drawn.
- Whether the floor plan is shown with north up or turned to fit the panel best (no rotation while playing).
- How the generated plans are checked (unit tests for the drawing and parsing; real-game runs per map).
- Release: version bump and fork release per AGENTS.md once Lucas has merged.
