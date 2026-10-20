// The map panel: a canvas over the game, drawn from mapModel() every frame while open (option B of the mockup: a big
// panel in the middle, the game visible around it). It takes no clicks and never the mouse. Rooms and their names are
// drawn once per floor into a cached canvas; doors, points of interest and players are redrawn each frame. Closed, the
// loop stops and costs nothing.
import { screen } from "../game/page.js";
import { mapModel } from "./model.js";
import { fitView, toScreen } from "./plan.js";
import { M } from "./strings.js";

const C = {
  panel: "rgba(18,17,16,.9)",
  line: "#34302b",
  fg: "#ece6dc",
  muted: "#9d958a",
  dim: "#6f685f",
  accent: "#e2552f",
  accent2: "#f07a4f",
  gold: "#f4c542",
  bad: "#ff6b5a",
  roomOpen: "#2a2622",
  roomOpenEdge: "#6f685f",
  roomShut: "#1d1a17",
  roomShutEdge: "#4a443d",
  roomUnknown: "#24211e",
  current: "#3a2a22",
};
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const PERK_LABELS = {
  specialty_armorvest: "Jug",
  specialty_quickrevive: "QR",
  specialty_fastreload: "Spd",
  specialty_rof: "DT",
  specialty_longersprint: "Stm",
  specialty_deadshot: "DS",
  specialty_additionalprimaryweapon: "MK",
  specialty_flakjacket: "PhD",
};
const HEAD = 52;
const FOOT = 34;
const PAD = 18;

/** The panel's box inside a width × height window: 12% in from the sides, 8% from the top and bottom. */
export const panelBox = (width, height) => ({ x: Math.round(width * 0.12), y: Math.round(height * 0.08), w: Math.round(width * 0.76), h: Math.round(height * 0.84) });

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function text(ctx, value, x, y, { size = 13, weight = 600, color = C.fg, align = "left", base = "middle" } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillText(value, x, y);
  return ctx.measureText(value).width;
}

/** Rooms of one floor, with their names, into a cached canvas the size of the map area. */
function drawRooms(plan, model, view, w, h, dpr) {
  const canvas = new OffscreenCanvas(Math.max(1, Math.round(w * dpr)), Math.max(1, Math.round(h * dpr)));
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const s = view.scale;
  // snapped to whole pixels, so neighbouring rectangles meet without a faint seam between them
  const rectOf = ([, x0, y0, x1, y1]) => {
    const [ax, ay] = toScreen(view, x0, y0);
    const [bx, by] = toScreen(view, x1, y1);
    const left = Math.round(Math.min(ax, bx));
    const top = Math.round(Math.min(ay, by));
    return [left, top, Math.round(Math.max(ax, bx)) - left, Math.round(Math.max(ay, by)) - top];
  };
  const fill = (room, grow, color) => {
    ctx.fillStyle = color;
    for (const rect of room.rects) {
      if (rect[0] !== model.floor) continue;
      const [x, y, rw, rh] = rectOf(rect);
      ctx.fillRect(x - grow, y - grow, rw + 2 * grow, rh + 2 * grow);
    }
  };
  const look = (i) => {
    const r = model.rooms[i];
    if (r.current) return { edge: C.accent, fill: C.current, grow: 3, label: C.accent2 };
    if (r.open === true) return { edge: C.roomOpenEdge, fill: C.roomOpen, grow: 1.5, label: C.muted };
    if (r.open === false) return { edge: C.roomShutEdge, fill: C.roomShut, grow: 1.5, label: C.dim };
    return { edge: C.roomShutEdge, fill: C.roomUnknown, grow: 1.5, label: C.muted };
  };
  // room by room, its edge then its inside: a room's own rectangles hide each other's edges, while the next room's edge
  // draws a border over its neighbour. The room you are in goes last, so its outline is whole.
  const order = plan.rooms.map((_, i) => i).sort((a, b) => Number(model.rooms[a].current) - Number(model.rooms[b].current));
  for (const i of order) {
    fill(plan.rooms[i], look(i).grow, look(i).edge);
    fill(plan.rooms[i], 0, look(i).fill);
  }
  const size = Math.max(10, Math.min(14, s * 160));
  for (const i of order) {
    const room = plan.rooms[i];
    if (room.label[0] !== model.floor) continue;
    const [lx, ly] = toScreen(view, room.label[1], room.label[2]);
    text(ctx, model.rooms[i].name, lx, ly, { size, weight: 700, color: look(i).label, align: "center" });
  }
  return canvas;
}

