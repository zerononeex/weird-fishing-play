// The only steering input: getTilt() -> [-1, 1]. Fed by ◀ ▶ buttons, keys and screen-halves holds (GAME_SPEC §6, §10.C).
import { CONFIG } from './config.js';

export const TUNING = { RAMP_UP: 4, RAMP_DOWN: 6, NUDGE: 0.35, TAP_MS: 150, DEAD_ZONE: 0.06, TOP_STRIP: 0.25 };

export function createInput() {
  return { holds: { '-1': new Map(), '1': new Map() }, p: 0, nudge: 0, raw: 0, saw: new Set() };
}

const approach = (v, target, d) => (v < target ? Math.min(target, v + d) : Math.max(target, v - d));
const smooth = (x) => x * x * (3 - 2 * x);
const clamp1 = (v) => Math.max(-1, Math.min(1, v));

export function press(s, dir, src, t) { s.holds[dir].set(src, t); }

export function release(s, dir, src, t) {
  const t0 = s.holds[dir].get(src);
  if (t0 === undefined) return;
  s.holds[dir].delete(src);
  if (t - t0 < TUNING.TAP_MS && s.holds[dir].size === 0) s.nudge = dir * TUNING.NUDGE;
}

// ---- screen halves: a held pointer in the lower 75% steers like a ◀ ▶ button (same holds, same ramp) ----
const sideOf = (x) => (x < CONFIG.W / 2 ? -1 : x > CONFIG.W / 2 ? 1 : 0);
export function halfDir(x, y) { return y < CONFIG.H * TUNING.TOP_STRIP ? 0 : sideOf(x); }

// Pointer routing for the dive scenes. b = the button under the pointer (or null). Returns the
// per-pointer record main.js keeps until pointerup, or null when this pointer does nothing here.
export function routeDown(s, src, p, b, t, steers = true) {
  if (b?.hold) { press(s, b.hold, src, t); return { hold: b.hold }; }
  if (b?.saw) { s.saw.add(src); return { saw: true }; }   // SAW button: saws, never steers
  if (b || !steers) return null;
  const dir = halfDir(p.x, p.y);
  if (!dir) return null;                                   // top strip: reserved for HUD / knife
  press(s, dir, src, t);
  return { half: dir };
}

// Sliding a held finger across the centre switches sides (no tap nudge).
export function routeMove(s, src, st, p, t) {
  if (!st?.half) return;
  const dir = sideOf(p.x);
  if (!dir || dir === st.half) return;
  s.holds[st.half].delete(src); press(s, dir, src, t); st.half = dir;
}

export function routeUp(s, src, st, t) {
  if (!st) return;
  if (st.hold) release(s, st.hold, src, t);
  if (st.half) release(s, st.half, src, t);
  if (st.saw) s.saw.delete(src);
}

export function releaseAll(s) {
  s.holds['-1'].clear(); s.holds['1'].clear(); s.saw.clear();
}

export function step(s, dt) {
  const { RAMP_UP, RAMP_DOWN } = TUNING;
  const target = (s.holds['1'].size ? 1 : 0) - (s.holds['-1'].size ? 1 : 0);
  const outward = target !== 0 && Math.sign(s.p) !== -target;
  s.p = approach(s.p, target, (outward ? RAMP_UP : RAMP_DOWN) * dt);
  s.nudge = approach(s.nudge, 0, RAMP_DOWN * dt);
  s.raw = clamp1(Math.sign(s.p) * smooth(Math.abs(s.p)) + s.nudge);
}

export function tiltOf(s) {
  const a = Math.abs(s.raw), dz = TUNING.DEAD_ZONE;
  return a < dz ? 0 : (Math.sign(s.raw) * (a - dz)) / (1 - dz);
}

// Shared instance used by the game. Physics only ever calls getTilt().
export const input = createInput();
export const getTilt = () => tiltOf(input);

const KEYS = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 };
export function bindKeys(target) {
  target.addEventListener('keydown', (e) => {
    const dir = KEYS[e.code];
    if (dir && !e.repeat) { press(input, dir, e.code, performance.now()); e.preventDefault(); }
    if (e.code === 'Space') { input.saw.add('Space'); e.preventDefault(); }
  });
  target.addEventListener('keyup', (e) => {
    const dir = KEYS[e.code];
    if (dir) release(input, dir, e.code, performance.now());
    if (e.code === 'Space') input.saw.delete('Space');
  });
  target.addEventListener('blur', () => releaseAll(input));
}
