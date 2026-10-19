// In-game names for the ids the game script lists. An id not in a table still gets a readable name.

const WEAPONS = {
  m1911_zm: "M1911",
  python_zm: "Python",
  cz75_zm: "CZ75",
  cz75dw_zm: "CZ75 Dual Wield",
  ak74u_zm: "AK-74u",
  mp5k_zm: "MP5K",
  mp40_zm: "MP40",
  mpl_zm: "MPL",
  pm63_zm: "PM63",
  spectre_zm: "Spectre",
  ithaca_zm: "Stakeout",
  spas_zm: "SPAS-12",
  hs10_zm: "HS10",
  rottweil72_zm: "Olympia",
  m14_zm: "M14",
  m16_zm: "M16",
  g11_lps_zm: "G11",
  famas_zm: "FAMAS",
  aug_acog_zm: "AUG",
  galil_zm: "Galil",
  commando_zm: "Commando",
  fnfal_zm: "FN FAL",
  dragunov_zm: "Dragunov",
  l96a1_zm: "L96A1",
  rpk_zm: "RPK",
  hk21_zm: "HK21",
  m72_law_zm: "M72 LAW",
  china_lake_zm: "China Lake",
  crossbow_explosive_zm: "Crossbow",
  knife_ballistic_zm: "Ballistic Knife",
  knife_ballistic_bowie_zm: "Ballistic Knife (Bowie)",
  knife_ballistic_sickle_zm: "Ballistic Knife (Sickle)",
  ray_gun_zm: "Ray Gun",
  thundergun_zm: "Thundergun",
  tesla_gun_zm: "Wunderwaffe DG-2",
  freezegun_zm: "Winter's Howl",
  sniper_explosive_zm: "Scavenger",
  humangun_zm: "V-R11",
  shrink_ray_zm: "31-79 JGb215",
  microwavegun_zm: "Wave Gun",
  microwavegundw_zm: "Zap Guns",
  zombie_cymbal_monkey: "Monkey Bombs",
  zombie_black_hole_bomb: "Gersh Device",
  zombie_quantum_bomb: "QED",
  zombie_nesting_dolls: "Matryoshka Dolls",
  claymore_zm: "Claymores",
  spikemore_zm: "Spikemores",
  frag_grenade_zm: "Frag Grenades",
  sticky_grenade_zm: "Semtex",
  stielhandgranate: "Stielhandgranate",
  bowie_knife_zm: "Bowie Knife",
  sickle_knife_zm: "Sickle",
  m2_flamethrower_zm: "M2 Flamethrower",
  zombie_kar98k: "Kar98k",
  zombie_type99_rifle: "Arisaka",
  zombie_gewehr43: "Gewehr 43",
  zombie_m1carbine: "M1 Carbine",
  zombie_m1garand: "M1 Garand",
  zombie_thompson: "Thompson",
  zombie_type100_smg: "Type 100",
  zombie_stg44: "STG-44",
  zombie_shotgun: "Trench Gun",
  zombie_doublebarrel: "Double-Barreled Shotgun",
  zombie_doublebarrel_sawed: "Sawed-Off Shotgun",
  zombie_bar: "BAR",
  zombie_bar_bipod: "BAR (Bipod)",
  zombie_fg42: "FG42",
  zombie_mg42: "MG42",
  zombie_30cal: "Browning M1919",
  zombie_ppsh: "PPSh-41",
  zombie_ptrs41: "PTRS-41",
  zombie_sw_357: ".357 Magnum",
};

const PERKS = {
  specialty_armorvest: "Juggernog",
  specialty_quickrevive: "Quick Revive",
  specialty_fastreload: "Speed Cola",
  specialty_rof: "Double Tap",
  specialty_longersprint: "Stamin-Up",
  specialty_flakjacket: "PhD Flopper",
  specialty_deadshot: "Deadshot Daiquiri",
  specialty_additionalprimaryweapon: "Mule Kick",
};

const POWERUPS = {
  full_ammo: "Max Ammo",
  insta_kill: "Insta-Kill",
  double_points: "Double Points",
  nuke: "Nuke",
  carpenter: "Carpenter",
  fire_sale: "Fire Sale",
  minigun: "Death Machine",
  bonfire_sale: "Bonfire Sale",
  tesla: "Wunderwaffe",
  random_weapon: "Random Weapon",
  bonus_points_player: "Bonus Points",
  bonus_points_team: "Bonus Points (Team)",
  lose_points_team: "Lose Points",
  lose_perk: "Lose Perk",
  empty_clip: "Empty Clip",
  free_perk: "Free Perk",
};

/** "zombie_foo_bar_zm" -> "Foo Bar". */
function readable(id) {
  const words = String(id)
    .replace(/_zm$/, "")
    .replace(/^(zombie|specialty)_/, "")
    .split("_")
    .filter(Boolean);
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || String(id);
}

export const weaponName = (id) => WEAPONS[id] ?? readable(id);
export const perkName = (id) => PERKS[id] ?? readable(id);
export const powerupName = (id) => POWERUPS[id] ?? readable(id);
