// M opens the card at Fun mode during a game without the pause menu: Esc pauses the game (for everyone, in co-op), and
// unpausing makes players jump while they sync up again. M again, or a click on the game, takes the mouse back.
//
// vel.gg answers a lost pointer lock by pressing Escape for the game (its input.js "pointerlockchange" handler) unless
// it released the mouse itself. The one unlock this file causes is kept from it, so the game neither pauses nor learns
// the mouse is free; its own click-to-relock and the lock event that follows work as usual.
import { screen } from "../game/page.js";
import { funAvailable } from "../fun/fun.js";

const KEY = "KeyM";

/** Returns true when the key was ours (the game must not get it). */
export function onCheatsKey(session, event, { playing, available, freeMouse, lockMouse }) {
  if (event.code !== KEY || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return false;
  if (!playing || !available) return false;
  session.cheats.panel = !session.cheats.panel;
  if (session.cheats.panel) {
    session.fun.open = true;
    freeMouse();
  } else {
    lockMouse();
  }
  return true;
}

export function onPointerLock(session, locked) {
  if (locked) session.cheats.panel = false;
}

export function installCheatsKey(session) {
  let hideUnlock = false;
  const ctx = () => ({
    playing: screen() === "playing",
    available: funAvailable(session) && Boolean(session.engine),
    freeMouse: () => {
      if (!document.pointerLockElement) return;
      hideUnlock = true;
      document.exitPointerLock();
    },
    lockMouse: () => document.getElementById("game")?.requestPointerLock?.()?.catch?.(() => {}),
  });
  // the card is long: show it from Fun mode down (after the next render has opened it)
  const showFun = () => setTimeout(() => session.card?.root.querySelector('[data-act="fun"]')?.scrollIntoView({ block: "start" }), 120);
  window.addEventListener(
    "keydown",
    (event) => {
      if (!onCheatsKey(session, event, ctx())) return;
      if (session.cheats.panel) showFun();
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  window.addEventListener(
    "keyup",
    (event) => {
      if (event.code === KEY && screen() === "playing" && funAvailable(session)) event.stopImmediatePropagation();
    },
    true,
  );
  // pointerlockchange is fired at the document; a capturing listener on window runs before vel.gg's
  window.addEventListener(
    "pointerlockchange",
    (event) => {
      const locked = Boolean(document.pointerLockElement);
      if (!locked && hideUnlock) {
        hideUnlock = false;
        event.stopImmediatePropagation();
        return;
      }
      onPointerLock(session, locked);
    },
    true,
  );
}
