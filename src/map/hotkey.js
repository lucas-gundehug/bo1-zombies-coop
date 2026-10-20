// M opens and closes the map during a game. Unlike N (src/cheats/hotkey.js, the cheat menu) it leaves the mouse with the game: the map
// is only for looking, so you keep walking, aiming and shooting while it is open, and nothing pauses.
import { screen } from "../game/page.js";

const KEY = "KeyM";

/** Returns true when the key was ours (the game must not get it). */
export function onMapKey(session, event, { playing }) {
  if (event.code !== KEY || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return false;
  // typing an "m" (the card's name or relay field, a console) is text; the card's shadow DOM shows up in composedPath
  const target = event.composedPath?.()[0];
  if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName ?? "") || target.isContentEditable)) return false;
  if (!playing) return false;
  session.map.open = !session.map.open;
  if (session.map.open) session.map.openedAt = Date.now();
  return true;
}

export function installMapKey(session, overlay) {
  window.addEventListener(
    "keydown",
    (event) => {
      if (!onMapKey(session, event, { playing: screen() === "playing" })) return;
      if (session.map.open) overlay.show(session);
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  window.addEventListener(
    "keyup",
    (event) => {
      if (event.code === KEY && screen() === "playing") event.stopImmediatePropagation();
    },
    true,
  );
}
