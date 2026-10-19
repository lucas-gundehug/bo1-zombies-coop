// Turns the cheat menu on for a game: the host's or a solo player's engine gets the mod, a guest's never does (the
// game script runs on the host's server and reaches every player from there).
import { currentHorde } from "../game/page.js";
import { readSetting, saveSetting } from "../util/settings.js";
import { createBridge } from "./bridge.js";
import { MOD_FILES } from "./files.js";
import { addCheatsMod, modBase } from "./mod.js";
import { writeModFiles } from "./opfs.js";
import { C } from "./strings.js";

const WRITE_TIMEOUT_MS = 5000;

export function createCheats() {
  return {
    enabled: readSetting("cheats", "1") !== "0",
    /** true once the mod was handed to the engine, false when it could not be, null before the game starts. */
    ok: null,
    ...createBridge(),
  };
}

export const wantsCheats = (session) => session.cheats.enabled && session.mode !== "guest" && session.patched;

/** Right before the engine starts: writes the mod and names it on the command line. */
export async function prepareCheats(session, args) {
  if (!wantsCheats(session)) return;
  const base = modBase(args);
  const timeout = new Promise((resolve) => setTimeout(() => resolve(false), WRITE_TIMEOUT_MS));
  const ok = base ? await Promise.race([writeModFiles(base, MOD_FILES), timeout]) : false;
  session.cheats.ok = ok;
  if (ok) addCheatsMod(args, { horde: currentHorde() });
  session.note(`cheat menu: ${ok ? "mod loaded" : "mod not written"}`);
}

export function cheatsSettingBlocks(session) {
  const on = session.cheats.enabled;
  return [
    { kind: "kv", items: [[C.setting, on ? C.on : C.off]] },
    { kind: "text", cls: "muted small", text: C.note },
    { kind: "buttons", buttons: [{ act: "cheatsSetting", label: on ? C.turnOff : C.turnOn, style: "ghost" }] },
  ];
}

export function cheatsSettingActions(session) {
  return {
    cheatsSetting: () => {
      session.cheats.enabled = !session.cheats.enabled;
      saveSetting("cheats", session.cheats.enabled ? "1" : "0");
      session.notice = C.reload;
    },
  };
}
