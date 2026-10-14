// Fish spawning by depth + behaviours (GAME_SPEC §4.3–4.4). Pure: no DOM.
import { CONFIG } from './config.js';
import { SPECIES, BY_ID } from './data/fish.js';

const { W, PX_PER_M } = CONFIG;
export const WEIGHT = { c: 10, u: 4, r: 1, v: 0.3 };
export const CHUNK = 10;      // metres per spawn chunk
export const AHEAD = 150;     // metres spawned ahead of the lure (~1.5 screens)

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fish per 100 m at depth d.
export function density(zone, d) {
  if (!Number.isFinite(zone.maxDepth)) return Math.min(20, 6 + d / 100);
  return 6 + 6 * (d / zone.maxDepth);
}

export const jellyShare = (zone) => (zone.id === 4 ? 0.2 : 0.15);

// Species eligible in this zone, with their band for this zone.
function poolFor(zone) {
  const own = SPECIES.filter((s) => s.zone === zone.id && s.rarity !== 'boss')
    .map((sp) => ({ sp, dMin: sp.dMin, dMax: sp.dMax, w: WEIGHT[sp.rarity] }));
  const extra = (zone.extras || []).map(([id, dMin, dMax, r]) => ({ sp: BY_ID.get(id), dMin, dMax, w: WEIGHT[r] }));
  return own.concat(extra);
}

// ctx.allowed(sp) decides conditions (clock, hats, post-game...). Default: no conditional species.
export function createSpawner(zone, { seed = 1, allowed = (sp) => sp.cond.length === 0 } = {}) {
  return { zone, rng: mulberry32(seed), pool: poolFor(zone), allowed, next: 0, acc: 0 };
}

function pick(sp, d) {
  const cands = sp.pool.filter((e) => d >= e.dMin && d < e.dMax && sp.allowed(e.sp));
  if (!cands.length) return null;
  const jellies = cands.filter((e) => e.sp.jelly), others = cands.filter((e) => !e.sp.jelly);
  const from = jellies.length && (!others.length || sp.rng() < jellyShare(sp.zone)) ? jellies : others;
  let r = sp.rng() * from.reduce((s, e) => s + e.w, 0);
  for (const e of from) if ((r -= e.w) <= 0) return e.sp;
  return from[from.length - 1].sp;
}

export function makeFish(sp, x, d, dir = 1) {
  return { sp, x, d, r: sp.r, hp: sp.hp, dir, t: 0, home: d };
}

// Spawns chunks until `upto` metres (exclusive) into run.fish.
export function spawnTo(run, sp, upto, limit = run.lineLength) {
  const end = Math.min(upto, limit);
  while (sp.next < end) {
    const d0 = sp.next;
    sp.acc += density(sp.zone, d0 + CHUNK / 2) / (100 / CHUNK);
    while (sp.acc >= 1) {
      const d = d0 + sp.rng() * CHUNK;
      const s = pick(sp, d);
      if (!s) { sp.acc -= 1; continue; }
      const dir = sp.rng() < 0.5 ? -1 : 1;
      const n = s.beh === 'school' ? 3 + Math.floor(sp.rng() * 4) : 1;
      const x0 = 40 + sp.rng() * (W - 80);
      for (let i = 0; i < n; i++) {
        const f = makeFish(s, Math.max(s.r, Math.min(W - s.r, x0 + i * 30 * dir)), d + (i % 2) * 2, dir);
        f.school = n > 1 ? d0 : 0;
        f.t = sp.rng() * 10;
        run.fish.push(f);
      }
      sp.acc -= n;
    }
    sp.next = d0 + CHUNK;
  }
}

const SPEED = { drift: 45, glow: 40, school: 70, bob: 15 };

function wall(f) {
  if (f.x < f.r) { f.x = f.r; f.dir = 1; }
  if (f.x > W - f.r) { f.x = W - f.r; f.dir = -1; }
}

