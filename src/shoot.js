// Surface launch + shooting (GAME_SPEC §3, §5). Pure: no DOM.
// Firing is limited ONLY by each gun's fire rate. There is no limited-shots state of any kind.
import { CONFIG } from './config.js';
import { GOLD } from './fish.js';

const { W, H } = CONFIG;
// VY_MIN/VY_MAX are the v1.0 base speeds; CONFIG.LAUNCH_VY_MULT scales them. Gravity is CONFIG.GRAVITY.
export const SHOOT = { VY_MIN: 1100, VY_MAX: 1450, VX: 260, STAGGER: 0.06, WATER: 780, HIT_PAD: 48, CAM_TAU: 0.25,
  ZOOM_MIN: 0.5, FRAME_TOP: 80, FRAME_LOW: 200, EDGE: 40 }; // sky camera framing, world/screen px
export const gunRate = (gun) => gun.rate * CONFIG.GUN_RATE_MULT;

// gear: { spring, antigrav, fallSlow (gravity ×), launchMul (vy ×) } — all multiply together.
export function createShoot(hooked, gear = {}, x0 = W / 2) {
  return {
    queue: [...hooked], air: [], landed: [], lost: [], x0,
    t: 0, launchIn: 0, cooldown: 0, pointer: { x: W / 2, y: 300, down: false }, shots: [], fired: 0, hits: 0,
    cam: 0,  // world y of the top of the view (≤ 0: the sky camera pans up to follow the fish)
    zoom: 1, // view scale, ZOOM_MIN..1 (< 1: zoomed out to fit a tall spread of fish)
    g: CONFIG.GRAVITY * (gear.antigrav ? 0.55 : 1) * (gear.fallSlow ?? 1),
    vyMul: CONFIG.LAUNCH_VY_MULT * (gear.spring ? 1.15 : 1) * (gear.launchMul ?? 1),
  };
}

// World ↔ screen for the sky camera. The zoom is about the horizontal centre and the view top.
export const toScreen = (s, x, y) => ({ x: (x - W / 2) * s.zoom + W / 2, y: (y - s.cam) * s.zoom });
export const toWorld = (s, x, y) => ({ x: (x - W / 2) / s.zoom + W / 2, y: y / s.zoom + s.cam });
export const lowestFish = (s) => s.air.reduce((lo, f) => (!lo || f.y > lo.y ? f : lo), null);

// Sky camera target: frame every airborne fish (zooming out to ZOOM_MIN for a tall spread); when they
// don't all fit, the LOWEST fish (the next to land) wins. The view bottom never drops below the base view.
export function camTarget(s) {
  if (!s.air.length) return { cam: 0, zoom: 1 };
  let top = Infinity, low = -Infinity;
  for (const f of s.air) { top = Math.min(top, f.y); low = Math.max(low, f.y); }
  const a = top - SHOOT.FRAME_TOP, b = low + SHOOT.FRAME_LOW;
  const zoom = Math.min(1, Math.max(SHOOT.ZOOM_MIN, H / (b - a)));
  const bottom = Math.min(H, Math.max(b, (a + b) / 2 + H / (2 * zoom)));
  return { cam: bottom - H / zoom, zoom };
}

// Eases toward the target, then hard-keeps the lowest airborne fish inside the canvas.
export function moveCam(s, dt) {
  const tg = camTarget(s), k = 1 - Math.exp(-dt / SHOOT.CAM_TAU);
  s.zoom += (tg.zoom - s.zoom) * k;
  s.cam += (tg.cam - s.cam) * k;
  const lo = lowestFish(s);
  if (!lo) return;
  const y = (lo.y - s.cam) * s.zoom, e = SHOOT.EDGE;
  if (y > H - e) s.cam = lo.y - (H - e) / s.zoom;
  if (y < e) s.cam = lo.y - e / s.zoom;
}

export function launchOne(s, f, rng = Math.random) {
  const vy = -(SHOOT.VY_MIN + rng() * (SHOOT.VY_MAX - SHOOT.VY_MIN)) * s.vyMul;
  const g = { sp: f.sp, d: f.d, r: f.r, hp: f.hp, x: s.x0, y: SHOOT.WATER, vx: (rng() * 2 - 1) * SHOOT.VX, vy, spin: 0, hit: 0 };
  if (f.golden) { g.golden = true; g.vx *= GOLD.SPEED; g.wob = rng() * 6; } // golden: 3x HP (makeFish), quicker + a wobble
  s.air.push(g);
}

// Moves airborne fish; fish falling back below the waterline are lost (not paid).
export function flyFish(s, dt, rng = Math.random) {
  s.t += dt;
  s.launchIn -= dt;
  while (s.queue.length && s.launchIn <= 1e-9) { launchOne(s, s.queue.shift(), rng); s.launchIn += SHOOT.STAGGER; }
  for (const f of [...s.air]) {
    f.vy += s.g * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.spin += dt * f.vx * 0.02;
    if (f.golden) { f.wob += dt * 7; f.x += Math.cos(f.wob) * GOLD.WOBBLE * 7 * dt; } // side-to-side ±GOLD.WOBBLE px
    f.hit = Math.max(0, f.hit - dt);
    if (f.x < f.r) { f.x = f.r; f.vx = Math.abs(f.vx); }
    if (f.x > W - f.r) { f.x = W - f.r; f.vx = -Math.abs(f.vx); }
    if (f.vy > 0 && f.y > SHOOT.WATER) { s.air.splice(s.air.indexOf(f), 1); s.lost.push(f); }
  }
  moveCam(s, dt);
}

export const shootDone = (s) => s.queue.length === 0 && s.air.length === 0;

// One trigger pull: each pellet lands at a random point in the spread circle around the pointer.
// The pointer is in screen coordinates; pellets live in world coordinates (toWorld). Spread and the
// hit slack are screen px, so zooming out never makes a fish harder to hit.
export function fire(s, gun, rng = Math.random) {
  s.fired++;
  const aim = toWorld(s, s.pointer.x, s.pointer.y), pad = SHOOT.HIT_PAD / s.zoom;
  for (let i = 0; i < gun.pellets; i++) {
    const a = rng() * Math.PI * 2, rad = (Math.sqrt(rng()) * gun.spread) / s.zoom;
    const x = aim.x + Math.cos(a) * rad, y = aim.y + Math.sin(a) * rad;
    s.shots.push({ x, y, t: s.t });
    const f = s.air.find((f) => (f.x - x) ** 2 + (f.y - y) ** 2 < (f.r + pad) ** 2);
    if (!f) continue;
    f.hp -= gun.damage; f.hit = 0.12; s.hits++;
    if (f.hp <= 1e-9) { s.air.splice(s.air.indexOf(f), 1); s.landed.push(f); }
  }
}

// Press or hold = fire every 1/(rate × GUN_RATE_MULT) seconds for as long as the pointer is down. Never runs dry.
export function trigger(s, dt, gun, rng = Math.random) {
  if (s.pointer.down) while (s.cooldown <= 1e-9) { fire(s, gun, rng); s.cooldown += 1 / gunRate(gun); }
  s.cooldown = s.pointer.down ? s.cooldown - dt : Math.max(0, s.cooldown - dt);
  if (s.shots.length > 64) s.shots.splice(0, s.shots.length - 64);
}

// Fixed-step update for the whole shooting phase. Returns 'noAirborne' when every fish is shot or lost.
export function stepShoot(s, dt, gun, rng = Math.random) {
  trigger(s, dt, gun, rng);
  flyFish(s, dt, rng);
  return shootDone(s) ? 'noAirborne' : null;
}
