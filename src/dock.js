// The dock is the boat scene (GAME_SPEC §10.F): tap the fisher, the boat or the water to cast.
// A HUD bar overlays the sky; buoys under the boat pick the zone; the title screen reuses the scene.
import { CONFIG } from './config.js';
import { G } from './game.js';
import { addButton } from './ui.js';
import { text, rr, drawBoat, lerpRgb } from './draw.js';
import { art, drawArt } from './art.js';
import { wearDrawer, drawItemIcon } from './icons.js';
import { drawFish } from './fishart.js';
import { startRun } from './play.js';
import { ZONES } from './data/zones.js';
import { SPECIES } from './data/fish.js';
import { CHARMS, ITEM } from './data/shop.js';
import { zoneUnlocked, lockReason, refreshUnlocks, gearOf, grantGifts, owns, equip, charmOf } from './economy.js';
import { sfx } from './audio.js';

const { W, H } = CONFIG;
export const DOCK = { WATER: 330, BOAT_X: 270, BOAT_SCALE: 1.35, CAST_DELAY: 0.4 };
const money = (n) => '$' + Math.round(n).toLocaleString();
const dock = { panel: null, casting: 0, msg: '', msgT: 0 };

export function castFromDock() {
  const slot = G.slot, zone = ZONES[slot.zone - 1];
  slot.flags.hasCast = true;
  startRun({ zone, ...gearOf(slot, zone.id), cond: { night: slot.settings.night, hat: slot.equip.hat, suit: slot.equip.outfit, post: slot.flags.bossBeaten } });
  G.go('cast');
}

