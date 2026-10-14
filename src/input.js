// The only steering input: getTilt() -> [-1, 1]. Fed by ◀ ▶ buttons, keys and pointer drag (GAME_SPEC §6).
export const TUNING = { RAMP_UP: 4, RAMP_DOWN: 6, NUDGE: 0.35, TAP_MS: 150, DEAD_ZONE: 0.06, DRAG_RANGE: 120 };

export function createInput() {
  return { holds: { '-1': new Map(), '1': new Map() }, p: 0, nudge: 0, drag: null, dragRaw: 0, raw: 0, saw: new Set() };
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

export function dragStart(s, x) { s.drag = { x0: x, x }; }
export function dragMove(s, x) { if (s.drag) s.drag.x = x; }
export function dragEnd(s) { s.drag = null; }

export function releaseAll(s) {
  s.holds['-1'].clear(); s.holds['1'].clear(); s.drag = null; s.saw.clear();
}

export function step(s, dt) {
  const { RAMP_UP, RAMP_DOWN, DRAG_RANGE } = TUNING;
  const target = (s.holds['1'].size ? 1 : 0) - (s.holds['-1'].size ? 1 : 0);
  const outward = target !== 0 && Math.sign(s.p) !== -target;
  s.p = approach(s.p, target, (outward ? RAMP_UP : RAMP_DOWN) * dt);
  s.nudge = approach(s.nudge, 0, RAMP_DOWN * dt);
  s.dragRaw = s.drag ? clamp1((s.drag.x - s.drag.x0) / DRAG_RANGE) : approach(s.dragRaw, 0, RAMP_DOWN * dt);
  const hold = clamp1(Math.sign(s.p) * smooth(Math.abs(s.p)) + s.nudge);
  s.raw = Math.abs(s.dragRaw) > Math.abs(hold) ? s.dragRaw : hold;
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