// Moves fish near the lure (within ~1.5 screens) according to their behaviour.
export function moveFish(run, dt) {
  const lx = run.lure.x;
  for (const f of run.fish) {
    if (Math.abs(f.d - run.depth) > AHEAD) continue;
    f.t += dt;
    switch (f.sp.beh) {
      case 'dart': f.x += f.dir * ((f.t % 1.3) < 1 ? 40 : 260) * dt; break;
      case 'flee': {
        const dx = f.x - lx, dy = (f.d - run.depth) * PX_PER_M;
        if (Math.abs(dx) < 160 && Math.abs(dy) < 160) {
          f.dir = dx >= 0 ? 1 : -1;
          f.x += f.dir * 220 * dt;
          if (f.x <= f.r || f.x >= W - f.r) f.x = Math.max(f.r, Math.min(W - f.r, f.x)); // cornered
          continue;
        }
        f.x += f.dir * SPEED.drift * dt; break;
      }
      case 'chase': {
        const dx = lx - f.x;
        f.x += Math.sign(dx) * Math.min(60 * dt, Math.abs(dx));
        continue;
      }
      case 'bob': f.d = f.home + Math.sin(f.t * 2) * 0.6; f.x += f.dir * SPEED.bob * dt; break;
      case 'boss': f.x = W / 2 + Math.sin(f.t * 0.5) * 80; continue;
      default: f.x += f.dir * (SPEED[f.sp.beh] || 45) * dt;
    }
    wall(f);
  }
}

// Spawn conditions (GAME_SPEC §4.4 + §9.6 Day/Night toggle).
// ctx: { hour, night (toggle), hat, suit, post (final boss landed), touched (Set) }
export function isDay(h) { return h >= 5 && h < 19; }            // 06-18, ±1 h dusk/dawn overlap
export function isNight(h) { return h >= 17 || h < 7; }
export function isMidnight(h) { return h >= 23 || h < 1; }

export function makeAllowed(ctx) {
  const touched = ctx.touched || new Set();
  return (sp) => sp.cond.every((c) => {
    if (c === 'day') return isDay(ctx.hour);
    if (c === 'night') return ctx.night || isNight(ctx.hour);
    if (c === 'midnight') return ctx.night || isMidnight(ctx.hour);
    if (c === 'post') return !!ctx.post;
    if (c === 'pre') return !ctx.post;
    if (c.startsWith('hat:')) return ctx.hat === c.slice(4);
    if (c.startsWith('suit:')) return ctx.suit === c.slice(5);
    if (c.startsWith('after:')) return touched.has(Number(c.slice(6)));
    return false;
  });
}

// Hat/suit-gated species are rare reward fish: when their gear is worn, one is guaranteed in its band.
const GEARED = SPECIES.filter((s) => s.cond.some((c) => /^(hat|suit):/.test(c)));
const midBand = (sp) => (sp.dMin + sp.dMax) / 2;

export function placeGuaranteed(run, zone, allowed, rng = Math.random) {
  for (const sp of GEARED) {
    if (sp.zone !== zone.id || sp.cond.some((c) => c.startsWith('after:')) || !allowed(sp)) continue;
    if (midBand(sp) < run.lineLength) run.fish.push(makeFish(sp, 60 + rng() * (W - 120), midBand(sp)));
  }
}

// Summon chains: touching chain fish N on the descent makes the next one appear deeper.
export function summon(run, zone, allowed) {
  run.summoned ||= new Set();
  for (const sp of GEARED) {
    if (sp.zone !== zone.id || run.summoned.has(sp.id) || !sp.cond.some((c) => c.startsWith('after:'))) continue;
    if (!allowed(sp)) continue;
    run.summoned.add(sp.id);
    if (midBand(sp) > run.depth && midBand(sp) < run.lineLength) run.fish.push(makeFish(sp, W / 2, midBand(sp)));
  }
}
