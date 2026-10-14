// Cast → descent → turn → ascent scenes.
import { CONFIG } from './config.js';
import { G } from './game.js';
import { getTilt } from './input.js';
import { arrowButtons } from './ui.js';
import { createRun, moveRun, contact, sawStep, screenY, PHYS } from './sim.js';
import { addButton } from './ui.js';
import { createSpawner, spawnTo, moveFish, makeFish, makeAllowed, placeGuaranteed, summon, AHEAD } from './fish.js';
import { BY_ID } from './data/fish.js';
import { ZONES, light, lampRadius } from './data/zones.js';
import { drawFish } from './fishart.js';
import { drawSea, drawLure, drawLine, drawArrows, text, lerpRgb, drawBoat, drawSky, drawCrosshair } from './draw.js';
import { createShoot, stepShoot, SHOOT } from './shoot.js';
import { GUN } from './data/shop.js';
import { wearDrawer } from './icons.js';
import { sfx } from './audio.js';
import { burst, popup, quake, drawFx, clearFx } from './fx.js';
import { fishPay } from './economy.js';
import { input } from './input.js';

const { W, H, PX_PER_M } = CONFIG;
const CAST_S = 0.8, TURN_S = 0.5;
let timer = 0, lureY = H * PHYS.LURE_Y_DESCENT;

let spawner = null;

let allowed = () => true;

// opts: { zone, lineLength, startDepth, gear, cond: { hour, night, hat, suit, post }, seed }
export function startRun(opts) {
  const zone = opts.zone || ZONES[0];
  G.run = createRun({ lineLength: Math.min(opts.lineLength, zone.maxDepth), startDepth: opts.startDepth || 0 });
  Object.assign(G.run, opts.gear || {});
  G.run.fuel = G.run.fuelMax;   // fuel refills at every cast
  G.run.zone = zone;
  G.run.night = !!opts.cond?.night;
  allowed = makeAllowed({ hour: new Date().getHours(), ...opts.cond, touched: G.run.touched });
  spawner = createSpawner(zone, { seed: opts.seed ?? (Date.now() & 0xffff), allowed });
  placeGuaranteed(G.run, zone, allowed);
  spawnTo(G.run, spawner, G.run.depth + AHEAD);
  placeBoss(zone, allowed);
  lureY = H * PHYS.LURE_Y_DESCENT;
}

// The zone boss (or its post-game replacement) waits at the very bottom when the line reaches it.
function placeBoss(zone, allowed) {
  if (!zone.boss || G.run.lineLength < zone.maxDepth) return;
  const boss = BY_ID.get(zone.boss), post = zone.postBoss && BY_ID.get(zone.postBoss);
  const sp = allowed(boss) ? boss : post && allowed(post) ? post : null;
  if (sp) G.run.fish.push(makeFish(sp, W / 2, zone.maxDepth - 4));
}

function knifeButton(ctx) {
  if (!G.run.knife) return;
  addButton({ x: W - 96, y: 24, w: 76, h: 76, onTap: () => G.go('knife') });
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(W - 58, 62, 36, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(W - 58, 62); ctx.rotate(-0.7);
  ctx.fillStyle = '#e8eef3'; ctx.beginPath(); ctx.moveTo(-4, -26); ctx.lineTo(6, -26); ctx.lineTo(4, 6); ctx.lineTo(-4, 6); ctx.fill();
  ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-5, 6, 10, 20);
  ctx.restore();
}

function seaColors(zone, depth) {
  const k = Math.min(1, depth / zone.darkDepth);
  return [lerpRgb(zone.sea[0], zone.sea[1], k * 0.8), lerpRgb(zone.sea[0], zone.sea[1], Math.min(1, k + 0.35))];
}

