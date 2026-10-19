// CHEAT MENU - part of the BO1 Zombies Co-op extension's fork, not of the game. Loaded through +set fs_mods "... cheats"
// (mods/_stack/maps/_modstack.gsc runs each stacked mod's register()).

register()
{
	maps\_modstack::add( "_zombiemode_ffotd::main_end", maps\cheats\_cheats::main_end );
}
