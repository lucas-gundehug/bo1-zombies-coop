#include maps\_utility;
#include common_scripts\utility;
#include maps\_zombiemode_utility;

// IN-GAME MAP - the game side of the map panel (src/map/). Rooms, doors and box spots are captured once, in one order,
// when the cheat menu publishes its lists; the live data and the dump both use that order, so their indices agree with
// the bundled plan (src/map/plans/<map>.json). Published:
//   cheats_map_live        every 0.25 s: v=<state counter> p=<ent>,<x>,<y>,<z>,<yaw>,<room>,<s>;...
//                          (room: index into the rooms or -1; s: 0 alive, 1 downed, 2 spectating)
//   cheats_map_state       when it changes (the counter goes up): sig=z<rooms>d<doors>c<checksum of the doors>
//                          doors=<0/1 per door, 1 = open>
//                          rooms=<0/1 per room, 1 = enabled> box=<chest indices> power=<0|1>
//   cheats_map_dump_count  after the console sets cheats_map_dump 1: the number of cheats_map_dump_<i> chunks, each
//                          ";"-separated records of ","-separated fields (scripts/plan-build.mjs reads them):
//                            Z,<zone name>,<x>,<y>,<z>                     every room, in order (its first volume)
//                            D,<door|debris|power>,<x>,<y>,<z>,<cost>,<target>   every door trigger, in order
//                            P,<perk|pap|power|box>,<id or ->,<x>,<y>,<z>   boxes in chest order
//                            N,<x>,<y>,<z>,<room>                          every path node inside a room
// Findings behind this (which fields exist, hidden boxes 10,000 units down): docs/superpowers/specs/2026-10-20-in-game-map-spike.md

map_main()
{
	level.map_v = 0;
	level.map_state = "";
	level.map_zones = [];
	level.map_doors = [];
	SetDvar( "cheats_map_dump", "0" );
	// dvars outlive a level restart (game over in the same page): the last game's players and doors must not show
	SetDvar( "cheats_map_live", "" );
	SetDvar( "cheats_map_state", "" );
	flag_wait( "all_players_spawned" );
	wait( 2 );
	map_capture();
	level thread map_state_loop();
	level thread map_live_loop();
	level thread map_dump_loop();
}

map_capture()
{
	if ( IsDefined( level.zones ) )
	{
		level.map_zones = GetArrayKeys( level.zones );
	}
	level.map_doors = [];
	level.map_door_kind = [];
	level.map_door_target = [];
	names = [];
	names[0] = "zombie_door";
	names[1] = "zombie_debris";
	names[2] = "zombie_airlock_buy";
	for ( k = 0; k < names.size; k++ )
	{
		ents = GetEntArray( names[k], "targetname" );
		for ( i = 0; i < ents.size; i++ )
		{
			n = level.map_doors.size;
			level.map_doors[n] = ents[i];
			kind = "door";
			if ( k == 1 )
			{
				kind = "debris";
			}
			if ( IsDefined( ents[i].script_noteworthy ) && ( ents[i].script_noteworthy == "electric_door" || ents[i].script_noteworthy == "electric_buyable_door" ) )
			{
				kind = "power";
			}
			level.map_door_kind[n] = kind;
			level.map_door_target[n] = "#" + n;
			if ( IsDefined( ents[i].target ) )
			{
				level.map_door_target[n] = ents[i].target;
			}
		}
	}
	// the triggers of each door (they share a target), worked out once
	level.map_door_group = [];
	for ( i = 0; i < level.map_doors.size; i++ )
	{
		group = [];
		for ( j = 0; j < level.map_doors.size; j++ )
		{
			if ( level.map_door_target[j] == level.map_door_target[i] )
			{
				group[group.size] = j;
			}
		}
		level.map_door_group[i] = group;
	}
	// the sig's checksum, as scripts/plan-build.mjs computes it from the dump: index × (cost + |x| + |y|) over the doors
	level.map_door_sum = 0;
	for ( i = 0; i < level.map_doors.size; i++ )
	{
		door = level.map_doors[i];
		cost = 0;
		if ( IsDefined( door.zombie_cost ) )
		{
			cost = door.zombie_cost;
		}
		x = int( door.origin[0] );
		y = int( door.origin[1] );
		if ( x < 0 )
		{
			x = 0 - x;
		}
		if ( y < 0 )
		{
			y = 0 - y;
		}
		level.map_door_sum = level.map_door_sum + ( i + 1 ) * ( cost + x + y );
	}
	level.map_chests = [];
	if ( IsDefined( level.chests ) )
	{
		level.map_chests = level.chests;
	}
}

