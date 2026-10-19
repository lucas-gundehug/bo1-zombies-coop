<div align="center">

<img src="extension/icons/icon128.png" width="96" alt="">

# BO1 Zombies Co-op + Cheats

**Black Ops 1 Zombies in the browser with up to 4 friends, plus a cheat menu for the host.**<br>
A Chrome extension for [vel.gg/bsz](https://vel.gg/bsz), built on
[BO1 Zombies Co-op](https://github.com/AllanLotta/bo1-zombies-coop) by AllanLotta.

### [⬇ Download](https://github.com/lucas-gundehug/bo1-zombies-coop/releases/latest/download/bo1-zombies-coop.zip)

</div>

## What you get

Everything from the original extension: host a game, send your friends the invite link, play any of the ten maps
together, controller support, and Fun mode (god mode, speed, points, infinite ammo, flying and more).

On top of that, Fun mode gets a **cheat menu** that knows what each map has:

| | |
| --- | --- |
| **Give to** | You, one friend, or everyone at once. |
| **Weapons on this map** | Only the weapons the map really has: the Zap Guns on Moon, the Thundergun on Kino, the Baby Gun on Shangri-La, and so on. |
| **Pack-a-Punch** | Upgrades the weapon the player is holding. |
| **Perks (free)** | The map's perk machines: Juggernog, Speed Cola, Double Tap, Mule Kick and the rest. The first perk turns the power on, as the switch would. |
| **Power-ups** | Max Ammo, Insta-Kill, Nuke, Fire Sale and the rest, dropped in front of the player. |
| **Rounds** | Jump to any round from 1 to 255, forwards or backwards, or skip to the next one. |
| **Freeze round** | The round does not end, even with every zombie dead, until you unfreeze it. |

## Install

1. Download [bo1-zombies-coop.zip](https://github.com/lucas-gundehug/bo1-zombies-coop/releases/latest/download/bo1-zombies-coop.zip) and unzip it.
2. In Chrome, open `chrome://extensions`. If the original BO1 Zombies Co-op is installed, click **Remove** on it.
3. Turn on **Developer mode** (top right), click **Load unpacked**, and pick the unzipped folder.
4. Open [vel.gg/bsz](https://vel.gg/bsz). The Co-op card shows up in the top right corner.

To update: download the new zip, unzip it over the old folder, and click the reload arrow on the extension in
`chrome://extensions`.

## Use it

- **Start a map** alone, or host a game from the Co-op card and send the link. Your friends only need the
  [original extension](https://github.com/AllanLotta/bo1-zombies-coop#readme); only the host needs this one.
- **In the game, press M** to open the card at Fun mode. The game keeps running, so nobody gets paused. Click the game
  (or press M again) to go back. Esc works too, but it pauses the game for everyone.
- Pick who gets it under **Give to**, then click a weapon, perk or power-up. A message under the button tells you
  whether it worked.
- **Settings → Cheat menu → Turn off** brings back the original Fun mode (reload the page afterwards).

Playing with friends often? Make your own relay (free, 5 minutes); the Co-op card has a **Create my relay** button with
the guide.

## Good to know

- Hell mode works, but it has no perk machines, and the round controls are off there.
- When vel.gg updates its game, the card may say co-op is switched off until the extension is updated. A new download
  appears on this page shortly after.

## How it works

vel.gg's game engine can load extra game scripts ("mods", see
[MisaDev4/bo1-zombies-decompiled](https://github.com/MisaDev4/bo1-zombies-decompiled), `mods/_stack`). Right before a
map starts, the extension puts a small game script into the game's storage in the browser and switches it on. The
script uses the game's own functions to give weapons and perks, Pack-a-Punch, drop power-ups and change rounds, and it
reports which weapons, perks and power-ups the map has. The card talks to it through the game console. Details for
developers: [AGENTS.md](AGENTS.md); the original project's documentation:
[AllanLotta/bo1-zombies-coop](https://github.com/AllanLotta/bo1-zombies-coop#readme).

## Credits

- [AllanLotta/bo1-zombies-coop](https://github.com/AllanLotta/bo1-zombies-coop): the co-op extension this is built on.
- [vel.gg](https://vel.gg/bsz) and MisaDev4: the game in the browser and its mod system.
