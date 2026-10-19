// The packet pump. Runs in a Worker so it keeps going at a steady pace even when the page's main thread is busy
// rendering: it polls the engine's loopback queues every millisecond, batches what it finds to the relay, and writes
// what the relay delivers back into the engine.
//
// Direct links (fork): the page hands over each link's two WebRTC data channels ("link"); while both are open, that
// seat's game packets and control messages go over them instead of the relay (src/net/routes.js).
//
// Host: one reader per guest seat (what the server sends that guest) and one writer (the shared inbound queue, each
// packet stamped with its sender's port). Guest: one reader (its client's outgoing queue) and one writer (its client's
// incoming queue, port 0).
import { decodePackets, decodeSeatPackets, encodePackets, encodeSeatPackets, MAX_BINARY_BYTES, parseControl, relaySocketUrl } from "../../relay/src/protocol.js";
import { connectionlessCommand, QueueReader, QueueWriter } from "./queues.js";
import { controlRoutes, createRoutes, isDirect, packetPath, relayPresence } from "./routes.js";

const POLL_MS = 1;
const FLUSH_MS = 4;
const INBOX_LIMIT = 512;
const PING_MS = 2000;
// A direct game channel with this much still unsent is not keeping up: drop packets rather than queue them up.
const DIRECT_BUFFER_LIMIT = 256 * 1024;

const state = {
  role: null,
  url: null,
  socket: null,
  closed: false,
  retries: 0,
  readers: [],
  writer: null,
  ports: {},
  reading: false,
  injecting: false,
  dropUntilConnect: false,
  dropCommands: [],
  inbox: [],
  outbox: [],
  lastFlush: 0,
  looping: false,
  relayDown: false,
  routes: createRoutes(),
  // framesOut/In and textOut/In count relay frames only; packets and bytes count both paths.
  stats: { packetsOut: 0, packetsIn: 0, bytesOut: 0, bytesIn: 0, framesOut: 0, framesIn: 0, textOut: 0, textIn: 0, dropped: 0, lost: 0, rtt: null, rtts: {}, paths: {} },
};
const hosting = () => state.role === "host";
const post = (message) => self.postMessage(message);

self.onmessage = ({ data: message }) => {
  switch (message.type) {
    case "connect":
      state.role = message.role;
      state.url = relaySocketUrl(message.relay, message.room, message.role, message.guestId);
      open();
      loop();
      break;
    case "attach":
      state.readers = message.reads.map(({ seat, base }) => ({ seat, queue: new QueueReader(message.buffer, message.loopback, base, { consume: true }) }));
      state.writer = new QueueWriter(message.buffer, message.loopback, message.writeBase);
      state.ports = message.ports;
      state.reading = Boolean(message.reading);
      state.injecting = Boolean(message.injecting);
      state.dropCommands = message.dropCommands ?? [];
      break;
    case "read":
      for (const { queue } of state.readers) queue.skip();
      state.dropUntilConnect = Boolean(message.dropUntilConnect);
      state.reading = true;
      break;
    case "inject":
      state.injecting = Boolean(message.on);
      if (message.clearInbox) state.inbox.length = 0;
      break;
    case "send":
      sendText(message.message);
      break;
    case "link":
      addLink(message.seat, message.game, message.control);
      break;
    case "unlink":
      removeLink(message.seat);
      break;
    case "relay-down":
      // Test hook (test/e2e.mjs RELAY_DOWN_S): behave as if the relay were gone for the rest of the day.
      state.relayDown = true;
      try {
        state.socket?.close(1000, "relay-down");
      } catch {
        // already closed
      }
      break;
    case "close":
      state.closed = true;
      try {
        state.socket?.close(1000, "bye");
      } catch {
        // already closed
      }
      break;
  }
};

