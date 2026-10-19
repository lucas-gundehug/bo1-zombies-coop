# Cheat menu for BO1 Zombies Co-op (fork) — design

Date: 2026-10-19. Owner: Lucas (does not code; Claude builds and maintains it).

## Intent

Lucas plays Black Ops 1 Zombies on vel.gg/bsz with friends through the co-op extension
(github.com/AllanLotta/bo1-zombies-coop, v2.2.2). Its "Fun mode" panel (host or solo only) already gives
points, god mode, ammo, zombie and world toggles, and a fixed list of 24 weapons for the host. Two things
bother him:

1. The weapon list is the same on every map, so on each map some buttons do nothing (on Moon he wanted the
   dual Zap Guns, which are not in the list at all).
2. It cannot give perks, cannot Pack-a-Punch, cannot give weapons to his friends, and has no control over
   rounds or power-ups.

He wants Fun mode to know what each map has and to hand anything to anyone in the game. "Make it good and
simple."

## Goals

In Fun mode, for a chosen player (any player in the game, or everyone):

- **Weapons**: a list of exactly the weapons that exist on the current map, read from the game when the
  map loads (not a hand-written list). Giving one uses the game's own give function (the Mystery Box path).
- **Pack-a-Punch**: upgrades the weapon the chosen player is holding, the way the game's devgui does.
- **Perks**: the perks whose machines exist on the current map, read from the game. Free (the cost is
  covered). Giving a perk uses that perk's machine on the player's behalf; if the power is off, the power is
  switched on first, for the whole map (Lucas accepted this).
- **Power-ups**: the power-ups this map includes (read from the game), dropped right in front of the
  chosen player so they pick it up as in the real game.

For the game as a whole:

- **Round editor**: jump to any round, forwards or backwards (e.g. from 20 back to 10), and "next round".
- **Freeze round**: while on, the round does not advance, even if every zombie is dead. The round's
  zombies spawn and are killed as usual; once they are all dead the map stays quiet and no new round
  starts until Freeze is switched off, then the game moves on to the next round as normal (Lucas's words:
  "it does not move forward even if all mobs are killed before you unfreeze"). A round jump or "next
  round" while frozen goes to that round and stays frozen there (builder's call).

Everything already in Fun mode stays (points, god mode, ammo, zombies, world, reset), except the fixed
weapon grid, which the map's own list replaces.

## Non-goals

- No "pause round" (Lucas dropped it).
- No visual redesign of the card; new sections follow Fun mode's existing look and controls.
- Guests (friends) do not get the cheat panel; only the host or a solo player, as today.
- No changes on vel.gg's side, no Chrome Web Store publishing.

## Anti-goals (a failure even if it "works")

- Friends can no longer join Lucas's games, or have to install anything new. Friends keep the normal
  public extension.
- A button that silently does nothing. Every action either works or the card says why (as Fun mode's
  "not on this map" notice does today).
- The game breaks or behaves differently when the cheat menu is not used (a normal run with the fork must
  play like the original).

## How it gets made (decided)

