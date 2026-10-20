# Direct Connections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Game packets and player control messages go straight between each guest and the host over WebRTC data
channels; the Cloudflare relay only introduces players and is the per-guest fallback.

**Architecture:** The page (content script, main world) owns one `RTCPeerConnection` per link and does the signaling
over the relay. Each link has two pre-negotiated data channels that are transferred to the pump worker right after
creation (verified on 2026-10-20 in installed Chrome 155 and Playwright's Chromium 156: `worker.postMessage(ch, [ch])`
works while the channel is still `connecting`, and the worker can send on it). The worker routes every packet and
control message per seat: direct while that seat's channels are open, relay otherwise. Presence becomes "relay says
present OR direct link open", so a game with direct links survives the relay going away.

**Tech Stack:** Plain ES modules bundled by esbuild (`scripts/build.mjs`), Web Worker + SharedArrayBuffer, WebRTC,
Playwright for end to end, `node:assert` unit tests run as scripts.

**Spec:** `docs/superpowers/specs/2026-10-20-direct-connection-design.md`

## Global Constraints

- The relay Worker (`relay/src/*`, `relay/wrangler*.jsonc`) is not changed and not redeployed.
- ICE servers exactly: `[{ urls: "stun:stun.cloudflare.com:3478" }, { urls: "stun:stun.l.google.com:19302" }]`. No TURN, nothing paid.
- Game channel: `createDataChannel("game", { negotiated: true, id: 1, ordered: false, maxRetransmits: 0 })`, `binaryType = "arraybuffer"`, one game packet per message, no batching.
- Control channel: `createDataChannel("control", { negotiated: true, id: 2 })` (reliable, ordered), JSON text, same shape as relay text frames, ≤ `MAX_TEXT_BYTES` (4096).
- Only the guest sends offers; the host answers. Signaling (`rtc-*`) always goes through the relay.
- Card strings in `src/ui/strings.js` in both `en` and `pt`.
- New code in new files under `src/net/`; every touched upstream file is listed in AGENTS.md at the end.
- Work in the worktree `~/Projects/bo1-direct`, branch `feat/direct-connection`. Commits as `lucas.g@live.dk`, end with the `Co-Authored-By` line. `npm run check` before every commit. Never weaken a test.

## Review Focus

- Windows PCs with many network adapters (Hyper-V, WSL, VPN) produce 10+ ICE candidates at once: they must arrive without tripping the relay's text limit (guest 20/s, burst 40). Pinned by `batchCandidates` tests in Task 1.
- The host reloads mid-game: the guest's old answer/candidates must not be applied to a new attempt, and the guest must fall back to the relay, then reconnect directly. Pinned by the attempt-number tests in Task 1 and the `DROP_DIRECT_S` run in Task 6.
- A friend on an older build never answers: that seat stays on the relay and the guest does not retry faster than the back-off. Pinned by `retryDelay` tests in Task 1.
- Malformed or oversized `rtc-*` messages (or an `rtc-offer` arriving at a guest) are dropped without throwing. Pinned in Task 1.
- A host broadcast while some guests are direct and others on the relay: each guest gets it exactly once, on its own path. Pinned in Task 2.

---

### Task 1: Signaling messages and retry timing (pure)

**Files:**
- Create: `src/net/rtc-messages.js`
- Create: `test/direct.test.mjs` (same runner style as `test/cheats.test.mjs`)
- Modify: `package.json` `check` script: append `&& node test/direct.test.mjs`

