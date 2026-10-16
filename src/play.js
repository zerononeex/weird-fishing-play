// Cast → descent → turn → ascent scenes.
import { CONFIG } from './config.js';
import { G } from './game.js';
import { getTilt } from './input.js';
import { arrowButtons, sawButton } from './ui.js';
import { createRun, moveRun, contact, sawStep, magnetStep, spotGolden, screenY, PHYS } from './sim.js';
import { addButton } from './ui.js';
import { createSpawner, spawnTo, moveFish, makeFish, makeAllowed, placeGuaranteed, summon, AHEAD } from './fish.js';
import { BY_ID } from './data/fish.js';
import { ZONES, light, lampRadius } from './data/zones.js';
import { drawFish } from './fishart.js';
import { drawSea, drawLure, drawLine, drawArrows, drawSawButton, text, lerpRgb, drawBoat, drawSky, drawCrosshair } from './draw.js';
import { createShoot, stepShoot, toScreen, SHOOT } from './shoot.js';
import { GUN, ITEM } from './data/shop.js';
import { wearDrawer, drawItemIcon } from './icons.js';
import { art, drawArt, fadedArt } from './art.js';
import { sfx, sawLoop } from './audio.js';
import { burst, popup, quake, drawFx, clearFx } from './fx.js';
import { fishPay } from './economy.js';
import { input, sawHeld } from './input.js';
import { KNIFE_BTN } from './ui.js';

const { W, H, PX_PER_M } = CONFIG;
const CAST_S = 0.8, TURN_S = 0.5;
// v1.2: the cast moment sits 64 px lower (surface line lower on screen), then eases up to the dive position.
// v1.4: the dock boat moved down another 146 px (WATER 394 -> 540), so the cast surface drops by the same amount.
export const CAST_DROP = 64 + 146;
// cast_top (art #146): the sea surface sits at this fraction of the image height (wave band 0.375–0.57).
export const CAST_TOP = { SURFACE: 0.44, FADE: 240, NIGHT: 'rgba(5,15,45,0.5)' };
export const castTopDrawn = { at: -1 }; // smoke: screen y of the image top on the last frame it was drawn (-1: not drawn)
let timer = 0, lureY = H * PHYS.LURE_Y_DESCENT;

let spawner = null;

let allowed = () => true;

