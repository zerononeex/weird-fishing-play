// Code-drawn art. Every visual in the game is drawn here with canvas paths — no image files.
import { CONFIG } from './config.js';
import { ui } from './ui.js';

const { W, H } = CONFIG;
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function text(ctx, s, x, y, size = 28, color = '#fff', align = 'center', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 7); ctx.strokeStyle = 'rgba(0,30,50,0.55)'; ctx.lineJoin = 'round';
  ctx.strokeText(s, x, y);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}

const mix = (a, b, t) => Math.round(a + (b - a) * t);
export function shade(rgb, k) { return `rgb(${rgb.map((c) => Math.round(c * k)).join(',')})`; }
export function lerpRgb(a, b, t) { return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]; }

// Underwater background; `scroll` is the world offset in px so the bubbles/streaks move with depth.
export function drawSea(ctx, top, bottom, scroll, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgb(${top})`); g.addColorStop(1, `rgb(${bottom})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 24; i++) {
    const x = (i * 197 + Math.sin(t * 0.6 + i) * 12) % W;
    const y = (((i * 331 - scroll * (0.4 + (i % 3) * 0.2)) % H) + H) % H;
    ctx.beginPath(); ctx.arc(x, y, 2 + (i % 4), 0, Math.PI * 2); ctx.fill();
  }
}

export function drawLine(ctx, x0, y0, x1, y1) {
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}

export function drawLure(ctx, x, y, t, saw = false) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = '#d8dde3'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 6); ctx.arc(-7, 6, 7, 0, Math.PI); ctx.stroke();
  ctx.fillStyle = '#ff5a5f'; ctx.beginPath(); ctx.arc(0, -20, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2.5, -22.5, 2.5, 0, Math.PI * 2); ctx.fill();
  if (saw) {
    ctx.rotate(t * 30);
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(26, 4); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// ◀ ▶ hold-to-steer buttons (registered in ui.buttons by arrowButtons()).
export function drawArrows(ctx, input) {
  for (const b of ui.buttons) {
    if (!b.hold) continue;
    const on = input.holds[b.hold].size > 0;
    ctx.fillStyle = on ? 'rgba(255,209,102,0.85)' : 'rgba(255,255,255,0.28)';
    rr(ctx, b.x, b.y, b.w, b.h, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4; ctx.stroke();
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, d = b.hold * 18;
    ctx.fillStyle = on ? '#5a3b00' : '#fff';
    ctx.beginPath(); ctx.moveTo(cx + d, cy); ctx.lineTo(cx - d, cy - 22); ctx.lineTo(cx - d, cy + 22); ctx.closePath(); ctx.fill();
  }
}

// Boat + fisher at the surface. Wearables are drawn by drawWear (step 5.5).
export function drawBoat(ctx, x, y, t, color = '#ff6b9a', wear = null, buddy = null) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2) * 3); ctx.rotate(Math.sin(t * 1.3) * 0.03);
  // fisher
  ctx.fillStyle = color; rr(ctx, -16, -62, 32, 40, 10); ctx.fill();
  ctx.fillStyle = '#ffd7b5'; ctx.beginPath(); ctx.arc(0, -76, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(-5, -78, 2.4, 0, Math.PI * 2); ctx.arc(6, -78, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -73, 6, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  wear?.(ctx);
  // rod
  ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(10, -40); ctx.lineTo(60, -110); ctx.stroke();
  // hull
  ctx.fillStyle = '#e76f51'; ctx.beginPath(); ctx.moveTo(-70, -22); ctx.lineTo(70, -22); ctx.lineTo(50, 10); ctx.lineTo(-50, 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f4a261'; ctx.fillRect(-70, -26, 140, 8);
  buddy?.(ctx);
  ctx.restore();
}

export function drawSky(ctx, waterY, t, night = false) {
  const g = ctx.createLinearGradient(0, 0, 0, waterY);
  g.addColorStop(0, night ? '#0b1d3a' : '#7fd3ff'); g.addColorStop(1, night ? '#28407a' : '#d8f3ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, waterY);
  if (night) { ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(430, 120, 34, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(430, 120, 40, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [x, y, s] of [[90, 170, 1], [300, 90, 0.8], [520, 260, 1.2]]) {
    const cx = ((x + t * 12 * s) % (W + 160)) - 80;
    ctx.beginPath(); ctx.arc(cx, y, 26 * s, 0, Math.PI * 2); ctx.arc(cx + 28 * s, y + 6, 20 * s, 0, Math.PI * 2); ctx.arc(cx - 26 * s, y + 8, 18 * s, 0, Math.PI * 2); ctx.fill();
  }
  const sea = ctx.createLinearGradient(0, waterY, 0, H);
  sea.addColorStop(0, night ? '#1d3557' : '#48b5e0'); sea.addColorStop(1, night ? '#081426' : '#0b3d5c');
  ctx.fillStyle = sea; ctx.fillRect(0, waterY, W, H - waterY);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = 0; x <= W; x += 10) ctx.lineTo(x, waterY + Math.sin(x * 0.05 + t * 2) * 3);
  ctx.stroke();
}

export function drawCrosshair(ctx, x, y, spread, firing) {
  ctx.strokeStyle = firing ? '#ffd166' : 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
  const r = Math.max(18, spread);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - r - 8, y); ctx.lineTo(x - r + 8, y); ctx.moveTo(x + r - 8, y); ctx.lineTo(x + r + 8, y);
  ctx.moveTo(x, y - r - 8); ctx.lineTo(x, y - r + 8); ctx.moveTo(x, y + r - 8); ctx.lineTo(x, y + r + 8); ctx.stroke();
}
