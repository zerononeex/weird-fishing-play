// Immediate-mode canvas UI: screens register buttons each frame; main.js routes pointers to them.
import { CONFIG } from './config.js';

export const ui = { buttons: [] };
export const ARROW = 96; // ◀ ▶ size, logical px (>= 80)

export function beginFrame() { ui.buttons.length = 0; }

// Tap button: fires onTap on pointerdown. Hold button: { hold: -1|1 } feeds the steering input.
export function addButton(b) { ui.buttons.push(b); return b; }

export function hitButton(x, y) {
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (!b.disabled && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

export function arrowButtons() {
  const y = CONFIG.H - ARROW - 24;
  addButton({ x: 16, y, w: ARROW, h: ARROW, hold: -1 });
  addButton({ x: CONFIG.W - ARROW - 16, y, w: ARROW, h: ARROW, hold: 1 });
}
