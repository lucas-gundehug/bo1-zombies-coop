// Readable room names for the map. The game's zone names are technical ("foyer2_zone"); a room not in a map's table
// still gets a readable name made from its technical one ("Foyer 2").

const ROOMS = {};

export function roomName(slug, id) {
  const known = ROOMS[slug]?.[id];
  if (known) return known;
  const words = String(id)
    .replace(/zone/g, " ")
    .replace(/_/g, " ")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .trim()
    .replace(/\s+/g, " ");
  return words ? words[0].toUpperCase() + words.slice(1) : String(id);
}