// ---- the scene: sky, sun/moon, clouds, sea band, waves, boat ----
function drawScene(ctx, t, night, zone, pose = 'idle') {
  const wy = DOCK.WATER;
  if (!drawArt(ctx, night ? 'dock/dock_bg_night.png' : 'dock/dock_bg.png', 0, 0, W, wy + 6)) {
    const g = ctx.createLinearGradient(0, 0, 0, wy);
    g.addColorStop(0, night ? '#0b1d3a' : '#5ec4f5'); g.addColorStop(1, night ? '#2d4a86' : '#d8f3ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, wy);
    if (night) {
      ctx.fillStyle = '#fff'; for (let i = 0; i < 24; i++) { const x = (i * 137) % W, y = 20 + ((i * 89) % (wy - 80)); ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + i); ctx.fillRect(x, y, 2, 2); }
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(445, 215, 30, 0, Math.PI * 2); ctx.fill();
    } else { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(445, 215, 36, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = night ? 'rgba(200,210,255,0.25)' : 'rgba(255,255,255,0.9)';
    for (const [x, y, s] of [[80, 200, 1], [330, 175, 0.8], [560, 250, 1.1]]) {
      const cx = ((x + t * 10 * s) % (W + 160)) - 80;
      ctx.beginPath(); ctx.arc(cx, y, 24 * s, 0, Math.PI * 2); ctx.arc(cx + 26 * s, y + 6, 18 * s, 0, Math.PI * 2); ctx.arc(cx - 24 * s, y + 7, 16 * s, 0, Math.PI * 2); ctx.fill();
    }
  }
  // underwater, tinted by the chosen zone
  const [top, bottom] = [zone.sea[0], lerpRgb(zone.sea[0], zone.sea[1], 0.8)].map((c) => (night ? c.map((v) => v * 0.5) : c));
  const seaImg = art(zone.bg);
  if (seaImg) {
    ctx.drawImage(seaImg, 0, wy, W, (W * seaImg.naturalHeight) / seaImg.naturalWidth);
    if (night) { ctx.fillStyle = 'rgba(5,15,45,0.5)'; ctx.fillRect(0, wy, W, H - wy); }
  } else {
    const sea = ctx.createLinearGradient(0, wy, 0, H);
    sea.addColorStop(0, `rgb(${top})`); sea.addColorStop(1, `rgb(${bottom})`);
    ctx.fillStyle = sea; ctx.fillRect(0, wy, W, H - wy);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  for (let i = 0; i < 6; i++) { const x = (i * 97 + t * 8) % W; ctx.fillRect(x, wy + 10, 3, H); }
  // idle fish from this zone
  const pool = SPECIES.filter((s) => s.zone === zone.id && s.rarity !== 'boss' && !s.cond.length);
  for (let i = 0; i < 5; i++) {
    const sp = pool[(i * 5) % pool.length], dir = i % 2 ? -1 : 1, span = W + 120;
    const x = ((((t * (22 + i * 7) * dir + i * 170) % span) + span) % span) - 60;
    drawFish(ctx, sp, x, 640 + i * 62 + Math.sin(t + i) * 6, Math.min(sp.r, 24), dir, t);
  }
  ctx.save(); ctx.translate(DOCK.BOAT_X, wy + 4); ctx.scale(DOCK.BOAT_SCALE, DOCK.BOAT_SCALE); // big target for small fingers
  drawBoat(ctx, 0, 0, t, G.slot.color, wearDrawer(G.slot.equip),
    G.slot.flags.bossBeaten ? (c) => drawFish(c, SPECIES[46], -44, -40, 16, -1, t) : null, pose);
  ctx.restore();
  // wave strip over the hull
  const wave = art('dock/wave_strip.png');
  if (wave) { // tile the strip at its own aspect, drifting slowly
    const ww = 150, wh = (ww * wave.naturalHeight) / wave.naturalWidth;
    for (let x = -((t * 20) % ww); x < W; x += ww) ctx.drawImage(wave, x, wy + 18 - wh * 0.5, ww, wh);
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4; ctx.beginPath();
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, wy + 6 + Math.sin(x * 0.045 + t * 2) * 4);
    ctx.stroke();
  }
}

// ---- HUD icon buttons (code-drawn; art slots ui/hud_*.png) ----
const TAU = Math.PI * 2;
const GLYPH = {
  shop(c) { c.fillStyle = '#8ac926'; rr(c, -16, -8, 32, 24, 5); c.fill(); c.strokeStyle = '#2b5a00'; c.lineWidth = 4; c.beginPath(); c.arc(0, -8, 9, Math.PI, 0); c.stroke(); },
  book(c) { c.fillStyle = '#2a9d8f'; rr(c, -15, -18, 30, 36, 4); c.fill(); c.fillStyle = '#e9f5db'; c.fillRect(-11, -14, 22, 28); c.fillStyle = '#ffb347'; c.beginPath(); c.ellipse(0, 0, 8, 5, 0, 0, TAU); c.fill(); },
  day(c) { c.fillStyle = '#ffd166'; c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fill(); c.strokeStyle = '#ffd166'; c.lineWidth = 3; for (let a = 0; a < TAU; a += TAU / 8) { c.beginPath(); c.moveTo(Math.cos(a) * 15, Math.sin(a) * 15); c.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); c.stroke(); } },
  night(c) { c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(0, 0, 15, 0, TAU); c.fill(); c.fillStyle = '#1d3557'; c.beginPath(); c.arc(7, -5, 13, 0, TAU); c.fill(); },
  music(c) { c.fillStyle = '#c77dff'; c.beginPath(); c.ellipse(-8, 10, 7, 5, -0.4, 0, TAU); c.ellipse(10, 6, 7, 5, -0.4, 0, TAU); c.fill(); c.fillRect(-3, -16, 4, 26); c.fillRect(15, -20, 4, 26); c.fillRect(-3, -18, 22, 6); },
  sound(c) { c.fillStyle = '#4cc9f0'; c.beginPath(); c.moveTo(-16, -6); c.lineTo(-8, -6); c.lineTo(2, -15); c.lineTo(2, 15); c.lineTo(-8, 6); c.lineTo(-16, 6); c.fill(); c.strokeStyle = '#4cc9f0'; c.lineWidth = 3; c.beginPath(); c.arc(4, 0, 9, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(4, 0, 15, -0.9, 0.9); c.stroke(); },
  kids(c) { for (const [x, col] of [[-10, '#ff6b9a'], [10, '#4cc9f0'], [0, '#ffd166']]) { c.fillStyle = col; c.beginPath(); c.arc(x, x ? 4 : -4, 10, 0, TAU); c.fill(); } },
};

function hudButton(ctx, x, y, w, h, label, glyph, onTap, opts = {}) {
  addButton({ x, y, w, h, onTap, label, silent: opts.silent });
  ctx.fillStyle = opts.on ? 'rgba(255,209,102,0.92)' : 'rgba(255,255,255,0.82)';
  rr(ctx, x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(0,30,50,0.3)'; ctx.lineWidth = 3; ctx.stroke();
  const cx = x + w / 2, cy = y + h / 2 - 6;
  if (opts.draw) opts.draw(cx, cy);
  else if (!drawArt(ctx, `ui/hud_${glyph}.png`, cx - 22, cy - 22, 44, 44)) { ctx.save(); ctx.translate(cx, cy); GLYPH[glyph](ctx); ctx.restore(); }
  if (opts.off) { ctx.strokeStyle = '#e63946'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx - 18, cy + 16); ctx.lineTo(cx + 18, cy - 16); ctx.stroke(); }
  text(ctx, opts.caption || '', cx, y + h - 11, 12, '#123', 'center', 'bold');
}

function kidFace(ctx, slotIndex, color, x, y, r) {
  if (drawArt(ctx, `ui/kid_face_${slotIndex + 1}.png`, x - r, y - r, r * 2, r * 2)) return;
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#ffd7b5'; ctx.beginPath(); ctx.arc(x, y + 3, r * 0.6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(x - 6, y, 2.5, 0, TAU); ctx.arc(x + 6, y, 2.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y + 5, 6, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
}

function hud(ctx) {
  const slot = G.slot, st = slot.settings, charm = charmOf(slot);
  ctx.fillStyle = 'rgba(0,40,70,0.35)'; rr(ctx, 8, 8, W - 16, 156, 20); ctx.fill();
  kidFace(ctx, G.data.activeSlot, slot.color, 46, 46, 28);
  text(ctx, slot.name, 86, 32, 22, '#fff', 'left');
  const coin = drawArt(ctx, 'fx/coin.png', 86, 48, 28, 28) ? 34 : 0;
  text(ctx, money(slot.cash), 86 + coin, 62, 26, '#ffe066', 'left');
  hudButton(ctx, W - 92, 16, 76, 60, 'KIDS', 'kids', () => { sfx.open(); G.go('back'); }, { caption: 'Kids', silent: true });
  const row = [
    ['SHOP', 'shop', () => { sfx.open(); G.go('shop'); }, { caption: 'Shop', silent: true }],
    ['FISH BOOK', 'book', () => { sfx.open(); G.go('dex'); }, { caption: 'Book', silent: true }],
    ['CHARM', 'charm', () => { sfx.open(); dock.panel = 'charm'; }, { caption: 'Charm', on: !!charm, silent: true,
      draw: (cx, cy) => (charm ? drawItemIcon(ctx, charm, cx, cy) : (ctx.strokeStyle = '#8d99ae', ctx.lineWidth = 3, ctx.beginPath(), ctx.arc(cx, cy, 14, 0, TAU), ctx.stroke())) }],
    ['DAYNIGHT', st.night ? 'night' : 'day', () => { st.night = !st.night; sfx.sparkle(); G.persist(); }, { caption: st.night ? 'Night' : 'Day', silent: true }],
    ['MUSIC', 'music', () => { st.musicMuted = !st.musicMuted; G.persist(); }, { caption: 'Music', off: st.musicMuted }],
    ['SOUND', 'sound', () => { st.muted = !st.muted; G.persist(); }, { caption: 'Sound', off: st.muted }],
  ];
  const bw = 80, gap = (W - 32 - row.length * bw) / (row.length - 1);
  row.forEach(([label, glyph, tap, opts], i) => hudButton(ctx, 16 + i * (bw + gap), 88, bw, 68, label, glyph, tap, opts));
}

// ---- zone buoys ----
function buoys(ctx, t) {
  const slot = G.slot, y0 = 430;
  ZONES.forEach((z, i) => {
    const x = 67.5 + i * 135, open = zoneUnlocked(slot, z), on = slot.zone === z.id, bob = Math.sin(t * 2 + i) * 4;
    addButton({ x: x - 60, y: y0 - 70, w: 120, h: 150, label: 'zone' + z.id, onTap: () => {
      if (!open) { dock.msg = lockReason(slot, z); dock.msgT = 2.5; sfx.error(); return; }
      slot.zone = z.id; sfx.zoneSelect(); G.persist();
    }, silent: true });
    ctx.save(); ctx.translate(x, y0 + bob);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(0, 90); ctx.stroke();
    if (on) { ctx.fillStyle = 'rgba(255,230,102,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 52, 0, TAU); ctx.fill(); }
    if (!drawArt(ctx, `ui/buoy_${z.key}.png`, -40, -48, 80, 96)) {
      ctx.fillStyle = open ? ['#ff5a5f', '#7b8cde', '#4cc9f0', '#9d4edd'][i] : '#8d99ae';
      ctx.beginPath(); ctx.ellipse(0, 0, 32, 36, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-32, -8, 64, 14);
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(0, -42, 7, 0, TAU); ctx.fill();
    } else if (!open) { ctx.globalAlpha = 0.5; }
    ctx.globalAlpha = 1;
    if (!open) { // padlock
      ctx.fillStyle = '#343a40'; rr(ctx, -13, -2, 26, 22, 5); ctx.fill();
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -2, 9, Math.PI, 0); ctx.stroke();
    } else text(ctx, String(z.id), 0, 0, 26, '#fff');
    ctx.restore();
    text(ctx, z.name.replace('The ', ''), x, y0 + 64, 16, open ? '#fff' : '#9fb7c9');
  });
  const z = ZONES[slot.zone - 1];
  const info = dock.msgT > 0 ? dock.msg
    : Number.isFinite(z.maxDepth) ? `${z.name} · ${z.maxDepth} m deep · best ${slot.bestDepth[z.id] || 0} m` : `${z.name} · endless! · best ${slot.bestDepth[4] || 0} m`;
  text(ctx, info, W / 2, 572, 20, dock.msgT > 0 ? '#ffd6a5' : '#e0f2ff');
}

// ---- charm picker panel ----
function charmPanel(ctx) {
  const slot = G.slot;
  addButton({ x: 0, y: 0, w: W, h: H, label: 'PANEL_BG', onTap: () => { dock.panel = null; sfx.close(); }, silent: true });
  ctx.fillStyle = 'rgba(0,20,40,0.6)'; ctx.fillRect(0, 0, W, H);
  const x = 24, y = 150, w = W - 48, rows = [null, ...CHARMS], h = 110 + rows.length * 92;
  addButton({ x, y, w, h, label: 'PANEL', onTap: () => {}, silent: true });
  ctx.fillStyle = '#e0f4ff'; rr(ctx, x, y, w, h, 24); ctx.fill();
  ctx.strokeStyle = '#1b4965'; ctx.lineWidth = 5; ctx.stroke();
  text(ctx, 'Hook Charm', W / 2, y + 44, 34, '#ffd166');
  addButton({ x: x + w - 74, y: y + 10, w: 64, h: 64, label: 'CLOSE', onTap: () => { dock.panel = null; sfx.close(); }, silent: true });
  text(ctx, '✕', x + w - 42, y + 42, 34, '#fff');
  rows.forEach((it, i) => {
    const ry = y + 90 + i * 92, mine = !it || owns(slot, it.id), on = it ? slot.equip.charm === it.id : !slot.equip.charm;
    ctx.fillStyle = on ? 'rgba(255,209,102,0.45)' : 'rgba(27,73,101,0.12)'; rr(ctx, x + 14, ry, w - 28, 82, 14); ctx.fill();
    if (it) drawItemIcon(ctx, it, x + 58, ry + 41);
    else { ctx.strokeStyle = '#8d99ae'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x + 58, ry + 41, 16, 0, TAU); ctx.moveTo(x + 47, ry + 52); ctx.lineTo(x + 69, ry + 30); ctx.stroke(); }
    text(ctx, it ? it.name : 'No charm', x + 96, ry + 28, 22, mine ? '#123' : '#6c757d', 'left');
    text(ctx, it ? (mine ? it.desc : `In the shop · $${it.price.toLocaleString()}`) : 'Just a plain hook', x + 96, ry + 58, 15, '#335', 'left', '600');
    if (!mine) return;
    const bx = x + w - 158, label = on ? 'EQUIPPED' : 'EQUIP';
    addButton({ x: bx, y: ry + 14, w: 136, h: 54, label: it ? 'charm:' + it.id : 'charm:none', onTap: () => {
      if (!it) slot.equip.charm = null; else if (!on) equip(slot, it);
      sfx.equip(); G.persist();
    }, silent: true });
    ctx.fillStyle = on ? '#ffd166' : '#bde0fe'; rr(ctx, bx, ry + 14, 136, 54, 16); ctx.fill();
    text(ctx, label, bx + 68, ry + 41, 18, '#4a2c00');
  });
}

G.scenes.dock = {
  steers: false,
  enter() { refreshUnlocks(G.slot); grantGifts(G.slot); G.persist(); dock.panel = null; dock.casting = 0; dock.msgT = 0; },
  update(dt) {
    dock.msgT = Math.max(0, dock.msgT - dt);
    if (dock.casting > 0 && (dock.casting -= dt) <= 0) castFromDock();
  },
  render(ctx, t) {
    const slot = G.slot, zone = ZONES[slot.zone - 1], open = zoneUnlocked(slot, zone);
    const tryCast = () => {
      if (dock.panel || dock.casting > 0) return;
      if (!open) { dock.msg = lockReason(slot, zone); dock.msgT = 2.5; sfx.error(); return; }
      dock.casting = DOCK.CAST_DELAY; sfx.cast();
    };
    // cast targets first (lowest priority): the water surface band, then the boat + fisher
    addButton({ x: 0, y: DOCK.WATER - 40, w: W, h: 100, label: 'CAST', onTap: tryCast, silent: true });
    addButton({ x: DOCK.BOAT_X - 120, y: 170, w: 240, h: DOCK.WATER + 30 - 170, label: 'CAST', onTap: tryCast, silent: true });
    drawScene(ctx, t, slot.settings.night, zone, dock.casting > 0 ? 'cast' : 'idle');
    if (!slot.flags.hasCast && !dock.casting) {   // pulsing hint bubble until the first cast
      const k = 1 + Math.sin(t * 5) * 0.06, bx = DOCK.BOAT_X - 150, by = 178;
      ctx.save(); ctx.translate(bx + 70, by + 22); ctx.scale(k, k); ctx.translate(-(bx + 70), -(by + 22));
      ctx.fillStyle = '#fff'; rr(ctx, bx, by, 140, 44, 20); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + 100, by + 42); ctx.lineTo(bx + 116, by + 62); ctx.lineTo(bx + 120, by + 40); ctx.fill();
      text(ctx, 'tap to cast!', bx + 70, by + 22, 20, '#1b4965');
      ctx.restore();
    }
    buoys(ctx, t);
    hud(ctx);
    if (dock.panel === 'charm') charmPanel(ctx);
  },
};
export const dockState = dock;

// ---- title: the same scene + the logo slot ----
G.scenes.title = {
  steers: false,
  pointerDown() { sfx.start(); G.go('tap'); return true; },
  render(ctx, t) {
    drawScene(ctx, t, false, ZONES[0]);
    if (!drawArt(ctx, 'ui/logo.png', 30, 20, W - 60, (W - 60) / 2)) {
      ctx.save(); ctx.translate(W / 2, 110); ctx.rotate(Math.sin(t * 1.5) * 0.02);
      text(ctx, 'WEIRD', 0, -36, 92, '#ffd166');
      text(ctx, 'FISHING', 0, 54, 92, '#ff8fa3');
      ctx.restore();
    }
    if (Math.sin(t * 4) > -0.4) text(ctx, 'TAP TO PLAY', W / 2, 760, 40, '#fff');
  },
};
