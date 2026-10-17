// The dock is the boat scene (GAME_SPEC §10.F): a tap anywhere on the scene casts (v1.1.1), except on
// the HUD bar and the zone buoys, which keep their own actions.
// A HUD bar overlays the sky; buoys under the boat pick the zone; the title screen reuses the scene.
import { CONFIG } from './config.js';
import { G } from './game.js';
import { addButton, inPanel, PANEL_W } from './ui.js';
import { text, rr, drawBoat, lerpRgb } from './draw.js';
import { art, drawArt, fadedArt } from './art.js';
import { wearDrawer, drawItemIcon } from './icons.js';
import { drawFish } from './fishart.js';
import { startRun } from './play.js';
import { ZONES } from './data/zones.js';
import { SPECIES } from './data/fish.js';
import { CHARMS, ITEM } from './data/shop.js';
import { zoneUnlocked, lockReason, refreshUnlocks, gearOf, grantGifts, owns, equip, charmOf } from './economy.js';
import { hasBuddy } from './play.js';
import { sfx } from './audio.js';

const { H } = CONFIG; // W is live (v1.4.2): always CONFIG.W
// v1.2: WATER 330 -> 394 (boat + fisher 64 px lower, clear of the bigger HUD); BUOY_Y follows.
// v1.4: WATER 394 -> 540: the boat + fisher sit at mid-screen. The nine buoys sit in two rows under the boat
// (5 + 4, BUOY_Y / BUOY_Y2), each tap target BUOY_W × BUOY_H; the zone-info line sits at INFO_Y.
// v1.4.2: the boat stays centred and the buoys spread across the live width (BUOY_STEP = W / 5: 108 at 540).
export const DOCK = { WATER: 540, get BOAT_X() { return CONFIG.W / 2; }, BOAT_SCALE: 1.35, CAST_DELAY: 0.4, HUD_H: 196,
  BUOY_Y: 668, BUOY_Y2: 790, get BUOY_STEP() { return CONFIG.W / 5; }, BUOY_W: 104, BUOY_H: 116, BUOY_ART: [56, 67], INFO_Y: 896 };
// dock_bg art (v1.2, waves baked in): the row of each image where the boat's waterline sits, and how far
// right the cover-crop leans (keeps the sun / moon in view). The image is scaled so that row lands on WATER, and
// its bottom `blend` px fade into the zone sea.
// v1.4 recalibration (WATER 540, measured on the shipped WebPs): day foam band = rows 0.78-0.87 → water 0.85 (as
// before); night foam band under the horizon = rows 0.73-0.77 → water 0.765 (was 0.82, which left the boat floating
// ~25 px under the waves), plus a longer 90 px blend so the night image's second foam band (rows 0.94-1.0) fades out.
export const DOCK_BG = { day: { file: 'dock/dock_bg.png', water: 0.85, blend: 40 }, night: { file: 'dock/dock_bg_night.png', water: 0.765, blend: 90 }, ANCHOR_X: 0.75 };
const money = (n) => '$' + Math.round(n).toLocaleString();
const zoneOf = (slot) => ZONES.find((z) => z.id === slot.zone) || ZONES[0];
const dock = { panel: null, casting: 0, msg: '', msgT: 0 };

export function castFromDock() {
  const slot = G.slot, zone = zoneOf(slot);
  slot.flags.hasCast = true;
  startRun({ zone, ...gearOf(slot, zone.id), cond: { night: slot.settings.night, hat: slot.equip.hat, suit: slot.equip.outfit, post: slot.flags.bossBeaten, bosses: slot.flags.bosses || [] } });
  G.go('cast');
}