let dark = null;
function darkness(ctx, run) {
  const l = light(run.zone, run.depth, run.lamp || 0);
  if (l >= 0.99) return;
  if (!dark) { dark = document.createElement('canvas'); dark.width = W / 2; dark.height = H / 2; }
  const d = dark.getContext('2d');
  d.setTransform(0.5, 0, 0, 0.5, 0, 0);
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, W, H);
  d.fillStyle = `rgba(2,8,22,${(1 - l).toFixed(3)})`; d.fillRect(0, 0, W, H);
  d.globalCompositeOperation = 'destination-out';
  const r = lampRadius(run.zone, run.lamp || 0), g = d.createRadialGradient(run.lure.x, lureY, r * 0.25, run.lure.x, lureY, r);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  d.fillStyle = g; d.fillRect(0, 0, W, H);
  ctx.drawImage(dark, 0, 0, W, H);
}

function fuelBar(ctx, run) {
  const w = 150, k = run.fuelMax ? run.fuel / run.fuelMax : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(20, 26, w + 8, 30);
  ctx.fillStyle = k > 0.25 ? '#ffd166' : '#ff6b6b'; ctx.fillRect(24, 30, w * k, 22);
  text(ctx, 'SAW', 24 + w / 2, 41, 16, '#3a2600');
}

const fishY = (run, f) => screenY(run, f.d, lureY);
function drawSchool(ctx, run, t, glow) {
  for (const f of run.fish) {
    if ((f.sp.beh === 'glow') !== glow) continue;
    const y = fishY(run, f);
    if (y < -100 || y > H + 100) continue;
    drawFish(ctx, f.sp, f.x, y, f.r, f.dir, t + f.t);
  }
}

export function renderWorld(ctx, t) {
  const run = G.run;
  let [top, bottom] = seaColors(run.zone, run.depth);
  if (run.night) { top = top.map((c) => c * 0.45); bottom = bottom.map((c) => c * 0.6); }
  drawSea(ctx, top, bottom, run.depth * PX_PER_M, t);
  const surfY = screenY(run, 0, lureY);
  if (surfY > -40) {
    ctx.fillStyle = '#bfefff'; ctx.fillRect(0, 0, W, Math.max(0, surfY));
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(0, surfY - 4, W, 6);
  }
  const lineEnd = screenY(run, run.lineLength, lureY);
  if (lineEnd < H + 40) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, lineEnd, W, H); }
  drawSchool(ctx, run, t, false);
  drawLine(ctx, W / 2, Math.min(surfY, -10), run.lure.x, lureY - 26);
  run.hooked.forEach((f, i) => {
    const a = Math.sin(t * 5 + i) * 0.5;
    drawFish(ctx, f.sp, run.lure.x + Math.sin(t * 4 + i * 2) * 14, lureY + 26 + (i % 12) * 9, Math.min(f.r, 26) * 0.8, a > 0 ? 1 : -1, t);
  });
  drawLure(ctx, run.lure.x, lureY, t, run.sawing);
  darkness(ctx, run);
  drawSchool(ctx, run, t, true);
  if (run.saw) fuelBar(ctx, run);
  text(ctx, `${Math.floor(run.depth)} m`, W / 2, 50, 40);
  if (Number.isFinite(run.lineLength)) text(ctx, `line ${run.lineLength} m`, W / 2, 92, 20, '#cfe9ff');
}

const play = {
  update(dt) {
    spawnTo(G.run, spawner, G.run.depth + AHEAD);
    moveFish(G.run, dt);
    sawStep(G.run, dt, input.saw.size > 0);
    const ev = moveRun(G.run, dt, getTilt()) || contact(G.run);
    summon(G.run, G.run.zone, allowed);
    if (G.run.sawing) sfx.saw();
    for (const e of G.run.fx.splice(0)) {
      const y = screenY(G.run, e.d, lureY);
      if (e.type === 'hook') { sfx.hook(); burst(e.x, y, '#bde0fe', 6, 120); }
      if (e.type === 'zap') { sfx.zap(); burst(e.x, y, '#ffee32', 14, 260); quake(5); }
      if (e.type === 'saw') { burst(e.x, y, '#ff8fa3', 10, 220); }
    }
    const target = H * (G.run.mode === 'ascent' ? PHYS.LURE_Y_ASCENT : PHYS.LURE_Y_DESCENT);
    lureY += (target - lureY) * Math.min(1, dt * 3);
    if (ev === 'touch' || ev === 'maxDepth') sfx.reel();
    if (ev) G.go(ev);
  },
  render(ctx, t) { renderWorld(ctx, t); drawFx(ctx); arrowButtons(); drawArrows(ctx, input); knifeButton(ctx); },
};

