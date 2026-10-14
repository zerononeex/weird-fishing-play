// Save data (GAME_SPEC §7).
import { CONFIG } from './config.js';
export const PRESET_NAMES = ['Captain Splash', 'Fin Wizard', 'Reel Ranger', 'Bubble Boss', 'Hook Hero', 'Wave Rider'];
export const PRESET_COLORS = ['#ff6b9a', '#4cc9f0', '#ffd166', '#8ac926', '#c77dff', '#ff9f43'];

export function freshSlot(i = 0) {
  return {
    name: PRESET_NAMES[i % PRESET_NAMES.length], color: PRESET_COLORS[i % PRESET_COLORS.length], cash: 0,
    owned: ['line0', 'pistol'], equip: { gun: 'pistol', hat: null, outfit: null, start: null },
    zonesUnlocked: [1], bestDepth: {}, dex: {}, flags: { bossBeaten: false },
    settings: { muted: false, night: false }, zone: 1,
  };
}

// ---- persistence: localStorage['weirdfishing.save.v1'], 3 slots, migrate() on load ----

export const KEY = CONFIG.SAVE_KEY;
export const blankSave = () => ({ version: 1, activeSlot: 0, slots: [null, null, null] });

function store() { try { return globalThis.localStorage || null; } catch { return null; } }

// Fills fields added since a slot was written, keeping anything unknown (forward-compatible).
function normalizeSlot(slot, i) {
  if (!slot || typeof slot !== 'object') return null;
  const f = freshSlot(i);
  return { ...f, ...slot, equip: { ...f.equip, ...slot.equip }, flags: { ...f.flags, ...slot.flags },
    settings: { ...f.settings, ...slot.settings }, dex: { ...slot.dex }, bestDepth: { ...slot.bestDepth },
    owned: Array.isArray(slot.owned) ? slot.owned : f.owned };
}

// Every future shape change gets a new key AND a step here; v1 is never edited in place.
export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return blankSave();
  const slots = [0, 1, 2].map((i) => normalizeSlot(raw.slots?.[i], i));
  return { ...raw, version: 1, activeSlot: Math.min(2, Math.max(0, raw.activeSlot | 0)), slots };
}

export function load(storage = store()) {
  let txt = null;
  try { txt = storage?.getItem(KEY); } catch { return blankSave(); }
  if (!txt) return blankSave();
  try { return migrate(JSON.parse(txt)); } catch {
    try { storage.setItem(KEY + '.bak', txt); } catch { /* storage full or blocked: keep playing */ }
    return blankSave();
  }
}

export function save(data, storage = store()) {
  try { storage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; }
}
