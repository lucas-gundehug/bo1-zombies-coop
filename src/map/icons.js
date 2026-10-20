// The game's own icons for the map: perk machines and the Mystery Box. They are read while playing from the game files
// vel.gg keeps in the browser (the map pack's .iwd archives in OPFS, zip files of .iwi images), so no game artwork is
// bundled with the extension. Without them the map falls back to text labels.

/** Map icon id (a perk's id as the game script names it, or "box") -> the .iwi inside the pack's .iwd archives. */
export const ICON_FILES = {
  specialty_armorvest: "images/specialty_juggernaut_zombies.iwi",
  specialty_fastreload: "images/specialty_fastreload_zombies.iwi",
  specialty_rof: "images/specialty_doubletap_zombies.iwi",
  specialty_quickrevive: "images/specialty_quickrevive_zombies.iwi",
  specialty_additionalprimaryweapon: "images/specialty_three_guns_zombies.iwi",
  specialty_flakjacket: "images/specialty_divetonuke_zombies.iwi",
  specialty_longersprint: "images/specialty_marathon_zombies.iwi",
  specialty_deadshot: "images/specialty_ads_zombies.iwi",
  box: "images/minimap_icon_mystery_box.iwi",
};

const FORMATS = { 0x0b: "dxt1", 0x0c: "dxt3", 0x0d: "dxt5" };

/** The entries of a zip central directory: [{ name, method, size, offset }] (offset = its local header). */
export function zipEntries(cd) {
  const view = new DataView(cd.buffer, cd.byteOffset, cd.byteLength);
  const decoder = new TextDecoder();
  const out = [];
  for (let p = 0; p + 46 <= cd.byteLength && view.getUint32(p, true) === 0x02014b50; ) {
    const nameLength = view.getUint16(p + 28, true);
    const extra = view.getUint16(p + 30, true);
    const comment = view.getUint16(p + 32, true);
    out.push({
      name: decoder.decode(cd.subarray(p + 46, p + 46 + nameLength)),
      method: view.getUint16(p + 10, true),
      size: view.getUint32(p + 20, true),
      offset: view.getUint32(p + 42, true),
    });
    p += 46 + nameLength + extra + comment;
  }
  return out;
}

/** An .iwi image: { width, height, format, data } of its full-size mip (stored last), or null when unusable. */
export function parseIwi(bytes) {
  if (bytes.length < 48 || bytes[0] !== 0x49 || bytes[1] !== 0x57 || bytes[2] !== 0x69) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const format = FORMATS[bytes[4]];
  const width = view.getUint16(6, true);
  const height = view.getUint16(8, true);
  const end = view.getUint32(16, true);
  const start = view.getUint32(20, true);
  if (!format || !width || !height || start < 48 || end > bytes.length || end <= start) return null;
  return { width, height, format, data: bytes.subarray(start, end) };
}

const rgb565 = (c) => [(((c >> 11) & 31) * 255) / 31, (((c >> 5) & 63) * 255) / 63, ((c & 31) * 255) / 31];
const mix = (a, b, wa, wb) => a.map((v, i) => (v * wa + b[i] * wb) / (wa + wb));