// opts: { zone, lineLength, startDepth, gear, cond: { hour, night, hat, suit, post, bosses }, seed }
export function startRun(opts) {
  const zone = opts.zone || ZONES[0];
  G.run = createRun({ lineLength: Math.min(opts.lineLength, zone.maxDepth), startDepth: opts.startDepth || 0 });
  Object.assign(G.run, opts.gear || {});
  G.run.fuel = G.run.fuelMax;   // fuel and charm charges refill at every cast
  G.run.chargesMax = G.run.charges;
  G.run.zone = zone;
  G.run.night = !!opts.cond?.night;
  allowed = makeAllowed({ hour: new Date().getHours(), ...opts.cond, touched: G.run.touched });
  spawner = createSpawner(zone, { seed: opts.seed ?? (Date.now() & 0xffff), allowed });
  placeGuaranteed(G.run, zone, allowed);
  spawnTo(G.run, spawner, G.run.depth + AHEAD);
  placeBoss(zone, allowed);
  lureY = H * PHYS.LURE_Y_DESCENT + CAST_DROP;
  input.sawLatch = false;       // the SAW toggle starts off every dive
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
  const k = KNIFE_BTN, cx = W - 20 - k / 2, cy = 24 + k / 2;
  addButton({ x: W - 20 - k, y: 24, w: k, h: k, onTap: () => { sfx.knife(); sawLoop(false); G.go('knife'); }, silent: true, label: 'KNIFE' });
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(cx, cy, k / 2 - 2, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k / 76, k / 76); ctx.rotate(-0.7);
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

// Hook Charm lightning: jagged bolts from the sky to each zapped fish, plus a white flash.
const bolts = [];
let flash = 0;
function strike(x, y) {
  const pts = [[x + (Math.random() - 0.5) * 60, -10]];
  for (let k = 1; k <= 7; k++) pts.push([x + (Math.random() - 0.5) * 50 * (1 - k / 8), (y * k) / 7]);
  pts[pts.length - 1] = [x, y];
  if (bolts.length < 12) bolts.push({ pts, life: 0.3 });
  flash = 0.18;
}
function drawBolts(ctx) {
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,240,${(flash / 0.18) * 0.45})`; ctx.fillRect(0, 0, W, H); }
  const im = art('fx/lightning.png');
  for (const b of bolts) {
    ctx.globalAlpha = Math.max(0, b.life / 0.3);
    if (im) { const [x, y] = b.pts[b.pts.length - 1]; ctx.drawImage(im, x - 36, -10, 72, y + 10); continue; }
    for (const [w, col] of [[10, 'rgba(160,220,255,0.6)'], [4, '#fffbe0']]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.beginPath();
      b.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
function stepBolts(dt) {
  flash = Math.max(0, flash - dt);
  for (let i = bolts.length - 1; i >= 0; i--) if ((bolts[i].life -= dt) <= 0) bolts.splice(i, 1);
}

// Equipped charm icon + charge pips next to the hook (descent only).
function charmPips(ctx, run) {
  if (!run.charm || run.mode !== 'descent' || !run.chargesMax) return;
  const x = run.lure.x + (run.lure.x > W - 120 ? -64 : 64), y = lureY;
  ctx.fillStyle = 'rgba(0,30,50,0.45)'; ctx.beginPath(); ctx.arc(x, y - 6, 24, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(x, y - 6); ctx.scale(0.75, 0.75); drawItemIcon(ctx, ITEM[run.charm], 0, 0); ctx.restore();
  for (let i = 0; i < run.chargesMax; i++) {
    const px = x - (run.chargesMax - 1) * 9 + i * 18;
    ctx.fillStyle = i < run.charges ? '#ffee32' : 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(px, y + 28, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,30,50,0.6)'; ctx.lineWidth = 2; ctx.stroke();
  }
}

const fishY = (run, f) => screenY(run, f.d, lureY);
function drawSchool(ctx, run, t, glow) {
  for (const f of run.fish) {
    if ((f.sp.beh === 'glow' || !!f.golden) !== glow) continue; // glowing + golden fish shine through the dark
    const y = fishY(run, f);
    if (y < -100 || y > H + 100) continue;
    drawFish(ctx, f.sp, f.x, y, f.r, f.dir, t + f.t, f.golden ? GOLDEN : undefined);
  }
}
const GOLDEN = { golden: true };
// The penguin buddy rides along once the Frozen Block has been melted (the ice comic, GAME_SPEC §6).
export const hasBuddy = (slot) => !!slot.flags.bosses?.includes(3);

// Above-water art (v1.2): sky + wave surface + shallow water as the top segment over the zone sea.
// It scrolls 1:1 with the surface, and its lower FADE px blend into the zone background.
function castTop(ctx, surfY, night) {
  castTopDrawn.at = -1;
  const im = art('bg/cast_top.png');
  if (!im) return false;
  const h = (W * im.naturalHeight) / im.naturalWidth, top = surfY - h * CAST_TOP.SURFACE, bottom = top + h;
  if (bottom <= 0) return true;
  ctx.drawImage(fadedArt('bg/cast_top.png', CAST_TOP.FADE / h), 0, top, W, h);
  // v1.4: with the lower cast surface the image top can sit below y 0; stretch its top sky row over the gap
  if (top > 0) ctx.drawImage(im, 0, 0, im.naturalWidth, 2, 0, 0, W, top + 1);
  if (night) { // same darkening as the other backgrounds at night, fading out with the image
    const g = ctx.createLinearGradient(0, bottom - CAST_TOP.FADE, 0, bottom);
    g.addColorStop(0, CAST_TOP.NIGHT); g.addColorStop(1, 'rgba(5,15,45,0)');
    ctx.fillStyle = CAST_TOP.NIGHT; ctx.fillRect(0, top, W, h - CAST_TOP.FADE);
    ctx.fillStyle = g; ctx.fillRect(0, bottom - CAST_TOP.FADE, W, CAST_TOP.FADE);
  }
  castTopDrawn.at = top;
  return true;
}

export function renderWorld(ctx, t) {
  const run = G.run;
  let [top, bottom] = seaColors(run.zone, run.depth);
  if (run.night) { top = top.map((c) => c * 0.45); bottom = bottom.map((c) => c * 0.6); }
  drawSea(ctx, top, bottom, run.depth * PX_PER_M, t, run.zone.bg);
  const surfY = screenY(run, 0, lureY);
  if (!castTop(ctx, surfY, run.night) && surfY > -40) {
    ctx.fillStyle = '#bfefff'; ctx.fillRect(0, 0, W, Math.max(0, surfY));
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(0, surfY - 4, W, 6);
  }
  const lineEnd = screenY(run, run.lineLength, lureY);
  if (lineEnd < H + 40) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, lineEnd, W, H); }
  drawSchool(ctx, run, t, false);
  drawLine(ctx, W / 2, Math.min(surfY, -10), run.lure.x, lureY - 26);
  run.hooked.forEach((f, i) => {
    const a = Math.sin(t * 5 + i) * 0.5;
    drawFish(ctx, f.sp, run.lure.x + Math.sin(t * 4 + i * 2) * 14, lureY + 26 + (i % 12) * 9, Math.min(f.r, 26) * 0.8, a > 0 ? 1 : -1, t, f.golden ? GOLDEN : undefined);
  });
  drawLure(ctx, run.lure.x, lureY, t, run.sawing);
  darkness(ctx, run);
  drawSchool(ctx, run, t, true);
  charmPips(ctx, run);
  drawBolts(ctx);
  if (run.saw) fuelBar(ctx, run);
  text(ctx, `${Math.floor(run.depth)} m`, W / 2, 50, 40);
  if (Number.isFinite(run.lineLength)) text(ctx, `line ${run.lineLength} m`, W / 2, 92, 20, '#cfe9ff');
}

const play = {
  update(dt) {
    spawnTo(G.run, spawner, G.run.depth + AHEAD);
    moveFish(G.run, dt);
    sawStep(G.run, dt, sawHeld(input));
    magnetStep(G.run, dt);
    stepBolts(dt);
    const ev = moveRun(G.run, dt, getTilt()) || contact(G.run);
    summon(G.run, G.run.zone, allowed);
    spotGolden(G.run);
    sawLoop(G.run.sawing);
    for (const e of G.run.fx.splice(0)) {
      const y = screenY(G.run, e.d, lureY);
      if (e.type === 'hook') { sfx.hook(); burst(e.x, y, e.golden ? '#ffd23f' : '#bde0fe', e.golden ? 14 : 6, 120); if (e.golden) sfx.shine(); if (e.sp.rarity === 'boss') sfx.boss(); }
      if (e.type === 'golden') { sfx.shine(); burst(e.x, y, '#ffd23f', 10, 160); }
      if ((e.type === 'zap' || e.type === 'saw') && e.golden) sfx.shine();
      if (e.type === 'zap' || e.type === 'saw') {
        const pay = Math.round(fishPay({ sp: e.sp, d: e.d, bonus: e.bonus, golden: e.golden }, payCtx()));
        popup(e.x, y - 24, `${pay < 0 ? '-' : '+'}$${Math.abs(pay).toLocaleString()}${e.golden ? ' GOLD!' : ''}`, pay < 0 ? '#ff8fa3' : '#ffe066');
      }
      if (e.type === 'zap') { sfx.zap(); strike(e.x, y); burst(e.x, y, '#ffee32', 14, 260); quake(5); }
      if (e.type === 'saw') { sfx.sawCut(); burst(e.x, y, '#ff8fa3', 10, 220); }
    }
    const target = H * (G.run.mode === 'ascent' ? PHYS.LURE_Y_ASCENT : PHYS.LURE_Y_DESCENT);
    lureY += (target - lureY) * Math.min(1, dt * 3);
    if (ev === 'touch') sfx.thud();
    if (ev === 'maxDepth') sfx.taut();
    if (ev) sawLoop(false);
    if (ev) G.go(ev);
  },
  render(ctx, t) {
    renderWorld(ctx, t); drawFx(ctx);
    arrowButtons(); drawArrows(ctx, input);
    if (G.run.saw) { sawButton(); drawSawButton(ctx, input, t); }
    knifeButton(ctx);
  },
};

G.scenes.cast = {
  steers: false,
  enter() { timer = CAST_S; clearFx(); bolts.length = 0; flash = 0; sfx.splash(); burst(G.run.lure.x, lureY, '#ffffff', 16, 220, 0.6); },
  update(dt) { if ((timer -= dt) <= 0) G.go('done'); },
  render(ctx, t) {
    renderWorld(ctx, t);
    ctx.globalAlpha = Math.max(0, timer / CAST_S); drawArt(ctx, 'fx/splash.png', G.run.lure.x - 90, lureY - 120, 180, 180); ctx.globalAlpha = 1;
    text(ctx, 'SPLASH!', W / 2, H * 0.55, 64, '#fff');
  },
};
G.scenes.descent = { ...play, enter() { G.run.mode = 'descent'; sfx.plop(); } };
G.scenes.turn = {
  enter() { timer = TURN_S; G.run.mode = 'turn'; sfx.reel(); },
  update(dt) {
    moveRun(G.run, dt, getTilt());
    if ((timer -= dt) <= 0) G.go('done');
  },
  render(ctx, t) { play.render(ctx, t); text(ctx, 'REEL IT IN!', W / 2, H * 0.5, 56, '#ffd166'); },
};
G.scenes.ascent = { ...play, enter() { G.run.mode = 'ascent'; sfx.reelStart(); } };

// ---- surface: launch + shooting ----
const gun = () => GUN[G.slot.equip.gun] || GUN.pistol;
const payCtx = () => ({ outfit: G.slot.equip.outfit, hat: G.slot.equip.hat, zoneId: G.run.zone.id });

G.scenes.launch = {
  steers: false,
  enter() { G.runNo++; sawLoop(false); G.shoot = createShoot(G.run.hooked, G.run, G.run.lure.x); if (G.run.hooked.length) sfx.launch(); G.go('done'); },
};

G.scenes.shoot = {
  steers: false,
  update(dt) {
    const s = G.shoot, fired = s.fired, hits = s.hits, landed = s.landed.length, lost = s.lost.length;
    const done = stepShoot(s, dt, gun());
    if (s.fired > fired) sfx.shot(gun());
    if (s.hits > hits) sfx.hit();
    if (s.lost.length > lost) sfx.lost();
    for (const f of s.landed.slice(landed)) {
      const pay = Math.round(fishPay(f, payCtx()));
      sfx.splat();
      if (pay < 0) sfx.ouch(); else sfx.coin();
      if (f.golden) sfx.shine();
      if (f.sp.rarity === 'boss') { sfx.boss(); quake(12, 0.5); }
      const { x, y } = toScreen(s, f.x, f.y);
      burst(x, y, f.golden ? '#ffd23f' : f.sp.color, f.golden ? 28 : 14, 240);
      popup(x, y - 20, `${pay < 0 ? '-' : '+'}$${Math.abs(pay).toLocaleString()}${f.golden ? ' ×5!' : ''}`, pay < 0 ? '#ff8fa3' : '#ffe066');
    }
    if (done) G.go('noAirborne');
  },
  pointerDown(p) { Object.assign(G.shoot.pointer, p, { down: true }); return true; },
  pointerMove(p) { Object.assign(G.shoot.pointer, p); },
  pointerUp() { G.shoot.pointer.down = false; },
  render(ctx, t) {
    const s = G.shoot, cam = s.cam, z = s.zoom;
    drawSky(ctx, SHOOT.WATER, t, G.run.night, cam, z);
    ctx.save(); ctx.translate(W / 2, 0); ctx.scale(z, z); ctx.translate(-W / 2, -cam); // sky camera: pan + zoom
    if ((SHOOT.WATER + 4 - cam) * z < H + 140) {
      drawBoat(ctx, s.x0, SHOOT.WATER + 4, t, G.slot.color, wearDrawer(G.slot.equip),
        hasBuddy(G.slot) ? (c) => drawFish(c, BY_ID.get(47), -44, -40, 16, -1, t) : null);
    }
    for (const f of s.air) {
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.spin);
      if (f.hit > 0) ctx.globalAlpha = 0.6 + Math.sin(f.hit * 80) * 0.4;
      drawFish(ctx, f.sp, 0, 0, f.r, 1, t, f.golden ? GOLDEN : undefined);
      ctx.restore();
    }
    for (const p of s.shots) {
      const age = s.t - p.t; if (age > 0.15) continue;
      ctx.fillStyle = `rgba(255,230,120,${1 - age / 0.15})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 7 * (1 - age / 0.15) + 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // fish above / below the view: a small arrow at the edge so kids know where to look
    for (const f of s.air) {
      const { x, y } = toScreen(s, f.x, f.y), r = f.r * z;
      if (y > -r && y < H + r) continue;
      const top = y < 0, ay = top ? 18 : H - 18;
      ctx.fillStyle = 'rgba(255,209,102,0.9)'; ctx.beginPath();
      ctx.moveTo(x, ay + (top ? -10 : 10)); ctx.lineTo(x - 12, ay + (top ? 8 : -8)); ctx.lineTo(x + 12, ay + (top ? 8 : -8)); ctx.fill();
    }
    drawFx(ctx);
    if (s.pointer.down) drawCrosshair(ctx, s.pointer.x, s.pointer.y, gun().spread, true);
    if (cam > -200) {
      text(ctx, 'TAP & HOLD TO SHOOT!', W / 2, 60, 30, '#fff');
      text(ctx, gun().name, W / 2, 100, 20, '#cfe9ff');
    }
  },
};