// ---- the scene: the zone's underwater art, dock_bg (sky, island, baked foam waves) over its top, boat ----
function drawScene(ctx, t, night, zone, pose = 'idle') {
  const wy = DOCK.WATER, bg = night ? DOCK_BG.night : DOCK_BG.day, bgIm = art(bg.file);
  // dock_bg is scaled so its waterline row lands on WATER; its bottom BLEND px fade into the zone sea below
  // v1.4.2 cover: if the scaled image is narrower than the live width, scale it up and crop its top (waterline stays on WATER)
  let bh = DOCK.WATER / bg.water, bw = bgIm ? (bh * bgIm.naturalWidth) / bgIm.naturalHeight : 0, by = 0;
  if (bgIm && bw < CONFIG.W) { const k = CONFIG.W / bw; bw = CONFIG.W; bh *= k; by = DOCK.WATER - bh * bg.water; }
  const sy = bgIm ? by + bh - bg.blend : wy;
  const [top, bottom] = [zone.sea[0], lerpRgb(zone.sea[0], zone.sea[1], 0.8)].map((c) => (night ? c.map((v) => v * 0.5) : c));
  const seaImg = art(zone.bg);
  if (seaImg) {
    ctx.drawImage(seaImg, 0, sy, CONFIG.W, (CONFIG.W * seaImg.naturalHeight) / seaImg.naturalWidth);
    if (night) { ctx.fillStyle = 'rgba(5,15,45,0.5)'; ctx.fillRect(0, sy, CONFIG.W, H - sy); }
  } else {
    const sea = ctx.createLinearGradient(0, sy, 0, H);
    sea.addColorStop(0, `rgb(${top})`); sea.addColorStop(1, `rgb(${bottom})`);
    ctx.fillStyle = sea; ctx.fillRect(0, sy, CONFIG.W, H - sy);
  }
  if (bgIm) {
    ctx.drawImage(fadedArt(bg.file, bg.blend / bh), -(bw - CONFIG.W) * DOCK_BG.ANCHOR_X, by, bw, bh);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, wy);
    g.addColorStop(0, night ? '#0b1d3a' : '#5ec4f5'); g.addColorStop(1, night ? '#2d4a86' : '#d8f3ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CONFIG.W, wy);
    if (night) {
      ctx.fillStyle = '#fff'; for (let i = 0; i < 24; i++) { const x = (i * 137) % CONFIG.W, y = 20 + ((i * 89) % (wy - 80)); ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + i); ctx.fillRect(x, y, 2, 2); }
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(CONFIG.W - 95, 260, 30, 0, Math.PI * 2); ctx.fill();
    } else { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(CONFIG.W - 95, 260, 36, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = night ? 'rgba(200,210,255,0.25)' : 'rgba(255,255,255,0.9)';
    for (const [x, y, s] of [[80, 290, 1], [330, 320, 0.8], [560, 380, 1.1]]) {
      const cx = ((x + t * 10 * s) % (CONFIG.W + 160)) - 80;
      ctx.beginPath(); ctx.arc(cx, y, 24 * s, 0, Math.PI * 2); ctx.arc(cx + 26 * s, y + 6, 18 * s, 0, Math.PI * 2); ctx.arc(cx - 24 * s, y + 7, 16 * s, 0, Math.PI * 2); ctx.fill();
    }
  }
  // (v1.2.1: the old code-drawn "sparkle streaks" — six 3px full-height bars from the
  // pre-art era — read as printed vertical stripes over the painted sea art. Removed;
  // the art already has light rays painted in.)
  // idle fish from this zone (behind the buoys)
  const pool = SPECIES.filter((s) => s.zone === zone.id && s.rarity !== 'boss' && !s.cond.length);
  [DOCK.BUOY_Y + 66, DOCK.INFO_Y - 44, DOCK.INFO_Y + 40].forEach((y, i) => { // in the gaps between buoy rows
    const sp = pool[(i * 5) % pool.length], dir = i % 2 ? -1 : 1, span = CONFIG.W + 120;
    const x = ((((t * (22 + i * 7) * dir + i * 170) % span) + span) % span) - 60;
    drawFish(ctx, sp, x, y + Math.sin(t + i) * 4, Math.min(sp.r, 18), dir, t);
  });
  ctx.save(); ctx.translate(DOCK.BOAT_X, wy + 4); ctx.scale(DOCK.BOAT_SCALE, DOCK.BOAT_SCALE); // big target for small fingers
  drawBoat(ctx, 0, 0, t, G.slot.color, wearDrawer(G.slot.equip),
    hasBuddy(G.slot) ? (c) => drawFish(c, SPECIES[46], -44, -40, 16, -1, t) : null, pose);
  ctx.restore();
  if (!bgIm) { // code-drawn surface line only without dock_bg art (v1.2: the art has its waves baked in)
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4; ctx.beginPath();
    for (let x = 0; x <= CONFIG.W; x += 10) ctx.lineTo(x, wy + 6 + Math.sin(x * 0.045 + t * 2) * 4);
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
  const cx = x + w / 2, cy = y + h / 2 - 8, k = HUD.ICON / 44;   // v1.2: icons 44 -> 54 px, captions 12 -> 15 px
  if (opts.draw) { ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); opts.draw(0, 0); ctx.restore(); }
  else if (!drawArt(ctx, `ui/hud_${glyph}.png`, cx - HUD.ICON / 2, cy - HUD.ICON / 2, HUD.ICON, HUD.ICON)) { ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); GLYPH[glyph](ctx); ctx.restore(); }
  if (opts.off) { ctx.strokeStyle = '#e63946'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - 22, cy + 20); ctx.lineTo(cx + 22, cy - 20); ctx.stroke(); }
  text(ctx, opts.caption || '', cx, y + h - 13, 15, '#123', 'center', 'bold');
}

