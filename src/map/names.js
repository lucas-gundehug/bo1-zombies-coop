// Readable room names for the map. The game's zone names are technical ("foyer2_zone"); a room not in a map's table
// still gets a readable name made from its technical one ("Foyer 2").

const ROOMS = {
  nacht: { start_zone: "Main room", box_zone: "Back room", upstairs_zone: "Help room" },
  verruckt: { kitchen_upstairs_zone: "Kitchen", power_upstairs_zone: "Power room" },
  shinonuma: { center_building_combined: "Main hut", center_building_upstairs: "Main hut upstairs", center_building_upstairs_buy: "Main hut stairs" },
  riese: {
    receiver_zone: "Mainframe",
    tp_west_zone: "West teleporter",
    tp_south_zone: "South teleporter",
    tp_east_zone: "East teleporter",
    bridge_zone: "Bridge",
    warehouse_top_zone: "Warehouse upstairs",
    warehouse_bottom_zone: "Warehouse",
  },
  kino: {
    foyer_zone: "Lobby",
    foyer2_zone: "Upstairs lobby",
    theater_zone: "Theater",
    stage_zone: "Stage",
    west_balcony_zone: "West balcony",
    dressing_zone: "Dressing room",
    alleyway_zone: "Alley",
    dining_zone: "Dining room",
    crematorium_zone: "Crematorium",
    vip_zone: "VIP room",
  },
  five: {
    labs_zone1: "Lab 1",
    labs_zone2: "Lab 2",
    labs_zone3: "Lab 3",
    labs_hallway1: "Lab hallway",
    labs_hallway2: "Lab hallway 2",
    labs_elevator: "Lab elevator",
    war_room_zone_elevator: "War room elevator",
    war_room_zone_top: "War room, upper level",
    war_room_zone_north: "War room north",
    war_room_zone_south: "War room south",
    conference_level1: "Conference room",
  },
  ascension: { centrifuge_zone: "Centrifuge", control_room_zone: "Control room", under_rocket_zone: "Under the rocket" },
  cotd: { lighthouse1_zone: "Lighthouse", lighthouse2_zone: "Lighthouse, upper floor", catwalk_zone: "Lighthouse top", start_zone: "Start" },
  shangrila: { temple_start_zone: "Temple" },
  moon: { nml_zone: "No Man's Land" },
};

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

/**
 * Each map's floors, used when its plan is made (scripts/map-plan.mjs): the first floor whose area holds a point and
 * whose `below` is above its feet height. Split heights from the node heights in each map's dump. A map not listed has
 * one floor.
 */
export const FLOORS = {
  nacht: [
    { name: "Ground floor", below: 80 },
    { name: "Upstairs", below: null },
  ],
  verruckt: [
    { name: "Downstairs", below: 150 },
    { name: "Upstairs", below: null },
  ],
  shinonuma: [
    { name: "Ground", below: -570 },
    { name: "Upstairs", below: null },
  ],
  // riese, ascension and cotd: one floor; their bridges, catwalks, roofs and the lighthouse stack over the ground, and a
  // height split leaves holes in the map
  shangrila: [
    { name: "Caves", below: -260 },
    { name: "Temple", below: null },
  ],
  kino: [
    { name: "Ground floor", below: 180 },
    { name: "Upstairs", below: null },
  ],
  five: [
    { name: "Labs", below: -560 },
    { name: "War room", below: -250 },
    { name: "Top floor", below: null },
  ],
  moon: [
    { name: "No Man's Land", below: null, area: [10000, -20000, 20000, -10000] },
    { name: "Tunnels", below: -250 },
    { name: "Moon base", below: null },
  ],
};
