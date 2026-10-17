// Lure physics (GAME_SPEC §3). Pure: no DOM.
import { CONFIG } from './config.js';

export const PHYS = {
  MAX_VX: 380, TAU: 0.10, X_MIN: 24, get X_MAX() { return CONFIG.W - 24; }, LURE_R: 14, // v1.4.2: steer across the live width
  SINK: 14, REEL: 20,            // m/s [TUNE]
  LURE_Y_DESCENT: 0.3, LURE_Y_ASCENT: 0.7, // lure screen position (fraction of H)
};

export function createLure() { return { x: CONFIG.W / 2, vx: 0 }; }

export function steer(lure, tilt, dt, mul = 1) {
  lure.vx += (tilt * PHYS.MAX_VX * mul - lure.vx) * (1 - Math.exp(-dt / PHYS.TAU));
  lure.x += lure.vx * dt;
  if (lure.x < PHYS.X_MIN) { lure.x = PHYS.X_MIN; lure.vx = 0; }
  if (lure.x > PHYS.X_MAX) { lure.x = PHYS.X_MAX; lure.vx = 0; }
}

// One fishing run, from cast to surface. `mode` is 'descent' or 'ascent'.
export function createRun({ lineLength = 50, startDepth = 0 } = {}) {
  return {
    mode: 'descent', depth: startDepth, maxReached: startDepth, lineLength,
    lure: createLure(), fish: [], hooked: [], landed: [], t: 0,
    sinkMul: 1, reelMul: 1,
    charm: null, charges: 0,     // Hook Charm: zaps left this dive (refilled every cast, GAME_SPEC §10.E)
    zapAll: false, zapBonus: 1,  // Storm Coil: each zap hits every visible fish · Lucky: zapped fish pay ×bonus
    magnet: 0,                   // Magnet Charm: ascent pull radius in px (0 = none)
    saw: false, fuelMax: 0, fuel: 0, sawing: false, turbo: false, float: false, gizmo: false, gizmoIn: 0,
    touched: new Set(),          // species ids touched on the descent (for summon chains)
    fx: [],                      // events for sound/particles: { type, x, d }
  };
}

// Advances depth; returns 'maxDepth' or 'surface' when the run hits an end, else null.
export function moveRun(run, dt, tilt) {
  run.t += dt;
  steer(run.lure, tilt, dt, run.mode === 'ascent' ? CONFIG.ASCENT_STEER_MULT : 1);
  if (run.mode === 'descent') {
    run.depth += PHYS.SINK * run.sinkMul * dt;
    run.maxReached = Math.max(run.maxReached, Math.min(run.depth, run.lineLength));
    if (run.depth >= run.lineLength - 1e-9) { run.depth = run.lineLength; return 'maxDepth'; }
  } else if (run.mode === 'ascent') {
    run.depth -= PHYS.REEL * CONFIG.REEL_RISE_MULT * run.reelMul * dt;
    if (run.depth <= 1e-9) { run.depth = 0; return 'surface'; }
  }
  return null;
}

// Screen y (logical px) of a world depth, with the lure pinned at `lureY`.
export const screenY = (run, depth, lureY) => lureY + (depth - run.depth) * CONFIG.PX_PER_M;

export const SAW = { RADIUS: 26, TURBO_RADIUS: 1.5, TURBO_SPEED: 1.3, FLOAT_RISE: 0.5,
  GIZMO_SINK: 1.25, GIZMO_RISE: 0.8, GIZMO_RANGE: 140, GIZMO_EVERY: 0.4 };

