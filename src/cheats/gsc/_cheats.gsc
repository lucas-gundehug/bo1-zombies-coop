#include maps\_utility;
#include common_scripts\utility;
#include maps\_zombiemode_utility;

// CHEAT MENU - the game side of Fun mode's weapons, perks, power-ups and rounds. The card sends commands in the dvar
// cheats_cmd ("<seq> <action> <target> [arg]", target a client number or "all") and reads what this script publishes:
//   cheats_state           ready=1 seq= round= frozen= power= horde= lists=
//   cheats_weapons_count   number of cheats_weapons_<i> chunks (comma-separated weapon names)
//   cheats_perks           perk machines on this map (their perk names)
//   cheats_powerups        power-ups this map includes
//   cheats_results         the latest results, newest first, ";"-separated: "<seq> ok" or "<seq> err <code> [detail]"
//                          (commands run in threads of their own, so a slow perk can answer after a later command)
// Every effect calls the retail scripts' own functions, as the decompiled repo's mods/sandbox does.

main_end()
{
	level.cheats_seq = 0;
	level.cheats_lists = 0;
	level.cheats_frozen = false;
	level.cheats_hold = false;
	level.cheats_round_active = false;
	level.cheats_results = [];
	SetDvar( "cheats_cmd", "" );
	SetDvar( "cheats_results", "" );
	level thread cheats_round_tracker();
	level thread cheats_main();
	level thread maps\cheats\_map::map_main();
}