function drawLock(ctx, x, y, door) {
  const label = door.kind === "power" ? "" : String(door.cost);
  ctx.font = `800 11px ${FONT}`;
  const w = 26 + (label ? ctx.measureText(label).width : 0);
  roundRect(ctx, x - w / 2, y - 10, w, 20, 10);
  ctx.fillStyle = "#121110";
  ctx.fill();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const ix = x - w / 2 + 8;
  if (door.kind === "power") {
    bolt(ctx, x, y, C.gold);
    return;
  }
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ix, y - 1, 8, 6);
  ctx.beginPath();
  ctx.arc(ix + 4, y - 2, 2.6, Math.PI, 0);
  ctx.stroke();
  text(ctx, label, ix + 12, y + 0.5, { size: 11, weight: 800, color: C.gold });
}

function bolt(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + 1, y - 7);
  ctx.lineTo(x - 4, y + 1);
  ctx.lineTo(x, y + 1);
  ctx.lineTo(x - 1, y + 7);
  ctx.lineTo(x + 4, y - 1);
  ctx.lineTo(x, y - 1);
  ctx.closePath();
  ctx.fill();
}

function drawPoi(ctx, x, y, poi) {
  if (poi.kind === "power") {
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = poi.active ? "#1a2a3a" : "#1b1917";
    ctx.fill();
    ctx.strokeStyle = poi.active ? "#5aa8ff" : C.dim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    bolt(ctx, x, y, poi.active ? "#5aa8ff" : C.muted);
    return;
  }
  if (poi.kind === "box") {
    roundRect(ctx, x - 13, y - 9, 26, 18, 3);
    ctx.fillStyle = poi.active ? "#3b2a12" : "rgba(0,0,0,0)";
    ctx.fill();
    ctx.strokeStyle = poi.active ? C.gold : C.dim;
    ctx.lineWidth = poi.active ? 1.5 : 1;
    ctx.setLineDash(poi.active ? [] : [3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, "?", x, y + 0.5, { size: 12, weight: 900, color: poi.active ? C.gold : C.dim, align: "center" });
    return;
  }
  const pap = poi.kind === "pap";
  const label = pap ? "PaP" : (PERK_LABELS[poi.id] ?? "Perk");
  roundRect(ctx, x - 14, y - 11, 28, 22, 5);
  ctx.fillStyle = pap ? "#2b1f3a" : "#3a1a17";
  ctx.fill();
  ctx.strokeStyle = pap ? "#b48cff" : C.bad;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  text(ctx, label, x, y + 0.5, { size: 10, weight: 800, color: pap ? "#d7c2ff" : "#fff", align: "center" });
}

function drawPlayer(ctx, view, p) {
  const [x, y] = toScreen(view, p.x, p.y);
  const rad = (p.yaw * Math.PI) / 180;
  const [fx, fy] = toScreen(view, p.x + Math.cos(rad) * 100, p.y + Math.sin(rad) * 100);
  const len = Math.hypot(fx - x, fy - y) || 1;
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + ((fx - x) / len) * 22, y + ((fy - y) / len) * 22);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fillStyle = p.color;
  ctx.fill();
  ctx.lineWidth = p.downed ? 3 : 2;
  ctx.strokeStyle = p.downed ? C.bad : "#000";
  ctx.stroke();
  text(ctx, p.letter, x, y + 0.5, { size: 12, weight: 900, color: "#121110", align: "center" });
}

