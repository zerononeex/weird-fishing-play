import { CONFIG, widthFor } from './config.js';
import { input, step as stepInput, routeDown, routeMove, routeUp, releaseAll, bindKeys } from './input.js';
import { ui, beginFrame, hitButton } from './ui.js';
import { G } from './game.js';
import { unlock, setMuted, sfx, audioState, pauseAudio, music, musicNow, sfxStats } from './audio.js';
import { artStats } from './art.js';
import { musicFor } from './musicmap.js';
import { updateFx, shake } from './fx.js';
import { place as placeCodeUI } from './codeui.js';
import './play.js';
import './screens.js';
import './dock.js';

const { H, FIXED_DT, MAX_STEPS } = CONFIG; // W is live (v1.4.2): fit() sets CONFIG.W
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const rotate = document.getElementById('rotate');
let scale = 1, time = 0;

function fit() {
  const cs = getComputedStyle(document.body), px = (k) => parseFloat(cs[k]) || 0;
  const vw = innerWidth - px('paddingLeft') - px('paddingRight'), vh = innerHeight - px('paddingTop') - px('paddingBottom');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  CONFIG.W = widthFor(vw / vh);
  scale = Math.min(vw / CONFIG.W, vh / H);
  canvas.style.width = CONFIG.W * scale + 'px';
  canvas.style.height = H * scale + 'px';
  canvas.width = Math.round(CONFIG.W * scale * dpr);
  canvas.height = Math.round(H * scale * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  rotate.style.width = Math.max(0, (vw - CONFIG.W * scale) / 2) + 'px';
  placeCodeUI();
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(fit, 200));
fit();

G.boot();
const sceneNow = () => G.scenes[G.phase];

// ---- pointer routing ----
const pointers = new Map();
const toLogical = (e) => {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * CONFIG.W, y: ((e.clientY - r.top) / r.height) * H };
};
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  unlock();
  canvas.setPointerCapture?.(e.pointerId);
  const p = toLogical(e), b = hitButton(p.x, p.y);
  if (b?.onTap) { if (!b.silent) sfx.tap(); b.onTap(p); return; }
  if (!b && sceneNow().pointerDown?.(p, e)) { pointers.set(e.pointerId, { scene: true }); return; }
  const st = routeDown(input, 'p' + e.pointerId, p, b, e.timeStamp, sceneNow().steers !== false);
  if (st) pointers.set(e.pointerId, st);
});
canvas.addEventListener('pointermove', (e) => {
  const st = pointers.get(e.pointerId); if (!st) return;
  const p = toLogical(e);
  if (st.scene) sceneNow().pointerMove?.(p, e);
  else routeMove(input, 'p' + e.pointerId, st, p);
});
const up = (e) => {
  const st = pointers.get(e.pointerId); if (!st) return;
  pointers.delete(e.pointerId);
  if (st.scene) sceneNow().pointerUp?.(toLogical(e), e);
  else routeUp(input, 'p' + e.pointerId, st, e.timeStamp);
};
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
bindKeys(window);
addEventListener('keydown', unlock);
// Pause when the page is hidden; no pinch / double-tap zoom on iPad.
let paused = false;
document.addEventListener('visibilitychange', () => {
  paused = document.hidden;
  if (paused) { releaseAll(input); pointers.clear(); }
  pauseAudio(paused);
});
for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (!e.target.closest?.('#codeui .ta')) e.preventDefault(); }, { passive: false }); // the save-code box scrolls

function update(dt) {
  time += dt; stepInput(input, dt); updateFx(dt);
  setMuted(G.slot.settings.muted, G.slot.settings.musicMuted);
  music(musicFor(G.phase, G.run, G.runNo));
  if (!window.__wf?.freeze) sceneNow().update?.(dt);
}
function render() {
  beginFrame();
  ctx.save();
  if (shake.t > 0) ctx.translate((Math.random() - 0.5) * shake.mag, (Math.random() - 0.5) * shake.mag);
  sceneNow().render(ctx, time);
  ctx.restore();
  window.__wf?.overlay?.(ctx, time);
}

let last = performance.now(), acc = 0;
const frameMs = [];
function frame(now) {
  const t0 = performance.now();
  acc = paused ? 0 : Math.min(acc + (now - last) / 1000, FIXED_DT * MAX_STEPS);
  last = now;
  while (acc >= FIXED_DT) { update(FIXED_DT); acc -= FIXED_DT; }
  if (!paused) render();
  frameMs.push(performance.now() - t0); if (frameMs.length > 1200) frameMs.shift();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// test hook for the smoke test
window.__wf = {
  get W() { return CONFIG.W; }, H, get scale() { return scale; }, G, ui, freeze: false, audioState, musicNow, sfxStats, artStats, frameMs,
  lum() { // mean luminance of the canvas, 0..255
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let s = 0; for (let i = 0; i < d.length; i += 16) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return s / (d.length / 16);
  },
};