cheats_main()
{
	flag_wait( "all_players_connected" );
	level thread cheats_state_loop();
	level thread cheats_freeze_loop();
	level thread cheats_health_loop();
	level thread cheats_publish_lists_later();
	for ( ;; )
	{
		cmd = GetDvar( #"cheats_cmd" );
		if ( cmd != "" )
		{
			SetDvar( "cheats_cmd", "" );
			level thread cheats_handle( cmd );
		}
		wait( .05 );
	}
}

//-------------------------------------------------------------------------------
// published state
//-------------------------------------------------------------------------------

cheats_bit( value )
{
	if ( is_true( value ) )
	{
		return "1";
	}
	return "0";
}

// flag() on a flag this map never made is not safe; these are made by some maps only
cheats_flag( name )
{
	return IsDefined( level.flag ) && IsDefined( level.flag[name] ) && level.flag[name];
}

cheats_horde()
{
	return GetDvarInt( #"cheats_horde" ) == 1;
}

cheats_state_loop()
{
	for ( ;; )
	{
		SetDvar( "cheats_state", "ready=1 seq=" + level.cheats_seq + " round=" + level.round_number + " frozen=" + cheats_bit( level.cheats_frozen ) + " power=" + cheats_bit( cheats_flag( "power_on" ) ) + " horde=" + cheats_bit( cheats_horde() ) + " lists=" + level.cheats_lists + " zombies=" + get_enemy_count() + " left=" + level.zombie_total + " active=" + cheats_bit( level.cheats_round_active ) + " intermission=" + cheats_bit( level.intermission ) + " spawn=" + cheats_bit( cheats_flag( "spawn_zombies" ) ) );
		wait( .5 );
	}
}

// the Mule Kick machine and some maps' extras are placed after main_end: publish once everyone is in
cheats_publish_lists_later()
{
	flag_wait( "all_players_spawned" );
	wait( 2 );
	cheats_publish_lists();
}

cheats_publish_lists()
{
	level.cheats_upgrades = [];
	keys = GetArrayKeys( level.zombie_weapons );
	chunk = "";
	count = 0;
	n = 0;
	for ( i = 0; i < keys.size; i++ )
	{
		if ( IsDefined( level.zombie_weapons[keys[i]].upgrade_name ) )
		{
			level.cheats_upgrades[level.zombie_weapons[keys[i]].upgrade_name] = keys[i];
		}
		if ( n > 0 )
		{
			chunk = chunk + ",";
		}
		chunk = chunk + keys[i];
		n++;
		if ( n == 8 || i == keys.size - 1 )
		{
			SetDvar( "cheats_weapons_" + count, chunk );
			count++;
			chunk = "";
			n = 0;
		}
	}
	SetDvar( "cheats_weapons_count", count );

	perks = "";
	vending = GetEntArray( "zombie_vending", "targetname" );
	for ( i = 0; i < vending.size; i++ )
	{
		perk = vending[i].script_noteworthy;
		if ( !IsDefined( perk ) || IsSubStr( perks, perk ) )
		{
			continue;
		}
		if ( perks != "" )
		{
			perks = perks + ",";
		}
		perks = perks + perk;
	}
	SetDvar( "cheats_perks", perks );

	powerups = "";
	if ( IsDefined( level.zombie_include_powerups ) )
	{
		keys = GetArrayKeys( level.zombie_include_powerups );
		for ( i = 0; i < keys.size; i++ )
		{
			if ( powerups != "" )
			{
				powerups = powerups + ",";
			}
			powerups = powerups + keys[i];
		}
	}
	SetDvar( "cheats_powerups", powerups );
	level.cheats_lists++;
}

//-------------------------------------------------------------------------------
// commands
//-------------------------------------------------------------------------------

cheats_handle( cmd )
{
	tokens = StrTok( cmd, " " );
	if ( tokens.size < 2 )
	{
		return;
	}
	seq = int( tokens[0] );
	if ( seq <= level.cheats_seq )
	{
		return;	// already handled (the card resends nothing, but a stale value must not run twice)
	}
	level.cheats_seq = seq;
	action = tokens[1];
	target = "";
	arg = "";
	if ( tokens.size > 2 )
	{
		target = tokens[2];
	}
	if ( tokens.size > 3 )
	{
		arg = tokens[3];
	}

	result = "";
	switch ( action )
	{
	case "round":
		result = cheats_round( int( target ) );
		break;
	case "next":
		result = cheats_round( level.round_number + 1 );
		break;
	case "freeze":
		result = cheats_freeze( target == "1" );
		break;
	case "clear":
		result = cheats_clear();
		break;
	case "mapdoor":
		result = maps\cheats\_map::map_open_door( int( target ) );
		break;
	default:
		result = cheats_for_players( action, target, arg );
		break;
	}
	if ( result == "" )
	{
		cheats_publish_result( seq + " ok" );
	}
	else
	{
		cheats_publish_result( seq + " err " + result );
	}
}

cheats_publish_result( entry )
{
	results = [];
	results[0] = entry;
	for ( i = 0; i < level.cheats_results.size && results.size < 8; i++ )
	{
		results[results.size] = level.cheats_results[i];
	}
	level.cheats_results = results;
	text = "";
	for ( i = 0; i < results.size; i++ )
	{
		if ( i > 0 )
		{
			text = text + ";";
		}
		text = text + results[i];
	}
	SetDvar( "cheats_results", text );
}

// runs a player action for one player or everyone: ok when it worked for anyone, else the first error
cheats_for_players( action, target, arg )
{
	players = get_players();
	chosen = [];
	waiting = false;
	for ( i = 0; i < players.size; i++ )
	{
		if ( target == "all" || players[i] GetEntityNumber() == int( target ) )
		{
			// a player who joined mid-round spectates until the next one: what they got now would be lost
			if ( !IsDefined( players[i].sessionstate ) || players[i].sessionstate != "playing" )
			{
				waiting = true;
				continue;
			}
			chosen[chosen.size] = players[i];
		}
	}
	if ( chosen.size == 0 && waiting )
	{
		return "not_spawned";
	}
	if ( chosen.size == 0 || target == "" )
	{
		return "no_player";
	}
	first_error = "";
	any_ok = false;
	for ( i = 0; i < chosen.size; i++ )
	{
		result = chosen[i] cheats_player_action( action, arg );
		if ( result == "" )
		{
			any_ok = true;
		}
		else if ( first_error == "" )
		{
			first_error = result;
		}
	}
	if ( any_ok )
	{
		return "";
	}
	return first_error;
}

cheats_player_action( action, arg )
{
	switch ( action )
	{
	case "give":
		return self cheats_give( arg );
	case "pap":
		return self cheats_pap();
	case "perk":
		return self cheats_perk( arg );
	case "powerup":
		return self cheats_powerup( arg );
	case "health":
		return self cheats_health( int( arg ) );
	}
	return "bad_action " + action;
}

// the Mystery Box's own give function (weapon_give), as sandbox pad_weapon()
cheats_give( weapon )
{
	if ( !IsDefined( level.zombie_weapons[weapon] ) )
	{
		return "no_weapon " + weapon;
	}
	if ( self HasWeapon( weapon ) )
	{
		self SwitchToWeapon( weapon );
		return "";
	}
	self maps\_zombiemode_weapons::weapon_give( weapon );
	return "";
}

// follows zombie_devgui_pack_current_weapon(), as sandbox pad_pack_current_weapon()
cheats_pap()
{
	weapon = self GetCurrentWeapon();
	if ( IsDefined( level.cheats_upgrades ) && IsDefined( level.cheats_upgrades[weapon] ) )
	{
		return "has_upgrade " + weapon;
	}
	if ( self maps\_zombiemode_weapons::has_upgrade( weapon ) )
	{
		return "has_upgrade " + weapon;
	}
	if ( !IsDefined( level.zombie_weapons[weapon] ) || !IsDefined( level.zombie_weapons[weapon].upgrade_name ) )
	{
		return "no_upgrade " + weapon;
	}
	upgrade = level.zombie_weapons[weapon].upgrade_name;
	self TakeWeapon( weapon );
	self GiveWeapon( upgrade, 0, self maps\_zombiemode_weapons::get_pack_a_punch_weapon_options( upgrade ) );
	self GiveStartAmmo( upgrade );
	self SwitchToWeapon( upgrade );
	return "";
}

cheats_power_event( perk )
{
	switch ( perk )
	{
	case "specialty_armorvest":
		return "juggernog_on";
	case "specialty_quickrevive":
		return "revive_on";
	case "specialty_fastreload":
		return "sleight_on";
	case "specialty_rof":
		return "doubletap_on";
	case "specialty_longersprint":
		return "marathon_on";
	case "specialty_flakjacket":
		return "divetonuke_on";
	case "specialty_deadshot":
		return "deadshot_on";
	case "specialty_additionalprimaryweapon":
		return "additionalprimaryweapon_on";
	}
	return perk + "_on";
}

// the retail map power switch, as sandbox_power_on(); waits up to 10 s for the power to come on
cheats_power_on( player )
{
	if ( cheats_flag( "power_on" ) )
	{
		return;
	}
	trig = GetEnt( "use_elec_switch", "targetname" );
	if ( IsDefined( trig ) )
	{
		trig notify( "trigger", player );
	}
	for ( i = 0; i < 100 && !cheats_flag( "power_on" ); i++ )
	{
		wait( .1 );
	}
}

// One perk at a time per player: the free-points and perk-count bookkeeping below must not interleave (two quick
// clicks ran in two threads and left the player 20000 points).
// Health levels: the player's maximum health is the game's own (100, or Juggernog's) times pct / 100. The game sets
// maxhealth itself on a perk, a revive or a respawn; cheats_health_loop notices (maxhealth is no longer the value we
// set), takes that as the new base, and puts the level back on top of it.
cheats_health( pct )
{
	if ( pct < 100 || pct > 1000 )
	{
		return "bad_health " + pct;
	}
	self.cheats_health = pct;
	self cheats_health_apply();
	self.health = self.maxhealth;
	return "";
}

cheats_health_apply()
{
	if ( !IsDefined( self.cheats_health ) )
	{
		return;
	}
	if ( !IsDefined( self.cheats_health_set ) || self.maxhealth != self.cheats_health_set )
	{
		self.cheats_health_base = self.maxhealth;
	}
	target = int( self.cheats_health_base * self.cheats_health / 100 );
	// Health regeneration (setnormalhealth) heals up to the client's session max, which only SetMaxHealth sets;
	// writing self.maxhealth leaves it behind. getnormalhealth is health / session max, so it tells whether the two
	// still agree. SetMaxHealth fills the health up; keep the player as hurt as they were, by ratio.
	if ( self.health <= 0 )
	{
		return;
	}
	normal = self getnormalhealth();
	if ( self.maxhealth != target || int( self.health / normal + .5 ) != target )
	{
		self SetMaxHealth( target );
		health = int( normal * target + .5 );
		if ( health < 1 )
		{
			health = 1;
		}
		if ( health < target )
		{
			self.health = health;
		}
	}
	self.cheats_health_set = target;
}

cheats_health_loop()
{
	for ( ;; )
	{
		players = get_players();
		for ( i = 0; i < players.size; i++ )
		{
			player = players[i];
			if ( !IsDefined( player.cheats_health ) || !IsDefined( player.sessionstate ) || player.sessionstate != "playing" )
			{
				continue;
			}
			if ( player maps\_laststand::player_is_in_laststand() )
			{
				continue;
			}
			player cheats_health_apply();
		}
		wait( .5 );
	}
}

cheats_perk( perk )
{
	while ( is_true( self.cheats_perk_busy ) )
	{
		wait( .1 );
	}
	self.cheats_perk_busy = true;
	result = self cheats_perk_now( perk );
	self.cheats_perk_busy = false;
	return result;
}

// uses the perk's own machine for the player (the retail bottle, HUD and effect), as sandbox pad_perk(); free: the
// points it costs are given first and the score is set back afterwards. The machine refuses a fifth perk (BO1's limit
// of 4, counted in num_perks; seen in game on Shangri-La and Moon): the count is lowered while the machine is used and
// set to the real number afterwards.
cheats_perk_now( perk )
{
	machine = undefined;
	vending = GetEntArray( "zombie_vending", "targetname" );
	for ( i = 0; i < vending.size; i++ )
	{
		if ( IsDefined( vending[i].script_noteworthy ) && vending[i].script_noteworthy == perk )
		{
			machine = vending[i];
		}
	}
	if ( !IsDefined( machine ) )
	{
		return "no_perk " + perk;
	}
	if ( self HasPerk( perk ) )
	{
		return "";
	}
	cheats_power_on( self );
	if ( !cheats_flag( "power_on" ) )
	{
		level notify( cheats_power_event( perk ) );
		wait( 1 );
	}
	score = self.score;
	self.score = score + 20000;
	perks = self.num_perks;
	if ( IsDefined( perks ) && perks >= 4 )
	{
		self.num_perks = 3;
	}
	for ( attempt = 0; attempt < 5 && !self HasPerk( perk ); attempt++ )
	{
		// The World at War maps power their own machines without the "power_on" flag, and vel.gg's added Mule Kick
		// waits for that flag (seen on Verruckt: switch used, other perks given, power_on never set, Mule Kick
		// untouched). After a failed try, with the switch already used: set it and send the machine's own event.
		if ( attempt == 1 )
		{
			if ( !cheats_flag( "power_on" ) )
			{
				flag_set( "power_on" );
			}
			level notify( cheats_power_event( perk ) );
			wait( 1 );
		}
		machine notify( "trigger", self );
		for ( i = 0; i < 30 && !self HasPerk( perk ); i++ )
		{
			wait( .1 );
		}
	}
	// the bottle animation ends before the perk is set; give it time, then put the points back
	for ( i = 0; i < 60 && !self HasPerk( perk ); i++ )
	{
		wait( .1 );
	}
	self.score = score;
	if ( !self HasPerk( perk ) )
	{
		self.num_perks = perks;
		return "perk_failed " + perk;
	}
	if ( IsDefined( perks ) )
	{
		self.num_perks = perks + 1;
	}
	return "";
}

// retail specific_powerup_drop() 80 units in front of the player, on the floor, as sandbox pad_powerup()
cheats_powerup( name )
{
	if ( !IsDefined( level.zombie_include_powerups ) || !IsDefined( level.zombie_include_powerups[name] ) )
	{
		return "no_powerup " + name;
	}
	angles = self GetPlayerAngles();
	forward = AnglesToForward( ( 0, angles[1], 0 ) );
	spot = self.origin + ( forward[0] * 80, forward[1] * 80, 0 );
	trace = BulletTrace( spot + ( 0, 0, 40 ), spot - ( 0, 0, 80 ), false, undefined );
	if ( trace["fraction"] < 1 )
	{
		spot = trace["position"];
	}
	level thread maps\_zombiemode_powerups::specific_powerup_drop( name, spot );
	return "";
}

//-------------------------------------------------------------------------------
// rounds
//-------------------------------------------------------------------------------

// round_think() notifies "start_of_round" right after it starts spawning and "end_of_round" when the round is over
cheats_round_tracker()
{
	for ( ;; )
	{
		level waittill( "start_of_round" );
		level.cheats_round_active = true;
		level waittill( "end_of_round" );
		level.cheats_round_active = false;
	}
}

cheats_round( target )
{
	if ( cheats_horde() )
	{
		return "horde";
	}
	if ( target < 1 || target > 255 )
	{
		return "bad_round " + target;
	}
	level thread cheats_goto_round( target );
	return "";
}

cheats_kill_zombies()
{
	zombies = GetAiSpeciesArray( "axis", "all" );
	if ( !IsDefined( zombies ) )
	{
		return;
	}
	for ( i = 0; i < zombies.size; i++ )
	{
		if ( is_true( zombies[i].ignore_devgui_death ) )
		{
			continue;
		}
		zombies[i] DoDamage( zombies[i].health + 666, zombies[i].origin );
	}
}

// follows zombie_devgui_goto_round(), as sandbox_goto_round(): works forwards and backwards
cheats_goto_round( target )
{
	// between rounds nothing listens for "kill_round" yet: wait for the next round, the latest request wins
	if ( !level.cheats_round_active )
	{
		if ( IsDefined( level.cheats_goto_pending ) )
		{
			level.cheats_goto_pending = target;
			return;
		}
		level.cheats_goto_pending = target;
		level waittill( "start_of_round" );
		wait( .05 );
		target = level.cheats_goto_pending;
		level.cheats_goto_pending = undefined;
	}
	cheats_release_hold();
	level.zombie_total = 0;
	maps\_zombiemode::ai_calculate_health( target );
	level.round_number = target - 1;
	level notify( "kill_round" );
	wait( 1 );
	cheats_kill_zombies();
}

cheats_clear()
{
	if ( cheats_horde() )
	{
		return "horde";
	}
	level.zombie_total = 0;
	cheats_kill_zombies();
	return "";
}

// Freeze round: once the round has spawned all its zombies, one more is kept "to come" and spawning is paused, so the
// round cannot end (round_wait() waits for no zombies alive and none to come). Unfreezing lets it end as normal.
cheats_freeze( on )
{
	if ( cheats_horde() )
	{
		return "horde";
	}
	level.cheats_frozen = on;
	if ( !on )
	{
		cheats_release_hold();
	}
	return "";
}

// Spawning stays paused until the round is over: round_spawning() may already have taken the kept zombie and be
// waiting on the flag, and would spawn it the moment the flag came back (seen in game: one extra zombie, total -1).
cheats_release_hold()
{
	if ( level.cheats_hold )
	{
		level.cheats_hold = false;
		level.zombie_total = 0;
		level thread cheats_resume_spawning();
	}
}

cheats_resume_spawning()
{
	level notify( "cheats_resume_spawning" );
	level endon( "cheats_resume_spawning" );
	level waittill( "end_of_round" );
	flag_set( "spawn_zombies" );
}

cheats_freeze_loop()
{
	for ( ;; )
	{
		if ( level.cheats_frozen && !level.cheats_hold && level.cheats_round_active && level.zombie_total <= 0 )
		{
			level.cheats_hold = true;
			flag_clear( "spawn_zombies" );
			level.zombie_total = 1;
		}
		wait( .05 );
	}
}
