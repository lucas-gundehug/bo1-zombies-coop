// The Connection setting: direct links (the default) or the relay only. A player who chooses the relay only never
// makes a direct link (a guest doesn't offer one, a host leaves offers unanswered), so nobody in their game sees their
// IP address; their game goes through the relay instead. Read when the page loads (src/net/direct.js), so a change
// applies after a reload.
import { readSetting, saveSetting } from "../util/settings.js";

const D = {
  connection: "Connection",
  direct: "Direct",
  relayOnly: "Relay only",
  useRelayOnly: "Use the relay only",
  useDirect: "Use direct links",
  note: "Direct links play smoother and spare the relay, but the players can see each other's IP address. With the relay only, just the relay sees it.",
  reload: "Reload the page to apply.",
};

export const directAllowed = () => readSetting("direct", "1") !== "0";

export function directSettingBlocks(session) {
  const direct = session.directSetting !== false;
  return [
    { kind: "kv", items: [[D.connection, direct ? D.direct : D.relayOnly]] },
    { kind: "text", cls: "muted small", text: D.note },
    { kind: "buttons", buttons: [{ act: "directSetting", label: direct ? D.useRelayOnly : D.useDirect, style: "ghost" }] },
  ];
}

export function directSettingActions(session, save = saveSetting) {
  return {
    directSetting: () => {
      session.directSetting = session.directSetting === false;
      save("direct", session.directSetting ? "1" : "0");
      session.notice = D.reload;
    },
  };
}
