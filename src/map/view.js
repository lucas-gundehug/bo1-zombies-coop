// My own position and facing, every frame. vel.gg reports the camera to the page only about once a second (and its
// angles stay 0), so the map reads them straight from the engine's memory, which the page shares. The client keeps two
// copies of the local player's view, each { origin x, y, z, angles pitch, yaw, roll } as six floats: one at the feet
// and one at the eye, the eye one updated every rendered frame. Both live in the client's static data, so they sit at
// one address per engine build. Found in a running game with `node test/cheats-e2e.mjs kino findview` (it teleports
// the player to a known facing and looks for it); a build not listed here falls back to the game script's samples.
const VIEWS = {
  // served at https://vel.gg/bsz/ since 2026-10-18 (src/engine/builds.js)
  "42be1c35025afa61ed1f0fc4558ca15c45c49b37dfdc458d3ebbe30f8c958036": { feet: 11209664, eye: 11209776 },
};

export const viewAddresses = (hash) => VIEWS[hash] ?? null;

/** { x, y, z (feet), yaw } of my player this frame, or null where the build's addresses are unknown. */
export function myView(session) {
  const at = viewAddresses(session.hash);
  const buffer = session.engine?.buffer;
  if (!at || !buffer) return null;
  if (session.mapF32?.buffer !== buffer) session.mapF32 = new Float32Array(buffer);
  const f32 = session.mapF32;
  const x = f32[at.eye >> 2];
  const y = f32[(at.eye >> 2) + 1];
  const yaw = f32[(at.eye >> 2) + 4];
  const z = f32[(at.feet >> 2) + 2];
  // all zero before the first frame of a game; anything else that is not a number is not a view
  if (![x, y, z, yaw].every(Number.isFinite) || (x === 0 && y === 0 && z === 0)) return null;
  return { x, y, z, yaw };
}