/** Decodes DXT1/3/5 data into RGBA pixels (width × height × 4). */
export function decodeDxt(data, width, height, format) {
  const out = new Uint8ClampedArray(width * height * 4);
  const blockBytes = format === "dxt1" ? 8 : 16;
  const blocksX = Math.max(1, Math.ceil(width / 4));
  const blocksY = Math.max(1, Math.ceil(height / 4));
  for (let by = 0; by < blocksY; by += 1) {
    for (let bx = 0; bx < blocksX; bx += 1) {
      const at = (by * blocksX + bx) * blockBytes;
      if (at + blockBytes > data.length) return out;
      const colorAt = format === "dxt1" ? at : at + 8;
      const c0 = data[colorAt] | (data[colorAt + 1] << 8);
      const c1 = data[colorAt + 2] | (data[colorAt + 3] << 8);
      const p0 = rgb565(c0);
      const p1 = rgb565(c1);
      const fourColors = format !== "dxt1" || c0 > c1;
      const palette = fourColors ? [p0, p1, mix(p0, p1, 2, 1), mix(p0, p1, 1, 2)] : [p0, p1, mix(p0, p1, 1, 1), [0, 0, 0]];
      const alphas = format === "dxt5" ? dxt5Alphas(data[at], data[at + 1]) : null;
      for (let y = 0; y < 4; y += 1) {
        for (let x = 0; x < 4; x += 1) {
          const px = bx * 4 + x;
          const py = by * 4 + y;
          if (px >= width || py >= height) continue;
          const index = (data[colorAt + 4 + y] >> (2 * x)) & 3;
          const o = (py * width + px) * 4;
          [out[o], out[o + 1], out[o + 2]] = palette[index];
          if (format === "dxt1") out[o + 3] = !fourColors && index === 3 ? 0 : 255;
          else if (format === "dxt3") out[o + 3] = ((data[at + 2 * y + (x >> 1)] >> (4 * (x & 1))) & 15) * 17;
          else out[o + 3] = alphas[dxt5Index(data, at, y * 4 + x)];
        }
      }
    }
  }
  return out;
}

function dxt5Alphas(a0, a1) {
  if (a0 > a1) return [a0, a1, ...[6, 5, 4, 3, 2, 1].map((w) => (w * a0 + (7 - w) * a1) / 7)];
  return [a0, a1, ...[4, 3, 2, 1].map((w) => (w * a0 + (5 - w) * a1) / 5), 0, 255];
}

/** The 3-bit alpha index of pixel i (0..15) in a DXT5 block's 48-bit index field (bytes 2..7). */
function dxt5Index(data, at, i) {
  const bit = i * 3;
  const byte = at + 2 + (bit >> 3);
  const value = data[byte] | ((data[byte + 1] ?? 0) << 8);
  return (value >> (bit & 7)) & 7;
}

/** Reads the map's icons from the game files in the browser: Map(id -> canvas). Empty when they can't be read. */
export async function loadIcons(slug) {
  const icons = new Map();
  try {
    const root = await navigator.storage.getDirectory();
    const main = await findMain(root, slug);
    if (!main) return icons;
    const wanted = new Map(Object.entries(ICON_FILES).map(([id, file]) => [file, id]));
    for await (const [name, handle] of main.entries()) {
      if (!wanted.size) break;
      if (!name.endsWith(".iwd") || handle.kind !== "file") continue;
      const file = await handle.getFile();
      for (const entry of await archiveEntries(file)) {
        const id = wanted.get(entry.name);
        if (!id) continue;
        wanted.delete(entry.name);
        const image = parseIwi(await entryBytes(file, entry));
        if (image) icons.set(id, toCanvas(image));
      }
    }
  } catch {
    // no icons: the map uses text labels
  }
  return icons;
}

async function findMain(root, slug) {
  for (const pack of [`pack-${slug}`, "pack"]) {
    try {
      return await (await (await root.getDirectoryHandle(pack)).getDirectoryHandle("files")).getDirectoryHandle("main");
    } catch {
      // try the next one
    }
  }
  return null;
}

async function archiveEntries(file) {
  const tail = new Uint8Array(await file.slice(Math.max(0, file.size - 65557)).arrayBuffer());
  const view = new DataView(tail.buffer);
  for (let i = tail.length - 22; i >= 0; i -= 1) {
    if (view.getUint32(i, true) !== 0x06054b50) continue;
    const size = view.getUint32(i + 12, true);
    const offset = view.getUint32(i + 16, true);
    return zipEntries(new Uint8Array(await file.slice(offset, offset + size).arrayBuffer()));
  }
  return [];
}

async function entryBytes(file, entry) {
  const head = new DataView(await file.slice(entry.offset, entry.offset + 30).arrayBuffer());
  const start = entry.offset + 30 + head.getUint16(26, true) + head.getUint16(28, true);
  const raw = file.slice(start, start + entry.size);
  if (entry.method === 0) return new Uint8Array(await raw.arrayBuffer());
  const stream = raw.stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function toCanvas({ width, height, format, data }) {
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d").putImageData(new ImageData(decodeDxt(data, width, height, format), width, height), 0, 0);
  return canvas;
}
