// Shared game context: current phase + the data every scene reads. Scenes live in play.js / screens.js.
import { next } from './phases.js';
import { freshSlot, load, save } from './save.js';

export const G = {
  phase: 'title',
  run: null,
  data: null,
  slot: freshSlot(0),
  // Loads the 3-slot save and picks the active kid (creating the slot on first use).
  boot() {
    this.data = load();
    this.useSlot(this.data.activeSlot);
  },
  useSlot(i) {
    this.data.activeSlot = i;
    this.data.slots[i] ||= freshSlot(i);
    this.slot = this.data.slots[i];
    this.persist();
  },
  persist() { if (this.data) save(this.data); },
  scenes: {},
  go(event) {
    const to = next(this.phase, event);
    if (to === this.phase) return;
    this.phase = to;
    this.scenes[to]?.enter?.();
  },
};