/** Draws one frame of the panel. `cache` keeps the rooms layer between frames. */
export function drawMap(ctx, width, height, model, plan, cache) {
  ctx.clearRect(0, 0, width, height);
  const box = panelBox(width, height);
  roundRect(ctx, box.x, box.y, box.w, box.h, 10);
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.stroke();
  const left = box.x + PAD;
  const right = box.x + box.w - PAD;
  if (model.status !== "ok") {
    const message = { noPlan: M.noPlan, waiting: M.waiting, noData: M.noData }[model.status];
    text(ctx, message, box.x + box.w / 2, box.y + box.h / 2, { size: 15, color: C.muted, align: "center" });
    text(ctx, M.close, right, box.y + box.h - FOOT / 2, { size: 12, color: C.dim, align: "right" });
    return;
  }
  // head: the room you are in, the floors
  text(ctx, M.youAreIn.toUpperCase(), left, box.y + 18, { size: 10, weight: 700, color: C.muted });
  text(ctx, model.room ?? "—", left, box.y + 36, { size: 17, weight: 800 });
  if (model.floors.length > 1) {
    let x = right;
    for (const floor of [...model.floors].reverse()) {
      ctx.font = `700 12px ${FONT}`;
      const others = floor.others.join(" ");
      const w = ctx.measureText(floor.name).width + (others ? ctx.measureText(others).width + 8 : 0) + 22;
      x -= w;
      roundRect(ctx, x, box.y + 16, w, 24, 12);
      ctx.fillStyle = floor.current ? C.accent : "rgba(0,0,0,0)";
      ctx.fill();
      ctx.strokeStyle = floor.current ? C.accent : C.line;
      ctx.lineWidth = 1;
      ctx.stroke();
      const tw = text(ctx, floor.name, x + 11, box.y + 28.5, { size: 12, weight: 700, color: floor.current ? "#fff" : C.muted });
      if (others) text(ctx, others, x + 19 + tw, box.y + 28.5, { size: 12, weight: 900, color: C.gold });
      x -= 6;
    }
  }
  if (model.stale) text(ctx, M.stale, box.x + box.w / 2, box.y + HEAD + 4, { size: 12, color: C.gold, align: "center" });
  // the map
  const area = { x: box.x + PAD, y: box.y + HEAD + (model.stale ? 14 : 0), w: box.w - 2 * PAD, h: box.h - HEAD - FOOT - (model.stale ? 14 : 0) };
  const view = fitView(plan, model.floor, area.w, area.h, 12);
  const dpr = globalThis.devicePixelRatio || 1;
  const key = JSON.stringify([plan.slug, model.floor, area.w, area.h, dpr, model.rooms.map((r) => [r.open, r.current])]);
  if (cache.key !== key) {
    cache.key = key;
    cache.rooms = drawRooms(plan, model, view, area.w, area.h, dpr);
  }
  ctx.drawImage(cache.rooms, area.x, area.y, area.w, area.h);
  ctx.save();
  ctx.translate(area.x, area.y);
  ctx.beginPath();
  ctx.rect(0, 0, area.w, area.h); // icons and tags pushed apart never spill out of the panel
  ctx.clip();
  // icons and lock tags that would cover each other (Moon's Juggernog and Speed Cola on one spot, Call of the Dead's
  // doors around the lighthouse) are moved apart: icons sideways, tags downwards
  const placed = []; // [x, y, half width]
  const free = (x, y, half) => !placed.some(([px, py, ph]) => Math.abs(px - x) < ph + half && Math.abs(py - y) < 21);
  for (const poi of model.pois) {
    if (poi.at[0] !== model.floor) continue;
    let [x, y] = toScreen(view, poi.at[1], poi.at[2]);
    while (!free(x, y, 14)) x += 30;
    placed.push([x, y, 14]);
    drawPoi(ctx, x, y, poi);
  }
  for (const door of model.doors) {
    if (door.at[0] !== model.floor) continue;
    let [x, y] = toScreen(view, door.at[1], door.at[2]);
    for (let tries = 0; tries < 6 && !free(x, y, 28); tries += 1) y += 22;
    placed.push([x, y, 28]);
    drawLock(ctx, x, y, door);
  }
  const here = model.players.filter((p) => p.floor === model.floor);
  for (const p of [...here.filter((q) => !q.me), ...here.filter((q) => q.me)]) drawPlayer(ctx, view, p);
  ctx.restore();
  // foot: who is who
  let x = left;
  for (const entry of model.legend) {
    x += text(ctx, entry.letter, x, box.y + box.h - FOOT / 2, { size: 12, weight: 900, color: entry.color }) + 5;
    x += text(ctx, entry.name, x, box.y + box.h - FOOT / 2, { size: 12, color: C.muted }) + 16;
  }
  text(ctx, M.close, right, box.y + box.h - FOOT / 2, { size: 12, color: C.dim, align: "right" });
}

export class MapOverlay {
  constructor() {
    this.host = document.createElement("bo1-coop-map");
    const root = this.host.attachShadow({ mode: "closed" });
    root.innerHTML = `<style>:host { all: initial; position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; display: none; } canvas { width: 100%; height: 100%; display: block; }</style><canvas></canvas>`;
    this.canvas = root.querySelector("canvas");
    this.cache = {};
    this.running = false;
  }

  mount() {
    const attach = () => {
      if (!this.host.isConnected) document.documentElement.append(this.host);
    };
    if (document.documentElement) attach();
    else document.addEventListener("DOMContentLoaded", attach, { once: true });
  }

  show(session) {
    if (this.running) return;
    this.running = true;
    this.host.style.display = "block";
    const frame = () => {
      if (!session.map.open || screen() !== "playing") {
        session.map.open = false;
        this.running = false;
        this.host.style.display = "none";
        return;
      }
      try {
        this.draw(session);
      } catch (error) {
        // never leave a frozen panel over the game: close it, and N can open it again
        session.note?.(`map drawing failed: ${error?.stack ?? error}`);
        session.map.open = false;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  draw(session) {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (this.canvas.width !== Math.round(width * dpr) || this.canvas.height !== Math.round(height * dpr)) {
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
    }
    const ctx = this.canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.model = mapModel(session, Date.now()); // the last frame's model (the real-game test reads it)
    drawMap(ctx, width, height, this.model, session.map.plan, this.cache);
  }
}
