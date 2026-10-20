// The mod's files, bundled as text (scripts/build.mjs loads .gsc files as strings). Paths are relative to the map pack's
// base folder, where the engine looks for mods/<name> (its fs_b).
import hooks from "./gsc/_hooks.gsc";
import cheats from "./gsc/_cheats.gsc";
import map from "./gsc/_map.gsc";
import modstack from "./gsc/_stack/_modstack.gsc";
import ffotd from "./gsc/_stack/_zombiemode_ffotd.gsc";

export const MOD_FILES = [
  { path: "mods/cheats/maps/cheats/_hooks.gsc", text: hooks },
  { path: "mods/cheats/maps/cheats/_cheats.gsc", text: cheats },
  { path: "mods/cheats/maps/cheats/_map.gsc", text: map },
  { path: "mods/_stack/maps/_modstack.gsc", text: modstack },
  { path: "mods/_stack/maps/_zombiemode_ffotd.gsc", text: ffotd },
];
