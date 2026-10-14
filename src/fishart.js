import { art } from './art.js';

// Code-drawn species art. Every shape is drawn in a 20-unit frame facing right, then scaled to the
// fish radius and flipped by heading. No image files.
const TAU = Math.PI * 2;

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const cache = new Map();
function tones(color) {
  let t = cache.get(color);
  if (!t) {
    const [r, g, b] = hexRgb(color);
    const f = (k) => `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`;
    t = { base: color, dark: f(0.62), light: f(1.25) };
    cache.set(color, t);
  }
  return t;
}

function ell(c, x, y, rx, ry, fill) { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
function circ(c, x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function tri(c, a, b, d, fill) { c.fillStyle = fill; c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(...d); c.closePath(); c.fill(); }
function eye(c, x, y, s = 3.2) { circ(c, x, y, s, '#fff'); circ(c, x + s * 0.3, y, s * 0.55, '#1b1b1b'); }
function smile(c, x, y, w = 4) {
  c.strokeStyle = '#1b1b1b'; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y - w * 0.6, w, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke();
}

function fishBody(c, t, k, wig) {
  const tail = Math.sin(wig) * 3;
  tri(c, [-14, 0], [-24, -9 + tail], [-24, 9 + tail], k.dark);
  ell(c, 0, 0, 17, 11, k.base);
  ell(c, 2, 4, 11, 5, k.light);
  tri(c, [-2, -9], [6, -16], [8, -9], k.dark);
  eye(c, 9, -3);
}

const SHAPES = {
  fish(c, t, k, w, id) {
    fishBody(c, t, k, w);
    if (id % 3 === 0) { c.fillStyle = k.dark; for (const x of [-6, 0]) c.fillRect(x, -8, 2.5, 16); }
    if (id % 3 === 1) for (const [x, y] of [[-6, -3], [-2, 5], [3, -6]]) circ(c, x, y, 1.6, k.dark);
    if (id === 24) { c.strokeStyle = '#2b2b2b'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(16, 3); c.quadraticCurveTo(10, 8, 8, 3); c.moveTo(16, 3); c.quadraticCurveTo(22, 8, 20, 2); c.stroke(); }
    if (id === 32) { c.strokeStyle = '#1b1b1b'; c.lineWidth = 2; c.beginPath(); c.moveTo(5, -8); c.lineTo(12, -6); c.stroke(); }
    if (id === 62) for (let x = 6; x < 17; x += 3) tri(c, [x, 3], [x + 1.5, 7], [x + 3, 3], '#fff');
  },
  eel(c, t, k, w) {
    c.strokeStyle = k.base; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath();
    for (let x = -24; x <= 16; x += 4) c.lineTo(x, Math.sin(x * 0.25 + w) * 4);
    c.stroke(); eye(c, 15, -2, 2.6);
  },
  jelly(c, t, k, w) {
    c.strokeStyle = k.dark; c.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      c.beginPath(); c.moveTo(i * 5, 2);
      for (let y = 2; y < 22; y += 4) c.lineTo(i * 5 + Math.sin(y * 0.4 + w + i) * 2.5, y);
      c.stroke();
    }
    c.fillStyle = k.base; c.beginPath(); c.arc(0, 2, 15, Math.PI, 0); c.quadraticCurveTo(0, 7, -15, 2); c.fill();
    ell(c, -5, -6, 4, 3, k.light);
    eye(c, -5, -2, 2.2); eye(c, 5, -2, 2.2);
  },
  turtle(c, t, k, w) {
    ell(c, 13, 0, 6, 5, '#9bd36a');
    for (const [x, y] of [[-8, -10], [6, -10], [-8, 10], [6, 10]]) ell(c, x, y + Math.sin(w) * 1.5, 6, 3, '#9bd36a');
    ell(c, 0, 0, 14, 11, k.dark); ell(c, 0, 0, 11, 8, k.base);
    circ(c, 0, 0, 3, k.dark); eye(c, 15, -2, 2);
  },
  horse(c, t, k) {
    c.strokeStyle = k.base; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(2, -12); c.quadraticCurveTo(-8, 0, 2, 8); c.quadraticCurveTo(8, 14, 0, 18); c.stroke();
    ell(c, 4, -14, 7, 5, k.base); tri(c, [9, -15], [16, -13], [9, -11], k.base);
    eye(c, 5, -15, 2);
  },
  frog(c, t, k, w) {
    ell(c, -10, 8 + Math.sin(w) * 2, 7, 3, k.dark); ell(c, 10, 8 - Math.sin(w) * 2, 7, 3, k.dark);
    ell(c, 0, 2, 14, 10, k.base); circ(c, -6, -8, 5, k.base); circ(c, 6, -8, 5, k.base);
    eye(c, -6, -8, 3); eye(c, 6, -8, 3); smile(c, 0, 4, 6);
  },
  angler(c, t, k, w) {
    c.strokeStyle = k.dark; c.lineWidth = 2; c.beginPath(); c.moveTo(4, -12); c.quadraticCurveTo(14, -24, 20, -14); c.stroke();
    circ(c, 20, -13, 4 + Math.sin(t * 5) * 0.8, '#fff6a3');
    fishBody(c, t, k, w);
    for (let x = 8; x < 16; x += 3) tri(c, [x, 4], [x + 1.5, 8], [x + 3, 4], '#fff');
  },
  whale(c, t, k, w) {
    tri(c, [-16, 0], [-24, -10 + Math.sin(w) * 2], [-24, 10 + Math.sin(w) * 2], k.dark);
    ell(c, 0, 0, 18, 11, k.base); ell(c, 2, 5, 14, 5, k.light);
    tri(c, [14, -6], [26, -10], [15, -2], '#f4f1de'); eye(c, 9, -2, 2.4); smile(c, 12, 4, 4);
  },
  squid(c, t, k, w) {
    c.strokeStyle = k.dark; c.lineWidth = 2.5;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(-6, i * 3); c.quadraticCurveTo(-16, i * 5 + Math.sin(w + i) * 4, -24, i * 6); c.stroke(); }
    ell(c, 4, 0, 14, 8, k.base); tri(c, [14, -6], [22, 0], [14, 6], k.base); eye(c, 2, -2, 2.6);
  },
  eye(c, t, k, w) {
    tri(c, [-12, 0], [-22, -7 + Math.sin(w) * 2], [-22, 7 + Math.sin(w) * 2], '#e9c46a');
    circ(c, 0, 0, 14, '#fff'); circ(c, 4, 0, 7, '#2a9d8f'); circ(c, 5, 0, 3.5, '#111');
  },
  key(c, t, k) {
    c.strokeStyle = k.base; c.lineWidth = 5; c.beginPath(); c.arc(-10, 0, 7, 0, TAU); c.moveTo(-3, 0); c.lineTo(18, 0);
    c.moveTo(12, 0); c.lineTo(12, 7); c.moveTo(17, 0); c.lineTo(17, 6); c.stroke(); eye(c, -10, 0, 2.4);
  },
  wand(c, t, k) {
    c.strokeStyle = '#8d6e63'; c.lineWidth = 4; c.beginPath(); c.moveTo(-18, 6); c.lineTo(6, -2); c.stroke();
    star(c, 12, -4, 9, k.base); eye(c, 12, -4, 2);
  },
  blob(c, t, k) {
    circ(c, 0, 0, 18, k.base); ell(c, -5, -7, 6, 4, k.light);
    eye(c, -6, -3, 3.4); eye(c, 6, -3, 3.4); smile(c, 0, 6, 7);
    c.strokeStyle = k.dark; c.lineWidth = 3; c.beginPath(); c.arc(16, -14, 5, 0, TAU); c.stroke();
  },
  worm(c, t, k, w) {
    for (let i = 0; i < 6; i++) circ(c, -15 + i * 6, Math.sin(w + i) * 3, 5, i % 2 ? k.base : k.dark);
    eye(c, 15, Math.sin(w + 5) * 3 - 1, 2);
  },
  gob(c, t, k, w) {
    fishBody(c, t, k, w);
    c.fillStyle = '#5b1a12'; c.beginPath(); c.arc(14, 3, 7, -0.5 * Math.PI, 0.5 * Math.PI); c.fill();
    for (const y of [-2, 6]) tri(c, [12, y], [15, y + 2], [12, y + 4], '#fff');
  },
  puffer(c, t, k) {
    c.strokeStyle = k.dark; c.lineWidth = 2;
    for (let a = 0; a < TAU; a += TAU / 12) { c.beginPath(); c.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); c.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); c.stroke(); }
    circ(c, 0, 0, 15, k.base); ell(c, 0, 6, 10, 6, k.light); eye(c, 7, -4, 3); smile(c, 9, 4, 3);
  },
  dolphin(c, t, k, w) {
    tri(c, [-16, 0], [-24, -8 + Math.sin(w) * 2], [-24, 8 + Math.sin(w) * 2], k.dark);
    ell(c, 0, 0, 18, 8, k.base); ell(c, 18, 2, 6, 3, k.base); ell(c, 2, 4, 13, 3.5, k.light);
    tri(c, [-4, -6], [2, -16], [6, -6], k.dark); eye(c, 11, -2, 2.2);
  },
  crab(c, t, k, w) {
    c.strokeStyle = k.dark; c.lineWidth = 2.5;
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(s * 8, 4); c.lineTo(s * (14 + i * 3), 12 + Math.sin(w + i) * 2); c.stroke(); }
    circ(c, -16, -8, 5, k.base); circ(c, 16, -8, 5, k.base);
    ell(c, 0, 2, 13, 9, k.base); eye(c, -4, -9, 2.4); eye(c, 4, -9, 2.4);
  },
  clam(c, t, k, w) {
    const o = 4 + Math.sin(w * 0.5) * 3;
    c.fillStyle = k.dark; c.beginPath(); c.arc(0, 2, 15, 0, Math.PI); c.fill();
    circ(c, 0, 1, 4, '#fff');
    c.save(); c.translate(0, 2); c.rotate(-o * 0.04); c.fillStyle = k.base; c.beginPath(); c.arc(0, 0, 15, Math.PI, 0); c.fill(); c.restore();
    eye(c, -5, -6, 2); eye(c, 5, -6, 2);
  },
  jking(c, t, k, w) {
    c.save(); SHAPES.jelly(c, t, k, w); c.restore();
    c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(-8, -13); c.lineTo(-8, -20); c.lineTo(-4, -16); c.lineTo(0, -22); c.lineTo(4, -16); c.lineTo(8, -20); c.lineTo(8, -13); c.fill();
  },
  snail(c, t, k) {
    ell(c, 0, 8, 16, 4, '#d4a373'); circ(c, -2, -1, 10, k.base);
    c.strokeStyle = k.dark; c.lineWidth = 2; c.beginPath();
    for (let a = 0; a < TAU * 2; a += 0.3) c.lineTo(-2 + Math.cos(a) * a * 0.75, -1 + Math.sin(a) * a * 0.75);
    c.stroke(); eye(c, 14, 1, 2);
  },
  anchor(c, t, k, w) {
    fishBody(c, t, k, w);
    c.strokeStyle = '#495057'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-2, -4); c.lineTo(-2, 7); c.arc(-2, 2, 6, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
  },
  glider(c, t, k, w) {
    tri(c, [-2, 0], [-8, -18 - Math.sin(w) * 3], [8, -4], k.light);
    tri(c, [-2, 0], [-8, 18 + Math.sin(w) * 3], [8, 4], k.light);
    fishBody(c, t, k, w);
  },
  ray(c, t, k, w) {
    c.strokeStyle = k.dark; c.lineWidth = 2; c.beginPath(); c.moveTo(-10, 0); c.quadraticCurveTo(-20, Math.sin(w) * 6, -26, 0); c.stroke();
    c.fillStyle = k.base; c.beginPath(); c.moveTo(16, 0); c.quadraticCurveTo(0, -20 - Math.sin(w) * 3, -12, 0); c.quadraticCurveTo(0, 20 + Math.sin(w) * 3, 16, 0); c.fill();
    eye(c, 8, -3, 2); eye(c, 8, 3, 2);
  },
  urchin(c, t, k) {
    c.strokeStyle = k.dark; c.lineWidth = 2;
    for (let a = 0; a < TAU; a += TAU / 16) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a + t) * 20, Math.sin(a + t) * 20); c.stroke(); }
    circ(c, 0, 0, 11, k.base); eye(c, -4, -2, 2.4); eye(c, 4, -2, 2.4);
  },
  goose(c, t, k, w) {
    ell(c, -2, 2, 16, 9, k.base); ell(c, -6, 0, 9, 5, '#dee2e6');
    c.strokeStyle = k.base; c.lineWidth = 6; c.beginPath(); c.moveTo(10, 0); c.quadraticCurveTo(16, -10, 12, -14); c.stroke();
    circ(c, 12, -15, 5, k.base); tri(c, [16, -16], [23, -14], [16, -12], '#fb8500'); eye(c, 13, -16, 1.8);
  },
  ice(c, t, k) {
    c.fillStyle = k.base; c.fillRect(-18, -18, 36, 36);
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(-18, -18, 36, 6); c.fillRect(-18, -18, 6, 36);
    c.save(); c.globalAlpha *= 0.55; SHAPES.penguin(c, t, { base: '#343a40', dark: '#212529', light: '#f8f9fa' }, 0); c.restore();
    c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.strokeRect(-18, -18, 36, 36);
  },
  seal(c, t, k, w) {
    ell(c, -14, 4, 6, 3 + Math.sin(w), k.light);
    ell(c, 0, 2, 16, 10, k.base); eye(c, 7, -2, 2.6); eye(c, 13, -2, 2.6);
    circ(c, 12, 4, 2, '#343a40'); smile(c, 12, 8, 3);
  },
  penguin(c, t, k, w) {
    ell(c, 0, 0, 10, 15, k.base); ell(c, 2, 2, 7, 11, k.light);
    tri(c, [9, -6], [15, -4], [9, -2], '#fb8500'); eye(c, 5, -8, 2.2);
    ell(c, -9, 2, 3, 7 + Math.sin(w), k.dark);
  },
  shrimp(c, t, k, w) {
    for (let i = 0; i < 5; i++) circ(c, -12 + i * 6, Math.sin(i * 0.8) * 4 - 2, 5 - i * 0.3, i % 2 ? k.base : k.light);
    c.strokeStyle = k.dark; c.lineWidth = 1; c.beginPath(); c.moveTo(14, -2); c.lineTo(24, -10 + Math.sin(w) * 2); c.stroke();
    eye(c, 13, -3, 1.8);
  },
  bones(c, t, k, w) {
    c.strokeStyle = k.base; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-20, 0); c.lineTo(8, 0);
    for (let x = -14; x <= 4; x += 5) { c.moveTo(x, -8); c.lineTo(x, 8); }
    c.stroke(); tri(c, [-18, 0], [-25, -7 + Math.sin(w) * 2], [-25, 7], k.base);
    circ(c, 13, 0, 7, k.base); circ(c, 14, -1, 2.5, '#111');
  },
  spikeback(c, t, k, w) {
    for (let x = -10; x <= 8; x += 6) tri(c, [x - 3, -8], [x, -17], [x + 3, -8], '#a3b18a');
    fishBody(c, t, k, w);
  },
  star(c, t, k) { star(c, 0, 0, 18, k.base); eye(c, -4, -2, 2.4); eye(c, 4, -2, 2.4); smile(c, 0, 4, 3); },
  beetle(c, t, k, w) {
    c.strokeStyle = '#222'; c.lineWidth = 2;
    for (const y of [-8, 0, 8]) { c.beginPath(); c.moveTo(-4, y * 0.5); c.lineTo(-4 + Math.sin(w + y) * 3, y * 1.8); c.stroke(); }
    ell(c, 0, 0, 16, 11, k.base); c.fillStyle = k.dark; c.fillRect(-1, -11, 2, 22);
    eye(c, -5, -3, 2.6); eye(c, 5, -3, 2.6); smile(c, 0, 4, 4);
  },
  rocket(c, t, k) {
    tri(c, [-16, 0], [-26 - Math.random() * 4, -4], [-26 - Math.random() * 4, 4], '#ffd166');
    c.fillStyle = k.base; c.beginPath(); c.moveTo(20, 0); c.quadraticCurveTo(10, -9, -14, -7); c.lineTo(-14, 7); c.quadraticCurveTo(10, 9, 20, 0); c.fill();
    tri(c, [-10, -7], [-16, -14], [-4, -7], k.dark); tri(c, [-10, 7], [-16, 14], [-4, 7], k.dark);
    circ(c, 6, 0, 3.5, '#bde0fe');
  },
  ghost(c, t, k, w) { c.fillStyle = k.base; c.beginPath(); c.arc(4, -2, 13, Math.PI, 0);
    for (let x = 17; x >= -9; x -= 6.5) c.lineTo(x - 3, 12 + Math.sin(w + x) * 2), c.lineTo(x - 6.5, 8);
    c.fill(); circ(c, 0, -3, 2.4, '#222'); circ(c, 8, -3, 2.4, '#222');
  },
  diva(c, t, k, w) {
    tri(c, [-12, 0], [-26, -14 + Math.sin(w) * 3], [-22, 0], '#ff99c8'); tri(c, [-12, 0], [-26, 14 - Math.sin(w) * 3], [-22, 0], '#ff99c8');
    fishBody(c, t, k, w); ell(c, 16, 3, 3, 2, '#d00000');
    c.strokeStyle = '#222'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(9, -6); c.lineTo(12, -9); c.stroke();
  },
  clock(c, t, k, w) {
    tri(c, [-14, 0], [-24, -8 + Math.sin(w) * 2], [-24, 8], k.dark);
    circ(c, 0, 0, 15, k.base); circ(c, 0, 0, 12, '#fffbea');
    c.strokeStyle = '#222'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t) * 9, Math.sin(t) * 9);
    c.moveTo(0, 0); c.lineTo(Math.cos(t / 12) * 6, Math.sin(t / 12) * 6); c.stroke();
  },
  boot(c, t, k) {
    c.fillStyle = k.base; c.beginPath(); c.moveTo(-10, -16); c.lineTo(4, -16); c.lineTo(4, 2); c.lineTo(18, 4); c.quadraticCurveTo(22, 12, 14, 12); c.lineTo(-10, 12); c.fill();
    c.fillStyle = k.dark; c.fillRect(-10, 8, 30, 4); eye(c, -2, -8, 2.6); eye(c, 3, -6, 2.2);
  },
};