function open() {
  if (state.closed || state.relayDown) return;
  let socket;
  try {
    socket = new WebSocket(state.url);
  } catch (error) {
    post({ type: "socket", state: "error", reason: String(error?.message ?? error) });
    retry();
    return;
  }
  socket.binaryType = "arraybuffer";
  state.socket = socket;
  post({ type: "socket", state: "connecting" });
  socket.onopen = () => {
    state.retries = 0;
    post({ type: "socket", state: "open" });
  };
  socket.onmessage = ({ data }) => (typeof data === "string" ? onText(data) : onBinary(data));
  socket.onclose = (event) => {
    if (state.socket === socket) state.socket = null;
    state.routes.relaySeats.clear();
    post({ type: "socket", state: "closed", code: event.code, reason: event.reason });
    // 4001: another tab took this seat; 4004: the room is full. Retrying would not help either.
    if (event.code === 4001 || event.code === 4004) state.closed = true;
    // 4005: the relay is out of its daily allowance; check again now and then instead of hammering it.
    else if (event.code === 4005) setTimeout(open, 60000);
    else retry();
  };
  socket.onerror = () => {};
}

function retry() {
  if (state.closed || state.relayDown) return;
  setTimeout(open, Math.min(5000, 250 * 2 ** state.retries));
  state.retries += 1;
}

function onBinary(data) {
  const items = hosting() ? decodeSeatPackets(data) : decodePackets(data)?.map((packet) => ({ seat: 0, packet }));
  if (!items) return;
  state.stats.framesIn += 1;
  receive(items);
}

/** Game packets from either path, into the inbox the engine is fed from. */
function receive(items) {
  for (const item of items) {
    state.stats.packetsIn += 1;
    state.stats.bytesIn += item.packet.byteLength;
    const command = connectionlessCommand(item.packet);
    if (command && state.dropCommands.includes(command)) continue;
    state.inbox.push(item);
  }
  if (state.inbox.length > INBOX_LIMIT) {
    state.stats.dropped += state.inbox.length - INBOX_LIMIT;
    state.inbox.splice(0, state.inbox.length - INBOX_LIMIT);
  }
  pump();
}

function onText(text) {
  state.stats.textIn += 1;
  const message = parseControl(text);
  if (!message) return;
  if (hosting()) relayPresence(state.routes, message);
  onControl(message);
}

/** A control message from the relay or a direct link (stamped with its seat like the relay does). */
function onControl(message) {
  if (message.t === "ping") {
    sendText(hosting() ? { t: "pong", ts: message.ts, to: message.from } : { t: "pong", ts: message.ts });
  } else if (message.t === "pong") {
    if (typeof message.ts !== "number") return;
    const rtt = Math.max(0, performance.now() - message.ts);
    if (hosting()) {
      // The host pings all guests at once: keep one round-trip time per seat, plus the slowest.
      if (Number.isInteger(message.from)) state.stats.rtts[message.from] = rtt;
      state.stats.rtt = Math.max(0, ...Object.values(state.stats.rtts));
    } else {
      state.stats.rtt = rtt;
    }
  } else {
    post({ type: "control", message });
  }
}

function sendText(message) {
  let sent = false;
  for (const route of controlRoutes(state.routes, message, hosting())) {
    if (route.via === "direct") {
      try {
        state.routes.links.get(route.seat).control.send(JSON.stringify(message));
        sent = true;
      } catch {
        // the channel closed under us; its onclose moves the seat back to the relay
      }
    } else if (state.socket?.readyState === WebSocket.OPEN) {
      state.socket.send(JSON.stringify(route.message));
      state.stats.textOut += 1;
      sent = true;
    }
  }
  return sent;
}

function sendDirect(seat, packet) {
  const channel = state.routes.links.get(seat).game;
  if (channel.bufferedAmount > DIRECT_BUFFER_LIMIT) {
    state.stats.dropped += 1;
    return;
  }
  try {
    channel.send(packet);
    state.stats.packetsOut += 1;
    state.stats.bytesOut += packet.byteLength;
  } catch {
    state.stats.dropped += 1;
  }
}

