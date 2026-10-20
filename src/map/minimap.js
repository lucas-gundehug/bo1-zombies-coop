// The corner minimap: a small map in the top left corner of the game that keeps the player in the middle and scrolls
// under them, north up, with the room they are in written along the top. It draws from the same model as the big map
// (src/map/model.js): the rooms of the player's floor are drawn once into a cached canvas at a fixed scale, and each
// frame the square around the player is copied out of it, with doors, icons and players on top. On in every game
// unless turned off in the card's settings; hidden while the big map (N) is open.
import { latestView, screen } from "../game/page.js";
import { readSetting, saveSetting } from "../util/settings.js";
import { mapModel } from "./model.js";
import { toScreen } from "./plan.js";
import { C, drawLock, drawPlayer, drawPoi, drawRooms, roundRect, text } from "./overlay.js";
import { M } from "./strings.js";

const SIZE = 200; // the map square, px
const BAR = 26; // the room name above it
const SCALE = 0.11; // px per world unit: about 1800 units across
const PAD = SIZE / 2 + 16; // margin around the floor in the cached layer, so the square never leaves it

export const minimapEnabled = () => readSetting("minimap", "1") !== "0";

/** The canvas size in device pixels, whole numbers at any display scaling (125% is common on Windows laptops). */
export const minimapCanvasSize = (dpr) => ({ w: Math.round(SIZE * dpr), h: Math.round((SIZE + BAR) * dpr) });

/**
 * The model to draw now, or null when the minimap hides: not in a game, turned off, the big map open, no plan, no
 * data, or no player of mine to center on (spectating after bleeding out, the game paused).
 */
export function minimapFrame(session, now, { playing = screen() === "playing", view = latestView() } = {}) {
  const map = session.map;
  if (!map?.minimap || !playing || map.open || !map.plan) return null;
  const model = mapModel(session, now, { view });
  return model.status === "ok" && model.players.some((p) => p.me) ? model : null;
}

export const minimapVisible = (session, now, { playing } = {}) => Boolean(minimapFrame(session, now, { playing, view: null }));

/** The square of `size` px around world (x, y) in a layer drawn with `layer` (a fitView-style view). */
export function minimapWindow(layer, x, y, size) {
  const [sx, sy] = toScreen(layer, x, y);
  return { sx: sx - size / 2, sy: sy - size / 2, size };
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
  return { view, canvas: drawRooms(plan, model, view, w, h, dpr, { labels: false }) };
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
        const model = this.brokenSlug === undefined ? minimapFrame(session, Date.now()) : null;
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
    roundRect(ctx, 0.5, 0.5, SIZE - 1, SIZE + BAR - 1, 10);
    ctx.fillStyle = "rgba(18,17,16,.94)";
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.stroke();
    text(ctx, model.room ?? "—", SIZE / 2, BAR / 2 + 1, { size: 13, weight: 800, align: "center" });
    // the floor drawing changes with the floor, the state (doors and rooms opening) and the room I'm in
    const current = model.rooms.findIndex((r) => r.current);
    const key = `${plan.slug}|${model.floor}|${dpr}|${map.planOk}|${map.state?.at ?? 0}|${current}`;
    if (this.cache.key !== key) this.cache = { key, ...floorLayer(plan, model, dpr) };
    const { view, canvas } = this.cache;
    const win = minimapWindow(view, me.x, me.y, SIZE);
    // whole device pixels, so the copied square stays sharp while the player moves
    const sx = Math.round(win.sx * dpr) / dpr;
    const sy = Math.round(win.sy * dpr) / dpr;
    ctx.save();
    roundRect(ctx, 1, BAR, SIZE - 2, SIZE - 1, 9);
    ctx.clip();
    ctx.drawImage(canvas, sx * dpr, sy * dpr, SIZE * dpr, SIZE * dpr, 0, BAR, SIZE, SIZE);
    // world -> minimap px: the layer's view moved so the window's corner is at (0, BAR)
    const mini = { scale: view.scale, rotate: 0, tx: view.tx - sx, ty: view.ty - sy + BAR };
    for (const poi of model.pois) {
      if (poi.at[0] !== model.floor) continue;
      const [x, y] = toScreen(mini, poi.at[1], poi.at[2]);
      drawPoi(ctx, x, y, poi, map.icons, 18);
    }
    for (const door of model.doors) {
      if (door.at[0] !== model.floor) continue;
      const [x, y] = toScreen(mini, door.at[1], door.at[2]);
      drawLock(ctx, x, y, door, true);
    }
    const here = model.players.filter((p) => p.floor === model.floor);
    for (const p of [...here.filter((q) => !q.me), me]) drawPlayer(ctx, mini, p, p.me ? 8 : 7);
    ctx.restore();
  }
}