function star(c, x, y, r, fill) {
  c.fillStyle = fill; c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath(); c.fill();
}

// Draws species `sp` centred at (x, y) with radius r, heading dir (±1).
// opts.silhouette draws a flat dark shape (for undiscovered fish in the book).
export const fishArtPath = (sp) => `fish/fish_${String(sp.id).padStart(2, '0')}.png`;
export function drawFish(ctx, sp, x, y, r, dir, t, opts = {}) {
  if (opts.silhouette) return drawSilhouette(ctx, sp, x, y, r, dir);
  const im = art(fishArtPath(sp));
  if (im) { // sprite art faces right; the body spans ~2.6 r wide, with a little wobble
    const w = r * 2.8, h = (w * im.naturalHeight) / im.naturalWidth;
    ctx.save(); ctx.translate(x, y); ctx.scale(dir < 0 ? -1 : 1, 1); ctx.rotate(Math.sin(t * 6 + sp.id) * 0.05);
    ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((dir < 0 ? -1 : 1) * (r / 20), r / 20);
  (SHAPES[sp.shape] || SHAPES.fish)(ctx, t, tones(sp.color), t * 6 + sp.id, sp.id);
  ctx.restore();
}

const silCache = new Map();
function drawSilhouette(ctx, sp, x, y, r, dir) {
  const key = sp.id + ':' + r + (art(fishArtPath(sp)) ? 'a' : 'c'); // re-cache once the sprite has loaded
  let c = silCache.get(key);
  if (!c) {
    const size = Math.ceil(r * 3.2);
    c = document.createElement('canvas'); c.width = c.height = size * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    drawFish(g, sp, size / 2, size / 2, r, 1, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = '#0d1b2a'; g.fillRect(0, 0, size, size);
    silCache.set(key, c);
  }
  const size = c.width / 2;
  ctx.save(); ctx.globalAlpha *= 0.5; ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1);
  ctx.drawImage(c, -size / 2, -size / 2, size, size);
  ctx.restore();
}

export const SHAPE_NAMES = Object.keys(SHAPES);
