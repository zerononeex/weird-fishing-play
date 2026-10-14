export const CONFIG = {
  W: 540, H: 960,            // logical portrait canvas (9:16), scaled to fit + letterboxed
  CASH_MULTIPLIER: 5,        // payout only; shop prices stay at original values
  PX_PER_M: 10,              // world scale [TUNE]
  SAVE_KEY: 'weirdfishing.save.v1',
  FIXED_DT: 1 / 60,          // fixed-step sim, render on rAF
  MAX_STEPS: 4,              // at most 4 sim steps per frame (30fps floor)
};