function kidFace(ctx, slotIndex, color, x, y, r) {
  if (drawArt(ctx, `ui/kid_face_${slotIndex + 1}.png`, x - r, y - r, r * 2, r * 2)) return;
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#ffd7b5'; ctx.beginPath(); ctx.arc(x, y + 3, r * 0.6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(x - 6, y, 2.5, 0, TAU); ctx.arc(x + 6, y, 2.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y + 5, 6, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
}

// v1.2: the bar is ~1.25x bigger (owner: too small for the kids). Every button is >= 64 px.
export const HUD = { BAR: 196, ICON: 54, KIDS: [96, 76], ROW_Y: 106, ROW_H: 88, ROW_W: 80 };
function hud(ctx) {
  const slot = G.slot, st = slot.settings, charm = charmOf(slot);
  addButton({ x: 8, y: 8, w: CONFIG.W - 16, h: HUD.BAR, label: 'HUD', onTap: () => {}, silent: true }); // gaps in the bar never cast
  ctx.fillStyle = 'rgba(0,40,70,0.35)'; rr(ctx, 8, 8, CONFIG.W - 16, HUD.BAR, 22); ctx.fill();
  kidFace(ctx, G.data.activeSlot, slot.color, 52, 54, 35);
  text(ctx, slot.name, 100, 36, 28, '#fff', 'left');
  const coin = drawArt(ctx, 'fx/coin.png', 100, 56, 36, 36) ? 42 : 0;
  text(ctx, money(slot.cash), 100 + coin, 75, 32, '#ffe066', 'left');
  const [kw, kh] = HUD.KIDS;
  hudButton(ctx, CONFIG.W - 16 - kw, 16, kw, kh, 'KIDS', 'kids', () => { sfx.open(); G.go('back'); }, { caption: 'Kids', silent: true });
  const row = [
    ['SHOP', 'shop', () => { sfx.open(); G.go('shop'); }, { caption: 'Shop', silent: true }],
    ['FISH BOOK', 'book', () => { sfx.open(); G.go('dex'); }, { caption: 'Book', silent: true }],
    ['CHARM', 'charm', () => { sfx.open(); dock.panel = 'charm'; }, { caption: 'Charm', on: !!charm, silent: true,
      draw: (cx, cy) => (charm ? drawItemIcon(ctx, charm, cx, cy) : (ctx.strokeStyle = '#8d99ae', ctx.lineWidth = 3, ctx.beginPath(), ctx.arc(cx, cy, 14, 0, TAU), ctx.stroke())) }],
    ['DAYNIGHT', st.night ? 'night' : 'day', () => { st.night = !st.night; sfx.sparkle(); G.persist(); }, { caption: st.night ? 'Night' : 'Day', silent: true }],
    ['MUSIC', 'music', () => { st.musicMuted = !st.musicMuted; G.persist(); }, { caption: 'Music', off: st.musicMuted }],
    ['SOUND', 'sound', () => { st.muted = !st.muted; G.persist(); }, { caption: 'Sound', off: st.muted }],
  ];
  const bw = HUD.ROW_W, gap = (CONFIG.W - 32 - row.length * bw) / (row.length - 1);
  row.forEach(([label, glyph, tap, opts], i) => hudButton(ctx, 16 + i * (bw + gap), HUD.ROW_Y, bw, HUD.ROW_H, label, glyph, tap, opts));
}

