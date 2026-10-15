// The only steering input: getTilt() -> [-1, 1]. Fed by ◀ ▶ buttons, keys and one-finger drag (GAME_SPEC §6, §10.C).
// Saw input: SAW button toggle (latched), two free fingers held, or Space held.

export const TUNING = { RAMP_UP: 4, RAMP_DOWN: 6, NUDGE: 0.35, TAP_MS: 150, DEAD_ZONE: 0.06, DRAG_FULL: 120 };

export function createInput() {
  return {
    holds: { '-1': new Map(), '1': new Map() }, p: 0, nudge: 0, raw: 0,
    saw: new Set(),       // held saw sources (Space)
    sawLatch: false,      // SAW button toggle (v1.2)
    free: new Map(),      // pointers held on the scene (not on a button): src -> { x0, x }. The first one drags.
    drag: 0,              // drag steering, ramped toward the drag target
  };
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

// ---- drag steering (v1.2): the first free finger's horizontal offset from where it touched down ----
const dragOwner = (s) => s.free.values().next().value;
export const dragTarget = (s) => { const f = dragOwner(s); return f ? clamp1((f.x - f.x0) / TUNING.DRAG_FULL) : 0; };
// Two or more free fingers held = saw (the first one keeps steering).
export const sawHeld = (s) => s.saw.size > 0 || s.sawLatch || s.free.size >= 2;
export const toggleSaw = (s) => (s.sawLatch = !s.sawLatch);

// Pointer routing for the dive scenes. b = the button under the pointer (or null). Returns the
// per-pointer record main.js keeps until pointerup, or null when this pointer does nothing here.
export function routeDown(s, src, p, b, t, steers = true) {
  if (b?.hold) { press(s, b.hold, src, t); return { hold: b.hold }; }
  if (b?.saw) { toggleSaw(s); return null; }               // SAW button: a tap toggles the saw, never steers
  if (b || !steers) return null;
  s.free.set(src, { x0: p.x, x: p.x });
  return { free: true };
}

export function routeMove(s, src, st, p) {
  const f = st?.free && s.free.get(src);
  if (f) f.x = p.x;
}

export function routeUp(s, src, st, t) {
  if (!st) return;
  if (st.hold) release(s, st.hold, src, t);
  if (st.free) {
    const owner = s.free.keys().next().value === src;
    s.free.delete(src);
    if (owner) { s.drag = 0; const next = dragOwner(s); if (next) next.x0 = next.x; } // finger up = tilt 0; the next finger takes over from where it is
  }
}

export function releaseAll(s) {
  s.holds['-1'].clear(); s.holds['1'].clear(); s.saw.clear(); s.free.clear(); s.drag = 0;
}

export function step(s, dt) {
  const { RAMP_UP, RAMP_DOWN } = TUNING;
  const target = (s.holds['1'].size ? 1 : 0) - (s.holds['-1'].size ? 1 : 0);
  const outward = target !== 0 && Math.sign(s.p) !== -target;
  s.p = approach(s.p, target, (outward ? RAMP_UP : RAMP_DOWN) * dt);
  s.nudge = approach(s.nudge, 0, RAMP_DOWN * dt);
  s.raw = clamp1(Math.sign(s.p) * smooth(Math.abs(s.p)) + s.nudge);
  // drag: same ramp rates as the buttons, linear in the offset (full tilt at DRAG_FULL px)
  const dt2 = dragTarget(s), out = Math.abs(dt2) > Math.abs(s.drag) && Math.sign(dt2) !== -Math.sign(s.drag);
  s.drag = s.free.size ? approach(s.drag, dt2, (out ? RAMP_UP : RAMP_DOWN) * dt) : 0;
}

// Buttons/keys + drag, clamped, with the dead zone.
export function tiltOf(s) {
  const v = clamp1(s.raw + s.drag), a = Math.abs(v), dz = TUNING.DEAD_ZONE;
  return a < dz ? 0 : (Math.sign(v) * (a - dz)) / (1 - dz);
}

// Shared instance used by the game. Physics only ever calls getTilt().
export const input = createInput();
export const getTilt = () => tiltOf(input);

const KEYS = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 };
export function bindKeys(target) {
  target.addEventListener('keydown', (e) => {
    if (e.target?.tagName === 'TEXTAREA') return; // typing / pasting a save code
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
