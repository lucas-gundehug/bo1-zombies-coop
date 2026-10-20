# In-game map: spike findings (plan Task 1)

Date: 2026-10-20. Run in the real game on Kino, Five and Moon with a throwaway probe script in the `cheats` mod
(solo, Fun mode, cheat menu on). The probe and its runner were removed afterwards; the decompiled repo's mods
(`MisaDev4/bo1-zombies-decompiled`, `mods/mapkit`, `mods/sandbox`, `mods/horde`) showed which retail calls exist.

## Answers

| Question | Answer | Seen |
| --- | --- | --- |
| Rooms | `level.zones` (keys = zone names), each with `.volumes` (info_volume entities) and `.is_enabled`. | Kino 10 zones, Five 14, Moon 23. Start zones enabled, the rest 0 until a door opens. |
| Room a player is in | `player IsTouching( zone.volumes[v] )` over every zone. | The spawn room on all three. |
| Room shapes | **Path nodes**: `GetAllNodes()`, each node's room by moving one spawned `script_origin` to `node.origin + (0,0,16)` and testing `IsTouching` against the volumes. Nodes outside every room (zombie paths behind windows, out of bounds) are left out. Drawn as grid cells around each node, the rooms are clearly recognisable (pictures checked for all three maps). `GetPointInBounds` was not needed and not tried. | Nodes: Kino 1568 (58% in a room), Five 1392 (60%), Moon 2003 (82%). Zoning them takes 1.7–2.5 s of script time (one `wait .05` per 40 nodes). The node dump ("x,y,z,zone" per node) is 65–90 chunks of 380 characters and reads through the console in 7–10 s: fine offline, too slow for live use. |
| Doors and debris | `GetEntArray( "zombie_door" / "zombie_debris" / "zombie_airlock_buy", "targetname" )`. Fields: `origin`, `zombie_cost`, `target` (the triggers of one door share it: a door bought from either side has two triggers), `script_noteworthy` (`"electric_door"` = opens with the power, Kino's theater doors), `script_flag` (a flag name such as `magic_box_west_balcony2`, **not** a zone name). | Kino 12 door triggers (no debris), Five 8 door + 5 debris triggers, Moon 24 triggers (`zombie_airlock_buy`, kind 2). |
| Door opened | Opening one sets `trigger._door_open = 1` on the trigger bought (the entity stays). Opened through the retail devgui route: `SetDvar( "zombie_unlock_all", 1 )`, `trigger notify( "trigger", player, true )`, wait 1 s, set it back to 0 (as `mods/sandbox` and `mods/mapkit` do). The zones behind it then turn `is_enabled`. Treat a door as open when any trigger with its `target` has `_door_open` or is gone (`!IsDefined`), so debris that deletes itself also counts. | Kino door 0 → zones `west_balcony_zone` and `stage_zone` enabled; same on Five and Moon. |
| Points of interest | Perks `zombie_vending` (`script_noteworthy` = perk), Pack-a-Punch `zombie_vending_upgrade`, power `use_elec_switch` (Kino, Five, Moon, Ascension, Call of the Dead; found later: `use_power_switch` on Der Riese, `use_master_switch` on Verrückt, `power_trigger_left` and `power_trigger_right` on Shangri-La, all setting the `power_on` flag), boxes `level.chests` with `level.chest_index`. A hidden box's trigger is moved 10,000 units down; its real place is `chest.orig_origin` (also `chest_lid.origin`). Moon's Juggernog and Speed Cola triggers sit 10,000 units down too (z −10573): put back by adding 10,000 when z < −5000. | Kino 5 perks, 9 box spots; Five 5 perks, 6 spots; Moon 8 perks, 4 spots. |
| Players | `GetEntityNumber()`, `origin` (feet), `GetPlayerAngles()[1]` (yaw), `maps\_laststand::player_is_in_laststand()`, `sessionstate` (`"playing"`, `"spectator"`). | One player per run (solo). |
| Floors | Hand-written per map from the node heights. Kino: split at z = 180 (foyer/theater/alley/stage below; balconies, VIP and dining upstairs). Five: top floor above −250, war room −250…−560, labs below −560. Moon: No Man's Land is a separate area far from the base (x > 10000), and the base splits at z = −250 (tunnels and labs below, biodome, receiving and the rest above). **So a floor needs an optional area box as well as a height.** | Node height histograms and pictures. |
| Console speed | One dvar read takes about 110 ms (one command per 50 ms tick, then the print). 4 reads a second of `cheats_map_live` fit. | 8 reads on Kino, 105–112 ms each. |

## Decisions for the build

- Room shapes come from the zoned path nodes (Task 7 builds grid cells from them).
- Doors are listed **per trigger** (each is where a player buys it), with `rooms` found from the nearest zoned nodes on each side. A door's open bit is shared by every trigger with the same `target`. Power doors (`electric_door`) are kind `"power"`.
- A floor is `{ name, below, area? }`: `area: [x0, y0, x1, y1]` limits it to a region (Moon's No Man's Land). `floorOf(plan, z, x, y)` takes the first floor whose area contains the point (or has none) and whose `below` is above `z`.
- Box spots use `orig_origin`. Any trigger more than 5,000 units below 0 is put back up by 10,000.
- Not checked in the spike, left to the real-game tests: a debris pile's open state (Task 3 opens one on Five) and the guest receiving the map at 4 messages a second (Task 9's co-op test). The relay passes any message type on, and the host may send 80 text messages a second, so this is low risk.
