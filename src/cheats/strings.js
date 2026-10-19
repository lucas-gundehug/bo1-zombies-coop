// Card text for the cheat menu, in the card's language.
import { LANG } from "../ui/strings.js";

const TEXT = {
  en: {
    setting: "Cheat menu",
    on: "On",
    off: "Off",
    turnOn: "Turn on",
    turnOff: "Turn off",
    reload: "Reload the page to apply.",
    note: "Weapons, perks, power-ups and rounds in Fun mode. Only the host needs it.",
  },
  pt: {
    setting: "Menu de cheats",
    on: "Ligado",
    off: "Desligado",
    turnOn: "Ligar",
    turnOff: "Desligar",
    reload: "Recarregue a página para aplicar.",
    note: "Armas, perks, power-ups e rounds no Modo diversão. Só o host precisa.",
  },
};

export const C = TEXT[LANG] ?? TEXT.en;