**Interfaces:**
- Produces:
  - `RTC_TYPES = ["rtc-offer", "rtc-answer", "rtc-ice"]`
  - `parseRtc(message, { role }) -> { t, n, sdp? , cands? } | null`. `role` is `"host"` or `"guest"`: a host accepts only `rtc-offer` and `rtc-ice` with a valid `from` seat (1..3, use `validSeat`); a guest accepts only `rtc-answer` and `rtc-ice`. `n`: integer 1..1e6 (attempt number). `sdp`: string, 1..3000 chars. `cands`: array of 1..8 `{ c: string ≤ 512, m: string ≤ 16 | null, i: integer 0..15 | null }`. Anything else returns `null`.
  - `batchCandidates(list) -> Array<Array<cand>>`: chunks of at most 8.
  - `CANDIDATE_FLUSH_MS = 250` (the page sends at most one `rtc-ice` per link per 250 ms).
  - `CONNECT_TIMEOUT_MS = 8000`.
  - `retryDelay(failures: number) -> ms`: `[5000, 15000, 30000][failures] ?? 60000`.

- [ ] **Step 1: Write the failing tests** in `test/direct.test.mjs`: `parseRtc` accepts a well-formed offer from seat 2 for the host and rejects it for a guest; rejects `sdp` of 3001 chars, `n` of 0 or 1.5, `cands` of 9 items, a candidate string of 513 chars, a missing `from` on the host side; accepts an answer for a guest without `from`. `batchCandidates` of 19 items gives lengths `[8, 8, 3]`. `retryDelay(0..5)` gives `[5000, 15000, 30000, 60000, 60000, 60000]`.
- [ ] **Step 2: Run** `node test/direct.test.mjs`. Expected: fails (module missing).
- [ ] **Step 3: Implement** `src/net/rtc-messages.js`.
- [ ] **Step 4: Run** `node test/direct.test.mjs`. Expected: all pass. Then `npm run check`. Expected: pass.
- [ ] **Step 5: Commit** `feat(direct): signaling message checks and retry timing`.

### Task 2: Per-seat routing (pure)

**Files:**
- Create: `src/net/routes.js`
- Test: `test/direct.test.mjs`

