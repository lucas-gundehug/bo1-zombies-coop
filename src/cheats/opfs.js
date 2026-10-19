// Writes the mod into the page's origin private file system, which the engine mounts at /opfs.
const MARKER = "// bo1-coop-cheats";

async function dir(root, parts) {
  let d = root;
  for (const part of parts) d = await d.getDirectoryHandle(part, { create: true });
  return d;
}

async function existingText(folder, name) {
  try {
    return await (await (await folder.getFileHandle(name)).getFile()).text();
  } catch {
    return null;
  }
}

/**
 * Writes every file under `base` (a path inside OPFS, e.g. "pack-kino/files"). The shared mods/_stack files are left
 * alone when vel.gg shipped its own (no marker line). Resolves false on any error: the game then starts without the mod.
 */
export async function writeModFiles(base, files) {
  try {
    const root = await navigator.storage.getDirectory();
    for (const { path, text } of files) {
      const parts = `${base}/${path}`.split("/").filter(Boolean);
      const name = parts.pop();
      const folder = await dir(root, parts);
      if (path.startsWith("mods/_stack/")) {
        const old = await existingText(folder, name);
        if (old != null && !old.startsWith(MARKER)) continue;
      }
      const writable = await (await folder.getFileHandle(name, { create: true })).createWritable();
      await writable.write(text);
      await writable.close();
    }
    return true;
  } catch {
    return false;
  }
}
