// M opens the card at Fun mode during a game without the pause menu: Esc pauses the game (for everyone, in co-op), and
// unpausing makes players jump while they sync up again. Clicking back into the game takes the mouse and closes it.
import { screen } from "../game/page.js";
import { funAvailable } from "../fun/fun.js";

const KEY = "KeyM";

/** Returns true when the key was ours (the game must not get it). */
export function onCheatsKey(session, event, { playing, available, freeMouse }) {
  if (event.code !== KEY || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return false;
  if (!playing || !available) return false;
  session.cheats.panel = !session.cheats.panel;
  if (session.cheats.panel) {
    session.fun.open = true;
    freeMouse();
  }
  return true;
}

export function onPointerLock(session, locked) {
  if (locked) session.cheats.panel = false;
}

export function installCheatsKey(session) {
  window.addEventListener(
    "keydown",
    (event) => {
      const ctx = { playing: screen() === "playing", available: funAvailable(session) && Boolean(session.engine), freeMouse: () => document.exitPointerLock?.() };
      if (!onCheatsKey(session, event, ctx)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  // keyup too, so the game never sees half a key press
  window.addEventListener("keyup", (event) => event.code === KEY && session.cheats.panel !== undefined && screen() === "playing" && funAvailable(session) && event.stopImmediatePropagation(), true);
  document.addEventListener("pointerlockchange", () => onPointerLock(session, Boolean(document.pointerLockElement)));
}
