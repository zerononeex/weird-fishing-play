// Art slots (GAME_SPEC §10, docs/ASSET_PROMPTS.md): an image is used only when its file is present
// (listed in manifest.js) and loaded; otherwise callers fall back to the code-drawn version.
import { ART } from './manifest.js';

const present = new Set(ART);
const imgs = new Map();

// path is the slot id from docs/ASSET_PROMPTS.md, relative to assets/art/, e.g. 'fish/fish_01.png'.
// The site ships the normalized, compressed version of that slot as .webp. Returns a ready Image or null.
export function art(path) {
  if (!present.has(path)) return null;
  let im = imgs.get(path);
  if (!im) { im = new Image(); im.decoding = 'async'; im.src = 'assets/art/' + path.replace(/\.png$/, '.webp'); imgs.set(path, im); }
  return im.complete && im.naturalWidth ? im : null;
}

// Draws the image into the box and returns true, or returns false so the caller draws its fallback.
export function drawArt(ctx, path, x, y, w, h) {
  const im = art(path);
  if (!im) return false;
  ctx.drawImage(im, x, y, w, h);
  return true;
}

// A cached copy of an art image whose bottom `frac` of its height fades to transparent (seamless blends
// between stacked backgrounds). Returns a canvas, or null while the image is missing / loading.
const fades = new Map();
export function fadedArt(path, frac) {
  const im = art(path);
  if (!im) return null;
  const key = path + '|' + frac;
  let c = fades.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d'), y0 = c.height * (1 - frac);
    g.drawImage(im, 0, 0);
    const m = g.createLinearGradient(0, y0, 0, c.height);   // opaque above y0 (destination-in clears what it does not cover)
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = m; g.fillRect(0, 0, c.width, c.height);
    fades.set(key, c);
  }
  return c;
}

export const hasArt = (path) => present.has(path);
// For the smoke test: how many requested images are ready / broken.
export const artStats = () => { let ok = 0, bad = 0; for (const im of imgs.values()) { if (im.complete) im.naturalWidth ? ok++ : bad++; } return { requested: imgs.size, ok, bad }; };
