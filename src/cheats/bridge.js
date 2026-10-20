// Talks to the game script (src/cheats/gsc/_cheats.gsc) through the engine console. Commands go out as
// `set cheats_cmd "<seq> <action> <target> [arg]"`; what the script publishes in cheats_* dvars is read back by sending a
// dvar's name, which makes the engine print `"name" is: "value^7" default: ...` to the console (src/fun/fun.js
// watchConsole hands those lines to onCheatsLine). The map's cheats_map_* dvars go on to src/map/live.js.
import { onMapLine } from "../map/live.js";

const STATE_EVERY_MS = 1000;
const STATE_BUSY_MS = 250; // while a command waits to be sent or taken
const RESULT_EVERY_MS = 500;
const SEND_EVERY_MS = 250;
const RESULT_WAIT_MS = 120000; // a perk for everyone can take half a minute per player
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
    health: {}, // slot -> health level in %, as the game confirmed it (100 when not set)
    seq: 0,
    outbox: [], // [seq, command text] not sent yet
    sent: new Map(), // seq -> { action, target, arg, until } waiting for a result
    lastSeq: 0, // latest seq sent
    scriptSeq: 0, // latest seq the script has taken (cheats_state seq=)
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
  cheats.outbox.push([cheats.seq, cheatCommand(cheats.seq, action, target, arg)]);
  cheats.sent.set(cheats.seq, { action, target, arg, until: Infinity });
}

/** Asks the engine to print a dvar (once: a name already waiting in the queue is not added again). */
export function askDvar(session, name) {
  if (!session.fun.queue.includes(name)) session.fun.queue.push(name);
}

/**
 * Called every tick: asks for the state and the lists, sends queued commands, asks for results. A command is sent only
 * once the script has taken the previous one (cheats_state seq=): a second `set cheats_cmd` before that would overwrite
 * the first, e.g. while the server is paused.
 */
export function cheatsTick(session, now, playing) {
  const cheats = session.cheats;
  if (!cheats?.ok || !playing) return;
  const busy = cheats.outbox.length > 0 || cheats.scriptSeq < cheats.lastSeq;
  if (now - cheats.lastStateAt >= (busy ? STATE_BUSY_MS : STATE_EVERY_MS)) {
    cheats.lastStateAt = now;
    askDvar(session, "cheats_state");
  }
  if (cheats.scriptLists > cheats.listsLoaded) {
    cheats.listsLoaded = cheats.scriptLists;
    for (const name of ["cheats_weapons_count", "cheats_perks", "cheats_powerups"]) askDvar(session, name);
  }
  if (cheats.outbox.length && cheats.scriptSeq >= cheats.lastSeq && now - cheats.lastSendAt >= SEND_EVERY_MS) {
    cheats.lastSendAt = now;
    const [seq, text] = cheats.outbox.shift();
    session.fun.queue.push(text);
    cheats.lastSeq = seq;
    const sent = cheats.sent.get(seq);
    if (sent) sent.until = now + RESULT_WAIT_MS;
  }
  for (const [seq, sent] of cheats.sent) if (now > sent.until) cheats.sent.delete(seq);
  const waiting = [...cheats.sent.keys()].some((seq) => seq <= cheats.lastSeq);
  if (waiting && now - cheats.lastResultAt >= RESULT_EVERY_MS) {
    cheats.lastResultAt = now;
    askDvar(session, "cheats_results");
  }
}

/** Takes one console line; the ones answering for a cheats_* dvar update the state. */
export function onCheatsLine(session, line) {
  const print = parseDvarPrint(line);
  if (print?.name.startsWith("cheats_map_")) return onMapLine(session, print.name, print.value);
  const cheats = session.cheats;
  if (!print || !cheats) return;
  const { name, value } = print;
  const list = () => value.split(",").filter(Boolean);
  if (name === "cheats_state") {
    const state = parseState(value);
    Object.assign(cheats, { ready: state.ready, round: state.round, frozen: state.frozen, power: state.power, horde: state.horde, scriptLists: state.lists });
    // The script's counter. It starts again from 0 when the game restarts in the same page (game over): then
    // nothing sent before can still be taken, so stop waiting for it.
    if (state.seq < cheats.scriptSeq) {
      cheats.lastSeq = state.seq;
      cheats.health = {};
    }
    cheats.scriptSeq = state.seq;
  } else if (name === "cheats_weapons_count") {
    const count = Number(value) || 0;
    cheats.weaponChunks = new Array(count).fill(null);
    for (let i = 0; i < count; i += 1) askDvar(session, `cheats_weapons_${i}`);
  } else if (name.startsWith("cheats_weapons_")) {
    const i = Number(name.slice("cheats_weapons_".length));
    if (!cheats.weaponChunks || !(i >= 0 && i < cheats.weaponChunks.length)) return;
    cheats.weaponChunks[i] = list();
    if (cheats.weaponChunks.every(Boolean)) cheats.weapons = cheats.weaponChunks.flat();
  } else if (name === "cheats_perks") {
    cheats.perks = list();
  } else if (name === "cheats_powerups") {
    cheats.powerups = list();
  } else if (name === "cheats_results") {
    // newest first: "<seq> ok;<seq> err <code> [detail];..."; each is reported once, while it is still waited for
    for (const entry of value.split(";").filter(Boolean)) {
      const [seqText, status, code = "", ...rest] = entry.split(" ");
      const seq = Number(seqText);
      const sent = cheats.sent.get(seq);
      if (!sent) continue;
      cheats.sent.delete(seq);
      cheats.onResult?.({ seq, ok: status === "ok", code, detail: rest.join(" ") }, { action: sent.action, target: sent.target, arg: sent.arg });
    }
  }
}
