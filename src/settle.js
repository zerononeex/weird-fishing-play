// End-of-run bookkeeping: pay, discover, best depth, boss flag, unlocks. Pure: no DOM.
import { fishPay, runTotal, discover, refreshUnlocks, grantGifts } from './economy.js';

export function settleRun(slot, run, shoot) {
  const ctx = { outfit: slot.equip.outfit, hat: slot.equip.hat, zoneId: run.zone.id };
  const fishes = [...shoot.landed, ...run.landed];
  const rows = new Map();
  for (const f of fishes) {
    const r = rows.get(f.sp.id) || { sp: f.sp, n: 0, pay: 0 };
    r.n++; r.pay += fishPay(f, ctx); rows.set(f.sp.id, r);
  }
  const total = runTotal(fishes, ctx);
  slot.cash += total;
  slot.bestDepth[run.zone.id] = Math.max(slot.bestDepth[run.zone.id] || 0, Math.floor(run.maxReached));
  const newSpecies = discover(slot, fishes);
  const bossLanded = fishes.some((f) => f.sp.id === 43);
  if (bossLanded) slot.flags.bossBeaten = true;
  grantGifts(slot);
  const opened = refreshUnlocks(slot);
  return { rows: [...rows.values()].sort((a, b) => b.pay - a.pay), total, lost: shoot.lost.length, bossLanded, newSpecies, opened };
}