// Hold-to-saw (GAME_SPEC §2): drains 1 fuel/s, cuts touched fish (paid). Sets this frame's speed multipliers.
export function sawStep(run, dt, held) {
  run.sawing = run.saw && held && run.fuel > 1e-9 && (run.mode === 'descent' || run.mode === 'ascent');
  if (run.sawing) run.fuel = Math.max(0, run.fuel - dt);
  const turbo = run.sawing && run.turbo ? SAW.TURBO_SPEED : 1;
  run.sinkMul = (run.gizmo ? SAW.GIZMO_SINK : 1) * turbo;
  run.reelMul = (run.gizmo ? SAW.GIZMO_RISE : 1) * turbo * (run.float && held && run.mode === 'ascent' ? SAW.FLOAT_RISE : 1);
  if (!run.sawing) return;
  const reach = SAW.RADIUS * (run.turbo ? SAW.TURBO_RADIUS : 1);
  for (const f of [...run.fish]) {
    if (f.sp.rarity === 'boss') continue;
    const dx = f.x - run.lure.x, dy = (f.d - run.depth) * CONFIG.PX_PER_M;
    if (dx * dx + dy * dy < (reach + f.r) ** 2) land(run, f, 'saw');
  }
  if (run.gizmo && (run.gizmoIn -= dt) <= 0) {
    run.gizmoIn = SAW.GIZMO_EVERY;
    let best = null, bd = SAW.GIZMO_RANGE;
    for (const f of run.fish) {
      if (f.sp.rarity === 'boss') continue;
      const dd = Math.hypot(f.x - run.lure.x, (f.d - run.depth) * CONFIG.PX_PER_M) - f.r;
      if (dd < bd) { bd = dd; best = f; }
    }
    if (best) land(run, best, 'saw');
  }
}

const touching = (run, f) => {
  const dx = f.x - run.lure.x, dy = (f.d - run.depth) * CONFIG.PX_PER_M, r = PHYS.LURE_R + f.r;
  return dx * dx + dy * dy < r * r;
};

export function isVisible(run, f) {
  const lureY = CONFIG.H * (run.mode === 'ascent' ? PHYS.LURE_Y_ASCENT : PHYS.LURE_Y_DESCENT);
  const y = lureY + (f.d - run.depth) * CONFIG.PX_PER_M;
  return y > -f.r && y < CONFIG.H + f.r;
}

// Golden fish (v1.4): the first frame a golden fish is on screen it pushes one 'golden' fx (sfx_golden_shine).
// f.seen sticks to the fish, so scrolling off and back on, or the turn to the ascent, never fires it again.
export function spotGolden(run) {
  for (const f of run.fish) {
    if (!f.golden || f.seen || !isVisible(run, f)) continue;
    f.seen = true;
    run.fx.push({ type: 'golden', x: f.x, d: f.d, sp: f.sp, golden: true });
  }
}

export function land(run, f, how) {
  run.fish.splice(run.fish.indexOf(f), 1);
  const rec = { sp: f.sp, depth: f.d, how };
  if (how === 'zap' && run.zapBonus > 1) rec.bonus = run.zapBonus;
  if (f.golden) rec.golden = true;
  run.landed.push(rec);
  run.fx.push({ type: how, x: f.x, d: f.d, sp: f.sp, bonus: rec.bonus, golden: rec.golden });
}

export const MAGNET = { SPEED: 140 }; // px/s [TUNE]

// Magnet Charm (ascent): fish whose edge is within run.magnet px of the hook drift toward it.
export function magnetStep(run, dt) {
  if (!run.magnet || run.mode !== 'ascent') return;
  for (const f of run.fish) {
    if (f.sp.rarity === 'boss') continue;
    const dx = run.lure.x - f.x, dy = (run.depth - f.d) * CONFIG.PX_PER_M, dist = Math.hypot(dx, dy);
    if (dist < 1e-6 || dist - f.r > run.magnet) continue;
    const k = Math.min(dist, MAGNET.SPEED * dt) / dist, dd = (dy * k) / CONFIG.PX_PER_M;
    f.x += dx * k; f.d += dd;
    if (f.home !== undefined) f.home += dd;
  }
}

function hook(run, f) {
  run.fish.splice(run.fish.indexOf(f), 1);
  run.hooked.push(f);
  run.fx.push({ type: 'hook', x: f.x, d: f.d, sp: f.sp, golden: f.golden });
}

// Resolves lure/fish contact for this frame. Returns 'touch' when the descent must end.
export function contact(run) {
  if (run.mode !== 'descent' && run.mode !== 'ascent') return null;
  const near = run.fish.filter((f) => Math.abs(f.d - run.depth) * CONFIG.PX_PER_M < PHYS.LURE_R + f.r);
  for (const f of near) {
    if (!run.fish.includes(f) || !touching(run, f)) continue;
    if (run.mode === 'ascent') { hook(run, f); continue; }
    run.touched.add(f.sp.id);
    if (run.charges > 0) {               // Hook Charm: lightning, the dive continues
      run.charges--;
      if (run.zapAll) for (const g of run.fish.filter((g) => isVisible(run, g))) land(run, g, 'zap');
      else land(run, f, 'zap');
      continue;
    }
    hook(run, f);
    return 'touch';
  }
  return null;
}
