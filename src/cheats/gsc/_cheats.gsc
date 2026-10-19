#include maps\_utility;
#include common_scripts\utility;
#include maps\_zombiemode_utility;

// CHEAT MENU - the game side of Fun mode's weapons, perks, power-ups and rounds. The card sends commands in the dvar
// cheats_cmd and reads what this script publishes in cheats_* dvars (src/cheats/bridge.js).

main_end()
{
	level thread cheats_main();
}

cheats_main()
{
	flag_wait( "all_players_connected" );
	SetDvar( "cheats_state", "ready=1" );
}
