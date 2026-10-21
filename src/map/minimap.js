// The corner minimap, in the style of Modern Warfare 2's: a see-through square in the top left corner of the game that
// keeps the player in the middle and turns with them, so the way they look is always up, with N on the rim and the room
// they are in written under it. It draws from the same model as the big map (src/map/model.js): the rooms of the
// player's floor are drawn once into a cached canvas at a fixed scale, and each frame that drawing is turned and moved
// under the player, with doors, icons (kept upright) and the other players' arrows on top. On in every game unless
// turned off in the card's settings; hidden while the big map (M) is open.
import { screen } from "../game/page.js";
import { readSetting, saveSetting } from "../util/settings.js";
import { mapModel } from "./model.js";
import { toScreen } from "./plan.js";
import { C, drawLock, drawPoi, drawRooms } from "./overlay.js";
import { M } from "./strings.js";
import { myView } from "./view.js";

const SIZE = 200; // the map square, px
const BAR = 26; // the room name under it
const SCALE = 0.11; // px per world unit: about 1800 units across
const PAD = SIZE / 2 + 16; // margin around the floor in the cached layer
const FONT = '"Bahnschrift SemiCondensed", Bahnschrift, "Arial Narrow", system-ui, sans-serif';
const LOOK = {
  back: "rgba(22,28,20,.55)", // the square behind the rooms
  rooms: 0.75, // the rooms layer's opacity
  frame: "rgba(205,215,190,.6)",
  corner: "rgba(235,240,225,.95)",
  me: "#ffd23f",
  text: "#e8eedc",
  shadow: "rgba(0,0,0,.65)",
};

export const minimapEnabled = () => readSetting("minimap", "1") !== "0";

/** The canvas size in device pixels, whole numbers at any display scaling (125% is common on Windows laptops). */
export const minimapCanvasSize = (dpr) => ({ w: Math.round(SIZE * dpr), h: Math.round((SIZE + BAR) * dpr) });

/**
 * The model to draw now, or null when the minimap hides: not in a game, turned off, the big map open, no plan, no
 * data, or no player of mine to center on (spectating after bleeding out, the game paused).
 */
export function minimapFrame(session, now, { playing = screen() === "playing", mine = myView(session) } = {}) {
  const map = session.map;
  if (!map?.minimap || !playing || map.open || !map.plan) return null;
  const model = mapModel(session, now, { mine });
  return model.status === "ok" && model.players.some((p) => p.me) ? model : null;
}

export const minimapVisible = (session, now, { playing } = {}) => Boolean(minimapFrame(session, now, { playing, mine: null }));

/** How far the map is turned, in radians (canvas rotation, clockwise): my facing (yaw 0 east, 90 north) points up. */
export const minimapTurn = (yaw) => ((yaw - 90) * Math.PI) / 180;

/** Where world (x, y) shows in the minimap square (px from its top left), with `me` ({ x, y, yaw }) in the middle. */
export function minimapPlace(me, x, y) {
  const dx = (x - me.x) * SCALE;
  const dy = -(y - me.y) * SCALE;
  const a = minimapTurn(me.yaw);
  return [SIZE / 2 + dx * Math.cos(a) - dy * Math.sin(a), SIZE / 2 + dx * Math.sin(a) + dy * Math.cos(a)];
}

/** Where the N goes: on the rim, `inset` px in, in the direction of world north. */
export function minimapNorth(yaw, inset = 10) {
  const a = ((yaw - 180) * Math.PI) / 180;
  const [x, y] = [Math.cos(a), Math.sin(a)];
  const k = (SIZE / 2 - inset) / Math.max(Math.abs(x), Math.abs(y));
  return [SIZE / 2 + x * k, SIZE / 2 + y * k];
}

export function minimapSettingBlocks(session) {
  const on = session.map?.minimap !== false;
  return [
    { kind: "kv", items: [[M.minimap, on ? M.on : M.off]] },
    { kind: "text", cls: "muted small", text: M.minimapNote },
    { kind: "buttons", buttons: [{ act: "minimapSetting", label: on ? M.turnOff : M.turnOn, style: "ghost" }] },
  ];
}

export function minimapActions(session, save = saveSetting) {
  return {
    minimapSetting: () => {
      session.map.minimap = !session.map.minimap;
      save("minimap", session.map.minimap ? "1" : "0");
    },
  };
}

/** The floor's rooms at the minimap's scale, with the layer's view (world -> layer px). */
function floorLayer(plan, model, dpr) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const room of plan.rooms) {
    for (const [f, x0, y0, x1, y1] of room.rects) {
      if (f !== model.floor) continue;
      b[0] = Math.min(b[0], x0);
      b[1] = Math.min(b[1], y0);
      b[2] = Math.max(b[2], x1);
      b[3] = Math.max(b[3], y1);
    }
  }
  if (!Number.isFinite(b[0])) b.splice(0, 4, 0, 0, 1, 1);
  const view = { scale: SCALE, rotate: 0, tx: PAD - b[0] * SCALE, ty: PAD + b[3] * SCALE };
  const w = (b[2] - b[0]) * SCALE + 2 * PAD;
  const h = (b[3] - b[1]) * SCALE + 2 * PAD;
  return { view, w, h, canvas: drawRooms(plan, model, view, w, h, dpr, { labels: false }) };
}

