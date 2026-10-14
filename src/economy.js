// Money, purchases, unlocks and the Fish-o-pedia (GAME_SPEC §5). Pure: no DOM.
import { ZONES } from './data/zones.js';
import { CONFIG } from './config.js';
import { ITEM, GUN } from './data/shop.js';
import { LINES } from './sim.js';

export const dexCount = (slot) => Object.keys(slot.dex).length;

export function zoneUnlocked(slot, zone) {
  if (zone.needsBoss) return !!slot.flags.bossBeaten;
  return dexCount(slot) >= zone.unlockSpecies;
}

export function lockReason(slot, zone) {
  if (zoneUnlocked(slot, zone)) return '';
  if (zone.needsBoss) return 'Beat the boss of Iceberg Alley';
  return `Find ${zone.unlockSpecies - dexCount(slot)} more kinds of fish`;
}

// Refreshes slot.zonesUnlocked; returns the zones that just opened.
export function refreshUnlocks(slot) {
  const opened = ZONES.filter((z) => zoneUnlocked(slot, z) && !slot.zonesUnlocked.includes(z.id));
  slot.zonesUnlocked = ZONES.filter((z) => zoneUnlocked(slot, z)).map((z) => z.id);
  return opened;
}

// ---- payout (GAME_SPEC §5.1) ----

export const OUTFIT_BONUS = { vest: 0.10, robe: 0.20, pajamas: 0.50 };
export const whirlpoolFactor = (zoneId, depth) => (zoneId === 4 ? 1 + Math.floor(depth / 250) * 0.25 : 1);

// ctx: { outfit, zoneId }. fish: { sp, d|depth }
export function fishPay(fish, ctx = {}) {
  const depth = fish.depth ?? fish.d ?? 0;
  return fish.sp.value * CONFIG.CASH_MULTIPLIER * (1 + (OUTFIT_BONUS[ctx.outfit] || 0)) * whirlpoolFactor(ctx.zoneId, depth);
}

// Jellies subtract, but a run never pays less than $0.
export const runTotal = (fishes, ctx) => Math.max(0, Math.round(fishes.reduce((s, f) => s + fishPay(f, ctx), 0)));

// ---- shop (GAME_SPEC §5) ----

export const owns = (slot, id) => slot.owned.includes(id);

// '' when buyable, else a short kid-readable reason.
export function canBuy(slot, item) {
  if (owns(slot, item.id)) return 'Owned';
  const missing = item.req.find((r) => !owns(slot, r));
  if (missing) return `Needs ${ITEM[missing]?.name || missing}`;
  const need = item.need?.(slot);
  if (need) return need;
  if (slot.cash < item.price) return 'Not enough cash';
  return '';
}

export function buy(slot, item) {
  if (canBuy(slot, item)) return false;
  slot.cash -= item.price;
  slot.owned.push(item.id);
  equip(slot, item);
  return true;
}

// Guns replace the gun; hats/outfits/start items toggle on and off.
export function equip(slot, item) {
  if (!owns(slot, item.id) && item.id !== 'pistol') return false;
  if (item.cat === 'guns' || GUN[item.id]) slot.equip.gun = item.id;
  else if (item.hat) slot.equip.hat = slot.equip.hat === item.id ? null : item.id;
  else if (item.outfit) slot.equip.outfit = slot.equip.outfit === item.id ? null : item.id;
  else if (item.start) slot.equip.start = slot.equip.start === item.id ? null : item.id;
  return true;
}

export const isEquipped = (slot, item) => [slot.equip.gun, slot.equip.hat, slot.equip.outfit, slot.equip.start].includes(item.id);

// Final-boss gifts arrive for free.
export function grantGifts(slot) {
  for (const it of Object.values(ITEM)) if (it.gift && !it.need(slot) && !owns(slot, it.id)) slot.owned.push(it.id);
}

export function lineTier(slot) {
  let t = 0;
  for (let i = 1; i < LINES.length; i++) if (owns(slot, 'line' + i)) t = i;
  return t;
}

// What the run needs from the slot's purchases.
export function gearOf(slot, zoneId) {
  const o = (id) => owns(slot, id);
  const start = slot.equip.start && ITEM[slot.equip.start];
  const lineLength = LINES[lineTier(slot)];
  const startDepth = start && start.start[0] === zoneId && start.start[1] < lineLength ? start.start[1] : 0;
  return {
    lineLength, startDepth,
    gear: {
      mulligans: (o('toaster') ? 1 : 0) + (o('hairdryer') ? 1 : 0), coil: o('coil'),
      saw: o('chainsaw'), fuelMax: o('chainsaw') ? 2.5 + (o('fuel1') ? 2 : 0) + (o('fuel2') ? 5 : 0) : 0,
      turbo: o('turbo'), float: o('float'), gizmo: o('gizmo'),
      lamp: o('biglamp') ? 2 : o('lamp') ? 1 : 0, spring: o('spring'), antigrav: o('antigrav'), knife: o('knife'),
    },
  };
}

// ---- Fish-o-pedia (GAME_SPEC §4.5): a species is discovered the first time it is landed ----
export function discover(slot, landed) {
  const fresh = [];
  for (const f of landed) {
    const depth = Math.floor(f.depth ?? f.d ?? 0);
    const e = slot.dex[f.sp.id];
    if (!e) { slot.dex[f.sp.id] = { n: 1, best: depth }; fresh.push(f.sp); }
    else { e.n++; e.best = Math.max(e.best, depth); }
  }
  return fresh;
}
