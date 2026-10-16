// Save data (GAME_SPEC §7, §10.E).
import { CONFIG } from './config.js';
export const PRESET_NAMES = ['Captain Splash', 'Fin Wizard', 'Reel Ranger', 'Bubble Boss', 'Hook Hero', 'Wave Rider'];
export const PRESET_COLORS = ['#ff6b9a', '#4cc9f0', '#ffd166', '#8ac926', '#c77dff', '#ff9f43'];

export function freshSlot(i = 0) {
  return {
    name: PRESET_NAMES[i % PRESET_NAMES.length], color: PRESET_COLORS[i % PRESET_COLORS.length], cash: 0,
    owned: ['line0', 'pistol'], equip: { gun: 'pistol', hat: null, outfit: null, start: null, charm: null },
    zonesUnlocked: [1], bestDepth: {}, dex: {}, flags: { bossBeaten: false, bosses: [], hasCast: false },
    settings: { muted: false, musicMuted: false, night: false }, zone: 1, seas: SEAS,
  };
}

// v1.4 "Nine Seas" (same v2 key, additive): the Whirlpool moved from zone id 4 to 9 (zones 4-8 are new), and
// flags.bossBeaten now means the FINAL boss (Dragon's Deep). A slot written before v1.4 (no `seas` mark) gets its
// Whirlpool best depth / unlock / selection moved to id 9, and its old bossBeaten (= the Frozen Block was landed)
// becomes flags.bosses [3]. Zones 1-3 are untouched; the Whirlpool stays open (unlocks are sticky).
export const SEAS = 9;
const OLD_WHIRLPOOL = 4, WHIRLPOOL_ID = 9;
function slotToSeas(slot) {
  if (slot.seas === SEAS) return slot;
  const id = (z) => (z === OLD_WHIRLPOOL ? WHIRLPOOL_ID : z);
  const bestDepth = {};
  for (const [k, v] of Object.entries(slot.bestDepth || {})) bestDepth[id(Number(k))] = v;
  const beat = !!slot.flags?.bossBeaten;
  return {
    ...slot, seas: SEAS, bestDepth, zone: id(slot.zone ?? 1),
    zonesUnlocked: Array.isArray(slot.zonesUnlocked) ? slot.zonesUnlocked.map(id) : [1],
    flags: { ...slot.flags, bossBeaten: false, bosses: beat ? [3] : [] },
  };
}

// ---- persistence: localStorage['weirdfishing.save.v2'], 3 slots, migrate() on load ----

export const KEY = CONFIG.SAVE_KEY;             // 'weirdfishing.save.v2'
export const KEY_V1 = 'weirdfishing.save.v1';   // read once for migration, never written or edited
export const VERSION = 2;
export const blankSave = () => ({ version: VERSION, activeSlot: 0, slots: [null, null, null] });

function store() { try { return globalThis.localStorage || null; } catch { return null; } }

// Fills fields added since a slot was written, keeping anything unknown (forward-compatible).
function normalizeSlot(slot, i) {
  if (!slot || typeof slot !== 'object') return null;
  slot = slotToSeas(slot);
  const f = freshSlot(i);
  return { ...f, ...slot, equip: { ...f.equip, ...slot.equip }, flags: { ...f.flags, ...slot.flags, bosses: Array.isArray(slot.flags?.bosses) ? slot.flags.bosses : [] },
    settings: { ...f.settings, ...slot.settings }, dex: { ...slot.dex }, bestDepth: { ...slot.bestDepth },
    owned: Array.isArray(slot.owned) ? slot.owned : f.owned };
}

// v1 → v2: the Toaster / Hairdryer / Zap Coil mulligans become Hook Charms (best owned is equipped),
// the single mute splits into Music + Sound, and slots that already played skip the "tap to cast" hint.
const V1_CHARMS = [['coil', 'charm_storm'], ['hairdryer', 'charm_hairdryer'], ['toaster', 'charm_toaster']]; // best first
function slotV1toV2(slot) {
  if (!slot || typeof slot !== 'object') return null;
  const owned = Array.isArray(slot.owned) ? slot.owned : [];
  const map = Object.fromEntries(V1_CHARMS);
  const best = V1_CHARMS.find(([old]) => owned.includes(old));
  const played = (slot.cash || 0) > 0 || Object.keys(slot.dex || {}).length > 0 || Object.keys(slot.bestDepth || {}).length > 0;
  return {
    ...slot,
    owned: [...new Set(owned.map((id) => map[id] || id))],
    equip: { ...slot.equip, charm: best ? best[1] : null },
    settings: { ...slot.settings, musicMuted: !!slot.settings?.muted },
    flags: { ...slot.flags, hasCast: played },
  };
}
export const migrateV1 = (raw) => ({ ...raw, version: 2, slots: [0, 1, 2].map((i) => slotV1toV2(raw.slots?.[i])) });

// Every future shape change gets a new key AND a step here; old keys are never edited in place.
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return blankSave();
  if (raw.version === 1) raw = migrateV1(raw);
  if (raw.version !== VERSION) return blankSave();
  const slots = [0, 1, 2].map((i) => normalizeSlot(raw.slots?.[i], i));
  return { ...raw, version: VERSION, activeSlot: Math.min(2, Math.max(0, raw.activeSlot | 0)), slots };
}

export function load(storage = store()) {
  let txt = null, old = null;
  try { txt = storage?.getItem(KEY); if (!txt) old = storage?.getItem(KEY_V1); } catch { return blankSave(); }
  if (!txt && !old) return blankSave();
  if (!txt) { try { return migrate(JSON.parse(old)); } catch { return blankSave(); } } // v1 is left untouched
  try { return migrate(JSON.parse(txt)); } catch {
    try { storage.setItem(KEY + '.bak', txt); } catch { /* storage full or blocked: keep playing */ }
    return blankSave();
  }
}

export function save(data, storage = store()) {
  try { storage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; }
}
