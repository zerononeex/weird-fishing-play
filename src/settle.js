// End-of-run bookkeeping: pay, discover, best depth, boss flags, unlocks. Pure: no DOM.
import { fishPay, runTotal, discover, refreshUnlocks, grantGifts } from './economy.js';
import { fishArtPath } from './fishart.js';
import { ZONES, FINAL_BOSS } from './data/zones.js';
import { GOLD } from './fish.js';

const BOSS_ZONE = new Map(ZONES.filter((z) => z.boss).map((z) => [z.boss, z.id]));
// Bosses whose FIRST landing plays a comic (screens.js ENDINGS): the Frozen Block's ice story, and the final boss.
export const STORY_BOSSES = [43, FINAL_BOSS];

export function settleRun(slot, run, shoot) {
  const ctx = { outfit: slot.equip.outfit, hat: slot.equip.hat, zoneId: run.zone.id };
  const fishes = [...shoot.landed, ...run.landed];
  const rows = new Map();
  let hero = null; // the single most valuable fish of the run: shown big at the top of the payout
  for (const f of fishes) {
    const key = f.sp.id + (f.golden ? ':gold' : ''); // golden catches get their own row (v1.4)
    const r = rows.get(key) || { sp: f.sp, art: fishArtPath(f.sp), n: 0, pay: 0, golden: !!f.golden, mult: f.golden ? GOLD.PAY : 1 }, pay = fishPay(f, ctx);
    r.n++; r.pay += pay; rows.set(key, r);
    if (!hero || pay > hero.pay) hero = { sp: f.sp, art: r.art, pay, golden: !!f.golden };
  }
  const total = runTotal(fishes, ctx);
  slot.cash += total;
  slot.bestDepth[run.zone.id] = Math.max(slot.bestDepth[run.zone.id] || 0, Math.floor(run.maxReached));
  const newSpecies = discover(slot, fishes);
  // Boss flags (v1.4): flags.bosses lists every zone whose boss was landed; flags.bossBeaten = the FINAL boss.
  const bosses = slot.flags.bosses ||= [];
  let story = null;
  for (const f of fishes) {
    const z = BOSS_ZONE.get(f.sp.id);
    if (!z || bosses.includes(z)) continue;
    bosses.push(z);
    if (STORY_BOSSES.includes(f.sp.id)) story = f.sp.id;
  }
  if (fishes.some((f) => f.sp.id === FINAL_BOSS)) slot.flags.bossBeaten = true;
  grantGifts(slot);
  const opened = refreshUnlocks(slot);
  return { rows: [...rows.values()].sort((a, b) => b.pay - a.pay), hero, total, lost: shoot.lost.length, bossLanded: !!story, story, newSpecies, opened };
}
