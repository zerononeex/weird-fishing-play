// Pooled particles, popups and screen shake (screen coordinates).
import { text } from './draw.js';

const MAX = 160;
const pool = Array.from({ length: MAX }, () => ({ on: false }));
const pops = [];
export const shake = { t: 0, mag: 0 };

export function burst(x, y, color, n = 8, speed = 160, life = 0.5) {
  for (const p of pool) {
    if (n <= 0) break;
    if (p.on) continue;
    const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
    Object.assign(p, { on: true, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color, r: 2 + Math.random() * 4 });
    n--;
  }
}

export function popup(x, y, label, color = '#ffe066') { if (pops.length < 24) pops.push({ x, y, label, color, life: 0.9 }); }
export function quake(mag = 6, t = 0.25) { shake.mag = Math.max(shake.mag, mag); shake.t = Math.max(shake.t, t); }

export function updateFx(dt) {
  for (const p of pool) {
    if (!p.on) continue;
    p.life -= dt; if (p.life <= 0) { p.on = false; continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94;
  }
  for (let i = pops.length - 1; i >= 0; i--) { pops[i].life -= dt; pops[i].y -= 50 * dt; if (pops[i].life <= 0) pops.splice(i, 1); }
  shake.t = Math.max(0, shake.t - dt); if (!shake.t) shake.mag = 0;
}

export function drawFx(ctx) {
  for (const p of pool) {
    if (!p.on) continue;
    ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const p of pops) { ctx.globalAlpha = Math.min(1, p.life * 2); text(ctx, p.label, p.x, p.y, 26, p.color); }
  ctx.globalAlpha = 1;
}

export function clearFx() { for (const p of pool) p.on = false; pops.length = 0; shake.t = shake.mag = 0; }
