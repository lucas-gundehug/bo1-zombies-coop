// A map's floor plan, made once per map from the game (scripts/map-plan.mjs) and bundled. World units, z up.
//   { v: 1, slug, sig: "z<rooms>d<doors>",
//     floors: [{ name, below, area? }],                feet z < below → that floor (below null: any height); the last floor
//                                                      has below null; area [x0, y0, x1, y1] limits a floor to a region
//     rooms: [{ id, label: [floor, x, y], rects: [[floor, x0, y0, x1, y1], ...] }],
//     doors: [{ kind: "door" | "debris" | "power", cost, at: [floor, x, y], rooms: [a, b] }],
//     pois: [{ kind: "perk" | "pap" | "power" | "box", id, at: [floor, x, y] }] }
// The index of a room or door is what the live data (src/map/live.js) refers to; the box comes as where it stands.

const DOOR_KINDS = ["door", "debris", "power"];
const POI_KINDS = ["perk", "pap", "power", "box"];

const finite = (value) => typeof value === "number" && Number.isFinite(value);
const numbers = (value, length) => Array.isArray(value) && value.length === length && value.every(finite);
const floorIndex = (value, floors) => Number.isInteger(value) && value >= 0 && value < floors;
const at = (value, floors) => numbers(value, 3) && floorIndex(value[0], floors);

export function validPlan(plan) {
  if (!plan || plan.v !== 1 || typeof plan.slug !== "string" || typeof plan.sig !== "string") return false;
  const { floors, rooms, doors, pois } = plan;
  if (!Array.isArray(floors) || !floors.length || !Array.isArray(rooms) || !Array.isArray(doors) || !Array.isArray(pois)) return false;
  const n = floors.length;
  const floorsOk = floors.every(
    (f, i) => typeof f?.name === "string" && (f.area === undefined || numbers(f.area, 4)) && (i === n - 1 ? f.below === null : finite(f.below) || (f.below === null && f.area !== undefined)),
  );
  const roomsOk = rooms.every(
    (r) => typeof r?.id === "string" && at(r.label, n) && Array.isArray(r.rects) && r.rects.length > 0 && r.rects.every((rect) => numbers(rect, 5) && floorIndex(rect[0], n)),
  );
  const doorsOk = doors.every(
    (d) => DOOR_KINDS.includes(d?.kind) && finite(d.cost) && at(d.at, n) && Array.isArray(d.rooms) && d.rooms.length === 2 && d.rooms.every((r) => Number.isInteger(r) && r >= 0 && r < rooms.length),
  );
  const poisOk = pois.every((p) => POI_KINDS.includes(p?.kind) && (p.id === null || typeof p.id === "string") && at(p.at, n));
  return floorsOk && roomsOk && doorsOk && poisOk;
}

const inside = (area, x, y) => !area || (x >= area[0] && x <= area[2] && y >= area[1] && y <= area[3]);

/** The floor a player at (x, y) with feet height z is on: the first whose area holds the point and whose below is above z. */
export function floorOf(plan, z, x, y) {
  const i = plan.floors.findIndex((f) => inside(f.area, x, y) && (f.below === null || z < f.below));
  return i < 0 ? plan.floors.length - 1 : i;
}

/** The bounds of one floor's rooms: [x0, y0, x1, y1]. */
function bounds(plan, floor) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const room of plan.rooms) {
    for (const [f, x0, y0, x1, y1] of room.rects) {
      if (f !== floor) continue;
      b[0] = Math.min(b[0], x0, x1);
      b[1] = Math.min(b[1], y0, y1);
      b[2] = Math.max(b[2], x0, x1);
      b[3] = Math.max(b[3], y0, y1);
    }
  }
  return Number.isFinite(b[0]) ? b : [0, 0, 1, 1];
}

/**
 * Fits one floor into a width × height box, `margin` pixels in from each side. Unrotated, world +x is right and +y
 * (north) is up; turned a quarter (rotate 90), +y is right and +x is down. The turn is taken when it draws the floor
 * bigger.
 */
export function fitView(plan, floor, width, height, margin) {
  const [x0, y0, x1, y1] = bounds(plan, floor);
  const w = Math.max(x1 - x0, 1);
  const h = Math.max(y1 - y0, 1);
  const boxW = Math.max(width - 2 * margin, 1);
  const boxH = Math.max(height - 2 * margin, 1);
  const flat = Math.min(boxW / w, boxH / h);
  const turned = Math.min(boxW / h, boxH / w);
  if (turned > flat) {
    const scale = turned;
    // sx = tx + y * scale, sy = ty + x * scale, centred
    return { scale, rotate: 90, tx: width / 2 - ((y0 + y1) / 2) * scale, ty: height / 2 - ((x0 + x1) / 2) * scale };
  }
  const scale = flat;
  // sx = tx + x * scale, sy = ty - y * scale, centred
  return { scale, rotate: 0, tx: width / 2 - ((x0 + x1) / 2) * scale, ty: height / 2 + ((y0 + y1) / 2) * scale };
}

export function toScreen(view, x, y) {
  return view.rotate === 90 ? [view.tx + y * view.scale, view.ty + x * view.scale] : [view.tx + x * view.scale, view.ty - y * view.scale];
}
