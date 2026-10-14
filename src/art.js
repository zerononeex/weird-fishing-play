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

export const hasArt = (path) => present.has(path);
// For the smoke test: how many requested images are ready / broken.
export const artStats = () => { let ok = 0, bad = 0; for (const im of imgs.values()) { if (im.complete) im.naturalWidth ? ok++ : bad++; } return { requested: imgs.size, ok, bad }; };
