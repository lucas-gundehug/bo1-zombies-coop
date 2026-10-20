// Fun mode's cheat blocks: who gets it, the map's weapons (and Pack-a-Punch), perks, power-ups, rounds.
import { sendCheat } from "./bridge.js";
import { perkName, powerupName, weaponName } from "./names.js";
import { C } from "./strings.js";

const MAX_ROUND = 255;
export const HEALTH_LEVELS = [100, 150, 200, 300, 500];
const byName = (name) => (a, b) => name(a).localeCompare(name(b));

// The notice goes right under the group it is about: the card is long, and Fun mode's own notice line is at its top.
const AREA = { give: "weapons", pap: "weapons", perk: "perks", health: "health", powerup: "powerups", round: "rounds", next: "rounds", freeze: "rounds" };

function say(session, text, action) {
  session.fun.notice = text;
  session.fun.noticeAt = Date.now();
  session.cheats.noticeArea = AREA[action] ?? "rounds";
}

function noticeAfter(session, area, blocks) {
  if (session.fun.notice && session.cheats.noticeArea === area) blocks.push({ kind: "callout", tone: "info", text: session.fun.notice });
}

/** The chosen player's slot, or "all"; falls back to the host when the chosen one left. */
function target(session, players) {
  const chosen = session.cheats.target ?? 0;
  return chosen === "all" || players.some((p) => p.slot === chosen) ? chosen : 0;
}

function who(session, players, slot) {
  if (slot === "all") return C.everyone;
  return players.find((p) => p.slot === slot)?.name ?? C.player;
}

const ERRORS = {
  no_player: () => C.errNoPlayer,
  not_spawned: () => C.errNotSpawned,
  no_weapon: (d) => C.errNoWeapon(weaponName(d)),
  no_upgrade: (d) => C.errNoUpgrade(weaponName(d)),
  has_upgrade: () => C.errHasUpgrade,
  no_perk: (d) => C.errNoPerk(perkName(d)),
  perk_failed: (d) => C.errPerkFailed(perkName(d)),
  no_powerup: (d) => C.errNoPowerup(powerupName(d)),
  bad_round: () => C.errBadRound(MAX_ROUND),
  horde: () => C.errHorde,
  bad_health: () => C.errBadHealth,
};

function resultText(result, sent, name) {
  if (!result.ok) return (ERRORS[result.code] ?? (() => C.errOther(result.code)))(result.detail);
  switch (sent.action) {
    case "give":
      return C.given(weaponName(sent.arg), name);
    case "pap":
      return C.packed(name);
    case "perk":
      return C.given(perkName(sent.arg), name);
    case "health":
      return C.healthSet(sent.arg, name);
    case "powerup":
      return C.dropped(powerupName(sent.arg), name);
    case "round":
      return C.goingTo(sent.target);
    case "next":
      return C.nextRound;
    case "freeze":
      return sent.target === 1 ? C.frozenOn : C.frozenOff;
  }
  return "";
}

