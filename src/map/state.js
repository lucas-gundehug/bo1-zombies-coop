// What the map knows during a game. The host fills it from the game script (src/map/live.js), a guest from the host's
// messages (src/map/net.js); the panel draws from it (src/map/model.js).

export function createMap() {
  return {
    open: false,
    openedAt: null, // when the panel was last opened (the "no data" note waits a few seconds)
    slug: null,
    plan: null,
    tracks: new Map(), // n -> track of recent positions, for gliding (src/map/track.js)
    live: new Map(), // n -> { x, y, z, yaw, room, s, floor, at }: the latest sample per player number
    liveV: null, // the state counter of the latest live sample
    state: null, // { v, sig, doors, rooms, box, power, at }
    planOk: false, // the state's sig matches the plan: its doors and rooms can be shown
    lastAskAt: -Infinity,
    sentStateAt: 0,
    sentStateKey: null,
  };
}
