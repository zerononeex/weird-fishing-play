// Which music track plays when (GAME_SPEC §10.G). Pure: no DOM, unit tested.
export const SHOOT_TRACKS = ['music_shoot_a', 'music_shoot_b', 'music_shoot_c'];
export const BOSS_WATER = 30; // metres above the bottom of every zone with a boss (zones 1-8)

// The dive track at depth d: boss water beats the dark depth, which beats the zone's own track.
export function diveTrack(zone, d) {
  if (zone.boss && Number.isFinite(zone.maxDepth) && d >= zone.maxDepth - BOSS_WATER) return 'music_boss';
  if (zone.dark.some(([a, b]) => d >= a && d < b)) return 'music_deep';
  return zone.music || 'music_dive_' + zone.key; // v1.4: the five new seas reuse the four zone tracks
}

// runNo counts launches so the three shooting tracks rotate per run.
export function musicFor(phase, run, runNo = 0) {
  switch (phase) {
    case 'shop': return 'music_shop';
    case 'ending': return 'music_ending';
    case 'launch': case 'shoot': case 'payout': return SHOOT_TRACKS[runNo % SHOOT_TRACKS.length];
    case 'cast': case 'descent': case 'turn': case 'ascent': return run ? diveTrack(run.zone, run.depth) : 'music_title';
    default: return 'music_title'; // title, slots, dock, dex
  }
}
