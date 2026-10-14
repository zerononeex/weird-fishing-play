export const CONFIG = {
  W: 540, H: 960,            // logical portrait canvas (9:16), scaled to fit + letterboxed
  CASH_MULTIPLIER: 5,        // payout only; shop prices stay at original values
  PX_PER_M: 10,              // world scale [TUNE]
  SAVE_KEY: 'weirdfishing.save.v2',
  FIXED_DT: 1 / 60,          // fixed-step sim, render on rAF
  MAX_STEPS: 4,              // at most 4 sim steps per frame (30fps floor)
  GRAVITY: 420,              // px/s² in the air (v1.0: 1400, v1.1: 560, v1.1.1: 280) — airtime ≈ 5.8–7.6 s [TUNE]
  LAUNCH_VY_MULT: 1.1,       // launch vy × this (−1210..−1595 px/s) — apex ≈ 3× v1.0 [TUNE]
  GUN_RATE_MULT: 2.25,       // every gun's data rate × this (v1.1: 1.5) [TUNE]
  REEL_RISE_MULT: 1.5,       // ascent rise speed × this (v1.2) [TUNE]
  ASCENT_STEER_MULT: 1.5,    // horizontal lure speed × this during ASCENT only (v1.2) [TUNE]
};