// ---- zone buoys (v1.4: nine, in two rows of 5 + 4, no scrolling) ----
const BUOY_COLORS = ['#ff5a5f', '#7b8cde', '#4cc9f0', '#2ec4b6', '#e9c46a', '#f3722c', '#5e60ce', '#c1121f', '#9d4edd'];
export function buoySpot(i) {
  const row = i < 5 ? 0 : 1, n = row ? ZONES.length - 5 : 5, k = row ? i - 5 : i;
  return { x: CONFIG.W / 2 + (k - (n - 1) / 2) * DOCK.BUOY_STEP, y: row ? DOCK.BUOY_Y2 : DOCK.BUOY_Y };
}
function buoys(ctx, t) {
  const slot = G.slot, [aw, ah] = DOCK.BUOY_ART;
  ZONES.forEach((z, i) => {
    const { x, y: y0 } = buoySpot(i), open = zoneUnlocked(slot, z), on = slot.zone === z.id, bob = Math.sin(t * 2 + i) * 3;
    addButton({ x: x - DOCK.BUOY_W / 2, y: y0 - 52, w: DOCK.BUOY_W, h: DOCK.BUOY_H, label: 'zone' + z.id, onTap: () => {
      if (!open) { dock.msg = lockReason(slot, z); dock.msgT = 2.5; sfx.error(); return; }
      slot.zone = z.id; sfx.zoneSelect(); G.persist();
    }, silent: true });
    ctx.save(); ctx.translate(x, y0 + bob);
    if (on) { // v1.2.2: softer selected-zone marker (the old 0.35 yellow disc read as a yellow blob on the calm water)
      ctx.fillStyle = 'rgba(255,244,180,0.20)'; ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,209,102,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.stroke();
    }
    if (!open) ctx.globalAlpha = 0.5;
    if (!drawArt(ctx, `ui/buoy_${z.key}.png`, -aw / 2, -ah / 2 - 4, aw, ah)) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = open ? BUOY_COLORS[i % BUOY_COLORS.length] : '#8d99ae';
      ctx.beginPath(); ctx.ellipse(0, 0, 24, 27, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-24, -6, 48, 11);
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(0, -32, 5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!open) { // padlock
      ctx.fillStyle = '#343a40'; rr(ctx, -11, -2, 22, 19, 5); ctx.fill();
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -2, 7.5, Math.PI, 0); ctx.stroke();
    } else text(ctx, String(z.id), 0, 0, 22, '#fff');
    ctx.restore();
    text(ctx, z.short, x, y0 + 48, 16, open ? '#fff' : '#9fb7c9');
  });
  const z = ZONES.find((q) => q.id === slot.zone) || ZONES[0];
  const info = dock.msgT > 0 ? dock.msg
    : Number.isFinite(z.maxDepth) ? `${z.name} · ${z.maxDepth.toLocaleString('en-US')} m deep · best ${(slot.bestDepth[z.id] || 0).toLocaleString('en-US')} m`
      : `${z.name} · endless! · best ${(slot.bestDepth[z.id] || 0).toLocaleString('en-US')} m`;
  text(ctx, info, CONFIG.W / 2, DOCK.INFO_Y, 20, dock.msgT > 0 ? '#ffd6a5' : '#e0f2ff');
}

// ---- charm picker panel ----
function charmPanel(ctx) {
  const slot = G.slot;
  addButton({ x: 0, y: 0, w: CONFIG.W, h: H, label: 'PANEL_BG', onTap: () => { dock.panel = null; sfx.close(); }, silent: true });
  ctx.fillStyle = 'rgba(0,20,40,0.6)'; ctx.fillRect(0, 0, CONFIG.W, H);
  inPanel(ctx, () => charmRows(ctx, slot));
}
function charmRows(ctx, slot) {
  const W = PANEL_W, x = 24, y = 150, w = W - 48, rows = [null, ...CHARMS], h = 110 + rows.length * 92;
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
    const slot = G.slot, zone = zoneOf(slot), open = zoneUnlocked(slot, zone);
    const tryCast = () => {
      if (dock.panel || dock.casting > 0) return;
      if (!open) { dock.msg = lockReason(slot, zone); dock.msgT = 2.5; sfx.error(); return; }
      dock.casting = DOCK.CAST_DELAY; sfx.cast();
    };
    // cast targets first (lowest priority): the whole scene, then the boat + fisher; buoys + HUD go on top
    addButton({ x: 0, y: 0, w: CONFIG.W, h: H, label: 'CAST_ANY', onTap: tryCast, silent: true });
    addButton({ x: DOCK.BOAT_X - 150, y: DOCK.HUD_H + 38, w: 300, h: DOCK.WATER + 60 - (DOCK.HUD_H + 38), label: 'CAST', onTap: tryCast, silent: true });
    drawScene(ctx, t, slot.settings.night, zone, dock.casting > 0 ? 'cast' : 'idle');
    if (!slot.flags.hasCast && !dock.casting) {   // pulsing hint bubble until the first cast
      const k = 1 + Math.sin(t * 5) * 0.06, bx = DOCK.BOAT_X - 210, by = DOCK.WATER - 290;
      ctx.save(); ctx.translate(bx + 70, by + 22); ctx.scale(k, k); ctx.translate(-(bx + 70), -(by + 22));
      ctx.fillStyle = '#fff'; rr(ctx, bx, by, 140, 44, 20); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + 100, by + 42); ctx.lineTo(bx + 126, by + 62); ctx.lineTo(bx + 120, by + 40); ctx.fill();
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
    if (!drawArt(ctx, 'ui/logo.png', CONFIG.W / 2 - 240, 20, 480, 240)) {
      ctx.save(); ctx.translate(CONFIG.W / 2, 110); ctx.rotate(Math.sin(t * 1.5) * 0.02);
      text(ctx, 'WEIRD', 0, -36, 92, '#ffd166');
      text(ctx, 'FISHING', 0, 54, 92, '#ff8fa3');
      ctx.restore();
    }
    if (Math.sin(t * 4) > -0.4) text(ctx, 'TAP TO PLAY', CONFIG.W / 2, 790, 40, '#fff');
  },
};
