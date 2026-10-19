// Talks to the game script (src/cheats/gsc/_cheats.gsc) through the engine console. Commands go out as
// `set cheats_cmd "<seq> <action> <target> [arg]"`; what the script publishes in cheats_* dvars is read back by sending a
// dvar's name, which makes the engine print `"name" is: "value^7" default: ...` to the console (src/fun/fun.js
// watchConsole hands those lines to onCheatsLine).

const STATE_EVERY_MS = 1000;
const RESULT_EVERY_MS = 500;
const SEND_EVERY_MS = 250;
const RESULT_WAIT_MS = 30000;
const SAFE = /^[\w.-]+$/;

export function createBridge() {
  return {
    ready: false,
    round: 0,
    frozen: false,
    power: false,
    horde: false,
    weapons: [],
    perks: [],
    powerups: [],
    seq: 0,
    outbox: [], // command texts not sent yet
    sent: new Map(), // seq -> { action, target, arg } waiting for a result
    lastSeq: 0, // latest seq sent
    resultSeq: 0, // latest seq a result was reported for
    resultUntil: 0,
    scriptLists: 0, // the lists counter the script published last
    listsLoaded: 0, // the lists counter the lists were last asked for
    weaponChunks: null,
    lastStateAt: -Infinity,
    lastResultAt: -Infinity,
    lastSendAt: -Infinity,
    onResult: null,
  };
}

export function parseDvarPrint(line) {
  const match = String(line).match(/^"(cheats_\w+)" is: "(.*?)\^7"/);
  return match ? { name: match[1], value: match[2] } : null;
}

export function parseState(value) {
  const raw = Object.fromEntries(
    String(value)
      .split(" ")
      .filter((pair) => pair.includes("="))
      .map((pair) => pair.split("=")),
  );
  const n = (key) => Number(raw[key]) || 0;
  return { ready: raw.ready === "1", seq: n("seq"), round: n("round"), frozen: raw.frozen === "1", power: raw.power === "1", horde: raw.horde === "1", lists: n("lists") };
}

export function cheatCommand(seq, action, target, arg) {
  const parts = [seq, action, target, arg].filter((part) => part != null && part !== "").map(String);
  for (const part of parts) if (!SAFE.test(part)) throw new Error(`unsafe cheat argument: ${part}`);
  return `set cheats_cmd "${parts.join(" ")}"`;
}

/** Queues a command for the game script. `target` is a client number or "all". */
export function sendCheat(session, action, target, arg) {
  const cheats = session.cheats;
  cheats.seq += 1;
  cheats.outbox.push(cheatCommand(cheats.seq, action, target, arg));
  cheats.sent.set(cheats.seq, { action, target, arg });
}

function ask(session, name) {
  if (!session.fun.queue.includes(name)) session.fun.queue.push(name);
}

/** Called every tick: asks for the state and the lists, sends queued commands, asks for results. */
export function cheatsTick(session, now, playing) {
  const cheats = session.cheats;
  if (!cheats?.ok || !playing) return;
  if (now - cheats.lastStateAt >= STATE_EVERY_MS) {
    cheats.lastStateAt = now;
    ask(session, "cheats_state");
  }
  if (cheats.scriptLists > cheats.listsLoaded) {
    cheats.listsLoaded = cheats.scriptLists;
    for (const name of ["cheats_weapons_count", "cheats_perks", "cheats_powerups"]) ask(session, name);
  }
  if (cheats.outbox.length && now - cheats.lastSendAt >= SEND_EVERY_MS) {
    cheats.lastSendAt = now;
    const text = cheats.outbox.shift();
    session.fun.queue.push(text);
    cheats.lastSeq = Number(text.match(/"(\d+)/)[1]);
    cheats.resultUntil = now + RESULT_WAIT_MS;
  }
  if (cheats.resultSeq < cheats.lastSeq && now < cheats.resultUntil && now - cheats.lastResultAt >= RESULT_EVERY_MS) {
    cheats.lastResultAt = now;
    ask(session, "cheats_result");
  }
}

/** Takes one console line; the ones answering for a cheats_* dvar update the state. */
export function onCheatsLine(session, line) {
  const print = parseDvarPrint(line);
  const cheats = session.cheats;
  if (!print || !cheats) return;
  const { name, value } = print;
  const list = () => value.split(",").filter(Boolean);
  if (name === "cheats_state") {
    const state = parseState(value);
    Object.assign(cheats, { ready: state.ready, round: state.round, frozen: state.frozen, power: state.power, horde: state.horde, scriptLists: state.lists });
  } else if (name === "cheats_weapons_count") {
    const count = Number(value) || 0;
    cheats.weaponChunks = new Array(count).fill(null);
    for (let i = 0; i < count; i += 1) ask(session, `cheats_weapons_${i}`);
  } else if (name.startsWith("cheats_weapons_")) {
    const i = Number(name.slice("cheats_weapons_".length));
    if (!cheats.weaponChunks || !(i >= 0 && i < cheats.weaponChunks.length)) return;
    cheats.weaponChunks[i] = list();
    if (cheats.weaponChunks.every(Boolean)) cheats.weapons = cheats.weaponChunks.flat();
  } else if (name === "cheats_perks") {
    cheats.perks = list();
  } else if (name === "cheats_powerups") {
    cheats.powerups = list();
  } else if (name === "cheats_result") {
    const [seqText, status, code = "", ...rest] = value.split(" ");
    const seq = Number(seqText);
    if (!(seq > cheats.resultSeq)) return;
    cheats.resultSeq = seq;
    const sent = cheats.sent.get(seq);
    for (const old of cheats.sent.keys()) if (old <= seq) cheats.sent.delete(old);
    if (sent) cheats.onResult?.({ seq, ok: status === "ok", code, detail: rest.join(" ") }, sent);
  }
}
