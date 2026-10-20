// BO1 Zombies Co-op 2.2.2.3 for vel.gg. Built from src/ with scripts/build.mjs; edit the sources, not this file.
(() => {
  // relay/src/protocol.js
  var ROLES = Object.freeze(["host", "guest"]);
  var RELAY_MESSAGE_TYPES = Object.freeze(["welcome", "peer", "error"]);
  var MAX_GUESTS = 3;
  var GUEST_ID_PATTERN = /^[a-z0-9]{8,32}$/;
  var CODE_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
  var ROOM_CODE_LENGTH = 16;
  var randomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));
  var toCode = (bytes) => Array.from(bytes, (byte) => CODE_ALPHABET[byte & 31]).join("");
  function createRoomCode(random = randomBytes) {
    return toCode(random(ROOM_CODE_LENGTH)).match(/.{4}/g).join("-");
  }
  function createGuestId(random = randomBytes) {
    return toCode(random(16));
  }
  function normalizeRoomCode(input) {
    if (typeof input !== "string") return null;
    let text3 = input.trim();
    try {
      text3 = new URL(text3).searchParams.get("room") ?? "";
    } catch {
    }
    const compact = text3.toLowerCase().replace(/[^0-9a-z]/g, "");
    if (compact.length !== ROOM_CODE_LENGTH || [...compact].some((c) => !CODE_ALPHABET.includes(c))) return null;
    return compact.match(/.{4}/g).join("-");
  }

  // src/engine/builds.js
  var BUILDS = {
    // Served at https://vel.gg/bo1z/ since about 2026-10-16 and at https://vel.gg/bsz/ since 2026-10-18, 9,908,677 bytes. A small rebuild of the one below (adds
    // _KB_SetGraphicsQuality): same functions and struct layouts, a few indices and the static data shifted.
    "42be1c35025afa61ed1f0fc4558ca15c45c49b37dfdc458d3ebbe30f8c958036": {
      functions: {
        svFrame: [2963, "__wrap__Z8SV_Frameii"],
        netGetLoopPacket: [4119, "NET_GetLoopPacket(netsrc_t, netadr_t*, msg_t*)"],
        cbufAddText: [286, "Cbuf_AddText(int, char const*)"],
        svWaitServer: [1654, "SV_WaitServer()"],
        assertHandler: [170, "Assert_MyHandler(char const*, int, int, char const*, ...)"],
        cachedTagUpdate: [4410, "CachedTag_UpdateTagInternal(centity_s const*, cached_client_tag_t*, unsigned int, int, bool)"],
        comError: [179, "Com_Error(errorParm_t, char const*, ...)"],
        clCreateCmd: [6686, "CL_CreateCmd(usercmd_s*, int)"],
        cgScriptSndLengthNotify: [6721, "CG_ScriptSndLengthNotify(int, int)"]
      },
      bytePatches: [
        {
          fn: "clCreateCmd",
          find: "10 ef 06 41 07 46 0d 00 20 05 20 05 28 02 04 41 04 72 36 02 04",
          replace: "10 ef 06 41 07 46 0d 00 20 05 20 05 28 02 04 41 00 72 36 02 04"
        },
        {
          fn: "cgScriptSndLengthNotify",
          role: "guest",
          find: "41 d0 db 8a c2 00 28 02 00 2d 00 18 41 01 46 04 40",
          replace: "41 d0 db 8a c2 00 28 02 00 2d 00 18 41 02 46 04 40"
        }
      ],
      // The words after introState are taken by vel.gg's co-op in this build. Linear memory below 1024 (where static
      // data starts) is never used by emscripten, so the mailboxes live there.
      mailbox: { command: 1008, freeze: 1012, inboundRing: 1016 },
      loopback: { base: 139466576, stride: 20360, slots: 16, slotSize: 1272, dataMax: 1264, offLen: 1264, offPort: 1268, offGet: 20352, offSend: 20356 },
      reservedPorts: [0, 1, 1773],
      server: {
        allowNetPackets: 146182322,
        clientsPtr: 146048924,
        clientStride: 544120,
        clientState: 0,
        clientAddrType: 32,
        clientAddrPort: 40
      },
      client: {
        connectionState: 14090472,
        clcPtr: 44481716,
        serverAddressPort: 24,
        lastPacketTime: 12,
        codeTimeScale: 138587744
      },
      dvars: { comSvRunning: 138587600, svPaused: 138587588, clPaused: 138587592, comMaxClients: 138587440 },
      dvarValue: 24,
      introState: 151951500,
      loopbackAddressType: 2,
      fun: {
        entities: 91240656,
        entitySize: 760,
        ent: { client: 324, flags: 372, health: 404 },
        entFlags: { god: 1, demigod: 2, notarget: 4 },
        client: { ammoPools: 832, ammoClips: 952, ammoSlots: 15, speedScale: 10088, score: 10276, flags: 10396 },
        clientFlags: { noclip: 1, ufo: 2 },
        cheatsDvar: 90624344
      }
    },
    // Served at https://vel.gg/bo1z/ since 2026-10-14 (the release with vel.gg's own co-op), 9,902,179 bytes. Same
    // functions and struct layouts as the build below, moved around.
    "c025d5383791b8a3b4244713e6f3e75d958d550d3f6c83a49ac3928be2ccdb5c": {
      functions: {
        svFrame: [2963, "__wrap__Z8SV_Frameii"],
        netGetLoopPacket: [4119, "NET_GetLoopPacket(netsrc_t, netadr_t*, msg_t*)"],
        cbufAddText: [286, "Cbuf_AddText(int, char const*)"],
        svWaitServer: [1654, "SV_WaitServer()"],
        assertHandler: [170, "Assert_MyHandler(char const*, int, int, char const*, ...)"],
        cachedTagUpdate: [4410, "CachedTag_UpdateTagInternal(centity_s const*, cached_client_tag_t*, unsigned int, int, bool)"],
        comError: [179, "Com_Error(errorParm_t, char const*, ...)"],
        clCreateCmd: [6685, "CL_CreateCmd(usercmd_s*, int)"],
        cgScriptSndLengthNotify: [6720, "CG_ScriptSndLengthNotify(int, int)"]
      },
      bytePatches: [
        {
          fn: "clCreateCmd",
          find: "10 ef 06 41 07 46 0d 00 20 05 20 05 28 02 04 41 04 72 36 02 04",
          replace: "10 ef 06 41 07 46 0d 00 20 05 20 05 28 02 04 41 00 72 36 02 04"
        },
        {
          fn: "cgScriptSndLengthNotify",
          role: "guest",
          find: "41 e0 d1 8a c2 00 28 02 00 2d 00 18 41 01 46 04 40",
          replace: "41 e0 d1 8a c2 00 28 02 00 2d 00 18 41 02 46 04 40"
        }
      ],
      // The words after introState are taken by vel.gg's co-op in this build. Linear memory below 1024 (where static
      // data starts) is never used by emscripten, so the mailboxes live there.
      mailbox: { command: 1008, freeze: 1012, inboundRing: 1016 },
      loopback: { base: 139465312, stride: 20360, slots: 16, slotSize: 1272, dataMax: 1264, offLen: 1264, offPort: 1268, offGet: 20352, offSend: 20356 },
      reservedPorts: [0, 1, 1773],
      server: {
        allowNetPackets: 146181042,
        clientsPtr: 146047644,
        clientStride: 544120,
        clientState: 0,
        clientAddrType: 32,
        clientAddrPort: 40
      },
      client: {
        connectionState: 14090344,
        clcPtr: 44481588,
        serverAddressPort: 24,
        lastPacketTime: 12,
        codeTimeScale: 138586480
      },
      dvars: { comSvRunning: 138586336, svPaused: 138586324, clPaused: 138586328, comMaxClients: 138586176 },
      dvarValue: 24,
      introState: 151950108,
      loopbackAddressType: 2,
      fun: {
        entities: 91240528,
        entitySize: 760,
        ent: { client: 324, flags: 372, health: 404 },
        entFlags: { god: 1, demigod: 2, notarget: 4 },
        client: { ammoPools: 832, ammoClips: 952, ammoSlots: 15, speedScale: 10088, score: 10276, flags: 10396 },
        clientFlags: { noclip: 1, ufo: 2 },
        cheatsDvar: 90624216
      }
    },
    // Served at https://vel.gg/bo1z/ since 2026-10-04, 9,618,325 bytes.
    "61192df377020627f52fa7e9fd28047bd53662aa46e5e3cd6e7fad0c5c35cc98": {
      // Functions the patcher edits or calls. The name is checked against the wasm name section before touching
      // anything, so a wrong index fails loudly instead of corrupting the engine.
      functions: {
        svFrame: [3646, "__wrap__Z8SV_Frameii"],
        netGetLoopPacket: [4026, "NET_GetLoopPacket(netsrc_t, netadr_t*, msg_t*)"],
        cbufAddText: [291, "Cbuf_AddText(int, char const*)"],
        svWaitServer: [1391, "SV_WaitServer()"],
        assertHandler: [170, "Assert_MyHandler(char const*, int, int, char const*, ...)"],
        cachedTagUpdate: [4317, "CachedTag_UpdateTagInternal(centity_s const*, cached_client_tag_t*, unsigned int, int, bool)"],
        comError: [179, "Com_Error(errorParm_t, char const*, ...)"],
        clCreateCmd: [6552, "CL_CreateCmd(usercmd_s*, int)"],
        cgScriptSndLengthNotify: [6587, "CG_ScriptSndLengthNotify(int, int)"]
      },
      // Same-length byte edits, each required to match exactly once inside its function (hex, wasm opcodes).
      bytePatches: [
        {
          // With a menu or the chat open, the client flags its usercmds (button_bits[1] |= 4). Other players then draw
          // an "in a menu" marker over that player whose material zombies never loads, and crash in
          // Material_GetTechnique called from fx_drawCallback. Turning the `i32.const 4` into 0 keeps the flag off.
          fn: "clCreateCmd",
          find: "10 dc 06 41 07 46 0d 00 20 05 20 05 28 02 04 41 04 72 36 02 04",
          replace: "10 dc 06 41 07 46 0d 00 20 05 20 05 28 02 04 41 00 72 36 02 04"
        },
        {
          // Guests only. Script sounds report their length to the server with the reliable command "sl", meant to come
          // from the listen-server player alone (checked via com_sv_running == 1). A guest's own idle server still
          // counts as running, so guests sent it too; while the host waits in the lobby nothing acknowledges them and
          // the guest drops with EXE_ERR_CLIENT_CMD_OVERFLOW. Comparing with 2 instead makes the check always fail.
          fn: "cgScriptSndLengthNotify",
          role: "guest",
          find: "41 c8 f8 a9 c0 00 28 02 00 2d 00 18 41 01 46 04 40",
          replace: "41 c8 f8 a9 c0 00 28 02 00 2d 00 18 41 02 46 04 40"
        }
      ],
      // Three unused, zero-filled words in the engine's static data, used as mailboxes between the page and the engine
      // threads: a pending console command (char*), a "hold the local server" flag, and the extra inbound ring index.
      mailbox: { command: 148263172, freeze: 148263176, inboundRing: 148263180 },
      // The engine's two loopback queues (index 0: server to local client, 1: clients to server). Each holds 16 slots of
      // { data[1264], length, port } followed by its read and write counters. When the server sends to loopback port P
      // it writes into queue P without a bounds check, which is what lets extra queues live elsewhere in memory.
      loopback: { base: 135783616, stride: 20360, slots: 16, slotSize: 1272, dataMax: 1264, offLen: 1264, offPort: 1268, offGet: 20352, offSend: 20356 },
      // 0 and 1 are the engine's own queues; 1773 is a port the server treats specially in this build.
      reservedPorts: [0, 1, 1773],
      server: {
        allowNetPackets: 142494258,
        // u8: the server thread reads the inbound queue only while this is 1
        clientsPtr: 142360860,
        // client_t* svs.clients
        clientStride: 544120,
        clientState: 0,
        // i32: 0 free, 1 zombie, 2 reconnecting, 3 connected, 4 loading, 5 active
        clientAddrType: 32,
        // i32 netadr_t.type
        clientAddrPort: 40
        // u16 netadr_t.port
      },
      client: {
        connectionState: 13391960,
        // i32: 5 challenging ... 10 active
        clcPtr: 43783020,
        // clientConnection_t*
        serverAddressPort: 24,
        // u16, inside clientConnection_t
        lastPacketTime: 12,
        // i32, inside clientConnection_t; 0 disables the client's timeout check
        // f32 com_codeTimeScale: the game's slow motion, set by the "X" server command (game over slows it to 0.1).
        // Written as 1.0 by SP_TemporaryReloadMap, which only runs where the server is.
        codeTimeScale: 134905048
      },
      // Each entry points to a dvar_s whose current value sits at +dvarValue.
      dvars: { comSvRunning: 134904904, svPaused: 134904892, clPaused: 134904896, comMaxClients: 134904752 },
      dvarValue: 24,
      // vel.gg's page layer: 1 while the map waits behind the "click to start" screen.
      introState: 148263168,
      loopbackAddressType: 2,
      // NA_LOOPBACK
      // Fun mode panel. Read from this build's code and checked in a running game: g_entities and its stride
      // (Cmd_God_f / SV_GameSendServerCommand), gentity fields (ClientCommand's god/demigod/notarget toggles), gclient
      // fields (noclip/ufo toggles, ScrCmd_SetMoveSpeedScale, BG_GetAmmoPool / BG_GetAmmoClip), score (HUD-verified).
      fun: {
        entities: 87604176,
        entitySize: 760,
        ent: { client: 324, flags: 372, health: 404 },
        entFlags: { god: 1, demigod: 2, notarget: 4 },
        client: { ammoPools: 832, ammoClips: 952, ammoSlots: 15, speedScale: 10088, score: 10276, flags: 10396 },
        clientFlags: { noclip: 1, ufo: 2 },
        cheatsDvar: 86987848
        // g_cheats; the panel's console commands need it on (devmap maps have it on)
      }
    }
  };
  var CONNECTION = Object.freeze({ disconnected: 0, connecting: 4, challenging: 5, connected: 6, loading: 8, primed: 9, active: 10 });
  var SLOT = Object.freeze({ free: 0, zombie: 1, reconnecting: 2, connected: 3, loading: 4, active: 5 });

  // src/game/page.js
  var BASE = "/bsz/";
  var MOVED_FROM = ["/bo1z/"];
  var MAP_SLUGS = {
    zombie_pentagon: "five",
    zombie_theater: "kino",
    zombie_cod5_factory: "riese",
    zombie_cod5_prototype: "nacht",
    zombie_cod5_asylum: "verruckt",
    zombie_cod5_sumpf: "shinonuma",
    zombie_cosmodrome: "ascension",
    zombie_coast: "cotd",
    zombie_temple: "shangrila",
    zombie_moon: "moon"
  };
  var MAP_NAMES = {
    five: "Five",
    kino: "Kino der Toten",
    riese: "Der Riese",
    nacht: "Nacht der Untoten",
    verruckt: "Verrückt",
    shinonuma: "Shi No Numa",
    ascension: "Ascension",
    cotd: "Call of the Dead",
    shangrila: "Shangri-La",
    moon: "Moon"
  };
  var screen = () => window.five?.screen;
  function currentZone() {
    const zone = document.documentElement?.dataset.map;
    if (zone) return zone;
    const slug = currentSlug();
    return Object.keys(MAP_SLUGS).find((z) => MAP_SLUGS[z] === slug) ?? null;
  }
  function currentSlug() {
    const zone = document.documentElement?.dataset.map;
    if (zone && MAP_SLUGS[zone]) return MAP_SLUGS[zone];
    const match = location.pathname.match(/^\/(?:[a-z0-9]+\/)?([a-z]+)\/?$/);
    return match && Object.values(MAP_SLUGS).includes(match[1]) ? match[1] : null;
  }
  var currentHorde = () => document.documentElement?.dataset.mode === "horde" || new URLSearchParams(location.search).get("horde") === "1";
  var currentGuns = () => new URLSearchParams(location.search).get("guns") === "cs" ? "cs" : "classic";
  function keepSinglePlayer(room) {
    const fix = (value) => {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin || !`${url.pathname}/`.startsWith(BASE)) return value;
      const params = url.searchParams;
      params.delete("room");
      params.set("coopRoom", room);
      params.set("mode", "single");
      if (params.get("guns") !== "cs") params.set("guns", "classic");
      return url.href;
    };
    history.replaceState(history.state, "", fix(location.href));
    for (const name of ["pushState", "replaceState"]) {
      const original = history[name];
      history[name] = function(state, title, url) {
        return original.call(this, state, title, url == null ? url : fix(String(url)));
      };
    }
    Object.defineProperty(globalThis, "__kisakMode", { configurable: true, get: () => "single", set() {
    } });
    const style = document.createElement("style");
    style.textContent = "#coop-mode-label { display: none !important; }";
    document.documentElement.append(style);
  }
  function latestView() {
    const view2 = window.five?.views?.at(-1);
    return view2 && Array.isArray(view2.origin) && view2.origin.length === 3 && view2.origin.every(Number.isFinite) ? view2 : null;
  }
  function go(url) {
    const target2 = new URL(url, location.href);
    location.assign(target2.href);
    if (target2.pathname === location.pathname && target2.search === location.search) location.reload();
  }
  var landingUrl = (params) => `${BASE.replace(/\/$/, "")}#${params.replace(/^[?&#]/, "")}`;
  function paramsFromHash() {
    const hash = location.hash.slice(1);
    if (!/(^|&)coop=/.test(hash)) return;
    const url = new URL(location.href);
    for (const [key, value] of new URLSearchParams(hash)) url.searchParams.set(key, value);
    url.hash = "";
    history.replaceState(history.state, "", url.href);
  }
  function followMovedSite() {
    const old = MOVED_FROM.find((prefix) => `${location.pathname}/`.startsWith(prefix));
    if (!old) return;
    document.addEventListener("DOMContentLoaded", () => {
      if (document.body?.querySelector("canvas, main")) return;
      const rest = `${location.pathname}/`.slice(old.length).replace(/\/$/, "");
      location.replace(rest ? `${BASE}${rest}${location.search}${location.hash}` : location.search ? landingUrl(location.search) : BASE);
    });
  }
  var GAME_SETTINGS = /^(fs_mods|horde_[a-z_]+|kisak_mod_[a-z_]+|r_mod_[a-z_]+|r_dobjLimit|cg_mod_[a-z_]+|zinfo|noperks)$/i;
  function devmapZone(args) {
    const i = args.indexOf("+devmap");
    return i >= 0 ? args[i + 1] : null;
  }
  function insertBeforeDevmap(args, extra) {
    const i = args.indexOf("+devmap");
    args.splice(i < 0 ? args.length : i, 0, ...extra);
  }
  function gameSettings(args) {
    const out = [];
    for (let i = 0; i + 2 < args.length; i += 1) if (args[i] === "+set" && GAME_SETTINGS.test(args[i + 1])) out.push([args[i + 1], args[i + 2]]);
    return out;
  }
  function applyGameSettings(args, settings) {
    for (let i = args.length - 3; i >= 0; i -= 1) if (args[i] === "+set" && GAME_SETTINGS.test(args[i + 1])) args.splice(i, 3);
    const safe = settings.filter(([k, v]) => typeof k === "string" && GAME_SETTINGS.test(k) && typeof v === "string" && /^[\w .-]{0,64}$/.test(v));
    insertBeforeDevmap(args, safe.flatMap(([k, v]) => ["+set", k, v]));
  }

  // src/input/gamepad.js
  var BUTTON = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, share: 8, options: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15 };
  var HELD_ACTIONS = /* @__PURE__ */ new Map([
    [BUTTON.cross, "gostand"],
    // jump
    [BUTTON.square, "usereload"],
    // reload; hold to use, buy or revive
    [BUTTON.l1, "smoke"],
    // special grenade
    [BUTTON.r1, "frag"],
    // grenade
    [BUTTON.l2, "speed_throw"],
    // aim down sights
    [BUTTON.r2, "attack"],
    // fire
    [BUTTON.share, "scores"],
    [BUTTON.r3, "melee"]
  ]);
  var DPAD_SLOTS = /* @__PURE__ */ new Map([[BUTTON.up, 1], [BUTTON.down, 2], [BUTTON.left, 3], [BUTTON.right, 4]]);
  var KEY = { escape: 27, up: 154, down: 155, left: 156, right: 157, mouse1: 200 };
  var AXIS_KEY = { forward: 301, back: 302, moveleft: 303, moveright: 304 };
  var INPUT = { key: 0, mouseMove: 2, cursor: 4 };
  var MOVE_DEADZONE = 0.16;
  var LOOK_DEADZONE = 0.12;
  var TRIGGER_THRESHOLD = 0.35;
  var PRONE_HOLD_MS = 350;
  var MAX_COMMAND_LENGTH = 900;
  var AIM_SPEEDS = [400, 600, 800, 1e3, 1250, 1500, 1800, 2100, 2500, 3e3];
  var clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  function stick(pad, xAxis, yAxis, deadzone) {
    const x = pad.axes[xAxis] ?? 0;
    const y = pad.axes[yAxis] ?? 0;
    const magnitude = Math.hypot(x, y);
    if (magnitude < deadzone) return [0, 0];
    const scaled = Math.min(1, (magnitude - deadzone) / (1 - deadzone));
    return [x / magnitude * scaled, y / magnitude * scaled];
  }
  var Gamepad = class {
    /**
     * @param engine () => { Module, command(text) } while the player is in a game, otherwise null
     * @param canvasSize () => { width, height }
     */
    constructor({ engine, canvasSize, aimLevel = 4 }) {
      this.engine = engine;
      this.canvasSize = canvasSize;
      this.aimLevel = aimLevel;
      this.status = "none";
      this.name = "";
      this.previous = [];
      this.held = /* @__PURE__ */ new Set();
      this.movement = { forward: 0, back: 0, moveleft: 0, moveright: 0 };
      this.sprinting = false;
      this.circleDownAt = 0;
      this.wentProne = false;
      this.lookRemainder = [0, 0];
      this.cursor = null;
      this.commands = [];
      this.lastFrame = 0;
      this.running = false;
    }
    start() {
      if (this.running) return;
      this.running = true;
      const frame = (time) => {
        if (!this.running) return;
        try {
          this.update(time);
        } catch (error) {
          this.status = `error: ${error.message}`;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
      addEventListener("blur", () => this.releaseAll());
    }
    findPad() {
      const pads = [...navigator.getGamepads?.() ?? []].filter((pad) => pad?.connected);
      return pads.find((pad) => pad.mapping === "standard") ?? pads[0] ?? null;
    }
    update(time) {
      const dt = this.lastFrame ? Math.min(0.1, (time - this.lastFrame) / 1e3) : 0;
      this.lastFrame = time;
      const pad = this.findPad();
      if (!pad) {
        if (this.status !== "none") this.releaseAll();
        this.status = "none";
        return;
      }
      this.name = pad.id;
      const engine = this.engine();
      if (!engine) {
        this.status = "waiting";
        return;
      }
      this.status = "active";
      const down = pad.buttons.map((button, i) => i === BUTTON.l2 || i === BUTTON.r2 ? button.value > TRIGGER_THRESHOLD : button.pressed);
      const pressed = (i) => down[i] && !this.previous[i];
      const released = (i) => !down[i] && this.previous[i];
      if (engine.Module._KB_UIState?.() & 1) {
        this.releaseGameplay();
        this.menuInput(engine, pad, pressed, released, dt);
      } else {
        this.cursor = null;
        this.gameInput(engine, pad, down, pressed, released, dt);
      }
      this.previous = down;
      this.flush(engine);
    }
    gameInput(engine, pad, down, pressed, released, dt) {
      for (const [button, action] of HELD_ACTIONS) {
        if (pressed(button)) this.press(action);
        if (released(button)) this.release(action);
      }
      for (const [button, slot] of DPAD_SLOTS) {
        if (pressed(button)) this.commands.push(`+actionslot ${slot}`);
        if (released(button)) this.commands.push(`-actionslot ${slot}`);
      }
      if (pressed(BUTTON.triangle)) this.commands.push("weapnext");
      if (pressed(BUTTON.options)) this.tap(engine, KEY.escape);
      if (pressed(BUTTON.circle)) {
        this.circleDownAt = performance.now();
        this.wentProne = false;
      }
      if (down[BUTTON.circle] && !this.wentProne && performance.now() - this.circleDownAt > PRONE_HOLD_MS) {
        this.commands.push("toggleprone");
        this.wentProne = true;
      }
      if (released(BUTTON.circle) && !this.wentProne) this.commands.push("togglecrouch");
      const [mx, my] = stick(pad, 0, 1, MOVE_DEADZONE);
      this.setMovement("forward", Math.max(0, -my));
      this.setMovement("back", Math.max(0, my));
      this.setMovement("moveleft", Math.max(0, -mx));
      this.setMovement("moveright", Math.max(0, mx));
      if (pressed(BUTTON.l3) && !this.sprinting) {
        this.commands.push("+breath_sprint");
        this.sprinting = true;
      }
      if (this.sprinting && Math.hypot(mx, my) < 0.3) {
        this.commands.push("-breath_sprint");
        this.sprinting = false;
      }
      const [lx, ly] = stick(pad, 2, 3, LOOK_DEADZONE);
      const tilt = Math.hypot(lx, ly);
      if (tilt > 0) {
        const speed = AIM_SPEEDS[this.aimLevel] * tilt ** 1.6 / tilt * (down[BUTTON.l2] ? 0.5 : 1);
        this.lookRemainder[0] += lx * speed * dt;
        this.lookRemainder[1] += ly * speed * dt;
        const dx = Math.trunc(this.lookRemainder[0]);
        const dy = Math.trunc(this.lookRemainder[1]);
        this.lookRemainder[0] -= dx;
        this.lookRemainder[1] -= dy;
        if (dx || dy) engine.Module._KB_Input(INPUT.mouseMove, dx, dy);
      }
    }
    menuInput(engine, pad, pressed, released, dt) {
      const size = this.canvasSize();
      this.cursor ??= [size.width / 2, size.height / 2];
      const [ax, ay] = stick(pad, 0, 1, MOVE_DEADZONE);
      const [bx, by] = stick(pad, 2, 3, LOOK_DEADZONE);
      const vx = ax || bx;
      const vy = ay || by;
      if (vx || vy) {
        const speed = size.height * 1.1;
        this.cursor[0] = clamp(this.cursor[0] + vx * speed * dt, 0, size.width - 1);
        this.cursor[1] = clamp(this.cursor[1] + vy * speed * dt, 0, size.height - 1);
        engine.Module._KB_Input(INPUT.cursor, Math.round(this.cursor[0]), Math.round(this.cursor[1]));
      }
      if (pressed(BUTTON.cross)) engine.Module._KB_Input(INPUT.key, KEY.mouse1, 1);
      if (released(BUTTON.cross)) engine.Module._KB_Input(INPUT.key, KEY.mouse1, 0);
      if (pressed(BUTTON.circle) || pressed(BUTTON.options)) this.tap(engine, KEY.escape);
      for (const [button, key] of [[BUTTON.up, KEY.up], [BUTTON.down, KEY.down], [BUTTON.left, KEY.left], [BUTTON.right, KEY.right]]) {
        if (pressed(button)) this.tap(engine, key);
      }
    }
    press(action) {
      if (this.held.has(action)) return;
      this.held.add(action);
      this.commands.push(`+${action}`);
    }
    release(action) {
      if (this.held.delete(action)) this.commands.push(`-${action}`);
    }
    tap(engine, key) {
      engine.Module._KB_Input(INPUT.key, key, 1);
      engine.Module._KB_Input(INPUT.key, key, 0);
    }
    /** Analog movement: "+forward <key> 0 <amount>" with the amount rounded to 5% steps to limit traffic. */
    setMovement(direction, amount) {
      const rounded = Math.round(amount * 20) / 20;
      if (rounded === this.movement[direction]) return;
      this.movement[direction] = rounded;
      this.commands.push(rounded > 0 ? `+${direction} ${AXIS_KEY[direction]} 0 ${rounded}` : `-${direction} ${AXIS_KEY[direction]}`);
    }
    releaseGameplay() {
      for (const action of [...this.held]) this.release(action);
      for (const direction of Object.keys(this.movement)) this.setMovement(direction, 0);
      if (this.sprinting) {
        this.commands.push("-breath_sprint");
        this.sprinting = false;
      }
    }
    releaseAll() {
      this.releaseGameplay();
      this.previous = [];
      const engine = this.engine();
      if (engine) this.flush(engine);
    }
    /** Sends queued commands as one ";"-joined line per frame; kept for later while the previous line is pending. */
    flush(engine) {
      if (!this.commands.length) return;
      if (this.commands.length > 200) this.commands.splice(0, this.commands.length - 200);
      let count = 0;
      let length = 0;
      while (count < this.commands.length && length + this.commands[count].length + 1 < MAX_COMMAND_LENGTH) length += this.commands[count++].length + 1;
      if (engine.command(this.commands.slice(0, count).join(";"))) this.commands.splice(0, count);
    }
  };

  // src/ui/strings.js
  var LANG = /^pt\b/i.test(navigator.language ?? "") ? "pt" : "en";
  var STRINGS = {
    en: {
      tagline: "up to 4 players",
      chip: { solo: "Solo", hosting: "Hosting", joining: "Joining", lobby: "Lobby", ingame: "In game", paused: "Paused", offline: "Offline", error: "Error", ended: "Disconnected" },
      intro: "Play zombies with up to 3 friends. One player hosts, the others join with the invite link. Everyone needs this extension.",
      host: "Host a game",
      joinLabel: "Join a friend",
      joinPlaceholder: "Room code or invite link",
      join: "Join",
      room: "Room",
      inviteAside: (n) => `${n} free seat${n === 1 ? "" : "s"}`,
      copy: "Copy link",
      copyCode: "Copy code",
      copied: "Copied!",
      players: "Lobby",
      playersAside: (n, max) => `${n}/${max} connected`,
      freeHint: "Send someone the link",
      player: (n) => `Player ${n}`,
      you: "you",
      hostTag: "host",
      st: {
        free: "Free seat",
        left: "Left",
        reconnecting: "Reconnecting…",
        disconnected: "Disconnected · can rejoin",
        ingame: "In game",
        ready: "Ready",
        joining: "Joining…",
        turn: "Next in line",
        loading: "Loading the map…",
        picking: "Picking a map",
        lobby: "In the lobby",
        opening: "Opening the room…",
        away: "Not in the room"
      },
      map: "Map",
      noMap: "Not picked yet",
      mapSubHost: "Everyone follows you to this map",
      mapSubGuest: "Picked by the host",
      hell: "Hell mode",
      stepsGuest: ["Room", "Map", "Load", "Join", "Play"],
      stepsHost: ["Map", "Load", "Lobby", "Play"],
      pickMap: "Pick a map in the game menu. Everyone follows you to it.",
      gate: "Players are on the way. Your start waits for them, so everyone spawns together.",
      startNow: "Start now",
      allIn: "Everyone is in. Click the game to start.",
      latecomers: "Players who join after the start watch until the next round (the BO1 rule for latecomers).",
      pausedYou: "Paused. Everyone is paused too.",
      pausedBy: "Paused by another player.",
      waitingHost: "Waiting for the host…",
      hostPicking: "Waiting for the host to pick a map…",
      opening: (m) => `Opening ${m}…`,
      pressKey: "Press any key on the page to load the map.",
      loadingMap: "Loading the map…",
      hostLoading: "Waiting for the host to finish loading…",
      nextInLine: "Another player is joining. You are next.",
      connecting: "Connecting to the host…",
      joiningGame: "Joining the host's game…",
      waitingStart: "You are in. Waiting for the host to start.",
      clickToPlay: "You are in. Click the game to play.",
      lateJoin: "The host had already started: you watch until the next round, then spawn.",
      ended: "Disconnected from the host. You can rejoin while the host keeps playing.",
      failed: "Could not join. Try again.",
      rejoin: "Rejoin",
      goToHost: "Go to the host",
      leave: "Leave co-op",
      otherRelay: (h) => `This invite uses another relay (${h}). Switch to it to join.`,
      useRelay: "Use this relay",
      settings: "Settings",
      yourName: "Your name",
      namePlaceholder: "Shown in the lobby",
      save: "Save",
      connection: "Connection",
      relay: "Relay",
      relayState: { open: "Connected", connecting: "Connecting…", closed: "Reconnecting…", idle: "Starting…" },
      ping: "Ping",
      path: { direct: "Direct", relay: "Relay", connecting: "Connecting…" },
      pathCount: (d, r) => `${d} Direct, ${r} Relay`,
      dropped: "Packets dropped",
      relayDefault: "Default relay",
      relayCustom: (h) => `Custom (${h})`,
      relayNote: "Free Cloudflare plan: a few hours of play a day, shared by everyone on this relay. For a group that plays often, create your own (5 minutes, free).",
      changeRelay: "Change relay",
      useDefault: "Use the default relay",
      cancel: "Cancel",
      relayEditNote: "Everyone must use the same relay. Your invite links carry it.",
      relayPlaceholder: "https://your-relay.workers.dev",
      usage: (p, t) => `Today: ${p}% of the free allowance used · resets at ${t}`,
      usedUp: (t) => `Today's allowance is used up · resets at ${t}`,
      controller: "Controller",
      ctrl: { off: "Off", unavailable: "Unavailable", press: "Press any button on it", later: (n) => `${n} · works in game`, active: (n, a, max) => `${n} · aim ${a}/${max}` },
      aimDown: "Aim −",
      aimUp: "Aim +",
      turnOff: "Turn off",
      turnOn: "Turn on",
      credits: "Game: vel.gg by MisaDev4 · Co-op: BO1 Zombies Co-op",
      notRoomCode: "That is not a room code. Paste the invite link or the 16-letter code.",
      notRelay: "That is not a relay address. It looks like https://something.workers.dev",
      controllerReload: "Reload the page to apply the controller setting.",
      engineUpdated: "vel.gg updated its game engine, and this version of the extension does not know it yet: co-op and the controller are off.",
      enginePatchFailed: (m) => `Could not prepare the engine (${m}): co-op and the controller are off.`,
      replaced: "This room was opened in another tab or window.",
      full: (n) => `This game is full (${n} players).`,
      workerFailed: (m) => `Co-op worker failed: ${m}`,
      unexpectedMemory: "Unexpected engine memory: co-op is off.",
      hostNoAnswer: "The host did not answer. Check that their game page is open, then reload.",
      versionMismatch: "You and the host have different versions of the game. Reload both pages.",
      hostPlaying: (m) => `The host is playing ${m}. Reload this page.`,
      connectFailed: "Could not start the connection to the host. Reload both pages.",
      notLetIn: "The host did not let us in. Reload both pages and try again.",
      hostLeft: "The host left the game.",
      updateAvailable: (v) => `Version ${v} is out. Updating takes about a minute.`,
      updateHow: "How to update",
      relayOverQuota: (t) => `This relay used up today's free allowance${t ? ` (it comes back at ${t})` : ""}. With your own relay, free and set up in 5 minutes, your group plays now.`,
      relayGuide: "Create my relay",
      relayPitch: "Co-op runs through a relay. The shared one is free but small: a few hours of play a day for everyone together, and it runs out when many people play. Your own relay is free too, takes 5 minutes to create, and is only for your group.",
      relayPitchHost: "You are on the shared relay, which can run out on busy days. With your own (free, 5 minutes) your group never waits.",
      relayHaveOne: "I already have one"
    },
    pt: {
      tagline: "até 4 jogadores",
      chip: { solo: "Solo", hosting: "Hospedando", joining: "Entrando", lobby: "Lobby", ingame: "Em jogo", paused: "Pausado", offline: "Offline", error: "Erro", ended: "Desconectado" },
      intro: "Jogue zombies com até 3 amigos. Um jogador hospeda e os outros entram pelo link de convite. Todos precisam desta extensão.",
      host: "Hospedar partida",
      joinLabel: "Entrar na partida de um amigo",
      joinPlaceholder: "Código da sala ou link",
      join: "Entrar",
      room: "Sala",
      inviteAside: (n) => `${n} vaga${n === 1 ? "" : "s"} livre${n === 1 ? "" : "s"}`,
      copy: "Copiar link",
      copyCode: "Copiar código",
      copied: "Copiado!",
      players: "Lobby",
      playersAside: (n, max) => `${n}/${max} conectados`,
      freeHint: "Mande o link para alguém",
      player: (n) => `Jogador ${n}`,
      you: "você",
      hostTag: "host",
      st: {
        free: "Vaga livre",
        left: "Saiu",
        reconnecting: "Reconectando…",
        disconnected: "Desconectou · pode voltar",
        ingame: "Em jogo",
        ready: "Pronto",
        joining: "Entrando…",
        turn: "Na fila para entrar",
        loading: "Carregando o mapa…",
        picking: "Escolhendo o mapa",
        lobby: "No lobby",
        opening: "Abrindo a sala…",
        away: "Fora da sala"
      },
      map: "Mapa",
      noMap: "Ainda não escolhido",
      mapSubHost: "Todos vão seguir você para este mapa",
      mapSubGuest: "Escolhido pelo host",
      hell: "Hell mode",
      stepsGuest: ["Sala", "Mapa", "Carregar", "Entrar", "Jogar"],
      stepsHost: ["Mapa", "Carregar", "Lobby", "Jogar"],
      pickMap: "Escolha um mapa no menu do jogo. Todos vão seguir você.",
      gate: "Tem jogadores a caminho. Seu início espera por eles, para todos nascerem juntos.",
      startNow: "Começar agora",
      allIn: "Todos entraram. Clique no jogo para começar.",
      latecomers: "Quem entrar depois do início assiste até a próxima rodada (regra do BO1 para quem chega atrasado).",
      pausedYou: "Pausado. Todos estão pausados também.",
      pausedBy: "Pausado por outro jogador.",
      waitingHost: "Esperando o host…",
      hostPicking: "Esperando o host escolher o mapa…",
      opening: (m) => `Abrindo ${m}…`,
      pressKey: "Aperte qualquer tecla na página para carregar o mapa.",
      loadingMap: "Carregando o mapa…",
      hostLoading: "Esperando o host terminar de carregar…",
      nextInLine: "Outro jogador está entrando. Você é o próximo.",
      connecting: "Conectando ao host…",
      joiningGame: "Entrando na partida do host…",
      waitingStart: "Você entrou. Esperando o host começar.",
      clickToPlay: "Você entrou. Clique no jogo para jogar.",
      lateJoin: "O host já tinha começado: você assiste até a próxima rodada e então nasce.",
      ended: "Desconectado do host. Você pode voltar enquanto o host continuar jogando.",
      failed: "Não deu para entrar. Tente de novo.",
      rejoin: "Voltar para a partida",
      goToHost: "Ir até o host",
      leave: "Sair do co-op",
      otherRelay: (h) => `Este convite usa outro relay (${h}). Troque para ele para entrar.`,
      useRelay: "Usar este relay",
      settings: "Configurações",
      yourName: "Seu nome",
      namePlaceholder: "Aparece no lobby",
      save: "Salvar",
      connection: "Conexão",
      relay: "Relay",
      relayState: { open: "Conectado", connecting: "Conectando…", closed: "Reconectando…", idle: "Iniciando…" },
      ping: "Ping",
      path: { direct: "Direta", relay: "Relay", connecting: "Conectando…" },
      pathCount: (d, r) => `${d} Direta, ${r} Relay`,
      dropped: "Pacotes perdidos",
      relayDefault: "Relay padrão",
      relayCustom: (h) => `Personalizado (${h})`,
      relayNote: "Plano grátis da Cloudflare: algumas horas de jogo por dia, divididas por todos que usam este relay. Para um grupo que joga sempre, crie o seu (5 minutos, grátis).",
      changeRelay: "Trocar relay",
      useDefault: "Usar o relay padrão",
      cancel: "Cancelar",
      relayEditNote: "Todos precisam usar o mesmo relay. Seus links de convite já levam ele.",
      relayPlaceholder: "https://seu-relay.workers.dev",
      usage: (p, t) => `Hoje: ${p}% da cota grátis usada · renova às ${t}`,
      usedUp: (t) => `Cota de hoje esgotada · renova às ${t}`,
      controller: "Controle",
      ctrl: { off: "Desligado", unavailable: "Indisponível", press: "Aperte qualquer botão nele", later: (n) => `${n} · funciona no jogo`, active: (n, a, max) => `${n} · mira ${a}/${max}` },
      aimDown: "Mira −",
      aimUp: "Mira +",
      turnOff: "Desligar",
      turnOn: "Ligar",
      credits: "Jogo: vel.gg por MisaDev4 · Co-op: BO1 Zombies Co-op",
      notRoomCode: "Isso não é um código de sala. Cole o link de convite ou o código de 16 letras.",
      notRelay: "Isso não é um endereço de relay. Ele parece com https://algo.workers.dev",
      controllerReload: "Recarregue a página para aplicar a configuração do controle.",
      engineUpdated: "O vel.gg atualizou o motor do jogo e esta versão da extensão ainda não o conhece: co-op e controle desligados.",
      enginePatchFailed: (m) => `Não deu para preparar o motor do jogo (${m}): co-op e controle desligados.`,
      replaced: "Esta sala foi aberta em outra aba ou janela.",
      full: (n) => `Esta partida está cheia (${n} jogadores).`,
      workerFailed: (m) => `O worker do co-op falhou: ${m}`,
      unexpectedMemory: "Memória do motor inesperada: co-op desligado.",
      hostNoAnswer: "O host não respondeu. Confira se a página do jogo dele está aberta e recarregue.",
      versionMismatch: "Você e o host estão com versões diferentes do jogo. Recarreguem as duas páginas.",
      hostPlaying: (m) => `O host está jogando ${m}. Recarregue esta página.`,
      connectFailed: "Não deu para iniciar a conexão com o host. Recarreguem as duas páginas.",
      notLetIn: "O host não deixou entrar. Recarreguem as duas páginas e tentem de novo.",
      hostLeft: "O host saiu da partida.",
      updateAvailable: (v) => `Saiu a versão ${v}. Atualizar leva cerca de 1 minuto.`,
      updateHow: "Como atualizar",
      relayOverQuota: (t) => `Este relay usou toda a cota grátis de hoje${t ? ` (ela volta às ${t})` : ""}. Com o seu próprio relay, grátis e criado em 5 minutos, o seu grupo joga agora.`,
      relayGuide: "Criar meu relay",
      relayPitch: "O co-op passa por um relay. O compartilhado é grátis, mas pequeno: algumas horas de jogo por dia para todo mundo junto, e acaba quando muita gente joga. O seu próprio relay também é grátis, leva 5 minutos para criar e é só do seu grupo.",
      relayPitchHost: "Você está no relay compartilhado, que pode acabar nos dias cheios. Com o seu (grátis, 5 minutos) o seu grupo nunca espera.",
      relayHaveOne: "Já tenho um"
    }
  };
  var T = STRINGS[LANG];

  // src/util/settings.js
  var PREFIX = "bo1coop.";
  function readSetting(key, fallback) {
    try {
      return localStorage.getItem(PREFIX + key) ?? fallback;
    } catch {
      return fallback;
    }
  }
  function saveSetting(key, value) {
    try {
      if (value === "" || value == null) localStorage.removeItem(PREFIX + key);
      else localStorage.setItem(PREFIX + key, value);
    } catch {
    }
  }
  function guestIdFor(room) {
    const key = `${PREFIX}guest:${room}`;
    try {
      const saved = sessionStorage.getItem(key);
      if (saved && GUEST_ID_PATTERN.test(saved)) return saved;
      const id = createGuestId();
      sessionStorage.setItem(key, id);
      return id;
    } catch {
      return createGuestId();
    }
  }
  var cleanName = (text3) => String(text3 ?? "").replace(/[^\p{L}\p{N} _.-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 16);

  // src/util/relay.js
  var DEFAULT_RELAY = "https://bo1z-coop-4p-relay.allanlotta.workers.dev";
  function normalizeRelay(text3) {
    try {
      const url = new URL(String(text3).trim());
      if (url.protocol === "wss:") url.protocol = "https:";
      return url.protocol === "https:" && url.hostname.includes(".") ? url.origin : "";
    } catch {
      return "";
    }
  }
  function isLoopback(url) {
    try {
      return ["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname);
    } catch {
      return false;
    }
  }
  function pickRelay(override) {
    if (override && isLoopback(override)) return override;
    return normalizeRelay(readSetting("relay", "")) || DEFAULT_RELAY;
  }
  function inviteLink(session) {
    const relay = session.relay !== DEFAULT_RELAY && !session.relayParam ? `&relay=${encodeURIComponent(session.relay)}` : "";
    return `${location.origin}${landingUrl(`coop=join&coopRoom=${session.room}${session.relayParam}${relay}`)}`;
  }

  // src/session/session.js
  var VERSION = "2.2.2";
  var AIM_LEVELS = 10;
  function createSession(search = location.search) {
    const params = new URLSearchParams(search);
    const room = normalizeRoomCode(params.get("coopRoom") ?? params.get("room") ?? "");
    const wanted = params.get("coop");
    const relayOverride = params.get("coopRelay");
    const session = {
      version: VERSION,
      /** "host", "guest", or null when playing solo. */
      mode: room && wanted === "host" ? "host" : room && wanted === "join" ? "guest" : null,
      room,
      relay: pickRelay(relayOverride),
      relayParam: relayOverride && isLoopback(relayOverride) ? `&coopRelay=${encodeURIComponent(relayOverride)}` : "",
      // A relay named in an invite is only used after the guest agrees to switch.
      inviteRelay: normalizeRelay(params.get("relay") ?? ""),
      // The controller drives the game through the patched engine, so with it on even solo games get patched.
      controller: readSetting("controller", "1") !== "0",
      aimLevel: Math.max(0, Math.min(AIM_LEVELS - 1, Number(readSetting("aim", "4")) || 0)),
      name: cleanName(readSetting("name", "")),
      // engine
      hash: null,
      build: null,
      patched: false,
      engine: null,
      zone: null,
      gameSettings: null,
      // network
      socket: "idle",
      pump: null,
      stats: null,
      usage: null,
      /** Host: some guest is in the room. Guest: the host is in the room. Either path counts (syncPresence). */
      peer: false,
      // direct links (src/net/direct.js): seat -> "direct" while that link is open (seat 0 on a guest is the host)
      direct: null,
      links: /* @__PURE__ */ new Map(),
      relayGuests: /* @__PURE__ */ new Set(),
      // host: the seats the relay says are in the room
      relayLeft: /* @__PURE__ */ new Set(),
      // host: seats the relay reported gone since this host connection's welcome
      relayPeer: false,
      // guest: the relay says the host is in the room
      // host
      queues: null,
      guests: /* @__PURE__ */ new Map(),
      // seat -> what the host knows about that guest
      joinTurn: null,
      // the seat currently allowed to connect
      joinTurnAt: 0,
      gate: false,
      // the host's start waits for players on their way
      startAlone: false,
      // guest
      phase: "idle",
      guestId: null,
      seat: null,
      hostInfo: null,
      // map and settings, from the host
      hostState: null,
      // the host's view of this guest (ready, slot state, join turn)
      lobby: null,
      // the room as the host last described it
      hostPos: null,
      hostTrail: [],
      // card
      update: null,
      // { version, url } when a newer release is out
      overQuota: null,
      // { resetsAt } while the relay is out of its daily allowance
      error: null,
      notice: null,
      editRelay: false,
      showSettings: false,
      copiedLinkAt: 0,
      copiedCodeAt: 0,
      log: []
    };
    session.note = (text3) => {
      session.log.push(`${(/* @__PURE__ */ new Date()).toISOString().slice(11, 23)} ${text3}`);
      if (session.log.length > 200) session.log.shift();
    };
    session.fail = (key, ...args) => {
      const text3 = T[key];
      session.error = typeof text3 === "function" ? text3(...args) : text3 ?? key;
    };
    session.onSocket = ({ state, code }) => {
      session.socket = state;
      if (state === "closed" && code === 4005) session.overQuota ??= { resetsAt: null };
      if (state === "closed" && code === 4001) session.fail("replaced");
      if (state === "closed" && code === 4004) session.fail("full", MAX_GUESTS + 1);
      session.note(`relay ${state}${code ? ` ${code}` : ""}`);
    };
    return session;
  }
  var validSeat = (seat) => Number.isInteger(seat) && seat >= 1 && seat <= MAX_GUESTS;

  // src/net/pump.js
  function startPump(session, onControl2) {
    const url = URL.createObjectURL(new Blob(['(() => {\n  // relay/src/protocol.js\n  var PROTOCOL_VERSION = 3;\n  var ROLES = Object.freeze(["host", "guest"]);\n  var RELAY_MESSAGE_TYPES = Object.freeze(["welcome", "peer", "error"]);\n  var MAX_GUESTS = 3;\n  var MAX_TEXT_BYTES = 4096;\n  var MAX_BINARY_BYTES = 65536;\n  var MAX_PACKET_BYTES = 1264;\n  function relaySocketUrl(relayBase, room, role, guestId) {\n    const url = new URL(relayBase);\n    url.protocol = url.protocol === "http:" || url.protocol === "ws:" ? "ws:" : "wss:";\n    url.pathname = `/v1/rooms/${encodeURIComponent(room)}`;\n    url.search = `?role=${role}&v=${PROTOCOL_VERSION}${role === "guest" ? `&id=${guestId}` : ""}`;\n    return url.toString();\n  }\n  var BATCH_VERSION = 1;\n  var KIND_PACKETS = 1;\n  var KIND_SEAT_PACKETS = 2;\n  function writeBatch(kind, items, seatOf, packetOf) {\n    const header = kind === KIND_SEAT_PACKETS ? 3 : 2;\n    let size = 4;\n    for (const item of items) size += header + packetOf(item).byteLength;\n    if (items.length > 65535 || size > MAX_BINARY_BYTES) throw new RangeError("packet batch too large");\n    const out = new Uint8Array(size);\n    const view = new DataView(out.buffer);\n    out[0] = BATCH_VERSION;\n    out[1] = kind;\n    view.setUint16(2, items.length, true);\n    let at = 4;\n    for (const item of items) {\n      const packet = packetOf(item);\n      if (packet.byteLength > MAX_PACKET_BYTES) throw new RangeError("packet too large");\n      if (kind === KIND_SEAT_PACKETS) out[at++] = seatOf(item);\n      view.setUint16(at, packet.byteLength, true);\n      out.set(packet, at + 2);\n      at += 2 + packet.byteLength;\n    }\n    return out;\n  }\n  function readBatch(kind, data) {\n    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);\n    if (bytes.byteLength < 4 || bytes[0] !== BATCH_VERSION || bytes[1] !== kind) return null;\n    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);\n    const count = view.getUint16(2, true);\n    const items = [];\n    let at = 4;\n    for (let i = 0; i < count; i += 1) {\n      let seat = 0;\n      if (kind === KIND_SEAT_PACKETS) {\n        if (at + 1 > bytes.byteLength) return null;\n        seat = bytes[at++];\n        if (seat < 1 || seat > MAX_GUESTS) return null;\n      }\n      if (at + 2 > bytes.byteLength) return null;\n      const length = view.getUint16(at, true);\n      at += 2;\n      if (length > MAX_PACKET_BYTES || at + length > bytes.byteLength) return null;\n      items.push({ seat, packet: bytes.subarray(at, at + length) });\n      at += length;\n    }\n    return at === bytes.byteLength ? items : null;\n  }\n  var encodePackets = (packets) => writeBatch(KIND_PACKETS, packets, null, (p) => p);\n  var decodePackets = (data) => readBatch(KIND_PACKETS, data)?.map((item) => item.packet) ?? null;\n  var encodeSeatPackets = (items) => writeBatch(KIND_SEAT_PACKETS, items, (i) => i.seat, (i) => i.packet);\n  var decodeSeatPackets = (data) => readBatch(KIND_SEAT_PACKETS, data);\n  function parseControl(text) {\n    if (typeof text !== "string" || text.length > MAX_TEXT_BYTES) return null;\n    let value;\n    try {\n      value = JSON.parse(text);\n    } catch {\n      return null;\n    }\n    const ok = value && typeof value === "object" && !Array.isArray(value) && typeof value.t === "string" && value.t.length <= 32;\n    return ok ? value : null;\n  }\n  var isPeerMessage = (message) => message !== null && !RELAY_MESSAGE_TYPES.includes(message.t);\n\n  // src/net/queues.js\n  var QueueReader = class {\n    constructor(buffer, loopback, base, { consume = false } = {}) {\n      this.i32 = new Int32Array(buffer);\n      this.u8 = new Uint8Array(buffer);\n      this.lb = loopback;\n      this.base = base;\n      this.readIndex = base + loopback.offGet >> 2;\n      this.writeIndex = base + loopback.offSend >> 2;\n      this.consume = consume;\n      this.cursor = Atomics.load(this.i32, this.writeIndex);\n      this.lost = 0;\n    }\n    /** Forgets everything written so far. */\n    skip() {\n      this.cursor = Atomics.load(this.i32, this.writeIndex);\n      if (this.consume) Atomics.store(this.i32, this.readIndex, this.cursor);\n    }\n    /** New packets since the last call. Slots the engine overwrote before we got to them count as lost. */\n    poll(out = []) {\n      const { slots, slotSize, offLen, dataMax } = this.lb;\n      let written = Atomics.load(this.i32, this.writeIndex);\n      if (written - this.cursor > slots - 1) {\n        this.lost += written - (slots - 1) - this.cursor;\n        this.cursor = written - (slots - 1);\n      }\n      while (this.cursor < written) {\n        const slot = this.base + (this.cursor & slots - 1) * slotSize;\n        const length = this.i32[slot + offLen >> 2];\n        const packet = length > 0 && length <= dataMax ? this.u8.slice(slot, slot + length) : null;\n        written = Atomics.load(this.i32, this.writeIndex);\n        if (written - this.cursor > slots - 1) this.lost += 1;\n        else if (packet) out.push(packet);\n        this.cursor += 1;\n      }\n      if (this.consume) Atomics.store(this.i32, this.readIndex, this.cursor);\n      return out;\n    }\n  };\n  var QueueWriter = class {\n    constructor(buffer, loopback, base) {\n      this.i32 = new Int32Array(buffer);\n      this.u8 = new Uint8Array(buffer);\n      this.lb = loopback;\n      this.base = base;\n      this.readIndex = base + loopback.offGet >> 2;\n      this.writeIndex = base + loopback.offSend >> 2;\n    }\n    hasRoom() {\n      return Atomics.load(this.i32, this.writeIndex) - Atomics.load(this.i32, this.readIndex) < this.lb.slots - 1;\n    }\n    /** False, without writing, when the engine has not caught up yet; the caller retries later. */\n    push(packet, port) {\n      const { slots, slotSize, offLen, offPort, dataMax } = this.lb;\n      if (packet.byteLength === 0 || packet.byteLength > dataMax) return true;\n      if (!this.hasRoom()) return false;\n      const written = Atomics.load(this.i32, this.writeIndex);\n      const slot = this.base + (written & slots - 1) * slotSize;\n      this.u8.set(packet, slot);\n      Atomics.store(this.i32, slot + offLen >> 2, packet.byteLength);\n      Atomics.store(this.i32, slot + offPort >> 2, port);\n      Atomics.add(this.i32, this.writeIndex, 1);\n      return true;\n    }\n  };\n  function connectionlessCommand(packet) {\n    if (packet.byteLength < 5 || packet[0] !== 255 || packet[1] !== 255 || packet[2] !== 255 || packet[3] !== 255) return null;\n    let end = 4;\n    while (end < packet.byteLength && end < 64 && packet[end] !== 0 && packet[end] !== 32 && packet[end] !== 10) end += 1;\n    return String.fromCharCode(...packet.subarray(4, end));\n  }\n\n  // src/net/rtc-messages.js\n  var RTC_TYPES = Object.freeze(["rtc-offer", "rtc-answer", "rtc-ice"]);\n\n  // src/net/routes.js\n  var LINK_STALE_MS = 1500;\n  function createRoutes() {\n    return {\n      /** seat -> { game, control }: the data channels the page handed over for that link */\n      links: /* @__PURE__ */ new Map(),\n      /** Host: the guest seats the relay says are in the room. */\n      relaySeats: /* @__PURE__ */ new Set()\n    };\n  }\n  function isDirect(routes, seat, now = performance.now()) {\n    const link = routes.links.get(seat);\n    if (link?.game?.readyState !== "open" || link?.control?.readyState !== "open") return false;\n    return link.aliveAt === void 0 || now - link.aliveAt < LINK_STALE_MS;\n  }\n  var packetPath = (routes, seat, now = performance.now()) => isDirect(routes, seat, now) ? "direct" : "relay";\n  function controlRoutes(routes, message, hosting2, now = performance.now()) {\n    const relay = [{ via: "relay", message }];\n    if (RTC_TYPES.includes(message.t)) return relay;\n    if (!hosting2) return isDirect(routes, 0, now) ? [{ via: "direct", seat: 0 }] : relay;\n    if (message.to !== void 0) return isDirect(routes, message.to, now) ? [{ via: "direct", seat: message.to }] : relay;\n    const direct = [...routes.links.keys()].filter((seat) => isDirect(routes, seat, now)).sort((a, b) => a - b);\n    if (!direct.length) return relay;\n    const viaRelay = [...routes.relaySeats].filter((seat) => !direct.includes(seat)).sort((a, b) => a - b);\n    return [...direct.map((seat) => ({ via: "direct", seat })), ...viaRelay.map((seat) => ({ via: "relay", message: { ...message, to: seat } }))];\n  }\n  var isSeat = (seat) => Number.isInteger(seat) && seat >= 1 && seat <= MAX_GUESTS;\n  function fromDirect(text, seat, hosting2) {\n    const message = parseControl(text);\n    if (!isPeerMessage(message)) return null;\n    if (hosting2) {\n      delete message.seat;\n      message.from = seat;\n    }\n    return message;\n  }\n  function relayPresence(routes, message) {\n    if (message?.t === "welcome" && Array.isArray(message.guests)) {\n      routes.relaySeats = new Set(message.guests.filter(isSeat));\n    } else if (message?.t === "peer" && isSeat(message.seat)) {\n      if (message.present) routes.relaySeats.add(message.seat);\n      else routes.relaySeats.delete(message.seat);\n    }\n  }\n\n  // src/net/pump-worker.js\n  var POLL_MS = 1;\n  var FLUSH_MS = 4;\n  var INBOX_LIMIT = 512;\n  var PING_MS = 2e3;\n  var DIRECT_PING_MS = 500;\n  var DIRECT_BUFFER_LIMIT = 256 * 1024;\n  var state = {\n    role: null,\n    url: null,\n    socket: null,\n    closed: false,\n    retries: 0,\n    readers: [],\n    writer: null,\n    ports: {},\n    reading: false,\n    injecting: false,\n    dropUntilConnect: false,\n    dropCommands: [],\n    inbox: [],\n    outbox: [],\n    lastFlush: 0,\n    looping: false,\n    relayDown: false,\n    routes: createRoutes(),\n    // framesOut/In and textOut/In count relay frames only; packets and bytes count both paths.\n    stats: { packetsOut: 0, packetsIn: 0, bytesOut: 0, bytesIn: 0, framesOut: 0, framesIn: 0, textOut: 0, textIn: 0, dropped: 0, lost: 0, rtt: null, rtts: {}, paths: {} }\n  };\n  var hosting = () => state.role === "host";\n  var post = (message) => self.postMessage(message);\n  self.onmessage = ({ data: message }) => {\n    switch (message.type) {\n      case "connect":\n        state.role = message.role;\n        state.url = relaySocketUrl(message.relay, message.room, message.role, message.guestId);\n        open();\n        loop();\n        break;\n      case "attach":\n        state.readers = message.reads.map(({ seat, base }) => ({ seat, queue: new QueueReader(message.buffer, message.loopback, base, { consume: true }) }));\n        state.writer = new QueueWriter(message.buffer, message.loopback, message.writeBase);\n        state.ports = message.ports;\n        state.reading = Boolean(message.reading);\n        state.injecting = Boolean(message.injecting);\n        state.dropCommands = message.dropCommands ?? [];\n        break;\n      case "read":\n        for (const { queue } of state.readers) queue.skip();\n        state.dropUntilConnect = Boolean(message.dropUntilConnect);\n        state.reading = true;\n        break;\n      case "inject":\n        state.injecting = Boolean(message.on);\n        if (message.clearInbox) state.inbox.length = 0;\n        break;\n      case "send":\n        sendText(message.message);\n        break;\n      case "link":\n        addLink(message.seat, message.game, message.control, message.id);\n        break;\n      case "unlink":\n        if (message.id === void 0 || state.routes.links.get(message.seat)?.id === message.id) removeLink(message.seat);\n        break;\n      case "relay-down":\n        state.relayDown = true;\n        try {\n          state.socket?.close(1e3, "relay-down");\n        } catch {\n        }\n        break;\n      case "close":\n        state.closed = true;\n        try {\n          state.socket?.close(1e3, "bye");\n        } catch {\n        }\n        break;\n    }\n  };\n  function open() {\n    if (state.closed || state.relayDown) return;\n    let socket;\n    try {\n      socket = new WebSocket(state.url);\n    } catch (error) {\n      post({ type: "socket", state: "error", reason: String(error?.message ?? error) });\n      retry();\n      return;\n    }\n    socket.binaryType = "arraybuffer";\n    state.socket = socket;\n    post({ type: "socket", state: "connecting" });\n    socket.onopen = () => {\n      state.retries = 0;\n      post({ type: "socket", state: "open" });\n    };\n    socket.onmessage = ({ data }) => typeof data === "string" ? onText(data) : onBinary(data);\n    socket.onclose = (event) => {\n      if (state.socket === socket) state.socket = null;\n      state.routes.relaySeats.clear();\n      post({ type: "socket", state: "closed", code: event.code, reason: event.reason });\n      if (event.code === 4001 || event.code === 4004) state.closed = true;\n      else if (event.code === 4005) setTimeout(open, 6e4);\n      else retry();\n    };\n    socket.onerror = () => {\n    };\n  }\n  function retry() {\n    if (state.closed || state.relayDown) return;\n    setTimeout(open, Math.min(5e3, 250 * 2 ** state.retries));\n    state.retries += 1;\n  }\n  function onBinary(data) {\n    const items = hosting() ? decodeSeatPackets(data) : decodePackets(data)?.map((packet) => ({ seat: 0, packet }));\n    if (!items) return;\n    state.stats.framesIn += 1;\n    receive(items);\n  }\n  function receive(items) {\n    for (const item of items) {\n      state.stats.packetsIn += 1;\n      state.stats.bytesIn += item.packet.byteLength;\n      const command = connectionlessCommand(item.packet);\n      if (command && state.dropCommands.includes(command)) continue;\n      state.inbox.push(item);\n    }\n    if (state.inbox.length > INBOX_LIMIT) {\n      state.stats.dropped += state.inbox.length - INBOX_LIMIT;\n      state.inbox.splice(0, state.inbox.length - INBOX_LIMIT);\n    }\n    pump();\n  }\n  function onText(text) {\n    state.stats.textIn += 1;\n    const message = parseControl(text);\n    if (!message) return;\n    if (hosting()) relayPresence(state.routes, message);\n    onControl(message);\n  }\n  function onControl(message) {\n    if (message.t === "ping") {\n      const echo = message.d ? { d: 1, k: message.k } : {};\n      sendText(hosting() ? { t: "pong", ts: message.ts, to: message.from, ...echo } : { t: "pong", ts: message.ts, ...echo });\n    } else if (message.t === "pong") {\n      if (typeof message.ts !== "number") return;\n      if (message.d) {\n        const link = state.routes.links.get(hosting() ? message.from : 0);\n        if (link && link.id === message.k) link.aliveAt = performance.now();\n      }\n      const rtt = Math.max(0, performance.now() - message.ts);\n      if (hosting()) {\n        if (Number.isInteger(message.from)) state.stats.rtts[message.from] = rtt;\n        state.stats.rtt = Math.max(0, ...Object.values(state.stats.rtts));\n      } else {\n        state.stats.rtt = rtt;\n      }\n    } else {\n      post({ type: "control", message });\n    }\n  }\n  function sendText(message) {\n    let sent = false;\n    for (const route of controlRoutes(state.routes, message, hosting())) {\n      if (route.via === "direct") {\n        try {\n          state.routes.links.get(route.seat).control.send(JSON.stringify(message));\n          sent = true;\n        } catch {\n        }\n      } else if (state.socket?.readyState === WebSocket.OPEN) {\n        state.socket.send(JSON.stringify(route.message));\n        state.stats.textOut += 1;\n        sent = true;\n      }\n    }\n    return sent;\n  }\n  function sendDirect(seat, packet) {\n    const channel = state.routes.links.get(seat).game;\n    if (channel.bufferedAmount > DIRECT_BUFFER_LIMIT) {\n      state.stats.dropped += 1;\n      return;\n    }\n    try {\n      channel.send(packet);\n      state.stats.packetsOut += 1;\n      state.stats.bytesOut += packet.byteLength;\n    } catch {\n      state.stats.dropped += 1;\n    }\n  }\n  function addLink(seat, game, control, id) {\n    removeLink(seat);\n    const link = { id, game, control, reported: false };\n    state.routes.links.set(seat, link);\n    game.binaryType = "arraybuffer";\n    const opened = () => {\n      if (state.routes.links.get(seat) !== link || link.reported || !isDirect(state.routes, seat)) return;\n      link.reported = true;\n      link.aliveAt = performance.now();\n      post({ type: "link", seat, id, open: true });\n    };\n    const closed = () => {\n      if (state.routes.links.get(seat) === link) removeLink(seat);\n    };\n    for (const channel of [game, control]) {\n      channel.onopen = opened;\n      channel.onclose = closed;\n      channel.onerror = closed;\n    }\n    game.onmessage = ({ data }) => {\n      if (!(data instanceof ArrayBuffer)) return;\n      receive([{ seat, packet: new Uint8Array(data) }]);\n      pump();\n    };\n    control.onmessage = ({ data }) => {\n      const message = typeof data === "string" ? fromDirect(data, seat, hosting()) : null;\n      if (message) onControl(message);\n    };\n    opened();\n  }\n  function removeLink(seat) {\n    const link = state.routes.links.get(seat);\n    if (!link) return;\n    state.routes.links.delete(seat);\n    for (const channel of [link.game, link.control]) {\n      channel.onopen = channel.onclose = channel.onerror = channel.onmessage = null;\n      try {\n        channel.close();\n      } catch {\n      }\n    }\n    if (link.reported) post({ type: "link", seat, id: link.id, open: false });\n  }\n  function pingLinks(now) {\n    for (const link of state.routes.links.values()) {\n      if (!link.reported) continue;\n      try {\n        link.control.send(JSON.stringify({ t: "ping", ts: now, d: 1, k: link.id }));\n      } catch {\n      }\n    }\n  }\n  function paths() {\n    const seats = hosting() ? /* @__PURE__ */ new Set([...state.routes.links.keys(), ...state.routes.relaySeats]) : [0];\n    return Object.fromEntries([...seats].map((seat) => [seat, packetPath(state.routes, seat)]));\n  }\n  function flush(now) {\n    if (!state.outbox.length) return;\n    const socket = state.socket;\n    if (socket?.readyState !== WebSocket.OPEN) {\n      state.stats.dropped += state.outbox.length;\n    } else {\n      const seats = hosting();\n      const perPacket = seats ? 3 : 2;\n      let batch = [];\n      let size = 4;\n      const send = () => {\n        if (!batch.length) return;\n        socket.send(seats ? encodeSeatPackets(batch) : encodePackets(batch.map((item) => item.packet)));\n        state.stats.framesOut += 1;\n        batch = [];\n        size = 4;\n      };\n      for (const item of state.outbox) {\n        const bytes = perPacket + item.packet.byteLength;\n        if (size + bytes > MAX_BINARY_BYTES) send();\n        batch.push(item);\n        size += bytes;\n        state.stats.packetsOut += 1;\n        state.stats.bytesOut += item.packet.byteLength;\n      }\n      send();\n    }\n    state.outbox.length = 0;\n    state.lastFlush = now;\n  }\n  function pump() {\n    const now = performance.now();\n    if (state.reading) {\n      let lost = 0;\n      for (const { seat, queue } of state.readers) {\n        let packets = queue.poll([]);\n        lost += queue.lost;\n        if (state.dropUntilConnect && packets.length) {\n          const first = packets.findIndex((packet) => connectionlessCommand(packet) === "connect");\n          packets = first < 0 ? [] : packets.slice(first);\n          if (first >= 0) state.dropUntilConnect = false;\n        }\n        for (const packet of packets) {\n          if (packetPath(state.routes, seat) === "direct") sendDirect(seat, packet);\n          else state.outbox.push({ seat, packet });\n        }\n      }\n      state.stats.lost = lost;\n    }\n    if (state.outbox.length && now - state.lastFlush >= FLUSH_MS) flush(now);\n    if (state.writer && state.injecting) {\n      while (state.inbox.length && state.writer.push(state.inbox[0].packet, state.ports[state.inbox[0].seat] ?? 0)) state.inbox.shift();\n    }\n  }\n  async function loop() {\n    if (state.looping) return;\n    state.looping = true;\n    const tick = new Int32Array(new SharedArrayBuffer(4));\n    let lastPing = 0;\n    let lastDirectPing = 0;\n    let lastStats = 0;\n    while (!state.closed) {\n      pump();\n      const now = performance.now();\n      if (now - lastDirectPing >= DIRECT_PING_MS) {\n        lastDirectPing = now;\n        pingLinks(now);\n      }\n      if (now - lastPing >= PING_MS) {\n        lastPing = now;\n        sendText({ t: "ping", ts: now });\n      }\n      if (now - lastStats >= 1e3) {\n        lastStats = now;\n        post({ type: "stats", stats: { ...state.stats, rtts: { ...state.stats.rtts }, paths: paths(), inbox: state.inbox.length } });\n      }\n      const wait = Atomics.waitAsync ? Atomics.waitAsync(tick, 0, 0, POLL_MS) : null;\n      if (wait?.async) await wait.value;\n      else await new Promise((resolve) => setTimeout(resolve, POLL_MS));\n    }\n  }\n})();\n'], { type: "text/javascript" }));
    const worker = new Worker(url, { name: "bo1-coop-pump" });
    worker.onmessage = ({ data: message }) => {
      if (message.type === "socket") {
        session.onSocket(message);
        if (message.state !== "open") relayClosed(session);
      } else if (message.type === "link") session.direct?.onLink(message.seat, message.open, message.id);
      else if (message.type === "control") onControl2(session, message.message);
      else if (message.type === "stats") session.stats = message.stats;
    };
    worker.onerror = (event) => session.fail("workerFailed", event.message);
    worker.postMessage({ type: "connect", relay: session.relay, room: session.room, role: session.mode, guestId: session.guestId });
    return worker;
  }
  function send(session, message) {
    session.pump?.postMessage({ type: "send", message });
  }
  function postToPump(session, message, transfer = []) {
    session.pump?.postMessage(message, transfer);
  }

  // src/net/rtc-messages.js
  var RTC_TYPES = Object.freeze(["rtc-offer", "rtc-answer", "rtc-ice"]);
  var CANDIDATE_FLUSH_MS = 250;
  var CONNECT_TIMEOUT_MS = 8e3;
  var MAX_SDP = 3e3;
  var MAX_ICE_JSON = 3500;
  var MAX_CANDIDATES = 8;
  var MAX_CANDIDATE = 512;
  var MAX_MID = 16;
  var MAX_ATTEMPT = 1e6;
  var ACCEPTS = { host: ["rtc-offer", "rtc-ice"], guest: ["rtc-answer", "rtc-ice"] };
  var isSeat = (seat) => Number.isInteger(seat) && seat >= 1 && seat <= MAX_GUESTS;
  var isText = (value, max) => typeof value === "string" && value.length >= 1 && value.length <= max;
  function candidate(value) {
    if (!value || typeof value !== "object" || !isText(value.c, MAX_CANDIDATE)) return null;
    if (value.m !== null && !(typeof value.m === "string" && value.m.length <= MAX_MID)) return null;
    if (value.i !== null && !(Number.isInteger(value.i) && value.i >= 0 && value.i <= 15)) return null;
    return { c: value.c, m: value.m, i: value.i };
  }
  function parseRtc(message, { role }) {
    if (!message || typeof message !== "object" || !ACCEPTS[role]?.includes(message.t)) return null;
    const { t, n } = message;
    if (!Number.isInteger(n) || n < 1 || n > MAX_ATTEMPT) return null;
    if (role === "host" && !isSeat(message.from)) return null;
    const out = { t, n };
    if (t === "rtc-ice") {
      if (!Array.isArray(message.cands) || message.cands.length < 1 || message.cands.length > MAX_CANDIDATES) return null;
      const cands = message.cands.map(candidate);
      if (cands.includes(null)) return null;
      out.cands = cands;
    } else {
      if (!isText(message.sdp, MAX_SDP)) return null;
      out.sdp = message.sdp;
    }
    if (role === "host") out.from = message.from;
    return out;
  }
  var retryDelay = (failures) => [5e3, 15e3, 3e4][failures] ?? 6e4;

  // src/engine/memory.js
  var NORMAL_SPEED = 0.999;
  var EngineMemory = class {
    constructor(Module, build) {
      this.Module = Module;
      this.build = build;
      this.buffer = Module.HEAPF32.buffer;
      this.i32 = new Int32Array(this.buffer);
      this.u16 = new Uint16Array(this.buffer);
      this.u8 = new Uint8Array(this.buffer);
      this.commandBuffer = 0;
    }
    int(address) {
      return Atomics.load(this.i32, address >> 2);
    }
    setInt(address, value) {
      Atomics.store(this.i32, address >> 2, value);
    }
    byte(address) {
      return Atomics.load(this.u8, address);
    }
    /** Current integer value of a known dvar, or null before the engine registered it. */
    dvar(name) {
      const dvar = this.int(this.build.dvars[name]);
      return dvar ? this.int(dvar + this.build.dvarValue) : null;
    }
    setDvar(name, value) {
      const dvar = this.int(this.build.dvars[name]);
      if (dvar) this.setInt(dvar + this.build.dvarValue, value);
      return Boolean(dvar);
    }
    /** The mailboxes must start empty; anything else means this is not the memory layout we expect. */
    mailboxesIdle() {
      const { command, freeze, inboundRing } = this.build.mailbox;
      return this.int(command) === 0 && this.int(freeze) === 0 && this.int(inboundRing) === 0;
    }
    /** Hands a console command to the server thread. False while the previous command has not been picked up yet. */
    command(text3) {
      const { command } = this.build.mailbox;
      if (this.int(command) !== 0) return false;
      const bytes = new TextEncoder().encode(`${text3}
`);
      if (bytes.length >= 1024) throw new RangeError("command too long");
      if (!this.commandBuffer) this.commandBuffer = this.Module._malloc(1024);
      this.u8.set(bytes, this.commandBuffer);
      this.u8[this.commandBuffer + bytes.length] = 0;
      return Atomics.compareExchange(this.i32, command >> 2, 0, this.commandBuffer) === 0;
    }
    /** While held, this engine's own server skips its frames (a guest plays on the host's server instead). */
    holdServer(on) {
      this.setInt(this.build.mailbox.freeze, on ? 1 : 0);
    }
    serverReadsPackets() {
      return this.byte(this.build.server.allowNetPackets) === 1;
    }
    connectionState() {
      return this.int(this.build.client.connectionState);
    }
    clientConnection() {
      return this.int(this.build.client.clcPtr);
    }
    /** Makes the local client talk to loopback `port`; a guest uses 0, where the host's packets get injected. */
    pointClientAt(port) {
      const clc = this.clientConnection();
      if (!clc) return false;
      Atomics.store(this.u16, clc + this.build.client.serverAddressPort >> 1, port);
      return true;
    }
    clientServerPort() {
      const clc = this.clientConnection();
      return clc ? Atomics.load(this.u16, clc + this.build.client.serverAddressPort >> 1) : null;
    }
    /** Resets the client's "last packet" clock; while it reads 0 the engine never declares the server timed out. */
    keepClientAlive() {
      const clc = this.clientConnection();
      if (clc) this.setInt(clc + this.build.client.lastPacketTime, 0);
    }
    /** The game's slow-motion factor (1 = normal speed). */
    codeTimeScale() {
      return new Float32Array(this.buffer, this.build.client.codeTimeScale, 1)[0];
    }
    setCodeTimeScale(value) {
      new Float32Array(this.buffer, this.build.client.codeTimeScale, 1)[0] = value;
    }
    /** True while a game menu (pause, options, ...) has the cursor. */
    menuOpen() {
      return Boolean(this.Module._KB_UIState?.() & 1);
    }
    /** Occupied server slots: [{ slot, state, loopback, port }]. */
    serverSlots() {
      const s = this.build.server;
      const clients = this.int(s.clientsPtr);
      const out = [];
      if (!clients) return out;
      const count = Math.min(this.dvar("comMaxClients") ?? 0, 64);
      for (let slot = 0; slot < count; slot += 1) {
        const base = clients + slot * s.clientStride;
        const state = this.int(base + s.clientState);
        if (state === SLOT.free) continue;
        out.push({
          slot,
          state,
          loopback: this.int(base + s.clientAddrType) === this.build.loopbackAddressType,
          port: Atomics.load(this.u16, base + s.clientAddrPort >> 1)
        });
      }
      return out;
    }
    /** Byte address of loopback queue `port` (it may lie outside the engine's two real queues). */
    queueAt(port) {
      const lb = this.build.loopback;
      return lb.base + port * lb.stride;
    }
    /**
     * Host only. Allocates one block holding `guests + 1` extra loopback queues and returns their ports: seat s sends
     * through port first + s - 1 (the server writes its packets for that guest there), and every guest's packets come
     * in through port first + guests. Since the server addresses queue P at base + P * stride, the first port is chosen
     * so all queues land inside the block. The block is never freed.
     */
    createGuestQueues(guests) {
      const lb = this.build.loopback;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const size = (guests + 2) * lb.stride + 64;
        const block = this.Module._malloc(size);
        if (!block) throw new Error("out of engine memory");
        this.u8.fill(0, block, block + size);
        const first = Math.ceil((block - lb.base) / lb.stride);
        const inbound = first + guests;
        const ports = Array.from({ length: guests }, (_, i) => first + i);
        const fits = this.queueAt(inbound + 1) <= block + size;
        const clash = [...ports, inbound].some((p) => this.build.reservedPorts.includes(p));
        if (first >= 2 && inbound <= 65535 && fits && !clash) {
          const seats = {};
          ports.forEach((port, i) => seats[i + 1] = { port, base: this.queueAt(port) });
          return { seats, inbound: { port: inbound, base: this.queueAt(inbound) } };
        }
      }
      throw new Error("could not place the guest queues in engine memory");
    }
    /** Tells the patched NET_GetLoopPacket which extra queue the server should read (0: none). */
    useInboundQueue(port) {
      this.setInt(this.build.mailbox.inboundRing, port);
    }
  };

  // src/session/guest.js
  var HOST_GONE_MS = 1e4;
  var STATE_REPEAT_MS = 2e3;
  var SPAWN_JUMP = 400;
  var NEAR_HOST = 300;
  var HOST_POS_MAX_AGE_MS = 6e3;
  var SPAWN_CHECK_MS = 2e3;
  var SPAWN_TRIES = 2;
  var EYE_HEIGHT = 62;
  var SPOT_MIN = 48;
  var SPOT_MAX = 250;
  var SPOT_MAX_DZ = 40;
  var SPOT_STEP = 16;
  var guestQport = (seat) => 1e3 + 1e4 * (seat - 1) + 1 + Math.floor(Math.random() * 9999);
  function followHostMap(session) {
    const info = session.hostInfo;
    if (!info?.slug || session.engine) return;
    const guns = info.guns === "cs" ? "cs" : "classic";
    if (currentSlug() === info.slug && currentHorde() === Boolean(info.horde) && currentGuns() === guns) return;
    session.phase = "following";
    go(`${BASE}${info.slug}?coop=join&coopRoom=${session.room}&mode=single&guns=${guns}${info.horde ? "&horde=1" : ""}${session.relayParam}`);
  }
  async function prepareGuest(session, Module, args) {
    const info = await until(() => session.hostInfo?.zone ? session.hostInfo : null, 3e4);
    if (!info) throw new Error("hostNoAnswer");
    if (info.hash && info.hash !== session.hash) throw new Error("versionMismatch");
    const zone = devmapZone(args);
    if (zone !== info.zone) throw new Error(`hostPlaying:${MAP_NAMES[info.slug] ?? info.zone}`);
    if (Array.isArray(info.gameArgs)) applyGameSettings(args, info.gameArgs);
    insertBeforeDevmap(args, ["+set", "kisak_web_coop", "1", "+set", "kisak_coop_players", "1"]);
    const engine = new EngineMemory(Module, session.build);
    if (!engine.mailboxesIdle()) throw new Error("unexpectedMemory");
    session.engine = engine;
    session.zone = zone;
    session.pump.postMessage({
      type: "attach",
      buffer: engine.buffer,
      loopback: session.build.loopback,
      reads: [{ seat: 0, base: engine.queueAt(1) }],
      // our client's outgoing packets, for the host
      writeBase: engine.queueAt(0),
      // the host's packets, for our client
      ports: { 0: 0 },
      reading: false,
      injecting: false
    });
    session.phase = "loading";
  }
  function until(check, timeoutMs) {
    return new Promise((resolve) => {
      const started = Date.now();
      const poll = () => {
        const value = check();
        if (value || Date.now() - started > timeoutMs) resolve(value ?? null);
        else setTimeout(poll, 100);
      };
      poll();
    });
  }
  function guestTick(session) {
    const screen2 = screen();
    const engine = session.engine;
    if (screen2 === "error" && !["ended", "failed"].includes(session.phase)) {
      session.phase = "ended";
      session.note("engine stopped");
    }
    if (engine && ["freezing", "connect"].includes(session.phase)) engine.keepClientAlive();
    if (engine && ["challenging", "joining"].includes(session.phase)) {
      if (engine.dvar("clPaused")) engine.setDvar("clPaused", 0);
      if (engine.dvar("svPaused")) engine.setDvar("svPaused", 0);
    }
    if (session.peer && (session.phase !== session.sentPhase || Date.now() - (session.sentPhaseAt ?? 0) > STATE_REPEAT_MS)) introduce(session);
    if (!session.peer) session.sentPhase = null;
    const step2 = STEPS[session.phase];
    if (step2) step2(session, engine, screen2);
  }
  var STEPS = {
    loading(session, engine, screen2) {
      if (screen2 === "ready" || screen2 === "playing") session.phase = "waiting-host";
    },
    "waiting-host"(session, engine) {
      if (session.peer && session.hostState?.ready && session.hostState.turn && validSeat(session.seat)) {
        engine.holdServer(true);
        session.heldAt = Date.now();
        session.phase = "freezing";
        session.note("parking the local server");
      }
    },
    freezing(session, engine) {
      if (engine.serverReadsPackets() && Date.now() - session.heldAt <= 5e3) return;
      if (engine.serverReadsPackets()) session.note("local server still reading after 5 s, going on");
      engine.setDvar("svPaused", 0);
      session.pump.postMessage({ type: "read", dropUntilConnect: true });
      session.pump.postMessage({ type: "inject", on: false, clearInbox: true });
      session.phase = "connect";
    },
    connect(session, engine) {
      if (!session.introReleased && engine.int(session.build.introState) === 1) {
        session.introReleased = true;
        engine.Module._KB_Input?.(7, 1, 0);
      }
      session.connectWaitAt ??= Date.now();
      if ((session.hostState?.slot ?? 0) >= SLOT.connected && Date.now() - session.connectWaitAt < 2e4) return;
      session.qport ??= guestQport(session.seat);
      if (engine.command(`setqport ${session.qport};connect LOCALHOST`)) {
        session.joinedLate = session.hostState?.screen === "playing";
        session.connectAt = Date.now();
        session.phase = "challenging";
        session.note("connect sent");
      }
    },
    challenging(session, engine) {
      const state = engine.connectionState();
      if (state >= CONNECTION.connecting && state <= CONNECTION.challenging && engine.pointClientAt(0) && engine.clientServerPort() === 0) {
        session.pump.postMessage({ type: "inject", on: true });
        session.phase = "joining";
        session.note("handshake started, passing the host's packets in");
      } else if (Date.now() - session.connectAt > 15e3) {
        session.fail("connectFailed");
        session.phase = "failed";
      }
    },
    joining(session, engine) {
      if (engine.clientServerPort() !== 0) engine.pointClientAt(0);
      if (engine.connectionState() === CONNECTION.active) {
        session.phase = "connected";
        session.lastViewOrigin = null;
        session.spawn ??= { tries: 0, sentAt: 0 };
        session.note("connected to the host");
      } else if (Date.now() - session.connectAt > 9e4) {
        session.fail("notLetIn");
        session.phase = "failed";
      }
    },
    connected(session, engine, screen2) {
      if (engine.connectionState() < CONNECTION.challenging) {
        session.phase = "ended";
        session.note("disconnected");
      } else if (!session.peer && session.hostLeftAt && Date.now() - session.hostLeftAt > HOST_GONE_MS) {
        session.phase = "ended";
        session.fail("hostLeft");
        engine.command("disconnect");
      } else {
        syncGuestPause(session, engine, screen2);
        if (session.hostState?.screen !== "playing") engine.keepClientAlive();
        stayNearHost(session);
        restoreSpeed(session, engine);
      }
    }
  };
  var SLOW_AFTER_HOST_MS = 1500;
  function restoreSpeed(session, engine) {
    if (!session.hostState?.normalSpeed || engine.codeTimeScale() >= NORMAL_SPEED) {
      session.slowSince = null;
      return;
    }
    session.slowSince ??= Date.now();
    if (Date.now() - session.slowSince < SLOW_AFTER_HOST_MS || !engine.command("set hud_missionFailed 0")) return;
    engine.setCodeTimeScale(1);
    session.slowSince = null;
    session.note("back to normal speed after the host's restart");
  }
  function syncGuestPause(session, engine, screen2) {
    const menuOpen = engine.menuOpen() && screen2 === "playing";
    if (menuOpen !== session.menuOpen) {
      session.menuOpen = menuOpen;
      if (session.peer) send(session, { t: "pause", on: menuOpen });
    }
    const paused = menuOpen || session.peer && Boolean(session.remotePause);
    if (paused) {
      if (!session.paused) session.note(menuOpen ? "paused" : "paused by another player");
      if (!engine.dvar("svPaused")) engine.setDvar("svPaused", 1);
      if (!engine.dvar("clPaused")) engine.setDvar("clPaused", 1);
      engine.keepClientAlive();
    } else {
      if (session.paused) {
        engine.keepClientAlive();
        session.note("resumed");
      }
      if (engine.dvar("svPaused")) engine.setDvar("svPaused", 0);
      if (engine.dvar("clPaused")) engine.setDvar("clPaused", 0);
    }
    session.paused = paused;
  }
  var distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  function stayNearHost(session) {
    if (session.hostState?.screen !== "playing") return;
    const view2 = latestView();
    if (view2 && view2.ms !== session.lastViewMs) {
      const previous = session.lastViewOrigin;
      session.lastViewMs = view2.ms;
      session.lastViewOrigin = view2.origin;
      if (!previous || distance(previous, view2.origin) > SPAWN_JUMP) session.spawn ??= { tries: 0, sentAt: 0 };
    }
    const pending = session.spawn;
    if (!pending || session.paused) return;
    const host = session.hostPos;
    const mine = session.lastViewOrigin;
    if (!host || Date.now() - host.at > HOST_POS_MAX_AGE_MS || !mine) return;
    if (pending.sentAt && Date.now() - pending.sentAt < SPAWN_CHECK_MS) return;
    if (distance(host.origin, mine) <= NEAR_HOST) {
      session.spawn = null;
    } else if (pending.tries >= SPAWN_TRIES) {
      session.spawn = null;
      session.note("could not get next to the host");
    } else if (moveToHost(session, pending.tries ? "spawn, retry" : "spawn")) {
      pending.sentAt = Date.now();
      pending.tries += 1;
    }
  }
  function spotNearHost(session) {
    const host = session.hostPos.origin;
    const trail = session.hostTrail ?? [];
    const flat = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const spots = [];
    const consider = (p) => {
      const d = flat(p, host);
      if (d >= SPOT_MIN && d <= SPOT_MAX && Math.abs(p[2] - host[2]) <= SPOT_MAX_DZ && spots.every((s) => flat(s, p) >= SPOT_MIN)) spots.push(p);
    };
    for (let i = trail.length - 1; i >= 0; i -= 1) {
      const to = trail[i].origin;
      consider(to);
      const from = trail[i - 1]?.origin;
      if (!from) continue;
      const steps = Math.floor(flat(from, to) / SPOT_STEP);
      for (let k = 1; k < steps; k += 1) consider(to.map((v, j) => v + (from[j] - v) * k / steps));
    }
    return spots.length ? spots[Math.min((session.seat ?? 1) - 1, spots.length - 1)] : null;
  }
  function moveToHost(session, why) {
    const engine = session.engine;
    const host = session.hostPos;
    if (!engine || session.phase !== "connected" || !host) return false;
    if (Date.now() - (session.movedAt ?? 0) < 1e3) return false;
    const spot = spotNearHost(session);
    if (!spot) return false;
    const target2 = [spot[0], spot[1], spot[2] + EYE_HEIGHT];
    if (!engine.command(`setviewpos ${target2.map((v) => v.toFixed(1)).join(" ")}`)) return false;
    session.movedAt = Date.now();
    session.note(`moved next to the host (${why})`);
    return true;
  }

  // src/map/plan.js
  var DOOR_KINDS = ["door", "debris", "power"];
  var POI_KINDS = ["perk", "pap", "power", "box"];
  var finite = (value) => typeof value === "number" && Number.isFinite(value);
  var numbers = (value, length) => Array.isArray(value) && value.length === length && value.every(finite);
  var floorIndex = (value, floors) => Number.isInteger(value) && value >= 0 && value < floors;
  var at = (value, floors) => numbers(value, 3) && floorIndex(value[0], floors);
  function validPlan(plan) {
    if (!plan || plan.v !== 1 || typeof plan.slug !== "string" || typeof plan.sig !== "string") return false;
    const { floors, rooms, doors, pois } = plan;
    if (!Array.isArray(floors) || !floors.length || !Array.isArray(rooms) || !Array.isArray(doors) || !Array.isArray(pois)) return false;
    const n = floors.length;
    const floorsOk = floors.every(
      (f, i) => typeof f?.name === "string" && (f.area === void 0 || numbers(f.area, 4)) && (i === n - 1 ? f.below === null : finite(f.below) || f.below === null && f.area !== void 0)
    );
    const roomsOk = rooms.every(
      (r) => typeof r?.id === "string" && at(r.label, n) && Array.isArray(r.rects) && r.rects.length > 0 && r.rects.every((rect) => numbers(rect, 5) && floorIndex(rect[0], n))
    );
    const doorsOk = doors.every(
      (d) => DOOR_KINDS.includes(d?.kind) && finite(d.cost) && at(d.at, n) && Array.isArray(d.rooms) && d.rooms.length === 2 && d.rooms.every((r) => Number.isInteger(r) && r >= 0 && r < rooms.length)
    );
    const poisOk = pois.every((p) => POI_KINDS.includes(p?.kind) && (p.id === null || typeof p.id === "string") && at(p.at, n));
    return floorsOk && roomsOk && doorsOk && poisOk;
  }
  var inside = (area, x, y) => !area || x >= area[0] && x <= area[2] && y >= area[1] && y <= area[3];
  function floorOf(plan, z, x, y) {
    const i = plan.floors.findIndex((f) => inside(f.area, x, y) && (f.below === null || z < f.below));
    return i < 0 ? plan.floors.length - 1 : i;
  }
  function bounds(plan, floor) {
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const room of plan.rooms) {
      for (const [f, x0, y0, x1, y1] of room.rects) {
        if (f !== floor) continue;
        b[0] = Math.min(b[0], x0, x1);
        b[1] = Math.min(b[1], y0, y1);
        b[2] = Math.max(b[2], x0, x1);
        b[3] = Math.max(b[3], y0, y1);
      }
    }
    return Number.isFinite(b[0]) ? b : [0, 0, 1, 1];
  }
  function fitView(plan, floor, width, height, margin) {
    const [x0, y0, x1, y1] = bounds(plan, floor);
    const w = Math.max(x1 - x0, 1);
    const h = Math.max(y1 - y0, 1);
    const boxW = Math.max(width - 2 * margin, 1);
    const boxH = Math.max(height - 2 * margin, 1);
    const flat = Math.min(boxW / w, boxH / h);
    const turned = Math.min(boxW / h, boxH / w);
    if (turned > flat) {
      const scale2 = turned;
      return { scale: scale2, rotate: 90, tx: width / 2 - (y0 + y1) / 2 * scale2, ty: height / 2 - (x0 + x1) / 2 * scale2 };
    }
    const scale = flat;
    return { scale, rotate: 0, tx: width / 2 - (x0 + x1) / 2 * scale, ty: height / 2 + (y0 + y1) / 2 * scale };
  }
  function toScreen(view2, x, y) {
    return view2.rotate === 90 ? [view2.tx + y * view2.scale, view2.ty + x * view2.scale] : [view2.tx + x * view2.scale, view2.ty - y * view2.scale];
  }

  // src/map/track.js
  var KEEP = 8;
  var RENDER_DELAY_MS = 400;
  function pushSample(track, at2, x, y, yaw) {
    track.push({ at: at2, x, y, yaw });
    if (track.length > KEEP) track.splice(0, track.length - KEEP);
  }
  var turn = (yaw) => (yaw % 360 + 360) % 360;
  function sampleTrack(track, at2) {
    if (!track.length) return null;
    const pick = ({ x, y, yaw }) => ({ x, y, yaw });
    if (at2 <= track[0].at) return pick(track[0]);
    const last = track[track.length - 1];
    if (at2 >= last.at) return pick(last);
    let i = 0;
    while (track[i + 1].at <= at2) i += 1;
    const a = track[i];
    const b = track[i + 1];
    const f = (at2 - a.at) / (b.at - a.at);
    const d = (b.yaw - a.yaw + 540) % 360 - 180;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, yaw: turn(a.yaw + d * f) };
  }

  // src/map/net.js
  var STATE_REPEAT_MS2 = 5e3;
  var MAX_PLAYERS = 4;
  var SLUGS = Object.values(MAP_SLUGS);
  var bitText = (bits2) => bits2.map((b) => b ? "1" : "0").join("");
  function sendMap(session, now) {
    const map = session.map;
    if (!session.peer) return;
    if (map.liveReads !== map.sentReads) {
      map.sentReads = map.liveReads;
      const p = [...map.live].filter(([, e]) => e.read === map.liveReads).map(([n, e]) => [n, e.x, e.y, e.z, e.yaw, e.room, e.s]);
      send(session, { t: "mapp", p });
    }
    const state = map.state;
    if (!state) return;
    const message = { t: "maps", slug: map.slug, sig: state.sig, doors: bitText(state.doors), rooms: bitText(state.rooms), box: state.box, power: state.power ? 1 : 0 };
    const key = JSON.stringify(message);
    if (key === map.sentStateKey && now - map.sentStateAt < STATE_REPEAT_MS2) return;
    map.sentStateKey = key;
    map.sentStateAt = now;
    send(session, message);
  }
  var validEntry = (e) => Array.isArray(e) && e.length === 7 && e.every(Number.isFinite) && Number.isInteger(e[0]) && e[0] >= 1 && e[0] <= MAX_PLAYERS;
  var bits = (text3) => typeof text3 === "string" && /^[01]{0,256}$/.test(text3);
  function onMapMessage(session, message) {
    const map = session.map;
    if (!map) return;
    const now = Date.now();
    if (message.t === "mapp") {
      if (!Array.isArray(message.p) || message.p.length > MAX_PLAYERS || !message.p.every(validEntry)) return;
      for (const [n, x, y, z, yaw, room, s] of message.p) {
        map.live.set(n, { x, y, z, yaw, room, s, floor: map.plan ? floorOf(map.plan, z, x, y) : 0, at: now });
        if (!map.tracks.has(n)) map.tracks.set(n, []);
        pushSample(map.tracks.get(n), now, x, y, yaw);
      }
    } else if (message.t === "maps") {
      const { slug, sig, doors, rooms, box, power } = message;
      if (!SLUGS.includes(slug) || typeof sig !== "string" || !bits(doors) || !bits(rooms)) return;
      if (!Array.isArray(box) || box.length > 8 || !box.every(Number.isInteger)) return;
      if (slug !== map.slug) return;
      map.state = { v: null, sig, doors: [...doors].map((c) => c === "1"), rooms: [...rooms].map((c) => c === "1"), box, power: power === 1, at: now };
      map.planOk = Boolean(map.plan) && sig === map.plan.sig;
    }
  }

  // src/session/messages.js
  function onControl(session, message) {
    if (RTC_TYPES.includes(message.t)) session.direct?.onSignal(message);
    else if (session.mode === "host") onHostMessage(session, message);
    else onGuestMessage(session, message);
  }
  function onHostMessage(session, message) {
    switch (message.t) {
      case "welcome":
        session.overQuota = null;
        session.relayGuests = new Set((Array.isArray(message.guests) ? message.guests : []).filter(validSeat));
        session.relayLeft = /* @__PURE__ */ new Set();
        for (let seat = 1; seat <= MAX_GUESTS; seat += 1) syncPresence(session, seat);
        break;
      case "peer":
        if (!validSeat(message.seat)) return;
        if (message.present && session.relayLeft.delete(message.seat)) session.direct?.drop(message.seat);
        if (message.present) {
          session.relayGuests.add(message.seat);
          guestArrived(session, message.seat);
        } else {
          session.relayGuests.delete(message.seat);
          session.relayLeft.add(message.seat);
        }
        syncPresence(session, message.seat);
        break;
      case "state":
        if (validSeat(message.from)) guest(session, message.from).state = message;
        break;
      case "pause":
        if (validSeat(message.from)) guest(session, message.from).pause = Boolean(message.on);
        break;
      case "error":
        session.note(`relay error ${message.code}`);
        if (message.code === "over_quota") session.overQuota = { resetsAt: message.resetsAt ?? null };
        break;
    }
    session.peer = [...session.guests.values()].some((g) => g.present);
  }
  function onGuestMessage(session, message) {
    switch (message.t) {
      case "welcome":
        session.overQuota = null;
        session.seat = validSeat(message.seat) ? message.seat : null;
        session.relayPeer = Boolean(message.peer);
        syncPresence(session, 0);
        if (session.peer) introduce(session);
        break;
      case "peer":
        session.relayPeer = Boolean(message.present);
        syncPresence(session, 0);
        if (session.peer) introduce(session);
        session.note(`host ${session.relayPeer ? "joined" : "left"} the room (relay)`);
        break;
      case "info":
        session.hostInfo = message;
        followHostMap(session);
        break;
      case "state":
        session.hostState = message;
        break;
      case "pause":
        session.remotePause = Boolean(message.on);
        break;
      case "lobby":
        if (Array.isArray(message.players)) session.lobby = message;
        break;
      case "mapp":
      case "maps":
        onMapMessage(session, message);
        break;
      case "pos":
        if (Array.isArray(message.o) && message.o.length === 3 && message.o.every(Number.isFinite)) {
          session.hostPos = { origin: message.o, at: Date.now() };
          rememberHostTrail(session, session.hostPos);
        }
        break;
      case "error":
        session.note(`relay error ${message.code}`);
        if (message.code === "room_full") session.fail("full", MAX_GUESTS + 1);
        if (message.code === "over_quota") session.overQuota = { resetsAt: message.resetsAt ?? null };
        break;
    }
  }
  function guest(session, seat) {
    let record = session.guests.get(seat);
    if (!record) {
      record = { seat, present: false, state: null, pause: false, slot: null, leftAt: 0, kicks: 0, lastKickAt: 0, sent: {} };
      session.guests.set(seat, record);
    }
    return record;
  }
  function syncPresence(session, seat, { hostLeft = true } = {}) {
    const direct = session.links.get(seat) === "direct";
    if (session.mode === "host") {
      const present = session.relayGuests.has(seat) || direct;
      const record = session.guests.get(seat);
      if (present && !record?.present) guestArrived(session, seat);
      else if (!present && record?.present) guestLeft(session, seat);
      session.peer = [...session.guests.values()].some((g) => g.present);
      return;
    }
    const was = session.peer;
    session.peer = session.relayPeer || direct;
    if (was && !session.peer) {
      if (hostLeft) session.hostLeftAt = Date.now();
      session.remotePause = false;
      session.note(hostLeft ? "host left" : "relay lost");
    }
  }
  function relayClosed(session) {
    if (session.mode === "host") {
      session.relayGuests.clear();
      for (let seat = 1; seat <= MAX_GUESTS; seat += 1) syncPresence(session, seat);
    } else if (session.mode === "guest") {
      session.relayPeer = false;
      syncPresence(session, 0, { hostLeft: false });
    }
  }
  function guestArrived(session, seat) {
    if (!validSeat(seat)) return;
    const record = guest(session, seat);
    if (!record.present) session.note(`player ${seat + 1} joined the room`);
    Object.assign(record, { present: true, state: null, pause: false, sent: {}, sentPause: void 0 });
    session.sentLobby = null;
    sendGameInfo(session, seat);
  }
  function guestLeft(session, seat) {
    const record = guest(session, seat);
    Object.assign(record, { present: false, leftAt: Date.now(), pause: false });
    session.note(`player ${seat + 1} left the room`);
  }
  function introduce(session) {
    send(session, { t: "state", phase: session.phase, v: VERSION, name: session.name });
    send(session, { t: "pause", on: Boolean(session.menuOpen) });
    session.sentPhase = session.phase;
    session.sentPhaseAt = Date.now();
  }
  function sendGameInfo(session, to) {
    const zone = session.zone ?? currentZone();
    send(session, {
      t: "info",
      v: VERSION,
      hash: session.hash,
      zone,
      slug: MAP_SLUGS[zone] ?? null,
      horde: currentHorde(),
      guns: currentGuns(),
      gameArgs: session.gameSettings,
      ...to ? { to } : {}
    });
  }
  var TRAIL_STEP = 16;
  var TRAIL_MS = 2e4;
  function rememberHostTrail(session, pos) {
    const trail = session.hostTrail ??= [];
    const last = trail.at(-1);
    if (!last || Math.hypot(pos.origin[0] - last.origin[0], pos.origin[1] - last.origin[1], pos.origin[2] - last.origin[2]) >= TRAIL_STEP) trail.push(pos);
    while (trail.length && pos.at - trail[0].at > TRAIL_MS) trail.shift();
  }

  // src/net/direct.js
  var ICE_SERVERS = Object.freeze([{ urls: "stun:stun.cloudflare.com:3478" }, { urls: "stun:stun.l.google.com:19302" }]);
  function createDirect(session, { RTCPeerConnection = globalThis.RTCPeerConnection, now = Date.now } = {}) {
    const enabled = globalThis.__bo1CoopDirect !== false && typeof RTCPeerConnection === "function";
    const hosting = () => session.mode === "host";
    const links = /* @__PURE__ */ new Map();
    let attempt = 0;
    let linkIds = 0;
    let failures = 0;
    let nextOfferAt = 0;
    function connect(seat, n) {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS.map((server) => ({ ...server })) });
      const link = { seat, n, id: linkIds += 1, pc, startedAt: now(), open: false, remoteSet: false, waiting: [], gathered: [], flushedAt: 0 };
      links.set(seat, link);
      const game = pc.createDataChannel("game", { negotiated: true, id: 1, ordered: false, maxRetransmits: 0 });
      const control = pc.createDataChannel("control", { negotiated: true, id: 2 });
      postToPump(session, { type: "link", seat, id: link.id, game, control }, [game, control]);
      pc.onicecandidate = ({ candidate: candidate2 }) => {
        if (candidate2?.candidate && candidate2.candidate.length <= MAX_CANDIDATE) {
          link.gathered.push({ c: candidate2.candidate, m: candidate2.sdpMid ?? null, i: candidate2.sdpMLineIndex ?? null });
        }
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "closed"].includes(pc.connectionState)) fail(seat, link, `connection ${pc.connectionState}`);
      };
      return link;
    }
    function close(seat) {
      const link = links.get(seat);
      if (!link) return;
      links.delete(seat);
      link.pc.onicecandidate = link.pc.onconnectionstatechange = null;
      try {
        link.pc.close();
      } catch {
      }
      postToPump(session, { type: "unlink", seat, id: link.id });
      if (session.links.delete(seat)) syncPresence(session, seat);
    }
    function fail(seat, link, why) {
      if (links.get(seat) !== link) return;
      session.note(`direct link ${seat} given up (${why})`);
      close(seat);
      if (!hosting()) {
        nextOfferAt = now() + retryDelay(failures);
        failures += 1;
      }
    }
    async function offer() {
      attempt += 1;
      const link = connect(0, attempt);
      try {
        const description = await link.pc.createOffer();
        await link.pc.setLocalDescription(description);
        if (description.sdp.length > MAX_SDP) throw new Error(`offer too long (${description.sdp.length})`);
        if (links.get(0) === link) send(session, { t: "rtc-offer", n: link.n, sdp: description.sdp });
      } catch (error) {
        fail(0, link, error?.message ?? error);
      }
    }
    async function answer({ n, sdp, from: seat }) {
      close(seat);
      const link = connect(seat, n);
      try {
        await link.pc.setRemoteDescription({ type: "offer", sdp });
        remoteReady(link);
        const description = await link.pc.createAnswer();
        await link.pc.setLocalDescription(description);
        if (description.sdp.length > MAX_SDP) throw new Error(`answer too long (${description.sdp.length})`);
        if (links.get(seat) === link) send(session, { t: "rtc-answer", n, sdp: description.sdp, to: seat });
      } catch (error) {
        fail(seat, link, error?.message ?? error);
      }
    }
    function remoteReady(link) {
      link.remoteSet = true;
      for (const candidate2 of link.waiting.splice(0)) addCandidate(link, candidate2);
    }
    function addCandidate(link, { c, m, i }) {
      link.pc.addIceCandidate({ candidate: c, sdpMid: m, sdpMLineIndex: i }).catch(() => {
      });
    }
    function flushCandidates(link) {
      if (!link.gathered.length || now() - link.flushedAt < CANDIDATE_FLUSH_MS) return;
      const message = { t: "rtc-ice", n: link.n, cands: [], ...hosting() ? { to: link.seat } : {} };
      while (link.gathered.length && message.cands.length < 8) {
        message.cands.push(link.gathered[0]);
        if (message.cands.length > 1 && JSON.stringify(message).length > MAX_ICE_JSON) {
          message.cands.pop();
          break;
        }
        link.gathered.shift();
      }
      link.flushedAt = now();
      send(session, message);
    }
    return {
      onSignal(raw) {
        if (!enabled) return;
        const message = parseRtc(raw, { role: hosting() ? "host" : "guest" });
        if (!message) return;
        if (message.t === "rtc-offer") {
          answer(message);
          return;
        }
        const link = links.get(hosting() ? message.from : 0);
        if (!link || link.n !== message.n) return;
        if (message.t === "rtc-answer") {
          if (link.remoteSet) return;
          link.pc.setRemoteDescription({ type: "answer", sdp: message.sdp }).then(() => remoteReady(link)).catch((error) => fail(link.seat, link, error?.message ?? error));
        } else {
          for (const candidate2 of message.cands) {
            if (link.remoteSet) addCandidate(link, candidate2);
            else link.waiting.push(candidate2);
          }
        }
      },
      /** From the pump worker: both channels of link `id` opened, or one of them closed. */
      onLink(seat, open, id) {
        const link = links.get(seat);
        if (!link || link.id !== id) return;
        if (open) {
          link.open = true;
          failures = 0;
          session.links.set(seat, "direct");
          session.note(`direct link ${seat} open`);
          syncPresence(session, seat);
        } else {
          if (session.links.delete(seat)) syncPresence(session, seat);
          fail(seat, link, "channel closed");
        }
      },
      tick() {
        if (!enabled) return;
        for (const link of [...links.values()]) {
          if (!link.open && now() - link.startedAt > CONNECT_TIMEOUT_MS) fail(link.seat, link, "timeout");
          else flushCandidates(link);
        }
        if (!hosting() && session.relayPeer && validSeat(session.seat) && !links.has(0) && now() >= nextOfferAt) offer();
      },
      /** Test hook (test/e2e.mjs DROP_DIRECT_S): drops a link as a network failure would. */
      drop(seat) {
        const link = links.get(seat);
        if (link) fail(seat, link, "dropped");
      },
      state(seat) {
        if (!enabled) return "relay";
        if (session.links.get(seat) === "direct") return "direct";
        return links.has(seat) ? "connecting" : "relay";
      }
    };
  }

  // src/cheats/names.js
  var WEAPONS = {
    m1911_zm: "M1911",
    python_zm: "Python",
    cz75_zm: "CZ75",
    cz75dw_zm: "CZ75 Dual Wield",
    ak74u_zm: "AK-74u",
    mp5k_zm: "MP5K",
    mp40_zm: "MP40",
    mpl_zm: "MPL",
    pm63_zm: "PM63",
    spectre_zm: "Spectre",
    ithaca_zm: "Stakeout",
    spas_zm: "SPAS-12",
    hs10_zm: "HS10",
    rottweil72_zm: "Olympia",
    m14_zm: "M14",
    m16_zm: "M16",
    g11_lps_zm: "G11",
    famas_zm: "FAMAS",
    aug_acog_zm: "AUG",
    galil_zm: "Galil",
    commando_zm: "Commando",
    fnfal_zm: "FN FAL",
    dragunov_zm: "Dragunov",
    l96a1_zm: "L96A1",
    rpk_zm: "RPK",
    hk21_zm: "HK21",
    m72_law_zm: "M72 LAW",
    china_lake_zm: "China Lake",
    crossbow_explosive_zm: "Crossbow",
    knife_ballistic_zm: "Ballistic Knife",
    knife_ballistic_bowie_zm: "Ballistic Knife (Bowie)",
    knife_ballistic_sickle_zm: "Ballistic Knife (Sickle)",
    ray_gun_zm: "Ray Gun",
    thundergun_zm: "Thundergun",
    tesla_gun_zm: "Wunderwaffe DG-2",
    freezegun_zm: "Winter's Howl",
    sniper_explosive_zm: "Scavenger",
    humangun_zm: "V-R11",
    shrink_ray_zm: "31-79 JGb215",
    microwavegun_zm: "Wave Gun",
    microwavegundw_zm: "Zap Guns",
    zombie_cymbal_monkey: "Monkey Bombs",
    zombie_black_hole_bomb: "Gersh Device",
    zombie_quantum_bomb: "QED",
    zombie_nesting_dolls: "Matryoshka Dolls",
    claymore_zm: "Claymores",
    spikemore_zm: "Spikemores",
    frag_grenade_zm: "Frag Grenades",
    sticky_grenade_zm: "Semtex",
    stielhandgranate: "Stielhandgranate",
    bowie_knife_zm: "Bowie Knife",
    sickle_knife_zm: "Sickle",
    m2_flamethrower_zm: "M2 Flamethrower",
    zombie_kar98k: "Kar98k",
    kar98k_scoped_zombie: "Scoped Kar98k",
    mine_bouncing_betty: "Bouncing Betties",
    zombie_type99_rifle: "Arisaka",
    zombie_gewehr43: "Gewehr 43",
    zombie_m1carbine: "M1 Carbine",
    zombie_m1garand: "M1 Garand",
    zombie_thompson: "Thompson",
    zombie_type100_smg: "Type 100",
    zombie_stg44: "STG-44",
    zombie_shotgun: "Trench Gun",
    zombie_doublebarrel: "Double-Barreled Shotgun",
    zombie_doublebarrel_sawed: "Sawed-Off Shotgun",
    zombie_bar: "BAR",
    zombie_bar_bipod: "BAR (Bipod)",
    zombie_fg42: "FG42",
    zombie_mg42: "MG42",
    zombie_30cal: "Browning M1919",
    zombie_ppsh: "PPSh-41",
    zombie_ptrs41: "PTRS-41",
    zombie_sw_357: ".357 Magnum"
  };
  var PERKS = {
    specialty_armorvest: "Juggernog",
    specialty_quickrevive: "Quick Revive",
    specialty_fastreload: "Speed Cola",
    specialty_rof: "Double Tap",
    specialty_longersprint: "Stamin-Up",
    specialty_flakjacket: "PhD Flopper",
    specialty_deadshot: "Deadshot Daiquiri",
    specialty_additionalprimaryweapon: "Mule Kick"
  };
  var POWERUPS = {
    full_ammo: "Max Ammo",
    insta_kill: "Insta-Kill",
    double_points: "Double Points",
    nuke: "Nuke",
    carpenter: "Carpenter",
    fire_sale: "Fire Sale",
    minigun: "Death Machine",
    bonfire_sale: "Bonfire Sale",
    tesla: "Wunderwaffe",
    random_weapon: "Random Weapon",
    bonus_points_player: "Bonus Points",
    bonus_points_team: "Bonus Points (Team)",
    lose_points_team: "Lose Points",
    lose_perk: "Lose Perk",
    empty_clip: "Empty Clip",
    free_perk: "Free Perk"
  };
  function readable(id) {
    const words = String(id).replace(/_zm$/, "").replace(/^(zombie|specialty)_/, "").split("_").filter(Boolean);
    return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || String(id);
  }
  var weaponName = (id) => WEAPONS[id] ?? readable(id);
  var perkName = (id) => PERKS[id] ?? readable(id);
  var powerupName = (id) => POWERUPS[id] ?? readable(id);

  // src/cheats/strings.js
  var C = {
    setting: "Cheat menu",
    on: "On",
    off: "Off",
    turnOn: "Turn on",
    turnOff: "Turn off",
    reload: "Reload the page to apply.",
    note: "Weapons, perks, power-ups and rounds in Fun mode, and the map (press N in a game). The cheat menu needs only the host; to see the map, friends need this version too. Turning it off also turns off the map. In a game, press M to open the cheat menu without pausing; click the game to go back.",
    keyTip: "Tip: press M in game to open this card without pausing; click the game to go back.",
    failed: "The cheat menu could not load in this game, so Fun mode works as before. Reload the page to try again.",
    everyone: "Everyone",
    player: "that player",
    giveTo: "Give to",
    weapons: "Weapons on this map",
    pap: "Pack-a-Punch the weapon in hand",
    perks: "Perks (free)",
    noPerks: "This map has no perk machines.",
    powerNote: "Giving a perk turns the power on.",
    powerups: "Power-ups",
    noPowerups: "This map has no power-ups.",
    rounds: "Rounds",
    roundNow: (n) => `now round ${n}`,
    roundPlaceholder: "Go to round (1-255)",
    go: "Go",
    nextRound: "Next round",
    freeze: "Freeze round",
    giving: (thing, name) => `Giving ${thing} to ${name}…`,
    health: "Health",
    healthNote: "More health takes more hits to go down. Juggernog adds on top.",
    settingHealth: (pct, name) => `Setting health to ${pct}% for ${name}…`,
    healthSet: (pct, name) => `Health ${pct}% for ${name}.`,
    errBadHealth: "That health level isn't allowed.",
    packing: (name) => `Pack-a-Punching ${name}'s weapon…`,
    given: (thing, name) => `${thing} given to ${name}.`,
    packed: (name) => `Pack-a-Punched for ${name}.`,
    dropped: (thing, name) => `${thing} dropped in front of ${name}.`,
    goingTo: (n) => `Going to round ${n}.`,
    frozenOn: "Round frozen: it will not end until you unfreeze it.",
    frozenOff: "Round unfrozen.",
    errNoPlayer: "That player is no longer in the game.",
    errNotSpawned: "That player is still waiting to spawn (until the next round). Try again then.",
    errNoWeapon: (w) => `${w} is not on this map.`,
    errNoUpgrade: (w) => `${w} can't be Pack-a-Punched.`,
    errHasUpgrade: "That weapon is already Pack-a-Punched.",
    errNoPerk: (p) => `This map has no ${p} machine.`,
    errPerkFailed: (p) => `Could not give ${p} on this map right now.`,
    errNoPowerup: (p) => `${p} is not on this map.`,
    errBadRound: (max) => `Pick a round from 1 to ${max}.`,
    errHorde: "Round controls are not available in Hell mode.",
    errOther: (code) => `That did not work (${code}).`
  };

  // src/cheats/section.js
  var MAX_ROUND = 255;
  var HEALTH_LEVELS = [100, 150, 200, 300, 500];
  var byName = (name) => (a, b) => name(a).localeCompare(name(b));
  var AREA = { give: "weapons", pap: "weapons", perk: "perks", health: "health", powerup: "powerups", round: "rounds", next: "rounds", freeze: "rounds" };
  function say(session, text3, action) {
    session.fun.notice = text3;
    session.fun.noticeAt = Date.now();
    session.cheats.noticeArea = AREA[action] ?? "rounds";
  }
  function noticeAfter(session, area, blocks) {
    if (session.fun.notice && session.cheats.noticeArea === area) blocks.push({ kind: "callout", tone: "info", text: session.fun.notice });
  }
  function target(session, players) {
    const chosen = session.cheats.target ?? 0;
    return chosen === "all" || players.some((p) => p.slot === chosen) ? chosen : 0;
  }
  function who(session, players, slot) {
    if (slot === "all") return C.everyone;
    return players.find((p) => p.slot === slot)?.name ?? C.player;
  }
  var ERRORS = {
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
    bad_health: () => C.errBadHealth
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
  function cheatBlocks(session, players) {
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
    blocks.push({ kind: "label", text: C.health });
    blocks.push({ kind: "text", cls: "muted small", text: C.healthNote });
    const levelOf = (slot) => cheats.health?.[slot] ?? 100;
    const current = chosen === "all" ? players.every((p) => levelOf(p.slot) === levelOf(players[0].slot)) ? levelOf(players[0].slot) : null : levelOf(chosen);
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
          { act: "cheatFreeze", label: C.freeze, on: cheats.frozen }
        ]
      });
    }
    noticeAfter(session, "rounds", blocks);
    return blocks;
  }
  var cheatsFailedBlock = () => ({ kind: "callout", tone: "wait", text: C.failed });
  function cheatActions(session, funPlayers2) {
    const cheats = session.cheats;
    cheats.onResult = (result, sent) => {
      const players = funPlayers2(session);
      if (result.ok && sent.action === "health") {
        const slots = sent.target === "all" ? players.map((p) => p.slot) : [Number(sent.target)];
        for (const slot of slots) cheats.health[slot] = Number(sent.arg);
      }
      say(session, resultText(result, sent, who(session, players, sent.target)), sent.action);
    };
    const toChosen = (action, arg, pending) => {
      const players = funPlayers2(session);
      const slot = target(session, players);
      sendCheat(session, action, slot, arg);
      say(session, pending(who(session, players, slot)), action);
    };
    return {
      cheatTarget: (arg) => cheats.target = arg === "all" ? "all" : Number(arg),
      cheatGive: (weapon) => toChosen("give", weapon, (name) => C.giving(weaponName(weapon), name)),
      cheatPap: () => toChosen("pap", void 0, (name) => C.packing(name)),
      cheatPerk: (perk) => toChosen("perk", perk, (name) => C.giving(perkName(perk), name)),
      cheatPowerup: (powerup) => toChosen("powerup", powerup, (name) => C.giving(powerupName(powerup), name)),
      cheatHealth: (pct) => toChosen("health", pct, (name) => C.settingHealth(pct, name)),
      cheatRound: (text3) => {
        const round = Number(String(text3 ?? "").trim());
        if (!Number.isInteger(round) || round < 1 || round > MAX_ROUND) return say(session, C.errBadRound(MAX_ROUND), "round");
        sendCheat(session, "round", round);
        say(session, C.goingTo(round), "round");
      },
      cheatNext: () => sendCheat(session, "next"),
      cheatFreeze: () => {
        cheats.frozen = !cheats.frozen;
        sendCheat(session, "freeze", cheats.frozen ? 1 : 0);
      }
    };
  }

  // src/fun/fun.js
  var TEXT = {
    en: {
      title: "Fun mode",
      note: "Host only. Changes apply to everyone in your game.",
      pause: "Tip: press Esc in game to open this card.",
      flyHint: "Fly and Noclip go through walls: switch them off standing on the floor, or you fall out of the map.",
      players: "Players",
      all: "Everyone",
      god: "God",
      demigod: "Can't die",
      notarget: "Invisible",
      noclip: "Noclip",
      ufo: "Fly",
      speed: "Speed",
      money: "Points",
      ammo: "Ammo",
      infiniteClip: "Infinite clip",
      infiniteStock: "Infinite reserve",
      refill: "Refill everyone",
      zombies: "Zombies",
      oneHit: "Die in one hit",
      passive: "Ignore players",
      clear: "Clear zombies",
      world: "World",
      timescale: "Game speed",
      jump: "Jump height",
      gravity: "Gravity",
      weapons: "Weapons (for you)",
      weaponMissing: (w) => `${w} is not on this map.`,
      weaponGiven: (w) => `${w} given.`,
      reset: "Reset everything",
      notLoaded: "Start a map to use this.",
      cheatsOff: "This map has cheats off: the commands won't work."
    },
    pt: {
      title: "Modo diversão",
      note: "Só o host. Vale para todo mundo na sua partida.",
      pause: "Dica: aperte Esc no jogo para abrir este cartão.",
      flyHint: "Voa e Atravessa passam por paredes: desligue com os pés no chão, senão o jogador cai para fora do mapa.",
      players: "Jogadores",
      all: "Todos",
      god: "Imortal",
      demigod: "Não morre",
      notarget: "Invisível",
      noclip: "Atravessa",
      ufo: "Voa",
      speed: "Velocidade",
      money: "Pontos",
      ammo: "Munição",
      infiniteClip: "Pente infinito",
      infiniteStock: "Reserva infinita",
      refill: "Encher a de todos",
      zombies: "Zumbis",
      oneHit: "Morrem com 1 tiro",
      passive: "Ignoram vocês",
      clear: "Limpar zumbis",
      world: "Mundo",
      timescale: "Velocidade do jogo",
      jump: "Altura do pulo",
      gravity: "Gravidade",
      weapons: "Armas (para você)",
      weaponMissing: (w) => `${w} não existe neste mapa.`,
      weaponGiven: (w) => `${w} entregue.`,
      reset: "Resetar tudo",
      notLoaded: "Abra um mapa para usar.",
      cheatsOff: "Este mapa está com cheats desligados: os comandos não vão funcionar."
    }
  };
  var F = TEXT[LANG];
  var PLAYER_TOGGLES = ["god", "demigod", "notarget", "noclip", "ufo"];
  var SPEEDS = [0.5, 0.75, 1, 1.5, 2, 3];
  var TIMESCALES = [0.25, 0.5, 0.75, 1, 1.5, 2];
  var JUMPS = [39, 80, 150, 300, 600];
  var GRAVITIES = [800, 600, 400, 200, 100];
  var STOCK = 999;
  var WEAPONS2 = [
    ["ray_gun_zm", "Ray Gun"],
    ["ray_gun_upgraded_zm", "Ray Gun (PaP)"],
    ["thundergun_zm", "Thundergun"],
    ["thundergun_upgraded_zm", "Thundergun (PaP)"],
    ["tesla_gun_zm", "Wunderwaffe"],
    ["freezegun_zm", "Winter's Howl"],
    ["microwavegun_zm", "Wave Gun"],
    ["sniper_explosive_zm", "Scavenger"],
    ["crossbow_explosive_zm", "Crossbow"],
    ["knife_ballistic_zm", "Ballistic Knife"],
    ["hk21_zm", "HK21"],
    ["rpk_zm", "RPK"],
    ["galil_zm", "Galil"],
    ["commando_zm", "Commando"],
    ["famas_zm", "FAMAS"],
    ["aug_acog_zm", "AUG"],
    ["spas_zm", "SPAS-12"],
    ["china_lake_zm", "China Lake"],
    ["python_zm", "Python"],
    ["cz75dw_zm", "CZ75 Dual"],
    ["zombie_cymbal_monkey", "Monkey Bomb"],
    ["zombie_black_hole_bomb", "Gersh Device"],
    ["bowie_knife_zm", "Bowie Knife"],
    ["claymore_zm", "Claymores"]
  ];
  function createFun() {
    return {
      open: false,
      players: {},
      // slot -> { god, demigod, notarget, noclip, ufo, speed }
      infiniteClip: false,
      infiniteStock: false,
      oneHit: false,
      passive: false,
      timescale: 1,
      jump: 39,
      gravity: 800,
      queue: [],
      // console commands waiting for the engine's mailbox
      notice: null,
      noticeAt: 0,
      lastStockAt: 0,
      lastZombiesAt: 0
    };
  }
  var playerState = (fun, slot) => fun.players[slot] ??= { god: false, demigod: false, notarget: false, noclip: false, ufo: false, speed: 1 };
  function funPlayers(session) {
    const players = [{ slot: 0, n: 1, name: session.name || (LANG === "pt" ? "Você" : "You") }];
    if (session.mode === "host") {
      for (const g of session.guests.values()) {
        if (g.present && g.slot?.state === SLOT.active) players.push({ slot: g.slot.slot, n: g.seat + 1, name: g.state?.name || `${LANG === "pt" ? "Jogador" : "Player"} ${g.seat + 1}` });
      }
    }
    return players;
  }
  var funAvailable = (session) => session.mode !== "guest";
  function addresses(session) {
    const f = session.build?.fun;
    const engine = session.engine;
    if (!f || !engine) return null;
    return {
      f,
      engine,
      ent: (slot) => f.entities + slot * f.entitySize,
      client: (slot) => engine.int(f.entities + slot * f.entitySize + f.ent.client)
    };
  }
  function setBit(engine, address, bit, on) {
    if (on) Atomics.or(engine.i32, address >> 2, bit);
    else Atomics.and(engine.i32, address >> 2, ~bit);
  }
  function say2(fun, text3) {
    fun.notice = text3;
    fun.noticeAt = Date.now();
  }
  function funTick(session) {
    const fun = session.fun;
    if (fun.notice && Date.now() - fun.noticeAt > 6e3) fun.notice = null;
    if (session.cheats) cheatsTick(session, Date.now(), funAvailable(session) && screen() === "playing");
    const a = addresses(session);
    if (!a || !funAvailable(session) || screen() !== "playing") {
      flushQueue(session);
      return;
    }
    const { f, engine } = a;
    const now = Date.now();
    for (const { slot } of funPlayers(session)) {
      const p = fun.players[slot];
      if (!p) continue;
      const ent = a.ent(slot);
      const client = a.client(slot);
      if (!client) continue;
      if (p.god || p.demigod || p.notarget) {
        if (p.god) setBit(engine, ent + f.ent.flags, f.entFlags.god, true);
        if (p.demigod) setBit(engine, ent + f.ent.flags, f.entFlags.demigod, true);
        if (p.notarget) setBit(engine, ent + f.ent.flags, f.entFlags.notarget, true);
      }
      if (p.noclip) setBit(engine, client + f.client.flags, f.clientFlags.noclip, true);
      if (p.ufo) setBit(engine, client + f.client.flags, f.clientFlags.ufo, true);
      if (p.speed !== 1) new Float32Array(engine.buffer)[client + f.client.speedScale >> 2] = p.speed;
    }
    if (fun.infiniteStock && now - fun.lastStockAt > 500) {
      fun.lastStockAt = now;
      refillStock(session, a);
    }
    if ((fun.oneHit || fun.passive) && now - fun.lastZombiesAt > 1500) {
      fun.lastZombiesAt = now;
      if (!fun.queue.length) {
        if (fun.oneHit) fun.queue.push("ai axis health 1");
        if (fun.passive) fun.queue.push("ai axis ignoreall 1");
      }
    }
    flushQueue(session);
  }
  function flushQueue(session) {
    const fun = session.fun;
    if (!fun.queue.length || !session.engine) return;
    if (session.engine.command(fun.queue[0])) fun.queue.shift();
  }
  function refillStock(session, a, slots = funPlayers(session).map((p) => p.slot)) {
    const { f, engine } = a;
    for (const slot of slots) {
      const client = a.client(slot);
      if (!client) continue;
      for (let i = 0; i < f.client.ammoSlots; i += 1) {
        const pool = client + f.client.ammoPools + 8 * i;
        if (engine.int(pool) && engine.int(pool + 4) < STOCK) engine.setInt(pool + 4, STOCK);
      }
    }
  }
  function watchConsole(session) {
    for (const level of ["log", "warn", "error"]) {
      const original = console[level];
      console[level] = function(...args) {
        const text3 = typeof args[0] === "string" ? args[0] : "";
        onCheatsLine(session, text3);
        const missing = text3.match(/Could not load weapon "([^"]+)"/);
        if (missing && session.fun?.pendingWeapon === missing[1]) {
          const label = WEAPONS2.find(([w]) => w === missing[1])?.[1] ?? missing[1];
          say2(session.fun, F.weaponMissing(label));
          session.fun.pendingWeapon = null;
        }
        return original.apply(this, args);
      };
    }
  }
  function step(list, value, direction) {
    const i = list.indexOf(value);
    const at2 = i < 0 ? list.indexOf(list.reduce((best, v) => Math.abs(v - value) < Math.abs(best - value) ? v : best, list[0])) : i;
    return list[Math.max(0, Math.min(list.length - 1, at2 + direction))];
  }
  function funActions(session) {
    const fun = session.fun;
    const engineReady = () => Boolean(addresses(session));
    const togglePlayer = (key, slot) => {
      const a = addresses(session);
      const p = playerState(fun, slot);
      p[key] = !p[key];
      if (!p[key] && a) {
        const client = a.client(slot);
        if (key === "noclip" || key === "ufo") {
          if (client) setBit(a.engine, client + a.f.client.flags, a.f.clientFlags[key], false);
        } else {
          setBit(a.engine, a.ent(slot) + a.f.ent.flags, a.f.entFlags[key], false);
        }
      }
    };
    const setSpeed = (slot, value) => {
      const a = addresses(session);
      playerState(fun, slot).speed = value;
      const client = a?.client(slot);
      if (client) new Float32Array(a.engine.buffer)[client + a.f.client.speedScale >> 2] = value;
    };
    const addPoints = (slot, amount) => {
      const a = addresses(session);
      const client = a?.client(slot);
      if (!client) return;
      const score = client + a.f.client.score;
      a.engine.setInt(score, amount === "max" ? 9999990 : amount === "zero" ? 0 : Math.min(9999990, a.engine.int(score) + amount));
    };
    const parse = (arg) => {
      const [what, slot] = String(arg).split(":");
      return { what, slot: slot === "all" ? "all" : Number(slot) };
    };
    const forSlots = (slot) => slot === "all" ? funPlayers(session).map((p) => p.slot) : [slot];
    return {
      ...session.cheats ? cheatActions(session, funPlayers) : {},
      fun: () => fun.open = !fun.open,
      funToggle: (arg) => {
        if (!engineReady()) return;
        const { what, slot } = parse(arg);
        if (slot === "all") {
          const slots = forSlots("all");
          const turnOn = !slots.every((s) => playerState(fun, s)[what]);
          for (const s of slots) if (playerState(fun, s)[what] !== turnOn) togglePlayer(what, s);
        } else {
          togglePlayer(what, slot);
        }
      },
      funSpeed: (arg) => {
        if (!engineReady()) return;
        const { what, slot } = parse(arg);
        for (const s of forSlots(slot)) setSpeed(s, step(SPEEDS, playerState(fun, s).speed, what === "up" ? 1 : -1));
      },
      funPoints: (arg) => {
        if (!engineReady()) return;
        const { what, slot } = parse(arg);
        const amount = what === "max" || what === "zero" ? what : Number(what);
        for (const s of forSlots(slot)) addPoints(s, amount);
      },
      funAmmo: (arg) => {
        if (!engineReady()) return;
        if (arg === "clip") {
          fun.infiniteClip = !fun.infiniteClip;
          fun.queue.push(`set player_sustainAmmo ${fun.infiniteClip ? 1 : 0}`);
        } else if (arg === "stock") {
          fun.infiniteStock = !fun.infiniteStock;
        } else if (arg === "refill") {
          refillStock(session, addresses(session));
        }
      },
      funZombies: (arg) => {
        if (!engineReady()) return;
        if (arg === "onehit") fun.oneHit = !fun.oneHit;
        else if (arg === "passive") {
          fun.passive = !fun.passive;
          if (!fun.passive) fun.queue.push("ai axis ignoreall 0");
        } else if (arg === "clear") fun.queue.push("ai axis delete");
        if (fun.oneHit && arg === "onehit") fun.queue.push("ai axis health 1");
        if (fun.passive && arg === "passive") fun.queue.push("ai axis ignoreall 1");
      },
      funWorld: (arg) => {
        if (!engineReady()) return;
        const [what, dir2] = String(arg).split(":");
        const direction = dir2 === "up" ? 1 : -1;
        if (what === "timescale") {
          fun.timescale = step(TIMESCALES, fun.timescale, direction);
          fun.queue.push(`timescale ${fun.timescale}`);
        } else if (what === "jump") {
          fun.jump = step(JUMPS, fun.jump, direction);
          fun.queue.push(`jump_height ${fun.jump}`);
        } else if (what === "gravity") {
          fun.gravity = step(GRAVITIES, fun.gravity, direction);
          fun.queue.push(`bg_gravity ${fun.gravity}`);
        }
      },
      funWeapon: (weapon) => {
        if (!engineReady()) return;
        fun.pendingWeapon = weapon;
        fun.queue.push(`give ${weapon}`);
        const label = WEAPONS2.find(([w]) => w === weapon)?.[1] ?? weapon;
        say2(fun, F.weaponGiven(label));
      },
      funReset: () => {
        const a = addresses(session);
        for (const { slot } of funPlayers(session)) {
          const p = playerState(fun, slot);
          for (const key of PLAYER_TOGGLES) if (p[key]) togglePlayer(key, slot);
          if (p.speed !== 1) setSpeed(slot, 1);
        }
        fun.infiniteStock = false;
        fun.oneHit = false;
        if (fun.passive) fun.queue.push("ai axis ignoreall 0");
        fun.passive = false;
        if (fun.infiniteClip) fun.queue.push("set player_sustainAmmo 0");
        fun.infiniteClip = false;
        if (fun.timescale !== 1) fun.queue.push("timescale 1");
        if (fun.jump !== 39) fun.queue.push("jump_height 39");
        if (fun.gravity !== 800) fun.queue.push("bg_gravity 800");
        Object.assign(fun, { timescale: 1, jump: 39, gravity: 800 });
        if (!a) fun.queue.length = 0;
      }
    };
  }
  var fmt = (v) => Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, "");
  function funSection(session) {
    const fun = session.fun;
    const blocks = [];
    const a = addresses(session);
    if (!a || !["ready", "playing"].includes(screen())) {
      blocks.push({ kind: "text", cls: "muted small", text: F.notLoaded });
      return { kind: "section", title: F.title, act: "fun", open: fun.open, blocks };
    }
    const cheats = (() => {
      const dvar = a.engine.int(a.f.cheatsDvar);
      return dvar ? a.engine.byte(dvar + 24) === 1 : true;
    })();
    blocks.push({ kind: "text", cls: "muted small", text: `${F.note} ${session.cheats?.enabled ? C.keyTip : F.pause}` });
    if (!cheats) blocks.push({ kind: "callout", tone: "wait", text: F.cheatsOff });
    const cheating = session.cheats?.ok && session.cheats.ready;
    if (fun.notice && !cheating) blocks.push({ kind: "callout", tone: "info", text: fun.notice });
    const players = funPlayers(session);
    blocks.push({ kind: "label", text: F.players });
    const rows = players.length > 1 ? [...players, { slot: "all", n: 0, name: F.all }] : players;
    for (const p of rows) {
      const state = p.slot === "all" ? null : playerState(fun, p.slot);
      const allOn = (key) => players.every((q) => playerState(fun, q.slot)[key]);
      const on = (key) => state ? state[key] : allOn(key);
      const speed = state ? state.speed : players.every((q) => playerState(fun, q.slot).speed === playerState(fun, players[0].slot).speed) ? playerState(fun, players[0].slot).speed : null;
      const score = state ? a.engine.int((a.client(p.slot) || 0) + a.f.client.score) : null;
      blocks.push({
        kind: "funPlayer",
        n: p.n,
        name: p.name,
        chips: PLAYER_TOGGLES.map((key) => ({ act: "funToggle", arg: `${key}:${p.slot}`, label: F[key], on: on(key) })),
        speed: { label: F.speed, value: speed == null ? "–" : `${fmt(speed)}×`, dec: { act: "funSpeed", arg: `down:${p.slot}` }, inc: { act: "funSpeed", arg: `up:${p.slot}` } },
        money: {
          label: F.money,
          value: score == null ? "" : score.toLocaleString(),
          buttons: [
            { act: "funPoints", arg: `5000:${p.slot}`, label: "+5k" },
            { act: "funPoints", arg: `50000:${p.slot}`, label: "+50k" },
            { act: "funPoints", arg: `max:${p.slot}`, label: "Max" },
            { act: "funPoints", arg: `zero:${p.slot}`, label: "0" }
          ]
        }
      });
    }
    if (players.some((p) => fun.players[p.slot]?.noclip || fun.players[p.slot]?.ufo)) blocks.push({ kind: "callout", tone: "wait", text: F.flyHint });
    blocks.push({ kind: "label", text: F.ammo });
    blocks.push({
      kind: "chips",
      chips: [
        { act: "funAmmo", arg: "clip", label: F.infiniteClip, on: fun.infiniteClip },
        { act: "funAmmo", arg: "stock", label: F.infiniteStock, on: fun.infiniteStock },
        { act: "funAmmo", arg: "refill", label: F.refill, on: false, plain: true }
      ]
    });
    blocks.push({ kind: "label", text: F.zombies });
    blocks.push({
      kind: "chips",
      chips: [
        { act: "funZombies", arg: "onehit", label: F.oneHit, on: fun.oneHit },
        { act: "funZombies", arg: "passive", label: F.passive, on: fun.passive },
        { act: "funZombies", arg: "clear", label: F.clear, on: false, plain: true }
      ]
    });
    blocks.push({ kind: "label", text: F.world });
    blocks.push({ kind: "stepper", label: F.timescale, value: `${fmt(fun.timescale)}×`, dec: { act: "funWorld", arg: "timescale:down" }, inc: { act: "funWorld", arg: "timescale:up" } });
    blocks.push({ kind: "stepper", label: F.jump, value: String(fun.jump), dec: { act: "funWorld", arg: "jump:down" }, inc: { act: "funWorld", arg: "jump:up" } });
    blocks.push({ kind: "stepper", label: F.gravity, value: String(fun.gravity), dec: { act: "funWorld", arg: "gravity:down" }, inc: { act: "funWorld", arg: "gravity:up" } });
    if (cheating) blocks.push(...cheatBlocks(session, players));
    else {
      if (session.cheats?.ok === false) blocks.push(cheatsFailedBlock());
      blocks.push({ kind: "label", text: F.weapons, aside: MAP_SLUGS[session.zone ?? currentZone()] ?? "" });
      blocks.push({ kind: "grid", buttons: WEAPONS2.map(([w, label]) => ({ act: "funWeapon", arg: w, label })) });
    }
    blocks.push({ kind: "buttons", buttons: [{ act: "funReset", label: F.reset, style: "ghost" }] });
    return { kind: "section", title: F.title, act: "fun", open: fun.open, blocks };
  }

  // src/map/plans/ascension.json
  var ascension_default = { v: 1, slug: "ascension", sig: "z16d11c182803", floors: [{ name: "Ground floor", below: null }], rooms: [{ id: "storage_lander_zone", label: [0, 144, -2280], rects: [[0, 0, -2544, 336, -2448], [0, -48, -2448, 384, -2352], [0, -96, -2352, 384, -2208], [0, -288, -2208, 624, -2160], [0, -288, -2160, 672, -2112], [0, -288, -2112, 624, -2064], [0, -288, -2064, 672, -2016], [0, -240, -2016, 672, -1968], [0, -288, -1968, 672, -1920], [0, 144, -1920, 672, -1872], [0, -336, -1920, 96, -1824], [0, 144, -1872, 384, -1824], [0, 432, -1872, 672, -1824], [0, -336, -1824, 672, -1776], [0, -288, -1776, 192, -1728], [0, 240, -1776, 672, -1728], [0, -192, -1728, 672, -1680], [0, -240, -1680, 672, -1632], [0, -240, -1632, -96, -1584], [0, -48, -1632, 672, -1584], [0, -192, -1584, -144, -1536], [0, -48, -1584, 144, -1536], [0, 240, -1584, 672, -1536], [0, -144, -1536, 672, -1488], [0, -144, -1488, 720, -1440], [0, -240, -1440, 720, -1392], [0, -336, -1392, 672, -1344], [0, -384, -1344, 48, -1296], [0, 96, -1344, 672, -1296], [0, -384, -1296, 0, -1248], [0, -336, -1248, 48, -1200], [0, -240, -1200, 96, -1152], [0, -192, -1152, 144, -1104], [0, -144, -1104, 192, -1056], [0, -192, -1056, 192, -1008], [0, -144, -1008, 144, -912], [0, -144, -912, 192, -816], [0, -192, -816, 144, -768], [0, -144, -768, 144, -672]] }, { id: "north_catwalk_zone3", label: [0, 744, 1104], rects: [[0, 1584, 720, 1728, 768], [0, 1632, 768, 1776, 816], [0, 1440, 816, 1536, 864], [0, 1584, 816, 1776, 864], [0, 576, 864, 912, 912], [0, 1392, 864, 1728, 912], [0, 528, 912, 960, 960], [0, 1392, 912, 1440, 1008], [0, 1488, 912, 1776, 1008], [0, 576, 960, 960, 1056], [0, 1056, 1008, 1104, 1056], [0, 1248, 1008, 1296, 1056], [0, 1344, 1008, 1440, 1056], [0, 1488, 1008, 1824, 1056], [0, 1056, 1056, 1200, 1104], [0, 1248, 1056, 1824, 1104], [0, 528, 1056, 960, 1152], [0, 1056, 1104, 1296, 1152], [0, 1344, 1104, 1440, 1152], [0, 1488, 1104, 1872, 1152], [0, 576, 1152, 960, 1200], [0, 1104, 1152, 1248, 1200], [0, 576, 1200, 912, 1248], [0, 1488, 1152, 1920, 1248], [0, 576, 1248, 624, 1296], [0, 672, 1248, 816, 1296], [0, 1392, 1248, 1488, 1296], [0, 1536, 1248, 1920, 1296], [0, 1392, 1296, 1920, 1344], [0, 1392, 1344, 1872, 1392], [0, 1488, 1392, 1824, 1440], [0, 1632, 1440, 1776, 1488], [0, 1392, 1440, 1584, 1584], [0, 1440, 1584, 1536, 1632]] }, { id: "power_building_roof", label: [0, -672, 1512], rects: [[0, -672, 864, -624, 912], [0, -768, 864, -720, 960], [0, -480, 912, -432, 960], [0, -384, 960, -336, 1008], [0, -720, 1008, -624, 1056], [0, -480, 1008, -384, 1056], [0, -576, 1008, -528, 1104], [0, -432, 1056, -336, 1104], [0, -672, 1104, -624, 1152], [0, -576, 1104, -336, 1152], [0, -528, 1200, -480, 1248], [0, -432, 1152, -384, 1248], [0, -432, 1248, -336, 1296], [0, -768, 1296, -720, 1344], [0, -672, 1296, -480, 1344], [0, -528, 1344, -432, 1392], [0, -720, 1392, -672, 1440], [0, -576, 1392, -480, 1440], [0, -384, 1296, -336, 1440], [0, -576, 1440, -528, 1488], [0, -480, 1440, -384, 1488], [0, -816, 1488, -528, 1536], [0, -768, 1536, -720, 1584]] }, { id: "centrifuge2power_zone", label: [0, -528, 768], rects: [[0, -432, 672, -384, 720], [0, -672, 720, -384, 816], [0, -288, 720, -48, 816], [0, -672, 816, -336, 864], [0, -240, 816, -192, 864], [0, 48, 816, 144, 864], [0, -432, 864, 144, 912], [0, -624, 912, -576, 960], [0, -336, 912, 144, 960], [0, -528, 960, -384, 1008], [0, -288, 960, -240, 1008], [0, -192, 960, 144, 1008], [0, -384, 1008, 144, 1056], [0, -192, 1056, 144, 1104], [0, -624, 1008, -576, 1152], [0, -336, 1104, 144, 1152], [0, -384, 1152, -336, 1200], [0, -288, 1152, -192, 1200], [0, -144, 1152, -48, 1200], [0, 0, 1152, 144, 1200], [0, -624, 1200, -528, 1248], [0, -480, 1200, -432, 1248], [0, -384, 1200, 144, 1248]] }, { id: "centrifuge_zone2", label: [0, -144, 24], rects: [[0, -288, -240, -144, -192], [0, -288, -144, -240, -96], [0, -144, -144, 0, -96], [0, -144, -96, -96, -48], [0, -432, -48, -240, 0], [0, -144, -48, -48, 0], [0, 0, -48, 96, 0], [0, 192, -48, 240, 0], [0, -528, 0, 240, 48], [0, -240, 48, -192, 96], [0, -48, 48, 0, 96], [0, 48, 48, 192, 96], [0, -528, 48, -336, 144], [0, 48, 96, 96, 144], [0, -624, 144, -384, 192], [0, 144, 96, 240, 192], [0, -528, 192, -432, 240], [0, 144, 192, 288, 240], [0, -864, 240, -816, 288], [0, -624, 240, -576, 288], [0, 96, 240, 192, 288], [0, -864, 288, -576, 336], [0, -528, 240, -480, 336], [0, 192, 288, 336, 336], [0, -864, 336, -480, 384], [0, -864, 384, -528, 432], [0, 192, 384, 288, 432], [0, -864, 432, -672, 480], [0, -576, 432, -432, 480], [0, -528, 480, -432, 528], [0, 144, 432, 288, 528], [0, 96, 528, 288, 576], [0, 96, 576, 240, 624], [0, 96, 624, 192, 672]] }, { id: "centrifuge_zone", label: [0, -288, 576], rects: [[0, -336, -480, -144, -432], [0, -384, -432, 0, -384], [0, -384, -384, -144, -336], [0, -96, -384, 0, -336], [0, -384, -336, -48, -288], [0, -624, -288, -576, -240], [0, -528, -288, -480, -240], [0, -432, -288, -192, -240], [0, -96, -288, 0, -240], [0, -864, -288, -816, -192], [0, -768, -240, -432, -192], [0, -384, -240, -288, -192], [0, -144, -240, -96, -192], [0, -336, -192, -240, -144], [0, -192, -192, 0, -144], [0, -480, -192, -384, -96], [0, -240, -144, -192, -96], [0, 0, -144, 96, -96], [0, -816, -192, -528, -48], [0, -432, -96, -240, -48], [0, -192, -96, -144, -48], [0, -48, -96, 144, -48], [0, -864, -48, -432, 0], [0, -240, -48, -144, 0], [0, -48, -48, 0, 0], [0, 96, -48, 192, 0], [0, -336, 48, -240, 96], [0, -192, 48, -48, 96], [0, 0, 48, 48, 96], [0, 192, 48, 288, 96], [0, -864, 0, -528, 144], [0, -336, 96, 48, 144], [0, 96, 96, 144, 144], [0, 240, 96, 288, 144], [0, -864, 144, -624, 192], [0, -384, 144, 0, 192], [0, 48, 144, 144, 192], [0, 240, 144, 336, 192], [0, -864, 192, -528, 240], [0, -432, 192, 144, 240], [0, 288, 192, 336, 240], [0, -816, 240, -624, 288], [0, -480, 240, 96, 288], [0, 192, 240, 336, 288], [0, -576, 240, -528, 336], [0, -480, 288, 192, 336], [0, -480, 336, -192, 384], [0, -96, 336, 336, 384], [0, -528, 384, -192, 432], [0, -144, 384, 192, 432], [0, -672, 432, -576, 480], [0, -432, 432, 144, 480], [0, -672, 480, -528, 528], [0, -432, 480, -336, 528], [0, -288, 480, 144, 528], [0, 288, 384, 336, 576], [0, -672, 528, 96, 624], [0, -672, 624, -432, 672], [0, -384, 624, 96, 672], [0, -720, 672, -432, 720], [0, -384, 672, 240, 720], [0, -48, 720, 240, 768], [0, -384, 720, -288, 816], [0, -48, 768, 96, 816], [0, 144, 768, 192, 816], [0, -336, 816, -240, 864], [0, -192, 816, 48, 864]] }, { id: "control_room_zone", label: [0, 648, 384], rects: [[0, 336, 48, 720, 96], [0, 288, 96, 720, 144], [0, 336, 144, 720, 240], [0, 336, 240, 768, 288], [0, 336, 288, 960, 480], [0, 336, 480, 720, 528], [0, 480, 528, 720, 720]] }, { id: "under_rocket_zone", label: [0, 1392, 576], rects: [[0, 1248, -48, 1296, 0], [0, 1344, -48, 1584, 0], [0, 1632, -48, 1776, 0], [0, 1200, 0, 1824, 48], [0, 1152, 48, 1824, 96], [0, 1104, 96, 1776, 144], [0, 1008, 144, 1824, 192], [0, 1008, 192, 1632, 240], [0, 1680, 192, 1776, 240], [0, 1008, 240, 1824, 288], [0, 960, 288, 1488, 336], [0, 1536, 288, 1824, 336], [0, 960, 336, 1776, 384], [0, 960, 384, 1824, 432], [0, 960, 432, 1488, 480], [0, 1536, 432, 1824, 480], [0, 1056, 480, 1824, 528], [0, 1008, 528, 1776, 624], [0, 1104, 624, 1584, 672], [0, 1632, 624, 1824, 672], [0, 1104, 672, 1824, 720], [0, 1200, 720, 1584, 768], [0, 1728, 720, 1824, 768]] }, { id: "roof_connector_zone", label: [0, 120, 1296], rects: [[0, -336, 960, -288, 1008], [0, -240, 960, -192, 1008], [0, -336, 1056, -192, 1104], [0, -336, 1152, -288, 1200], [0, -192, 1152, -144, 1200], [0, -48, 1152, 0, 1200], [0, 144, 1152, 576, 1248], [0, -336, 1248, 576, 1344], [0, -336, 1344, 480, 1440], [0, -384, 1440, 480, 1488], [0, -336, 1488, -240, 1536], [0, 0, 1488, 528, 1536], [0, 192, 1536, 240, 1584], [0, 288, 1536, 528, 1584], [0, 144, 1584, 528, 1680]] }, { id: "north_path_zone", label: [0, 792, 1752], rects: [[0, 1056, 672, 1104, 720], [0, 1008, 720, 1200, 768], [0, 960, 768, 1632, 816], [0, 912, 816, 1440, 864], [0, 1536, 816, 1584, 864], [0, 912, 864, 1392, 912], [0, 960, 912, 1392, 1008], [0, 1104, 1008, 1248, 1056], [0, 1296, 1008, 1344, 1056], [0, 1440, 912, 1488, 1056], [0, 1200, 1056, 1248, 1104], [0, 960, 1008, 1056, 1152], [0, 1296, 1104, 1344, 1152], [0, 1440, 1104, 1488, 1152], [0, 960, 1152, 1104, 1200], [0, 1248, 1152, 1488, 1200], [0, 912, 1200, 1488, 1248], [0, 624, 1248, 672, 1296], [0, 816, 1248, 1392, 1296], [0, 1488, 1248, 1536, 1296], [0, 576, 1296, 1392, 1344], [0, 528, 1344, 1248, 1392], [0, 1296, 1344, 1392, 1392], [0, 576, 1392, 1248, 1440], [0, 1296, 1392, 1488, 1440], [0, 144, 1536, 192, 1584], [0, 240, 1536, 288, 1584], [0, 528, 1440, 1392, 1584], [0, 528, 1584, 1440, 1680], [0, 144, 1680, 1440, 1824], [0, 144, 1824, 528, 1872], [0, 576, 1824, 1440, 1872], [0, 144, 1872, 1440, 1920], [0, 144, 1920, 1392, 1968], [0, 144, 1968, 288, 2016], [0, 336, 1968, 1392, 2016], [0, 192, 2016, 672, 2064], [0, 720, 2016, 768, 2064], [0, 816, 2016, 864, 2064], [0, 912, 2016, 960, 2064], [0, 192, 2064, 288, 2112], [0, 336, 2064, 432, 2112]] }, { id: "base_entry_zone2", label: [0, -360, 1752], rects: [[0, -528, 864, -432, 912], [0, -528, 912, -480, 960], [0, -432, 912, -336, 960], [0, -768, 960, -672, 1008], [0, -528, 1008, -480, 1056], [0, -720, 1056, -672, 1104], [0, -528, 1056, -432, 1104], [0, -576, 1152, -432, 1200], [0, -720, 1152, -624, 1248], [0, -768, 1248, -672, 1296], [0, -624, 1248, -432, 1296], [0, -480, 1296, -384, 1344], [0, -912, 1344, -864, 1392], [0, -768, 1344, -720, 1392], [0, -672, 1344, -528, 1392], [0, -432, 1344, -384, 1392], [0, -864, 1392, -720, 1440], [0, -624, 1392, -576, 1440], [0, -480, 1392, -384, 1440], [0, -816, 1440, -720, 1488], [0, -672, 1440, -576, 1488], [0, -528, 1440, -480, 1488], [0, -528, 1488, -336, 1536], [0, -240, 1488, 0, 1536], [0, -576, 1536, 144, 1584], [0, -624, 1584, 144, 1632], [0, -672, 1632, 144, 1680], [0, -768, 1680, 144, 1728], [0, -864, 1728, 144, 1776], [0, -912, 1776, -336, 1824], [0, -288, 1776, 144, 1824], [0, -864, 1824, -336, 1872], [0, -192, 1824, 144, 1872], [0, -864, 1872, -528, 1920], [0, -912, 1920, -528, 1968], [0, -912, 1968, -576, 2016], [0, -144, 1872, 144, 2016], [0, -864, 2016, -576, 2064], [0, -816, 2064, -576, 2112], [0, -144, 2016, 192, 2112]] }, { id: "power_building", label: [0, -816, 1056], rects: [[0, -816, 816, -672, 864], [0, -720, 864, -672, 912], [0, -624, 864, -528, 912], [0, -912, 864, -768, 960], [0, -720, 912, -624, 960], [0, -576, 912, -528, 960], [0, -864, 960, -768, 1008], [0, -672, 960, -528, 1008], [0, -912, 1008, -720, 1104], [0, -672, 1056, -624, 1104], [0, -912, 1104, -672, 1152], [0, -624, 1152, -576, 1200], [0, -912, 1152, -720, 1248], [0, -912, 1248, -768, 1296], [0, -672, 1248, -624, 1296], [0, -864, 1296, -768, 1392], [0, -720, 1296, -672, 1392], [0, -672, 1392, -624, 1440], [0, -720, 1440, -672, 1488], [0, -912, 1440, -816, 1536]] }, { id: "storage_zone2", label: [0, 312, -480], rects: [[0, -144, -672, 480, -624], [0, -144, -624, 672, -576], [0, -48, -576, 720, -528], [0, -144, -528, 768, -432], [0, 0, -432, 672, -384], [0, -144, -384, -96, -336], [0, 0, -384, 192, -336], [0, 240, -384, 672, -336], [0, -48, -336, 720, -288], [0, -192, -288, -96, -240], [0, 0, -288, 672, -240], [0, -96, -240, 672, -192], [0, 0, -192, 672, -144], [0, -192, -144, -144, -96], [0, 192, -144, 672, -96], [0, -96, -96, -48, -48], [0, 192, -96, 576, -48]] }, { id: "storage_zone", label: [0, -936, -120], rects: [[0, -672, -480, -624, -432], [0, -816, -432, -432, -384], [0, -864, -384, -384, -336], [0, -960, -336, -384, -288], [0, -1008, -288, -864, -240], [0, -816, -288, -624, -240], [0, -576, -288, -528, -240], [0, -480, -288, -432, -240], [0, -1056, -240, -864, -192], [0, -816, -240, -768, -192], [0, -432, -240, -384, -192], [0, -384, -192, -336, -144], [0, -240, -192, -192, -144], [0, -528, -192, -480, -96], [0, -384, -144, -288, -96], [0, -1056, -192, -816, -48], [0, -528, -96, -432, -48], [0, -240, -96, -192, -48]] }, { id: "base_entry_zone", label: [0, -1728, 1968], rects: [[0, -1584, 816, -1344, 864], [0, -1632, 864, -1344, 912], [0, -1680, 912, -1296, 960], [0, -1680, 960, -1248, 1008], [0, -1680, 1008, -1200, 1104], [0, -1680, 1104, -1152, 1152], [0, -1584, 1152, -1152, 1200], [0, -1680, 1200, -1152, 1296], [0, -1104, 1248, -1008, 1296], [0, -960, 1248, -912, 1296], [0, -1680, 1296, -864, 1344], [0, -1680, 1344, -912, 1392], [0, -1680, 1392, -1488, 1440], [0, -1440, 1392, -1344, 1440], [0, -1296, 1392, -864, 1440], [0, -2448, 1440, -2352, 1488], [0, -2304, 1440, -1920, 1488], [0, -1872, 1440, -1776, 1488], [0, -1728, 1440, -1392, 1488], [0, -1296, 1440, -912, 1488], [0, -2448, 1488, -1296, 1536], [0, -1248, 1488, -912, 1536], [0, -2544, 1536, -1248, 1584], [0, -1200, 1536, -864, 1584], [0, -2544, 1584, -864, 1632], [0, -2544, 1632, -1248, 1680], [0, -1200, 1632, -864, 1680], [0, -2496, 1680, -2448, 1728], [0, -2400, 1680, -1776, 1728], [0, -2544, 1728, -1776, 1776], [0, -1680, 1680, -1200, 1776], [0, -1152, 1680, -864, 1776], [0, -2544, 1776, -912, 1824], [0, -2544, 1824, -2448, 1872], [0, -2400, 1824, -864, 1872], [0, -2544, 1872, -864, 1920], [0, -2544, 1920, -912, 2016], [0, -1536, 2016, -1488, 2064], [0, -1440, 2016, -864, 2064], [0, -2544, 2016, -1776, 2112], [0, -1392, 2064, -864, 2112], [0, -2544, 2112, -2208, 2160], [0, -2160, 2112, -1776, 2160], [0, -1344, 2112, -1104, 2160], [0, -1056, 2112, -960, 2160], [0, -2496, 2160, -2448, 2208], [0, -2400, 2160, -1824, 2208], [0, -2448, 2208, -1776, 2256], [0, -2400, 2256, -1776, 2304], [0, -1296, 2160, -864, 2304], [0, -2448, 2304, -1776, 2352], [0, -1296, 2304, -912, 2352], [0, -2400, 2352, -1776, 2400]] }, { id: "access_tunnel_zone", label: [0, -1104, 696], rects: [[0, -1104, -48, -864, 0], [0, -1056, 0, -864, 48], [0, -1104, 48, -864, 144], [0, -1056, 144, -864, 240], [0, -1104, 240, -864, 432], [0, -1056, 432, -864, 480], [0, -1344, 576, -1200, 624], [0, -1104, 480, -864, 624], [0, -1344, 624, -864, 768], [0, -1344, 768, -768, 816], [0, -1344, 816, -816, 864], [0, -1344, 864, -912, 912], [0, -1296, 912, -912, 960], [0, -1248, 960, -864, 1008], [0, -1200, 1008, -912, 1056]] }], doors: [{ kind: "door", cost: 750, at: [0, -866, 364], rooms: [15, 4] }, { kind: "door", cost: 1250, at: [0, -331, 990], rooms: [2, 8] }, { kind: "door", cost: 750, at: [0, -505, 704], rooms: [5, 3] }, { kind: "door", cost: 1e3, at: [0, -764, 941], rooms: [11, 2] }, { kind: "door", cost: 1250, at: [0, -336, 922], rooms: [3, 10] }, { kind: "door", cost: 1250, at: [0, 589, 1226], rooms: [1, 8] }, { kind: "door", cost: 1500, at: [0, 307, 1532], rooms: [8, 1] }, { kind: "door", cost: 1250, at: [0, 155, 1863], rooms: [9, 10] }, { kind: "door", cost: 1250, at: [0, -885, 1919], rooms: [10, 14] }, { kind: "door", cost: 1e3, at: [0, -951, -42], rooms: [15, 13] }, { kind: "door", cost: 1250, at: [0, 67, -694], rooms: [0, 12] }], pois: [{ kind: "perk", id: "specialty_quickrevive", at: [0, -184, 830] }, { kind: "perk", id: "specialty_fastreload", at: [0, 887, 1236] }, { kind: "perk", id: "specialty_longersprint", at: [0, 622, -122] }, { kind: "perk", id: "specialty_armorvest", at: [0, -65, 791] }, { kind: "perk", id: "specialty_flakjacket", at: [0, -2313, 2370] }, { kind: "perk", id: "specialty_additionalprimaryweapon", at: [0, 420, 1359] }, { kind: "pap", id: null, at: [0, 401, 388] }, { kind: "power", id: null, at: [0, -465, 914] }, { kind: "box", id: null, at: [0, 471, -1922] }, { kind: "box", id: null, at: [0, 1222, 1654] }, { kind: "box", id: null, at: [0, 675, -317] }, { kind: "box", id: null, at: [0, -468, 1477] }, { kind: "box", id: null, at: [0, -624, 588] }, { kind: "box", id: null, at: [0, -93, 1472] }, { kind: "box", id: null, at: [0, -2005, 2114] }, { kind: "box", id: null, at: [0, 1405, 1248] }] };

  // src/map/plans/cotd.json
  var cotd_default = { v: 1, slug: "cotd", sig: "z20d18c505889", floors: [{ name: "Ground floor", below: null }], rooms: [{ id: "catwalk_zone", label: [0, 312, 1392], rects: [[0, -48, 912, 0, 960], [0, 144, 912, 240, 960], [0, -192, 960, 240, 1008], [0, -96, 1008, 240, 1056], [0, 48, 1056, 240, 1104], [0, 0, 1104, 144, 1152], [0, 192, 1104, 336, 1152], [0, 0, 1152, 96, 1200], [0, 144, 1152, 336, 1200], [0, 192, 1200, 384, 1248], [0, -144, 1248, -96, 1296], [0, 0, 1248, 48, 1296], [0, 144, 1248, 192, 1296], [0, 288, 1248, 384, 1296], [0, -192, 1296, -144, 1344], [0, -96, 1296, -48, 1344], [0, -192, 1344, -96, 1392], [0, 144, 1344, 192, 1392], [0, -144, 1392, -96, 1440], [0, 0, 1296, 96, 1440], [0, -48, 1440, 0, 1488], [0, 48, 1440, 96, 1488], [0, 144, 1440, 192, 1488], [0, 240, 1296, 384, 1488], [0, 0, 1488, 48, 1536], [0, 96, 1488, 144, 1536], [0, 192, 1488, 384, 1536], [0, 192, 1536, 336, 1584], [0, 144, 1584, 336, 1632], [0, -144, 1632, -96, 1680], [0, -48, 1632, 0, 1680], [0, 48, 1536, 96, 1680], [0, 144, 1632, 288, 1680], [0, -96, 1680, 288, 1728], [0, -192, 1728, -144, 1776], [0, -96, 1728, 192, 1776]] }, { id: "lighthouse2_zone", label: [0, -24, 1128], rects: [[0, -144, 1104, -96, 1152], [0, -192, 1152, -144, 1200], [0, -48, 1056, 0, 1200], [0, 96, 1152, 144, 1200], [0, -240, 1200, -192, 1248], [0, -336, 1248, -288, 1296], [0, -96, 1248, 0, 1296], [0, 48, 1248, 96, 1296], [0, -144, 1296, -96, 1344], [0, 96, 1296, 192, 1344], [0, -336, 1344, -192, 1392], [0, 96, 1344, 144, 1392], [0, -336, 1392, -240, 1440], [0, -192, 1392, -144, 1440], [0, -144, 1440, -48, 1488], [0, -336, 1488, -240, 1536], [0, -144, 1488, 0, 1536], [0, 48, 1488, 96, 1536], [0, 144, 1488, 192, 1536], [0, -288, 1536, -240, 1584], [0, -144, 1536, -96, 1584], [0, -192, 1584, -48, 1632], [0, 0, 1584, 48, 1632]] }, { id: "beach_zone2", label: [0, -1896, 1968], rects: [[0, -1200, 1200, -864, 1248], [0, -1248, 1248, -864, 1344], [0, -1200, 1344, -816, 1392], [0, -1776, 1392, -1536, 1440], [0, -1488, 1392, -960, 1440], [0, -1824, 1440, -960, 1488], [0, -1776, 1488, -912, 1536], [0, -1776, 1536, -960, 1584], [0, -1824, 1584, -1536, 1632], [0, -1488, 1584, -1440, 1632], [0, -1392, 1584, -1248, 1632], [0, -1200, 1584, -1056, 1632], [0, -1776, 1632, -1584, 1680], [0, -2208, 1680, -2064, 1728], [0, -2208, 1728, -2016, 1776], [0, -1824, 1680, -1632, 1776], [0, -2160, 1776, -2016, 1824], [0, -1776, 1776, -1632, 1824], [0, -1824, 1824, -1632, 1872], [0, -2208, 1824, -1920, 1920], [0, -1776, 1872, -1632, 1920], [0, -2160, 1920, -1632, 2016], [0, -2112, 2016, -1680, 2064], [0, -2112, 2064, -1776, 2112], [0, -2064, 2112, -1776, 2160], [0, -1968, 2160, -1872, 2208]] }, { id: "residence_roof_zone", label: [0, -696, 1296], rects: [[0, -480, 576, -432, 624], [0, -624, 624, -576, 672], [0, -480, 624, -384, 672], [0, -624, 672, -528, 720], [0, -480, 672, -336, 720], [0, -912, 624, -720, 768], [0, -624, 720, -432, 768], [0, -912, 768, -288, 816], [0, -960, 816, -480, 864], [0, -960, 864, -768, 912], [0, -480, 864, -336, 912], [0, -912, 912, -720, 960], [0, -672, 912, -624, 960], [0, -576, 912, -528, 960], [0, -480, 912, -432, 960], [0, -336, 912, -288, 960], [0, -864, 960, -528, 1008], [0, -480, 960, -288, 1008], [0, -864, 1008, -720, 1056], [0, -672, 1008, -432, 1056], [0, -336, 1008, -288, 1056], [0, -720, 1056, -672, 1104], [0, -576, 1056, -336, 1104], [0, -864, 1056, -768, 1152], [0, -672, 1104, -432, 1152], [0, -384, 1104, -288, 1152], [0, -864, 1152, -528, 1200], [0, -480, 1152, -336, 1200], [0, -864, 1200, -384, 1248], [0, -864, 1248, -528, 1344], [0, -816, 1344, -768, 1392], [0, -672, 1344, -576, 1392]] }, { id: "residence1_zone", label: [0, -624, 888], rects: [[0, -384, 624, -336, 672], [0, -432, 720, -336, 768], [0, -480, 816, -288, 864], [0, -768, 864, -480, 912], [0, -336, 864, -288, 912], [0, -720, 912, -672, 960], [0, -624, 912, -576, 960], [0, -432, 912, -336, 960], [0, -528, 912, -480, 1008], [0, -720, 1008, -672, 1056], [0, -432, 1008, -336, 1056], [0, -768, 1056, -720, 1104], [0, -672, 1056, -576, 1104], [0, -768, 1104, -672, 1152], [0, -432, 1104, -384, 1152], [0, -528, 1152, -480, 1200]] }, { id: "shipback_level3_zone", label: [0, -600, -1080], rects: [[0, -576, -1152, -528, -1104], [0, -672, -1104, -528, -1056], [0, -720, -1008, -672, -960], [0, -672, -912, -576, -864], [0, -720, -864, -672, -816]] }, { id: "shipback_near2_zone", label: [0, -1080, -1104], rects: [[0, -1392, -1536, -1344, -1488], [0, -1296, -1536, -1200, -1488], [0, -1152, -1536, -1104, -1488], [0, -1296, -1488, -1248, -1440], [0, -1056, -1488, -1008, -1440], [0, -960, -1488, -912, -1440], [0, -1296, -1440, -960, -1392], [0, -912, -1440, -864, -1392], [0, -816, -1440, -528, -1392], [0, -1392, -1440, -1344, -1344], [0, -1296, -1392, -1200, -1344], [0, -1152, -1392, -864, -1344], [0, -768, -1392, -624, -1344], [0, -576, -1392, -528, -1344], [0, -480, -1440, -432, -1344], [0, -1152, -1344, -1056, -1296], [0, -1008, -1344, -960, -1296], [0, -912, -1344, -576, -1296], [0, -528, -1344, -432, -1296], [0, -1392, -1344, -1200, -1248], [0, -1152, -1296, -1104, -1248], [0, -1056, -1296, -864, -1248], [0, -816, -1296, -432, -1248], [0, -1440, -1248, -1008, -1200], [0, -912, -1248, -672, -1200], [0, -576, -1248, -432, -1200], [0, -1440, -1200, -864, -1152], [0, -624, -1200, -480, -1152], [0, -672, -1152, -576, -1104], [0, -1296, -1152, -864, -1056], [0, -768, -1104, -672, -1056], [0, -528, -1104, -480, -1056], [0, -1296, -1056, -912, -1008], [0, -768, -1056, -720, -1008], [0, -672, -1056, -624, -1008], [0, -1344, -1008, -912, -960], [0, -624, -1008, -528, -960], [0, -1488, -960, -912, -912], [0, -672, -960, -528, -912], [0, -1488, -912, -1440, -864], [0, -1344, -912, -912, -864], [0, -1488, -864, -912, -816], [0, -672, -864, -576, -816], [0, -1440, -816, -912, -768], [0, -864, -864, -816, -768], [0, -672, -816, -528, -768], [0, -1536, -768, -1440, -720], [0, -1296, -768, -1248, -720], [0, -1200, -768, -1152, -720], [0, -1104, -768, -912, -720], [0, -864, -768, -768, -720], [0, -720, -768, -528, -720], [0, -1536, -720, -1344, -672], [0, -1296, -720, -1200, -672], [0, -1104, -720, -1056, -672], [0, -912, -720, -528, -672], [0, -1392, -672, -1056, -624], [0, -768, -672, -720, -624], [0, -672, -672, -528, -624], [0, -1200, -624, -1152, -576], [0, -960, -624, -672, -576], [0, -624, -624, -528, -576], [0, -912, -576, -576, -528], [0, -768, -528, -576, -480]] }, { id: "shipback_far_zone", label: [0, -2256, -1152], rects: [[0, -2448, -1776, -1920, -1728], [0, -2592, -1728, -1872, -1680], [0, -2640, -1680, -1920, -1632], [0, -2688, -1632, -1920, -1584], [0, -2736, -1584, -2304, -1536], [0, -2208, -1584, -1872, -1536], [0, -2688, -1536, -2304, -1488], [0, -2256, -1536, -1920, -1488], [0, -2736, -1488, -2448, -1440], [0, -2304, -1488, -1920, -1392], [0, -1872, -1440, -1728, -1392], [0, -2736, -1440, -2496, -1344], [0, -2304, -1392, -1728, -1296], [0, -2784, -1344, -2496, -1248], [0, -2736, -1248, -2448, -1200], [0, -2400, -1296, -1728, -1200], [0, -2736, -1200, -1776, -1104], [0, -2688, -1104, -1776, -1056], [0, -2640, -1056, -1728, -1008], [0, -2592, -1008, -1728, -960], [0, -2496, -960, -1728, -912], [0, -2352, -912, -2304, -864], [0, -2256, -912, -1728, -864], [0, -2256, -864, -1776, -816], [0, -2064, -816, -1968, -768]] }, { id: "shipback_near_zone", label: [0, -1152, -1560], rects: [[0, -1872, -1728, -1728, -1680], [0, -1152, -1728, -1056, -1680], [0, -1920, -1680, -1584, -1632], [0, -1536, -1680, -1488, -1632], [0, -1200, -1680, -768, -1632], [0, -1920, -1632, -1248, -1584], [0, -1200, -1632, -576, -1584], [0, -1872, -1584, -432, -1536], [0, -1824, -1536, -1392, -1488], [0, -1344, -1536, -1296, -1488], [0, -1200, -1536, -1152, -1488], [0, -1104, -1536, -432, -1488], [0, -1728, -1488, -1296, -1440], [0, -1248, -1488, -1056, -1440], [0, -1008, -1488, -960, -1440], [0, -912, -1488, -432, -1440], [0, -1680, -1440, -1392, -1392], [0, -960, -1440, -912, -1392], [0, -864, -1440, -816, -1392], [0, -1344, -1440, -1296, -1344], [0, -864, -1392, -768, -1344], [0, -624, -1392, -576, -1344], [0, -528, -1440, -480, -1344], [0, -1632, -1392, -1392, -1296], [0, -1056, -1344, -1008, -1296], [0, -960, -1344, -912, -1296], [0, -576, -1344, -528, -1296], [0, -1680, -1296, -1392, -1248], [0, -1200, -1392, -1152, -1248], [0, -1104, -1296, -1056, -1248], [0, -864, -1296, -816, -1248], [0, -432, -1440, -336, -1248], [0, -1680, -1248, -1440, -1200], [0, -1008, -1248, -912, -1200], [0, -672, -1248, -576, -1200], [0, -1728, -1200, -1488, -1152], [0, -864, -1200, -624, -1152], [0, -864, -1152, -672, -1104], [0, -1728, -1152, -1440, -1056], [0, -864, -1104, -768, -1008], [0, -624, -1056, -576, -1008], [0, -1728, -1056, -1344, -960], [0, -864, -1008, -816, -960], [0, -912, -960, -816, -912], [0, -1728, -960, -1488, -864], [0, -1440, -912, -1344, -864], [0, -720, -960, -672, -864], [0, -1776, -864, -1488, -816], [0, -912, -864, -864, -816], [0, -816, -864, -768, -816], [0, -576, -912, -480, -816], [0, -1968, -816, -1440, -768], [0, -768, -816, -672, -768], [0, -1440, -768, -1296, -720], [0, -1248, -768, -1200, -720], [0, -1152, -768, -1104, -720], [0, -768, -768, -720, -720], [0, -1344, -720, -1296, -672], [0, -1200, -720, -1104, -672], [0, -1056, -720, -1008, -672], [0, -960, -720, -912, -672], [0, -2016, -768, -1536, -624], [0, -1008, -672, -960, -624], [0, -912, -672, -768, -624], [0, -720, -672, -672, -624], [0, -2016, -624, -1824, -576], [0, -1728, -624, -1536, -576], [0, -672, -624, -624, -576], [0, -2016, -576, -1776, -528], [0, -1968, -528, -1728, -480], [0, -1968, -480, -1776, -432], [0, -1968, -432, -1728, -384], [0, -2064, -384, -1776, -336], [0, -2112, -336, -1776, -288], [0, -2160, -288, -1776, -240], [0, -2160, -240, -1872, -192], [0, -2112, -192, -1968, -144], [0, -2064, -144, -2016, -96]] }, { id: "shipfront_storage_zone", label: [0, 1680, -2184], rects: [[0, 1392, -2640, 1440, -2592], [0, 1536, -2688, 1632, -2592], [0, 1296, -2592, 1344, -2544], [0, 1440, -2592, 1680, -2544], [0, 1248, -2544, 1440, -2496], [0, 1488, -2544, 1584, -2496], [0, 1632, -2544, 1680, -2496], [0, 1152, -2496, 1488, -2448], [0, 1536, -2496, 1728, -2448], [0, 1152, -2448, 1392, -2400], [0, 1536, -2448, 1776, -2400], [0, 1200, -2400, 1344, -2352], [0, 1440, -2400, 1824, -2352], [0, 1248, -2352, 1296, -2304], [0, 1392, -2352, 1584, -2304], [0, 1632, -2352, 1824, -2304], [0, 1296, -2304, 1584, -2256], [0, 1632, -2304, 1872, -2256], [0, 1200, -2256, 1248, -2208], [0, 1296, -2256, 1536, -2208], [0, 1584, -2256, 1920, -2208], [0, 1104, -2208, 1248, -2160], [0, 1296, -2208, 1344, -2160], [0, 1440, -2208, 1920, -2160], [0, 1056, -2160, 1248, -2112], [0, 1488, -2160, 1824, -2112], [0, 960, -2112, 1344, -2064], [0, 1488, -2112, 1776, -2064], [0, 1872, -2160, 1968, -2064], [0, 1008, -2064, 1344, -2016], [0, 1440, -2064, 1536, -2016], [0, 1584, -2064, 1728, -2016], [0, 1824, -2064, 1872, -2016], [0, 1008, -2016, 1056, -1968], [0, 1152, -2016, 1344, -1968], [0, 1536, -2016, 1680, -1968], [0, 1152, -1968, 1392, -1920], [0, 1440, -1968, 1488, -1920], [0, 1200, -1920, 1344, -1872], [0, 1392, -1920, 1440, -1872], [0, 1536, -1968, 1584, -1872], [0, 1200, -1872, 1392, -1824], [0, 1488, -1872, 1536, -1824], [0, 1248, -1824, 1344, -1776], [0, 1536, -1824, 1632, -1776], [0, 1392, -1824, 1440, -1728], [0, 1488, -1776, 1632, -1728], [0, 1440, -1728, 1584, -1680], [0, 1488, -1680, 1584, -1632]] }, { id: "beach_zone", label: [0, -1896, 768], rects: [[0, -2496, -288, -2352, -240], [0, -2208, -240, -2160, -192], [0, -2544, -240, -2352, -144], [0, -2256, -192, -2112, -144], [0, -2544, -144, -2064, -96], [0, -1488, -144, -1200, -96], [0, -1008, -144, -864, -96], [0, -2544, -96, -2016, -48], [0, -1488, -96, -1152, -48], [0, -1056, -96, -816, -48], [0, -2592, -48, -1968, 0], [0, -1536, -48, -816, 0], [0, -2640, 0, -1872, 48], [0, -1632, 0, -816, 48], [0, -2304, 48, -1776, 96], [0, -1632, 48, -1440, 96], [0, -1392, 48, -1056, 96], [0, -1008, 48, -816, 96], [0, -2640, 48, -2400, 144], [0, -2160, 96, -1728, 144], [0, -1680, 96, -768, 144], [0, -2688, 144, -2448, 192], [0, -2064, 144, -768, 192], [0, -2016, 192, -816, 240], [0, -2688, 192, -2496, 288], [0, -1920, 240, -816, 288], [0, -2688, 288, -2448, 336], [0, -1872, 288, -816, 336], [0, -2688, 336, -2496, 384], [0, -1872, 336, -1008, 384], [0, -2688, 384, -2448, 432], [0, -1776, 384, -1008, 432], [0, -1776, 432, -1056, 480], [0, -2688, 432, -2496, 528], [0, -2064, 480, -1872, 528], [0, -1728, 480, -1056, 528], [0, -2688, 528, -2400, 576], [0, -2688, 576, -2352, 624], [0, -2064, 528, -1008, 624], [0, -2736, 624, -2256, 672], [0, -2208, 624, -2112, 672], [0, -1968, 624, -1056, 672], [0, -2736, 672, -2064, 720], [0, -1968, 672, -1104, 720], [0, -2688, 720, -1104, 816], [0, -2688, 816, -1152, 864], [0, -2640, 864, -1104, 912], [0, -2448, 912, -1104, 960], [0, -2448, 960, -1728, 1008], [0, -1680, 960, -1104, 1008], [0, -2352, 1008, -1920, 1056], [0, -1872, 1008, -1200, 1056], [0, -2352, 1056, -2112, 1104], [0, -1776, 1056, -1200, 1104], [0, -1776, 1104, -1680, 1152], [0, -2304, 1104, -2064, 1200], [0, -1632, 1104, -1200, 1200], [0, -2352, 1200, -2064, 1248], [0, -1536, 1200, -1200, 1248], [0, -2304, 1248, -2064, 1344], [0, -2352, 1344, -2064, 1392], [0, -2304, 1392, -2016, 1488], [0, -2352, 1488, -2016, 1536], [0, -2304, 1536, -2016, 1584], [0, -2256, 1584, -2016, 1632], [0, -2208, 1632, -2112, 1680]] }, { id: "shipfront_2_beach_zone", label: [0, -1320, -192], rects: [[0, -240, -1296, -144, -1248], [0, -432, -1248, -96, -1200], [0, -480, -1200, -48, -1152], [0, -528, -1152, -144, -1104], [0, -480, -1104, -240, -1056], [0, -720, -1056, -672, -1008], [0, -576, -1056, -336, -1008], [0, -672, -1008, -624, -960], [0, -528, -1008, -432, -960], [0, -816, -1008, -720, -912], [0, -912, -912, -720, -864], [0, -768, -864, -720, -816], [0, -816, -816, -768, -768], [0, -912, -816, -864, -720], [0, -1008, -720, -960, -672], [0, -1056, -672, -1008, -624], [0, -960, -672, -912, -624], [0, -1152, -624, -960, -576], [0, -1200, -576, -912, -528], [0, -1248, -528, -960, -480], [0, -1296, -480, -1008, -432], [0, -1344, -432, -1056, -384], [0, -1392, -384, -1104, -336], [0, -1392, -336, -1152, -288], [0, -1440, -288, -1152, -240], [0, -1440, -240, -1200, -144]] }, { id: "shipfront_far_zone", label: [0, 2040, -2808], rects: [[0, 2160, -2976, 2304, -2928], [0, 2400, -2976, 2496, -2928], [0, 1824, -2928, 2016, -2880], [0, 2064, -2928, 2496, -2880], [0, 1776, -2880, 2496, -2832], [0, 1632, -2832, 2448, -2784], [0, 1584, -2784, 1872, -2736], [0, 1968, -2784, 2448, -2736], [0, 1488, -2736, 1920, -2688], [0, 2064, -2736, 2496, -2688], [0, 1392, -2688, 1536, -2640], [0, 1344, -2640, 1392, -2592], [0, 1440, -2640, 1536, -2592], [0, 1632, -2688, 1968, -2592], [0, 2160, -2688, 2496, -2592], [0, 1344, -2592, 1440, -2544], [0, 1680, -2592, 2016, -2544], [0, 2160, -2592, 2400, -2544], [0, 1440, -2544, 1488, -2496], [0, 1584, -2544, 1632, -2496], [0, 1680, -2544, 2400, -2496], [0, 1488, -2496, 1536, -2448], [0, 1728, -2496, 2352, -2448], [0, 1392, -2448, 1536, -2400], [0, 1776, -2448, 2352, -2400], [0, 1008, -2400, 1200, -2352], [0, 1344, -2400, 1440, -2352], [0, 1824, -2400, 2304, -2352], [0, 960, -2352, 1248, -2304], [0, 1296, -2352, 1392, -2304], [0, 1824, -2352, 2256, -2304], [0, 864, -2304, 1296, -2256], [0, 1872, -2304, 2256, -2256], [0, 864, -2256, 1200, -2208], [0, 1920, -2256, 2208, -2208], [0, 864, -2208, 1104, -2160], [0, 1248, -2256, 1296, -2160], [0, 1344, -2208, 1440, -2160], [0, 1920, -2208, 2160, -2160], [0, 912, -2160, 1056, -2112], [0, 1248, -2160, 1488, -2112], [0, 1824, -2160, 1872, -2112], [0, 1968, -2160, 2112, -2112], [0, 1344, -2112, 1488, -2064], [0, 1776, -2112, 1872, -2064], [0, 1968, -2112, 2064, -2064], [0, 1344, -2064, 1440, -2016], [0, 1536, -2064, 1584, -2016], [0, 1728, -2064, 1824, -2016], [0, 1872, -2064, 1968, -2016], [0, 1056, -2016, 1152, -1968], [0, 1344, -2016, 1536, -1968], [0, 1680, -2016, 1968, -1968], [0, 1008, -1968, 1152, -1920], [0, 1392, -1968, 1440, -1920], [0, 1488, -1968, 1536, -1920], [0, 960, -1920, 1200, -1872], [0, 1344, -1920, 1392, -1872], [0, 1440, -1920, 1536, -1872], [0, 1584, -1968, 1872, -1872], [0, 1008, -1872, 1200, -1824], [0, 1392, -1872, 1488, -1824], [0, 1536, -1872, 1824, -1824], [0, 1056, -1824, 1248, -1776], [0, 1344, -1824, 1392, -1776], [0, 1440, -1824, 1536, -1776], [0, 1104, -1776, 1392, -1728], [0, 1440, -1776, 1488, -1728], [0, 1632, -1824, 1776, -1728], [0, 1104, -1728, 1440, -1680], [0, 1584, -1728, 1776, -1680], [0, 1680, -1680, 1728, -1632], [0, 1152, -1680, 1488, -1584], [0, 912, -1584, 960, -1536], [0, 1008, -1584, 1488, -1536], [0, 864, -1536, 1392, -1488], [0, 768, -1488, 1344, -1440], [0, 768, -1440, 1296, -1392], [0, 816, -1392, 1200, -1344], [0, 864, -1344, 1104, -1296], [0, 912, -1296, 1104, -1248], [0, 912, -1248, 1008, -1200]] }, { id: "shipfront_near_zone", label: [0, 720, -1776], rects: [[0, 528, -2064, 672, -1968], [0, 384, -1968, 576, -1920], [0, 624, -1968, 672, -1920], [0, 384, -1920, 528, -1872], [0, 336, -1872, 480, -1824], [0, 288, -1824, 336, -1776], [0, 384, -1824, 432, -1776], [0, 336, -1776, 384, -1728], [0, 432, -1776, 528, -1728], [0, 624, -1824, 816, -1728], [0, 192, -1776, 288, -1680], [0, 384, -1728, 432, -1680], [0, 672, -1728, 816, -1680], [0, 48, -1728, 144, -1632], [0, 336, -1680, 480, -1632], [0, 0, -1632, 96, -1584], [0, 192, -1632, 240, -1584], [0, 432, -1632, 480, -1584], [0, -96, -1584, 0, -1536], [0, 48, -1584, 96, -1536], [0, 384, -1584, 432, -1536], [0, 480, -1584, 528, -1536], [0, -144, -1536, 96, -1488], [0, 432, -1536, 480, -1488], [0, 528, -1536, 576, -1488], [0, -192, -1488, -96, -1440], [0, -336, -1440, -192, -1392], [0, -96, -1440, 0, -1392], [0, 480, -1488, 528, -1392], [0, 576, -1440, 624, -1392], [0, -336, -1392, 0, -1344], [0, 528, -1392, 576, -1344], [0, 624, -1392, 672, -1344], [0, 768, -1392, 816, -1344], [0, -336, -1344, 48, -1296], [0, 624, -1344, 864, -1296], [0, -336, -1296, -240, -1248], [0, -144, -1296, -96, -1248], [0, -48, -1296, 48, -1248], [0, 672, -1296, 720, -1248], [0, 768, -1296, 816, -1248], [0, 48, -1248, 96, -1200], [0, 624, -1248, 720, -1200], [0, 864, -1248, 912, -1200], [0, 0, -1200, 48, -1152], [0, 96, -1200, 144, -1152], [0, 528, -1200, 624, -1152], [0, 768, -1200, 960, -1152], [0, 0, -1152, 144, -1104], [0, 528, -1152, 864, -1104], [0, 144, -1104, 192, -1056], [0, 576, -1104, 624, -1056], [0, 672, -1104, 816, -1056], [0, 48, -1056, 96, -1008], [0, 576, -1056, 768, -1008], [0, 192, -1056, 240, -960], [0, 336, -1056, 384, -960], [0, 432, -1008, 720, -960], [0, 144, -960, 192, -912], [0, 240, -960, 336, -912], [0, 480, -960, 672, -912], [0, 288, -912, 336, -864], [0, 432, -912, 624, -864], [0, 288, -864, 480, -768], [0, 288, -768, 384, -720]] }, { id: "shipfront_bottom_zone", label: [0, -24, -360], rects: [[0, 816, -2160, 912, -2112], [0, 720, -2112, 960, -2064], [0, 576, -1968, 624, -1920], [0, 672, -2064, 1008, -1920], [0, 528, -1920, 960, -1872], [0, 480, -1872, 864, -1824], [0, 336, -1824, 384, -1776], [0, 432, -1824, 624, -1776], [0, 288, -1776, 336, -1728], [0, 384, -1776, 432, -1728], [0, 144, -1728, 192, -1680], [0, 288, -1728, 384, -1680], [0, 432, -1728, 624, -1680], [0, 144, -1680, 336, -1632], [0, 480, -1680, 624, -1632], [0, 96, -1632, 192, -1584], [0, 240, -1632, 432, -1584], [0, 480, -1632, 672, -1584], [0, 0, -1584, 48, -1536], [0, 96, -1584, 384, -1536], [0, 432, -1584, 480, -1536], [0, 528, -1584, 720, -1536], [0, 96, -1536, 432, -1488], [0, 480, -1536, 528, -1488], [0, 576, -1536, 768, -1488], [0, -96, -1488, 480, -1440], [0, 528, -1488, 768, -1440], [0, -192, -1440, -96, -1392], [0, 0, -1440, 480, -1392], [0, 528, -1440, 576, -1392], [0, 624, -1440, 768, -1392], [0, 0, -1392, 528, -1344], [0, 576, -1392, 624, -1344], [0, 672, -1392, 768, -1344], [0, 48, -1344, 624, -1296], [0, -96, -1296, -48, -1248], [0, 48, -1296, 672, -1248], [0, 720, -1296, 768, -1248], [0, 816, -1296, 912, -1248], [0, -96, -1248, 48, -1200], [0, 96, -1248, 624, -1200], [0, 720, -1248, 864, -1200], [0, 48, -1200, 96, -1152], [0, 624, -1200, 768, -1152], [0, -48, -1200, 0, -1104], [0, 144, -1200, 528, -1104], [0, 0, -1104, 144, -1056], [0, 192, -1104, 576, -1056], [0, 624, -1104, 672, -1056], [0, 96, -1056, 192, -1008], [0, 384, -1056, 576, -1008], [0, 48, -1008, 192, -960], [0, 240, -1056, 336, -960], [0, 384, -1008, 432, -960], [0, 96, -960, 144, -912], [0, 192, -960, 240, -912], [0, 336, -960, 480, -912], [0, 144, -912, 288, -864], [0, 336, -912, 432, -864], [0, 96, -864, 288, -768], [0, 48, -768, 288, -720], [0, 48, -720, 336, -672], [0, 0, -672, 240, -624], [0, -48, -624, 240, -576], [0, -96, -576, 192, -480], [0, -144, -480, 96, -240], [0, -96, -240, 144, -144], [0, -48, -144, 192, -48], [0, 0, -48, 240, 0], [0, 0, 0, 144, 48], [0, 48, 48, 96, 96]] }, { id: "start_beach_zone", label: [0, 1824, 1056], rects: [[0, 1824, 0, 1968, 48], [0, 1824, 48, 2016, 96], [0, 1152, 96, 1296, 144], [0, 1344, 96, 1488, 144], [0, 1824, 96, 2112, 144], [0, 1152, 144, 1680, 192], [0, 1824, 144, 2160, 192], [0, 912, 192, 1728, 240], [0, 1824, 192, 2208, 240], [0, 912, 240, 1392, 288], [0, 1440, 240, 1728, 288], [0, 1776, 240, 2400, 288], [0, 864, 288, 1248, 336], [0, 1296, 288, 2400, 336], [0, 864, 336, 2400, 384], [0, 864, 384, 2160, 432], [0, 2208, 384, 2400, 432], [0, 1200, 432, 1488, 480], [0, 1584, 432, 2496, 480], [0, 1248, 480, 1440, 528], [0, 1680, 480, 1824, 528], [0, 1872, 480, 2496, 528], [0, 1200, 528, 1440, 576], [0, 1680, 528, 2544, 576], [0, 1680, 576, 1824, 624], [0, 1872, 576, 2544, 624], [0, 1248, 576, 1488, 672], [0, 1680, 624, 1872, 672], [0, 1920, 624, 2592, 672], [0, 1296, 672, 1584, 720], [0, 1680, 672, 2592, 720], [0, 1248, 720, 2592, 768], [0, 1248, 768, 1824, 816], [0, 1296, 816, 1584, 864], [0, 1632, 816, 1824, 864], [0, 1872, 768, 2592, 864], [0, 1392, 864, 1584, 912], [0, 1632, 864, 2592, 912], [0, 1344, 912, 2544, 960], [0, 1344, 960, 1488, 1008], [0, 1536, 960, 2496, 1008], [0, 1200, 1008, 2448, 1104], [0, 1200, 1104, 1968, 1152], [0, 2016, 1104, 2400, 1152], [0, 1296, 1152, 1872, 1200], [0, 2064, 1152, 2304, 1200], [0, 1392, 1200, 1728, 1248], [0, 2160, 1200, 2256, 1248], [0, 1344, 1248, 1632, 1344], [0, 1344, 1344, 1584, 1440], [0, 1296, 1440, 1536, 1488], [0, 1248, 1488, 1488, 1536], [0, 1248, 1536, 1440, 1584], [0, 1200, 1584, 1440, 1632], [0, 1200, 1632, 1392, 1680], [0, 1104, 1680, 1392, 1728], [0, 1056, 1728, 1344, 1776], [0, 1008, 1776, 1344, 1824], [0, 1008, 1824, 1296, 1872], [0, 1056, 1872, 1248, 1920], [0, 1152, 1920, 1200, 1968]] }, { id: "rear_lagoon_zone", label: [0, 96, 3696], rects: [[0, -336, 2304, -96, 2496], [0, -384, 2496, -96, 2592], [0, -432, 2592, -48, 2640], [0, -432, 2640, 0, 2736], [0, -480, 2736, 0, 2784], [0, -432, 2784, 0, 2832], [0, -384, 2832, -48, 2880], [0, -432, 2880, -144, 2928], [0, -432, 2928, -96, 2976], [0, -480, 2976, -144, 3120], [0, -528, 3120, -144, 3264], [0, 192, 3216, 432, 3264], [0, -528, 3264, 48, 3312], [0, 192, 3264, 480, 3312], [0, 528, 3264, 576, 3312], [0, -480, 3312, 624, 3360], [0, -480, 3360, -288, 3408], [0, -192, 3360, 624, 3408], [0, -480, 3408, -96, 3456], [0, -48, 3408, 576, 3456], [0, -480, 3456, 576, 3504], [0, -432, 3504, -384, 3552], [0, -336, 3504, -288, 3552], [0, -240, 3504, 576, 3552], [0, -480, 3552, 288, 3600], [0, 336, 3552, 480, 3600], [0, -480, 3600, 528, 3648], [0, -480, 3648, -384, 3696], [0, -336, 3648, 528, 3744], [0, -240, 3744, 528, 3792], [0, -192, 3792, 528, 3840], [0, 48, 3840, 528, 3888], [0, 192, 3888, 480, 3936], [0, 240, 3936, 480, 3984], [0, 288, 3984, 480, 4032]] }, { id: "start_cave_zone", label: [0, 288, 2088], rects: [[0, -144, 1728, -96, 1776], [0, -336, 1776, 48, 1824], [0, 960, 1824, 1008, 1872], [0, -384, 1824, 48, 1920], [0, 912, 1872, 1056, 1920], [0, 816, 1920, 1152, 1968], [0, -432, 1920, 48, 2016], [0, 672, 1968, 1152, 2016], [0, -432, 2016, 288, 2064], [0, 336, 2016, 384, 2064], [0, 432, 2016, 1056, 2064], [0, -432, 2064, 1008, 2112], [0, -384, 2112, 912, 2160], [0, -288, 2160, 768, 2208], [0, -288, 2208, 528, 2256], [0, 576, 2208, 672, 2256], [0, -288, 2256, 48, 2304], [0, -48, 2304, 0, 2352]] }, { id: "lighthouse1_zone", label: [0, 0, 1224], rects: [[0, -240, 1008, -96, 1056], [0, -336, 1056, -48, 1104], [0, 0, 1056, 48, 1104], [0, -288, 1104, -144, 1152], [0, -96, 1104, -48, 1152], [0, 144, 1104, 192, 1152], [0, -336, 1152, -192, 1200], [0, -144, 1152, -48, 1200], [0, -384, 1200, -240, 1248], [0, -192, 1200, 192, 1248], [0, -432, 1248, -336, 1296], [0, -288, 1248, -144, 1296], [0, 96, 1248, 144, 1296], [0, 192, 1248, 288, 1296], [0, -432, 1296, -192, 1344], [0, -48, 1296, 0, 1344], [0, 192, 1296, 240, 1392], [0, -432, 1344, -336, 1440], [0, -240, 1392, -192, 1440], [0, -96, 1344, 0, 1440], [0, 96, 1392, 240, 1440], [0, -432, 1440, -144, 1488], [0, 0, 1440, 48, 1488], [0, 96, 1440, 144, 1488], [0, 192, 1440, 240, 1488], [0, -432, 1488, -336, 1536], [0, -432, 1536, -288, 1584], [0, -240, 1488, -144, 1584], [0, -96, 1536, 48, 1584], [0, 96, 1536, 192, 1584], [0, -432, 1584, -192, 1632], [0, -48, 1584, 0, 1632], [0, -384, 1632, -144, 1680], [0, -96, 1632, -48, 1680], [0, 0, 1632, 48, 1680], [0, 96, 1584, 144, 1680], [0, -240, 1680, -96, 1728]] }, { id: "start_zone", label: [0, 216, 528], rects: [[0, 912, -432, 1056, -384], [0, 624, -384, 1104, -288], [0, 576, -288, 1152, -240], [0, 528, -240, 1152, -192], [0, 528, -192, 1200, -144], [0, 480, -144, 1200, -48], [0, 528, -48, 960, 0], [0, 144, 0, 288, 48], [0, 576, 0, 864, 48], [0, 96, 48, 288, 96], [0, 576, 48, 720, 96], [0, 768, 48, 864, 96], [0, 96, 96, 336, 144], [0, 528, 96, 864, 144], [0, -336, 144, -240, 192], [0, 144, 144, 336, 192], [0, 432, 144, 864, 192], [0, -432, 192, -240, 240], [0, -528, 240, -192, 288], [0, 144, 192, 912, 288], [0, -768, 288, 864, 336], [0, -1008, 336, 864, 384], [0, -1008, 384, -384, 432], [0, -336, 384, 864, 432], [0, -1056, 432, -528, 480], [0, -1056, 480, -624, 528], [0, -768, 528, -624, 624], [0, -336, 432, 768, 624], [0, -576, 576, -480, 672], [0, -336, 624, 240, 672], [0, 288, 624, 720, 672], [0, -528, 672, -480, 720], [0, 480, 672, 576, 720], [0, -720, 624, -624, 768], [0, -336, 672, 192, 768], [0, -288, 768, 192, 912], [0, -192, 912, -48, 960], [0, 0, 912, 144, 960], [0, 240, 960, 336, 1104]] }], doors: [{ kind: "door", cost: 1e3, at: [0, -111, 999], rooms: [18, 19] }, { kind: "door", cost: 1e3, at: [0, -459, 711], rooms: [19, 4] }, { kind: "door", cost: 1e3, at: [0, -112, 1723], rooms: [17, 18] }, { kind: "door", cost: 1e3, at: [0, -322, 1167], rooms: [3, 1] }, { kind: "door", cost: 1e3, at: [0, 1189, -2365], rooms: [12, 9] }, { kind: "door", cost: 1e3, at: [0, 999, -2023], rooms: [14, 9] }, { kind: "door", cost: 1e3, at: [0, 861, -1327], rooms: [12, 13] }, { kind: "door", cost: 750, at: [0, -602, -1152], rooms: [6, 5] }, { kind: "door", cost: 750, at: [0, -679, -787], rooms: [5, 6] }, { kind: "door", cost: 1e3, at: [0, -369, 1128], rooms: [4, 18] }, { kind: "debris", cost: 1e3, at: [0, -355, -1335], rooms: [8, 13] }, { kind: "debris", cost: 750, at: [0, -146, 1309], rooms: [1, 18] }, { kind: "debris", cost: 750, at: [0, -2084, -193], rooms: [8, 10] }, { kind: "debris", cost: 750, at: [0, 137, 31], rooms: [14, 19] }, { kind: "debris", cost: 1e3, at: [0, -1738, -933], rooms: [7, 8] }, { kind: "debris", cost: 750, at: [0, 8, 1409], rooms: [0, 1] }, { kind: "debris", cost: 750, at: [0, -2144, 1714], rooms: [2, 10] }, { kind: "debris", cost: 1250, at: [0, -1393, -1273], rooms: [6, 8] }], pois: [{ kind: "perk", id: "specialty_rof", at: [0, -2535, -1447] }, { kind: "perk", id: "specialty_armorvest", at: [0, 1526, -2651] }, { kind: "perk", id: "specialty_fastreload", at: [0, 1260, 1567] }, { kind: "perk", id: "specialty_deadshot", at: [0, 15, 1064] }, { kind: "perk", id: "specialty_longersprint", at: [0, 306, 3546] }, { kind: "perk", id: "specialty_flakjacket", at: [0, -344, 874] }, { kind: "perk", id: "specialty_quickrevive", at: [0, -1055, 545] }, { kind: "perk", id: "specialty_additionalprimaryweapon", at: [0, 2424, -2884] }, { kind: "pap", id: null, at: [0, 1086, -347] }, { kind: "power", id: null, at: [0, -706, -959] }, { kind: "box", id: null, at: [0, 2222, -2718] }, { kind: "box", id: null, at: [0, -551, -958] }, { kind: "box", id: null, at: [0, -78, 2827] }, { kind: "box", id: null, at: [0, 138, 1609] }, { kind: "box", id: null, at: [0, -2054, 700] }, { kind: "box", id: null, at: [0, -665, 809] }] };

  // src/map/plans/five.json
  var five_default = { v: 1, slug: "five", sig: "z14d13c466572", floors: [{ name: "Labs", below: -560 }, { name: "War room", below: -250 }, { name: "Top floor", below: null }], rooms: [{ id: "labs_zone3", label: [0, -1200, 3720], rects: [[0, -1344, 3312, -1248, 3360], [0, -1488, 3360, -1200, 3408], [0, -1488, 3408, -1152, 3456], [0, -1488, 3456, -1200, 3504], [0, -1488, 3504, -1104, 3552], [0, -1008, 3504, -912, 3552], [0, -1536, 3552, -1104, 3648], [0, -1056, 3552, -864, 3648], [0, -1488, 3648, -912, 3792], [0, -1488, 3792, -960, 3840], [0, -1344, 3840, -1200, 3888]] }, { id: "labs_zone2", label: [0, -384, 4776], rects: [[0, -624, 4032, -480, 4080], [0, -672, 4080, -432, 4128], [0, -720, 4128, -432, 4224], [0, -720, 4224, -336, 4272], [0, -720, 4272, -96, 4320], [0, -720, 4320, -48, 4368], [0, -720, 4368, -96, 4416], [0, -720, 4416, -48, 4464], [0, -720, 4464, 0, 4560], [0, -672, 4560, -48, 4608], [0, -672, 4608, -96, 4656], [0, -720, 4656, -96, 4704], [0, -720, 4704, -48, 4848], [0, -672, 4848, -480, 4896], [0, -432, 4848, -336, 4896], [0, -288, 4848, -48, 4896], [0, -672, 4896, -576, 4944], [0, -384, 4896, -48, 4944], [0, -432, 4944, -48, 5040], [0, -384, 5040, -48, 5088]] }, { id: "labs_zone1", label: [0, -1200, 4992], rects: [[0, -1392, 4416, -1200, 4464], [0, -1152, 4416, -912, 4464], [0, -1392, 4464, -912, 4512], [0, -1440, 4512, -864, 4608], [0, -1344, 4608, -912, 4704], [0, -1296, 4704, -864, 4752], [0, -1344, 4752, -864, 4800], [0, -1296, 4800, -864, 4848], [0, -1488, 4848, -864, 4896], [0, -1488, 4896, -912, 4944], [0, -1536, 4944, -864, 5040], [0, -1488, 5040, -864, 5088]] }, { id: "labs_hallway2", label: [0, -1608, 4728], rects: [[0, -960, 4224, -912, 4272], [0, -1728, 4272, -864, 4320], [0, -1728, 4320, -720, 4416], [0, -1728, 4416, -1392, 4464], [0, -1200, 4416, -1152, 4464], [0, -1728, 4464, -1536, 4512], [0, -912, 4416, -720, 4512], [0, -864, 4512, -720, 4608], [0, -912, 4608, -672, 4656], [0, -912, 4656, -720, 4704], [0, -864, 4704, -720, 4848], [0, -864, 4848, -672, 4896], [0, -1728, 4512, -1488, 4944], [0, -912, 4896, -672, 4944], [0, -1728, 4944, -1536, 5040], [0, -864, 4944, -672, 5040], [0, -1728, 5040, -1488, 5088], [0, -864, 5040, -720, 5088], [0, -1728, 5088, -1248, 5136], [0, -1152, 5088, -960, 5136], [0, -912, 5088, -864, 5136], [0, -816, 5088, -768, 5136], [0, -720, 5088, -528, 5136], [0, -480, 5088, -384, 5136], [0, -1728, 5136, -384, 5184], [0, -336, 5136, -288, 5184], [0, -1728, 5184, -240, 5232], [0, -1680, 5232, -240, 5280], [0, -1728, 5280, -288, 5328], [0, -1680, 5328, -1584, 5376], [0, -1536, 5328, -1248, 5376], [0, -1200, 5328, -1152, 5376], [0, -1104, 5328, -1056, 5376], [0, -1008, 5328, -960, 5376], [0, -912, 5328, -864, 5376], [0, -816, 5328, -768, 5376], [0, -720, 5328, -384, 5376]] }, { id: "labs_hallway1", label: [0, -984, 3960], rects: [[0, -1632, 3312, -1536, 3360], [0, -1680, 3360, -1488, 3408], [0, -912, 3216, -672, 3456], [0, -1728, 3408, -1488, 3552], [0, -912, 3456, -624, 3552], [0, -864, 3552, -672, 3648], [0, -1728, 3552, -1536, 3696], [0, -912, 3648, -720, 3792], [0, -1728, 3696, -1488, 3840], [0, -960, 3792, -720, 3840], [0, -1728, 3840, -1344, 3888], [0, -1056, 3840, -288, 3888], [0, -1728, 3888, -240, 4032], [0, -1728, 4032, -624, 4080], [0, -480, 4032, -336, 4080], [0, -1680, 4080, -720, 4224], [0, -1680, 4224, -1536, 4272], [0, -1488, 4224, -960, 4272], [0, -912, 4224, -720, 4272], [0, -864, 4272, -720, 4320]] }, { id: "labs_elevator", label: [0, -792, 3048], rects: [[0, -960, 2880, -624, 3216]] }, { id: "war_room_zone_elevator", label: [1, -792, 3072], rects: [[1, -960, 2880, -672, 2928], [1, -960, 2928, -624, 3216], [1, -912, 3216, -864, 3264], [1, -816, 3216, -768, 3264], [1, -720, 3216, -672, 3264]] }, { id: "war_room_zone_top", label: [1, -1464, 2064], rects: [[1, -720, 1248, -672, 1296], [1, -768, 1296, -624, 1392], [1, -816, 1392, -624, 1440], [1, -1152, 1440, -1008, 1488], [1, -912, 1440, -864, 1488], [1, -720, 1440, -624, 1488], [1, -576, 1440, -528, 1488], [1, -1296, 1488, -1008, 1536], [1, -960, 1488, -912, 1536], [1, -864, 1488, -816, 1536], [1, -624, 1488, -480, 1536], [1, -1392, 1536, -1104, 1584], [1, -1056, 1536, -960, 1584], [1, -1440, 1584, -1200, 1632], [1, -1152, 1584, -1104, 1632], [1, -528, 1536, -432, 1632], [1, -1440, 1632, -1392, 1680], [1, -1248, 1632, -1200, 1680], [1, -480, 1632, -432, 1680], [1, -1440, 1680, -1296, 1728], [1, -432, 1680, -336, 1728], [1, -1440, 1728, -1200, 1776], [1, -432, 1728, -288, 1776], [1, -1488, 1776, -1392, 1824], [1, -336, 1776, -288, 1824], [1, -1488, 1824, -1200, 1872], [1, -336, 1824, -240, 1872], [1, -1440, 1872, -1344, 1920], [1, -1296, 1872, -1248, 1920], [1, -336, 1872, -192, 1920], [1, -1728, 1920, -1392, 1968], [1, -1344, 1920, -1200, 1968], [1, -288, 1920, -144, 1968], [1, -240, 1968, -144, 2016], [1, -240, 2016, -96, 2064], [1, -1728, 1968, -1200, 2160], [1, -288, 2064, -48, 2160], [1, -1296, 2160, -1248, 2208], [1, -336, 2160, -96, 2208], [1, -1440, 2208, -1296, 2256], [1, -1248, 2208, -1200, 2256], [1, -384, 2208, -192, 2256], [1, -1344, 2256, -1200, 2304], [1, -384, 2256, -288, 2304], [1, -1344, 2304, -1296, 2352], [1, -432, 2304, -288, 2352], [1, -1392, 2352, -1248, 2400], [1, -480, 2352, -432, 2400], [1, -1392, 2400, -1296, 2448], [1, -1248, 2400, -1200, 2448], [1, -1392, 2448, -1152, 2496], [1, -528, 2400, -432, 2496], [1, -1248, 2496, -1008, 2544], [1, -960, 2496, -864, 2544], [1, -1152, 2544, -864, 2592], [1, -816, 2544, -768, 2592], [1, -720, 2544, -672, 2592], [1, -576, 2496, -432, 2592], [1, -1104, 2592, -480, 2640], [1, -720, 2640, -528, 2688], [1, -768, 2688, -576, 2736], [1, -720, 2736, -624, 2784]] }, { id: "war_room_zone_north", label: [1, -864, 2328], rects: [[1, -1200, 1968, -1152, 2016], [1, -480, 2016, -384, 2064], [1, -1200, 2016, -1104, 2112], [1, -576, 2064, -288, 2112], [1, -1200, 2112, -1056, 2160], [1, -624, 2112, -288, 2160], [1, -1440, 2160, -1296, 2208], [1, -1248, 2160, -1056, 2208], [1, -624, 2160, -336, 2208], [1, -1296, 2208, -1248, 2256], [1, -1200, 2208, -1104, 2256], [1, -1008, 2160, -768, 2256], [1, -720, 2208, -384, 2256], [1, -1488, 2256, -1344, 2304], [1, -1200, 2256, -1008, 2304], [1, -960, 2256, -384, 2304], [1, -1536, 2304, -1344, 2352], [1, -1296, 2304, -432, 2352], [1, -1536, 2352, -1392, 2400], [1, -1248, 2352, -480, 2400], [1, -432, 2352, -288, 2400], [1, -1488, 2400, -1440, 2448], [1, -1296, 2400, -1248, 2448], [1, -1200, 2400, -672, 2448], [1, -624, 2400, -528, 2448], [1, -432, 2400, -336, 2448], [1, -1152, 2448, -528, 2496], [1, -432, 2448, -384, 2496], [1, -1008, 2496, -960, 2544], [1, -864, 2496, -576, 2544], [1, -864, 2544, -816, 2592], [1, -768, 2544, -720, 2592], [1, -672, 2544, -576, 2592], [1, -912, 2640, -720, 2688], [1, -912, 2688, -768, 2736], [1, -960, 2736, -720, 2784], [1, -960, 2784, -672, 2832], [1, -912, 2832, -720, 2880]] }, { id: "war_room_zone_south", label: [1, -864, 1800], rects: [[1, -864, 1392, -816, 1440], [1, -624, 1296, -528, 1440], [1, -1008, 1392, -912, 1488], [1, -864, 1440, -720, 1488], [1, -624, 1440, -576, 1488], [1, -1008, 1488, -960, 1536], [1, -912, 1488, -864, 1536], [1, -816, 1488, -624, 1536], [1, -1104, 1536, -1056, 1584], [1, -960, 1536, -528, 1584], [1, -1200, 1584, -1152, 1632], [1, -1104, 1584, -528, 1632], [1, -1488, 1632, -1440, 1680], [1, -1392, 1632, -1248, 1680], [1, -1200, 1632, -672, 1680], [1, -576, 1632, -480, 1680], [1, -432, 1584, -336, 1680], [1, -1296, 1680, -432, 1728], [1, -1680, 1680, -1440, 1776], [1, -1200, 1728, -432, 1776], [1, -1392, 1776, -336, 1824], [1, -1680, 1776, -1488, 1872], [1, -1200, 1824, -336, 1872], [1, -1344, 1872, -1296, 1920], [1, -1248, 1872, -336, 1920], [1, -1392, 1920, -1344, 1968], [1, -1200, 1920, -288, 1968], [1, -1152, 1968, -240, 2016], [1, -384, 2016, -240, 2064], [1, -1104, 2016, -624, 2112], [1, -1056, 2112, -624, 2160], [1, -768, 2160, -720, 2208]] }, { id: "conference_level2", label: [1, -2136, 1944], rects: [[1, -2160, 1680, -1680, 1824], [1, -2448, 1824, -2304, 1872], [1, -2256, 1824, -1680, 1872], [1, -2496, 1872, -1776, 2016], [1, -2592, 2016, -2208, 2112], [1, -1968, 2016, -1776, 2112], [1, -2592, 2112, -1776, 2160], [1, -2496, 2160, -1776, 2208], [1, -2448, 2208, -1776, 2256], [1, -2448, 2256, -2304, 2304], [1, -2256, 2256, -1968, 2304], [1, -2160, 2304, -2064, 2352]] }, { id: "hallway3_level1", label: [2, -1392, 2904], rects: [[2, -1680, 2784, -1488, 2832], [2, -1440, 2784, -1152, 2832], [2, -1680, 2832, -1104, 2976], [2, -1680, 2976, -1056, 3072], [2, -1632, 3072, -1104, 3120]] }, { id: "hallway_level1", label: [2, -1008, 2064], rects: [[2, -1488, 1872, -1200, 1920], [2, -1104, 1872, -816, 1920], [2, -768, 1872, -672, 1920], [2, -576, 1872, -240, 1920], [2, -1680, 1920, -192, 1968], [2, -1728, 1968, -240, 2016], [2, -1728, 2016, -288, 2112], [2, -1680, 2112, -720, 2160], [2, -672, 2112, -336, 2160], [2, -1536, 2160, -1344, 2208], [2, -1296, 2160, -1104, 2208]] }, { id: "conference_level1", label: [2, -648, 2784], rects: [[2, -720, 2112, -672, 2160], [2, -336, 2112, -240, 2160], [2, -1056, 2160, -240, 2304], [2, -1008, 2304, -192, 2352], [2, -1056, 2352, -720, 2400], [2, -1008, 2400, -720, 2640], [2, -576, 2352, -240, 2640], [2, -1056, 2640, -720, 2688], [2, -624, 2640, -240, 2688], [2, -1056, 2688, -240, 2880], [2, -1104, 2880, -240, 2976], [2, -1056, 2976, -240, 3072], [2, -1056, 3072, -864, 3120], [2, -816, 3072, -288, 3120]] }], doors: [{ kind: "door", cost: 750, at: [2, -716, 2209], rooms: [13, 12] }, { kind: "door", cost: 750, at: [2, -322, 2206], rooms: [13, 12] }, { kind: "door", cost: 1250, at: [0, -714, 4448], rooms: [3, 1] }, { kind: "door", cost: 1250, at: [0, -1071, 4422], rooms: [2, 3] }, { kind: "door", cost: 1250, at: [0, -883, 4759], rooms: [2, 3] }, { kind: "door", cost: 1250, at: [0, -1071, 5104], rooms: [2, 3] }, { kind: "door", cost: 1250, at: [0, -883, 3600], rooms: [4, 0] }, { kind: "door", cost: 1250, at: [0, -1518, 3490], rooms: [4, 0] }, { kind: "debris", cost: 1e3, at: [1, -1210, 2040], rooms: [7, 8] }, { kind: "debris", cost: 1250, at: [1, -1356, 2072], rooms: [7, 9] }, { kind: "debris", cost: 1250, at: [1, -372, 2047], rooms: [8, 9] }, { kind: "debris", cost: 1e3, at: [2, -1501, 2041], rooms: [12, 7] }, { kind: "debris", cost: 1e3, at: [1, -818, 2877], rooms: [8, 6] }], pois: [{ kind: "perk", id: "specialty_rof", at: [1, -1492, 1974] }, { kind: "perk", id: "specialty_fastreload", at: [2, -1147, 1929] }, { kind: "perk", id: "specialty_quickrevive", at: [2, -1062, 2970] }, { kind: "perk", id: "specialty_armorvest", at: [1, -1569, 1842] }, { kind: "perk", id: "specialty_additionalprimaryweapon", at: [1, -1081, 1496] }, { kind: "pap", id: null, at: [1, -1703, 2061] }, { kind: "power", id: null, at: [0, -1177, 4256] }, { kind: "box", id: null, at: [0, -1333, 4913] }, { kind: "box", id: null, at: [0, -486, 4849] }, { kind: "box", id: null, at: [0, -1102, 3598] }, { kind: "box", id: null, at: [2, -457, 2132] }, { kind: "box", id: null, at: [1, -945, 1770] }, { kind: "box", id: null, at: [2, -651, 2875] }] };

  // src/map/plans/kino.json
  var kino_default = { v: 1, slug: "kino", sig: "z10d12c194495", floors: [{ name: "Ground floor", below: 180 }, { name: "Upstairs", below: null }], rooms: [{ id: "theater_zone", label: [0, 0, 816], rects: [[0, -336, -528, -144, -480], [0, -48, -528, 48, -480], [0, -432, -480, -144, -240], [0, -96, -480, 96, -240], [0, -384, -240, 96, -192], [0, -336, -192, -288, -144], [0, -240, -192, 96, -96], [0, -192, -96, 144, 0], [0, -144, 0, 144, 48], [0, -144, 48, 96, 192], [0, -144, 192, 144, 336], [0, -144, 336, 96, 384], [0, -144, 384, 144, 528], [0, -96, 528, 144, 576], [0, -144, 576, 96, 624], [0, -528, 624, -432, 672], [0, -144, 624, 288, 672], [0, 432, 624, 528, 672], [0, -672, 672, -240, 720], [0, -192, 672, 528, 720], [0, -816, 720, 816, 912], [0, 624, 912, 768, 960], [0, -816, 912, 576, 1008], [0, -576, 1008, 576, 1056], [0, -576, 1056, -432, 1104], [0, -384, 1056, 576, 1104], [0, -576, 1104, -192, 1152], [0, -144, 1104, 192, 1152], [0, 240, 1104, 336, 1152], [0, -528, 1152, -432, 1200], [0, -336, 1152, 336, 1200], [0, -288, 1200, -48, 1248], [0, 0, 1200, 192, 1248], [0, 240, 1200, 336, 1248]] }, { id: "west_balcony_zone", label: [0, -1488, 1464], rects: [[0, -1824, 768, -1632, 816], [0, -1536, 768, -1488, 816], [0, -1824, 816, -1296, 864], [0, -1776, 864, -1296, 912], [0, -1776, 912, -1248, 1008], [0, -1200, 960, -1104, 1008], [0, -1776, 1008, -1056, 1056], [0, -1824, 1056, -1056, 1152], [0, -1776, 1152, -1056, 1200], [0, -1776, 1200, -1152, 1344], [0, -1776, 1344, -1488, 1392], [0, -1440, 1344, -1152, 1392], [0, -1824, 1392, -1152, 1536], [0, -1824, 1536, -1104, 1632], [0, -1776, 1632, -1536, 1680], [0, -1344, 1632, -1104, 1680]] }, { id: "stage_zone", label: [0, 0, 1704], rects: [[0, -1008, 1152, -816, 1200], [0, -672, 1152, -576, 1200], [0, 336, 1152, 384, 1200], [0, -1152, 1200, -768, 1248], [0, -720, 1200, -384, 1248], [0, -336, 1200, -288, 1248], [0, -48, 1200, 0, 1248], [0, 192, 1200, 240, 1248], [0, 336, 1200, 432, 1248], [0, 576, 1200, 720, 1248], [0, -1152, 1248, 432, 1296], [0, -1152, 1296, 480, 1392], [0, 528, 1248, 720, 1392], [0, -1152, 1392, 144, 1440], [0, -1152, 1440, -240, 1488], [0, -96, 1440, 144, 1488], [0, 240, 1392, 720, 1488], [0, -1152, 1488, -288, 1536], [0, -96, 1488, 96, 1536], [0, -1104, 1536, -288, 1584], [0, -240, 1536, 144, 1584], [0, -1104, 1584, 240, 1632], [0, 288, 1488, 720, 1632], [0, -1104, 1632, -720, 1680], [0, 624, 1632, 720, 1680], [0, -576, 1632, 576, 1776], [0, -528, 1776, 480, 1824], [0, -432, 1824, 240, 1920], [0, 336, 1824, 480, 1920], [0, -288, 1920, -192, 1968], [0, -144, 1920, -96, 1968], [0, 48, 1920, 192, 1968], [0, 384, 1920, 432, 1968]] }, { id: "dressing_zone", label: [0, 1152, 1512], rects: [[0, 864, 864, 1200, 912], [0, 1248, 864, 1392, 912], [0, 864, 912, 1488, 960], [0, 768, 960, 1536, 1104], [0, 816, 1104, 1248, 1152], [0, 1296, 1104, 1536, 1200], [0, 768, 1152, 1248, 1248], [0, 816, 1248, 1248, 1344], [0, 1296, 1200, 1584, 1344], [0, 768, 1344, 1248, 1392], [0, 1296, 1344, 1536, 1392], [0, 768, 1392, 1536, 1632], [0, 816, 1632, 1392, 1680], [0, 1440, 1632, 1488, 1680], [0, 864, 1680, 912, 1728]] }, { id: "alleyway_zone", label: [0, -1464, 0], rects: [[0, -1776, -624, -1536, -480], [0, -1824, -480, -1440, -432], [0, -1776, -432, -1344, -288], [0, -1776, -288, -1248, -240], [0, -1776, -240, -1104, -192], [0, -1776, -192, -1056, -144], [0, -1776, -144, -1104, -96], [0, -1776, -96, -1152, 96], [0, -1776, 96, -1104, 144], [0, -1776, 144, -1056, 240], [0, -1776, 240, -1104, 288], [0, -1776, 288, -1056, 384], [0, -1824, 384, -1104, 432], [0, -1824, 432, -1056, 480], [0, -1776, 480, -1104, 528], [0, -1776, 528, -1296, 624], [0, -1824, 624, -1296, 720], [0, -1776, 720, -1296, 768], [0, -1632, 768, -1536, 816], [0, -1488, 768, -1344, 816]] }, { id: "dining_zone", label: [0, 1320, 240], rects: [[0, 1296, -240, 1392, -192], [0, 1440, -240, 1536, -192], [0, 1296, -192, 1536, -96], [0, 768, -96, 960, -48], [0, 1248, -96, 1536, -48], [0, 720, -48, 1776, 48], [0, 720, 48, 1872, 144], [0, 720, 144, 1920, 336], [0, 720, 336, 1440, 384], [0, 1584, 336, 1920, 384], [0, 720, 384, 1152, 432], [0, 1248, 384, 1488, 432], [0, 1632, 384, 1920, 432], [0, 768, 432, 912, 480], [0, 1248, 432, 1968, 480], [0, 1248, 480, 1920, 528], [0, 960, 432, 1200, 576], [0, 1296, 528, 1920, 576], [0, 960, 576, 1920, 624], [0, 1008, 624, 1872, 672], [0, 960, 672, 1824, 720], [0, 912, 720, 1680, 768], [0, 960, 768, 1056, 816], [0, 1152, 768, 1632, 816], [0, 1344, 816, 1584, 864], [0, 1392, 864, 1584, 912], [0, 1488, 912, 1536, 960], [1, 1584, -336, 1728, -288], [1, 1296, -288, 1728, -144], [1, 1488, -144, 1728, -48], [1, 1536, -48, 1728, 0]] }, { id: "crematorium_zone", label: [0, -984, -648], rects: [[0, -1056, -1200, -960, -1152], [0, -912, -1200, -864, -1152], [0, -1104, -1152, -816, -1104], [0, -1104, -1104, -768, -1056], [0, -1056, -1056, -768, -1008], [0, -1344, -1008, -1152, -960], [0, -1056, -1008, -576, -960], [0, -1392, -960, -528, -864], [0, -1392, -864, -1248, -768], [0, -1200, -864, -528, -768], [0, -1392, -768, -528, -720], [0, -1392, -720, -576, -576], [0, -1392, -576, -528, -528], [0, -720, -528, -528, -480], [0, -1392, -528, -816, -432], [0, -1344, -432, -816, -384], [0, -1344, -384, -768, -336], [0, -1344, -336, -1200, -288], [0, -1152, -336, -768, -288]] }, { id: "vip_zone", label: [1, 960, -720], rects: [[1, 528, -1152, 816, -1104], [1, 864, -1152, 960, -1104], [1, 528, -1104, 960, -960], [1, 528, -960, 1008, -912], [1, 1104, -960, 1440, -912], [1, 1488, -960, 1632, -912], [1, 576, -912, 624, -864], [1, 672, -912, 1008, -864], [1, 1104, -912, 1632, -864], [1, 528, -864, 1680, -816], [1, 528, -816, 1728, -768], [1, 1392, -768, 1728, -720], [1, 576, -768, 1344, -672], [1, 1440, -720, 1728, -624], [1, 1488, -624, 1728, -576], [1, 576, -672, 960, -528], [1, 1104, -672, 1344, -528], [1, 1440, -576, 1680, -528], [1, 432, -528, 960, -480], [1, 1104, -528, 1632, -480], [1, 1104, -480, 1680, -432], [1, 432, -480, 1008, -384], [1, 1104, -432, 1728, -384], [1, 1104, -384, 1680, -336], [1, 384, -384, 1008, -288], [1, 1104, -336, 1584, -288], [1, 432, -288, 816, -240], [1, 720, -240, 768, -192]] }, { id: "foyer2_zone", label: [1, -24, -672], rects: [[0, -432, -816, -240, -768], [0, -96, -816, -48, -768], [0, 48, -816, 96, -768], [0, -528, -768, -240, -720], [0, -144, -768, 240, -720], [0, -576, -720, 240, -576], [0, -528, -576, 144, -528], [0, -528, -528, -480, -480], [0, -432, -528, -336, -480], [0, -144, -528, -48, -480], [0, 48, -528, 96, -480], [1, -480, -816, -432, -768], [1, -576, -768, -96, -720], [1, -48, -816, 48, -720], [1, 144, -768, 576, -720], [1, -624, -720, 576, -624], [1, -624, -624, 96, -576], [1, 144, -624, 576, -576], [1, -624, -576, -96, -528], [1, 96, -576, 576, -528], [1, -480, -528, -96, -480], [1, 96, -528, 432, -480]] }, { id: "foyer_zone", label: [0, 48, -1344], rects: [[0, -432, -1536, -288, -1488], [0, -192, -1536, -48, -1488], [0, 96, -1536, 240, -1488], [0, -432, -1488, 240, -1440], [0, 288, -1536, 576, -1440], [0, -432, -1440, 576, -1392], [0, -432, -1392, 528, -1296], [0, -432, -1296, -192, -1248], [0, -144, -1296, 576, -1248], [0, -384, -1248, 576, -1200], [0, -432, -1200, 528, -1152], [0, -432, -1152, 432, -1104], [0, -384, -1104, 96, -1056], [0, 192, -1104, 384, -1056], [0, -432, -1056, 96, -1008], [0, 144, -1056, 384, -1008], [0, -432, -1008, 432, -960], [0, -432, -960, 144, -912], [0, -192, -912, 144, -864], [0, 192, -960, 432, -864], [0, -240, -864, 240, -816], [0, -240, -816, -96, -768], [0, -48, -816, 48, -768], [0, 96, -816, 240, -768], [0, -240, -768, -144, -720], [1, -288, -1008, -240, -960], [1, -384, -960, -192, -864], [1, 144, -960, 288, -864], [1, 336, -912, 384, -864], [1, -144, -864, 432, -816], [1, -432, -864, -240, -768], [1, -144, -816, -48, -768], [1, 192, -816, 432, -768], [1, -96, -768, -48, -720], [1, 48, -816, 144, -720]] }], doors: [{ kind: "door", cost: 1250, at: [0, -830, 1274], rooms: [2, 1] }, { kind: "door", cost: 1250, at: [1, -1155, 1430], rooms: [1, 2] }, { kind: "door", cost: 750, at: [1, 582, -641], rooms: [7, 8] }, { kind: "door", cost: 1e3, at: [1, 1409, -325], rooms: [7, 5] }, { kind: "door", cost: 1e3, at: [1, 1407, -26], rooms: [5, 7] }, { kind: "door", cost: 1250, at: [0, 747, 1539], rooms: [3, 2] }, { kind: "power", cost: 750, at: [0, 1, -515], rooms: [0, 8] }, { kind: "door", cost: 1250, at: [0, 1444, 904], rooms: [5, 3] }, { kind: "door", cost: 1250, at: [0, -1547, 811], rooms: [1, 4] }, { kind: "power", cost: 750, at: [0, 0, -188], rooms: [0, 8] }, { kind: "door", cost: 1e3, at: [0, -1351, -384], rooms: [4, 6] }, { kind: "door", cost: 750, at: [0, -580, -641], rooms: [8, 6] }], pois: [{ kind: "perk", id: "specialty_quickrevive", at: [0, 527, -1261] }, { kind: "perk", id: "specialty_fastreload", at: [0, 1269, 143] }, { kind: "perk", id: "specialty_rof", at: [0, -1730, -375] }, { kind: "perk", id: "specialty_armorvest", at: [0, -328, -490] }, { kind: "perk", id: "specialty_additionalprimaryweapon", at: [1, 1172, -359] }, { kind: "pap", id: null, at: [1, 7, -473] }, { kind: "power", id: null, at: [0, -488, 1246] }, { kind: "box", id: null, at: [1, 901, -620] }, { kind: "box", id: null, at: [0, 49, 136] }, { kind: "box", id: null, at: [0, 1657, 714] }, { kind: "box", id: null, at: [0, 1, 1842] }, { kind: "box", id: null, at: [1, -1385, 1016] }, { kind: "box", id: null, at: [0, 1343, 1313] }, { kind: "box", id: null, at: [1, -1, -775] }, { kind: "box", id: null, at: [0, -1288, -635] }, { kind: "box", id: null, at: [0, -1500, 226] }] };

  // src/map/plans/moon.json
  var moon_default = { v: 1, slug: "moon", sig: "z23d24c1518564", floors: [{ name: "No Man's Land", below: null, area: [1e4, -2e4, 2e4, -1e4] }, { name: "Tunnels", below: -250 }, { name: "Moon base", below: null }], rooms: [{ id: "nml_zone", label: [0, 14064, -15504], rects: [[0, 13776, -15696, 13968, -15648], [0, 14016, -15696, 14304, -15648], [0, 13776, -15648, 14352, -15360], [0, 13776, -15360, 14304, -15312], [0, 13728, -15312, 14304, -15264], [0, 13776, -15264, 14352, -15216], [0, 13872, -15216, 14352, -15168], [0, 13872, -15168, 14208, -15120], [0, 14256, -15168, 14304, -15120], [0, 13824, -15120, 14256, -15024], [0, 13920, -15024, 14256, -14976], [0, 13920, -14976, 14160, -14928], [0, 13920, -14928, 14208, -14832], [0, 14256, -14880, 14496, -14832], [0, 13488, -14832, 14160, -14784], [0, 14208, -14832, 14496, -14784], [0, 13488, -14784, 14496, -14736], [0, 13536, -14736, 14640, -14688], [0, 13488, -14688, 14688, -14592], [0, 13488, -14592, 14640, -14544], [0, 13488, -14544, 14688, -14496], [0, 14304, -14496, 14640, -14448], [0, 13440, -14496, 14208, -14400], [0, 14256, -14448, 14688, -14400], [0, 13440, -14400, 14688, -14352], [0, 13440, -14352, 14064, -14304], [0, 14112, -14352, 14400, -14304], [0, 14448, -14352, 14640, -14304], [0, 13440, -14304, 14688, -14256], [0, 13488, -14256, 14688, -14208], [0, 13440, -14208, 14688, -14112], [0, 13440, -14112, 13728, -14064], [0, 13488, -14064, 13776, -13968], [0, 13824, -14112, 14688, -13968], [0, 13536, -13968, 13968, -13920], [0, 14016, -13968, 14640, -13920], [0, 13536, -13920, 14592, -13872], [0, 13536, -13872, 14496, -13824], [0, 13536, -13824, 14640, -13776], [0, 14016, -13776, 14688, -13728], [0, 14016, -13728, 14640, -13680], [0, 13536, -13776, 13920, -13632], [0, 14064, -13680, 14688, -13632], [0, 14064, -13632, 14640, -13584], [0, 13488, -13632, 13920, -13536], [0, 14112, -13584, 14400, -13536], [0, 14448, -13584, 14640, -13536], [0, 13440, -13536, 13920, -13488], [0, 13968, -13536, 14688, -13488], [0, 13968, -13488, 14112, -13440], [0, 14160, -13488, 14688, -13440], [0, 14016, -13440, 14640, -13392], [0, 13440, -13488, 13872, -13344], [0, 14064, -13392, 14688, -13344], [0, 13536, -13344, 13872, -13296], [0, 14112, -13344, 14640, -13296]] }, { id: "airlock_labs_2_biodome", label: [2, 1512, 5928], rects: [[2, 1488, 5808, 1536, 5856], [2, 1440, 5856, 1584, 5904], [2, 1392, 5904, 1632, 5952], [2, 1440, 5952, 1632, 6e3], [2, 1488, 6e3, 1584, 6048]] }, { id: "tower_zone_east2", label: [2, 48, 4872], rects: [[2, -96, 4512, 144, 4560], [2, -96, 4560, 192, 4608], [2, -96, 4608, 144, 4656], [2, -96, 4656, 192, 4704], [2, -96, 4704, 144, 4800], [2, -96, 4800, 192, 4944]] }, { id: "forest_zone", label: [2, 24, 7512], rects: [[2, -48, 5136, 144, 5184], [2, -96, 5184, 144, 5232], [2, -240, 5232, -192, 5280], [2, -96, 5232, 240, 5280], [2, -480, 5280, 240, 5376], [2, -576, 5376, 240, 5424], [2, -624, 5424, -432, 5472], [2, -384, 5424, 240, 5472], [2, -624, 5472, 240, 5520], [2, -672, 5520, -240, 5568], [2, -96, 5520, 48, 5568], [2, 144, 5520, 240, 5568], [2, -672, 5568, 48, 5616], [2, -528, 5616, 48, 5664], [2, -720, 5616, -576, 5712], [2, -528, 5664, 0, 5712], [2, -576, 5712, -48, 5760], [2, -528, 5760, -144, 5808], [2, -768, 5712, -624, 5856], [2, -576, 5808, -432, 5856], [2, -336, 5808, -144, 5856], [2, -816, 5856, -192, 5904], [2, -864, 5904, -336, 5952], [2, -288, 5904, -240, 5952], [2, -960, 5952, -384, 6e3], [2, 1296, 5952, 1440, 6e3], [2, -1104, 6e3, -816, 6048], [2, -768, 6e3, -480, 6048], [2, 1248, 6e3, 1488, 6048], [2, -1200, 6048, -576, 6096], [2, 1152, 6048, 1536, 6096], [2, -1248, 6096, -576, 6144], [2, 576, 6096, 768, 6144], [2, 816, 6096, 1008, 6144], [2, 1056, 6096, 1632, 6144], [2, -1296, 6144, -576, 6192], [2, 576, 6144, 1632, 6192], [2, -1104, 6192, -672, 6240], [2, 576, 6192, 1152, 6240], [2, 1200, 6192, 1632, 6240], [2, -1392, 6192, -1152, 6288], [2, -1104, 6240, -720, 6288], [2, 528, 6240, 768, 6288], [2, 960, 6240, 1008, 6288], [2, 1056, 6240, 1536, 6288], [2, -1536, 6288, -1200, 6336], [2, -1152, 6288, -912, 6336], [2, 528, 6288, 1440, 6336], [2, -1584, 6336, -912, 6384], [2, 480, 6336, 1392, 6384], [2, -1632, 6384, -1008, 6432], [2, 480, 6384, 768, 6432], [2, 816, 6384, 1008, 6432], [2, 1056, 6384, 1296, 6432], [2, -1632, 6432, -1056, 6480], [2, 528, 6432, 1248, 6480], [2, -1584, 6480, -1152, 6528], [2, 0, 6480, 144, 6528], [2, 480, 6480, 1296, 6528], [2, -1632, 6528, -1152, 6576], [2, -432, 6528, -336, 6576], [2, -240, 6528, -144, 6576], [2, -48, 6528, 192, 6576], [2, 240, 6528, 1008, 6576], [2, 1056, 6528, 1104, 6576], [2, 1152, 6528, 1296, 6576], [2, -1632, 6576, -1200, 6624], [2, -576, 6576, -480, 6624], [2, -432, 6576, 912, 6624], [2, -1632, 6624, -1152, 6672], [2, -624, 6624, 912, 6672], [2, -1632, 6672, -1056, 6720], [2, -672, 6672, -432, 6720], [2, -384, 6672, -192, 6720], [2, 0, 6672, 864, 6720], [2, -1584, 6720, -1056, 6768], [2, -720, 6720, -192, 6768], [2, -144, 6672, -48, 6768], [2, 0, 6720, 912, 6768], [2, -1536, 6768, -1056, 6816], [2, -768, 6768, -576, 6816], [2, -528, 6768, 912, 6816], [2, -1488, 6816, -1056, 6864], [2, -816, 6816, -624, 6864], [2, -576, 6816, 864, 6864], [2, -1536, 6864, -1008, 6912], [2, -816, 6864, 432, 6912], [2, 480, 6864, 912, 6912], [2, -1488, 6912, 48, 6960], [2, 672, 6912, 1008, 6960], [2, -1392, 6960, 96, 7008], [2, 720, 6960, 1008, 7008], [2, -1344, 7008, -432, 7056], [2, -384, 7008, 144, 7056], [2, 768, 7008, 960, 7056], [2, -1344, 7056, -864, 7104], [2, -816, 7056, -480, 7104], [2, -336, 7056, 192, 7104], [2, 720, 7056, 912, 7104], [2, 1008, 7008, 1152, 7104], [2, -1344, 7104, -528, 7152], [2, -288, 7104, 192, 7152], [2, 672, 7104, 1104, 7152], [2, -1296, 7152, -624, 7200], [2, -240, 7152, 240, 7200], [2, 624, 7152, 1248, 7200], [2, -1248, 7200, -624, 7248], [2, -192, 7200, 288, 7248], [2, 432, 7200, 1248, 7248], [2, -1008, 7248, -720, 7296], [2, -240, 7248, 1248, 7296], [2, -1200, 7248, -1056, 7344], [2, -1008, 7296, -672, 7344], [2, -240, 7296, 1200, 7344], [2, -1152, 7344, -624, 7392], [2, -240, 7344, 528, 7392], [2, -1104, 7392, 480, 7440], [2, 576, 7344, 1152, 7440], [2, -1056, 7440, 432, 7488], [2, 528, 7440, 1152, 7488], [2, -1008, 7488, 1056, 7536], [2, -1008, 7536, 1008, 7584], [2, -912, 7584, 912, 7632], [2, -864, 7632, -144, 7680], [2, -96, 7632, -48, 7680], [2, 0, 7632, 48, 7680], [2, 144, 7632, 192, 7680], [2, 288, 7632, 672, 7680], [2, 720, 7632, 768, 7680], [2, -432, 7680, -96, 7728], [2, -576, 7728, -528, 7776], [2, -480, 7728, -48, 7776], [2, -624, 7776, 96, 7872], [2, -576, 7872, -48, 7920], [2, 0, 7872, 96, 7920], [2, -624, 7920, 96, 7968], [2, -432, 7968, 96, 8016], [2, -576, 7968, -480, 8064], [2, -432, 8016, 48, 8064], [2, -624, 8064, 48, 8112], [2, -624, 8112, -480, 8160], [2, -432, 8112, 96, 8160], [2, -624, 8160, -432, 8208], [2, -240, 8160, 48, 8208], [2, -624, 8208, -336, 8256], [2, -192, 8208, -48, 8256], [2, 0, 8208, 96, 8256], [2, -192, 8256, 96, 8304], [2, -624, 8256, -288, 8352], [2, -240, 8304, 96, 8352], [2, -624, 8352, 48, 8400], [2, -624, 8400, -288, 8448], [2, -240, 8400, 96, 8448], [2, -576, 8448, 96, 8496], [2, -384, 8496, -288, 8544], [2, -240, 8496, -48, 8544], [2, 0, 8496, 48, 8544]] }, { id: "airlock_biodome_zone", label: [2, 48, 5040], rects: [[2, -48, 4944, 144, 5136]] }, { id: "tower_zone_east", label: [2, 1488, 4512], rects: [[2, 720, 3360, 816, 3408], [2, 864, 3360, 912, 3408], [2, 1296, 3360, 1344, 3408], [2, 1248, 3408, 1536, 3456], [2, 672, 3408, 960, 3552], [2, 240, 3552, 336, 3600], [2, 720, 3552, 1008, 3600], [2, 1248, 3456, 1584, 3600], [2, 1632, 3552, 1680, 3600], [2, 768, 3600, 1008, 3648], [2, 1056, 3600, 1104, 3648], [2, 1152, 3600, 1728, 3648], [2, 192, 3600, 384, 3696], [2, 720, 3648, 1728, 3696], [2, 240, 3696, 432, 3744], [2, 768, 3696, 1776, 3744], [2, 240, 3744, 480, 3792], [2, 720, 3744, 1776, 3792], [2, -96, 3792, 144, 3840], [2, 240, 3792, 1776, 3840], [2, -192, 3840, -144, 3888], [2, -96, 3840, 1776, 3888], [2, 1152, 3888, 1776, 3936], [2, -240, 3888, 1056, 3984], [2, 1248, 3936, 1440, 3984], [2, 1488, 3936, 1728, 3984], [2, -192, 3984, 1056, 4032], [2, 1536, 3984, 1728, 4032], [2, 1536, 4032, 1920, 4080], [2, -96, 4032, 1056, 4128], [2, 1296, 4080, 1440, 4128], [2, 1536, 4080, 1968, 4128], [2, -144, 4128, 1248, 4176], [2, 1296, 4128, 1920, 4176], [2, -144, 4176, 480, 4224], [2, 1344, 4176, 1392, 4224], [2, 1440, 4176, 1488, 4224], [2, 1536, 4176, 1920, 4224], [2, -144, 4224, 432, 4272], [2, 720, 4176, 1248, 4272], [2, -192, 4272, 432, 4320], [2, 720, 4272, 1488, 4320], [2, 1536, 4224, 1872, 4320], [2, 672, 4320, 1440, 4368], [2, 1536, 4320, 1632, 4368], [2, 1680, 4320, 1872, 4368], [2, -192, 4320, 384, 4416], [2, 720, 4368, 912, 4416], [2, 1824, 4368, 1872, 4416], [2, -144, 4416, 432, 4464], [2, -96, 4464, 432, 4512], [2, 144, 4512, 384, 4560], [2, 1200, 4368, 1776, 4656], [2, 1008, 4656, 1776, 4800], [2, 960, 4800, 1776, 4896], [2, 960, 4896, 1680, 4944], [2, 960, 4944, 1776, 5040], [2, 960, 5040, 1872, 5088], [2, 960, 5088, 1488, 5136], [2, 1680, 5088, 1872, 5136], [2, 1008, 5136, 1488, 5184], [2, 1680, 5136, 1824, 5184], [2, 1008, 5184, 1104, 5232], [2, 1248, 5184, 1296, 5232], [2, 1344, 5184, 1440, 5232]] }, { id: "enter_forest_east_zone", label: [2, 1968, 5712], rects: [[2, 1824, 5136, 2064, 5184], [2, 1680, 5184, 2064, 5280], [2, 1440, 5280, 2064, 5328], [2, 1440, 5328, 1824, 5376], [2, 1872, 5328, 2064, 5376], [2, 1440, 5376, 1872, 5424], [2, 1920, 5376, 2160, 5424], [2, 1440, 5424, 2160, 5472], [2, 1440, 5472, 1872, 5520], [2, 1920, 5472, 2112, 5520], [2, 1632, 5520, 2160, 5568], [2, 1632, 5568, 1872, 5616], [2, 1920, 5568, 2160, 5616], [2, 1632, 5616, 2352, 5664], [2, 1584, 5664, 2352, 5760], [2, 1536, 5760, 2352, 5808], [2, 1536, 5808, 2208, 5856], [2, 1584, 5856, 1872, 5904], [2, 1920, 5856, 2208, 5904], [2, 1632, 5904, 2208, 6e3], [2, 1776, 6e3, 2208, 6048], [2, 1872, 6048, 2016, 6096], [2, 2112, 6048, 2160, 6096]] }, { id: "airlock_digsite_zone", label: [2, 1584, 5184], rects: [[2, 1488, 5088, 1680, 5280]] }, { id: "generator_exit_east_zone", label: [2, 2280, 5280], rects: [[1, 1248, 3504, 1392, 3552], [1, 1200, 3552, 1440, 3600], [1, 1200, 3600, 1680, 3744], [1, 1152, 3744, 1680, 3792], [1, 1152, 3792, 1632, 3888], [1, 1152, 3888, 1680, 3936], [1, 1152, 3936, 1632, 3984], [1, 1152, 3984, 1680, 4032], [1, 1152, 4032, 1632, 4128], [1, 1104, 4128, 1632, 4176], [1, 1104, 4176, 1872, 4224], [1, 1104, 4224, 1920, 4368], [1, 1200, 4368, 1296, 4416], [1, 1392, 4368, 1440, 4416], [1, 1584, 4368, 1872, 4416], [2, 1440, 3936, 1488, 3984], [2, 1440, 3984, 1536, 4128], [2, 1248, 4128, 1296, 4176], [2, 1248, 4176, 1344, 4224], [2, 1392, 4176, 1440, 4224], [2, 1488, 4176, 1536, 4224], [2, 1920, 4176, 2064, 4224], [2, 2112, 4176, 2352, 4224], [2, 1248, 4224, 1536, 4272], [2, 1488, 4272, 1536, 4320], [2, 1440, 4320, 1536, 4368], [2, 1872, 4224, 2352, 4368], [2, 1872, 4368, 2400, 4416], [2, 1872, 4416, 2112, 4464], [2, 2160, 4416, 2400, 4464], [2, 1824, 4464, 2352, 4512], [2, 1776, 4512, 2496, 4560], [2, 1776, 4560, 2544, 4608], [2, 1776, 4608, 2496, 4656], [2, 1824, 4656, 2352, 4704], [2, 1920, 4704, 2112, 4752], [2, 2160, 4704, 2400, 4752], [2, 1872, 4752, 2400, 4800], [2, 1872, 4800, 2496, 4848], [2, 1824, 4848, 2496, 4896], [2, 1872, 4896, 2496, 4944], [2, 1920, 4944, 2496, 4992], [2, 2064, 5136, 2160, 5184], [2, 2256, 4992, 2496, 5184], [2, 2064, 5184, 2496, 5376]] }, { id: "airlock_generator_zone", label: [1, 1104, 3672], rects: [[1, 1056, 3552, 1152, 3600], [1, 1008, 3600, 1200, 3744], [1, 1008, 3744, 1152, 3792]] }, { id: "cata_right_middle_zone", label: [1, 936, 1704], rects: [[1, 720, 1488, 1200, 1536], [1, 672, 1536, 1248, 1632], [1, 672, 1632, 1200, 1776], [1, 720, 1776, 864, 1824], [1, 912, 1776, 1152, 1824], [1, 1056, 1824, 1200, 1920], [1, 672, 1824, 1008, 1968], [1, 672, 1968, 1200, 2016], [1, 672, 2016, 1248, 2064], [1, 624, 2064, 1296, 2160], [1, 624, 2160, 1248, 2208], [1, 720, 2208, 1200, 2256], [1, 672, 2256, 1248, 2304], [1, 624, 2304, 1248, 2400], [1, 672, 2400, 1248, 2448], [1, 912, 2448, 1152, 2496]] }, { id: "airlock_west2_zone", label: [1, -672, 2688], rects: [[1, -768, 2592, -576, 2784]] }, { id: "cata_right_end_zone", label: [1, 1152, 2640], rects: [[1, 864, 2496, 1200, 2544], [1, 1296, 2496, 1440, 2544], [1, 864, 2544, 1440, 2736], [1, 864, 2736, 1248, 2784], [1, 864, 2784, 1200, 2832], [1, 1296, 2736, 1440, 2832], [1, 864, 2832, 1248, 2880], [1, 1296, 2832, 1392, 2880], [1, 912, 2880, 1536, 3024], [1, 912, 3024, 960, 3072], [1, 1296, 3024, 1440, 3072]] }, { id: "generator_zone", label: [1, -24, 2856], rects: [[1, 0, 1920, 144, 1968], [1, -48, 1968, 192, 2064], [1, -48, 2064, 144, 2112], [1, 0, 2112, 144, 2352], [1, -96, 2352, 144, 2400], [1, 192, 2352, 288, 2400], [1, -144, 2400, 288, 2496], [1, -96, 2496, -48, 2544], [1, 192, 2496, 240, 2544], [1, -144, 2544, 0, 2640], [1, -96, 2640, 0, 2688], [1, 384, 2640, 720, 2688], [1, -144, 2688, 0, 2736], [1, 144, 2544, 288, 2736], [1, 384, 2688, 768, 2736], [1, -144, 2736, 288, 2784], [1, 384, 2736, 720, 2784], [1, -816, 2784, 720, 2832], [1, -816, 2832, 768, 2880], [1, -816, 2880, 720, 2928], [1, -768, 2928, 720, 2976], [1, -144, 2976, 192, 3024], [1, -144, 3024, 240, 3072], [1, 528, 2976, 720, 3072], [1, -288, 3072, 240, 3120], [1, 528, 3072, 672, 3120], [1, -336, 3120, 288, 3168], [1, -288, 3168, 288, 3216], [1, -336, 3216, -96, 3312], [1, 96, 3216, 336, 3312], [1, -288, 3312, -96, 3360], [1, -48, 3312, 336, 3360], [1, -336, 3360, 336, 3408], [1, -336, 3408, 192, 3456], [1, 240, 3408, 480, 3456], [1, 528, 3408, 624, 3456], [1, -336, 3456, 672, 3504], [1, -336, 3504, 864, 3552], [1, -336, 3552, 960, 3600], [1, -336, 3600, 1008, 3648], [1, -336, 3648, 624, 3696], [1, 672, 3648, 1008, 3696], [1, -144, 3696, 1008, 3744], [1, -336, 3696, -192, 3792], [1, -96, 3744, 0, 3792], [1, 144, 3744, 1008, 3792], [1, 240, 3792, 480, 3840], [1, 528, 3792, 864, 3840], [1, -336, 3792, -96, 3888], [1, 192, 3840, 480, 3888], [1, 768, 3840, 816, 3888], [1, 240, 3888, 480, 3936], [1, -288, 3888, -96, 3984], [1, 192, 3936, 432, 3984], [1, -336, 3984, -96, 4080], [1, 192, 3984, 480, 4080], [1, -288, 4080, -144, 4128], [1, -96, 4080, 480, 4128], [1, -288, 4128, 432, 4176], [1, -240, 4176, 384, 4224], [1, -192, 4224, 336, 4272], [1, -144, 4272, 336, 4320], [1, 240, 4320, 288, 4368]] }, { id: "airlock_east2_zone", label: [1, 816, 2976], rects: [[1, 768, 2832, 864, 2880], [1, 720, 2880, 912, 3072]] }, { id: "cata_right_start_zone", label: [2, 1248, 816], rects: [[2, 1200, 672, 1248, 720], [2, 1392, 672, 1584, 720], [2, 816, 720, 912, 768], [2, 1104, 720, 1632, 768], [2, 816, 768, 1680, 864], [2, 864, 864, 1632, 912], [2, 912, 912, 1008, 960], [2, 1440, 912, 1584, 960], [2, 864, 960, 1008, 1008], [2, 1056, 960, 1344, 1008], [2, 1440, 960, 1632, 1008], [2, 864, 1008, 1392, 1056], [2, 1488, 1008, 1584, 1056], [2, 912, 1056, 1584, 1104], [2, 864, 1104, 1584, 1152], [2, 864, 1152, 1392, 1200], [2, 1488, 1152, 1584, 1200], [2, 912, 1200, 1008, 1248], [2, 1056, 1200, 1104, 1248], [2, 1152, 1200, 1344, 1248], [2, 1200, 1248, 1296, 1296], [2, 1440, 1200, 1584, 1296], [2, 1440, 1296, 1680, 1344], [2, 1440, 1344, 1728, 1440], [2, 1440, 1440, 1680, 1488], [1, 1200, 1152, 1248, 1200], [1, 864, 1200, 1056, 1296], [1, 1152, 1200, 1296, 1296], [1, 816, 1296, 1152, 1344], [1, 1200, 1296, 1440, 1344], [1, 816, 1344, 1488, 1440], [1, 816, 1440, 1152, 1488]] }, { id: "airlock_east_zone", label: [2, 1320, 600], rects: [[2, 1248, 528, 1440, 576], [2, 1200, 576, 1440, 624], [2, 1248, 624, 1440, 672], [2, 1248, 672, 1392, 720]] }, { id: "cata_left_middle_zone", label: [1, -1032, 2184], rects: [[2, -1056, 1296, -816, 1344], [2, -1104, 1344, -768, 1440], [2, -1056, 1440, -912, 1488], [2, -864, 1440, -816, 1488], [1, -1056, 1392, -768, 1440], [1, -1104, 1440, -768, 1632], [1, -1104, 1632, -528, 1680], [1, -1056, 1680, -528, 1728], [1, -1536, 1728, -1248, 1776], [1, -1200, 1728, -1152, 1776], [1, -1104, 1728, -480, 1776], [1, -1584, 1776, -432, 1824], [1, -1632, 1824, -432, 1872], [1, -1632, 1872, -528, 1920], [1, -1584, 1920, -864, 1968], [1, -1536, 1968, -1248, 2016], [1, -1104, 1968, -864, 2016], [1, -1536, 2016, -1296, 2064], [1, -1152, 2016, -912, 2064], [1, -768, 1920, -528, 2064], [1, -1536, 2064, -1248, 2112], [1, -1200, 2064, -528, 2112], [1, -1536, 2112, -528, 2256], [1, -1536, 2256, -1248, 2304], [1, -1200, 2256, -528, 2304], [1, -1488, 2304, -1296, 2352], [1, -1104, 2304, -960, 2352], [1, -768, 2304, -576, 2352], [1, -1536, 2352, -1248, 2400], [1, -1200, 2352, -864, 2400], [1, -816, 2352, -528, 2400], [1, -1584, 2400, -528, 2448], [1, -1632, 2448, -528, 2544], [1, -1584, 2544, -528, 2592], [1, -1536, 2592, -1248, 2640], [1, -1152, 2592, -912, 2640], [1, -816, 2592, -768, 2640], [1, -576, 2592, -528, 2640], [1, -1440, 2640, -1344, 2688], [1, -1104, 2640, -960, 2688]] }, { id: "cata_left_start_zone", label: [2, -984, 1152], rects: [[2, -1152, 720, -960, 768], [2, -1488, 768, -816, 816], [2, -768, 768, -672, 816], [2, -1488, 816, -672, 864], [2, -1488, 864, -624, 912], [2, -1488, 912, -576, 960], [2, -1440, 960, -864, 1008], [2, -816, 960, -624, 1008], [2, -1440, 1008, -624, 1056], [2, -1440, 1056, -576, 1104], [2, -1440, 1104, -528, 1200], [2, -1392, 1200, -1296, 1248], [2, -1248, 1200, -576, 1248], [2, -1008, 1248, -816, 1296]] }, { id: "airlock_west_zone", label: [2, -1248, 648], rects: [[2, -1344, 528, -1152, 768]] }, { id: "water_zone", label: [2, -912, 624], rects: [[2, -336, -48, -288, 0], [2, -912, 0, -720, 48], [2, 144, 0, 288, 48], [2, -1056, 48, -672, 96], [2, -480, 0, -240, 96], [2, -192, 48, -144, 96], [2, 0, 48, 48, 96], [2, 96, 48, 480, 96], [2, -1056, 96, -336, 144], [2, -240, 96, -192, 144], [2, -96, 48, -48, 144], [2, 96, 96, 192, 144], [2, 240, 96, 528, 144], [2, 576, 48, 720, 144], [2, -1056, 144, -144, 192], [2, -96, 144, 0, 192], [2, 240, 144, 288, 192], [2, 336, 144, 720, 192], [2, -288, 192, -144, 240], [2, -96, 192, -48, 240], [2, 48, 144, 144, 240], [2, 192, 192, 288, 240], [2, 432, 192, 816, 240], [2, 912, 192, 1008, 240], [2, -1152, 192, -336, 288], [2, -240, 240, -192, 288], [2, 0, 240, 144, 288], [2, 192, 240, 1104, 288], [2, -1104, 288, -240, 336], [2, 144, 288, 384, 336], [2, 432, 288, 816, 336], [2, 912, 288, 1248, 336], [2, -1296, 336, -1248, 384], [2, -1200, 336, -192, 384], [2, 192, 336, 288, 384], [2, 336, 336, 1392, 384], [2, -1344, 384, -336, 432], [2, -288, 384, -192, 432], [2, 96, 336, 144, 432], [2, 192, 384, 1440, 432], [2, -1344, 432, -384, 480], [2, -336, 432, -96, 480], [2, 336, 432, 1440, 480], [2, -1296, 480, -384, 528], [2, -336, 480, -240, 528], [2, -144, 480, -96, 528], [2, 0, 480, 336, 528], [2, 432, 480, 1440, 528], [2, -432, 528, -96, 576], [2, -48, 528, 96, 576], [2, 384, 528, 432, 576], [2, 624, 528, 1248, 576], [2, -336, 576, -288, 624], [2, -240, 576, -192, 624], [2, -144, 576, 96, 624], [2, 144, 576, 240, 624], [2, 672, 576, 1200, 624], [2, -384, 624, -288, 672], [2, -240, 624, -144, 672], [2, -96, 624, 192, 672], [2, 288, 528, 336, 672], [2, 672, 624, 1248, 672], [2, -1152, 528, -672, 720], [2, -96, 672, -48, 720], [2, 48, 672, 96, 720], [2, 672, 672, 1200, 720], [2, -960, 720, -912, 768], [2, 912, 720, 960, 768], [2, 1008, 720, 1056, 768], [1, 672, -48, 864, 0], [1, 672, 0, 912, 48], [1, 672, 48, 1008, 96], [1, 672, 96, 1104, 144], [1, 720, 144, 1152, 192], [1, 768, 192, 960, 240], [1, 1008, 192, 1248, 240], [1, 816, 240, 912, 288], [1, 1056, 240, 1248, 288], [1, 1104, 288, 1248, 336]] }, { id: "bridge_zone", label: [2, 96, -48], rects: [[2, 192, -288, 240, -240], [2, -336, -240, -192, -192], [2, -144, -240, -48, -192], [2, 48, -240, 336, -192], [2, 384, -240, 432, -192], [2, -336, -192, 0, -144], [2, 48, -192, 480, -144], [2, -336, -144, 480, -96], [2, -288, -96, 480, 0], [2, -240, 0, 144, 48], [2, 288, 0, 480, 48], [2, -240, 48, -192, 96], [2, -144, 48, -96, 96], [2, -48, 48, 0, 96], [2, 48, 48, 96, 96], [2, -336, 96, -240, 144], [2, -192, 96, -96, 144], [2, -48, 96, 96, 144], [2, 192, 96, 240, 144], [2, 0, 144, 48, 192], [2, 144, 144, 240, 192], [2, 288, 144, 336, 192], [2, -336, 192, -288, 240], [2, -144, 144, -96, 240], [2, -48, 192, 48, 240], [2, 288, 192, 432, 240], [2, -336, 240, -240, 288], [2, -192, 240, 0, 288], [2, 144, 192, 192, 288], [2, -240, 288, 144, 336], [2, 384, 288, 432, 336], [2, 288, 336, 336, 384], [2, -336, 384, -288, 432], [2, -192, 336, 96, 432], [2, 144, 336, 192, 432], [2, -96, 432, 336, 480], [2, -384, 432, -336, 528], [2, -240, 480, -144, 528], [2, -96, 480, 0, 528], [2, 336, 480, 432, 528], [2, -480, 528, -432, 576], [2, -96, 528, -48, 576], [2, 96, 528, 288, 576], [2, 336, 528, 384, 576], [2, 432, 528, 480, 576], [2, -480, 576, -336, 624], [2, -192, 576, -144, 624], [2, 96, 576, 144, 624], [2, 240, 576, 288, 624], [2, -480, 624, -384, 672], [2, -288, 576, -240, 672], [2, -144, 624, -96, 672], [2, 192, 624, 288, 672], [2, 336, 576, 480, 672], [2, -480, 672, -96, 720], [2, 144, 672, 480, 720], [2, -480, 720, -192, 768], [2, -480, 768, -288, 816], [2, 288, 720, 480, 816], [2, -432, 816, -336, 864], [2, 336, 816, 480, 912]] }, { id: "airlock_bridge_zone", label: [2, -576, 624], rects: [[2, 480, 528, 624, 576], [2, -672, 528, -480, 720], [2, 480, 576, 672, 720]] }], doors: [{ kind: "door", cost: 1e3, at: [2, -926, 1295], rooms: [17, 18] }, { kind: "door", cost: 750, at: [2, 1039, 1465], rooms: [15, 10] }, { kind: "door", cost: 750, at: [1, 1038, 2491], rooms: [10, 12] }, { kind: "door", cost: 750, at: [2, 1313, 514], rooms: [20, 16] }, { kind: "door", cost: 750, at: [2, 1313, 716], rooms: [16, 15] }, { kind: "door", cost: 750, at: [2, -1224, 547], rooms: [19, 20] }, { kind: "door", cost: 750, at: [2, -1224, 741], rooms: [19, 18] }, { kind: "door", cost: 1e3, at: [2, 1584, 5078], rooms: [7, 5] }, { kind: "door", cost: 1e3, at: [2, 1584, 5276], rooms: [6, 7] }, { kind: "door", cost: 750, at: [1, 1019, 3676], rooms: [13, 9] }, { kind: "door", cost: 750, at: [1, 1218, 3675], rooms: [9, 8] }, { kind: "door", cost: 1250, at: [1, 704, 2962], rooms: [13, 14] }, { kind: "door", cost: 1250, at: [1, 904, 2961], rooms: [12, 14] }, { kind: "door", cost: 1250, at: [1, -672, 2611], rooms: [17, 11] }, { kind: "door", cost: 1250, at: [1, -672, 2810], rooms: [13, 11] }, { kind: "door", cost: 1e3, at: [2, 2058, 5285], rooms: [8, 6] }, { kind: "door", cost: 750, at: [2, -492, 625], rooms: [22, 21] }, { kind: "door", cost: 750, at: [2, 490, 625], rooms: [21, 22] }, { kind: "door", cost: 750, at: [2, 689, 625], rooms: [20, 22] }, { kind: "door", cost: 750, at: [2, -692, 626], rooms: [22, 20] }, { kind: "door", cost: 1e3, at: [2, 1602, 5870], rooms: [6, 1] }, { kind: "door", cost: 1e3, at: [2, 1462, 6010], rooms: [1, 3] }, { kind: "door", cost: 1e3, at: [2, 40, 4933], rooms: [2, 4] }, { kind: "door", cost: 1e3, at: [2, 40, 5132], rooms: [3, 4] }], pois: [{ kind: "perk", id: "specialty_armorvest", at: [0, 14281, -15033] }, { kind: "perk", id: "specialty_fastreload", at: [0, 14279, -15033] }, { kind: "perk", id: "specialty_additionalprimaryweapon", at: [2, 1480, 3450] }, { kind: "perk", id: "specialty_longersprint", at: [1, 674, 2236] }, { kind: "perk", id: "specialty_deadshot", at: [2, 2142, 6043] }, { kind: "perk", id: "specialty_flakjacket", at: [2, -262, 8344] }, { kind: "perk", id: "specialty_quickrevive", at: [2, 17, -154] }, { kind: "perk", id: "specialty_rof", at: [1, 1599, 3808] }, { kind: "pap", id: null, at: [0, 14045, -13960] }, { kind: "power", id: null, at: [1, 48, 3191] }, { kind: "box", id: null, at: [1, -101, 2412] }, { kind: "box", id: null, at: [2, -175, -195] }, { kind: "box", id: null, at: [2, -461, 8474] }, { kind: "box", id: null, at: [2, 1215, 4154] }] };

  // src/map/plans/nacht.json
  var nacht_default = { v: 1, slug: "nacht", sig: "z3d4c16609", floors: [{ name: "Ground floor", below: 80 }, { name: "Upstairs", below: null }], rooms: [{ id: "upstairs_zone", label: [1, 408, 768], rects: [[1, -192, -144, -48, 48], [1, -192, 48, 0, 96], [1, -192, 96, 240, 144], [1, -192, 144, 288, 192], [1, -240, 192, 240, 336], [1, -240, 336, 192, 384], [1, -192, 384, 240, 528], [1, -240, 528, 336, 576], [1, -240, 576, -96, 624], [1, 0, 576, 384, 624], [1, -192, 624, -144, 672], [1, -96, 624, 1056, 672], [1, -240, 672, 1056, 864], [1, -240, 864, 528, 912], [1, 576, 864, 768, 912], [1, 816, 864, 1008, 912], [1, -240, 912, 1008, 1008], [1, 624, 1008, 960, 1056], [1, -240, 1008, -48, 1104], [1, 96, 1008, 336, 1104], [1, -192, 1104, -48, 1152], [1, 144, 1104, 336, 1152], [1, 192, 1152, 288, 1200]] }, { id: "box_zone", label: [0, 456, 912], rects: [[0, -96, 576, 48, 624], [0, 144, 576, 240, 624], [0, 576, 576, 720, 624], [0, -144, 624, 48, 672], [0, 96, 624, 768, 672], [0, 864, 624, 960, 672], [0, -192, 672, 1008, 720], [0, -192, 720, 0, 768], [0, 48, 720, 1008, 768], [0, -192, 768, 1056, 816], [0, -192, 816, 96, 864], [0, 144, 816, 288, 864], [0, 384, 816, 1056, 864], [0, -192, 864, 1104, 960], [0, -144, 960, 816, 1008], [0, 864, 960, 912, 1008], [0, -96, 1008, 336, 1056], [0, 384, 1008, 528, 1056], [0, -48, 1056, 336, 1104], [0, 0, 1104, 48, 1152], [1, -48, 1008, 48, 1104]] }, { id: "start_zone", label: [0, 0, 288], rects: [[0, 144, -960, 192, -912], [0, -48, -912, 240, -864], [0, -240, -912, -96, -816], [0, -48, -864, 288, -816], [0, -240, -816, 288, -720], [0, -240, -720, 240, -672], [0, -240, -672, 288, -624], [0, -240, -624, 240, -528], [0, -240, -528, 192, -480], [0, -144, -480, 144, -432], [0, -144, -432, 192, -384], [0, 0, -384, 240, -336], [0, -240, -336, 288, -240], [0, -240, -240, 240, -144], [0, -240, -144, 192, -96], [0, -240, -96, 240, -48], [0, -240, -48, -96, 0], [0, -48, -48, 192, 0], [0, -240, 0, 192, 48], [0, -240, 48, 144, 144], [0, -240, 144, 240, 432], [0, -240, 432, -48, 480], [0, 48, 432, 240, 480], [0, -240, 480, 288, 528], [0, -240, 528, 240, 576], [0, -240, 576, -96, 624], [0, 48, 576, 144, 624], [1, 96, -48, 240, 0], [1, 48, 0, 288, 96]] }], doors: [{ kind: "door", cost: 1e3, at: [0, 175, 587], rooms: [1, 2] }, { kind: "debris", cost: 1e3, at: [1, 167, 42], rooms: [2, 0] }, { kind: "debris", cost: 1e3, at: [1, 172, 147], rooms: [0, 2] }, { kind: "debris", cost: 1e3, at: [1, -58, 1060], rooms: [0, 1] }], pois: [{ kind: "perk", id: "specialty_additionalprimaryweapon", at: [0, -160, -528] }, { kind: "box", id: null, at: [0, -130, 684] }] };

  // src/map/plans/riese.json
  var riese_default = { v: 1, slug: "riese", sig: "z12d12c270607", floors: [{ name: "Ground floor", below: null }], rooms: [{ id: "tp_west_zone", label: [0, -1272, -696], rects: [[0, -1488, -1632, -1200, -1584], [0, -1536, -1584, -1200, -1488], [0, -1152, -1536, -1104, -1488], [0, -1488, -1488, -1056, -1440], [0, -1584, -1440, -1104, -1392], [0, -1584, -1392, -1344, -1344], [0, -1296, -1392, -1104, -1344], [0, -1584, -1344, -1440, -1296], [0, -1296, -1344, -1056, -1296], [0, -1680, -1296, -1440, -1248], [0, -1728, -1248, -1440, -1200], [0, -1296, -1296, -960, -1200], [0, -912, -1296, -864, -1200], [0, -1872, -1200, -960, -1152], [0, -1872, -1152, -1008, -1104], [0, -960, -1152, -864, -1104], [0, -1872, -1104, -1056, -1056], [0, -1872, -1056, -1440, -1008], [0, -1392, -1056, -1104, -1008], [0, -1680, -1008, -1488, -960], [0, -1296, -1008, -1104, -960], [0, -1680, -960, -1440, -912], [0, -1296, -960, -1056, -912], [0, -1632, -912, -1392, -864], [0, -1296, -912, -1152, -864], [0, -1536, -864, -1152, -816], [0, -1536, -816, -1104, -768], [0, -1440, -768, -1104, -624], [0, -1392, -624, -1104, -480], [0, -1296, -480, -1104, -432], [0, -1248, -432, -1152, -384]] }, { id: "outside_south_zone", label: [0, 144, -840], rects: [[0, 528, -2016, 576, -1968], [0, 96, -1968, 672, -1920], [0, 48, -1920, 672, -1824], [0, 96, -1824, 672, -1776], [0, 48, -1776, 672, -1728], [0, 48, -1728, 192, -1680], [0, 240, -1728, 528, -1680], [0, 576, -1728, 672, -1680], [0, 48, -1680, 528, -1584], [0, 96, -1584, 672, -1488], [0, 144, -1488, 624, -1440], [0, 144, -1440, 672, -1344], [0, 192, -1344, 480, -1296], [0, 384, -1296, 480, -1248], [0, 240, -1248, 384, -1200], [0, 528, -1248, 576, -1200], [0, 144, -1200, 672, -1104], [0, 48, -1104, 96, -1056], [0, 144, -1104, 528, -1056], [0, 0, -1056, 48, -1008], [0, 96, -1056, 480, -1008], [0, 576, -1056, 624, -960], [0, -288, -960, -48, -912], [0, 0, -1008, 480, -912], [0, 528, -960, 672, -912], [0, -384, -912, 672, -768], [0, -384, -768, 576, -720], [0, -384, -720, 432, -672], [0, -384, -672, -192, -624], [0, -384, -624, -240, -576], [0, -384, -576, -192, -528], [0, -144, -672, -96, -528], [0, 240, -672, 432, -528], [0, 480, -576, 576, -528], [0, -432, -528, -192, -480], [0, 240, -528, 576, -480], [0, -384, -480, -240, -432], [0, 192, -480, 576, -432], [0, -336, -432, -240, -384], [0, 240, -432, 624, -288], [0, 192, -288, 336, -240], [0, 432, -288, 624, -240], [0, 192, -240, 240, -192], [0, 480, -240, 576, -192]] }, { id: "tp_south_zone", label: [0, 48, -2160], rects: [[0, 240, -3264, 384, -3120], [0, -48, -3120, 144, -3072], [0, 192, -3120, 528, -3072], [0, -144, -3072, 624, -3024], [0, -192, -3024, 624, -2976], [0, -144, -2976, 624, -2928], [0, -192, -2928, 624, -2880], [0, -192, -2880, -48, -2784], [0, 0, -2880, 624, -2784], [0, -192, -2784, 624, -2736], [0, -144, -2736, 624, -2640], [0, -192, -2640, 624, -2592], [0, -192, -2592, -48, -2544], [0, 0, -2592, 624, -2544], [0, -192, -2544, 624, -2448], [0, -192, -2448, 672, -2400], [0, -192, -2400, 624, -2352], [0, -480, -2352, 624, -2256], [0, -528, -2256, -48, -2208], [0, 0, -2256, 672, -2208], [0, -528, -2208, 624, -2112], [0, -480, -2112, 672, -2016], [0, -480, -2016, -192, -1968], [0, -48, -2016, 528, -1968], [0, 576, -2016, 672, -1968], [0, -432, -1968, -384, -1920]] }, { id: "tp_east_zone", label: [0, 1272, 840], rects: [[0, 1296, 288, 1392, 336], [0, 912, 336, 1056, 384], [0, 1104, 336, 1392, 384], [0, 912, 384, 1584, 432], [0, 912, 432, 1632, 480], [0, 960, 480, 1584, 528], [0, 912, 528, 1584, 576], [0, 912, 576, 1152, 624], [0, 1200, 576, 1296, 624], [0, 912, 624, 1104, 672], [0, 1392, 576, 1632, 672], [0, 1344, 672, 1584, 720], [0, 912, 672, 1152, 768], [0, 1344, 720, 1632, 768], [0, 912, 768, 1632, 912], [0, 720, 912, 1632, 1008], [0, 720, 1008, 1584, 1056], [0, 672, 1056, 960, 1104], [0, 1008, 1056, 1536, 1104], [0, 720, 1104, 960, 1152], [0, 1056, 1104, 1440, 1152], [0, 768, 1152, 912, 1200], [0, 1104, 1152, 1392, 1248], [0, 1152, 1248, 1344, 1296], [0, 1200, 1296, 1296, 1344]] }, { id: "bridge_zone", label: [0, -120, -1416], rects: [[0, -288, -1536, -192, -1488], [0, -384, -1488, 144, -1344], [0, -336, -1344, 192, -1296], [0, -336, -1296, -144, -1248], [0, -96, -1296, 288, -1248], [0, -336, -1248, 240, -1200], [0, -336, -1200, 144, -1104], [0, -384, -1104, 48, -1056], [0, 96, -1104, 144, -1056], [0, -336, -1056, 0, -1008], [0, 48, -1056, 96, -1008], [0, -384, -1008, 0, -960], [0, -336, -960, -288, -912]] }, { id: "warehouse_top_zone", label: [0, -576, -1272], rects: [[0, -768, -1536, -624, -1488], [0, -768, -1488, -576, -1440], [0, -528, -1488, -432, -1440], [0, -864, -1440, -816, -1392], [0, -768, -1440, -720, -1392], [0, -624, -1440, -576, -1392], [0, -528, -1440, -480, -1392], [0, -864, -1392, -576, -1344], [0, -528, -1392, -432, -1344], [0, -864, -1344, -816, -1296], [0, -768, -1344, -576, -1296], [0, -384, -1344, -336, -1296], [0, -816, -1296, -336, -1248], [0, -816, -1248, -480, -1200], [0, -432, -1248, -336, -1200], [0, -912, -1200, -864, -1152], [0, -816, -1200, -768, -1152], [0, -720, -1200, -480, -1152], [0, -864, -1152, -672, -1104], [0, -432, -1152, -336, -1104], [0, -912, -1104, -816, -1056], [0, -768, -1104, -720, -1056], [0, -528, -1104, -480, -1056], [0, -432, -1104, -384, -1056], [0, -912, -1056, -720, -1008], [0, -528, -1056, -336, -1008]] }, { id: "warehouse_bottom_zone", label: [0, -768, -840], rects: [[0, -960, -1488, -912, -1440], [0, -432, -1488, -384, -1440], [0, -816, -1488, -768, -1392], [0, -720, -1440, -624, -1392], [0, -480, -1440, -384, -1392], [0, -1104, -1440, -864, -1344], [0, -576, -1488, -528, -1344], [0, -432, -1392, -384, -1344], [0, -1056, -1344, -864, -1296], [0, -816, -1344, -768, -1296], [0, -576, -1344, -384, -1296], [0, -480, -1248, -432, -1200], [0, -960, -1296, -912, -1152], [0, -864, -1296, -816, -1152], [0, -768, -1200, -720, -1152], [0, -480, -1200, -336, -1152], [0, -1008, -1152, -960, -1104], [0, -672, -1152, -432, -1104], [0, -1056, -1104, -912, -1056], [0, -816, -1104, -768, -1056], [0, -480, -1104, -432, -1056], [0, -1104, -1056, -912, -1008], [0, -720, -1104, -528, -1008], [0, -1104, -1008, -384, -960], [0, -1056, -960, -336, -912], [0, -1152, -912, -768, -864], [0, -720, -912, -384, -864], [0, -1152, -864, -384, -816], [0, -672, -816, -384, -768], [0, -1104, -816, -720, -720], [0, -672, -768, -432, -720], [0, -1104, -720, -864, -672], [0, -816, -720, -768, -672], [0, -720, -720, -384, -672], [0, -1104, -672, -384, -624], [0, -1056, -624, -384, -576], [0, -1056, -576, -624, -528], [0, -576, -576, -432, -528], [0, -1056, -528, -816, -480], [0, -768, -528, -432, -480], [0, -1104, -480, -528, -432], [0, -1152, -432, -528, -384], [0, -1152, -384, -960, -336], [0, -576, -384, -528, -336]] }, { id: "wnuen_bridge_zone", label: [0, 1080, -1464], rects: [[0, 672, -1584, 720, -1536], [0, 864, -1584, 960, -1536], [0, 1200, -1584, 1296, -1536], [0, 672, -1536, 1344, -1488], [0, 624, -1488, 1536, -1440], [0, 672, -1440, 1536, -1392], [0, 672, -1392, 1056, -1344], [0, 1200, -1392, 1296, -1344], [0, 1344, -1392, 1488, -1344], [0, 480, -1344, 624, -1296], [0, 720, -1344, 768, -1296], [0, 816, -1344, 1056, -1296], [0, 288, -1296, 384, -1248], [0, 480, -1296, 672, -1248], [0, 384, -1248, 528, -1200], [0, 576, -1248, 672, -1200], [0, 816, -1296, 1008, -1104], [0, 528, -1104, 1056, -1056], [0, 624, -1056, 1056, -1008], [0, 480, -1056, 576, -960], [0, 624, -1008, 1008, -960], [0, 480, -960, 528, -912], [0, 672, -960, 1008, -912]] }, { id: "wnuen_zone", label: [0, 936, 144], rects: [[0, 1056, -1056, 1200, -1008], [0, 1008, -1008, 1248, -912], [0, 672, -912, 1248, -816], [0, 768, -816, 1248, -768], [0, 576, -768, 1248, -720], [0, 528, -720, 1056, -624], [0, 672, -624, 1056, -576], [0, 624, -576, 1008, -528], [0, 624, -528, 864, -480], [0, 624, -480, 1056, -384], [0, 624, -384, 1104, -288], [0, 624, -288, 1056, -240], [0, 576, -240, 1056, -144], [0, 528, -144, 1056, -96], [0, 576, -96, 1056, -48], [0, 672, -48, 1056, 0], [0, 624, 0, 1200, 48], [0, 624, 48, 1008, 96], [0, 1056, 48, 1248, 96], [0, 576, 96, 1296, 192], [0, 576, 192, 1248, 240], [0, 624, 240, 1248, 288], [0, 672, 288, 960, 336], [0, 1008, 288, 1248, 336], [0, 864, 336, 912, 384], [0, 1056, 336, 1104, 384]] }, { id: "outside_west_zone", label: [0, -720, -96], rects: [[0, -480, -480, -384, -432], [0, -528, -432, -336, -384], [0, -960, -384, -576, -336], [0, -528, -384, -288, -336], [0, -960, -336, -336, -288], [0, -960, -288, -384, -240], [0, -960, -240, -432, -144], [0, -1008, -144, -432, -48], [0, -1008, -48, -720, 0], [0, -672, -48, -480, 0], [0, -816, 0, -768, 48], [0, -672, 0, -432, 48], [0, -672, 48, -576, 96], [0, -528, 48, -480, 96]] }, { id: "outside_east_zone", label: [0, 624, 432], rects: [[0, 336, -288, 384, -240], [0, 240, -240, 384, -192], [0, 192, -192, 432, -144], [0, 240, -144, 432, -48], [0, 192, -48, 384, 0], [0, 192, 0, 528, 48], [0, 240, 48, 576, 144], [0, 336, 144, 576, 240], [0, 384, 240, 576, 384], [0, 672, 336, 864, 384], [0, 336, 384, 912, 480], [0, 336, 480, 960, 528], [0, 336, 528, 912, 576], [0, 384, 576, 432, 624], [0, 528, 576, 912, 624], [0, 576, 624, 912, 672], [0, 720, 672, 864, 720], [0, 768, 720, 816, 768]] }, { id: "receiver_zone", label: [0, -144, 504], rects: [[0, -192, -672, -144, -624], [0, -240, -624, -144, -576], [0, -192, -576, -144, -528], [0, -96, -672, 240, -528], [0, -192, -528, 48, -480], [0, 96, -528, 240, -480], [0, -240, -480, 144, -384], [0, -288, -384, 240, -336], [0, -336, -336, 48, -288], [0, 96, -336, 240, -288], [0, -384, -288, 192, -240], [0, -432, -240, 144, -192], [0, -432, -192, -192, -144], [0, -144, -192, 192, -144], [0, -432, -144, 240, -48], [0, -480, -48, 192, 0], [0, -432, 0, 192, 48], [0, -576, 48, -528, 96], [0, -480, 48, 240, 96], [0, -768, 96, 240, 144], [0, -768, 144, 336, 192], [0, -768, 192, -576, 240], [0, -528, 192, 336, 240], [0, -432, 240, 384, 336], [0, -384, 336, 384, 384], [0, -336, 384, 336, 432], [0, -624, 432, 336, 576], [0, -624, 576, -192, 624], [0, -96, 576, 0, 624], [0, 48, 576, 384, 624], [0, -576, 624, -528, 672], [0, -432, 624, -192, 672], [0, 144, 624, 384, 672], [0, -432, 672, -336, 720], [0, 192, 672, 240, 720]] }], doors: [{ kind: "door", cost: 1250, at: [0, 265, -1970], rooms: [1, 2] }, { kind: "power", cost: 1e4, at: [0, 315, -234], rooms: [10, 1] }, { kind: "door", cost: 750, at: [0, -443, -98], rooms: [11, 9] }, { kind: "door", cost: 750, at: [0, 359, 304], rooms: [11, 10] }, { kind: "door", cost: 750, at: [0, -790, -364], rooms: [9, 6] }, { kind: "door", cost: 750, at: [0, 756, 348], rooms: [8, 10] }, { kind: "door", cost: 1250, at: [0, 1145, 326], rooms: [8, 3] }, { kind: "door", cost: 750, at: [0, -877, -1200], rooms: [5, 0] }, { kind: "power", cost: 1e4, at: [0, -353, -412], rooms: [9, 1] }, { kind: "door", cost: 750, at: [0, 356, 304], rooms: [11, 10] }, { kind: "debris", cost: 1e3, at: [0, 1050, -1007], rooms: [8, 7] }, { kind: "debris", cost: 1e3, at: [0, -422, -1043], rooms: [5, 6] }], pois: [{ kind: "perk", id: "specialty_fastreload", at: [0, -364, -794] }, { kind: "perk", id: "specialty_quickrevive", at: [0, -485, -2067] }, { kind: "perk", id: "specialty_armorvest", at: [0, 673, -1421] }, { kind: "perk", id: "specialty_rof", at: [0, -365, -1076] }, { kind: "perk", id: "specialty_additionalprimaryweapon", at: [0, -1089, -1366] }, { kind: "pap", id: null, at: [0, -61, 577] }, { kind: "power", id: null, at: [0, 532, -1764] }, { kind: "box", id: null, at: [0, -1233, -1542] }, { kind: "box", id: null, at: [0, 1177, 957] }, { kind: "box", id: null, at: [0, 572, -1553] }, { kind: "box", id: null, at: [0, -1030, -1422] }, { kind: "box", id: null, at: [0, 657, -365] }, { kind: "box", id: null, at: [0, 11, -2450] }] };

  // src/map/plans/shangrila.json
  var shangrila_default = { v: 1, slug: "shangrila", sig: "z13d13c257302", floors: [{ name: "Caves", below: -260 }, { name: "Temple", below: null }], rooms: [{ id: "caves_water_zone", label: [0, -312, -1104], rects: [[0, -672, -1584, -624, -1536], [0, -720, -1536, -576, -1488], [0, -768, -1488, -432, -1440], [0, -1008, -1440, -384, -1392], [0, -1056, -1392, -288, -1296], [0, -1152, -1296, -144, -1248], [0, -1488, -1248, -1392, -1200], [0, -1296, -1248, 0, -1200], [0, -1488, -1200, -768, -1152], [0, -720, -1200, 48, -1152], [0, -1536, -1152, -864, -1104], [0, -1488, -1104, -864, -1056], [0, -720, -1152, 96, -1056], [0, -1440, -1056, -1248, -1008], [0, -1104, -1056, -912, -1008], [0, -720, -1056, -240, -1008], [0, -192, -1056, -144, -1008], [0, -96, -1056, 48, -1008], [0, -1104, -1008, -960, -912], [0, -1152, -912, -960, -864], [0, -1104, -864, -1008, -816]] }, { id: "power_room_zone", label: [0, 504, -312], rects: [[0, -672, -1008, -480, -912], [0, -672, -912, -432, -864], [0, -672, -864, -384, -816], [0, -672, -816, -240, -768], [0, -672, -768, -192, -720], [0, -672, -720, -240, -672], [0, -480, -672, -240, -624], [0, -384, -624, -192, -576], [0, -384, -576, 96, -528], [0, 144, -576, 384, -528], [0, -480, -528, 432, -480], [0, -528, -480, 432, -432], [0, -576, -432, 96, -384], [0, 144, -432, 240, -384], [0, -576, -384, -192, -336], [0, -576, -336, -240, -288], [0, 288, -432, 720, -192], [0, 384, -192, 528, -144], [0, -576, -288, -336, -48], [0, 336, -144, 576, -48], [0, -528, -48, -336, 0], [0, -96, -384, 96, 0], [0, 336, -48, 528, 0], [0, -576, 0, 144, 48], [0, 336, 0, 576, 48], [0, -528, 48, 144, 96], [0, 336, 48, 528, 96], [0, -576, 96, 576, 144], [0, -528, 144, 96, 192], [0, 144, 144, 576, 192], [0, -288, 192, 528, 240], [0, -96, 240, 96, 288], [0, 336, 240, 432, 288]] }, { id: "caves3_zone", label: [0, 720, -792], rects: [[0, 576, -1056, 624, -1008], [0, 480, -1008, 624, -960], [0, 480, -960, 720, -912], [0, 432, -912, 768, -864], [0, 816, -912, 960, -864], [0, 432, -864, 1008, -720], [0, 480, -720, 528, -672], [0, 576, -720, 720, -672], [0, 864, -720, 1008, -672], [0, 576, -672, 1008, -624], [0, 528, -624, 912, -528], [0, 480, -528, 912, -480], [0, 480, -480, 864, -432]] }, { id: "caves2_zone", label: [0, 576, -1320], rects: [[0, 288, -1824, 384, -1776], [0, 240, -1776, 432, -1632], [0, 192, -1632, 480, -1584], [0, 528, -1632, 576, -1584], [0, 624, -1632, 672, -1584], [0, 192, -1584, 720, -1536], [0, 144, -1536, 720, -1488], [0, 96, -1488, 720, -1440], [0, 144, -1440, 720, -1392], [0, 96, -1392, 720, -1344], [0, 768, -1392, 816, -1344], [0, 144, -1344, 1008, -1296], [0, 192, -1296, 336, -1248], [0, 480, -1296, 1008, -1248], [0, 240, -1248, 336, -1200], [0, 528, -1248, 1008, -1200], [0, 432, -1200, 1008, -1152], [0, 432, -1152, 672, -1104], [0, 384, -1104, 576, -1008], [0, 384, -1008, 480, -960]] }, { id: "waterfall_upper_zone", label: [1, -528, -2040], rects: [[1, -2064, -2256, -2016, -2208], [1, -720, -2208, 0, -2160], [1, -2112, -2208, -1968, -2112], [1, -912, -2160, 0, -2112], [1, -2112, -2112, -1824, -2064], [1, -960, -2112, 0, -2064], [1, -2112, -2064, -1776, -2016], [1, -1584, -2064, -1440, -2016], [1, -1056, -2064, 0, -2016], [1, -2160, -2016, -1440, -1968], [1, -1104, -2016, -720, -1968], [1, -2448, -1968, -2400, -1920], [1, -2208, -1968, -1392, -1920], [1, -1104, -1968, -816, -1920], [1, -2496, -1920, -2352, -1872], [1, -2208, -1920, -1344, -1872], [1, -1968, -1872, -1920, -1824], [1, -1872, -1872, -1776, -1824], [1, -1728, -1872, -1296, -1824], [1, -1152, -1920, -912, -1824], [1, -2496, -1872, -2304, -1776], [1, -2256, -1872, -2016, -1776], [1, -1632, -1824, -1296, -1776], [1, -2544, -1776, -2352, -1728], [1, -2304, -1776, -2064, -1728], [1, -1488, -1776, -1200, -1728], [1, -1152, -1824, -960, -1728], [1, -912, -1776, -864, -1728], [1, -2544, -1728, -2400, -1680], [1, -2352, -1728, -2064, -1680], [1, -1440, -1728, -1200, -1680], [1, -2496, -1680, -2064, -1632], [1, -1344, -1680, -1200, -1632], [1, -1152, -1728, -816, -1632], [1, -2496, -1632, -1968, -1584], [1, -1344, -1632, -864, -1584], [1, -2496, -1584, -2208, -1536], [1, -2160, -1584, -1968, -1536], [1, -1296, -1584, -864, -1536], [1, -2160, -1536, -1920, -1488], [1, -1248, -1536, -1008, -1488], [1, -2544, -1536, -2256, -1440], [1, -2160, -1488, -1872, -1440], [1, -2496, -1440, -2256, -1392], [1, -2112, -1440, -1824, -1392], [1, -1248, -1488, -960, -1392], [1, -2352, -1392, -2304, -1344], [1, -2064, -1392, -1776, -1344], [1, -1248, -1392, -912, -1344], [1, -2016, -1344, -1728, -1296], [1, -1968, -1296, -1680, -1248], [1, -1920, -1248, -1632, -1200], [1, -1872, -1200, -1536, -1152], [1, -1824, -1152, -1440, -1104], [1, -1776, -1104, -1392, -1056], [1, -1728, -1056, -1392, -1008], [1, -1680, -1008, -1392, -960], [1, -1680, -960, -1200, -912], [1, -1680, -912, -1248, -816], [1, -1680, -816, -1200, -768], [1, -1680, -768, -1248, -720], [1, -1632, -720, -1584, -672], [1, -1536, -720, -1392, -672], [1, -1344, -720, -1248, -672], [1, -1584, -672, -1200, -624], [1, -1584, -624, -1248, -576], [1, -1536, -576, -1392, -528], [1, -1344, -576, -1248, -528], [1, -1632, -528, -1392, -432], [1, -1680, -432, -1392, -384], [1, -1632, -384, -1536, -336], [0, -96, -2208, 192, -2112], [0, -96, -2112, 144, -2064], [0, -48, -2064, 144, -2016], [0, -2496, -2016, -2352, -1968], [0, -2496, -1968, -2304, -1920], [0, -2448, -1920, -2304, -1872], [0, -2400, -1872, -2304, -1824]] }, { id: "waterfall_tunnel_a_zone", label: [0, -2136, -2088], rects: [[0, -1968, -2304, -1824, -2256], [0, -2256, -2256, -2064, -2208], [0, -2016, -2256, -1776, -2208], [0, -2304, -2208, -1824, -2160], [0, -2400, -2160, -2304, -2112], [0, -2256, -2160, -1824, -2112], [0, -2448, -2112, -1824, -2064], [0, -2448, -2064, -2160, -2016], [0, -2352, -2016, -2256, -1968]] }, { id: "waterfall_tunnel_zone", label: [0, -1632, -2112], rects: [[0, -1776, -2256, -1728, -2208], [0, -1824, -2208, -1488, -2160], [0, -1824, -2160, -1440, -2064], [0, -1776, -2064, -1440, -2016], [0, -1632, -2016, -1440, -1968], [0, -1536, -1968, -1344, -1872]] }, { id: "waterfall_lower_zone", label: [0, -1656, -1728], rects: [[0, -1536, -1872, -1344, -1824], [0, -1728, -1824, -1344, -1776], [0, -1968, -1776, -1344, -1680], [0, -1968, -1680, -1488, -1632], [0, -1440, -1680, -1392, -1632], [0, -1920, -1632, -1872, -1584], [0, -1824, -1632, -1776, -1584], [0, -1536, -1632, -1392, -1584], [0, -1968, -1584, -1728, -1488], [0, -1680, -1536, -1632, -1488], [0, -1584, -1584, -1344, -1488], [0, -1968, -1488, -1392, -1440], [0, -2016, -1440, -1392, -1392], [0, -1968, -1392, -1872, -1344], [0, -1824, -1392, -1776, -1344], [0, -1728, -1392, -1392, -1344], [0, -1872, -1344, -1392, -1296], [0, -1872, -1296, -1728, -1248], [0, -1680, -1296, -1392, -1248], [0, -1872, -1248, -1488, -1200], [0, -1728, -1200, -1488, -1152], [0, -1728, -1152, -1584, -1104]] }, { id: "caves1_zone", label: [0, 1296, -1080], rects: [[0, 192, -2208, 1104, -2160], [0, 192, -2160, 1200, -2112], [0, 144, -2112, 1248, -2064], [0, 144, -2064, 1296, -2016], [0, 1056, -2016, 1296, -1968], [0, 1104, -1968, 1344, -1920], [0, 1152, -1920, 1344, -1824], [0, 1152, -1824, 1392, -1776], [0, 1200, -1776, 1392, -1584], [0, 1440, -1632, 1488, -1584], [0, 1056, -1584, 1536, -1440], [0, 1008, -1440, 1632, -1392], [0, 1392, -1392, 1632, -1344], [0, 1008, -1392, 1344, -1200], [0, 1392, -1344, 1584, -1200], [0, 1008, -1200, 1632, -1152], [0, 960, -1152, 1632, -1008], [0, 1008, -1008, 1200, -960], [0, 1296, -1008, 1344, -960], [0, 1392, -1008, 1440, -960], [0, 1056, -960, 1152, -912]] }, { id: "cave_tunnel_zone", label: [0, 1944, -1248], rects: [[1, 1680, -1632, 1872, -1584], [1, 1680, -1584, 1968, -1536], [1, 1680, -1536, 2016, -1488], [1, 1680, -1488, 2064, -1440], [1, 1776, -1440, 2064, -1392], [1, 1872, -1392, 2064, -1344], [0, 2016, -1440, 2208, -1392], [0, 1872, -1392, 2208, -1344], [0, 1824, -1344, 2208, -1296], [0, 1728, -1248, 1776, -1200], [0, 1824, -1296, 2064, -1200], [0, 1872, -1200, 2016, -1152], [0, 1632, -1200, 1824, -1104], [0, 1632, -1104, 1776, -1008]] }, { id: "waterfall_upper1_zone", label: [1, -816, -864], rects: [[1, -1248, -1344, -912, -1248], [1, -1296, -1248, -816, -1152], [1, -1248, -1152, -816, -1104], [1, -1200, -1104, -1104, -1056], [1, -1056, -1104, -960, -1056], [1, -912, -1104, -816, -1056], [1, -1248, -1056, -768, -1008], [1, -1248, -1008, -960, -960], [1, -1200, -960, -1104, -912], [1, -1056, -960, -960, -912], [1, -912, -1008, -816, -912], [1, -1248, -912, -384, -816], [1, -1200, -816, -1104, -768], [1, -1056, -816, -960, -768], [1, -912, -816, -384, -768], [1, -1248, -768, -384, -720], [1, -1248, -720, -576, -672], [1, -528, -720, -480, -672], [1, -432, -720, -384, -672], [1, -1200, -672, -1104, -624], [1, -1056, -672, -576, -624], [1, -1248, -624, -576, -576], [1, -1248, -576, -672, -528], [1, -1200, -528, -1104, -480], [1, -1056, -528, -672, -480], [1, -1248, -480, -768, -432], [1, -1248, -432, -816, -384], [1, -1056, -384, -912, -336], [1, -1008, -336, -960, -288]] }, { id: "pressure_plate_zone", label: [1, 1176, -816], rects: [[1, 1056, -2160, 1104, -2112], [1, 1008, -2112, 1152, -2064], [1, 720, -2064, 1152, -2016], [1, 672, -2016, 1200, -1968], [1, 624, -1968, 1296, -1920], [1, 624, -1920, 1344, -1872], [1, 624, -1872, 1392, -1824], [1, 672, -1824, 720, -1776], [1, 1104, -1824, 1392, -1776], [1, 768, -1824, 960, -1728], [1, 1152, -1776, 1440, -1728], [1, 1200, -1728, 1440, -1632], [1, 720, -1728, 960, -1584], [1, 1200, -1632, 1680, -1584], [1, 720, -1584, 912, -1536], [1, 1248, -1584, 1680, -1536], [1, 720, -1536, 960, -1488], [1, 1200, -1536, 1680, -1488], [1, 720, -1488, 1008, -1440], [1, 1056, -1488, 1104, -1440], [1, 1152, -1488, 1680, -1440], [1, 720, -1440, 1440, -1392], [1, 720, -1392, 1392, -1344], [1, 768, -1344, 1392, -1296], [1, 720, -1296, 1392, -1248], [1, 720, -1248, 1008, -1200], [1, 768, -1200, 912, -1152], [1, 1200, -1248, 1392, -1152], [1, 1248, -1152, 1440, -1104], [1, 1488, -1152, 1536, -1104], [1, 720, -1152, 960, -1056], [1, 1248, -1104, 1584, -1056], [1, 480, -1056, 720, -1008], [1, 768, -1056, 912, -1008], [1, 1248, -1056, 1632, -1008], [1, 432, -1008, 960, -960], [1, 1008, -1008, 1152, -960], [1, 1200, -1008, 1632, -960], [1, 432, -960, 1200, -912], [1, 1248, -960, 1632, -912], [1, 480, -912, 1632, -864], [1, 720, -864, 1632, -768], [1, 720, -768, 1392, -720], [1, 672, -720, 1392, -672], [1, 624, -672, 960, -624], [1, 1488, -768, 1632, -624], [1, 624, -624, 1056, -576], [1, 672, -576, 1104, -528], [1, 1152, -672, 1392, -528], [1, 720, -528, 1392, -480], [1, 816, -480, 1392, -432], [1, 816, -432, 1296, -384], [1, 912, -384, 1296, -336], [1, 960, -336, 1152, -288], [1, 1200, -336, 1248, -288], [1, 1008, -288, 1200, -240], [1, 1056, -240, 1152, -192]] }, { id: "temple_start_zone", label: [1, 0, 168], rects: [[1, 96, -1440, 240, -1296], [1, -192, -1296, 240, -1248], [1, -288, -1248, 288, -1200], [1, -384, -1200, 384, -1056], [1, -432, -1056, -144, -1008], [1, -48, -1056, 0, -1008], [1, -384, -1008, -192, -960], [1, -384, -960, -144, -912], [1, 192, -1056, 384, -912], [1, -384, -912, 384, -720], [1, -336, -720, -288, -672], [1, -240, -720, 192, -672], [1, 240, -720, 336, -672], [1, -96, -672, 96, -576], [1, 192, -672, 384, -576], [1, -432, -672, -240, -480], [1, -96, -576, 384, -480], [1, -432, -480, 384, -384], [1, -384, -384, 384, -336], [1, -384, -336, 192, -288], [1, 240, -336, 384, -288], [1, -384, -288, 432, -240], [1, -432, -240, 144, -192], [1, 192, -240, 384, -192], [1, 240, -192, 432, -144], [1, -432, -192, -192, -96], [1, 288, -144, 384, -96], [1, -144, -192, 144, 528], [1, -96, 528, 96, 624]] }], doors: [{ kind: "door", cost: 1e3, at: [0, 975, -1258], rooms: [3, 8] }, { kind: "door", cost: 1e3, at: [0, -1420, -1836], rooms: [7, 6] }, { kind: "door", cost: 1e3, at: [1, -2352, -1998], rooms: [4, 5] }, { kind: "door", cost: 1e3, at: [0, 1622, -1100], rooms: [9, 8] }, { kind: "door", cost: 1e3, at: [1, 1676, -1538], rooms: [11, 9] }, { kind: "debris", cost: 750, at: [1, -388, -806], rooms: [10, 12] }, { kind: "debris", cost: 750, at: [1, -542, -802], rooms: [10, 12] }, { kind: "debris", cost: 1250, at: [0, -532, -838], rooms: [1, 0] }, { kind: "debris", cost: 1e3, at: [0, -1185, -1156], rooms: [0, 7] }, { kind: "debris", cost: 1e3, at: [0, -1509, -1216], rooms: [7, 0] }, { kind: "debris", cost: 750, at: [1, 589, -957], rooms: [11, 12] }, { kind: "debris", cost: 750, at: [1, 415, -952], rooms: [12, 11] }, { kind: "debris", cost: 1250, at: [0, 600, -326], rooms: [1, 2] }], pois: [{ kind: "perk", id: "specialty_rof", at: [0, -332, -1043] }, { kind: "perk", id: "specialty_flakjacket", at: [0, 429, -846] }, { kind: "perk", id: "specialty_deadshot", at: [0, -535, 46] }, { kind: "perk", id: "specialty_longersprint", at: [0, 175, -1583] }, { kind: "perk", id: "specialty_quickrevive", at: [1, -9, -942] }, { kind: "perk", id: "specialty_fastreload", at: [1, -1284, -933] }, { kind: "perk", id: "specialty_armorvest", at: [1, 1384, -1146] }, { kind: "perk", id: "specialty_additionalprimaryweapon", at: [0, -1352, -1437] }, { kind: "pap", id: null, at: [1, 0, 472] }, { kind: "power", id: null, at: [0, -117, 248] }, { kind: "power", id: null, at: [0, 137, 243] }, { kind: "box", id: null, at: [0, -32, -574] }, { kind: "box", id: null, at: [0, -1794, -1768] }, { kind: "box", id: null, at: [0, 1216, -993] }, { kind: "box", id: null, at: [1, -3, -1255] }] };

  // src/map/plans/shinonuma.json
  var shinonuma_default = { v: 1, slug: "shinonuma", sig: "z11d11c812326", floors: [{ name: "Ground", below: -570 }, { name: "Upstairs", below: null }], rooms: [{ id: "southwest_building", label: [0, 7656, -1272], rects: [[0, 7632, -1728, 7680, -1680], [0, 7728, -1728, 7776, -1680], [0, 7536, -1680, 7872, -1632], [0, 7440, -1632, 7920, -1584], [0, 7392, -1584, 7968, -1536], [0, 7392, -1536, 8016, -1488], [0, 7296, -1488, 8016, -1440], [0, 7248, -1440, 7728, -1392], [0, 7872, -1440, 8016, -1392], [0, 7200, -1392, 8064, -1344], [0, 7152, -1344, 8112, -1296], [0, 7152, -1296, 8160, -1248], [0, 7152, -1248, 8112, -1200], [0, 7152, -1200, 7728, -1152], [0, 7776, -1200, 8064, -1152], [0, 7200, -1152, 8064, -1104], [0, 7248, -1104, 8016, -1056], [0, 7296, -1056, 7968, -1008], [0, 7344, -1008, 7920, -960], [0, 7392, -960, 7824, -912], [0, 7440, -912, 7776, -864], [0, 7488, -864, 7728, -816], [0, 7536, -816, 7680, -768]] }, { id: "southeast_building", label: [0, 12504, -1320], rects: [[0, 12192, -1632, 12336, -1584], [0, 12528, -1632, 12624, -1584], [0, 12528, -1584, 12720, -1536], [0, 12192, -1584, 12384, -1488], [0, 12432, -1536, 12768, -1488], [0, 12192, -1488, 12816, -1440], [0, 12144, -1440, 12864, -1200], [0, 12192, -1200, 12816, -1152], [0, 12240, -1152, 12816, -1104], [0, 12240, -1104, 12768, -1056], [0, 12288, -1056, 12480, -1008], [0, 12528, -1056, 12624, -1008], [0, 12288, -1008, 12432, -960], [0, 12336, -960, 12432, -912]] }, { id: "northwest_building", label: [0, 8472, 3288], rects: [[0, 8448, 2880, 8544, 2928], [0, 8400, 2928, 8592, 2976], [0, 8352, 2976, 8544, 3024], [0, 8304, 3024, 8640, 3072], [0, 8256, 3072, 8736, 3120], [0, 8208, 3120, 8736, 3168], [0, 8160, 3168, 8784, 3216], [0, 8112, 3216, 8832, 3360], [0, 8064, 3360, 8112, 3408], [0, 8160, 3360, 8832, 3408], [0, 8688, 3408, 8784, 3456], [0, 8016, 3408, 8640, 3552], [0, 8064, 3552, 8592, 3648], [0, 8064, 3648, 8400, 3696], [0, 8160, 3696, 8352, 3744], [0, 8208, 3744, 8304, 3792]] }, { id: "northeast_building", label: [0, 11448, 3480], rects: [[0, 11616, 2976, 11760, 3024], [0, 11568, 3024, 11808, 3072], [0, 11520, 3072, 11856, 3120], [0, 11472, 3120, 11856, 3168], [0, 11424, 3168, 11808, 3216], [0, 11424, 3216, 11712, 3264], [0, 11328, 3264, 11472, 3312], [0, 11520, 3264, 11712, 3312], [0, 11280, 3312, 11760, 3360], [0, 11280, 3360, 11808, 3408], [0, 11232, 3408, 11808, 3456], [0, 11088, 3456, 11808, 3504], [0, 11136, 3504, 11760, 3552], [0, 11184, 3552, 11424, 3600], [0, 11472, 3552, 11760, 3600], [0, 11184, 3600, 11712, 3648], [0, 11280, 3648, 11712, 3696], [0, 11328, 3696, 11664, 3744], [0, 11376, 3744, 11616, 3792], [0, 11424, 3792, 11568, 3840]] }, { id: "southwest_outside", label: [0, 9e3, -384], rects: [[0, 8064, -1584, 8400, -1536], [0, 8448, -1584, 8496, -1536], [0, 8016, -1536, 8544, -1440], [0, 8880, -1488, 9024, -1440], [0, 8016, -1440, 8496, -1392], [0, 8544, -1440, 8592, -1392], [0, 8640, -1440, 8688, -1392], [0, 8064, -1392, 8448, -1344], [0, 8496, -1392, 8736, -1344], [0, 8832, -1440, 9072, -1344], [0, 8112, -1344, 8784, -1296], [0, 8880, -1344, 9120, -1296], [0, 8160, -1296, 8784, -1248], [0, 8832, -1296, 9120, -1248], [0, 8112, -1248, 8784, -1200], [0, 8832, -1248, 9168, -1200], [0, 8064, -1200, 8784, -1152], [0, 8832, -1200, 9216, -1152], [0, 8064, -1152, 9216, -1104], [0, 8016, -1104, 9264, -1056], [0, 7968, -1056, 9312, -1008], [0, 7920, -1008, 9312, -960], [0, 7824, -960, 9360, -912], [0, 7776, -912, 9360, -864], [0, 7728, -864, 8592, -816], [0, 8640, -864, 9408, -816], [0, 7680, -816, 8352, -768], [0, 7536, -768, 8352, -720], [0, 8736, -816, 9408, -720], [0, 7488, -720, 7776, -672], [0, 7824, -720, 8352, -672], [0, 8688, -720, 9024, -672], [0, 9072, -720, 9408, -672], [0, 7440, -672, 8256, -624], [0, 8448, -672, 8544, -624], [0, 8592, -672, 9456, -624], [0, 8352, -624, 9408, -576], [0, 7392, -624, 8160, -528], [0, 8304, -576, 8688, -528], [0, 8784, -576, 9456, -528], [0, 7440, -528, 8160, -480], [0, 8304, -528, 9456, -480], [0, 7440, -480, 8064, -432], [0, 8256, -480, 9456, -432], [0, 7776, -432, 8064, -384], [0, 8256, -432, 8448, -384], [0, 7776, -384, 8112, -336], [0, 8496, -432, 9504, -336], [0, 7824, -336, 8160, -288], [0, 8208, -384, 8352, -288], [0, 8208, -288, 8304, -240], [0, 8688, -336, 9504, -240], [0, 7872, -288, 8160, -192], [0, 8736, -240, 9456, -192], [0, 7680, -192, 7776, -144], [0, 7824, -192, 8112, -144], [0, 8160, -192, 8352, -144], [0, 7632, -144, 8352, -96], [0, 8736, -192, 9504, -96], [0, 7632, -96, 8400, -48], [0, 8592, -96, 9504, -48], [0, 7632, -48, 9504, 0], [0, 7632, 0, 9072, 48], [0, 9120, 0, 9552, 48], [0, 7632, 48, 8688, 96], [0, 8784, 48, 9552, 96], [0, 7680, 96, 8640, 144], [0, 8928, 96, 9600, 144], [0, 7776, 144, 8448, 192], [0, 9024, 144, 9600, 192], [0, 9024, 192, 9552, 240], [0, 9072, 240, 9504, 288], [0, 9120, 288, 9456, 336], [0, 9216, 336, 9360, 384], [1, 9456, 144, 9600, 240], [1, 9360, 240, 9552, 288], [1, 9360, 288, 9504, 336], [1, 9408, 336, 9504, 384]] }, { id: "southeast_outside", label: [0, 11616, -1296], rects: [[0, 11952, -1584, 12192, -1536], [0, 11568, -1536, 12192, -1488], [0, 11328, -1488, 12192, -1440], [0, 11232, -1440, 12144, -1392], [0, 11088, -1392, 12144, -1200], [0, 11088, -1200, 12192, -1152], [0, 11040, -1152, 12240, -1056], [0, 10992, -1056, 12288, -960], [0, 10944, -960, 12336, -912], [0, 10944, -912, 12384, -864], [0, 10896, -864, 12384, -768], [0, 10848, -768, 11376, -720], [0, 11616, -768, 12384, -720], [0, 10848, -720, 11328, -672], [0, 10800, -672, 11328, -624], [0, 11520, -720, 12336, -624], [0, 11424, -624, 12288, -576], [0, 10800, -624, 11280, -528], [0, 11424, -576, 11952, -528], [0, 12e3, -576, 12144, -528], [0, 10752, -528, 11280, -480], [0, 11376, -528, 11952, -480], [0, 10800, -480, 11232, -432], [0, 11328, -480, 11856, -432], [0, 10848, -432, 11232, -384], [0, 11328, -432, 11712, -384], [0, 10752, -384, 11232, -336], [0, 11280, -384, 11616, -336], [0, 10704, -336, 11184, -288], [0, 11232, -336, 11568, -288], [0, 10656, -288, 11184, -240], [0, 10656, -240, 11136, -192], [0, 11232, -288, 11520, -192], [0, 10704, -192, 11472, -144], [0, 10704, -144, 11424, -96], [0, 10704, -96, 11376, 0], [0, 10704, 0, 11328, 96], [0, 10752, 96, 11280, 240], [0, 10752, 240, 11232, 288], [0, 10752, 288, 11184, 336], [0, 10752, 336, 10944, 384], [0, 10704, 384, 10944, 432], [0, 10752, 432, 10944, 480]] }, { id: "northwest_outside", label: [0, 8784, 2376], rects: [[0, 9024, 1056, 9072, 1104], [0, 8976, 1104, 9552, 1248], [0, 8928, 1248, 9504, 1296], [0, 8928, 1296, 9552, 1344], [0, 8880, 1344, 9504, 1392], [0, 8880, 1392, 9552, 1488], [0, 8784, 1488, 9552, 1536], [0, 8736, 1536, 9456, 1584], [0, 8688, 1584, 9504, 1632], [0, 8688, 1632, 9600, 1680], [0, 8640, 1680, 9600, 1728], [0, 8592, 1728, 9600, 1776], [0, 8544, 1776, 9600, 1824], [0, 8496, 1824, 8928, 1872], [0, 9120, 1824, 9552, 1872], [0, 9120, 1872, 9600, 1920], [0, 8448, 1872, 8784, 1968], [0, 8352, 1968, 8832, 2016], [0, 9120, 1920, 9552, 2016], [0, 8352, 2016, 8880, 2064], [0, 9072, 2016, 9552, 2064], [0, 8256, 2064, 9552, 2112], [0, 8208, 2112, 9552, 2160], [0, 8064, 2160, 9552, 2208], [0, 8016, 2208, 9504, 2256], [0, 8016, 2256, 9456, 2304], [0, 8064, 2304, 9504, 2448], [0, 8112, 2448, 9024, 2496], [0, 9072, 2448, 9504, 2496], [0, 8112, 2496, 9504, 2544], [0, 8112, 2544, 9456, 2592], [0, 8256, 2592, 9456, 2736], [0, 8304, 2736, 9456, 2784], [0, 8256, 2784, 9456, 2832], [0, 8256, 2832, 9408, 2880], [0, 8256, 2880, 8448, 2928], [0, 8544, 2880, 9360, 2928], [0, 8160, 2928, 8400, 2976], [0, 8592, 2928, 9408, 2976], [0, 8160, 2976, 8352, 3024], [0, 8592, 2976, 9360, 3024], [0, 8160, 3024, 8304, 3072], [0, 8640, 3024, 9312, 3072], [0, 8736, 3072, 9264, 3168], [0, 8832, 3168, 9072, 3216], [0, 8832, 3216, 9024, 3264], [0, 8832, 3264, 8928, 3312]] }, { id: "northeast_outside", label: [0, 11064, 1920], rects: [[0, 10752, 1248, 10896, 1296], [0, 10752, 1296, 11040, 1344], [0, 10704, 1344, 11136, 1392], [0, 10656, 1392, 11232, 1440], [0, 10656, 1440, 11376, 1488], [0, 10656, 1488, 11424, 1536], [0, 10656, 1536, 11520, 1584], [0, 10608, 1584, 11568, 1632], [0, 10560, 1632, 11616, 1680], [0, 10512, 1680, 11664, 1728], [0, 10416, 1728, 11664, 1824], [0, 10416, 1824, 11712, 2016], [0, 10368, 2016, 11712, 2064], [0, 10416, 2064, 11664, 2112], [0, 10464, 2112, 10848, 2160], [0, 10896, 2112, 11664, 2160], [0, 10464, 2160, 11664, 2208], [0, 10512, 2208, 11664, 2256], [0, 10512, 2256, 11616, 2400], [0, 10560, 2400, 11568, 2448], [0, 10512, 2448, 11568, 2496], [0, 10560, 2496, 11568, 2592], [0, 10560, 2592, 11520, 2736], [0, 10608, 2736, 11472, 2832], [0, 10656, 2832, 11424, 2880], [0, 10608, 2880, 11424, 2976], [0, 10608, 2976, 11472, 3024], [0, 10656, 3024, 11472, 3072], [0, 10656, 3072, 11520, 3120], [0, 10656, 3120, 11472, 3168], [0, 10704, 3168, 11424, 3264], [0, 10704, 3264, 11328, 3312], [0, 10752, 3312, 11280, 3360], [0, 10800, 3360, 11280, 3408], [0, 10800, 3408, 11232, 3456], [0, 10800, 3456, 11088, 3504], [0, 10848, 3504, 10992, 3552]] }, { id: "center_building_combined", label: [0, 10152, 1032], rects: [[0, 9600, 144, 9984, 192], [0, 10224, 144, 10752, 192], [0, 9552, 192, 9984, 240], [0, 10128, 192, 10752, 240], [0, 9504, 240, 9984, 288], [0, 10080, 240, 10752, 288], [0, 9456, 288, 10752, 384], [0, 9456, 384, 10704, 432], [0, 9408, 432, 10752, 480], [0, 9408, 480, 10800, 576], [0, 9456, 576, 10800, 624], [0, 9408, 624, 10800, 672], [0, 9456, 672, 10800, 720], [0, 9408, 720, 10800, 816], [0, 9456, 816, 10800, 864], [0, 9504, 864, 10080, 912], [0, 9504, 912, 10032, 960], [0, 10128, 864, 10800, 960], [0, 9504, 960, 10800, 1104], [0, 9552, 1104, 10272, 1152], [0, 10368, 1104, 10800, 1152], [0, 9552, 1152, 10800, 1248], [0, 9504, 1248, 10752, 1296], [0, 9552, 1296, 10752, 1344], [0, 9504, 1344, 10704, 1392], [0, 9552, 1392, 9792, 1440], [0, 9984, 1392, 10032, 1440], [0, 10128, 1392, 10656, 1440]] }, { id: "center_building_upstairs_buy", label: [1, 10464, 1368], rects: [[1, 10176, 816, 10272, 864], [1, 10320, 816, 10368, 864], [1, 10608, 816, 10704, 864], [1, 10080, 864, 10704, 912], [1, 10032, 912, 10800, 960], [1, 10080, 960, 10800, 1056], [1, 10032, 1056, 10848, 1248], [1, 10080, 1248, 10848, 1488], [1, 10464, 1488, 10512, 1536], [1, 10656, 1488, 10896, 1536], [1, 10080, 1488, 10368, 1584], [1, 10656, 1536, 10848, 1584], [1, 10080, 1584, 10320, 1632], [1, 10656, 1584, 10896, 1680], [1, 10704, 1680, 10848, 1728], [0, 9792, 1392, 9984, 1440], [0, 9744, 1440, 10176, 1584], [0, 9792, 1584, 9984, 1632], [0, 10032, 1584, 10128, 1632]] }, { id: "center_building_upstairs", label: [1, 10104, 600], rects: [[1, 10224, 192, 10272, 240], [1, 9552, 240, 9840, 288], [1, 10176, 240, 10704, 288], [1, 9504, 288, 9888, 336], [1, 9504, 336, 9936, 384], [1, 9504, 384, 9888, 432], [1, 9936, 384, 10032, 432], [1, 10080, 288, 10704, 432], [1, 9504, 432, 10704, 480], [1, 9504, 480, 10368, 528], [1, 10416, 480, 10704, 528], [1, 9504, 528, 10704, 672], [1, 9504, 672, 10032, 720], [1, 10080, 672, 10704, 720], [1, 9504, 720, 10656, 768], [1, 9504, 768, 9600, 816], [1, 9648, 768, 9840, 816], [1, 9936, 768, 10032, 816], [1, 10080, 768, 10608, 816], [1, 10368, 816, 10608, 864]] }], doors: [{ kind: "door", cost: 1e3, at: [0, 9530, 259], rooms: [8, 4] }, { kind: "door", cost: 1e3, at: [0, 9556, 1270], rooms: [8, 6] }, { kind: "door", cost: 1e3, at: [0, 10704, 1359], rooms: [8, 7] }, { kind: "door", cost: 1e3, at: [0, 10741, 271], rooms: [5, 8] }, { kind: "door", cost: 1e3, at: [1, 10448, 851], rooms: [9, 10] }, { kind: "door", cost: 750, at: [0, 7966, -1046], rooms: [0, 4] }, { kind: "door", cost: 750, at: [0, 11321, 3301], rooms: [7, 3] }, { kind: "door", cost: 750, at: [0, 8316, 3030], rooms: [6, 2] }, { kind: "door", cost: 750, at: [0, 12238, -1087], rooms: [5, 1] }, { kind: "debris", cost: 1e3, at: [1, 10124, 373], rooms: [10, 8] }, { kind: "debris", cost: 1e3, at: [0, 9952, 372], rooms: [8, 10] }], pois: [{ kind: "perk", id: "specialty_rof", at: [0, 7846, -1191] }, { kind: "perk", id: "specialty_fastreload", at: [0, 12363, -1194] }, { kind: "perk", id: "specialty_armorvest", at: [0, 8523, 3200] }, { kind: "perk", id: "specialty_quickrevive", at: [0, 11678, 3606] }, { kind: "perk", id: "specialty_additionalprimaryweapon", at: [1, 9565, 327] }, { kind: "box", id: null, at: [0, 11759, 3339] }, { kind: "box", id: null, at: [0, 8170, 3384] }, { kind: "box", id: null, at: [0, 9657, 519] }, { kind: "box", id: null, at: [0, 12781, -1419] }, { kind: "box", id: null, at: [0, 7688, -1683] }, { kind: "box", id: null, at: [1, 10378, 1047] }] };

  // src/map/plans/verruckt.json
  var verruckt_default = { v: 1, slug: "verruckt", sig: "z9d13c179164", floors: [{ name: "Downstairs", below: 150 }, { name: "Upstairs", below: null }], rooms: [{ id: "south2_upstairs_zone", label: [1, -336, -552], rects: [[1, -624, -960, -432, -912], [1, 48, -960, 192, -912], [1, -672, -912, -384, -864], [1, -144, -912, 192, -864], [1, -672, -864, 240, -720], [1, -624, -720, 240, -672], [1, -624, -672, -48, -432], [1, -624, -432, -480, -384]] }, { id: "south_upstairs_zone", label: [1, 408, -360], rects: [[1, 0, -672, 240, -624], [1, 816, -720, 1008, -624], [1, 0, -624, 1008, -576], [1, 0, -576, 1104, -432], [1, -288, -432, 1104, -288], [1, -288, -288, 1056, -240], [1, 624, -240, 864, -144], [0, 864, -816, 960, -768], [0, 816, -768, 960, -672]] }, { id: "power_upstairs_zone", label: [1, -456, -288], rects: [[1, -480, -432, -288, -384], [1, -576, -384, -288, -336], [1, -624, -336, -288, -240], [1, -576, -240, -240, -144], [1, -576, -144, -288, -48], [1, -576, -48, -384, 0], [0, -768, -240, -672, -192], [0, -816, -192, -528, -144], [0, -768, -144, -480, -48], [0, -768, -48, -528, 0]] }, { id: "kitchen_upstairs_zone", label: [1, -720, 192], rects: [[1, -960, -48, -768, 0], [1, -624, -48, -576, 0], [1, -384, -48, -288, 0], [1, -1008, 0, -240, 96], [1, -384, 96, -288, 144], [1, -1008, 96, -432, 288], [1, -960, 288, -432, 432], [1, -912, 432, -864, 480], [1, -720, 432, -624, 480], [1, -576, 432, -432, 480]] }, { id: "north2_upstairs_zone", label: [1, -600, 624], rects: [[1, -864, 432, -720, 480], [1, -912, 480, -288, 528], [1, -960, 528, -288, 576], [1, -912, 576, -288, 672], [1, -960, 672, -288, 720], [1, -912, 720, -816, 768], [1, -720, 720, -336, 768], [1, -768, 768, -288, 864], [1, -768, 864, -384, 912], [1, -768, 912, -336, 960], [1, -768, 960, -384, 1008], [1, -720, 1008, -624, 1056]] }, { id: "north_upstairs_zone", label: [1, 216, 840], rects: [[0, -144, 576, -48, 672], [0, -144, 672, 48, 816], [1, 672, 240, 864, 288], [1, 624, 288, 864, 336], [1, -192, 432, -144, 480], [1, -96, 336, 864, 480], [1, -240, 480, 432, 528], [1, 672, 480, 816, 528], [1, -288, 528, 528, 624], [1, 96, 624, 528, 672], [1, 576, 624, 672, 672], [1, -288, 624, -96, 720], [1, -336, 720, -96, 768], [1, 0, 672, 720, 768], [1, -288, 768, 720, 912], [1, 432, 912, 672, 960], [1, 432, 960, 576, 1008]] }, { id: "north_downstairs_zone", label: [0, 576, 624], rects: [[0, 192, 432, 288, 480], [0, 528, 432, 624, 480], [0, -96, 480, 1056, 528], [0, -96, 528, 1152, 576], [0, -48, 576, 1200, 672], [0, 48, 672, 1152, 720], [0, 192, 720, 1104, 816], [0, 240, 816, 1056, 864], [0, 288, 864, 336, 912], [0, 384, 864, 432, 912], [0, 480, 864, 960, 912]] }, { id: "west2_downstairs_zone", label: [0, 1128, 168], rects: [[0, 720, -240, 864, -192], [0, 672, -192, 864, -144], [0, 624, -144, 864, 0], [0, 672, 0, 864, 96], [0, 1200, 48, 1296, 96], [0, 1344, 48, 1536, 96], [0, 672, 96, 1584, 240], [0, 672, 240, 1536, 336], [0, 672, 336, 1344, 384], [0, 816, 384, 1392, 480], [0, 1056, 480, 1392, 528], [0, 1152, 528, 1392, 576], [0, 1200, 576, 1392, 672], [0, 1248, 672, 1344, 720]] }, { id: "west_downstairs_zone", label: [0, 1008, -456], rects: [[0, 960, -816, 1104, -768], [0, 1152, -816, 1296, -768], [0, 960, -768, 1296, -720], [0, 960, -720, 1344, -672], [0, 720, -672, 1344, -624], [0, 672, -624, 1344, -576], [0, 624, -576, 1344, -528], [0, 624, -528, 1392, -384], [0, 816, -384, 1392, -288], [0, 864, -288, 1488, -240], [0, 864, -240, 1536, -192], [0, 864, -192, 1584, -144], [0, 864, -144, 1296, -96], [0, 1392, -144, 1584, -96], [0, 864, -96, 1584, 48], [0, 864, 48, 1152, 96]] }], doors: [{ kind: "door", cost: 750, at: [0, 1012, 487], rooms: [7, 6] }, { kind: "door", cost: 750, at: [0, 1257, 349], rooms: [7, 6] }, { kind: "door", cost: 750, at: [1, 144, -678], rooms: [0, 1] }, { kind: "door", cost: 750, at: [1, -437, -409], rooms: [2, 0] }, { kind: "door", cost: 750, at: [1, -293, 639], rooms: [4, 5] }, { kind: "door", cost: 1e3, at: [1, -773, 480], rooms: [4, 3] }, { kind: "door", cost: 750, at: [1, -346, -33], rooms: [2, 3] }, { kind: "door", cost: 750, at: [1, -438, -416], rooms: [2, 0] }, { kind: "power", cost: 750, at: [0, 1010, 73], rooms: [8, 7] }, { kind: "debris", cost: 1e3, at: [1, 8, 636], rooms: [6, 5] }, { kind: "debris", cost: 1e3, at: [1, 1017, -678], rooms: [8, 1] }, { kind: "debris", cost: 1e3, at: [1, -5, 740], rooms: [5, 6] }, { kind: "debris", cost: 1e3, at: [1, 955, -731], rooms: [1, 8] }], pois: [{ kind: "perk", id: "specialty_armorvest", at: [0, 1324, -415] }, { kind: "perk", id: "specialty_quickrevive", at: [0, 1148, 402] }, { kind: "perk", id: "specialty_fastreload", at: [1, -573, 709] }, { kind: "perk", id: "specialty_rof", at: [1, 433, -586] }, { kind: "perk", id: "specialty_additionalprimaryweapon", at: [0, -91, 540] }, { kind: "power", id: null, at: [1, -302, -225] }, { kind: "box", id: null, at: [0, 1115, -718] }, { kind: "box", id: null, at: [1, 967, -288] }, { kind: "box", id: null, at: [1, -594, -206] }, { kind: "box", id: null, at: [1, -204, -466] }, { kind: "box", id: null, at: [0, 968, 827] }] };

  // src/map/plans/index.js
  var PLANS = { ascension: ascension_default, cotd: cotd_default, five: five_default, kino: kino_default, moon: moon_default, nacht: nacht_default, riese: riese_default, shangrila: shangrila_default, shinonuma: shinonuma_default, verruckt: verruckt_default };
  function planFor(slug) {
    const plan = PLANS[slug];
    return plan && validPlan(plan) ? plan : null;
  }

  // src/map/icons.js
  var ICON_FILES = {
    specialty_armorvest: "images/specialty_juggernaut_zombies.iwi",
    specialty_fastreload: "images/specialty_fastreload_zombies.iwi",
    specialty_rof: "images/specialty_doubletap_zombies.iwi",
    specialty_quickrevive: "images/specialty_quickrevive_zombies.iwi",
    specialty_additionalprimaryweapon: "images/specialty_three_guns_zombies.iwi",
    specialty_flakjacket: "images/specialty_divetonuke_zombies.iwi",
    specialty_longersprint: "images/specialty_marathon_zombies.iwi",
    specialty_deadshot: "images/specialty_ads_zombies.iwi",
    box: "images/minimap_icon_mystery_box.iwi"
  };
  var FORMATS = { 11: "dxt1", 12: "dxt3", 13: "dxt5" };
  function zipEntries(cd) {
    const view2 = new DataView(cd.buffer, cd.byteOffset, cd.byteLength);
    const decoder = new TextDecoder();
    const out = [];
    for (let p = 0; p + 46 <= cd.byteLength && view2.getUint32(p, true) === 33639248; ) {
      const nameLength = view2.getUint16(p + 28, true);
      const extra = view2.getUint16(p + 30, true);
      const comment = view2.getUint16(p + 32, true);
      out.push({
        name: decoder.decode(cd.subarray(p + 46, p + 46 + nameLength)),
        method: view2.getUint16(p + 10, true),
        size: view2.getUint32(p + 20, true),
        offset: view2.getUint32(p + 42, true)
      });
      p += 46 + nameLength + extra + comment;
    }
    return out;
  }
  function parseIwi(bytes) {
    if (bytes.length < 48 || bytes[0] !== 73 || bytes[1] !== 87 || bytes[2] !== 105) return null;
    const view2 = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const format = FORMATS[bytes[4]];
    const width = view2.getUint16(6, true);
    const height = view2.getUint16(8, true);
    const end = view2.getUint32(16, true);
    const start2 = view2.getUint32(20, true);
    if (!format || !width || !height || width > 1024 || height > 1024 || start2 < 48 || end > bytes.length || end <= start2) return null;
    const needed = Math.ceil(width / 4) * Math.ceil(height / 4) * (format === "dxt1" ? 8 : 16);
    if (end - start2 < needed) return null;
    return { width, height, format, data: bytes.subarray(start2, end) };
  }
  var rgb565 = (c) => [(c >> 11 & 31) * 255 / 31, (c >> 5 & 63) * 255 / 63, (c & 31) * 255 / 31];
  var mix = (a, b, wa, wb) => a.map((v, i) => (v * wa + b[i] * wb) / (wa + wb));
  function decodeDxt(data, width, height, format) {
    const out = new Uint8ClampedArray(width * height * 4);
    const blockBytes = format === "dxt1" ? 8 : 16;
    const blocksX = Math.max(1, Math.ceil(width / 4));
    const blocksY = Math.max(1, Math.ceil(height / 4));
    for (let by = 0; by < blocksY; by += 1) {
      for (let bx = 0; bx < blocksX; bx += 1) {
        const at2 = (by * blocksX + bx) * blockBytes;
        if (at2 + blockBytes > data.length) return out;
        const colorAt = format === "dxt1" ? at2 : at2 + 8;
        const c0 = data[colorAt] | data[colorAt + 1] << 8;
        const c1 = data[colorAt + 2] | data[colorAt + 3] << 8;
        const p0 = rgb565(c0);
        const p1 = rgb565(c1);
        const fourColors = format !== "dxt1" || c0 > c1;
        const palette = fourColors ? [p0, p1, mix(p0, p1, 2, 1), mix(p0, p1, 1, 2)] : [p0, p1, mix(p0, p1, 1, 1), [0, 0, 0]];
        const alphas = format === "dxt5" ? dxt5Alphas(data[at2], data[at2 + 1]) : null;
        for (let y = 0; y < 4; y += 1) {
          for (let x = 0; x < 4; x += 1) {
            const px = bx * 4 + x;
            const py = by * 4 + y;
            if (px >= width || py >= height) continue;
            const index = data[colorAt + 4 + y] >> 2 * x & 3;
            const o = (py * width + px) * 4;
            [out[o], out[o + 1], out[o + 2]] = palette[index];
            if (format === "dxt1") out[o + 3] = !fourColors && index === 3 ? 0 : 255;
            else if (format === "dxt3") out[o + 3] = (data[at2 + 2 * y + (x >> 1)] >> 4 * (x & 1) & 15) * 17;
            else out[o + 3] = alphas[dxt5Index(data, at2, y * 4 + x)];
          }
        }
      }
    }
    return out;
  }
  function dxt5Alphas(a0, a1) {
    if (a0 > a1) return [a0, a1, ...[6, 5, 4, 3, 2, 1].map((w) => (w * a0 + (7 - w) * a1) / 7)];
    return [a0, a1, ...[4, 3, 2, 1].map((w) => (w * a0 + (5 - w) * a1) / 5), 0, 255];
  }
  function dxt5Index(data, at2, i) {
    const bit = i * 3;
    const byte = at2 + 2 + (bit >> 3);
    const value = data[byte] | (data[byte + 1] ?? 0) << 8;
    return value >> (bit & 7) & 7;
  }
  async function loadIcons(slug) {
    const icons = /* @__PURE__ */ new Map();
    try {
      const root = await navigator.storage.getDirectory();
      const main = await findMain(root, slug);
      if (!main) return icons;
      const wanted = new Map(Object.entries(ICON_FILES).map(([id, file]) => [file, id]));
      for await (const [name, handle] of main.entries()) {
        if (!wanted.size) break;
        if (!name.endsWith(".iwd") || handle.kind !== "file") continue;
        try {
          const file = await handle.getFile();
          for (const entry of await archiveEntries(file)) {
            const id = wanted.get(entry.name);
            if (!id) continue;
            try {
              const image = parseIwi(await entryBytes(file, entry));
              if (image) {
                icons.set(id, toCanvas(image));
                wanted.delete(entry.name);
              }
            } catch {
            }
          }
        } catch {
        }
      }
    } catch {
    }
    return icons;
  }
  async function findMain(root, slug) {
    for (const pack of [`pack-${slug}`, "pack"]) {
      try {
        return await (await (await root.getDirectoryHandle(pack)).getDirectoryHandle("files")).getDirectoryHandle("main");
      } catch {
      }
    }
    return null;
  }
  async function archiveEntries(file) {
    const tail = new Uint8Array(await file.slice(Math.max(0, file.size - 65557)).arrayBuffer());
    const view2 = new DataView(tail.buffer);
    for (let i = tail.length - 22; i >= 0; i -= 1) {
      if (view2.getUint32(i, true) !== 101010256) continue;
      const size = view2.getUint32(i + 12, true);
      const offset = view2.getUint32(i + 16, true);
      return zipEntries(new Uint8Array(await file.slice(offset, offset + size).arrayBuffer()));
    }
    return [];
  }
  async function entryBytes(file, entry) {
    const head = new DataView(await file.slice(entry.offset, entry.offset + 30).arrayBuffer());
    const start2 = entry.offset + 30 + head.getUint16(26, true) + head.getUint16(28, true);
    const raw = file.slice(start2, start2 + entry.size);
    if (entry.method === 0) return new Uint8Array(await raw.arrayBuffer());
    const stream = raw.stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  function toCanvas({ width, height, format, data }) {
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext("2d").putImageData(new ImageData(decodeDxt(data, width, height, format), width, height), 0, 0);
    return canvas;
  }

  // src/map/live.js
  var LIVE_EVERY_MS = 250;
  var BITS = /^[01]*$/;
  function parseLive(value) {
    const match = String(value).match(/^v=(\d+) p=(.*)$/);
    if (!match) return null;
    const players = [];
    for (const entry of match[2].split(";")) {
      const n = entry.split(",").map(Number);
      if (n.length !== 7 || !n.every(Number.isInteger)) continue;
      const [ent, x, y, z, yaw, room, s] = n;
      players.push({ ent, x, y, z, yaw, room, s });
    }
    return { v: Number(match[1]), players };
  }
  function parseMapState(value) {
    const raw = Object.fromEntries(
      String(value).split(" ").filter((pair) => pair.includes("=")).map((pair) => [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)])
    );
    if (!raw.sig || !BITS.test(raw.doors ?? "x") || !BITS.test(raw.rooms ?? "x")) return null;
    const bits2 = (text3) => [...text3].map((c) => c === "1");
    const box = (raw.box ?? "").split(",").filter(Boolean).map(Number).filter(Number.isInteger);
    return { sig: raw.sig, doors: bits2(raw.doors), rooms: bits2(raw.rooms), box, power: raw.power === "1" };
  }
  function mapPlayers(session) {
    const players = funPlayers(session);
    for (const g of session.guests?.values() ?? []) {
      if (g.present || g.slot?.state !== SLOT.reconnecting || players.some((p) => p.slot === g.slot.slot)) continue;
      players.push({ slot: g.slot.slot, n: g.seat + 1, name: g.state?.name || `Player ${g.seat + 1}` });
    }
    return players;
  }
  function onMapLine(session, name, value) {
    const map = session.map;
    if (!map) return;
    const now = Date.now();
    if (name === "cheats_map_live") {
      const live = parseLive(value);
      if (!live) return;
      const numbers2 = new Map(mapPlayers(session).map((p) => [p.slot, p.n]));
      map.liveReads += 1;
      for (const p of live.players) {
        const n = numbers2.get(p.ent);
        if (!n) continue;
        map.live.set(n, { x: p.x, y: p.y, z: p.z, yaw: p.yaw, room: p.room, s: p.s, floor: map.plan ? floorOf(map.plan, p.z, p.x, p.y) : 0, at: now, read: map.liveReads });
        if (!map.tracks.has(n)) map.tracks.set(n, []);
        pushSample(map.tracks.get(n), now, p.x, p.y, p.yaw);
      }
      map.liveV = live.v;
      if (map.state?.v !== live.v) askDvar(session, "cheats_map_state");
    } else if (name === "cheats_map_state") {
      const state = parseMapState(value);
      if (!state) return;
      map.state = { ...state, v: map.liveV, at: now };
      map.planOk = Boolean(map.plan) && state.sig === map.plan.sig;
    }
  }
  function iconsNeeded(plan) {
    const ids = new Set(plan.pois.filter((p) => p.kind === "perk" && ICON_FILES[p.id]).map((p) => p.id));
    if (plan.pois.some((p) => p.kind === "box")) ids.add("box");
    return [...ids];
  }
  var ICON_RETRY_MS = 15e3;
  var ICON_TRIES = 4;
  var canReadIcons = () => Boolean(globalThis.navigator?.storage?.getDirectory);
  function mapTick(session, now, { playing = screen() === "playing", slug = currentSlugOf(session), loadIcons: loadIcons2 = canReadIcons() ? loadIcons : null } = {}) {
    const map = session.map;
    if (!map) return;
    if (slug !== map.slug) {
      Object.assign(map, { slug, plan: planFor(slug), state: null, planOk: false, liveV: null, icons: /* @__PURE__ */ new Map(), iconTries: 0, iconsAt: -Infinity });
      map.live.clear();
      map.tracks.clear();
    }
    const missing = Boolean(map.plan) && iconsNeeded(map.plan).some((id) => !map.icons.has(id));
    if (playing && slug && loadIcons2 && missing && !map.iconsLoading && map.iconTries < ICON_TRIES && now - map.iconsAt >= ICON_RETRY_MS) {
      map.iconsLoading = true;
      map.iconTries += 1;
      map.iconsAt = now;
      loadIcons2(slug).then((icons) => {
        map.iconsLoading = false;
        if (map.slug === slug && icons.size >= map.icons.size) map.icons = icons;
      });
    }
    if (!playing) {
      if (map.live.size || map.state) Object.assign(map, { state: null, planOk: false, liveV: null });
      map.live.clear();
      map.tracks.clear();
      return;
    }
    if (session.mode === "guest" || !session.cheats?.ok) return;
    if (now - map.lastAskAt >= LIVE_EVERY_MS) {
      map.lastAskAt = now;
      askDvar(session, "cheats_map_live");
    }
    if (session.mode === "host") sendMap(session, now);
  }
  var currentSlugOf = (session) => session.mode === "guest" ? session.hostInfo?.slug ?? null : MAP_SLUGS[session.zone ?? currentZone()] ?? null;

  // src/cheats/bridge.js
  var STATE_EVERY_MS = 1e3;
  var STATE_BUSY_MS = 250;
  var RESULT_EVERY_MS = 500;
  var SEND_EVERY_MS = 250;
  var RESULT_WAIT_MS = 12e4;
  var SAFE = /^[\w.-]+$/;
  function createBridge() {
    return {
      ready: false,
      round: 0,
      frozen: false,
      power: false,
      horde: false,
      weapons: [],
      perks: [],
      powerups: [],
      health: {},
      // slot -> health level in %, as the game confirmed it (100 when not set)
      seq: 0,
      outbox: [],
      // [seq, command text] not sent yet
      sent: /* @__PURE__ */ new Map(),
      // seq -> { action, target, arg, until } waiting for a result
      lastSeq: 0,
      // latest seq sent
      scriptSeq: 0,
      // latest seq the script has taken (cheats_state seq=)
      scriptLists: 0,
      // the lists counter the script published last
      listsLoaded: 0,
      // the lists counter the lists were last asked for
      weaponChunks: null,
      lastStateAt: -Infinity,
      lastResultAt: -Infinity,
      lastSendAt: -Infinity,
      onResult: null
    };
  }
  function parseDvarPrint(line) {
    const match = String(line).match(/^"(cheats_\w+)" is: "(.*?)\^7"/);
    return match ? { name: match[1], value: match[2] } : null;
  }
  function parseState(value) {
    const raw = Object.fromEntries(
      String(value).split(" ").filter((pair) => pair.includes("=")).map((pair) => pair.split("="))
    );
    const n = (key) => Number(raw[key]) || 0;
    return { ready: raw.ready === "1", seq: n("seq"), round: n("round"), frozen: raw.frozen === "1", power: raw.power === "1", horde: raw.horde === "1", lists: n("lists") };
  }
  function cheatCommand(seq, action, target2, arg) {
    const parts2 = [seq, action, target2, arg].filter((part) => part != null && part !== "").map(String);
    for (const part of parts2) if (!SAFE.test(part)) throw new Error(`unsafe cheat argument: ${part}`);
    return `set cheats_cmd "${parts2.join(" ")}"`;
  }
  function sendCheat(session, action, target2, arg) {
    const cheats = session.cheats;
    cheats.seq += 1;
    cheats.outbox.push([cheats.seq, cheatCommand(cheats.seq, action, target2, arg)]);
    cheats.sent.set(cheats.seq, { action, target: target2, arg, until: Infinity });
  }
  function askDvar(session, name) {
    if (!session.fun.queue.includes(name)) session.fun.queue.push(name);
  }
  function cheatsTick(session, now, playing) {
    const cheats = session.cheats;
    if (!cheats?.ok || !playing) return;
    const busy = cheats.outbox.length > 0 || cheats.scriptSeq < cheats.lastSeq;
    if (now - cheats.lastStateAt >= (busy ? STATE_BUSY_MS : STATE_EVERY_MS)) {
      cheats.lastStateAt = now;
      askDvar(session, "cheats_state");
    }
    if (cheats.scriptLists > cheats.listsLoaded) {
      cheats.listsLoaded = cheats.scriptLists;
      for (const name of ["cheats_weapons_count", "cheats_perks", "cheats_powerups"]) askDvar(session, name);
    }
    if (cheats.outbox.length && cheats.scriptSeq >= cheats.lastSeq && now - cheats.lastSendAt >= SEND_EVERY_MS) {
      cheats.lastSendAt = now;
      const [seq, text3] = cheats.outbox.shift();
      session.fun.queue.push(text3);
      cheats.lastSeq = seq;
      const sent = cheats.sent.get(seq);
      if (sent) sent.until = now + RESULT_WAIT_MS;
    }
    for (const [seq, sent] of cheats.sent) if (now > sent.until) cheats.sent.delete(seq);
    const waiting = [...cheats.sent.keys()].some((seq) => seq <= cheats.lastSeq);
    if (waiting && now - cheats.lastResultAt >= RESULT_EVERY_MS) {
      cheats.lastResultAt = now;
      askDvar(session, "cheats_results");
    }
  }
  function onCheatsLine(session, line) {
    const print = parseDvarPrint(line);
    if (print?.name.startsWith("cheats_map_")) return onMapLine(session, print.name, print.value);
    const cheats = session.cheats;
    if (!print || !cheats) return;
    const { name, value } = print;
    const list = () => value.split(",").filter(Boolean);
    if (name === "cheats_state") {
      const state = parseState(value);
      Object.assign(cheats, { ready: state.ready, round: state.round, frozen: state.frozen, power: state.power, horde: state.horde, scriptLists: state.lists });
      if (state.seq < cheats.scriptSeq) {
        cheats.lastSeq = state.seq;
        cheats.health = {};
      }
      cheats.scriptSeq = state.seq;
    } else if (name === "cheats_weapons_count") {
      const count = Number(value) || 0;
      cheats.weaponChunks = new Array(count).fill(null);
      for (let i = 0; i < count; i += 1) askDvar(session, `cheats_weapons_${i}`);
    } else if (name.startsWith("cheats_weapons_")) {
      const i = Number(name.slice("cheats_weapons_".length));
      if (!cheats.weaponChunks || !(i >= 0 && i < cheats.weaponChunks.length)) return;
      cheats.weaponChunks[i] = list();
      if (cheats.weaponChunks.every(Boolean)) cheats.weapons = cheats.weaponChunks.flat();
    } else if (name === "cheats_perks") {
      cheats.perks = list();
    } else if (name === "cheats_powerups") {
      cheats.powerups = list();
    } else if (name === "cheats_results") {
      for (const entry of value.split(";").filter(Boolean)) {
        const [seqText, status, code = "", ...rest] = entry.split(" ");
        const seq = Number(seqText);
        const sent = cheats.sent.get(seq);
        if (!sent) continue;
        cheats.sent.delete(seq);
        cheats.onResult?.({ seq, ok: status === "ok", code, detail: rest.join(" ") }, { action: sent.action, target: sent.target, arg: sent.arg });
      }
    }
  }

  // src/cheats/gsc/_hooks.gsc
  var hooks_default = `// CHEAT MENU - part of the BO1 Zombies Co-op extension's fork, not of the game. Loaded through +set fs_mods "... cheats"
// (mods/_stack/maps/_modstack.gsc runs each stacked mod's register()).

register()
{
	maps\\_modstack::add( "_zombiemode_ffotd::main_end", maps\\cheats\\_cheats::main_end );
}
`;

  // src/cheats/gsc/_cheats.gsc
  var cheats_default = `#include maps\\_utility;
#include common_scripts\\utility;
#include maps\\_zombiemode_utility;

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
	level thread maps\\cheats\\_map::map_main();
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
		result = maps\\cheats\\_map::map_open_door( int( target ) );
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
	self maps\\_zombiemode_weapons::weapon_give( weapon );
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
	if ( self maps\\_zombiemode_weapons::has_upgrade( weapon ) )
	{
		return "has_upgrade " + weapon;
	}
	if ( !IsDefined( level.zombie_weapons[weapon] ) || !IsDefined( level.zombie_weapons[weapon].upgrade_name ) )
	{
		return "no_upgrade " + weapon;
	}
	upgrade = level.zombie_weapons[weapon].upgrade_name;
	self TakeWeapon( weapon );
	self GiveWeapon( upgrade, 0, self maps\\_zombiemode_weapons::get_pack_a_punch_weapon_options( upgrade ) );
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
	if ( self.maxhealth != target )
	{
		self.maxhealth = target;
		if ( self.health > target )
		{
			self.health = target;
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
			if ( player maps\\_laststand::player_is_in_laststand() )
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
	level thread maps\\_zombiemode_powerups::specific_powerup_drop( name, spot );
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
	maps\\_zombiemode::ai_calculate_health( target );
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
`;

  // src/cheats/gsc/_map.gsc
  var map_default = `#include maps\\_utility;
#include common_scripts\\utility;
#include maps\\_zombiemode_utility;

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
		doors = doors + maps\\cheats\\_cheats::cheats_bit( map_door_open( i ) );
	}
	rooms = "";
	for ( i = 0; i < level.map_zones.size; i++ )
	{
		rooms = rooms + maps\\cheats\\_cheats::cheats_bit( level.zones[level.map_zones[i]].is_enabled );
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
	return "sig=z" + level.map_zones.size + "d" + level.map_doors.size + "c" + level.map_door_sum + " doors=" + doors + " rooms=" + rooms + " box=" + box + " power=" + maps\\cheats\\_cheats::cheats_bit( maps\\cheats\\_cheats::cheats_flag( "power_on" ) );
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
			else if ( player maps\\_laststand::player_is_in_laststand() )
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
`;

  // src/cheats/gsc/_stack/_modstack.gsc
  var modstack_default = `// bo1-coop-cheats: copied from github.com/MisaDev4/bo1-zombies-decompiled mods/_stack/maps/_modstack.gsc; written only where vel.gg ships none.
// FS_MODS BASE - not part of the original game. mods/_stack goes on top of the search path only with +set fs_mods
// (src/universal/com_files.cpp FS_Startup); without fs_mods nothing here is read and the game is retail.
//
// Several mods at once: +set fs_mods "mapkit horde zinfo" puts mods/mapkit, mods/horde, mods/zinfo on the search path in
// that order (a later mod's plain file wins over an earlier one's). The retail "fix for the day" hooks that every mod
// wants to ship (maps\\zombie_pentagon_ffotd.gsc, maps\\_zombiemode_ffotd.gsc) would shadow each other, so mods/_stack ships
// them (retail body + one run() line) and each mod registers what it wants run there instead, in its own file:
//
//   mods/<name>/maps/<name>/_hooks.gsc
//   register()
//   {
//       maps\\_modstack::add( "zombie_pentagon_ffotd::main_start", maps\\<name>\\_<name>::main_start );
//   }
//
// Hook names: "<ffotd file>::main_start" / "::main_end" of zombie_pentagon_ffotd and _zombiemode_ffotd. run() starts every
// registered function as a level thread, in fs_mods order: it runs at once up to its first wait (same frame, same order as a
// direct call), and a hook that waits does not hold back the next mod's. A mod without _hooks.gsc only adds files.
// maps\\_modstack_list.gsc is not a file: the engine writes it from fs_mods (Scr_ReadFile, src/clientscript/cscr_parser.cpp).

add( hook, func )
{
	if ( !IsDefined( level._modstack_hooks[hook] ) )
	{
		level._modstack_hooks[hook] = [];
	}
	level._modstack_hooks[hook][level._modstack_hooks[hook].size] = func;
}

run( hook )
{
	if ( !IsDefined( level._modstack_hooks ) )
	{
		level._modstack_hooks = [];
		maps\\_modstack_list::register_all();
	}
	funcs = level._modstack_hooks[hook];
	if ( !IsDefined( funcs ) )
	{
		return;
	}
	for ( i = 0; i < funcs.size; i++ )
	{
		level thread [[ funcs[i] ]]();
	}
}
`;

  // src/cheats/gsc/_stack/_zombiemode_ffotd.gsc
  var zombiemode_ffotd_default = `// bo1-coop-cheats: copied from github.com/MisaDev4/bo1-zombies-decompiled mods/_stack/maps/_zombiemode_ffotd.gsc; written only where vel.gg ships none.
#include maps\\_utility;\r
#include common_scripts\\utility;\r
#include maps\\_zombiemode_utility;\r
#include animscripts\\zombie_Utility;\r
\r
\r
main_start()\r
{\r
	//This will turn off the new path method if added\r
	//level.calc_closest_player_using_paths = false;\r
	\r
	\r
	//Disable friends list and dev list from spaceman name if we want\r
	//setsaveddvar( "r_zombieNameAllowFriendsList", "1" );\r
	//setsaveddvar( "r_zombieNameAllowDevList", "1" );\r
	\r
	//We can disable additional primary machines here on a per map basis\r
	//just set level.zombie_additionalprimaryweapon_machine_origin to undefined and it will ignore it\r
	\r
	//Turn off 3 weapon perk machines for other maps based on dvars\r
	disable_additionalprimaryweapon_machine_locations();\r
	maps\\_modstack::run( "_zombiemode_ffotd::main_start" ); // mod: fs_mods - each stacked mod's hook (maps\\_modstack.gsc)\r
}\r
\r
\r
main_end()\r
{\r
	level thread onPlayerConnect();\r
	maps\\_modstack::run( "_zombiemode_ffotd::main_end" ); // mod: fs_mods\r
}\r
\r
\r
// FS_MODS BASE - not part of the original game. mods/_stack goes on top of the search path only with +set fs_mods\r
// (src/universal/com_files.cpp FS_Startup). Retail maps\\_zombiemode_ffotd.gsc (common_zombie_patch), the shared "fix for\r
// the day" hook every zombie map's maps\\_zombiemode::main() runs, is this file without the two maps\\_modstack::run lines.\r
\r
disable_additionalprimaryweapon_machine_locations()\r
{\r
	enabled = 0;\r
\r
	switch ( Tolower( GetDvar( #"mapname" ) ) )\r
	{\r
	case "zombie_theater":\r
		enabled = GetDvarInt( #"scr_zm_extra_perk_theater" );\r
		break;\r
	case "zombie_pentagon":\r
		enabled = GetDvarInt( #"scr_zm_extra_perk_pentagon" );\r
		break;\r
	case "zombie_cosmodrome":\r
		enabled = GetDvarInt( #"scr_zm_extra_perk_cosmodrome" );\r
		break;\r
	case "zombie_coast":\r
		enabled = GetDvarInt( #"scr_zm_extra_perk_coast" );\r
		break;\r
	case "zombie_temple":\r
		enabled = GetDvarInt( #"scr_zm_extra_perk_temple" );\r
		break;\r
	case "zombie_moon":\r
		enabled = 1;\r
		break;\r
	case "zombie_cod5_prototype":\r
		enabled = GetDvarInt( #"scr_zm_extra_perk_cod5_prototype" );\r
		break;\r
	case "zombie_cod5_asylum":\r
		enabled = GetDvarInt( #"scr_zm_extra_perk_cod5_asylum" );\r
		break;\r
	case "zombie_cod5_sumpf":\r
		enabled = GetDvarInt( #"scr_zm_extra_perk_cod5_sumpf" );\r
		break;\r
	case "zombie_cod5_factory":\r
		enabled = GetDvarInt( #"scr_zm_extra_perk_cod5_factory" );\r
		break;\r
	}\r
\r
	if ( GetDvarInt( #"scr_zm_extra_perk_all" ) )\r
	{\r
		enabled = 1;\r
	}\r
\r
	if ( !enabled )\r
	{\r
		level.zombie_additionalprimaryweapon_machine_origin = undefined;\r
	}\r
}\r
\r
\r
onPlayerConnect()\r
{\r
	for ( ;; )\r
	{\r
		level waittill( "connecting", player );\r
\r
		player thread claymore_to_notsolid();\r
	}\r
}\r
\r
\r
claymore_to_notsolid()\r
{\r
	self endon( "disconnect" );\r
\r
	for ( ;; )\r
	{\r
		self waittill( "grenade_fire", claymore, weapname );\r
		if ( weapname == "claymore_zm" || weapname == "spikemore_zm" )\r
		{\r
			claymore NotSolid();\r
		}\r
	}\r
}\r
\r
\r
//Cheaters logic added here because its a small file (for any ffotd updates)\r
//TODO: Next game move to its own file\r
nazizombies_checking_for_cheats()\r
{\r
//WIP - PETER\r
// 	players = get_players();		\r
// 	for( i = 0; i < players.size; i++ )\r
// 	{\r
// 		total_kills = players[i].stats["kills"];\r
// 		total_points = players[i].stats["score"];\r
// 		total_rounds = (level.round_number - 1); // rounds survived\r
// 		total_downs = players[i].stats["downs"];\r
// 		total_revives = players[i].stats["revives"];\r
// 		total_perks = players[i].stats["perks"];\r
// 		total_headshots = players[i].stats["headshots"];\r
// 		total_zombie_gibs = players[i].stats["zombie_gibs"];\r
// 	}\r
\r
\r
	return false;  // no cheater found\r
}\r
\0`;

  // src/cheats/files.js
  var MOD_FILES = [
    { path: "mods/cheats/maps/cheats/_hooks.gsc", text: hooks_default },
    { path: "mods/cheats/maps/cheats/_cheats.gsc", text: cheats_default },
    { path: "mods/cheats/maps/cheats/_map.gsc", text: map_default },
    { path: "mods/_stack/maps/_modstack.gsc", text: modstack_default },
    { path: "mods/_stack/maps/_zombiemode_ffotd.gsc", text: zombiemode_ffotd_default }
  ];

  // src/cheats/mod.js
  var MOD_NAME = "cheats";
  function modBase(args) {
    const i = args.findIndex((arg, at2) => arg === "fs_b" && args[at2 - 1] === "+set");
    const value = i < 0 ? "" : args[i + 1] ?? "";
    return value.startsWith("/opfs/") ? value.slice("/opfs/".length) : null;
  }
  function addCheatsMod(args, { horde }) {
    const i = args.findIndex((arg, at2) => arg === "fs_mods" && args[at2 - 1] === "+set");
    if (i < 0) {
      insertBeforeDevmap(args, ["+set", "fs_mods", MOD_NAME]);
    } else {
      const names2 = args[i + 1].split(/[\s,;]+/).filter(Boolean);
      if (!names2.includes(MOD_NAME)) args[i + 1] = [...names2, MOD_NAME].join(" ");
    }
    if (horde && !args.includes("cheats_horde")) insertBeforeDevmap(args, ["+set", "cheats_horde", "1"]);
  }

  // src/cheats/opfs.js
  var MARKER = "// bo1-coop-cheats";
  async function dir(root, parts2) {
    let d = root;
    for (const part of parts2) d = await d.getDirectoryHandle(part, { create: true });
    return d;
  }
  async function existingText(folder, name) {
    try {
      return await (await (await folder.getFileHandle(name)).getFile()).text();
    } catch {
      return null;
    }
  }
  async function writeModFiles(base, files) {
    try {
      const root = await navigator.storage.getDirectory();
      for (const { path, text: text3 } of files) {
        const parts2 = `${base}/${path}`.split("/").filter(Boolean);
        const name = parts2.pop();
        const folder = await dir(root, parts2);
        if (path.startsWith("mods/_stack/")) {
          const old = await existingText(folder, name);
          if (old != null && !old.startsWith(MARKER)) continue;
        }
        const writable = await (await folder.getFileHandle(name, { create: true })).createWritable();
        await writable.write(text3);
        await writable.close();
      }
      return true;
    } catch {
      return false;
    }
  }

  // src/ui/styles.js
  var STYLE = `
:host { all: initial; position: fixed; top: 12px; right: 12px; z-index: 2147483647; font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--fg);
  --bg: #121110; --bg2: #1b1917; --bg3: #24211e; --line: #34302b; --fg: #ece6dc; --muted: #9d958a; --dim: #6f685f;
  --accent: #e2552f; --accent2: #f07a4f; --ok: #63d471; --wait: #f4c542; --bad: #ff6b5a; }
* { box-sizing: border-box; }
.card { width: 312px; max-height: calc(100vh - 24px); overflow: auto; background: var(--bg); border: 1px solid var(--line); border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0,0,0,.55); scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
.head { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: linear-gradient(180deg, #1d1a17, var(--bg)); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 1; }
.mark { display: grid; grid-template-columns: 6px 6px; gap: 2px; flex: none; }
.mark i { width: 6px; height: 6px; border-radius: 1.5px; opacity: .9; }
.title { flex: 1; min-width: 0; }
.title b { display: block; font-size: 13px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
.title span { display: block; font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chip { flex: none; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 99px; background: var(--bg3); color: var(--muted); border: 1px solid var(--line); white-space: nowrap; }
.chip.ok { color: var(--ok); border-color: rgba(99,212,113,.35); background: rgba(99,212,113,.08); }
.chip.wait { color: var(--wait); border-color: rgba(244,197,66,.35); background: rgba(244,197,66,.08); }
.chip.bad { color: var(--bad); border-color: rgba(255,107,90,.4); background: rgba(255,107,90,.08); }
.chip.live::before { content: ""; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: currentColor; margin-right: 5px; vertical-align: 1px; animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: .25; } }
button.icon { all: unset; cursor: pointer; color: var(--muted); width: 22px; height: 22px; display: grid; place-items: center; border-radius: 5px; font-size: 15px; }
button.icon:hover { background: var(--bg3); color: var(--fg); }
.body { padding: 12px; display: grid; gap: 10px; }
:host(.collapsed) .body { display: none; }
:host(.collapsed) .head { border-bottom: 0; }
.muted { color: var(--muted); } .small { font-size: 12px; } .error { color: var(--bad); }
.label { font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--dim); margin-bottom: 6px; display: flex; justify-content: space-between; align-items: baseline; }
.label em { font-style: normal; letter-spacing: 0; text-transform: none; font-weight: 600; color: var(--muted); font-size: 11px; }
.panel { background: var(--bg2); border: 1px solid var(--line); border-radius: 8px; padding: 10px; }
.panel .code { font: 700 17px/1.2 ui-monospace, "SF Mono", Menlo, Consolas, monospace; letter-spacing: .05em; color: #fff; user-select: all; white-space: nowrap; margin-bottom: 9px; }
.map { display: flex; align-items: center; gap: 10px; }
.map .glyph { width: 34px; height: 34px; border-radius: 6px; flex: none; display: grid; place-items: center; background: radial-gradient(circle at 30% 30%, #3a2a22, #1a1411); border: 1px solid #4a3328; color: var(--accent2); font-weight: 900; font-size: 15px; }
.map .name { font-weight: 700; font-size: 14px; }
.map .sub { font-size: 11.5px; color: var(--muted); }
.tag { display: inline-block; font-size: 9.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; padding: 1px 5px; border-radius: 4px; vertical-align: 1px; margin-left: 5px; }
.tag.host { background: rgba(226,85,47,.18); color: var(--accent2); }
.tag.you { background: rgba(255,255,255,.1); color: var(--fg); }
.tag.hell { background: rgba(255,107,90,.15); color: var(--bad); }
.players { display: grid; gap: 6px; }
.player { display: flex; align-items: center; gap: 10px; padding: 7px 9px; border-radius: 7px; background: var(--bg3); border: 1px solid transparent; }
.player.me { border-color: var(--line); }
.player.empty { background: transparent; border: 1px dashed var(--line); }
.badge { width: 26px; height: 26px; border-radius: 50%; flex: none; display: grid; place-items: center; font-weight: 800; font-size: 12px; color: #111; position: relative; }
.player.empty .badge { background: transparent !important; color: var(--dim); box-shadow: inset 0 0 0 1.5px var(--line); }
.who { flex: 1; min-width: 0; }
.who .name { font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.player.empty .who .name { color: var(--dim); font-weight: 500; }
.who .st { font-size: 11.5px; color: var(--muted); display: flex; align-items: center; gap: 5px; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dim); flex: none; }
.dot.ok { background: var(--ok); } .dot.wait { background: var(--wait); animation: pulse 1.6s ease-in-out infinite; } .dot.bad { background: var(--bad); }
.ping { flex: none; text-align: right; font: 600 11px ui-monospace, Menlo, monospace; color: var(--muted); display: grid; justify-items: end; gap: 2px; }
.ping .path { font: 500 10px system-ui, sans-serif; color: var(--dim); }
.bars { display: flex; gap: 2px; align-items: flex-end; height: 10px; }
.bars i { width: 3px; border-radius: 1px; background: var(--line); }
.bars i:nth-child(1) { height: 4px; } .bars i:nth-child(2) { height: 7px; } .bars i:nth-child(3) { height: 10px; }
.bars.q3 i { background: var(--ok); } .bars.q2 i:nth-child(-n+2) { background: var(--wait); } .bars.q1 i:nth-child(1) { background: var(--bad); }
.steps { display: flex; align-items: flex-start; }
.step { flex: 1; display: grid; justify-items: center; gap: 4px; position: relative; font-size: 10.5px; color: var(--dim); text-align: center; }
.step::before { content: ""; position: absolute; top: 6px; left: -50%; width: 100%; height: 2px; background: var(--line); z-index: 0; }
.step:first-child::before { display: none; }
.step i { width: 14px; height: 14px; border-radius: 50%; background: var(--bg); border: 2px solid var(--line); z-index: 1; }
.step.done { color: var(--muted); } .step.done::before { background: var(--accent); } .step.done i { background: var(--accent); border-color: var(--accent); }
.step.now { color: var(--fg); font-weight: 700; } .step.now::before { background: var(--accent); } .step.now i { border-color: var(--accent2); box-shadow: 0 0 0 3px rgba(226,85,47,.25); }
.step.now.fail i { border-color: var(--bad); box-shadow: 0 0 0 3px rgba(255,107,90,.2); }
.call { border-radius: 8px; padding: 9px 10px; background: var(--bg2); border: 1px solid var(--line); border-left: 3px solid var(--muted); display: grid; gap: 8px; }
.call.info { border-left-color: #5aa8ff; } .call.ok { border-left-color: var(--ok); } .call.wait { border-left-color: var(--wait); } .call.bad { border-left-color: var(--bad); background: rgba(255,107,90,.06); }
.call b { font-weight: 700; }
.row { display: flex; gap: 6px; } .row > * { flex: 1; }
button.act { all: unset; box-sizing: border-box; text-align: center; cursor: pointer; padding: 8px 10px; border: 1px solid var(--line); border-radius: 7px; background: var(--bg3); color: var(--fg); font-weight: 650; font-size: 12.5px; transition: background .12s, border-color .12s; }
button.act:hover, button.act:focus-visible { background: #2e2a26; border-color: #4a443d; }
button.act.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
button.act.primary:hover { background: var(--accent2); border-color: var(--accent2); }
button.act.ghost { background: transparent; color: var(--muted); }
button.act.ghost:hover { color: var(--fg); }
button.act.done { background: rgba(99,212,113,.15); border-color: rgba(99,212,113,.4); color: var(--ok); }
button.act.slim { flex: 0 0 auto; padding: 6px 10px; }
button.act[disabled] { opacity: .5; cursor: default; }
input { all: unset; box-sizing: border-box; padding: 7px 9px; border: 1px solid var(--line); border-radius: 7px; background: #0c0b0a; color: var(--fg); font: 12.5px ui-monospace, Menlo, monospace; min-width: 0; flex: 1; }
input:focus { border-color: var(--accent); }
input::placeholder { color: var(--dim); }
.kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 12px; margin: 0; }
.kv dt { color: var(--muted); } .kv dd { margin: 0; text-align: right; }
.meter { height: 5px; border-radius: 3px; background: var(--bg3); overflow: hidden; margin-top: 5px; }
.meter > span { display: block; height: 100%; background: var(--ok); }
.meter.warn > span { background: var(--wait); } .meter.full > span { background: var(--bad); }
.section { border-top: 1px solid var(--line); padding-top: 10px; display: grid; gap: 10px; }
.section > button.toggle { all: unset; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--dim); }
.section > button.toggle:hover { color: var(--muted); }
.section > button.toggle::after { content: "\\25BE"; font-size: 12px; transition: transform .15s; }
.section.closed > button.toggle::after { transform: rotate(-90deg); }
.credits { font-size: 11px; color: var(--dim); text-align: center; }
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
button.tchip { all: unset; cursor: pointer; font-size: 11.5px; font-weight: 650; padding: 4px 9px; border-radius: 99px; border: 1px solid var(--line); background: var(--bg3); color: var(--muted); }
button.tchip:hover { color: var(--fg); border-color: #4a443d; }
button.tchip.on { background: rgba(226,85,47,.2); border-color: var(--accent); color: #fff; }
button.tchip.plain { border-style: dashed; }
.stepper { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.stepper .flabel { flex: 1; }
.sval { min-width: 46px; text-align: center; font: 600 12px ui-monospace, Menlo, monospace; color: var(--fg); }
button.sbtn { all: unset; cursor: pointer; width: 24px; height: 22px; display: grid; place-items: center; border-radius: 6px; background: var(--bg3); border: 1px solid var(--line); color: var(--fg); font-weight: 700; }
button.sbtn:hover { border-color: var(--accent); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
button.act.tiny { padding: 5px 6px; font-size: 11.5px; font-weight: 600; }
.fplayer { display: grid; gap: 7px; padding: 9px; border-radius: 8px; background: var(--bg2); border: 1px solid var(--line); }
.fhead { display: flex; align-items: center; gap: 8px; }
.fhead b { flex: 1; font-weight: 700; }
.fbadge { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 800; color: #111; flex: none; }
.fmoney { font: 600 12px ui-monospace, Menlo, monospace; color: var(--ok); }
.frow { display: flex; align-items: center; gap: 5px; }
.frow .flabel { flex: 1; font-size: 12px; }
.flabel { color: var(--muted); }
.pill { display: none; }
:host(.compact) .card { display: none; }
:host(.compact) .pill { display: flex; align-items: center; gap: 8px; pointer-events: none; background: rgba(12,11,10,.72); border: 1px solid rgba(255,255,255,.08); border-radius: 99px; padding: 4px 10px; font: 600 11.5px system-ui, sans-serif; color: #ddd; backdrop-filter: blur(4px); }
:host(.compact) .pill:empty { display: none; }
.pill .pd { width: 9px; height: 9px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px currentColor; color: var(--dim); }
.pill .pd.on { background: currentColor; }
.pill .sep { width: 1px; height: 12px; background: rgba(255,255,255,.15); }
`;

  // src/ui/card.js
  var PLAYER_COLORS = ["#f2efe9", "#5aa8ff", "#f4c542", "#63d471"];
  var Card = class {
    constructor(handlers) {
      this.handlers = handlers;
      this.host = document.createElement("bo1-coop-card");
      this.root = this.host.attachShadow({ mode: "closed" });
      const mark = PLAYER_COLORS.map((c) => `<i style="background:${c}"></i>`).join("");
      this.root.innerHTML = `<style>${STYLE}</style><div class="card"><div class="head"><span class="mark">${mark}</span><span class="title"><b>Co-op</b><span class="tagline"></span></span><span class="chip"></span><button class="icon" data-act="collapse" title="Minimise">–</button></div><div class="body"></div></div><div class="pill"></div>`;
      this.body = this.root.querySelector(".body");
      this.chip = this.root.querySelector(".chip");
      this.tagline = this.root.querySelector(".tagline");
      this.pill = this.root.querySelector(".pill");
      this.collapseButton = this.root.querySelector('[data-act="collapse"]');
      this.view = null;
      for (const type of ["keydown", "keyup", "keypress", "click", "mousedown", "mouseup", "pointerdown", "pointerup", "wheel"]) {
        this.host.addEventListener(type, (event) => event.stopPropagation());
      }
      this.root.addEventListener("click", (event) => {
        const button = event.target.closest?.("[data-act]");
        if (!button || button.disabled) return;
        const act = button.dataset.act;
        if (act === "collapse") {
          const collapsed = this.host.classList.toggle("collapsed");
          this.collapseButton.textContent = collapsed ? "+" : "–";
          return;
        }
        const field = button.dataset.field ? this.root.querySelector(`input[data-field="${button.dataset.field}"]`) : null;
        this.handlers[act]?.(field ? field.value : button.dataset.arg);
      });
      this.root.addEventListener("keydown", (event) => {
        const input = event.target.matches?.("input[data-act]") ? event.target : null;
        if (event.key === "Enter" && input) this.handlers[input.dataset.act]?.(input.value);
      });
    }
    mount() {
      const attach = () => {
        if (!this.host.isConnected) document.documentElement.append(this.host);
      };
      if (document.documentElement) attach();
      else document.addEventListener("readystatechange", attach, { once: true });
    }
    /** Re-renders only when the view changes, so typing in an input is never interrupted. */
    render(view2) {
      const key = JSON.stringify(view2);
      if (key === this.view) return;
      const focused = this.root.activeElement?.dataset?.field;
      const previous = new Map([...this.root.querySelectorAll("input[data-field]")].map((i) => [i.dataset.field, i.value]));
      this.view = key;
      this.chip.className = `chip ${view2.chip?.tone ?? ""}`;
      this.chip.textContent = view2.chip?.text ?? "";
      this.tagline.textContent = view2.tagline ?? "";
      this.host.classList.toggle("compact", Boolean(view2.compact));
      this.pill.replaceChildren(...this.pillParts(view2.pill));
      this.body.replaceChildren(...view2.blocks.map((block) => this.block(block)));
      for (const input of this.root.querySelectorAll("input[data-field]")) {
        if (previous.has(input.dataset.field)) input.value = previous.get(input.dataset.field);
        if (input.dataset.field === focused) input.focus();
      }
    }
    toggleChip(c) {
      const e = document.createElement("button");
      e.className = `tchip ${c.on ? "on" : ""} ${c.plain ? "plain" : ""}`;
      e.textContent = c.label;
      e.dataset.act = c.act;
      if (c.arg != null) e.dataset.arg = c.arg;
      return e;
    }
    stepper(s) {
      const box = document.createElement("div");
      box.className = "stepper";
      const label = document.createElement("span");
      label.className = "flabel";
      label.textContent = s.label;
      const value = document.createElement("span");
      value.className = "sval";
      value.textContent = s.value;
      const make = (b, text3) => {
        const e = document.createElement("button");
        e.className = "sbtn";
        e.textContent = text3;
        e.dataset.act = b.act;
        e.dataset.arg = b.arg;
        return e;
      };
      box.append(label, make(s.dec, "−"), value, make(s.inc, "+"));
      return box;
    }
    pillParts(pill) {
      if (!pill) return [];
      const parts2 = [];
      for (const p of pill.players ?? []) {
        const d = document.createElement("span");
        d.className = `pd ${p.on ? "on" : ""}`;
        d.style.color = PLAYER_COLORS[p.n - 1];
        parts2.push(d);
      }
      for (const text3 of pill.texts ?? []) {
        if (parts2.length) parts2.push(Object.assign(document.createElement("span"), { className: "sep" }));
        parts2.push(document.createTextNode(text3));
      }
      return parts2;
    }
    block(block) {
      const el = (tag, cls, text3) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text3 != null) e.textContent = text3;
        return e;
      };
      const button = (b) => {
        const e = el("button", `act ${b.style ?? ""}`, b.label);
        e.dataset.act = b.act;
        if (b.arg != null) e.dataset.arg = b.arg;
        if (b.field) e.dataset.field = b.field;
        if (b.disabled) e.disabled = true;
        return e;
      };
      switch (block.kind) {
        case "text":
          return el("div", block.cls ?? "", block.text);
        case "label": {
          const box = el("div", "label", block.text);
          if (block.aside) box.append(el("em", "", block.aside));
          return box;
        }
        case "room": {
          const box = el("div", "panel");
          const label = el("div", "label", block.label);
          if (block.aside) label.append(el("em", "", block.aside));
          box.append(label, el("div", "code", block.code));
          if (block.buttons?.length) {
            const row = el("div", "row");
            for (const b of block.buttons) row.append(button(b));
            box.append(row);
          }
          return box;
        }
        case "map": {
          const box = el("div", "map");
          box.append(el("div", "glyph", block.glyph ?? "?"));
          const info = el("div");
          const name = el("div", "name", block.name);
          if (block.tag) name.append(el("span", "tag hell", block.tag));
          info.append(name, el("div", "sub", block.sub ?? ""));
          box.append(info);
          return box;
        }
        case "players": {
          const box = el("div");
          const label = el("div", "label", block.label);
          if (block.aside) label.append(el("em", "", block.aside));
          const list = el("div", "players");
          for (const p of block.players) {
            const row = el("div", `player ${p.empty ? "empty" : ""} ${p.me ? "me" : ""}`);
            const badge = el("div", "badge", String(p.n));
            badge.style.background = PLAYER_COLORS[p.n - 1];
            const who2 = el("div", "who");
            const name = el("div", "name", p.name);
            for (const t of p.tags ?? []) name.append(el("span", `tag ${t.cls}`, t.text));
            const st = el("div", "st");
            if (p.status) st.append(el("span", `dot ${p.tone ?? ""}`), document.createTextNode(p.status));
            who2.append(name, st);
            row.append(badge, who2);
            if (p.ping != null) {
              const ping = el("div", "ping");
              const bars = el("span", `bars q${p.ping < 80 ? 3 : p.ping < 180 ? 2 : 1}`);
              bars.append(el("i"), el("i"), el("i"));
              ping.append(bars, el("span", "", `${p.ping} ms`));
              if (p.path) ping.append(el("span", "path", p.path));
              row.append(ping);
            }
            list.append(row);
          }
          box.append(label, list);
          return box;
        }
        case "steps": {
          const box = el("div", "steps");
          block.steps.forEach((text3, i) => {
            const state = i < block.current ? "done" : i === block.current ? `now ${block.fail ? "fail" : ""}` : "";
            const step2 = el("div", `step ${state}`);
            step2.append(el("i"), el("span", "", text3));
            box.append(step2);
          });
          return box;
        }
        case "callout": {
          const box = el("div", `call ${block.tone ?? ""}`);
          const text3 = el("div");
          if (block.title) text3.append(el("b", "", `${block.title} `));
          text3.append(document.createTextNode(block.text ?? ""));
          box.append(text3);
          if (block.buttons?.length) {
            const row = el("div", "row");
            for (const b of block.buttons) row.append(button(b));
            box.append(row);
          }
          return box;
        }
        case "buttons": {
          const row = el("div", "row");
          for (const b of block.buttons) row.append(button(b));
          return row;
        }
        case "input": {
          const box = el("div");
          if (block.label) box.append(el("div", "label", block.label));
          const row = el("div", "row");
          const input = el("input");
          input.placeholder = block.placeholder ?? "";
          input.spellcheck = false;
          if (block.maxLength) input.maxLength = block.maxLength;
          input.dataset.field = block.field;
          input.dataset.act = block.act;
          if (block.value) input.value = block.value;
          row.append(input, button({ act: block.act, label: block.button, field: block.field, style: `${block.style ?? ""} slim` }));
          box.append(row);
          return box;
        }
        case "kv": {
          const box = el("dl", "kv");
          for (const [k, v, cls] of block.items) box.append(el("dt", "", k), el("dd", cls ?? "", v));
          return box;
        }
        case "meter": {
          const box = el("div", "small muted");
          box.append(document.createTextNode(block.label));
          const bar = el("div", `meter ${block.fraction >= 1 ? "full" : block.fraction >= 0.75 ? "warn" : ""}`);
          const fill = el("span");
          fill.style.width = `${Math.round(Math.min(1, Math.max(0, block.fraction)) * 100)}%`;
          bar.append(fill);
          box.append(bar);
          return box;
        }
        case "section": {
          const box = el("div", `section ${block.open ? "" : "closed"}`);
          const toggle = el("button", "toggle", block.title);
          toggle.dataset.act = block.act;
          box.append(toggle);
          if (block.open) for (const child of block.blocks) box.append(this.block(child));
          return box;
        }
        case "credits":
          return el("div", "credits", block.text);
        case "chips": {
          const box = el("div", "chips");
          for (const c of block.chips) box.append(this.toggleChip(c));
          return box;
        }
        case "stepper":
          return this.stepper(block);
        case "grid": {
          const box = el("div", "grid");
          for (const b of block.buttons) box.append(button({ ...b, style: `${b.style ?? ""} tiny` }));
          return box;
        }
        case "funPlayer": {
          const box = el("div", "fplayer");
          const head = el("div", "fhead");
          const badge = el("span", "fbadge", block.n ? String(block.n) : "★");
          badge.style.background = block.n ? PLAYER_COLORS[block.n - 1] : "var(--accent)";
          head.append(badge, el("b", "", block.name));
          if (block.money?.value) head.append(el("span", "fmoney", `$${block.money.value}`));
          box.append(head);
          const chips = el("div", "chips");
          for (const c of block.chips) chips.append(this.toggleChip(c));
          box.append(chips, this.stepper(block.speed));
          const money = el("div", "frow");
          money.append(el("span", "flabel", block.money.label));
          for (const b of block.money.buttons) money.append(button({ ...b, style: "tiny" }));
          box.append(money);
          return box;
        }
        default:
          return el("div");
      }
    }
  };

  // src/map/names.js
  var ROOMS = {
    nacht: { start_zone: "Main room", box_zone: "Back room", upstairs_zone: "Help room" },
    verruckt: {
      kitchen_upstairs_zone: "Kitchen",
      power_upstairs_zone: "Power room",
      south_upstairs_zone: "South upstairs",
      south2_upstairs_zone: "South upstairs, back",
      north_upstairs_zone: "North upstairs",
      north2_upstairs_zone: "North upstairs, back",
      north_downstairs_zone: "North downstairs",
      west_downstairs_zone: "West downstairs",
      west2_downstairs_zone: "West downstairs, back"
    },
    shinonuma: {
      center_building_combined: "Main hut",
      center_building_upstairs: "Main hut upstairs",
      center_building_upstairs_buy: "Main hut stairs",
      northwest_building: "Northwest hut",
      northeast_building: "Northeast hut",
      southwest_building: "Southwest hut",
      southeast_building: "Southeast hut",
      northwest_outside: "Northwest swamp",
      northeast_outside: "Northeast swamp",
      southwest_outside: "Southwest swamp",
      southeast_outside: "Southeast swamp"
    },
    riese: {
      receiver_zone: "Mainframe",
      tp_west_zone: "West teleporter",
      tp_south_zone: "South teleporter",
      tp_east_zone: "East teleporter",
      bridge_zone: "Bridge",
      warehouse_top_zone: "Warehouse upstairs",
      warehouse_bottom_zone: "Warehouse",
      outside_south_zone: "South courtyard",
      outside_west_zone: "West courtyard",
      outside_east_zone: "East courtyard",
      wnuen_zone: "Lab building",
      wnuen_bridge_zone: "Lab walkway"
    },
    kino: {
      foyer_zone: "Lobby",
      foyer2_zone: "Upstairs lobby",
      theater_zone: "Theater",
      stage_zone: "Stage",
      west_balcony_zone: "West balcony",
      dressing_zone: "Dressing room",
      alleyway_zone: "Alley",
      dining_zone: "Dining room",
      crematorium_zone: "Crematorium",
      vip_zone: "VIP room"
    },
    five: {
      conference_level1: "Conference room",
      conference_level2: "Second conference room",
      hallway_level1: "Top floor hallway",
      hallway3_level1: "Top floor, east hallway",
      war_room_zone_top: "War room, upper level",
      war_room_zone_north: "War room north",
      war_room_zone_south: "War room south",
      war_room_zone_elevator: "War room elevator",
      labs_elevator: "Lab elevator",
      labs_hallway1: "Lab hallway",
      labs_hallway2: "Lab hallway 2",
      labs_zone1: "Lab 1",
      labs_zone2: "Lab 2",
      labs_zone3: "Lab 3"
    },
    ascension: {
      base_entry_zone: "Base entrance",
      base_entry_zone2: "Base entrance, back",
      storage_zone: "Storage",
      storage_zone2: "Storage, back",
      storage_lander_zone: "Storage lander",
      access_tunnel_zone: "Access tunnel",
      power_building: "Power building",
      power_building_roof: "Power building roof",
      roof_connector_zone: "Roof walkway",
      north_path_zone: "North path",
      north_catwalk_zone3: "North catwalk",
      centrifuge_zone: "Centrifuge",
      centrifuge_zone2: "Centrifuge, upper",
      centrifuge2power_zone: "Centrifuge to power",
      control_room_zone: "Control room",
      under_rocket_zone: "Under the rocket"
    },
    cotd: {
      start_zone: "Start",
      start_beach_zone: "Starting beach",
      start_cave_zone: "Cave",
      beach_zone: "Beach",
      beach_zone2: "Upper beach",
      rear_lagoon_zone: "Lagoon",
      residence1_zone: "Residence",
      residence_roof_zone: "Residence roof",
      lighthouse1_zone: "Lighthouse",
      lighthouse2_zone: "Lighthouse, upper floor",
      catwalk_zone: "Lighthouse top",
      shipfront_near_zone: "Ship bow",
      shipfront_far_zone: "Ship bow, far end",
      shipfront_bottom_zone: "Ship bow, lower deck",
      shipfront_storage_zone: "Ship bow, storage",
      shipfront_2_beach_zone: "Ship to beach",
      shipback_near_zone: "Ship stern",
      shipback_near2_zone: "Ship stern, upper deck",
      shipback_far_zone: "Ship stern, far end",
      shipback_level3_zone: "Ship stern, top deck"
    },
    shangrila: {
      temple_start_zone: "Temple",
      power_room_zone: "Power room",
      pressure_plate_zone: "Pressure plates",
      waterfall_upper_zone: "Waterfall top",
      waterfall_upper1_zone: "Waterfall ledge",
      waterfall_lower_zone: "Waterfall bottom",
      waterfall_tunnel_zone: "Waterfall tunnel",
      waterfall_tunnel_a_zone: "Waterfall tunnel, upper",
      cave_tunnel_zone: "Cave tunnel",
      caves1_zone: "Cave 1",
      caves2_zone: "Cave 2",
      caves3_zone: "Cave 3",
      caves_water_zone: "Water cave"
    },
    moon: {
      nml_zone: "No Man's Land",
      bridge_zone: "Bridge",
      water_zone: "Water tanks",
      forest_zone: "Biodome",
      enter_forest_east_zone: "Biodome, east entrance",
      generator_zone: "Generator room",
      generator_exit_east_zone: "Generator, east exit",
      tower_zone_east: "East tower",
      tower_zone_east2: "East tower, upper",
      cata_left_start_zone: "Catacombs west, entrance",
      cata_left_middle_zone: "Catacombs west",
      cata_right_start_zone: "Catacombs east, entrance",
      cata_right_middle_zone: "Catacombs east",
      cata_right_end_zone: "Catacombs east, far end",
      airlock_bridge_zone: "Airlock to the bridge",
      airlock_biodome_zone: "Airlock to the biodome",
      airlock_labs_2_biodome: "Airlock, labs to biodome",
      airlock_digsite_zone: "Airlock to the dig site",
      airlock_generator_zone: "Airlock to the generator",
      airlock_east_zone: "East airlock",
      airlock_east2_zone: "East airlock 2",
      airlock_west_zone: "West airlock",
      airlock_west2_zone: "West airlock 2"
    }
  };
  function roomName(slug, id) {
    const known = ROOMS[slug]?.[id];
    if (known) return known;
    const words = String(id).replace(/zone/g, " ").replace(/_/g, " ").replace(/([a-z])(\d)/g, "$1 $2").trim().replace(/\s+/g, " ");
    return words ? words[0].toUpperCase() + words.slice(1) : String(id);
  }

  // src/map/model.js
  var GONE_MS = 2e3;
  var NO_DATA_MS = 5e3;
  var text = (value) => typeof value === "string" ? value : value == null ? "" : String(value);
  function names(session) {
    if (session.mode !== "guest") return new Map(mapPlayers(session).map((p) => [p.n, text(p.name)]));
    const known = new Map((session.lobby?.players ?? []).map((p) => [p.n, text(p?.name)]));
    if (Number.isInteger(session.seat)) known.set(session.seat + 1, text(session.name));
    return known;
  }
  var myNumber = (session) => session.mode === "guest" ? session.seat + 1 : 1;
  function mapModel(session, now, { view: view2 = latestView() } = {}) {
    const map = session.map;
    const plan = map.plan;
    if (!plan) return { status: "noPlan" };
    const me = myNumber(session);
    const known = names(session);
    const players = [];
    for (const [n, entry] of map.live) {
      if (now - entry.at > GONE_MS) {
        map.live.delete(n);
        map.tracks.delete(n);
        continue;
      }
      if (entry.s === 2) continue;
      const name = known.get(n) || "";
      let at2 = { x: entry.x, y: entry.y, yaw: entry.yaw };
      if (n === me && view2) at2 = { x: view2.origin[0], y: view2.origin[1], yaw: view2.angles[1] };
      else if (n !== me) at2 = sampleTrack(map.tracks.get(n) ?? [], now - RENDER_DELAY_MS) ?? at2;
      players.push({ n, name, letter: (name.trim()[0] ?? String(n)).toUpperCase(), color: PLAYER_COLORS[n - 1] ?? PLAYER_COLORS[0], ...at2, floor: entry.floor, room: entry.room, downed: entry.s === 1, me: n === me });
    }
    players.sort((a, b) => a.n - b.n);
    const mine = players.find((p) => p.me);
    if (!players.length && !map.state) {
      const waited = map.openedAt != null && now - map.openedAt > NO_DATA_MS;
      return { status: waited ? "noData" : "waiting" };
    }
    const floor = mine?.floor ?? 0;
    const room = map.planOk && mine && mine.room >= 0 && plan.rooms[mine.room] ? mine.room : -1;
    const state = map.planOk ? map.state : null;
    let boxIndex = -1;
    return {
      status: "ok",
      room: room >= 0 ? roomName(plan.slug, plan.rooms[room].id) : null,
      floor,
      floors: plan.floors.map((f, i) => ({ name: f.name, current: i === floor, others: i === floor ? [] : players.filter((p) => !p.me && p.floor === i).map((p) => p.letter) })),
      rooms: plan.rooms.map((r, i) => ({ index: i, name: roomName(plan.slug, r.id), open: state ? Boolean(state.rooms[i]) : null, current: i === room })),
      doors: state ? plan.doors.flatMap((d, i) => state.doors[i] ? [] : [{ index: i, cost: d.cost, kind: d.kind, at: d.at }]) : [],
      pois: plan.pois.map((p) => {
        if (p.kind === "box") boxIndex += 1;
        const active = p.kind === "box" ? Boolean(state?.box.includes(boxIndex)) : p.kind === "power" ? Boolean(state?.power) : false;
        return { kind: p.kind, id: p.id, at: p.at, active };
      }),
      players: players.map(({ n, letter, color, x, y, yaw, floor: f, downed, me: isMe }) => ({ n, letter, color, x, y, yaw, floor: f, downed, me: isMe })),
      legend: players.map((p) => ({ letter: p.letter, name: p.name, color: p.color })),
      stale: Boolean(map.state && !map.planOk)
    };
  }

  // src/map/strings.js
  var M = {
    noPlan: "There's no map for this level yet.",
    waiting: "Waiting for the map…",
    noData: "No map in this game. The host needs this version of the extension, with the cheat menu on.",
    stale: "This level changed since its map was made, so doors aren't shown.",
    close: "N to close",
    youAreIn: "You are in",
    minimap: "Minimap",
    minimapNote: "A small map in the top left corner of the game, with the room you're in. N still opens the big map.",
    on: "On",
    off: "Off",
    turnOn: "Turn on",
    turnOff: "Turn off"
  };

  // src/map/overlay.js
  var C2 = {
    panel: "rgba(18,17,16,.9)",
    line: "#34302b",
    fg: "#ece6dc",
    muted: "#9d958a",
    dim: "#6f685f",
    accent: "#e2552f",
    accent2: "#f07a4f",
    gold: "#f4c542",
    bad: "#ff6b5a",
    roomOpen: "#2a2622",
    roomOpenEdge: "#6f685f",
    roomShut: "#1d1a17",
    roomShutEdge: "#4a443d",
    roomUnknown: "#24211e",
    current: "#3a2a22"
  };
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  var PERK_LABELS = {
    specialty_armorvest: "Jug",
    specialty_quickrevive: "QR",
    specialty_fastreload: "Spd",
    specialty_rof: "DT",
    specialty_longersprint: "Stm",
    specialty_deadshot: "DS",
    specialty_additionalprimaryweapon: "MK",
    specialty_flakjacket: "PhD"
  };
  var HEAD = 52;
  var FOOT = 34;
  var PAD = 18;
  var panelBox = (width, height) => ({ x: Math.round(width * 0.12), y: Math.round(height * 0.08), w: Math.round(width * 0.76), h: Math.round(height * 0.84) });
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }
  function text2(ctx, value, x, y, { size = 13, weight = 600, color = C2.fg, align = "left", base = "middle" } = {}) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = base;
    ctx.fillText(value, x, y);
    return ctx.measureText(value).width;
  }
  function drawRooms(plan, model, view2, w, h, dpr, { labels = true } = {}) {
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(w * dpr)), Math.max(1, Math.round(h * dpr)));
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const s = view2.scale;
    const rectOf = ([, x0, y0, x1, y1]) => {
      const [ax, ay] = toScreen(view2, x0, y0);
      const [bx, by] = toScreen(view2, x1, y1);
      const left = Math.round(Math.min(ax, bx));
      const top = Math.round(Math.min(ay, by));
      return [left, top, Math.round(Math.max(ax, bx)) - left, Math.round(Math.max(ay, by)) - top];
    };
    const fill = (room, grow, color) => {
      ctx.fillStyle = color;
      for (const rect of room.rects) {
        if (rect[0] !== model.floor) continue;
        const [x, y, rw, rh] = rectOf(rect);
        ctx.fillRect(x - grow, y - grow, rw + 2 * grow, rh + 2 * grow);
      }
    };
    const look = (i) => {
      const r = model.rooms[i];
      if (r.current) return { edge: C2.accent, fill: C2.current, grow: 3, label: C2.accent2 };
      if (r.open === true) return { edge: C2.roomOpenEdge, fill: C2.roomOpen, grow: 1.5, label: C2.muted };
      if (r.open === false) return { edge: C2.roomShutEdge, fill: C2.roomShut, grow: 1.5, label: C2.dim };
      return { edge: C2.roomShutEdge, fill: C2.roomUnknown, grow: 1.5, label: C2.muted };
    };
    const order = plan.rooms.map((_, i) => i).sort((a, b) => Number(model.rooms[a].current) - Number(model.rooms[b].current));
    for (const i of order) {
      fill(plan.rooms[i], look(i).grow, look(i).edge);
      fill(plan.rooms[i], 0, look(i).fill);
    }
    const size = Math.max(10, Math.min(14, s * 160));
    for (const i of labels ? order : []) {
      const room = plan.rooms[i];
      if (room.label[0] !== model.floor) continue;
      const [lx, ly] = toScreen(view2, room.label[1], room.label[2]);
      text2(ctx, model.rooms[i].name, lx, ly, { size, weight: 700, color: look(i).label, align: "center" });
    }
    return canvas;
  }
  function drawLock(ctx, x, y, door, compact = false) {
    if (compact) {
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#121110";
      ctx.fill();
      ctx.strokeStyle = C2.gold;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      if (door.kind === "power") {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(0.65, 0.65);
        bolt(ctx, 0, 0, C2.gold);
        ctx.restore();
      } else {
        ctx.strokeRect(x - 3, y - 1, 6, 4);
        ctx.beginPath();
        ctx.arc(x, y - 1.5, 2, Math.PI, 0);
        ctx.stroke();
      }
      return;
    }
    const label = door.kind === "power" ? "" : String(door.cost);
    ctx.font = `800 11px ${FONT}`;
    const w = 26 + (label ? ctx.measureText(label).width : 0);
    roundRect(ctx, x - w / 2, y - 10, w, 20, 10);
    ctx.fillStyle = "#121110";
    ctx.fill();
    ctx.strokeStyle = C2.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const ix = x - w / 2 + 8;
    if (door.kind === "power") {
      bolt(ctx, x, y, C2.gold);
      return;
    }
    ctx.strokeStyle = C2.gold;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ix, y - 1, 8, 6);
    ctx.beginPath();
    ctx.arc(ix + 4, y - 2, 2.6, Math.PI, 0);
    ctx.stroke();
    text2(ctx, label, ix + 12, y + 0.5, { size: 11, weight: 800, color: C2.gold });
  }
  function bolt(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 7);
    ctx.lineTo(x - 4, y + 1);
    ctx.lineTo(x, y + 1);
    ctx.lineTo(x - 1, y + 7);
    ctx.lineTo(x + 4, y - 1);
    ctx.lineTo(x, y - 1);
    ctx.closePath();
    ctx.fill();
  }
  function drawPoi(ctx, x, y, poi, icons, size = 26) {
    const icon = icons?.get(poi.kind === "box" ? "box" : poi.id);
    if (icon && (poi.kind === "perk" || poi.kind === "box")) {
      ctx.save();
      ctx.globalAlpha = poi.kind === "box" && !poi.active ? 0.35 : 1;
      ctx.drawImage(icon, x - size / 2, y - size / 2, size, size);
      ctx.restore();
      if (poi.kind === "box" && poi.active) {
        ctx.strokeStyle = C2.gold;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, size / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }
    if (size !== 26) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(size / 26, size / 26);
      drawPoi(ctx, 0, 0, poi, null, 26);
      ctx.restore();
      return;
    }
    if (poi.kind === "power") {
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fillStyle = poi.active ? "#1a2a3a" : "#1b1917";
      ctx.fill();
      ctx.strokeStyle = poi.active ? "#5aa8ff" : C2.dim;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      bolt(ctx, x, y, poi.active ? "#5aa8ff" : C2.muted);
      return;
    }
    if (poi.kind === "box") {
      roundRect(ctx, x - 13, y - 9, 26, 18, 3);
      ctx.fillStyle = poi.active ? "#3b2a12" : "rgba(0,0,0,0)";
      ctx.fill();
      ctx.strokeStyle = poi.active ? C2.gold : C2.dim;
      ctx.lineWidth = poi.active ? 1.5 : 1;
      ctx.setLineDash(poi.active ? [] : [3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      text2(ctx, "?", x, y + 0.5, { size: 12, weight: 900, color: poi.active ? C2.gold : C2.dim, align: "center" });
      return;
    }
    const pap = poi.kind === "pap";
    const label = pap ? "PaP" : PERK_LABELS[poi.id] ?? "Perk";
    roundRect(ctx, x - 14, y - 11, 28, 22, 5);
    ctx.fillStyle = pap ? "#2b1f3a" : "#3a1a17";
    ctx.fill();
    ctx.strokeStyle = pap ? "#b48cff" : C2.bad;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    text2(ctx, label, x, y + 0.5, { size: 10, weight: 800, color: pap ? "#d7c2ff" : "#fff", align: "center" });
  }
  function drawPlayer(ctx, view2, p, r = 11) {
    const [x, y] = toScreen(view2, p.x, p.y);
    const rad = p.yaw * Math.PI / 180;
    const [fx, fy] = toScreen(view2, p.x + Math.cos(rad) * 100, p.y + Math.sin(rad) * 100);
    const len = Math.hypot(fx - x, fy - y) || 1;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (fx - x) / len * r * 2, y + (fy - y) / len * r * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.lineWidth = p.downed ? 3 : 2;
    ctx.strokeStyle = p.downed ? C2.bad : "#000";
    ctx.stroke();
    text2(ctx, p.letter, x, y + 0.5, { size: Math.round(r * 1.1), weight: 900, color: "#121110", align: "center" });
  }
  function drawMap(ctx, width, height, model, plan, cache, icons = null) {
    ctx.clearRect(0, 0, width, height);
    const box = panelBox(width, height);
    roundRect(ctx, box.x, box.y, box.w, box.h, 10);
    ctx.fillStyle = C2.panel;
    ctx.fill();
    ctx.strokeStyle = C2.line;
    ctx.lineWidth = 1;
    ctx.stroke();
    const left = box.x + PAD;
    const right = box.x + box.w - PAD;
    if (model.status !== "ok") {
      const message = { noPlan: M.noPlan, waiting: M.waiting, noData: M.noData }[model.status];
      text2(ctx, message, box.x + box.w / 2, box.y + box.h / 2, { size: 15, color: C2.muted, align: "center" });
      text2(ctx, M.close, right, box.y + box.h - FOOT / 2, { size: 12, color: C2.dim, align: "right" });
      return;
    }
    text2(ctx, M.youAreIn.toUpperCase(), left, box.y + 18, { size: 10, weight: 700, color: C2.muted });
    text2(ctx, model.room ?? "—", left, box.y + 36, { size: 17, weight: 800 });
    if (model.floors.length > 1) {
      let x2 = right;
      for (const floor of [...model.floors].reverse()) {
        ctx.font = `700 12px ${FONT}`;
        const others = floor.others.join(" ");
        const w = ctx.measureText(floor.name).width + (others ? ctx.measureText(others).width + 8 : 0) + 22;
        x2 -= w;
        roundRect(ctx, x2, box.y + 16, w, 24, 12);
        ctx.fillStyle = floor.current ? C2.accent : "rgba(0,0,0,0)";
        ctx.fill();
        ctx.strokeStyle = floor.current ? C2.accent : C2.line;
        ctx.lineWidth = 1;
        ctx.stroke();
        const tw = text2(ctx, floor.name, x2 + 11, box.y + 28.5, { size: 12, weight: 700, color: floor.current ? "#fff" : C2.muted });
        if (others) text2(ctx, others, x2 + 19 + tw, box.y + 28.5, { size: 12, weight: 900, color: C2.gold });
        x2 -= 6;
      }
    }
    if (model.stale) text2(ctx, M.stale, box.x + box.w / 2, box.y + HEAD + 4, { size: 12, color: C2.gold, align: "center" });
    const area = { x: box.x + PAD, y: box.y + HEAD + (model.stale ? 14 : 0), w: box.w - 2 * PAD, h: box.h - HEAD - FOOT - (model.stale ? 14 : 0) };
    const view2 = fitView(plan, model.floor, area.w, area.h, 12);
    const dpr = globalThis.devicePixelRatio || 1;
    const key = JSON.stringify([plan.slug, model.floor, area.w, area.h, dpr, model.rooms.map((r) => [r.open, r.current])]);
    if (cache.key !== key) {
      cache.key = key;
      cache.rooms = drawRooms(plan, model, view2, area.w, area.h, dpr);
    }
    ctx.drawImage(cache.rooms, area.x, area.y, area.w, area.h);
    ctx.save();
    ctx.translate(area.x, area.y);
    ctx.beginPath();
    ctx.rect(0, 0, area.w, area.h);
    ctx.clip();
    const placed = [];
    const free = (x2, y, half) => !placed.some(([px, py, ph]) => Math.abs(px - x2) < ph + half && Math.abs(py - y) < 21);
    for (const poi of model.pois) {
      if (poi.at[0] !== model.floor) continue;
      let [x2, y] = toScreen(view2, poi.at[1], poi.at[2]);
      while (!free(x2, y, 14)) x2 += 30;
      placed.push([x2, y, 14]);
      drawPoi(ctx, x2, y, poi, icons);
    }
    for (const door of model.doors) {
      if (door.at[0] !== model.floor) continue;
      let [x2, y] = toScreen(view2, door.at[1], door.at[2]);
      for (let tries = 0; tries < 6 && !free(x2, y, 28); tries += 1) y += 22;
      placed.push([x2, y, 28]);
      drawLock(ctx, x2, y, door);
    }
    const here = model.players.filter((p) => p.floor === model.floor);
    for (const p of [...here.filter((q) => !q.me), ...here.filter((q) => q.me)]) drawPlayer(ctx, view2, p);
    ctx.restore();
    let x = left;
    for (const entry of model.legend) {
      x += text2(ctx, entry.letter, x, box.y + box.h - FOOT / 2, { size: 12, weight: 900, color: entry.color }) + 5;
      x += text2(ctx, entry.name, x, box.y + box.h - FOOT / 2, { size: 12, color: C2.muted }) + 16;
    }
    text2(ctx, M.close, right, box.y + box.h - FOOT / 2, { size: 12, color: C2.dim, align: "right" });
  }
  var MapOverlay = class {
    constructor() {
      this.host = document.createElement("bo1-coop-map");
      const root = this.host.attachShadow({ mode: "closed" });
      root.innerHTML = `<style>:host { all: initial; position: fixed; left: 0; top: 0; z-index: 2147483646; pointer-events: none; display: none; } canvas { width: 100%; height: 100%; display: block; }</style><canvas></canvas>`;
      this.canvas = root.querySelector("canvas");
      this.cache = {};
      this.running = false;
    }
    mount() {
      const attach = () => {
        if (!this.host.isConnected) document.documentElement.append(this.host);
      };
      if (document.documentElement) attach();
      else document.addEventListener("DOMContentLoaded", attach, { once: true });
    }
    show(session) {
      if (this.running) return;
      this.running = true;
      this.host.style.display = "block";
      const frame = () => {
        if (!session.map.open || screen() !== "playing") {
          session.map.open = false;
          this.running = false;
          this.host.style.display = "none";
          return;
        }
        try {
          this.draw(session);
        } catch (error) {
          session.note?.(`map drawing failed: ${error?.stack ?? error}`);
          session.map.open = false;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }
    draw(session) {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const box = panelBox(width, height);
      const style = this.host.style;
      if (style.left !== `${box.x}px` || style.width !== `${box.w}px` || style.top !== `${box.y}px` || style.height !== `${box.h}px`) {
        Object.assign(style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
      }
      if (this.canvas.width !== Math.round(box.w * dpr) || this.canvas.height !== Math.round(box.h * dpr)) {
        this.canvas.width = Math.round(box.w * dpr);
        this.canvas.height = Math.round(box.h * dpr);
      }
      const ctx = this.canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, -box.x * dpr, -box.y * dpr);
      this.model = mapModel(session, Date.now());
      drawMap(ctx, width, height, this.model, session.map.plan, this.cache, session.map.icons);
    }
  };

  // src/map/minimap.js
  var SIZE = 200;
  var BAR = 26;
  var SCALE = 0.11;
  var PAD2 = SIZE / 2 + 16;
  var minimapEnabled = () => readSetting("minimap", "1") !== "0";
  var minimapCanvasSize = (dpr) => ({ w: Math.round(SIZE * dpr), h: Math.round((SIZE + BAR) * dpr) });
  function minimapFrame(session, now, { playing = screen() === "playing", view: view2 = latestView() } = {}) {
    const map = session.map;
    if (!map?.minimap || !playing || map.open || !map.plan) return null;
    const model = mapModel(session, now, { view: view2 });
    return model.status === "ok" && model.players.some((p) => p.me) ? model : null;
  }
  function minimapWindow(layer, x, y, size) {
    const [sx, sy] = toScreen(layer, x, y);
    return { sx: sx - size / 2, sy: sy - size / 2, size };
  }
  function minimapSettingBlocks(session) {
    const on = session.map?.minimap !== false;
    return [
      { kind: "kv", items: [[M.minimap, on ? M.on : M.off]] },
      { kind: "text", cls: "muted small", text: M.minimapNote },
      { kind: "buttons", buttons: [{ act: "minimapSetting", label: on ? M.turnOff : M.turnOn, style: "ghost" }] }
    ];
  }
  function minimapActions(session, save = saveSetting) {
    return {
      minimapSetting: () => {
        session.map.minimap = !session.map.minimap;
        save("minimap", session.map.minimap ? "1" : "0");
      }
    };
  }
  function floorLayer(plan, model, dpr) {
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const room of plan.rooms) {
      for (const [f, x0, y0, x1, y1] of room.rects) {
        if (f !== model.floor) continue;
        b[0] = Math.min(b[0], x0);
        b[1] = Math.min(b[1], y0);
        b[2] = Math.max(b[2], x1);
        b[3] = Math.max(b[3], y1);
      }
    }
    if (!Number.isFinite(b[0])) b.splice(0, 4, 0, 0, 1, 1);
    const view2 = { scale: SCALE, rotate: 0, tx: PAD2 - b[0] * SCALE, ty: PAD2 + b[3] * SCALE };
    const w = (b[2] - b[0]) * SCALE + 2 * PAD2;
    const h = (b[3] - b[1]) * SCALE + 2 * PAD2;
    return { view: view2, canvas: drawRooms(plan, model, view2, w, h, dpr, { labels: false }) };
  }
  var Minimap = class {
    constructor() {
      this.host = document.createElement("bo1-coop-minimap");
      const root = this.host.attachShadow({ mode: "closed" });
      root.innerHTML = `<style>:host { all: initial; position: fixed; top: 12px; left: 12px; width: ${SIZE}px; height: ${SIZE + BAR}px; z-index: 2147483645; pointer-events: none; display: none; } canvas { width: 100%; height: 100%; display: block; }</style><canvas></canvas>`;
      this.canvas = root.querySelector("canvas");
      this.cache = {};
      this.shown = false;
      this.brokenSlug = void 0;
    }
    mount() {
      const attach = () => {
        if (!this.host.isConnected) document.documentElement.append(this.host);
      };
      if (document.documentElement) attach();
      else document.addEventListener("DOMContentLoaded", attach, { once: true });
    }
    /** Runs for the whole page: a cheap check per frame, and a draw while the minimap shows. */
    start(session) {
      const show = (on) => {
        if (on === this.shown) return;
        this.shown = on;
        this.host.style.display = on ? "block" : "none";
      };
      const frame = () => {
        const slug = session.map?.slug;
        if (this.brokenSlug !== void 0 && this.brokenSlug !== slug) this.brokenSlug = void 0;
        try {
          const model = this.brokenSlug === void 0 ? minimapFrame(session, Date.now()) : null;
          show(Boolean(model));
          if (model) this.draw(session, model);
        } catch (error) {
          session.note?.(`minimap failed: ${error?.stack ?? error}`);
          this.brokenSlug = slug;
          show(false);
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }
    draw(session, model) {
      const dpr = window.devicePixelRatio || 1;
      const size = minimapCanvasSize(dpr);
      if (this.canvas.width !== size.w || this.canvas.height !== size.h) {
        this.canvas.width = size.w;
        this.canvas.height = size.h;
      }
      this.model = model;
      const me = model.players.find((p) => p.me);
      const map = session.map;
      const plan = map.plan;
      const ctx = this.canvas.getContext("2d");
      ctx.setTransform(size.w / SIZE, 0, 0, size.h / (SIZE + BAR), 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE + BAR);
      roundRect(ctx, 0.5, 0.5, SIZE - 1, SIZE + BAR - 1, 10);
      ctx.fillStyle = "rgba(18,17,16,.94)";
      ctx.fill();
      ctx.strokeStyle = C2.line;
      ctx.lineWidth = 1;
      ctx.stroke();
      text2(ctx, model.room ?? "—", SIZE / 2, BAR / 2 + 1, { size: 13, weight: 800, align: "center" });
      const current = model.rooms.findIndex((r) => r.current);
      const key = `${plan.slug}|${model.floor}|${dpr}|${map.planOk}|${map.state?.at ?? 0}|${current}`;
      if (this.cache.key !== key) this.cache = { key, ...floorLayer(plan, model, dpr) };
      const { view: view2, canvas } = this.cache;
      const win = minimapWindow(view2, me.x, me.y, SIZE);
      const sx = Math.round(win.sx * dpr) / dpr;
      const sy = Math.round(win.sy * dpr) / dpr;
      ctx.save();
      roundRect(ctx, 1, BAR, SIZE - 2, SIZE - 1, 9);
      ctx.clip();
      ctx.drawImage(canvas, sx * dpr, sy * dpr, SIZE * dpr, SIZE * dpr, 0, BAR, SIZE, SIZE);
      const mini = { scale: view2.scale, rotate: 0, tx: view2.tx - sx, ty: view2.ty - sy + BAR };
      for (const poi of model.pois) {
        if (poi.at[0] !== model.floor) continue;
        const [x, y] = toScreen(mini, poi.at[1], poi.at[2]);
        drawPoi(ctx, x, y, poi, map.icons, 18);
      }
      for (const door of model.doors) {
        if (door.at[0] !== model.floor) continue;
        const [x, y] = toScreen(mini, door.at[1], door.at[2]);
        drawLock(ctx, x, y, door, true);
      }
      const here = model.players.filter((p) => p.floor === model.floor);
      for (const p of [...here.filter((q) => !q.me), me]) drawPlayer(ctx, mini, p, p.me ? 8 : 7);
      ctx.restore();
    }
  };

  // src/cheats/setup.js
  var WRITE_TIMEOUT_MS = 5e3;
  function createCheats() {
    return {
      enabled: readSetting("cheats", "1") !== "0",
      /** true once the mod was handed to the engine, false when it could not be, null before the game starts. */
      ok: null,
      ...createBridge()
    };
  }
  var wantsCheats = (session) => session.cheats.enabled && session.mode !== "guest" && session.patched;
  async function prepareCheats(session, args) {
    if (!wantsCheats(session)) return;
    try {
      const base = modBase(args);
      const timeout = new Promise((resolve) => setTimeout(() => resolve(false), WRITE_TIMEOUT_MS));
      const ok = base ? await Promise.race([writeModFiles(base, MOD_FILES), timeout]) : false;
      if (ok) addCheatsMod(args, { horde: currentHorde() });
      session.cheats.ok = ok;
      session.note(`cheat menu: ${ok ? "mod loaded" : "mod not written"}`);
    } catch (error) {
      session.cheats.ok = false;
      session.note(`cheat menu failed: ${error?.stack ?? error}`);
    }
  }
  function cheatsSettingBlocks(session) {
    const on = session.cheats.enabled;
    return [
      { kind: "kv", items: [[C.setting, on ? C.on : C.off]] },
      { kind: "text", cls: "muted small", text: C.note },
      { kind: "buttons", buttons: [{ act: "cheatsSetting", label: on ? C.turnOff : C.turnOn, style: "ghost" }] },
      ...minimapSettingBlocks(session)
    ];
  }
  function cheatsSettingActions(session) {
    return {
      cheatsSetting: () => {
        session.cheats.enabled = !session.cheats.enabled;
        saveSetting("cheats", session.cheats.enabled ? "1" : "0");
        session.notice = C.reload;
      },
      ...minimapActions(session)
    };
  }

  // src/engine/wasm.js
  function encodeU32(value) {
    const out = [];
    let n = value >>> 0;
    do {
      let byte = n & 127;
      n >>>= 7;
      if (n) byte |= 128;
      out.push(byte);
    } while (n);
    return out;
  }
  function encodeI32(value) {
    const out = [];
    let n = value | 0;
    for (; ; ) {
      const byte = n & 127;
      n >>= 7;
      const last = n === 0 && !(byte & 64) || n === -1 && byte & 64;
      out.push(last ? byte : byte | 128);
      if (last) return out;
    }
  }
  function readU32(bytes, at2) {
    let value = 0;
    let shift = 0;
    let byte;
    do {
      byte = bytes[at2++];
      value |= (byte & 127) << shift;
      shift += 7;
    } while (byte & 128);
    return [value >>> 0, at2];
  }
  function readI32(bytes, at2) {
    let value = 0;
    let shift = 0;
    let byte;
    do {
      byte = bytes[at2++];
      value |= (byte & 127) << shift;
      shift += 7;
    } while (byte & 128);
    if (shift < 32 && byte & 64) value |= -1 << shift;
    return [value, at2];
  }
  var op = {
    unreachable: 0,
    if: [4, 64],
    end: 11,
    return: 15,
    drop: 26,
    i32Eq: 70,
    i32GeU: 79,
    i32Add: 106,
    i32Sub: 107,
    globalGet: 35,
    globalSet: 36,
    i32Load: [40, 2, 0],
    atomicLoad: [254, 16, 2, 0],
    atomicExchange: [254, 65, 2, 0],
    i32: (value) => [65, ...encodeI32(value)],
    call: (index) => [16, ...encodeU32(index)],
    get: (local) => [32, ...encodeU32(local)],
    set: (local) => [33, ...encodeU32(local)],
    tee: (local) => [34, ...encodeU32(local)]
  };
  var SECTION = { custom: 0, import: 2, code: 10 };
  function countFunctionImports(bytes, at2) {
    let [count, p] = readU32(bytes, at2);
    let functions = 0;
    const skipName = () => {
      const [length, next] = readU32(bytes, p);
      p = next + length;
    };
    const skipLimits = () => {
      const flags = bytes[p++];
      p = readU32(bytes, p)[1];
      if (flags & 1) p = readU32(bytes, p)[1];
    };
    for (let i = 0; i < count; i += 1) {
      skipName();
      skipName();
      const kind = bytes[p++];
      if (kind === 0) {
        functions += 1;
        p = readU32(bytes, p)[1];
      } else if (kind === 1) {
        p += 1;
        skipLimits();
      } else if (kind === 2) {
        skipLimits();
      } else if (kind === 3) {
        p += 2;
      } else if (kind === 4) {
        p += 1;
        p = readU32(bytes, p)[1];
      } else {
        throw new Error(`unknown import kind ${kind}`);
      }
    }
    return functions;
  }
  function readModule(bytes) {
    if (bytes[0] !== 0 || bytes[1] !== 97 || bytes[2] !== 115 || bytes[3] !== 109) throw new Error("not a wasm module");
    const sections = [];
    let importedFunctions = 0;
    let names2 = null;
    for (let at2 = 8; at2 < bytes.length; ) {
      const id = bytes[at2];
      const [size, body] = readU32(bytes, at2 + 1);
      const section = { id, start: at2, body, end: body + size };
      sections.push(section);
      if (id === SECTION.import) importedFunctions = countFunctionImports(bytes, body);
      if (id === SECTION.custom) {
        const [length, nameAt] = readU32(bytes, body);
        if (new TextDecoder().decode(bytes.subarray(nameAt, nameAt + length)) === "name") names2 = { at: nameAt + length, end: section.end };
      }
      at2 = section.end;
    }
    const code = sections.find((s) => s.id === SECTION.code);
    if (!code) throw new Error("no code section");
    return { sections, code, importedFunctions, names: names2 };
  }
  function functionNames(bytes, module, wanted) {
    const result = /* @__PURE__ */ new Map();
    if (!module.names) return result;
    const want = new Set(wanted);
    for (let at2 = module.names.at; at2 < module.names.end; ) {
      const kind = bytes[at2++];
      const [size, body] = readU32(bytes, at2);
      if (kind === 1) {
        let [count, p] = readU32(bytes, body);
        for (let i = 0; i < count && result.size < want.size; i += 1) {
          let index, length;
          [index, p] = readU32(bytes, p);
          [length, p] = readU32(bytes, p);
          if (want.has(index)) result.set(index, new TextDecoder().decode(bytes.subarray(p, p + length)));
          p += length;
        }
      }
      at2 = body + size;
    }
    return result;
  }
  function localsEnd(body, params, index) {
    let [groups, p] = readU32(body, 0);
    let next = params;
    let type = null;
    for (let g = 0; g < groups; g += 1) {
      let count;
      [count, p] = readU32(body, p);
      if (index >= next && index < next + count) type = body[p];
      next += count;
      p += 1;
    }
    return { at: p, type };
  }
  function rewriteFunctions(bytes, module, edits) {
    const { code } = module;
    let [count, at2] = readU32(bytes, code.body);
    const parts2 = [Uint8Array.from(encodeU32(count))];
    let applied = 0;
    for (let i = 0; i < count; i += 1) {
      const [size, start2] = readU32(bytes, at2);
      const end = start2 + size;
      const edit = edits.get(i);
      if (edit) {
        const body = edit(bytes.subarray(start2, end));
        parts2.push(Uint8Array.from(encodeU32(body.length)), body);
        applied += 1;
      } else {
        parts2.push(bytes.subarray(at2, end));
      }
      at2 = end;
    }
    if (applied !== edits.size) throw new Error(`patched ${applied} of ${edits.size} functions`);
    const length = parts2.reduce((sum, part) => sum + part.length, 0);
    const header = Uint8Array.from([10, ...encodeU32(length)]);
    const out = new Uint8Array(code.start + header.length + length + (bytes.length - code.end));
    out.set(bytes.subarray(0, code.start), 0);
    let o = code.start;
    out.set(header, o);
    o += header.length;
    for (const part of parts2) {
      out.set(part, o);
      o += part.length;
    }
    out.set(bytes.subarray(code.end), o);
    return out;
  }
  var hex = (text3) => text3.trim().split(/\s+/).map((byte) => parseInt(byte, 16));
  async function sha256(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // src/engine/patch.js
  function serverFrameHook(build, scratch) {
    const { mailbox, functions } = build;
    return [
      ...op.i32(mailbox.command),
      ...op.i32(0),
      ...op.atomicExchange,
      ...op.tee(scratch),
      ...op.if,
      ...op.i32(0),
      ...op.get(scratch),
      ...op.call(functions.cbufAddText[0]),
      op.end,
      ...op.i32(0),
      ...op.set(scratch),
      ...op.i32(mailbox.freeze),
      ...op.atomicLoad,
      ...op.if,
      ...op.call(functions.svWaitServer[0]),
      ...op.get(0),
      op.return,
      op.end
    ];
  }
  function loopPacketHook(build, scratch) {
    const { mailbox, loopback } = build;
    const serverQueue = loopback.base + loopback.stride;
    return [
      ...op.get(0),
      ...op.i32(1),
      op.i32Eq,
      ...op.if,
      ...op.i32(mailbox.inboundRing),
      ...op.atomicLoad,
      ...op.tee(scratch),
      ...op.if,
      ...op.i32(serverQueue + loopback.offGet),
      ...op.i32Load,
      ...op.i32(serverQueue + loopback.offSend),
      ...op.i32Load,
      op.i32GeU,
      ...op.if,
      ...op.get(scratch),
      ...op.set(0),
      op.end,
      op.end,
      ...op.i32(0),
      ...op.set(scratch),
      op.end
    ];
  }
  var prepend = (code, params, scratch) => (body) => {
    const { at: at2, type } = localsEnd(body, params, scratch);
    if (type !== 127) throw new Error(`local ${scratch} is not an i32`);
    const out = new Uint8Array(body.length + code.length);
    out.set(body.subarray(0, at2), 0);
    out.set(code, at2);
    out.set(body.subarray(at2), at2 + code.length);
    return out;
  };
  var assertsContinue = (params) => (body) => {
    let [groups, p] = readU32(body, 0);
    for (let g = 0; g < groups; g += 1) p = readU32(body, p)[1] + 1;
    const expect = (ok, what) => {
      if (!ok) throw new Error(`assert handler: ${what}`);
    };
    expect(body[p] === op.globalGet, "no stack frame");
    const [stackPointer, a] = readU32(body, p + 1);
    expect(body[a] === 65, "no frame size");
    const [frameSize, b] = readI32(body, a + 1);
    expect(body[b] === op.i32Sub && body[b + 1] === 34, "unexpected prologue");
    const [frameLocal, c] = readU32(body, b + 2);
    expect(frameLocal >= params && body[c] === op.globalSet && readU32(body, c + 1)[0] === stackPointer, "unexpected prologue");
    const end = body.length;
    expect(body[end - 1] === op.end && body[end - 2] === op.unreachable, "does not end in unreachable");
    const epilogue = [...op.get(frameLocal), ...op.i32(frameSize), op.i32Add, op.globalSet, ...encodeU32(stackPointer), ...op.i32(1), op.return, op.end];
    const out = new Uint8Array(end - 2 + epilogue.length);
    out.set(body.subarray(0, end - 2), 0);
    out.set(epilogue, end - 2);
    return out;
  };
  var dropCalls = (callee, args, expected) => (body) => {
    const call = op.call(callee);
    if (call.length !== args) throw new Error("call and drops differ in size");
    const out = Uint8Array.from(body);
    let found = 0;
    for (let i = 0; i + call.length <= out.length; i += 1) {
      if (call.every((byte, k) => out[i + k] === byte)) {
        out.fill(op.drop, i, i + call.length);
        found += 1;
        i += call.length - 1;
      }
    }
    if (found !== expected) throw new Error(`found ${found} calls to replace, expected ${expected}`);
    return out;
  };
  var replaceOnce = ({ fn, find, replace }) => (body) => {
    const from = hex(find);
    const to = hex(replace);
    if (from.length !== to.length) throw new Error(`${fn}: replacement changes the length`);
    let at2 = -1;
    let found = 0;
    for (let i = 0; i + from.length <= body.length; i += 1) {
      if (from.every((byte, k) => body[i + k] === byte)) {
        at2 = i;
        found += 1;
      }
    }
    if (found !== 1) throw new Error(`${fn}: pattern found ${found} times, expected once`);
    const out = Uint8Array.from(body);
    out.set(to, at2);
    return out;
  };
  function patchEngine(input, build, role = null) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const module = readModule(bytes);
    const { functions } = build;
    const names2 = functionNames(bytes, module, Object.values(functions).map(([index]) => index));
    for (const [index, name] of Object.values(functions)) {
      if (names2.get(index) !== name) throw new Error(`function ${index} is ${names2.get(index)}, expected ${name}`);
    }
    const slot = (key) => functions[key][0] - module.importedFunctions;
    const edits = /* @__PURE__ */ new Map([
      [slot("svFrame"), prepend(serverFrameHook(build, 1), 1, 1)],
      [slot("netGetLoopPacket"), prepend(loopPacketHook(build, 4), 3, 4)],
      [slot("assertHandler"), assertsContinue(4)],
      // Attaching effects and weapons to another player's model fails fatally if that model is not loaded yet, which
      // solo never runs into: leave the attachment as it was instead.
      [slot("cachedTagUpdate"), dropCalls(functions.comError[0], 3, 2)]
    ]);
    for (const patch of build.bytePatches) {
      if (!patch.role || patch.role === role) edits.set(slot(patch.fn), replaceOnce(patch));
    }
    return rewriteFunctions(bytes, module, edits);
  }

  // src/session/lobby.js
  var roundPing = (rtt) => Number.isFinite(rtt) ? Math.round(rtt) : null;
  var LEFT_VISIBLE_MS = 6e4;
  var guestPath = (session, g) => g?.present ? session.links.get(g.seat) === "direct" ? "direct" : "relay" : null;
  function hostRoster(session) {
    const screen2 = screen();
    const playing = screen2 === "playing";
    const [hostStatus, hostTone] = playing ? ["ingame", "ok"] : screen2 === "ready" ? ["lobby", "ok"] : session.engine || screen2 === "loading" || screen2 === "download" ? ["loading", "wait"] : ["picking", "wait"];
    const players = [{ n: 1, name: session.name, host: true, status: hostStatus, tone: hostTone, ping: null, path: null }];
    const rtts = session.stats?.rtts ?? {};
    for (let seat = 1; seat <= MAX_GUESTS; seat += 1) {
      const g = session.guests.get(seat);
      const [status, tone] = guestStatus(session, g, seat, playing);
      players.push({ n: seat + 1, name: status === "free" ? "" : cleanName(g?.state?.name), status, tone, ping: g?.present ? roundPing(rtts[seat]) : null, path: guestPath(session, g) });
    }
    return { t: "lobby", players, slug: MAP_SLUGS[session.zone ?? currentZone()] ?? null, horde: currentHorde(), playing };
  }
  function guestStatus(session, g, seat, playing) {
    const phase = g?.state?.phase;
    if (!g || !g.present && !g.slot && (!g.leftAt || Date.now() - g.leftAt > LEFT_VISIBLE_MS)) return ["free", ""];
    if (!g.present) return g.slot ? ["reconnecting", "wait"] : ["left", "bad"];
    if (["ended", "failed"].includes(phase)) return ["disconnected", "bad"];
    if (g.slot?.state === SLOT.active) return playing ? ["ingame", "ok"] : ["ready", "ok"];
    if (session.joinTurn === seat || g.slot || CONNECTING.includes(phase)) return ["joining", "wait"];
    if (phase === "waiting-host" && session.engine) return ["turn", "wait"];
    if (phase === "joining-room" && !session.engine) return ["opening", "wait"];
    return ["loading", "wait"];
  }
  function broadcastLobby(session) {
    if (!session.peer) {
      session.sentLobby = null;
      return;
    }
    const lobby = hostRoster(session);
    const key = JSON.stringify(lobby);
    if (key === session.sentLobby && Date.now() - (session.sentLobbyAt ?? 0) <= 5e3) return;
    session.sentLobby = key;
    session.sentLobbyAt = Date.now();
    send(session, lobby);
  }
  function guestRoster(session) {
    let players = Array.isArray(session.lobby?.players) ? session.lobby.players.slice(0, MAX_GUESTS + 1) : [];
    if (!players.length) {
      players = [{ n: 1, name: "", host: true, status: session.peer ? "loading" : "away", tone: session.peer ? "wait" : "" }];
      for (let seat = 1; seat <= MAX_GUESTS; seat += 1) players.push({ n: seat + 1, name: "", status: "free", tone: "" });
    }
    if (!validSeat(session.seat)) return players;
    const [status, tone] = ownStatus(session);
    return players.map((p) => p.n === session.seat + 1 ? { ...p, name: session.name, ping: roundPing(session.stats?.rtt), path: ownPath(session), status, tone } : p);
  }
  var ownPath = (session) => session.direct?.state(0) === "direct" ? "direct" : "relay";
  function connectionText(session) {
    if (session.mode === "guest") return T.path[session.direct?.state(0) ?? "relay"] ?? T.path.relay;
    const present = [...session.guests.values()].filter((g) => g.present);
    if (!present.length) return null;
    const direct = present.filter((g) => session.links.get(g.seat) === "direct").length;
    return T.pathCount(direct, present.length - direct);
  }
  function ownStatus(session) {
    const phase = session.phase;
    if (phase === "connected") return session.lobby?.playing || session.hostState?.screen === "playing" ? ["ingame", "ok"] : ["ready", "ok"];
    if (["ended", "failed"].includes(phase)) return ["disconnected", "bad"];
    if (CONNECTING.includes(phase)) return ["joining", "wait"];
    if (phase === "waiting-host" && session.hostState?.ready && !session.hostState.turn) return ["turn", "wait"];
    return ["loading", "wait"];
  }

  // src/session/host.js
  var HOST_QPORT = 7;
  var CONNECTING = ["freezing", "connect", "challenging", "joining"];
  var JOIN_TURN_MS = 6e4;
  var STATE_REPEAT_MS3 = 2e3;
  var KICK_AFTER_LEFT_MS = 15e3;
  var KICK_SPACING_MS = 15e3;
  var MAX_KICKS = 4;
  var FIXED_CAMERA = 1024;
  function prepareHost(session, Module, args) {
    const engine = new EngineMemory(Module, session.build);
    if (!engine.mailboxesIdle()) throw new Error("unexpectedMemory");
    const queues = engine.createGuestQueues(MAX_GUESTS);
    engine.useInboundQueue(queues.inbound.port);
    session.engine = engine;
    session.queues = queues;
    insertBeforeDevmap(args, ["+setqport", String(HOST_QPORT)]);
    insertBeforeDevmap(args, ["+set", "kisak_web_coop", "1", "+set", "kisak_coop_players", "1"]);
    coopWait(session, 1);
    session.zone = devmapZone(args);
    session.gameSettings = gameSettings(args);
    const ports = Object.fromEntries(Object.entries(queues.seats).map(([seat, q]) => [seat, q.port]));
    session.pump.postMessage({
      type: "attach",
      buffer: engine.buffer,
      loopback: session.build.loopback,
      reads: Object.entries(queues.seats).map(([seat, q]) => ({ seat: Number(seat), base: q.base })),
      writeBase: queues.inbound.base,
      ports,
      reading: true,
      injecting: true,
      dropCommands: ["rcon"]
      // nobody but the host gets to run server commands
    });
    session.note(`guest queues: ${Object.values(ports).join(", ")}, inbound ${queues.inbound.port}`);
    if (session.peer) sendGameInfo(session);
  }
  function hostTick(session) {
    const screen2 = screen();
    const engine = session.engine;
    const now = Date.now();
    const ready = Boolean(engine) && (screen2 === "ready" || screen2 === "playing");
    const slots = engine && session.queues ? engine.serverSlots() : [];
    for (let seat = 1; seat <= MAX_GUESTS; seat += 1) {
      const port = session.queues?.seats[seat]?.port;
      const slot = port ? slots.find((s) => s.loopback && s.port === port) ?? null : null;
      if (slot || session.guests.has(seat)) guest(session, seat).slot = slot;
    }
    const all = [...session.guests.values()];
    const present = all.filter((g) => g.present);
    const active = (g) => g.slot?.state === SLOT.active;
    const phase = (g) => g.state?.phase;
    updateJoinTurn(session, present, ready, now);
    for (const g of present) {
      const normalSpeed = !engine || engine.codeTimeScale() >= NORMAL_SPEED;
      const state = { t: "state", to: g.seat, ready, slot: g.slot?.state ?? 0, screen: screen2, turn: session.joinTurn === g.seat, normalSpeed };
      sendWhenChanged(session, g, "state", state, now);
    }
    session.gate = screen2 === "ready" && !session.startAlone && present.some((g) => !active(g) && !["ended", "failed"].includes(phase(g)));
    const joining = present.some((g) => ["waiting-host", ...CONNECTING].includes(phase(g)));
    if (engine && joining && screen2 === "ready" && !session.introReleased && engine.int(session.build.introState) === 1) {
      session.introReleased = true;
      engine.Module._KB_Input?.(7, 1, 0);
      session.note("released the start screen so players can connect");
    }
    coopWait(session, screen2 === "playing" ? 0 : 1);
    syncPause(session, present, active, phase, screen2);
    broadcastLobby(session);
    const view2 = latestView();
    if (present.some(active) && view2 && view2.ms !== session.sentViewMs && !(view2.flags & FIXED_CAMERA)) {
      session.sentViewMs = view2.ms;
      send(session, { t: "pos", o: view2.origin, a: view2.angles });
    }
    for (const g of all) kickIfStale(session, g, phase(g), now);
  }
  function coopWait(session, mask) {
    const wait = session.engine?.Module._KB_CoopWait;
    if (!wait || session.coopWaitMask === mask) return;
    wait(mask);
    session.coopWaitMask = mask;
    session.note(mask ? "level start held for the host's click" : "level start released");
  }
  function updateJoinTurn(session, present, ready, now) {
    const turn2 = session.joinTurn ? session.guests.get(session.joinTurn) : null;
    const phase = turn2?.state?.phase;
    if (turn2 && (!turn2.present || ["connected", "ended", "failed"].includes(phase) || now - session.joinTurnAt > JOIN_TURN_MS)) {
      session.note(`player ${turn2.seat + 1}'s turn is over (${turn2.present ? phase : "left"})`);
      session.joinTurn = null;
    }
    if (session.joinTurn || !ready) return;
    const next = present.find((g) => ["waiting-host", "connect"].includes(g.state?.phase));
    if (next) {
      session.joinTurn = next.seat;
      session.joinTurnAt = now;
      session.note(`player ${next.seat + 1} may connect`);
    }
  }
  function sendWhenChanged(session, g, kind, message, now) {
    const key = JSON.stringify(message);
    const last = g.sent[kind];
    if (last?.key === key && now - last.at <= STATE_REPEAT_MS3) return;
    g.sent[kind] = { key, at: now };
    send(session, message);
  }
  function syncPause(session, present, active, phase, screen2) {
    const engine = session.engine;
    const menuOpen = Boolean(engine?.menuOpen()) && screen2 === "playing";
    session.menuOpen = menuOpen;
    const linked = present.filter((g) => active(g) && phase(g) === "connected");
    const connecting = present.some((g) => !active(g) && CONNECTING.includes(phase(g)));
    if (engine) applyHostPause(session, linked.length > 0 && !connecting && (menuOpen || linked.some((g) => g.pause)), menuOpen);
    if (engine && !session.paused && present.some((g) => !active(g))) {
      if (engine.dvar("clPaused")) engine.setDvar("clPaused", 0);
      if (engine.dvar("svPaused")) engine.setDvar("svPaused", 0);
    }
    for (const g of present) {
      const on = menuOpen || linked.some((other) => other !== g && other.pause);
      if (on !== g.sentPause) {
        g.sentPause = on;
        send(session, { t: "pause", on, to: g.seat });
      }
    }
  }
  function applyHostPause(session, paused, menuOpen) {
    const engine = session.engine;
    if (paused) {
      if (!session.paused) session.note(menuOpen ? "paused" : "paused by a guest");
      engine.holdServer(true);
      if (!engine.dvar("svPaused")) engine.setDvar("svPaused", 1);
      if (!engine.dvar("clPaused")) engine.setDvar("clPaused", 1);
      engine.keepClientAlive();
    } else if (session.paused) {
      engine.holdServer(false);
      engine.setDvar("svPaused", 0);
      if (!menuOpen) engine.setDvar("clPaused", 0);
      engine.keepClientAlive();
      session.note("resumed");
    }
    session.paused = paused;
  }
  function kickIfStale(session, g, phase, now) {
    const slot = g.slot;
    const stale = slot && slot.state >= SLOT.connected && (g.present && phase && !["challenging", "joining", "connected"].includes(phase) || !g.present && g.leftAt && now - g.leftAt > KICK_AFTER_LEFT_MS);
    if (!stale) {
      g.kicks = 0;
      return;
    }
    if (g.kicks >= MAX_KICKS || now - g.lastKickAt <= KICK_SPACING_MS) return;
    if (session.engine.command(`clientkick ${slot.slot}`)) {
      g.lastKickAt = now;
      g.kicks += 1;
      session.note(`freed player ${g.seat + 1}'s slot ${slot.slot} (${g.present ? phase : "left"})`);
    }
  }

  // src/session/hooks.js
  var ENGINE_URL = /\/artifacts\/KisakBlack-web\.wasm(\?|$)/;
  var ENGINE_MIN_BYTES = 5e6;
  function hookWasm(session) {
    const instantiate = WebAssembly.instantiate;
    const instantiateStreaming = WebAssembly.instantiateStreaming;
    const wanted = () => (session.mode || session.controller) && !session.hash;
    async function prepare(bytes) {
      session.hash = await sha256(bytes);
      session.build = BUILDS[session.hash] ?? null;
      if (!session.build) {
        session.fail("engineUpdated");
        session.note(`unknown engine ${session.hash}`);
        return bytes;
      }
      try {
        const patched = patchEngine(bytes, session.build, session.mode);
        session.patched = true;
        session.note("engine patched");
        return patched;
      } catch (error) {
        session.fail("enginePatchFailed", error.message);
        session.note(`patch failed: ${error.stack ?? error}`);
        return bytes;
      }
    }
    WebAssembly.instantiateStreaming = async function(source, imports) {
      if (!wanted()) return instantiateStreaming.call(WebAssembly, source, imports);
      const response = await source;
      if (!ENGINE_URL.test(response.url ?? "")) return instantiateStreaming.call(WebAssembly, response, imports);
      const bytes = new Uint8Array(await response.arrayBuffer());
      return instantiate.call(WebAssembly, await prepare(bytes), imports);
    };
    WebAssembly.instantiate = function(source, imports) {
      const bytes = source instanceof ArrayBuffer ? new Uint8Array(source) : ArrayBuffer.isView(source) ? new Uint8Array(source.buffer, source.byteOffset, source.byteLength) : null;
      if (wanted() && bytes && bytes.byteLength > ENGINE_MIN_BYTES) return prepare(bytes.slice()).then((ready) => instantiate.call(WebAssembly, ready, imports));
      return instantiate.call(WebAssembly, source, imports);
    };
  }
  function hookMain(session) {
    Object.defineProperty(Object.prototype, "callMain", {
      configurable: true,
      enumerable: false,
      set(original) {
        delete Object.prototype.callMain;
        const Module = this;
        Object.defineProperty(Module, "callMain", {
          configurable: true,
          enumerable: true,
          writable: true,
          value(args) {
            if (!session.mode && session.patched) session.engine = new EngineMemory(Module, session.build);
            if (!session.mode || !session.patched) {
              if (!wantsCheats(session)) return original.call(this, args);
              return prepareCheats(session, args).then(() => original.call(this, args));
            }
            return (async () => {
              try {
                if (session.mode === "host") prepareHost(session, Module, args);
                else await prepareGuest(session, Module, args);
              } catch (error) {
                const [key, argument] = String(error.message).split(/:(.*)/s);
                if (T[key]) session.fail(key, argument);
                else session.error = error.message;
                session.note(`setup failed: ${error.stack ?? error}`);
                session.engine?.useInboundQueue(0);
              }
              if (session.mode === "host") await prepareCheats(session, args);
              return original.call(this, args);
            })();
          }
        });
      }
    });
  }
  function holdStart(session, card) {
    const block = (event) => {
      if (!session.gate || event.composedPath?.().includes(card)) return;
      event.stopImmediatePropagation();
      event.preventDefault();
    };
    for (const type of ["keydown", "keyup", "mousedown", "mouseup", "click", "pointerdown", "pointerup"]) window.addEventListener(type, block, true);
  }

  // src/ui/view.js
  var COPIED_MS = 2e3;
  var CONNECTED = ["ingame", "ready", "lobby"];
  var ON_THE_WAY = ["joining", "turn", "loading", "opening", "reconnecting"];
  function view(session) {
    const screen2 = screen();
    const playing = screen2 === "playing" && !session.engine?.menuOpen();
    const blocks = [];
    if (session.error) blocks.push({ kind: "callout", tone: "bad", text: session.error });
    if (session.notice) blocks.push({ kind: "callout", tone: "info", text: session.notice });
    if (session.overQuota) {
      const at2 = session.overQuota.resetsAt ? new Date(session.overQuota.resetsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
      blocks.push({ kind: "callout", tone: "bad", text: T.relayOverQuota(at2), buttons: [{ act: "openRelayGuide", label: T.relayGuide, style: "primary" }, { act: "editRelayNow", label: T.changeRelay }] });
    }
    if (session.update) blocks.push({ kind: "callout", tone: "ok", text: T.updateAvailable(session.update.version), buttons: [{ act: "openUpdate", label: T.updateHow, style: "primary" }] });
    if (!session.mode) return soloView(session, blocks, playing);
    const hosting = session.mode === "host";
    const roster = hosting ? hostRoster(session).players : guestRoster(session);
    const chip = hosting ? hostSection(session, blocks, roster, screen2) : guestSection(session, blocks, screen2);
    const me = hosting ? 1 : validSeat(session.seat) ? session.seat + 1 : 0;
    const connected = roster.filter((p) => CONNECTED.includes(p.status)).length;
    blocks.push({ kind: "players", label: T.players, aside: T.playersAside(connected, MAX_GUESTS + 1), players: playerRows(session, roster, me) });
    const actions2 = [];
    if (!hosting && session.phase === "connected" && session.hostPos) actions2.push({ act: "goToHost", label: T.goToHost });
    actions2.push({ act: "leave", label: T.leave, style: "ghost" });
    blocks.push({ kind: "buttons", buttons: actions2 });
    if (funAvailable(session)) blocks.push(funSection(session));
    blocks.push(settingsSection(session, true));
    const ping = session.stats?.rtt != null ? `${Math.round(session.stats.rtt)} ms` : "–";
    const pill = {
      players: roster.map((p) => ({ n: p.n, on: CONNECTED.includes(p.status) })),
      texts: [session.paused ? T.chip.paused : ping, ...session.gamepad?.status === "active" ? ["🎮"] : []]
    };
    return { chip, tagline: `${T.room} ${session.room}`, blocks, compact: playing && !session.error && !session.cheats?.panel, pill };
  }
  function soloView(session, blocks, playing) {
    blocks.push({ kind: "text", cls: "muted", text: T.intro });
    blocks.push({ kind: "buttons", buttons: [{ act: "host", label: T.host, style: "primary" }] });
    blocks.push({ kind: "input", label: T.joinLabel, field: "join", placeholder: T.joinPlaceholder, act: "join", button: T.join });
    if (onSharedRelay(session)) blocks.push({ kind: "callout", tone: "info", text: T.relayPitch, buttons: relayButtons() });
    if (session.engine) blocks.push(funSection(session));
    blocks.push(settingsSection(session, false));
    const pill = session.gamepad?.status === "active" ? { texts: ["🎮"] } : null;
    return { chip: { text: T.chip.solo }, tagline: T.tagline, blocks, compact: playing && !session.error && !session.notice && !session.cheats?.panel, pill };
  }
  function hostSection(session, blocks, roster, screen2) {
    const freeSeats = roster.filter((p) => p.status === "free").length;
    const onTheWay = roster.some((p) => !p.host && ON_THE_WAY.includes(p.status));
    const mapOpen = Boolean(session.engine) || screen2 === "loading" || screen2 === "download";
    const step2 = screen2 === "playing" ? 3 : screen2 === "ready" ? 2 : mapOpen ? 1 : 0;
    const linkCopied = Date.now() - session.copiedLinkAt < COPIED_MS;
    const codeCopied = Date.now() - session.copiedCodeAt < COPIED_MS;
    blocks.push({
      kind: "room",
      label: T.room,
      aside: T.inviteAside(freeSeats),
      code: session.room,
      buttons: [
        { act: "copyLink", label: linkCopied ? T.copied : T.copy, style: linkCopied ? "done" : "primary" },
        { act: "copyCode", label: codeCopied ? T.copied : T.copyCode, style: codeCopied ? "done" : "" }
      ]
    });
    blocks.push({ kind: "steps", steps: T.stepsHost, current: step2 });
    if (!mapOpen) blocks.push({ kind: "callout", tone: "info", text: T.pickMap });
    else if (session.gate) blocks.push({ kind: "callout", tone: "wait", text: T.gate, buttons: [{ act: "startNow", label: T.startNow }] });
    else if (screen2 === "ready" && !onTheWay && roster.some((p) => !p.host && p.status === "ready")) blocks.push({ kind: "callout", tone: "ok", text: T.allIn });
    else if (onTheWay && screen2 === "playing") blocks.push({ kind: "callout", tone: "info", text: T.latecomers });
    if (session.paused) blocks.push({ kind: "callout", tone: "wait", text: session.menuOpen ? T.pausedYou : T.pausedBy });
    if (onSharedRelay(session) && screen2 !== "playing") blocks.push({ kind: "callout", tone: "info", text: T.relayPitchHost, buttons: relayButtons() });
    blocks.push(mapBlock(MAP_SLUGS[session.zone ?? currentZone()] ?? null, currentHorde(), T.mapSubHost));
    if (session.error) return { text: T.chip.error, tone: "bad" };
    if (session.paused) return { text: T.chip.paused, tone: "wait" };
    return screen2 === "playing" ? { text: T.chip.ingame, tone: "ok live" } : { text: T.chip.hosting, tone: "wait live" };
  }
  var GUEST_STEP = { "joining-room": 0, following: 1, loading: 2, "waiting-host": 3, freezing: 3, connect: 3, challenging: 3, joining: 3, connected: 4 };
  function guestSection(session, blocks, screen2) {
    const phase = session.phase;
    const failed = ["ended", "failed"].includes(phase);
    const slug = session.lobby?.slug ?? session.hostInfo?.slug ?? null;
    const mapName = slug ? MAP_NAMES[slug] : null;
    let step2 = GUEST_STEP[phase] ?? session.lastStep ?? 0;
    if (phase === "joining-room" && session.hostInfo?.slug) step2 = 1;
    if (!failed) session.lastStep = step2;
    if (session.inviteRelay && session.inviteRelay !== session.relay) {
      blocks.push({ kind: "callout", tone: "wait", text: T.otherRelay(new URL(session.inviteRelay).hostname), buttons: [{ act: "useInviteRelay", label: T.useRelay, style: "primary" }] });
    }
    blocks.push({ kind: "steps", steps: T.stepsGuest, current: step2, fail: failed });
    const onHostMap = session.hostInfo?.slug && currentSlug() === session.hostInfo.slug;
    if ((phase === "loading" || phase === "joining-room" && onHostMap) && screen2 === "landing") {
      blocks.push({ kind: "callout", tone: "wait", title: "⌨", text: T.pressKey });
    } else {
      const text3 = guestMessage(session, phase, mapName, screen2);
      if (text3) blocks.push({ kind: "callout", tone: failed ? "bad" : phase === "connected" ? "ok" : "info", text: text3, buttons: failed ? [{ act: "rejoin", label: T.rejoin, style: "primary" }] : [] });
    }
    if (session.joinedLate && ["joining", "connected"].includes(phase)) blocks.push({ kind: "callout", tone: "info", text: T.lateJoin });
    if (phase === "connected" && session.paused) blocks.push({ kind: "callout", tone: "wait", text: session.menuOpen ? T.pausedYou : T.pausedBy });
    blocks.push(mapBlock(slug, session.lobby?.horde ?? session.hostInfo?.horde, T.mapSubGuest));
    if (session.error) return { text: T.chip.error, tone: "bad" };
    if (failed) return { text: T.chip.ended, tone: "bad" };
    if (session.paused) return { text: T.chip.paused, tone: "wait" };
    if (phase === "connected") return screen2 === "playing" ? { text: T.chip.ingame, tone: "ok live" } : { text: T.chip.lobby, tone: "ok" };
    return { text: T.chip.joining, tone: "wait live" };
  }
  function guestMessage(session, phase, mapName, screen2) {
    switch (phase) {
      case "joining-room":
        return session.peer ? mapName ? T.opening(mapName) : T.hostPicking : T.waitingHost;
      case "following":
        return T.opening(mapName ?? "…");
      case "loading":
        return T.loadingMap;
      case "waiting-host":
        if (session.hostState?.ready && !session.hostState.turn) return T.nextInLine;
        return session.peer ? T.hostLoading : T.waitingHost;
      case "freezing":
      case "connect":
      case "challenging":
        return T.connecting;
      case "joining":
        return T.joiningGame;
      case "connected":
        if (screen2 === "playing") return null;
        return session.hostState?.screen === "playing" || screen2 === "ready" && session.lobby?.playing ? T.clickToPlay : T.waitingStart;
      case "ended":
        return T.ended;
      case "failed":
        return T.failed;
      default:
        return null;
    }
  }
  function playerRows(session, roster, me) {
    return roster.map((p) => {
      const n = Number(p.n);
      const empty = p.status === "free";
      const tags = [];
      if (p.host) tags.push({ cls: "host", text: T.hostTag });
      if (n === me) tags.push({ cls: "you", text: T.you });
      return {
        n,
        name: empty ? T.st.free : cleanName(p.name) || T.player(n),
        tags,
        me: n === me,
        empty,
        status: empty ? session.mode === "host" ? T.freeHint : "" : T.st[p.status] ?? T.st.away,
        tone: p.tone ?? "",
        ping: empty || p.host || !Number.isFinite(p.ping) ? null : p.ping,
        path: empty || p.host || !T.path[p.path] ? null : T.path[p.path]
      };
    });
  }
  function mapBlock(slug, horde, sub) {
    if (!slug) return { kind: "map", glyph: "?", name: T.noMap, sub };
    const name = MAP_NAMES[slug] ?? slug;
    return { kind: "map", glyph: name[0], name, tag: horde ? T.hell : null, sub };
  }
  function settingsSection(session, inRoom) {
    const blocks = [{ kind: "input", label: T.yourName, field: "name", placeholder: T.namePlaceholder, act: "saveName", button: T.save, value: session.name, maxLength: 16 }];
    if (inRoom) {
      const items = [
        [T.relay, T.relayState[session.socket] ?? T.relayState.idle, session.socket === "open" ? "" : "error"],
        [T.ping, session.stats?.rtt != null ? `${Math.round(session.stats.rtt)} ms` : "–"]
      ];
      const connection = connectionText(session);
      if (connection) items.push([T.connection, connection]);
      if (session.stats?.lost) items.push([T.dropped, String(session.stats.lost)]);
      blocks.push({ kind: "kv", items });
    }
    blocks.push(...controllerBlocks(session), ...cheatsSettingBlocks(session), ...relayBlocks(session), { kind: "credits", text: T.credits });
    return { kind: "section", title: T.settings, act: "settings", open: session.showSettings, blocks };
  }
  function controllerBlocks(session) {
    const pad = session.gamepad;
    const name = pad?.name ? pad.name.replace(/\s*\(.*$/, "").slice(0, 32) : "";
    let status;
    if (!session.controller) status = T.ctrl.off;
    else if (!session.patched && session.hash) status = T.ctrl.unavailable;
    else if (!pad || pad.status === "none") status = T.ctrl.press;
    else if (pad.status === "active") status = T.ctrl.active(name, session.aimLevel + 1, AIM_SPEEDS.length);
    else status = T.ctrl.later(name);
    const buttons = session.controller && pad?.status !== "none" ? [{ act: "aimDown", label: T.aimDown }, { act: "aimUp", label: T.aimUp }, { act: "controller", label: T.turnOff, style: "ghost" }] : [{ act: "controller", label: session.controller ? T.turnOff : T.turnOn, style: "ghost" }];
    return [{ kind: "kv", items: [[T.controller, status]] }, { kind: "buttons", buttons }];
  }
  function relayBlocks(session) {
    const custom = session.relay !== DEFAULT_RELAY;
    const blocks = [{ kind: "kv", items: [[T.relay, custom ? T.relayCustom(new URL(session.relay).hostname) : T.relayDefault]] }];
    if (!custom) blocks.push({ kind: "text", cls: "muted small", text: T.relayNote });
    if (session.usage) {
      const resets = new Date(session.usage.resetsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const label = session.usage.fraction >= 1 ? T.usedUp(resets) : T.usage(Math.round(session.usage.fraction * 100), resets);
      blocks.push({ kind: "meter", fraction: session.usage.fraction, label });
    }
    if (session.editRelay) {
      blocks.push({ kind: "input", field: "relay", placeholder: T.relayPlaceholder, act: "saveRelay", button: T.save, value: custom ? session.relay : "" });
      blocks.push({ kind: "text", cls: "muted small", text: T.relayEditNote });
      blocks.push({ kind: "buttons", buttons: [{ act: "defaultRelay", label: T.useDefault }, { act: "editRelay", label: T.cancel, style: "ghost" }] });
    } else {
      const buttons = [{ act: "editRelay", label: T.changeRelay, style: "ghost" }];
      if (!custom) buttons.unshift({ act: "openRelayGuide", label: T.relayGuide });
      blocks.push({ kind: "buttons", buttons });
    }
    return blocks;
  }
  var onSharedRelay = (session) => session.relay === DEFAULT_RELAY && !session.overQuota;
  var relayButtons = () => [{ act: "openRelayGuide", label: T.relayGuide }, { act: "editRelayNow", label: T.relayHaveOne, style: "ghost" }];

  // src/cheats/hotkey.js
  var KEY2 = "KeyM";
  function onCheatsKey(session, event, { playing, available, freeMouse, lockMouse }) {
    if (event.code !== KEY2 || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return false;
    const target2 = event.composedPath?.()[0];
    if (target2 && (/^(INPUT|TEXTAREA|SELECT)$/.test(target2.tagName ?? "") || target2.isContentEditable)) return false;
    if (!playing || !available) return false;
    session.cheats.panel = !session.cheats.panel;
    if (session.cheats.panel) {
      session.fun.open = true;
      freeMouse();
    } else {
      lockMouse();
    }
    return true;
  }
  function onPointerLock(session, locked) {
    if (locked) session.cheats.panel = false;
  }
  function installCheatsKey(session) {
    let hideUnlock = false;
    const ctx = () => ({
      playing: screen() === "playing",
      available: funAvailable(session) && Boolean(session.engine),
      freeMouse: () => {
        if (!document.pointerLockElement) return;
        hideUnlock = true;
        document.exitPointerLock();
      },
      lockMouse: () => document.getElementById("game")?.requestPointerLock?.()?.catch?.(() => {
      })
    });
    const showFun = () => setTimeout(() => session.card?.root.querySelector('[data-act="fun"]')?.scrollIntoView({ block: "start" }), 120);
    window.addEventListener(
      "keydown",
      (event) => {
        if (!onCheatsKey(session, event, ctx())) return;
        if (session.cheats.panel) showFun();
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true
    );
    window.addEventListener(
      "keyup",
      (event) => {
        if (event.code === KEY2 && screen() === "playing" && funAvailable(session)) event.stopImmediatePropagation();
      },
      true
    );
    window.addEventListener(
      "pointerlockchange",
      (event) => {
        const locked = Boolean(document.pointerLockElement);
        if (!locked && hideUnlock) {
          hideUnlock = false;
          event.stopImmediatePropagation();
          return;
        }
        onPointerLock(session, locked);
      },
      true
    );
  }

  // src/map/state.js
  function createMap() {
    return {
      open: false,
      openedAt: null,
      // when the panel was last opened (the "no data" note waits a few seconds)
      slug: null,
      plan: null,
      icons: /* @__PURE__ */ new Map(),
      // the game's perk and box icons for this map (src/map/icons.js), once read
      iconTries: 0,
      iconsAt: -Infinity,
      iconsLoading: false,
      tracks: /* @__PURE__ */ new Map(),
      // n -> track of recent positions, for gliding (src/map/track.js)
      live: /* @__PURE__ */ new Map(),
      // n -> { x, y, z, yaw, room, s, floor, at }: the latest sample per player number
      liveV: null,
      // the state counter of the latest live sample
      state: null,
      // { v, sig, doors, rooms, box, power, at }
      planOk: false,
      // the state's sig matches the plan: its doors and rooms can be shown
      lastAskAt: -Infinity,
      liveReads: 0,
      // live readings so far (each is forwarded to guests once)
      sentReads: 0,
      sentStateAt: 0,
      sentStateKey: null
    };
  }

  // src/map/hotkey.js
  var KEY3 = "KeyN";
  function onMapKey(session, event, { playing }) {
    if (event.code !== KEY3 || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return false;
    const target2 = event.composedPath?.()[0];
    if (target2 && (/^(INPUT|TEXTAREA|SELECT)$/.test(target2.tagName ?? "") || target2.isContentEditable)) return false;
    if (!playing) return false;
    session.map.open = !session.map.open;
    if (session.map.open) session.map.openedAt = Date.now();
    return true;
  }
  function installMapKey(session, overlay) {
    window.addEventListener(
      "keydown",
      (event) => {
        if (!onMapKey(session, event, { playing: screen() === "playing" })) return;
        if (session.map.open) overlay.show(session);
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true
    );
    window.addEventListener(
      "keyup",
      (event) => {
        if (event.code === KEY3 && screen() === "playing") event.stopImmediatePropagation();
      },
      true
    );
  }

  // src/cheats/version.js
  var FORK_VERSION = "2.2.2.3";

  // src/util/updates.js
  var LATEST = "https://api.github.com/repos/lucas-gundehug/bo1-zombies-coop/releases/latest";
  var UPDATE_GUIDE = "https://github.com/lucas-gundehug/bo1-zombies-coop#install";
  var RELAY_GUIDE = "https://allanlotta.github.io/bo1-zombies-coop/#relay";
  var CHECK_EVERY_MS = 6 * 3600 * 1e3;
  var parts = (version) => String(version).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  function isNewer(latest, current) {
    const a = parts(latest);
    const b = parts(current);
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
    }
    return false;
  }
  async function checkForUpdate(session) {
    let cached = null;
    try {
      cached = JSON.parse(readSetting("update", "null"));
    } catch {
    }
    let latest = cached?.latest;
    if (!cached || Date.now() - cached.checkedAt > CHECK_EVERY_MS) {
      try {
        const response = await fetch(LATEST, { headers: { accept: "application/vnd.github+json" } });
        if (response.ok) latest = (await response.json()).tag_name;
        saveSetting("update", JSON.stringify({ checkedAt: Date.now(), latest }));
      } catch {
        return;
      }
    }
    if (latest && isNewer(latest, FORK_VERSION)) session.update = { version: String(latest).replace(/^v/, ""), url: UPDATE_GUIDE };
  }

  // src/main.js
  var TICK_MS = 50;
  var LANG_QUERY = LANG === "pt" ? "?lang=pt#" : "#";
  var USAGE_REFRESH_MS = 6e5;
  if (!window.__bo1Coop) start();
  function start() {
    followMovedSite();
    paramsFromHash();
    const session = createSession();
    window.__bo1Coop = session;
    session.fun = createFun();
    session.cheats = createCheats();
    session.map = createMap();
    session.map.minimap = minimapEnabled();
    installCheatsKey(session);
    session.mapOverlay = new MapOverlay();
    session.mapOverlay.mount();
    installMapKey(session, session.mapOverlay);
    session.minimap = new Minimap();
    session.minimap.mount();
    session.minimap.start(session);
    watchConsole(session);
    if (session.mode) keepSinglePlayer(session.room);
    hookWasm(session);
    hookMain(session);
    const card = new Card(actions(session));
    session.card = card;
    card.mount();
    if (session.controller) {
      session.gamepad = new Gamepad({
        // Only while our player is in a game: then the engine takes commands and the menus own the cursor.
        engine: () => {
          const engine = session.engine;
          return engine && session.patched && engine.connectionState() === CONNECTION.active ? { Module: engine.Module, command: (text3) => engine.command(text3) } : null;
        },
        canvasSize: () => {
          const canvas = document.getElementById("game");
          return { width: canvas?.width || 1280, height: canvas?.height || 720 };
        },
        aimLevel: session.aimLevel
      });
      session.gamepad.start();
    }
    const refreshUsage = () => fetch(`${session.relay}/usage`).then((r) => r.ok ? r.json() : null).then((usage) => session.usage = Number.isFinite(usage?.fraction) ? usage : null).catch(() => session.usage = null);
    refreshUsage();
    setInterval(refreshUsage, USAGE_REFRESH_MS);
    checkForUpdate(session);
    if (session.mode) {
      if (session.mode === "guest") session.guestId = guestIdFor(session.room);
      session.phase = session.mode === "host" ? "hosting" : "joining-room";
      session.pump = startPump(session, onControl);
      session.direct = createDirect(session);
      if (session.mode === "host") holdStart(session, card.host);
    }
    setInterval(() => tick(session), TICK_MS);
  }
  function tick(session) {
    try {
      if (session.mode === "host") hostTick(session);
      else if (session.mode === "guest") guestTick(session);
      session.direct?.tick();
      if (session.mode) reportHidden(session);
      funTick(session);
      mapTick(session, Date.now());
    } catch (error) {
      session.error = error.message;
      session.note(`tick failed: ${error.stack ?? error}`);
    }
    session.card.render(view(session));
  }
  function reportHidden(session) {
    const input = session.engine?.Module._KB_Input;
    if (!input || session.reportedHidden === document.hidden) return;
    input(8, Number(document.hidden), 0);
    session.reportedHidden = document.hidden;
  }
  var copy = (session, text3, stamp) => navigator.clipboard?.writeText(text3).then(
    () => session[stamp] = Date.now(),
    () => session.notice = text3
  );
  var reloadWithRelay = (relay) => {
    saveSetting("relay", relay);
    location.reload();
  };
  function actions(session) {
    return {
      host: () => go(landingUrl(`coop=host&coopRoom=${createRoomCode()}${session.relayParam}`)),
      join: (text3) => {
        const code = normalizeRoomCode(text3);
        if (code) go(landingUrl(`coop=join&coopRoom=${code}${session.relayParam}`));
        else session.notice = T.notRoomCode;
      },
      copyLink: () => copy(session, inviteLink(session), "copiedLinkAt"),
      copyCode: () => copy(session, session.room, "copiedCodeAt"),
      leave: () => {
        session.pump?.postMessage({ type: "close" });
        go(location.pathname);
      },
      startNow: () => session.startAlone = true,
      rejoin: () => location.reload(),
      openUpdate: () => window.open(session.update?.url, "_blank", "noopener"),
      openRelayGuide: () => window.open(`${RELAY_GUIDE.replace("#", LANG_QUERY)}`, "_blank", "noopener"),
      goToHost: () => moveToHost(session, "button"),
      settings: () => session.showSettings = !session.showSettings,
      saveName: (text3) => {
        session.name = cleanName(text3);
        saveSetting("name", session.name);
        session.sentPhaseAt = 0;
      },
      editRelay: () => session.editRelay = !session.editRelay,
      // From the over-quota notice: open settings straight at the relay field.
      editRelayNow: () => {
        session.showSettings = true;
        session.editRelay = true;
      },
      saveRelay: (text3) => {
        const url = normalizeRelay(text3 ?? "");
        if (url) reloadWithRelay(url === DEFAULT_RELAY ? "" : url);
        else session.notice = T.notRelay;
      },
      defaultRelay: () => reloadWithRelay(""),
      useInviteRelay: () => reloadWithRelay(session.inviteRelay),
      controller: () => {
        session.controller = !session.controller;
        saveSetting("controller", session.controller ? "1" : "0");
        session.notice = T.controllerReload;
      },
      aimDown: () => setAim(session, session.aimLevel - 1),
      aimUp: () => setAim(session, session.aimLevel + 1),
      ...funActions(session),
      ...cheatsSettingActions(session)
    };
  }
  function setAim(session, level) {
    session.aimLevel = Math.max(0, Math.min(AIM_SPEEDS.length - 1, level));
    if (session.gamepad) session.gamepad.aimLevel = session.aimLevel;
    saveSetting("aim", String(session.aimLevel));
  }
})();
