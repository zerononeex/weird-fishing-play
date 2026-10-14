// Code-drawn shop icons and wearables. All original vector shapes; art slots override when present.
import { drawArt } from './art.js';
const TAU = Math.PI * 2;

function circ(c, x, y, r, f) { c.fillStyle = f; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function box(c, x, y, w, h, f) { c.fillStyle = f; c.fillRect(x, y, w, h); }

// Hats are drawn relative to the fisher's head centre (0, 0), head radius 16.
export const HATS = {
  fancap(c) { c.fillStyle = '#ff6b9a'; c.beginPath(); c.arc(0, -8, 16, Math.PI, 0); c.fill(); box(c, 0, -10, 24, 5, '#ff6b9a'); circ(c, 0, -24, 3, '#ffd166'); },
  captain(c) { box(c, -17, -16, 34, 10, '#1d3557'); box(c, -14, -26, 28, 12, '#f1faee'); box(c, -17, -9, 34, 4, '#111'); circ(c, 0, -20, 4, '#ffd166'); },
  safari(c) { c.fillStyle = '#d4a373'; c.beginPath(); c.ellipse(0, -10, 26, 6, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(0, -12, 14, Math.PI, 0); c.fill(); box(c, -14, -14, 28, 3, '#7f5539'); },
  paperhat(c) { c.fillStyle = '#f8f9fa'; c.beginPath(); c.moveTo(-22, -10); c.lineTo(0, -38); c.lineTo(22, -10); c.closePath(); c.fill(); c.strokeStyle = '#adb5bd'; c.lineWidth = 1.5; c.stroke(); },
  pirate(c) { c.fillStyle = '#111'; c.beginPath(); c.moveTo(-26, -10); c.quadraticCurveTo(0, -42, 26, -10); c.closePath(); c.fill(); circ(c, 0, -20, 4, '#fff'); },
  frost(c) { c.fillStyle = '#4cc9f0'; c.beginPath(); c.arc(0, -8, 17, Math.PI, 0); c.fill(); box(c, -17, -10, 34, 6, '#f1faee'); circ(c, 0, -28, 6, '#f1faee'); },
  suncrown(c) {
    c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(-16, -10); c.lineTo(-16, -24); c.lineTo(-8, -16); c.lineTo(0, -30); c.lineTo(8, -16); c.lineTo(16, -24); c.lineTo(16, -10); c.closePath(); c.fill();
    circ(c, 0, -18, 3, '#ef476f');
  },
};

// Outfits are drawn over the fisher's body (rect -16..16 x, -62..-22 y, relative to boat origin).
export const OUTFITS = {
  vest(c) { box(c, -16, -60, 10, 36, '#6a4c93'); box(c, 6, -60, 10, 36, '#6a4c93'); circ(c, 0, -48, 2, '#ffd166'); circ(c, 0, -38, 2, '#ffd166'); },
  robe(c) { c.fillStyle = '#3a0ca3'; c.beginPath(); c.moveTo(-18, -62); c.lineTo(18, -62); c.lineTo(22, -20); c.lineTo(-22, -20); c.closePath(); c.fill(); star(c, -6, -44, 5, '#ffd166'); star(c, 7, -32, 4, '#ffd166'); },
  pajamas(c) { box(c, -16, -62, 32, 40, '#ffc8dd'); c.fillStyle = '#ff8fab'; for (let y = -58; y < -24; y += 9) c.fillRect(-16, y, 32, 3); box(c, -18, -64, 36, 6, '#ffd166'); },
};

function star(c, x, y, r, f) {
  c.fillStyle = f; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  c.closePath(); c.fill();
}

// Where hats/outfits sit on the fisher. CODE = the code-drawn fisher; ART = the Act 2 sprite (tuned on import).
export const ANCHOR = {
  CODE: { head: [0, -78], hatScale: 1, body: [0, 0], bodyScale: 1 },
  // box/boat: where the 480×320 fisher sprite and the 400×200 hull sprite are drawn (logical px, boat origin)
  ART: { box: [-120, -170, 240, 160], boat: [-100, -62, 200, 100], head: [-14, -82], hatScale: 2, body: [-4, 31], bodyScale: 1.3 },
};

// Draws hat + outfit for drawBoat's wear callback.
export function wearDrawer(equip) {
  return (c, a = ANCHOR.CODE) => {
    if (equip.outfit && OUTFITS[equip.outfit]) {
      c.save(); c.translate(...a.body); c.scale(a.bodyScale, a.bodyScale); OUTFITS[equip.outfit](c); c.restore();
    }
    if (equip.hat && HATS[equip.hat]) { c.save(); c.translate(...a.head); c.scale(a.hatScale, a.hatScale); HATS[equip.hat](c); c.restore(); }
  };
}

function gun(c, len, h, col) {
  box(c, -len / 2, -h / 2, len, h, col); box(c, -len / 2, h / 2 - 2, 8, 14, '#5c4033'); box(c, -len / 2 + 10, h / 2 - 2, 4, 6, '#333');
}

const ICONS = {
  lines(c, it) {
    circ(c, 0, 0, 20, '#8d99ae'); circ(c, 0, 0, 14, '#edf2f4'); circ(c, 0, 0, 5, '#8d99ae');
    c.strokeStyle = '#2b2d42'; c.lineWidth = 2; c.beginPath(); c.moveTo(14, 0); c.lineTo(24, 18); c.stroke();
    if (it.line === Infinity) { c.strokeStyle = '#ef476f'; c.lineWidth = 3; c.beginPath(); c.ellipse(-5, 0, 5, 3.5, 0, 0, TAU); c.ellipse(5, 0, 5, 3.5, 0, 0, TAU); c.stroke(); }
  },
  guns(c, it) {
    const k = Math.min(1, Math.log10(it.price + 10) / 4.7);
    gun(c, 22 + k * 22, 7 + k * 6, it.id.includes('beam') ? '#4cc9f0' : '#495057');
    if (it.id.startsWith('twin')) { c.translate(4, 10); gun(c, 22 + k * 22, 7 + k * 6, '#6c757d'); }
  },
  chainsaw(c) { box(c, -20, -6, 22, 12, '#ff9f1c'); c.strokeStyle = '#adb5bd'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(2, 0); c.lineTo(22, 0); c.stroke(); },
  fuel1(c) { box(c, -12, -14, 24, 30, '#e63946'); box(c, -4, -20, 8, 6, '#333'); },
  fuel2(c) { box(c, -16, -18, 32, 36, '#e63946'); box(c, -5, -24, 10, 6, '#333'); box(c, -10, -6, 20, 4, '#fff'); },
  turbo(c) { ICONS.chainsaw(c); c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(-6, -20); c.lineTo(2, -8); c.lineTo(-4, -8); c.lineTo(4, 4); c.lineTo(-10, -10); c.lineTo(-4, -10); c.fill(); },
  float(c) { ICONS.chainsaw(c); circ(c, -8, -16, 6, '#bde0fe'); circ(c, 4, -18, 4, '#bde0fe'); },
  gizmo(c) { box(c, -14, -18, 28, 36, '#d00000'); c.fillStyle = '#fff'; c.fillRect(-3, -10, 6, 20); c.fillRect(-10, -3, 20, 6); },
  charm_toaster(c) { box(c, -18, -12, 36, 26, '#adb5bd'); box(c, -10, -18, 6, 8, '#f4a261'); box(c, 4, -18, 6, 8, '#f4a261'); bolt(c); },
  charm_hairdryer(c) { box(c, -18, -12, 26, 16, '#ff70a6'); box(c, -8, 2, 8, 16, '#ff70a6'); box(c, 8, -10, 8, 12, '#555'); bolt(c); },
  charm_storm(c) { c.strokeStyle = '#b08968'; c.lineWidth = 4; c.beginPath(); for (let y = 16; y > -12; y -= 6) c.ellipse(0, y, 10, 3, 0, 0, Math.PI); c.stroke(); circ(c, 0, -16, 7, '#4cc9f0'); },
  charm_magnet(c) {
    c.strokeStyle = '#e63946'; c.lineWidth = 9; c.beginPath(); c.arc(0, -2, 13, Math.PI, 0); c.stroke();
    box(c, -17.5, -2, 9, 14, '#e63946'); box(c, 8.5, -2, 9, 14, '#e63946'); box(c, -17.5, 8, 9, 6, '#dee2e6'); box(c, 8.5, 8, 9, 6, '#dee2e6');
  },
  charm_lucky(c) {
    for (const [x, y] of [[0, -10], [10, 0], [0, 10], [-10, 0]]) circ(c, x, y, 9, '#2dc653');
    c.strokeStyle = '#1a7431'; c.lineWidth = 3; c.beginPath(); c.moveTo(2, 4); c.quadraticCurveTo(8, 14, 6, 22); c.stroke(); bolt(c);
  },
  lamp(c) { circ(c, 0, -4, 12, '#fff3b0'); box(c, -6, 8, 12, 8, '#6c757d'); },
  biglamp(c) { circ(c, 0, -4, 18, '#fff3b0'); box(c, -8, 14, 16, 8, '#6c757d'); c.strokeStyle = '#ffd166'; c.lineWidth = 2; c.beginPath(); c.arc(0, -4, 22, 0, TAU); c.stroke(); },
  spring(c) { c.strokeStyle = '#adb5bd'; c.lineWidth = 4; c.beginPath(); for (let i = 0; i < 7; i++) c.lineTo(i % 2 ? 10 : -10, 18 - i * 6); c.stroke(); },
  antigrav(c) { circ(c, 0, 0, 18, '#7209b7'); circ(c, 0, 0, 10, '#c77dff'); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -12); c.lineTo(6, -2); c.lineTo(-6, -2); c.fill(); },
  knife(c) { c.rotate(-0.6); c.fillStyle = '#e9ecef'; c.beginPath(); c.moveTo(-4, -22); c.lineTo(6, -22); c.lineTo(4, 6); c.lineTo(-4, 6); c.fill(); box(c, -5, 6, 10, 18, '#8b5a2b'); },
  dex(c) { box(c, -16, -20, 32, 40, '#2a9d8f'); box(c, -12, -16, 24, 32, '#e9f5db'); c.fillStyle = '#ffb347'; c.beginPath(); c.ellipse(0, 0, 8, 5, 0, 0, TAU); c.fill(); },
  boot(c) { c.fillStyle = '#7f5539'; c.beginPath(); c.moveTo(-10, -18); c.lineTo(4, -18); c.lineTo(4, 2); c.lineTo(18, 4); c.lineTo(18, 14); c.lineTo(-10, 14); c.fill(); },
  ball(c) { circ(c, 0, 0, 18, '#3a0ca3'); circ(c, -5, -6, 2.5, '#111'); circ(c, 3, -8, 2.5, '#111'); circ(c, -1, -1, 2.5, '#111'); },
  drum(c) { box(c, -14, -20, 28, 40, '#2a9d8f'); box(c, -14, -8, 28, 3, '#1d6f66'); box(c, -14, 6, 28, 3, '#1d6f66'); },
};

function bolt(c) { c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(4, -26); c.lineTo(-4, -12); c.lineTo(2, -12); c.lineTo(-4, 0); c.lineTo(10, -16); c.lineTo(4, -16); c.closePath(); c.fill(); }

export function drawItemIcon(c, it, x, y) {
  if (drawArt(c, `icons/icon_${it.id}.png`, x - 32, y - 32, 64, 64)) return;
  c.save(); c.translate(x, y);
  if (it.hat && HATS[it.id]) { circ(c, 0, 10, 16, '#ffd7b5'); c.translate(0, 10); HATS[it.id](c); }
  else if (it.outfit && OUTFITS[it.id]) { c.translate(0, 42); c.scale(0.9, 0.9); OUTFITS[it.id](c); }
  else (ICONS[it.id] || ICONS[it.cat] || ICONS.dex)(c, it);
  c.restore();
}
