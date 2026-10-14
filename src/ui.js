// Immediate-mode canvas UI: screens register buttons each frame; main.js routes pointers to them.
import { CONFIG } from './config.js';

export const ui = { buttons: [] };
export const ARROW = 120;  // ◀ ▶ size, logical px (v1.2: 96 -> 120 for small hands)
export const SAW_BTN = 112; // big SAW button, bottom centre (v1.2: 96 -> 112)
export const KNIFE_BTN = 96; // top-right Knife button (v1.2: 76 -> 96)

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

// SAW toggle button (GAME_SPEC §10.C, v1.2: a tap latches the saw on/off): shown only when a Chainsaw is owned.
export function sawButton() {
  return addButton({ x: CONFIG.W / 2 - SAW_BTN / 2, y: CONFIG.H - SAW_BTN - 24, w: SAW_BTN, h: SAW_BTN, saw: true, label: 'SAW' });
}
