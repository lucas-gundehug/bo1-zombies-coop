// The cheat menu's game script reaches the engine as a mod: vel.gg's engine stacks mods/<name> folders named in the
// fs_mods setting (github.com/MisaDev4/bo1-zombies-decompiled, mods/_stack). This file edits the engine's command line.
import { insertBeforeDevmap } from "../game/page.js";

export const MOD_NAME = "cheats";

/** The base folder the engine reads mods from: its fs_b argument, "/opfs/pack-kino/files" -> "pack-kino/files". */
export function modBase(args) {
  const i = args.findIndex((arg, at) => arg === "fs_b" && args[at - 1] === "+set");
  const value = i < 0 ? "" : (args[i + 1] ?? "");
  return value.startsWith("/opfs/") ? value.slice("/opfs/".length) : null;
}

/** Adds our mod to the command line, next to any vel.gg mods (Hell mode starts with fs_mods "horde zinfo"). */
export function addCheatsMod(args, { horde }) {
  const i = args.findIndex((arg, at) => arg === "fs_mods" && args[at - 1] === "+set");
  if (i < 0) {
    insertBeforeDevmap(args, ["+set", "fs_mods", MOD_NAME]);
  } else {
    const names = args[i + 1].split(/[\s,;]+/).filter(Boolean);
    if (!names.includes(MOD_NAME)) args[i + 1] = [...names, MOD_NAME].join(" ");
  }
  if (horde && !args.includes("cheats_horde")) insertBeforeDevmap(args, ["+set", "cheats_horde", "1"]);
}