/** `players` is Fun mode's list of who is in the game (src/fun/fun.js funPlayers). */
export function cheatBlocks(session, players) {
  const cheats = session.cheats;
  const chosen = target(session, players);
  const blocks = [];
  if (players.length > 1) {
    blocks.push({ kind: "label", text: C.giveTo });
    const chips = players.map((p) => ({ act: "cheatTarget", arg: String(p.slot), label: p.name, on: chosen === p.slot }));
    chips.push({ act: "cheatTarget", arg: "all", label: C.everyone, on: chosen === "all" });
    blocks.push({ kind: "chips", chips });
  }

  blocks.push({ kind: "label", text: C.weapons });
  blocks.push({ kind: "buttons", buttons: [{ act: "cheatPap", label: C.pap }] });
  noticeAfter(session, "weapons", blocks);
  blocks.push({ kind: "grid", buttons: [...cheats.weapons].sort(byName(weaponName)).map((w) => ({ act: "cheatGive", arg: w, label: weaponName(w) })) });

  blocks.push({ kind: "label", text: C.perks });
  if (!cheats.perks.length) blocks.push({ kind: "text", cls: "muted small", text: C.noPerks });
  else {
    if (!cheats.power) blocks.push({ kind: "text", cls: "muted small", text: C.powerNote });
    blocks.push({ kind: "grid", buttons: [...cheats.perks].sort(byName(perkName)).map((p) => ({ act: "cheatPerk", arg: p, label: perkName(p) })) });
  }
  noticeAfter(session, "perks", blocks);

  // health levels for the chosen player (or everyone): the level shown is the one the game confirmed
  blocks.push({ kind: "label", text: C.health });
  blocks.push({ kind: "text", cls: "muted small", text: C.healthNote });
  const levelOf = (slot) => cheats.health?.[slot] ?? 100;
  const current = chosen === "all" ? (players.every((p) => levelOf(p.slot) === levelOf(players[0].slot)) ? levelOf(players[0].slot) : null) : levelOf(chosen);
  blocks.push({ kind: "chips", chips: HEALTH_LEVELS.map((pct) => ({ act: "cheatHealth", arg: String(pct), label: `${pct}%`, on: current === pct })) });
  noticeAfter(session, "health", blocks);

  blocks.push({ kind: "label", text: C.powerups });
  if (!cheats.powerups.length) blocks.push({ kind: "text", cls: "muted small", text: C.noPowerups });
  else blocks.push({ kind: "grid", buttons: [...cheats.powerups].sort(byName(powerupName)).map((p) => ({ act: "cheatPowerup", arg: p, label: powerupName(p) })) });
  noticeAfter(session, "powerups", blocks);

  blocks.push({ kind: "label", text: C.rounds, aside: cheats.round ? C.roundNow(cheats.round) : "" });
  if (cheats.horde) {
    blocks.push({ kind: "text", cls: "muted small", text: C.errHorde });
  } else {
    blocks.push({ kind: "input", field: "cheatRound", placeholder: C.roundPlaceholder, act: "cheatRound", button: C.go, maxLength: 3 });
    blocks.push({
      kind: "chips",
      chips: [
        { act: "cheatNext", label: C.nextRound, on: false, plain: true },
        { act: "cheatFreeze", label: C.freeze, on: cheats.frozen },
      ],
    });
  }
  noticeAfter(session, "rounds", blocks);
  return blocks;
}

/** Shown in Fun mode when the mod could not be handed to the engine. */
export const cheatsFailedBlock = () => ({ kind: "callout", tone: "wait", text: C.failed });

export function cheatActions(session, funPlayers) {
  const cheats = session.cheats;
  cheats.onResult = (result, sent) => {
    const players = funPlayers(session);
    if (result.ok && sent.action === "health") {
      const slots = sent.target === "all" ? players.map((p) => p.slot) : [Number(sent.target)];
      for (const slot of slots) cheats.health[slot] = Number(sent.arg);
    }
    say(session, resultText(result, sent, who(session, players, sent.target)), sent.action);
  };
  const toChosen = (action, arg, pending) => {
    const players = funPlayers(session);
    const slot = target(session, players);
    sendCheat(session, action, slot, arg);
    say(session, pending(who(session, players, slot)), action);
  };
  return {
    cheatTarget: (arg) => (cheats.target = arg === "all" ? "all" : Number(arg)),
    cheatGive: (weapon) => toChosen("give", weapon, (name) => C.giving(weaponName(weapon), name)),
    cheatPap: () => toChosen("pap", undefined, (name) => C.packing(name)),
    cheatPerk: (perk) => toChosen("perk", perk, (name) => C.giving(perkName(perk), name)),
    cheatPowerup: (powerup) => toChosen("powerup", powerup, (name) => C.giving(powerupName(powerup), name)),
    cheatHealth: (pct) => toChosen("health", pct, (name) => C.settingHealth(pct, name)),
    cheatRound: (text) => {
      const round = Number(String(text ?? "").trim());
      if (!Number.isInteger(round) || round < 1 || round > MAX_ROUND) return say(session, C.errBadRound(MAX_ROUND), "round");
      sendCheat(session, "round", round);
      say(session, C.goingTo(round), "round");
    },
    cheatNext: () => sendCheat(session, "next"),
    cheatFreeze: () => {
      cheats.frozen = !cheats.frozen; // shown at once; the script's state confirms it a moment later
      sendCheat(session, "freeze", cheats.frozen ? 1 : 0);
    },
  };
}