map_xyz( v )
{
	z = int( v[2] );
	// hidden boxes and some perk triggers (Moon's) are parked 10,000 units down
	if ( z < -5000 )
	{
		z = z + 10000;
	}
	return int( v[0] ) + "," + int( v[1] ) + "," + z;
}

map_room_of( ent )
{
	for ( i = 0; i < level.map_zones.size; i++ )
	{
		zone = level.zones[level.map_zones[i]];
		if ( !IsDefined( zone.volumes ) )
		{
			continue;
		}
		for ( v = 0; v < zone.volumes.size; v++ )
		{
			if ( ent IsTouching( zone.volumes[v] ) )
			{
				return i;
			}
		}
	}
	return -1;
}

// a door is open once any of its triggers (they share a target) was bought or is gone
map_door_open( i )
{
	group = level.map_door_group[i];
	for ( g = 0; g < group.size; g++ )
	{
		door = level.map_doors[group[g]];
		if ( !IsDefined( door ) || is_true( door._door_open ) )
		{
			return true;
		}
	}
	return false;
}

map_state_text()
{
	doors = "";
	for ( i = 0; i < level.map_doors.size; i++ )
	{
		doors = doors + maps\cheats\_cheats::cheats_bit( map_door_open( i ) );
	}
	rooms = "";
	for ( i = 0; i < level.map_zones.size; i++ )
	{
		rooms = rooms + maps\cheats\_cheats::cheats_bit( level.zones[level.map_zones[i]].is_enabled );
	}
	box = "";
	fire_sale = IsDefined( level.zombie_vars ) && is_true( level.zombie_vars["zombie_powerup_fire_sale_on"] );
	if ( fire_sale )
	{
		for ( i = 0; i < level.map_chests.size; i++ )
		{
			if ( box != "" )
			{
				box = box + ",";
			}
			box = box + i;
		}
	}
	else if ( IsDefined( level.chest_index ) && level.map_chests.size > 0 )
	{
		box = "" + level.chest_index;
	}
	return "sig=z" + level.map_zones.size + "d" + level.map_doors.size + "c" + level.map_door_sum + " doors=" + doors + " rooms=" + rooms + " box=" + box + " power=" + maps\cheats\_cheats::cheats_bit( maps\cheats\_cheats::cheats_flag( "power_on" ) );
}

map_state_loop()
{
	for ( ;; )
	{
		text = map_state_text();
		if ( text != level.map_state )
		{
			level.map_state = text;
			level.map_v++;
			SetDvar( "cheats_map_state", text );
		}
		wait( .25 );
	}
}

map_live_loop()
{
	for ( ;; )
	{
		entries = "";
		players = get_players();
		for ( i = 0; i < players.size; i++ )
		{
			player = players[i];
			s = 0;
			if ( IsDefined( player.sessionstate ) && player.sessionstate == "spectator" )
			{
				s = 2;
			}
			else if ( player maps\_laststand::player_is_in_laststand() )
			{
				s = 1;
			}
			angles = player GetPlayerAngles();
			if ( entries != "" )
			{
				entries = entries + ";";
			}
			entries = entries + player GetEntityNumber() + "," + int( player.origin[0] ) + "," + int( player.origin[1] ) + "," + int( player.origin[2] ) + "," + int( angles[1] ) + "," + map_room_of( player ) + "," + s;
		}
		SetDvar( "cheats_map_live", "v=" + level.map_v + " p=" + entries );
		wait( .25 );
	}
}

