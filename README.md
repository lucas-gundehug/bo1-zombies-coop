<p align="center">
  <img src="extension/icons/icon128.png" alt="BO1 Zombies Co-op" width="110">
</p>

# 🧟 BO1 Zombies Co-op + Cheats

[![Latest release](https://img.shields.io/github/v/release/lucas-gundehug/bo1-zombies-coop?label=download&color=e2552f)](https://github.com/lucas-gundehug/bo1-zombies-coop/releases/latest)
![Chrome extension](https://img.shields.io/badge/Chrome-extension-f4c542?style=flat&logo=googlechrome&logoColor=black)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![WebRTC](https://img.shields.io/badge/WebRTC-direct_links-333333?style=flat&logo=webrtc&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-relay-F38020?style=flat&logo=cloudflare&logoColor=white)
![Players](https://img.shields.io/badge/players-up%20to%204-63d471)
![Maps](https://img.shields.io/badge/maps-all%2010-5aa8ff)

**BO1 Zombies Co-op + Cheats** is a Chrome extension for playing Black Ops 1 Zombies in the browser on
[vel.gg/bsz](https://vel.gg/bsz) with up to three friends.

It adds a cheat menu that knows what each map has, an in-game map that shows where your friends are, and direct
connections between players for smoother co-op.

### [⬇ Download the latest version](https://github.com/lucas-gundehug/bo1-zombies-coop/releases/latest/download/bo1-zombies-coop.zip) · [Setup guide](#-setup-guide)

<table>
  <tr>
    <td align="center" width="50%"><img src="docs/images/map-kino.png" alt="The in-game map on Kino der Toten" width="100%"><br><b>🗺️ The map (N)</b></td>
    <td align="center" width="25%"><img src="docs/images/fork-cheats.png" alt="The cheat menu: give to, weapons on this map, perks, power-ups and rounds" width="100%"><br><b>🔫 The cheat menu (M)</b></td>
    <td align="center" width="25%"><img src="docs/images/fork-lobby.png" alt="The lobby: four players, two on a direct link and one on the relay" width="100%"><br><b>🔗 Direct connections</b></td>
  </tr>
</table>

### From BO1 Zombies Co-op to this fork

[BO1 Zombies Co-op](https://github.com/AllanLotta/bo1-zombies-coop) by AllanLotta is the original extension this
project is built on: hosting, invite links, the lobby, controller support and Fun mode all come from there. **This fork
builds on it** and follows its updates, so new vel.gg engines keep working, and it adds:

|                  | Original BO1 Zombies Co-op                        | This fork                                                                                         |
| :--------------- | :------------------------------------------------ | :------------------------------------------------------------------------------------------------ |
| Weapons          | A fixed list of 24, the same on every map         | Exactly the weapons the map has (Zap Guns on Moon, Thundergun on Kino, Baby Gun on Shangri-La…)    |
| Perks & upgrades | —                                                 | Any perk for free, Pack-a-Punch for the weapon in hand                                            |
| Health           | God mode (can't be hurt) only                     | Health levels from 100% to 500%, per player, on top of Juggernog                                  |
| Give to          | The host only                                     | You, one friend, or everyone at once                                                              |
| Rounds           | —                                                 | Jump to any round (1–255), skip ahead, or freeze the round                                        |
| Map              | —                                                 | Press **N**: friends, your room, closed doors with prices, perks, box, Pack-a-Punch, power        |
| Connection       | Everything through a relay server                 | Direct between players (WebRTC); the relay only introduces players and steps in as a fallback      |
| In-game menu     | Esc, which pauses the game for everyone           | **M** for the cheat menu and **N** for the map, without pausing anyone                            |

Friends on the original extension can still join a game hosted with this one: they play normally, just without the
map.

---

## 🎮 What You Get

| Feature                   | What it does                                                                                                                      |
| :------------------------ | :-------------------------------------------------------------------------------------------------------------------------------- |
| 👥 **Co-op for 4**        | Host a game from the Co-op card, send the invite link, play any of the ten maps together. Hell mode works too.                   |
| 🔫 **Weapons on this map** | Read from the game when the map loads, so every button works: wonder weapons included.                                           |
| ⚡ **Pack-a-Punch**        | Upgrades the weapon the chosen player is holding.                                                                                |
| 🥤 **Perks (free)**        | The map's perk machines: Juggernog, Speed Cola, Double Tap, Mule Kick and the rest. The first perk turns the power on, as the switch would. |
| ❤️ **Health levels**       | 100%, 150%, 200%, 300% or 500% health for any player. You still go down, just after more hits; Juggernog adds on top, and the level stays through revives and new rounds. |
| 💥 **Power-ups**           | Max Ammo, Insta-Kill, Nuke, Fire Sale and the rest, dropped in front of the player.                                               |
| 🔁 **Rounds**              | Jump to any round from 1 to 255, forwards or backwards, or skip to the next one.                                                 |
| 🧊 **Freeze round**        | The round doesn't end, even with every zombie dead, until you unfreeze it.                                                       |
| 🗺️ **In-game map**         | A map of the level while you play. See below.                                                                                    |
| 🔗 **Direct connections**  | Game data goes straight between each friend and the host. Fewer hitches, and the card shows **Direct** or **Relay** per player. |
| 🕹️ **Fun mode**            | From the original: god mode, speed, points, infinite ammo, flying and more.                                                     |
| 🎮 **Controller support**  | From the original: play with a gamepad.                                                                                          |

---

## 🗺️ The In-Game Map

Press **N** in a game and a map of the level opens in the middle of the screen. The game keeps running, nobody is
paused, and you keep walking, aiming and shooting while it's open. Press **N** again to close it.

<p align="center">
  <img src="docs/images/map-kino.png" alt="The in-game map on Kino der Toten: the rooms, the player in the Lobby, closed doors with their price, perk machines and Mystery Box spots" width="860">
</p>

| On the map           | How it shows                                                                                          |
| :------------------- | :---------------------------------------------------------------------------------------------------- |
| 🟠 **You and friends** | A dot in each player's co-op colour with the first letter of their name, a line for where they look. Dots glide smoothly; a downed friend gets a red ring. |
| 📍 **Your room**       | Outlined in orange, with its name at the top ("Lobby", "Theater"…).                                  |
| 🔒 **Closed doors**    | A lock with the price at every door and debris pile still closed; a lightning bolt for doors the power opens. Bought doors disappear. |
| 🥤 **Perks**           | Every perk machine, with the game's own perk icon.                                                   |
| 📦 **Mystery Box**     | Every spot the box can be, with the one it's in now ringed in gold.                                   |
| 🟣 **Pack-a-Punch**    | Where it is.                                                                                          |
| ⚡ **Power switch**    | Lit up once the power is on.                                                                          |
| 🏢 **Floors**          | On maps with several floors, the floor you're on, with buttons that show which friends are on another. |

### The minimap

A small map sits in the top left corner during every game. You stay in the middle, and it scrolls under you as you run,
with the room you're in written along the top. It shows the same rooms, doors, icons and friends as the big map, and it
hides while the big map is open. Turn it off under **Settings → Minimap** on the Co-op card.

<p align="center">
  <img src="docs/images/minimap.png" alt="The minimap in the top left corner: the room name on top, the player in the middle" width="240">
</p>

Everyone running this version sees the maps, whoever hosts. The perk and box icons are read from the game's own files
in your browser while you play. The floor plans are made from each map's own data, so no
picture of the level is needed.

---

## 📦 Setup Guide

Everyone who plays installs the extension once: you and each friend. It takes about two minutes.

### 1. Download and unzip

Download [bo1-zombies-coop.zip](https://github.com/lucas-gundehug/bo1-zombies-coop/releases/latest/download/bo1-zombies-coop.zip)
and unzip it somewhere you'll keep it, for example `Documents\bo1-zombies-coop`. Chrome loads the extension from that
folder, so don't delete it afterwards.

### 2. Turn on Developer mode

In Chrome, open `chrome://extensions` (paste it in the address bar). If the original BO1 Zombies Co-op is installed,
click **Remove** on it first. Then turn on **Developer mode** in the top right corner.

<img src="docs/images/setup/1-developer-mode.png" alt="chrome://extensions with the Developer mode switch circled in the top right" width="860">

### 3. Load the folder

Click **Load unpacked** and pick the folder you unzipped (the one with `manifest.json` in it).

<img src="docs/images/setup/2-load-unpacked.png" alt="The Load unpacked button circled on chrome://extensions" width="860">

The extension now shows up in the list. Keep its switch on.

<img src="docs/images/setup/3-installed.png" alt="BO1 Zombies Co-op + Cheats for vel.gg in the extension list, switched on" width="860">

### 4. Open the game

Go to [vel.gg/bsz](https://vel.gg/bsz). The **Co-op** card shows up in the top right corner. To play alone, just start
a map; the cheat menu and the map work solo too.

<img src="docs/images/fork-start.png" alt="The Co-op card: Host a game, and a field to join a friend" width="328">

### 5. Host a game and invite your friends

Click **Host a game**, then **Copy link** and send the link to your friends. Pick a map in the game menu: everyone
follows you to it.

<img src="docs/images/fork-host.png" alt="The Co-op card while hosting: the room code, Copy link, and three free seats" width="328">

### 6. Your friends join

Each friend opens your link (or pastes it under **Join a friend**). They show up in the lobby with their ping and their
connection: **Direct** when they're connected straight to you, **Relay** when the relay carries their game. When
everyone is in, click the game to start.

<img src="docs/images/fork-lobby.png" alt="The lobby with four players: Jonas and Mads on Direct, Emil on Relay" width="328">

### 7. Play

In the game, press **M** for the cheat menu and **N** for the map (see Controls below).

**To update later:** download the new zip, unzip it over the old folder, and click the reload arrow on the extension
in `chrome://extensions`. The Co-op card tells you when a new version is out.

---

## 🕹️ Controls

| Key           | In a game                                                                                       |
| :------------ | :---------------------------------------------------------------------------------------------- |
| **M**         | Opens the Co-op card at Fun mode and the cheat menu. Click the game (or press M again) to go back. |
| **N**         | Opens and closes the big map.                                                                   |
| **Esc**       | The game's own menu. It pauses the game for everyone.                                           |

**Using the cheat menu:** pick who gets it under **Give to**, then click a weapon, perk or power-up. A message under
the button tells you whether it worked.

<img src="docs/images/fork-cheats.png" alt="The cheat menu: give to Lucas, Jonas, Mads or everyone; the map's weapons; free perks; power-ups; rounds" width="328">

**Settings → Minimap → Turn off** hides the corner minimap. **Settings → Cheat menu → Turn off** brings back the
original Fun mode and turns off both maps (reload the page afterwards).

---

## 👥 Playing With Friends

**Direct by default.** When a friend joins your game, their browser connects straight to yours, and the game runs over
that direct link. There's nothing to set up. Two free public servers (from Cloudflare and Google) help the browsers
find each other. The Co-op card shows **Direct** or **Relay** under each player's ping.

**The relay** is a small server that introduces players to each other. It also carries the game for anyone whose
direct link can't be made, which happens on some strict home or work networks. Everyone uses the original project's
shared relay unless they pick their own.

**Your own relay (optional, free, 5 minutes).** The shared relay has a daily limit for everyone together. With direct
links it's rarely a problem, but if you play often, or a friend keeps showing **Relay**, make your own:

1. On the Co-op card's start screen, click **Create my relay**.
   [The guide](https://allanlotta.github.io/bo1-zombies-coop/#relay) walks you through it on a free Cloudflare
   account.
2. Open **Settings → Relay**, click **Change relay**, and paste your relay's address.
3. Host as usual. Your invite link carries your relay. Friends who open it see "This invite uses another relay" and
   click **Use this relay** once.

Only the host needs to set a relay up. Friends just open the invite link.

---

## 🧩 Maps

All ten maps work with co-op, the cheat menu and the map: Nacht der Untoten, Verrückt, Shi No Numa, Der Riese, Kino der
Toten, "Five", Ascension, Call of the Dead, Shangri-La and Moon.

| Map                         | Floors on the map                          |
| :-------------------------- | :----------------------------------------- |
| Kino der Toten              | Ground floor, Upstairs                     |
| "Five"                      | Top floor, War room, Labs                  |
| Moon                        | No Man's Land, Moon base, Tunnels          |
| Shangri-La                  | Temple, Caves                              |
| Nacht, Verrückt, Shi No Numa | Ground floor, Upstairs                    |
| Der Riese, Ascension, Call of the Dead | One floor (bridges and roofs drawn over the ground) |

---

## 🏗️ How It Works

```
┌──────────────────────────────── Your browser ────────────────────────────────┐
│                                                                              │
│   Co-op card · cheat menu (M) · map (N)          vel.gg game engine          │
│   ┌─────────────────────────────┐   console   ┌───────────────────────────┐  │
│   │  Chrome extension           │◄───────────►│  Game script (a "mod")    │  │
│   │  src/cheats  src/map        │   dvars     │  weapons, perks, rounds,  │  │
│   │  src/session src/net        │             │  players, doors, rooms    │  │
│   └──────────────┬──────────────┘             └───────────────────────────┘  │
└──────────────────┼───────────────────────────────────────────────────────────┘
                   │ game packets + control messages (map, lobby, positions)
                   ▼
   ┌───────────────────────────────┐        ┌──────────────────────────────────┐
   │  Friends' browsers            │◄──────►│  Relay (Cloudflare Worker)       │
   │  direct WebRTC link per friend│        │  introduces players, fallback     │
   └───────────────────────────────┘        └──────────────────────────────────┘
```

- **The game script.** vel.gg's engine can load extra game scripts ("mods", see
  [MisaDev4/bo1-zombies-decompiled](https://github.com/MisaDev4/bo1-zombies-decompiled)). Right before a map starts,
  the extension puts a small script into the game's storage in the browser and switches it on. It uses the game's own
  functions to give weapons and perks, Pack-a-Punch, drop power-ups and change rounds. It also reports what the map
  has, where every player is, and which doors and rooms are open.
- **The bridge.** The extension talks to the script through the game console: commands go in as console settings, and
  the answers come back as console prints.
- **The map.** Floor plans for all ten maps are made once from the game's own path nodes and bundled with the
  extension. While playing, the host's game sends positions and door states a few times a second, and the extension
  draws them on a canvas over the game.
- **Direct links.** Each friend connects straight to the host over WebRTC. The relay passes the introduction along and
  carries the game for anyone whose direct link can't be made.

Details for developers: [AGENTS.md](AGENTS.md).

---

## 🧪 Testing & Verification

| Command                                    | What it checks                                                                 |
| :----------------------------------------- | :----------------------------------------------------------------------------- |
| `npm run check`                            | Lint, build and the unit tests (cheat menu, map, engine patches, direct links). |
| `node test/cheats-e2e.mjs <map> <scenario>` | The real game in a browser: every cheat command, the map (`map`, `map-script`), Hell mode with `HORDE=1`. |
| `node test/e2e.mjs <players> <map>`         | Real co-op with one browser per player, through a local relay (`npm run relay:dev`). `MAP=1` checks the friends' map. |
| `node scripts/map-plan.mjs <map\|all>`       | Makes a map's floor plan again from the game (`rebuild` remakes them from the saved data). |

Every release is checked on all ten maps in the real game, in Hell mode and in co-op, including a friend still on the
previous version.

---

## 🙏 Credits

- [AllanLotta/bo1-zombies-coop](https://github.com/AllanLotta/bo1-zombies-coop): the co-op extension this is built on.
- [vel.gg](https://vel.gg/bsz) and [MisaDev4](https://github.com/MisaDev4/bo1-zombies-decompiled): the game in the
  browser and its mod system.