/** Takes over a link's data channels (transferred by the page) and reports when the link opens and closes. */
function addLink(seat, game, control) {
  removeLink(seat);
  const link = { game, control, reported: false };
  state.routes.links.set(seat, link);
  game.binaryType = "arraybuffer";
  const opened = () => {
    if (state.routes.links.get(seat) !== link || link.reported || !isDirect(state.routes, seat)) return;
    link.reported = true;
    post({ type: "link", seat, open: true });
  };
  const closed = () => {
    if (state.routes.links.get(seat) === link) removeLink(seat);
  };
  for (const channel of [game, control]) {
    channel.onopen = opened;
    channel.onclose = closed;
    channel.onerror = closed;
  }
  game.onmessage = ({ data }) => {
    if (!(data instanceof ArrayBuffer)) return;
    receive([{ seat, packet: new Uint8Array(data) }]);
    pump();
  };
  control.onmessage = ({ data }) => {
    const message = typeof data === "string" ? parseControl(data) : null;
    if (!message) return;
    if (hosting()) message.from = seat;
    onControl(message);
  };
  opened();
}

function removeLink(seat) {
  const link = state.routes.links.get(seat);
  if (!link) return;
  state.routes.links.delete(seat);
  for (const channel of [link.game, link.control]) {
    channel.onopen = channel.onclose = channel.onerror = channel.onmessage = null;
    try {
      channel.close();
    } catch {
      // already closed
    }
  }
  if (link.reported) post({ type: "link", seat, open: false });
}

/** seat -> "direct" | "relay" for the stats (a guest has the one link to the host, seat 0). */
function paths() {
  const seats = hosting() ? new Set([...state.routes.links.keys(), ...state.routes.relaySeats]) : [0];
  return Object.fromEntries([...seats].map((seat) => [seat, packetPath(state.routes, seat)]));
}

function flush(now) {
  if (!state.outbox.length) return;
  const socket = state.socket;
  if (socket?.readyState !== WebSocket.OPEN) {
    state.stats.dropped += state.outbox.length;
  } else {
    const seats = hosting();
    const perPacket = seats ? 3 : 2;
    let batch = [];
    let size = 4;
    const send = () => {
      if (!batch.length) return;
      socket.send(seats ? encodeSeatPackets(batch) : encodePackets(batch.map((item) => item.packet)));
      state.stats.framesOut += 1;
      batch = [];
      size = 4;
    };
    for (const item of state.outbox) {
      const bytes = perPacket + item.packet.byteLength;
      if (size + bytes > MAX_BINARY_BYTES) send();
      batch.push(item);
      size += bytes;
      state.stats.packetsOut += 1;
      state.stats.bytesOut += item.packet.byteLength;
    }
    send();
  }
  state.outbox.length = 0;
  state.lastFlush = now;
}

function pump() {
  const now = performance.now();
  if (state.reading) {
    let lost = 0;
    for (const { seat, queue } of state.readers) {
      let packets = queue.poll([]);
      lost += queue.lost;
      // A guest's client chats with its own local server until it connects to the host: skip all of that.
      if (state.dropUntilConnect && packets.length) {
        const first = packets.findIndex((packet) => connectionlessCommand(packet) === "connect");
        packets = first < 0 ? [] : packets.slice(first);
        if (first >= 0) state.dropUntilConnect = false;
      }
      for (const packet of packets) {
        if (packetPath(state.routes, seat) === "direct") sendDirect(seat, packet);
        else state.outbox.push({ seat, packet });
      }
    }
    state.stats.lost = lost;
  }
  if (state.outbox.length && now - state.lastFlush >= FLUSH_MS) flush(now);
  if (state.writer && state.injecting) {
    while (state.inbox.length && state.writer.push(state.inbox[0].packet, state.ports[state.inbox[0].seat] ?? 0)) state.inbox.shift();
  }
}

async function loop() {
  if (state.looping) return;
  state.looping = true;
  const tick = new Int32Array(new SharedArrayBuffer(4));
  let lastPing = 0;
  let lastStats = 0;
  while (!state.closed) {
    pump();
    const now = performance.now();
    if (now - lastPing >= PING_MS) {
      lastPing = now;
      sendText({ t: "ping", ts: now });
    }
    if (now - lastStats >= 1000) {
      lastStats = now;
      post({ type: "stats", stats: { ...state.stats, rtts: { ...state.stats.rtts }, paths: paths(), inbox: state.inbox.length } });
    }
    // Atomics.waitAsync gives ~1 ms sleeps where setTimeout would be clamped.
    const wait = Atomics.waitAsync ? Atomics.waitAsync(tick, 0, 0, POLL_MS) : null;
    if (wait?.async) await wait.value;
    else await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}