**Interfaces:**
- Produces:
  - `createRoutes() -> { links: Map<seat, { game, control }>, relaySeats: Set<number> }` (seat 0 is the host link on a guest).
  - `isDirect(routes, seat) -> boolean`: both channels exist and `readyState === "open"`.
  - `packetPath(routes, seat) -> "direct" | "relay"`.
  - `controlRoutes(routes, message, hosting) -> Array<{ via: "direct", seat } | { via: "relay", message }>`:
    - `rtc-*` types: always `[{ via: "relay", message }]`.
    - Guest: `[{ via: "direct", seat: 0 }]` when direct, else relay.
    - Host, `message.to` set: direct for that seat when direct, else relay with the message unchanged.
    - Host broadcast (no `to`): no direct seats → one relay entry with the message unchanged (today's behaviour). Otherwise one direct entry per direct seat, plus one relay entry `{ ...message, to: seat }` per seat in `relaySeats` that is not direct.
  - `relayPresence(routes, message)`: updates `relaySeats` from relay `welcome` (`guests` array) and `peer` (`seat`, `present`) messages on the host side.

- [ ] **Step 1: Write the failing tests** with fake channels `{ readyState: "open" }`: each `controlRoutes` case above, including "seat 1 direct, relaySeats {1,2,3}, broadcast → direct 1, relay to 2, relay to 3" and "a closed game channel makes the seat relay"; `relayPresence` adds on `peer present:true`, removes on `present:false`, replaces on `welcome`.
- [ ] **Step 2: Run** `node test/direct.test.mjs`. Expected: new tests fail.
- [ ] **Step 3: Implement** `src/net/routes.js`.
- [ ] **Step 4: Run** `node test/direct.test.mjs`, then `npm run check`. Expected: pass.
- [ ] **Step 5: Commit** `feat(direct): per-seat routing between direct links and the relay`.

### Task 3: Pump worker uses the routes

**Files:**
- Modify: `src/net/pump-worker.js`

**Interfaces:**
- Consumes: Task 2's `createRoutes`, `isDirect`, `packetPath`, `controlRoutes`, `relayPresence`.
- Produces (worker messages):
  - in: `{ type: "link", seat, game, control }` (channels transferred) → stored in `routes.links`; the worker sets `binaryType`, wires `onmessage`, and posts `{ type: "link", seat, open: true }` when both are open and `{ type: "link", seat, open: false }` when either closes or errors.
  - in: `{ type: "unlink", seat }` → closes and forgets that seat's channels (posts `open: false` if it was open).
  - in: `{ type: "relay-down" }` (test hook) → closes the relay socket and stops reconnecting, as after close code 4005.
  - out: `stats` gains `paths: { [seat]: "direct" | "relay" }`, `textOut`, `textIn` (relay text frames) and keeps `framesOut`/`framesIn` as relay binary frames only. Direct traffic counts in `packetsIn/Out` and `bytesIn/Out` as today.

- [ ] **Step 1: Route outgoing packets.** In `flush`/`pump`: items whose `packetPath` is `"direct"` are sent at once on that seat's game channel (guest: seat 0); only relay items go to `outbox` and the 4 ms batching.
- [ ] **Step 2: Accept incoming packets from game channels** into the same `inbox` with the link's seat (guest: 0), through the same `dropCommands` filter and `INBOX_LIMIT`.
- [ ] **Step 3: Route control.** `sendText(message)` uses `controlRoutes`; relay entries go to the socket as today. Control channel messages go through `parseControl`; on the host they get `from: seat` before the existing `onText` handling (ping/pong and forwarding to the page). Pings: the existing 2 s ping is sent through `sendText`, so each seat is pinged on its own path and `rtts` stays per seat.
- [ ] **Step 4: Track relay presence** by calling `relayPresence` in `onText` for relay frames; clear `relaySeats` when the relay socket closes.
- [ ] **Step 5: Run** `npm run check` and `node test/relay.test.mjs https://blackops.gundelach.pw`. Expected: both pass (no behaviour change without links).
- [ ] **Step 6: Commit** `feat(direct): pump worker sends over direct links when they are open`.

### Task 4: Page side: peer connections, signaling, presence

**Files:**
- Create: `src/net/direct.js`
- Modify: `src/net/pump.js` (forward worker `link` messages; export `postToPump(session, message, transfer)`)
- Modify: `src/session/messages.js` (rtc dispatch, presence), `src/session/session.js` (new fields; `onSocket` no longer clears presence itself), `src/main.js` (create and tick `session.direct`)
- Test: `test/direct.test.mjs`

**Interfaces:**
- Consumes: Task 1 (`parseRtc`, `batchCandidates`, `CANDIDATE_FLUSH_MS`, `CONNECT_TIMEOUT_MS`, `retryDelay`, `RTC_TYPES`), Task 3 worker messages.
- Produces:
  - `createDirect(session, { RTCPeerConnection = globalThis.RTCPeerConnection, now = Date.now } = {}) -> { onSignal(message), onLink(seat, open), tick(), drop(seat), state(seat) -> "direct" | "relay" | "connecting" }`. Disabled entirely (every seat reports `"relay"`, never offers or answers) when `globalThis.__bo1CoopDirect === false` (test hook set by e2e) or `RTCPeerConnection` is missing.
  - Session fields: `session.direct`, `session.links: Map<seat, "direct">` (seat 0 on a guest = the host), `session.relayGuests: Set<number>` (host), `session.relayPeer: boolean` (guest).
  - `syncPresence(session, seat)` in `src/session/messages.js` (host): `present = relayGuests.has(seat) || links.get(seat) === "direct"`; calls the existing `guestArrived` / `guestLeft` only on a change. Guest: `session.peer = relayPeer || links.get(0) === "direct"`; when it turns false, set `hostLeftAt` and clear `remotePause` as the `peer` case does today.
  - `relayClosed(session)` in `src/session/messages.js`: clears `relayGuests` / `relayPeer` and re-syncs presence; `src/net/pump.js` calls it when a `socket` message has `state !== "open"`, after `session.onSocket`.

Behaviour `createDirect` must have:
- Guest: when `session.relayPeer && validSeat(session.seat)` and no link is up or connecting and the retry time has come, start attempt `n + 1`: new `RTCPeerConnection` with the ICE servers from Global Constraints, create both channels, transfer them with `{ type: "link", seat: 0 }`, create the offer, send `{ t: "rtc-offer", n, sdp }` through `send()`. Gathered candidates are buffered and sent as `{ t: "rtc-ice", n, cands }` every `CANDIDATE_FLUSH_MS` using `batchCandidates`.
- Host: on a valid `rtc-offer` from seat `s`, close any link for `s` (`unlink`), create a new connection with the two channels (transfer with `{ type: "link", seat: s }`), apply the offer, answer with `{ t: "rtc-answer", n, sdp, to: s }`, send candidates the same way with `to: s`.
- Candidates and answers for an attempt other than the current `n` are ignored; candidates that arrive before the remote description are queued.
- Not open within `CONNECT_TIMEOUT_MS`, or `connectionState` becomes `failed`/`closed`, or the worker reports `open: false`: close the connection, `unlink`, set `links` for that seat to absent, `failures += 1`, and (guest) wait `retryDelay(failures)` before the next attempt. `failures` resets to 0 when a link opens.
- `onLink(seat, true)` sets `links.set(seat, "direct")` and calls `syncPresence`; `false` deletes it and calls `syncPresence`.

- [ ] **Step 1: Write the failing tests** with a fake `RTCPeerConnection` class (records `createDataChannel` calls and lets the test fire `onicecandidate` / `connectionstatechange`) and a fake pump that records `postMessage(message, transfer)`:
  - guest with `relayPeer` and seat 1 offers once, with channels `game` (negotiated id 1, `ordered: false`, `maxRetransmits: 0`) and `control` (negotiated id 2), and posts `{ type: "link", seat: 0 }` with both channels in the transfer list;
  - an `rtc-answer` with a stale `n` is ignored;
  - after a timeout (advance the fake clock past 8000 ms and call `tick()`), the guest unlinks and does not offer again before 5000 ms more;
  - `__bo1CoopDirect = false` → no offer, `state(0) === "relay"`;
  - host presence: relay `peer present:true` for seat 2 → present; `relayClosed` while `links` has seat 2 direct → still present; then `onLink(2, false)` → `guestLeft` (present false, `leftAt` set).
- [ ] **Step 2: Run** `node test/direct.test.mjs`. Expected: new tests fail.
- [ ] **Step 3: Implement** `src/net/direct.js`, the `pump.js` forwarding, and the presence changes: in `onHostMessage` the `welcome` / `peer` cases update `session.relayGuests` and call `syncPresence`; in `onGuestMessage` they update `session.relayPeer` and call `syncPresence`; `onControl` hands `RTC_TYPES` messages to `session.direct.onSignal` and returns. Remove the guest-clearing loop from `session.onSocket`.
- [ ] **Step 4: Wire** in `src/main.js`: `session.direct = createDirect(session)` right after `startPump`; call `session.direct.tick()` from `tick()` for host and guest.
- [ ] **Step 5: Run** `node test/direct.test.mjs`, then `npm run check`. Expected: pass.
- [ ] **Step 6: Commit** `feat(direct): peer connections, signaling over the relay, presence over either path`.

### Task 5: The card shows each friend's path

**Files:**
- Modify: `src/session/lobby.js` (`hostRoster` players get `path`), `src/ui/view.js` (`playerRows` passes `path`; `settingsSection` adds a Connection row), `src/ui/card.js` (render the path under the ping), `src/ui/styles.js`, `src/ui/strings.js`, `test/ui-preview.mjs` (sample rows with both paths)
- Test: `test/direct.test.mjs`

**Interfaces:**
- Consumes: `session.links`, `session.stats.paths` / `session.direct.state(seat)`.
- Produces: lobby player field `path: "direct" | "relay" | null` (null for the host row and free/absent seats); strings `connection` ("Connection" / "Conexão") and `path: { direct: "Direct" / "Direta", relay: "Relay" / "Relay", connecting: "Connecting…" / "Conectando…" }`.

- [ ] **Step 1: Write the failing test:** `hostRoster` with seat 1 present and direct, seat 2 present on the relay, seat 3 free gives `path` `["direct", "relay", null]` for players 2–4 and `null` for the host row (stub `pageScreen` inputs as the existing code allows, or test through a session object with `engine: null`).
- [ ] **Step 2: Run** it. Expected: fails.
- [ ] **Step 3: Implement.** Lobby rows show the path as a second small line under the ping (`.ping` already stacks with `display: grid`). Settings, when in a room: a `[T.connection, T.path[...]]` row; for a guest its own link, for a host `"<x> Direct, <y> Relay"` built from the strings.
- [ ] **Step 4: Run** `npm run check` and `npm run preview`; look at the preview screenshots for the lobby rows and settings. Expected: path visible, no overflow at the card's width.
- [ ] **Step 5: Commit** `feat(direct): show Direct or Relay for each player on the card`.

### Task 6: End to end in the real game, docs

**Files:**
- Modify: `test/e2e.mjs`, `AGENTS.md`
- Modify: `docs/superpowers/specs/2026-10-20-direct-connection-design.md` (a short "Result" section at the end)

**Interfaces:**
- Consumes: `globalThis.__bo1CoopDirect`, `session.direct.drop(seat)`, worker `{ type: "relay-down" }`, `stats.paths`, `stats.textOut/textIn/framesOut/framesIn`.
- Produces (e2e environment options, documented in the file header):
  - `NODIRECT=<i,j|all>`: those players' pages get `page.addInitScript(() => (globalThis.__bo1CoopDirect = false))`.
  - `DROP_DIRECT_S=<s>`: that many seconds into play, the first guest calls `window.__bo1Coop.direct.drop(0)`.
  - `RELAY_DOWN_S=<s>`: that many seconds into play, every player's pump gets `{ type: "relay-down" }`.
  - Status lines add each player's path(s); the final summary prints per player `relay bin out/in` and `relay text out/in`.

- [ ] **Step 1: Add the options** above to `test/e2e.mjs`.
- [ ] **Step 2: Run** (with `npm run relay:dev` in the background, `LITE=1`, map `kino`, `SOAK=120`):
  1. `node test/e2e.mjs 2 kino` → guest path `direct`, game runs.
  2. `node test/e2e.mjs 4 kino` → all three guests `direct`.
  3. `NODIRECT=2 node test/e2e.mjs 3 kino` → player 2 `relay`, player 3 `direct`, game runs.
  4. `DROP_DIRECT_S=30 node test/e2e.mjs 2 kino` → guest goes `relay` without a reload, and back to `direct` within ~20 s.
  5. `RELAY_DOWN_S=30 node test/e2e.mjs 3 kino` → nobody drops, game keeps running to the end of the soak.
  6. `NODIRECT=all node test/e2e.mjs 2 kino` → the relay-only baseline for the message counts.
  Expected: each run ends without errors; write the per-run relay counts down.
- [ ] **Step 3: Docs.** AGENTS.md: a "Direct connections in one paragraph" section in the style of the cheat-menu one (page owns the connections, channels transferred to the pump worker, routing per seat, presence rule, test hooks), the new checks (`node test/direct.test.mjs`, the e2e options), and the upstream files list extended with `src/net/pump-worker.js`, `src/net/pump.js`, `src/session/messages.js`, `src/session/session.js`, `src/session/lobby.js`, `src/ui/card.js`, `src/ui/styles.js`, `src/ui/strings.js`, `test/e2e.mjs`. Spec "Result": the bridge used (transfer), the measured relay counts from Step 2 (direct vs `NODIRECT=all`), and the direct vs relay ping seen.
- [ ] **Step 4: Run** `npm run check` and `node test/relay.test.mjs https://blackops.gundelach.pw`. Expected: pass.
- [ ] **Step 5: Commit** `test(direct): end-to-end runs for direct, fallback, drop and relay loss; docs`, push, open the PR on `lucas-gundehug/bo1-zombies-coop` (pass `--repo`, the checkout has an `upstream` remote).