- **Where**: Lucas's own fork of AllanLotta/bo1-zombies-coop under github.com/lucas-gundehug, cloned to
  `~/Projects/bo1-zombies-coop`. Upstream fixes are merged into the fork when vel.gg changes. Once it works,
  it may be offered upstream as a pull request (Lucas's call, later).
- **Mechanism (proven in a spike on 2026-10-19, Kino, no extension)**: vel.gg's engine
  (github.com/MisaDev4/bo1-zombies-decompiled) has a mod stack. With `+set fs_mods "<name>"` on the engine's
  command line it reads `mods/_stack/...` and `mods/<name>/...` under the map pack's base folder, and runs
  each mod's `maps/<name>/_hooks.gsc` `register()`. In the browser that base folder is the page's OPFS
  directory `pack-<slug>/files/` (the engine's `fs_b` is `/opfs/pack-<slug>/files`). The pack vel.gg
  downloads has no `mods/` folder, so the extension writes:
  - `mods/_stack/maps/_modstack.gsc` and `mods/_stack/maps/_zombiemode_ffotd.gsc` (copied from the
    decompiled repo's `mods/_stack/maps/`; they are the retail ffotd plus the stack hooks), and
  - `mods/cheats/maps/cheats/_hooks.gsc` and `mods/cheats/maps/cheats/_cheats.gsc` (ours),
  then adds `+set fs_mods cheats` before `+devmap`. The extension already wraps `Module.callMain` to edit
  the command line (src/session/hooks.js); today it does that only in co-op sessions, the cheat menu also
  needs it solo.
- **What the spike proved** (log in `user/main/games_mp.log` with `+set g_log games_mp.log`):
  the script runs (on-screen text); `level.zombie_weapons` lists the map's 36 weapons with their
  `upgrade_name`; `GetEntArray("zombie_vending","targetname")` lists the perk machines by
  `script_noteworthy` (Kino: quick revive, speed cola, double tap, juggernog, mule kick);
  `maps\_zombiemode_weapons::weapon_give()` gives a weapon; the devgui-style pack (TakeWeapon, GiveWeapon
  with `get_pack_a_punch_weapon_options`, GiveStartAmmo, SwitchToWeapon) upgrades it; the `use_elec_switch`
  trigger turns the power on; notifying a vending trigger with the player gives the perk (Juggernog: HasPerk
  true, maxhealth 250). One `LogPrint` line of ~1 KB was dropped, so long lists must be split.
- The decompiled repo's `mods/sandbox/maps/sandbox/_sandbox.gsc` (Five only) already implements most actions
  with retail functions and is the reference: power on, perk via machine, pack, weapon give, power-up drop
  (`maps\_zombiemode_powerups::specific_powerup_drop`, list from `level.zombie_include_powerups`), next round
  and set round, spawning on/off.
- **Commands** go from the card to the script through the engine console the extension already drives
  (`EngineMemory.command`, e.g. `set cheats_cmd "<action> <player> <arg>"`); the script polls the dvar.

## Constraints

- Lucas's friends run the public extension. The fork must stay join-compatible with it (joining checks
  the engine hash; keep the session protocol unchanged), and the host must not pass `cheats` to guests
  (today `gameSettings()` in src/game/page.js forwards `fs_mods` to guests, who do not have the files).
- **vel.gg's own mods (decided by Claude)**: Hell mode starts with `+set fs_mods "horde zinfo"` through
  the same mod stack, and `noperks` / `zinfo` are options too. The fork must not break them: append
  `cheats` to an existing `fs_mods` value instead of replacing it, forward only vel.gg's own names to
  guests, and never overwrite mod files vel.gg itself ships (check what is in the pack's `mods/` before
  writing `_stack`; the spike only looked at normal mode on Kino). Giving weapons, perks, Pack-a-Punch and
  power-ups should work in Hell mode too; if the round editor or Freeze round cannot work with horde's
  round logic, the card hides them in Hell mode and says so.
- Works on all ten maps; each map's lists come from the game, so no per-map tables to maintain, except
  friendly display names (see below).
- vel.gg updates its engine often; keep the fork's changes small and separate from upstream code so merges
  stay easy.
- Install for Lucas: he plays on another PC (his gaming laptop). Provide a zip on the fork's GitHub
  Releases page (upstream already has `npm run package`) and short steps: remove the store/upstream
  extension, then load the unpacked folder.
- Repo conventions: follow the fork's own lint/build/test (`npm run check`); commits use
  `lucas.g@live.dk`.

## Left to the builder

- How the game's lists (weapons, perks, power-ups, current round, freeze state) get back to the card.
  Options: the script writes a dvar the extension reads from engine memory, or a file in OPFS, or HUD text.
  Reading `games_mp.log` while the engine runs may be blocked by the engine's open file handle; verify.
- Friendly names for weapon, perk and power-up ids (e.g. `microwavegundw_zm` → "Zap Guns"). A label table
  for known ids with a cleaned-up id as fallback is fine.
- How to map the card's player choice to the script's player (the card uses engine slot numbers; the
  script can match `GetEntityNumber()`).
- The exact freeze-round mechanism (e.g. holding the round open until unfrozen), and how a backwards round
  jump is done (round number plus zombie health and count for that round, as the round would start).
- Where `use_elec_switch` does not exist (maps with other power setups, e.g. Shangri-La, Moon, Nacht has no
  perks), find each map's way or fall back to giving the perk directly; the card must say when a perk cannot
  be given.
- When to write the mod files to OPFS (they must be in place before the engine starts; rewriting them on
  every load is fine).
- Test approach. The spike's Playwright scripts (load a map with extra engine args, read OPFS) show how to
  check it on the real site; the upstream repo has `test/e2e.mjs`.
