// Pure phase state machine (GAME_SPEC §1). Events in, next phase out. Firing has no limited-shots state.
export const T = {
  title:   { tap: 'slots' },
  slots:   { pick: 'dock' },
  dock:    { cast: 'cast', shop: 'shop', dex: 'dex', back: 'slots' },
  shop:    { back: 'dock' },
  dex:     { back: 'dock' },
  cast:    { done: 'descent' },
  descent: { touch: 'turn', maxDepth: 'turn', knife: 'dock' },
  turn:    { done: 'ascent' },
  ascent:  { surface: 'launch', knife: 'dock' },
  launch:  { done: 'shoot' },
  shoot:   { noAirborne: 'payout' },
  payout:  { done: 'dock', bossLanded: 'ending' },
  ending:  { done: 'dock' },
};

export function next(phase, event) {
  return T[phase]?.[event] ?? phase;
}
