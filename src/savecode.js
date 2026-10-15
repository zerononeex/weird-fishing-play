// Save codes (GAME_SPEC §12): one kid slot as a single copy-paste line, so progress survives a wiped browser.
// A code is only a transport for the existing slot object: it goes through the same migrate()/normalize path
// as a localStorage load, and nothing is ever written until a code has fully checked out.
import { migrate, VERSION } from './save.js';

export const PREFIX = 'WF1-';
const GAME = 'weird-fishing';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const utf8 = (s) => new TextEncoder().encode(s);

// FNV-1a (32-bit) over the UTF-8 bytes of the JSON, top 20 bits as 4 base32 chars.
export function checksum(json) {
  let h = 0x811c9dc5;
  for (const b of utf8(json)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  h >>>= 12;
  let out = '';
  for (let i = 3; i >= 0; i--) out += B32[(h >>> (i * 5)) & 31];
  return out;
}

function toB64url(json) {
  let bin = '';
  for (const b of utf8(json)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// Slot object → "WF1-<base64url(JSON)>-<checksum>". Single line, no spaces.
export function encodeSlot(slot) {
  const json = JSON.stringify({ game: GAME, v: VERSION, slot });
  return PREFIX + toB64url(json) + '-' + checksum(json);
}

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
// The fields every slot has always had, with the types the game relies on. Unknown extra fields are kept.
function slotShapeOk(s) {
  return isObj(s) && typeof s.name === 'string' && s.name.length > 0 && s.name.length <= 40
    && typeof s.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(s.color) && isNum(s.cash) && s.cash >= 0
    && Array.isArray(s.owned) && s.owned.every((x) => typeof x === 'string')
    && isObj(s.equip) && Object.values(s.equip).every((x) => x === null || typeof x === 'string')
    && Array.isArray(s.zonesUnlocked) && s.zonesUnlocked.every(isNum)
    && isObj(s.bestDepth) && Object.values(s.bestDepth).every(isNum)
    && isObj(s.dex) && Object.values(s.dex).every((e) => isObj(e) && isNum(e.n) && isNum(e.best))
    && (s.flags === undefined || isObj(s.flags)) && (s.settings === undefined || isObj(s.settings));
}

// Code text → { ok: true, slot } or { ok: false }. Never throws, never touches storage.
export function decodeCode(text) {
  try {
    const code = String(text ?? '').replace(/\s+/g, '');   // Notes / Messages may wrap or pad it
    if (!code.startsWith(PREFIX)) return { ok: false };
    const cut = code.lastIndexOf('-');
    const body = code.slice(PREFIX.length, cut), sum = code.slice(cut + 1);
    if (cut < PREFIX.length || !/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Z2-7]{4}$/.test(sum)) return { ok: false };
    const json = fromB64url(body);
    if (toB64url(json) !== body || checksum(json) !== sum) return { ok: false };   // canonical + intact
    const raw = JSON.parse(json);
    if (!isObj(raw) || raw.game !== GAME || !Number.isInteger(raw.v) || !slotShapeOk(raw.slot)) return { ok: false };
    // Same path as a localStorage load: older save versions migrate, unknown future ones are refused.
    const slot = migrate({ version: raw.v, activeSlot: 0, slots: [raw.slot, null, null] }).slots[0];
    return slot && slotShapeOk(slot) ? { ok: true, slot } : { ok: false };
  } catch { return { ok: false }; }
}

// ---- the import flow on the kid-pick screen (pure, so it is unit-tested) ----
// mode: 'paste' (code box) → 'pick' (choose a slot) → closed. `confirm` is the filled slot awaiting its second tap.
export const newImport = () => ({ mode: 'paste', slot: null, confirm: null, error: false });

export function loadCode(st, text) {
  const r = decodeCode(text);
  if (!r.ok) return { ...st, error: true };
  return { ...st, mode: 'pick', slot: r.slot, confirm: null, error: false };
}

// A tap on slot card i while picking. Returns the next state; writes into data.slots only when allowed.
// An empty slot loads straight in; a filled one needs a second tap on the same card.
export function tapSlot(st, data, i) {
  if (st.mode !== 'pick' || !st.slot || i < 0 || i > 2) return st;
  if (data.slots[i] && st.confirm !== i) return { ...st, confirm: i };
  data.slots[i] = JSON.parse(JSON.stringify(st.slot));
  return { ...st, mode: 'done', confirm: null, placed: i };
}