/** Text with a dark edge, readable over the game. */
function label(ctx, value, x, y, { size, align = "left", spacing = 0 }) {
  ctx.font = `700 ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.letterSpacing = `${spacing}px`;
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = LOOK.shadow;
  ctx.strokeText(value, x, y);
  ctx.fillStyle = LOOK.text;
  ctx.fillText(value, x, y);
  ctx.letterSpacing = "0px";
}

/** A player's arrow, pointing up when `turn` is 0; `r` is its half width. A downed player's has a red edge. */
function arrow(ctx, x, y, turn, color, r, downed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.3);
  ctx.lineTo(r, r);
  ctx.lineTo(0, r * 0.45);
  ctx.lineTo(-r, r);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = downed ? 2.5 : 1.5;
  ctx.strokeStyle = downed ? C.bad : "rgba(0,0,0,.8)";
  ctx.stroke();
  ctx.restore();
}

export class Minimap {
  constructor() {
    this.host = document.createElement("bo1-coop-minimap");
    const root = this.host.attachShadow({ mode: "closed" });
    root.innerHTML = `<style>:host { all: initial; position: fixed; top: 12px; left: 12px; width: ${SIZE}px; height: ${SIZE + BAR}px; z-index: 2147483645; pointer-events: none; display: none; } canvas { width: 100%; height: 100%; display: block; }</style><canvas></canvas>`;
    this.canvas = root.querySelector("canvas");
    this.cache = {};
    this.shown = false;
    this.brokenSlug = undefined; // a map whose drawing failed: no minimap there (no error every frame)
  }

  mount() {
    const attach = () => {
      if (!this.host.isConnected) document.documentElement.append(this.host);
    };
    if (document.documentElement) attach();
    else document.addEventListener("DOMContentLoaded", attach, { once: true });
  }

  /** Runs for the whole page: a cheap check per frame, and a draw while the minimap shows. */
  start(session) {
    const show = (on) => {
      if (on === this.shown) return;
      this.shown = on;
      this.host.style.display = on ? "block" : "none";
    };
    const frame = () => {
      const slug = session.map?.slug;
      if (this.brokenSlug !== undefined && this.brokenSlug !== slug) this.brokenSlug = undefined;
      try {
        const mine = myView(session);
        this.fromEngine = Boolean(mine); // my arrow follows the engine every frame (the real-game tests read it)
        const model = this.brokenSlug === undefined ? minimapFrame(session, Date.now(), { mine }) : null;
        show(Boolean(model));
        if (model) this.draw(session, model);
      } catch (error) {
        session.note?.(`minimap failed: ${error?.stack ?? error}`);
        this.brokenSlug = slug;
        show(false);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  draw(session, model) {
    const dpr = window.devicePixelRatio || 1;
    const size = minimapCanvasSize(dpr);
    if (this.canvas.width !== size.w || this.canvas.height !== size.h) {
      this.canvas.width = size.w;
      this.canvas.height = size.h;
    }
    this.model = model; // the real-game test reads it
    const me = model.players.find((p) => p.me);
    const map = session.map;
    const plan = map.plan;
    const ctx = this.canvas.getContext("2d");
    ctx.setTransform(size.w / SIZE, 0, 0, size.h / (SIZE + BAR), 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE + BAR);
    // the floor drawing changes with the floor, the state (doors and rooms opening) and the room I'm in
    const current = model.rooms.findIndex((r) => r.current);
    const key = `${plan.slug}|${model.floor}|${dpr}|${map.planOk}|${map.state?.at ?? 0}|${current}`;
    if (this.cache.key !== key) this.cache = { key, ...floorLayer(plan, model, dpr) };
    const { view, w, h, canvas } = this.cache;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, SIZE, SIZE);
    ctx.fillStyle = LOOK.back;
    ctx.fill();
    ctx.clip();
    // the rooms, turned around me: my spot in the layer goes to the middle of the square
    const [lx, ly] = toScreen(view, me.x, me.y);
    ctx.save();
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate(minimapTurn(me.yaw));
    ctx.globalAlpha = LOOK.rooms;
    ctx.drawImage(canvas, -lx, -ly, w, h);
    ctx.restore();
    for (const poi of model.pois) {
      if (poi.at[0] !== model.floor) continue;
      const [x, y] = minimapPlace(me, poi.at[1], poi.at[2]);
      drawPoi(ctx, x, y, poi, map.icons, 18);
    }
    for (const door of model.doors) {
      if (door.at[0] !== model.floor) continue;
      const [x, y] = minimapPlace(me, door.at[1], door.at[2]);
      drawLock(ctx, x, y, door, true);
    }
    for (const p of model.players) {
      if (p.me || p.floor !== model.floor) continue;
      const [x, y] = minimapPlace(me, p.x, p.y);
      // their facing, turned like the map: up for someone looking the way I look
      arrow(ctx, x, y, ((me.yaw - p.yaw) * Math.PI) / 180, p.color, 6, p.downed);
    }
    arrow(ctx, SIZE / 2, SIZE / 2, 0, LOOK.me, 8, me.downed);
    ctx.restore();
    // the frame: a thin line with brighter corners
    ctx.strokeStyle = LOOK.frame;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1);
    ctx.strokeStyle = LOOK.corner;
    ctx.lineWidth = 2;
    for (const [x, y, dx, dy] of [
      [1, 1, 1, 1],
      [SIZE - 1, 1, -1, 1],
      [1, SIZE - 1, 1, -1],
      [SIZE - 1, SIZE - 1, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * 12);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * 12, y);
      ctx.stroke();
    }
    const [nx, ny] = minimapNorth(me.yaw);
    label(ctx, "N", nx, ny, { size: 13, align: "center" });
    label(ctx, (model.room ?? "").toUpperCase(), 2, SIZE + BAR / 2 + 1, { size: 13, spacing: 2 });
  }
}