G.scenes.cast = {
  steers: false,
  enter() { timer = CAST_S; clearFx(); sfx.splash(); burst(G.run.lure.x, lureY, '#ffffff', 16, 220, 0.6); },
  update(dt) { if ((timer -= dt) <= 0) G.go('done'); },
  render(ctx, t) { renderWorld(ctx, t); text(ctx, 'SPLASH!', W / 2, H * 0.55, 64, '#fff'); },
};
G.scenes.descent = { ...play, enter() { G.run.mode = 'descent'; } };
G.scenes.turn = {
  enter() { timer = TURN_S; G.run.mode = 'turn'; },
  update(dt) {
    moveRun(G.run, dt, getTilt());
    if ((timer -= dt) <= 0) G.go('done');
  },
  render(ctx, t) { play.render(ctx, t); text(ctx, 'REEL IT IN!', W / 2, H * 0.5, 56, '#ffd166'); },
};
G.scenes.ascent = { ...play, enter() { G.run.mode = 'ascent'; } };

// ---- surface: launch + shooting ----
const gun = () => GUN[G.slot.equip.gun] || GUN.pistol;

G.scenes.launch = {
  steers: false,
  enter() { G.shoot = createShoot(G.run.hooked, G.run, G.run.lure.x); G.go('done'); },
};

G.scenes.shoot = {
  steers: false,
  update(dt) {
    const s = G.shoot, fired = s.fired, hits = s.hits, landed = s.landed.length;
    const done = stepShoot(s, dt, gun());
    if (s.fired > fired) sfx.shot(gun().pellets);
    if (s.hits > hits) sfx.hit();
    for (const f of s.landed.slice(landed)) {
      const pay = Math.round(fishPay(f, { outfit: G.slot.equip.outfit, zoneId: G.run.zone.id }));
      if (pay < 0) sfx.ouch(); else sfx.coin();
      if (f.sp.rarity === 'boss') { sfx.boss(); quake(12, 0.5); }
      burst(f.x, f.y, f.sp.color, 14, 240); popup(f.x, f.y - 20, `${pay < 0 ? '-' : '+'}$${Math.abs(pay).toLocaleString()}`, pay < 0 ? '#ff8fa3' : '#ffe066');
    }
    if (done) G.go('noAirborne');
  },
  pointerDown(p) { Object.assign(G.shoot.pointer, p, { down: true }); return true; },
  pointerMove(p) { Object.assign(G.shoot.pointer, p); },
  pointerUp() { G.shoot.pointer.down = false; },
  render(ctx, t) {
    const s = G.shoot;
    drawSky(ctx, SHOOT.WATER, t, G.run.night);
    drawBoat(ctx, s.x0, SHOOT.WATER + 4, t, G.slot.color, wearDrawer(G.slot.equip),
      G.slot.flags.bossBeaten ? (c) => drawFish(c, BY_ID.get(47), -44, -40, 16, -1, t) : null);
    for (const f of s.air) {
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.spin);
      if (f.hit > 0) ctx.globalAlpha = 0.6 + Math.sin(f.hit * 80) * 0.4;
      drawFish(ctx, f.sp, 0, 0, f.r, 1, t);
      ctx.restore();
    }
    for (const p of s.shots) {
      const age = s.t - p.t; if (age > 0.15) continue;
      ctx.fillStyle = `rgba(255,230,120,${1 - age / 0.15})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 7 * (1 - age / 0.15) + 2, 0, Math.PI * 2); ctx.fill();
    }
    drawFx(ctx);
    if (s.pointer.down) drawCrosshair(ctx, s.pointer.x, s.pointer.y, gun().spread, true);
    text(ctx, 'TAP & HOLD TO SHOOT!', W / 2, 60, 30, '#fff');
    text(ctx, gun().name, W / 2, 100, 20, '#cfe9ff');
  },
};
