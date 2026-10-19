# Direct connections between players (design)

Date: 2026-10-20. Branch: `feat/direct-connection`. Status: approved by Lucas in conversation; this document is the
written form.

## Why

Lucas plays with up to three friends, all in Denmark, all running this fork. Today every game packet travels
browser → Cloudflare relay (`https://blackops.gundelach.pw`) → browser over a WebSocket. Two problems come from that:

1. **Hitches.** A WebSocket is TCP: one lost packet holds back every packet behind it until it is resent. The game's
   netcode was written for UDP, where a late packet is simply skipped and the next snapshot replaces it. Under loss
   this shows as stutter and rubber-banding.
2. **The free daily allowance.** The relay runs on the Workers Free plan (100,000 requests a day). On 2026-10-19 one
   evening used 46,018. Game packets are almost all of that.

vel.gg's own co-op already does what this design describes: a WebRTC data channel created with
`{ ordered: false, maxRetransmits: 0 }` (vel.gg/bsz/net.js), falling back to a relay.

## Goal

Game packets go straight between each guest and the host over a WebRTC data channel that behaves like UDP
(unordered, no retransmits). Player-to-player control messages (info, state, pause, lobby, pos, ping/pong, and the
cheat menu's if any) also go direct, over a second, reliable and ordered data channel, as vel.gg's `control` channel
does. The relay stays, and does three things only:

- lets players find each other (signaling: the WebRTC offer/answer and ICE candidates travel through it) and tells
  them who is in the room (its own `welcome` / `peer` / `error` messages);
- carries control messages and game packets for any guest whose direct link is not up (fallback);
- keeps its socket open for the whole session, so the fallback is instant.

Why control goes direct too (Claude's call, after the builder check): the host sends `pos` every 50 ms tick
(`hostTick`, `TICK_MS = 50`), and with `state`, `lobby` and pings that is about 25 relay messages a second for the
whole evening, roughly 10–15% of today's usage. Moving them onto the direct link takes the relay down to signaling and
keep-alive pings.

Success, as Lucas would notice it: fewer hitches in a normal evening, the card shows each friend as "Direct", and the
relay's `/usage` count for an evening drops to a small fraction of today's.

## Non-goals

- No change to the relay Worker. It already forwards any message type it does not use itself
  (`isPeerMessage`, `relay/src/protocol.js`), and `from`/`to` stamping already routes host ↔ one guest. If the build
  finds a relay change is truly needed, stop and ask Lucas before deploying (production; see AGENTS.md "Lucas's
  relay").
- No TURN server and nothing paid. ICE uses a free public STUN server only (`stun:stun.cloudflare.com:3478`; Google's
  `stun:stun.l.google.com:19302` as a second entry is fine). When STUN is not enough, the relay is the fallback.
- No guest-to-guest links. Topology stays a star: each guest ↔ host, as the relay does now.
- No frame-rate work (that is a separate project: the performance slider).

## Anti-goals (a failure even if it "works")

- **A game that fails to start or join because a direct link failed.** Fallback must be automatic, per guest, and
  must not delay the join noticeably.
- **A worse game for a guest whose direct link flaps.** Switching path must not lose the session or need a reload.
- **Anything that costs money** or touches Cloudflare settings beyond the existing Worker.
- **Bigger upstream merges than necessary.** Keep the new code in new files under `src/net/`; touch upstream files
  only where wiring requires it, and add every touched upstream file to the list in AGENTS.md.

## Decided

- **Automatic per-guest fallback (Lucas: yes).** Each guest's link is independent: two friends can be direct while a
  third uses the relay. The relay path stays connected the whole session regardless (it carries control messages and
  is the instant fallback).
- **The card shows the path (Lucas: yes, show it).** Wherever the card shows a friend's ping today (the lobby player
  list, `src/ui/view.js` around the `ping` field, and the host's details), it also shows "Direct" or "Relay" for that
  friend. A guest sees its own path next to its ping. Strings go in `src/ui/strings.js` in both `en` and `pt`, like the
  others.
- **Nothing paid (Lucas: yes).** See non-goals.
- **IP addresses.** A direct link lets players' browsers see each other's public IP address. Lucas was told and
  accepted it. Do not add a setting for it.
- **Compatibility with an older build on the other side.** A peer that does not answer the WebRTC offer is treated as
  "direct failed" and uses the relay, exactly as today. Old builds ignore unknown control message types
  (`onGuestMessage` / `onHostMessage` switches), so nothing breaks.
- **Invites, the cheat menu, Fun mode and the rest of the card are unchanged.**
- **A game survives the relay going away (Claude's call).** Today a closed relay socket marks every guest as gone
  (`session.onSocket` in `src/session/session.js`), the host drops them after 15 s and a guest gives up after 10 s. With
  this change, a guest whose direct link is open stays present while the relay is down, including when the relay
  refuses connections for the rest of the day (close code 4005, daily allowance used up). Only guests that depend on
  the relay (no direct link) are treated as gone, as today. New players cannot join while the relay is down; the card
  says so as it does now.
- **Keep the packet path off vel.gg's main thread where possible (Claude's call).** See change 2 for the order of
  preference and the shipping rule.

## How it fits the current code

What exists (read before planning):

- `src/net/pump-worker.js`: a Worker that polls the engine's loopback queues (SharedArrayBuffer, `src/net/queues.js`)
  every ~1 ms, batches packets to the relay every 4 ms, and writes received packets into the engine. The host has one
  reader per guest seat and one writer (inbound queue, each packet stamped with the sender seat's loopback port); a
  guest has one reader and one writer. RTT comes from ping/pong over the relay every 2 s.
- `src/net/pump.js`: page side; starts the worker, forwards control messages to the session.
- `src/session/host.js` / `guest.js`: post `attach` to the worker with the queue addresses and seat → port map.
- The content script runs in the page's main world (`extension/manifest.json`, `"world": "MAIN"`) on vel.gg.
- Packets are at most `MAX_PACKET_BYTES` (1264).

What changes:

1. **One `RTCPeerConnection` per guest seat on the host, one on each guest**, each with one unordered,
   no-retransmit data channel for game packets (binary, one game packet per message, no batching: there is no
   per-message cost to save on a direct link). The guest starts the offer once it has a seat and the host is present
   (it already does an "introduce" step there); the host answers. Signaling messages are new control types (for
   example `rtc-offer`, `rtc-answer`, `rtc-ice`), sent through the existing `send()` path.
2. **Where the data channel lives.** `RTCPeerConnection` is a page API, while the packets live in the worker. Moving
   the packet path onto vel.gg's busy main thread is what the worker exists to avoid. Order of preference (check what
   the installed Chrome actually supports, do not assume):
   1. transfer the `RTCDataChannel` to the pump worker, if Chrome supports it;
   2. otherwise hold the `RTCPeerConnection` in a hidden iframe served from the extension's own origin
      (`web_accessible_resources` in `extension/manifest.json`), which gets its own thread, connected to the pump
      worker by a `MessagePort`. Allowed, including the manifest change; first check that vel.gg's page does not block
      the frame;
   3. last resort: the page's main thread, forwarding through a `MessageChannel`.

   Shipping rule: measure the extra one-way delay the bridge adds (median and 95th percentile, with the game running)
   and write it down in the PR. Option 3 ships only if its 95th percentile stays under 10 ms; otherwise report back
   before going further.
3. **Per-seat path choice in the worker.** For each seat (host side) or for the single host link (guest side): send
   game packets and control messages over the data channels while they are open, otherwise over the relay as today.
   Accept from both paths at all times (so a switch never drops what is in flight). The host's inbound stamping by
   seat → port is the same for both paths. Messages that arrive over a direct channel get the same `from: <seat>`
   stamp the relay adds today, so `src/session/messages.js` does not need to know which path a message took.
   Presence (`peer`, `guest.present`) becomes "relay says present OR direct link open".
4. **Fallback timing and recovery.** If the direct link is not open within a few seconds of the guest's introduction,
   that guest uses the relay. If an open link closes or fails mid-game, switch that seat to the relay immediately, then
   try to re-establish the direct link in the background; switch back when it opens. Exact timeouts and retry limits
   are the builder's call; joining must never wait on WebRTC.
5. **RTT and stats.** Measure ping on the path in use (ping/pong over the data channel when direct), keep the
   per-seat RTT the card shows, and add the path per seat to the stats the worker posts.
6. **The card** shows the path as described under "Decided".

## Testing (what "done" means)

- `npm run check` passes (lint, build, unit tests, engine patch tests).
- Unit tests for the new logic that does not need a browser: path choice per seat, fallback and recovery state
  transitions, signaling message validation (reject malformed or oversized messages; only accept them from the expected
  peer).
- `node test/relay.test.mjs https://blackops.gundelach.pw` still passes (proves the relay is unchanged).
- `test/e2e.mjs` (real game, Playwright, local relay via `npm run relay:dev`):
  - 2 and 4 players with direct links: every guest reports "Direct", players move and the game runs as today.
  - Forced fallback: a test-only way to make the direct link fail for one guest (for example a URL parameter that
    makes that guest skip WebRTC); that guest reports "Relay", the others "Direct", and the game runs.
  - A direct link closed mid-game: that guest continues on the relay without a reload.
  - The relay stopped mid-game with all links direct (stop `relay:dev`): the game keeps running, nobody is dropped.
  - Count relay messages (binary and text) in each run and report them next to a relay-only run of the same length,
    to show that direct guests no longer send game packets or control messages through the relay.
- After the build, a short note in AGENTS.md describing the direct path in a paragraph, like the cheat-menu one, and
  the updated list of upstream files the fork touches.

## Left to the builder

- Which bridge from change 2 is used, within its order of preference and shipping rule.
- Timeouts, retry back-off, and how many recovery attempts.
- Trickle ICE or one complete offer: either is fine; respect the relay's text rate limits (guest 20/s, burst 40) and
  `MAX_TEXT_BYTES` (4096).
- File layout under `src/net/`, message type names, and how the e2e test forces fallback.
- Release: this is a feature release of the fork (bump the fourth version part, as in AGENTS.md "Release") once Lucas
  has merged it. All players need the new build to get direct links; older builds keep working over the relay.
