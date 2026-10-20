// Turns the game script's map dump (src/cheats/gsc/_map.gsc, cheats_map_dump_<i> joined with ";") into a floor plan
// (src/map/plan.js). Rooms are drawn from their path nodes: every 48-unit grid cell within reach of a room's node goes
// to the room whose node is nearest, then each room's cells are merged into rectangles.
import { floorOf } from "../src/map/plan.js";

const CELL = 48;
const REACH = 80; // a node fills the cells whose centre is this close
const LONELY = 48; // half the side of the square drawn for a room without nodes
const DOOR_REACH = 600; // the rooms a door joins: those of the nearest nodes this close

function parseDump(text) {
  const out = { zones: [], doors: [], pois: [], nodes: [] };
  for (const record of String(text).split(";").filter(Boolean)) {
    const f = record.split(",");
    const n = (i) => Number(f[i]);
    if (f[0] === "Z") out.zones.push({ id: f[1], x: n(2), y: n(3), z: n(4) });
    else if (f[0] === "D") out.doors.push({ kind: f[1], x: n(2), y: n(3), z: n(4), cost: n(5), target: f[6] });
    else if (f[0] === "P") out.pois.push({ kind: f[1], id: f[2] === "-" ? null : f[2], x: n(3), y: n(4), z: n(5) });
    else if (f[0] === "N") out.nodes.push({ x: n(1), y: n(2), z: n(3), room: n(4) });
  }
  return out;
}

/** Cells of one room on one floor -> rectangles: runs along each row, then equal runs on the next rows joined. */
function cellsToRects(floor, cells) {
  const rows = new Map();
  for (const key of cells) {
    const [gx, gy] = key.split(",").map(Number);
    if (!rows.has(gy)) rows.set(gy, []);
    rows.get(gy).push(gx);
  }
  const done = [];
  let open = new Map(); // "gx0,gx1" -> rect still growing
  for (const gy of [...rows.keys()].sort((a, b) => a - b)) {
    const xs = rows.get(gy).sort((a, b) => a - b);
    const runs = [];
    for (const gx of xs) {
      const last = runs[runs.length - 1];
      if (last && gx === last[1] + 1) last[1] = gx;
      else runs.push([gx, gx]);
    }
    const next = new Map();
    for (const [gx0, gx1] of runs) {
      const key = `${gx0},${gx1}`;
      const rect = open.get(key);
      if (rect && rect.gy1 === gy - 1) {
        rect.gy1 = gy;
        next.set(key, rect);
        open.delete(key);
      } else next.set(key, { gx0, gx1, gy0: gy, gy1: gy });
    }
    done.push(...open.values());
    open = next;
  }
  done.push(...open.values());
  return done.map((r) => [floor, r.gx0 * CELL, r.gy0 * CELL, (r.gx1 + 1) * CELL, (r.gy1 + 1) * CELL]);
}

const area = ([, x0, y0, x1, y1]) => (x1 - x0) * (y1 - y0);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export function buildPlan(dumpText, { slug, floors }) {
  const dump = parseDump(dumpText);
  const plan0 = { floors };
  const floorAt = (p) => floorOf(plan0, p.z, p.x, p.y);
  // the nearest node wins each cell: (floor, cell) -> { room, d }
  const owners = new Map();
  const steps = Math.ceil(REACH / CELL);
  for (const node of dump.nodes) {
    const f = floorAt(node);
    const cx = Math.floor(node.x / CELL);
    const cy = Math.floor(node.y / CELL);
    for (let gx = cx - steps; gx <= cx + steps; gx += 1) {
      for (let gy = cy - steps; gy <= cy + steps; gy += 1) {
        const d = Math.hypot((gx + 0.5) * CELL - node.x, (gy + 0.5) * CELL - node.y);
        if (d > REACH) continue;
        const key = `${f}|${gx},${gy}`;
        const best = owners.get(key);
        if (!best || d < best.d) owners.set(key, { room: node.room, d });
      }
    }
  }
  const cells = dump.zones.map(() => new Map()); // room -> floor -> Set of "gx,gy"
  for (const [key, { room }] of owners) {
    const [f, cell] = key.split("|");
    if (!cells[room]) continue;
    if (!cells[room].has(Number(f))) cells[room].set(Number(f), new Set());
    cells[room].get(Number(f)).add(cell);
  }
  const rooms = dump.zones.map((zone, i) => {
    const rects = [...cells[i]].flatMap(([f, set]) => cellsToRects(f, set));
    if (!rects.length) {
      const f = floorAt(zone);
      return { id: zone.id, label: [f, zone.x, zone.y], rects: [[f, zone.x - LONELY, zone.y - LONELY, zone.x + LONELY, zone.y + LONELY]] };
    }
    // the label goes on the floor holding most of the room's nodes (a staircase's foot is not its room), on its biggest
    // patch there
    const counts = new Map();
    for (const node of dump.nodes) if (node.room === i) counts.set(floorAt(node), (counts.get(floorAt(node)) ?? 0) + 1);
    const homeFloor = [...counts].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    const home = rects.filter((r) => r[0] === homeFloor);
    const big = (home.length ? home : rects).reduce((a, b) => (area(b) > area(a) ? b : a));
    return { id: zone.id, label: [big[0], Math.round((big[1] + big[3]) / 2), Math.round((big[2] + big[4]) / 2)], rects };
  });
  const doors = dump.doors.map((door) => {
    const near = dump.nodes
      .map((node) => ({ room: node.room, d: dist(node, door) }))
      .filter((n) => n.d <= DOOR_REACH)
      .sort((a, b) => a.d - b.d);
    const a = near[0]?.room ?? 0;
    const b = near.find((n) => n.room !== a)?.room ?? a;
    return { kind: door.kind, cost: door.cost, at: [floorAt(door), door.x, door.y], rooms: [a, b] };
  });
  const pois = dump.pois.map((p) => ({ kind: p.kind, id: p.id, at: [floorAt(p), p.x, p.y] }));
  return { v: 1, slug, sig: `z${dump.zones.length}d${dump.doors.length}`, floors, rooms, doors, pois };
}