map_dump_loop()
{
	for ( ;; )
	{
		if ( GetDvar( #"cheats_map_dump" ) == "1" )
		{
			SetDvar( "cheats_map_dump", "0" );
			map_dump();
		}
		wait( .5 );
	}
}

map_dump()
{
	SetDvar( "cheats_map_dump_count", 0 );
	records = [];
	for ( i = 0; i < level.map_zones.size; i++ )
	{
		zone = level.zones[level.map_zones[i]];
		at = "0,0,0";
		if ( IsDefined( zone.volumes ) && zone.volumes.size > 0 )
		{
			at = map_xyz( zone.volumes[0].origin );
		}
		records[records.size] = "Z," + level.map_zones[i] + "," + at;
	}
	for ( i = 0; i < level.map_doors.size; i++ )
	{
		door = level.map_doors[i];
		if ( !IsDefined( door ) )
		{
			records[records.size] = "D," + level.map_door_kind[i] + ",0,0,0,0," + level.map_door_target[i];
			continue;
		}
		cost = 0;
		if ( IsDefined( door.zombie_cost ) )
		{
			cost = door.zombie_cost;
		}
		records[records.size] = "D," + level.map_door_kind[i] + "," + map_xyz( door.origin ) + "," + cost + "," + level.map_door_target[i];
	}
	vending = GetEntArray( "zombie_vending", "targetname" );
	for ( i = 0; i < vending.size; i++ )
	{
		perk = "-";
		if ( IsDefined( vending[i].script_noteworthy ) )
		{
			perk = vending[i].script_noteworthy;
		}
		records[records.size] = "P,perk," + perk + "," + map_xyz( vending[i].origin );
	}
	pap = GetEntArray( "zombie_vending_upgrade", "targetname" );
	for ( i = 0; i < pap.size; i++ )
	{
		records[records.size] = "P,pap,-," + map_xyz( pap[i].origin );
	}
	// the power switch: use_elec_switch on most maps, use_power_switch on Der Riese, use_master_switch on Verrückt,
	// and Shangri-La's two (both pulled turn the power on)
	switches = [];
	switches[0] = "use_elec_switch";
	switches[1] = "use_power_switch";
	switches[2] = "use_master_switch";
	switches[3] = "power_trigger_left";
	switches[4] = "power_trigger_right";
	for ( s = 0; s < switches.size; s++ )
	{
		power = GetEntArray( switches[s], "targetname" );
		for ( i = 0; i < power.size; i++ )
		{
			records[records.size] = "P,power,-," + map_xyz( power[i].origin );
		}
	}
	for ( i = 0; i < level.map_chests.size; i++ )
	{
		chest = level.map_chests[i];
		at = chest.origin;
		if ( IsDefined( chest.orig_origin ) )
		{
			at = chest.orig_origin;
		}
		else if ( IsDefined( chest.chest_lid ) )
		{
			at = chest.chest_lid.origin;
		}
		records[records.size] = "P,box,-," + map_xyz( at );
	}
	nodes = GetAllNodes();
	probe = Spawn( "script_origin", ( 0, 0, 0 ) );
	for ( i = 0; i < nodes.size; i++ )
	{
		probe.origin = nodes[i].origin + ( 0, 0, 16 );
		room = map_room_of( probe );
		if ( room >= 0 )
		{
			records[records.size] = "N," + int( nodes[i].origin[0] ) + "," + int( nodes[i].origin[1] ) + "," + int( nodes[i].origin[2] ) + "," + room;
		}
		if ( i % 40 == 39 )
		{
			wait( .05 );
		}
	}
	probe Delete();
	chunk = "";
	count = 0;
	for ( i = 0; i < records.size; i++ )
	{
		if ( chunk != "" && chunk.size + records[i].size + 1 > 380 )
		{
			SetDvar( "cheats_map_dump_" + count, chunk );
			count++;
			chunk = "";
		}
		if ( chunk != "" )
		{
			chunk = chunk + ";";
		}
		chunk = chunk + records[i];
	}
	if ( chunk != "" )
	{
		SetDvar( "cheats_map_dump_" + count, chunk );
		count++;
	}
	SetDvar( "cheats_map_dump_count", count );
}

// test hook (test/cheats-e2e.mjs): opens door i the retail devgui way, free of charge. Only while the tests set
// cheats_test 1: for a second it makes every door free for everyone (zombie_unlock_all).
map_open_door( i )
{
	if ( GetDvarInt( #"cheats_test" ) != 1 )
	{
		return "test_only";
	}
	if ( i < 0 || i >= level.map_doors.size || !IsDefined( level.map_doors[i] ) )
	{
		return "no_door " + i;
	}
	SetDvar( "zombie_unlock_all", 1 );
	level.map_doors[i] notify( "trigger", get_players()[0], true );
	level thread map_unlock_all_off();
	return "";
}

map_unlock_all_off()
{
	wait( 1 );
	SetDvar( "zombie_unlock_all", 0 );
}
