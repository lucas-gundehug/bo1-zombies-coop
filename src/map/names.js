// Readable room names for the map. The game's zone names are technical ("foyer2_zone"); a room not in a map's table
// still gets a readable name made from its technical one ("Foyer 2").

export const ROOMS = {
  nacht: { start_zone: "Main room", box_zone: "Back room", upstairs_zone: "Help room" },
  verruckt: {
    kitchen_upstairs_zone: "Kitchen",
    power_upstairs_zone: "Power room",
    south_upstairs_zone: "South upstairs",
    south2_upstairs_zone: "South upstairs, back",
    north_upstairs_zone: "North upstairs",
    north2_upstairs_zone: "North upstairs, back",
    north_downstairs_zone: "North downstairs",
    west_downstairs_zone: "West downstairs",
    west2_downstairs_zone: "West downstairs, back",
  },
  shinonuma: {
    center_building_combined: "Main hut",
    center_building_upstairs: "Main hut upstairs",
    center_building_upstairs_buy: "Main hut stairs",
    northwest_building: "Northwest hut",
    northeast_building: "Northeast hut",
    southwest_building: "Southwest hut",
    southeast_building: "Southeast hut",
    northwest_outside: "Northwest swamp",
    northeast_outside: "Northeast swamp",
    southwest_outside: "Southwest swamp",
    southeast_outside: "Southeast swamp",
  },
  riese: {
    receiver_zone: "Mainframe",
    tp_west_zone: "West teleporter",
    tp_south_zone: "South teleporter",
    tp_east_zone: "East teleporter",
    bridge_zone: "Bridge",
    warehouse_top_zone: "Warehouse upstairs",
    warehouse_bottom_zone: "Warehouse",
    outside_south_zone: "South courtyard",
    outside_west_zone: "West courtyard",
    outside_east_zone: "East courtyard",
    wnuen_zone: "Lab building",
    wnuen_bridge_zone: "Lab walkway",
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
    conference_level1: "Conference room",
    conference_level2: "Second conference room",
    hallway_level1: "Top floor hallway",
    hallway3_level1: "Top floor, east hallway",
    war_room_zone_top: "War room, upper level",
    war_room_zone_north: "War room north",
    war_room_zone_south: "War room south",
    war_room_zone_elevator: "War room elevator",
    labs_elevator: "Lab elevator",
    labs_hallway1: "Lab hallway",
    labs_hallway2: "Lab hallway 2",
    labs_zone1: "Lab 1",
    labs_zone2: "Lab 2",
    labs_zone3: "Lab 3",
  },
  ascension: {
    base_entry_zone: "Base entrance",
    base_entry_zone2: "Base entrance, back",
    storage_zone: "Storage",
    storage_zone2: "Storage, back",
    storage_lander_zone: "Storage lander",
    access_tunnel_zone: "Access tunnel",
    power_building: "Power building",
    power_building_roof: "Power building roof",
    roof_connector_zone: "Roof walkway",
    north_path_zone: "North path",
    north_catwalk_zone3: "North catwalk",
    centrifuge_zone: "Centrifuge",
    centrifuge_zone2: "Centrifuge, upper",
    centrifuge2power_zone: "Centrifuge to power",
    control_room_zone: "Control room",
    under_rocket_zone: "Under the rocket",
  },
  cotd: {
    start_zone: "Start",
    start_beach_zone: "Starting beach",
    start_cave_zone: "Cave",
    beach_zone: "Beach",
    beach_zone2: "Upper beach",
    rear_lagoon_zone: "Lagoon",
    residence1_zone: "Residence",
    residence_roof_zone: "Residence roof",
    lighthouse1_zone: "Lighthouse",
    lighthouse2_zone: "Lighthouse, upper floor",
    catwalk_zone: "Lighthouse top",
    shipfront_near_zone: "Ship bow",
    shipfront_far_zone: "Ship bow, far end",
    shipfront_bottom_zone: "Ship bow, lower deck",
    shipfront_storage_zone: "Ship bow, storage",
    shipfront_2_beach_zone: "Ship to beach",
    shipback_near_zone: "Ship stern",
    shipback_near2_zone: "Ship stern, upper deck",
    shipback_far_zone: "Ship stern, far end",
    shipback_level3_zone: "Ship stern, top deck",
  },
  shangrila: {
    temple_start_zone: "Temple",
    power_room_zone: "Power room",
    pressure_plate_zone: "Pressure plates",
    waterfall_upper_zone: "Waterfall top",
    waterfall_upper1_zone: "Waterfall ledge",
    waterfall_lower_zone: "Waterfall bottom",
    waterfall_tunnel_zone: "Waterfall tunnel",
    waterfall_tunnel_a_zone: "Waterfall tunnel, upper",
    cave_tunnel_zone: "Cave tunnel",
    caves1_zone: "Cave 1",
    caves2_zone: "Cave 2",
    caves3_zone: "Cave 3",
    caves_water_zone: "Water cave",
  },
  moon: {
    nml_zone: "No Man's Land",
    bridge_zone: "Bridge",
    water_zone: "Water tanks",
    forest_zone: "Biodome",
    enter_forest_east_zone: "Biodome, east entrance",
    generator_zone: "Generator room",
    generator_exit_east_zone: "Generator, east exit",
    tower_zone_east: "East tower",
    tower_zone_east2: "East tower, upper",
    cata_left_start_zone: "Catacombs west, entrance",
    cata_left_middle_zone: "Catacombs west",
    cata_right_start_zone: "Catacombs east, entrance",
    cata_right_middle_zone: "Catacombs east",
    cata_right_end_zone: "Catacombs east, far end",
    airlock_bridge_zone: "Airlock to the bridge",
    airlock_biodome_zone: "Airlock to the biodome",
    airlock_labs_2_biodome: "Airlock, labs to biodome",
    airlock_digsite_zone: "Airlock to the dig site",
    airlock_generator_zone: "Airlock to the generator",
    airlock_east_zone: "East airlock",
    airlock_east2_zone: "East airlock 2",
    airlock_west_zone: "West airlock",
    airlock_west2_zone: "West airlock 2",
  },
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
