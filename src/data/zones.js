// The four fishing zones (GAME_SPEC §4.1–4.2). Names are original.
export const ZONES = [
  { id: 1, name: 'Puddle Bay', key: 'puddle', bg: 'bg/sea_puddle.png', maxDepth: 300, unlockSpecies: 0, boss: 13,
    darkDepth: 600, minLight: 0.55, dark: [[150, 260]], sea: [[110, 205, 240], [8, 40, 75]] },
  { id: 2, name: 'Grumble Sea', key: 'grumble', bg: 'bg/sea_grumble.png', maxDepth: 500, unlockSpecies: 10, boss: 30,
    darkDepth: 700, minLight: 0.40, dark: [[320, 480]], sea: [[90, 160, 190], [10, 30, 60]] },
  { id: 3, name: 'Iceberg Alley', key: 'iceberg', bg: 'bg/sea_iceberg.png', maxDepth: 700, unlockSpecies: 22, boss: 43, postBoss: 44,
    darkDepth: 800, minLight: 0.25, dark: [[450, 700]], sea: [[170, 225, 245], [10, 35, 70]] },
  { id: 4, name: 'The Whirlpool', key: 'whirlpool', bg: 'bg/sea_whirlpool.png', maxDepth: Infinity, needsBoss: true,
    darkDepth: 900, minLight: 0.10, dark: [[300, Infinity]], sea: [[80, 120, 170], [6, 6, 30]],
    // earlier species that also swim here, with their Whirlpool depth band
    extras: [[7, 0, 600, 'c'], [8, 100, 900, 'u'], [9, 50, 400, 'r'], [10, 300, 1200, 'u'],
             [27, 200, 1000, 'u'], [37, 400, Infinity, 'u'], [42, 100, 800, 'c'], [13, 800, Infinity, 'r']] },
];
export const zoneById = (id) => ZONES[id - 1];

// Ambient light 0..1 at depth d (GAME_SPEC §4.2). lamp: 0 none · 1 Lamp · 2 Big Lamp.
export const PATCH = 0.15, BIG_LAMP_FLOOR = 0.35;
export function light(zone, d, lamp = 0) {
  let l = Math.max(zone.minLight, Math.min(1, 1 - d / zone.darkDepth));
  if (zone.dark.some(([a, b]) => d >= a && d < b)) l *= PATCH;
  return lamp >= 2 ? Math.max(l, BIG_LAMP_FLOOR) : l;
}

// Radius (px) of the light circle around the lure. The small Lamp only works in zones 1-2.
export function lampRadius(zone, lamp = 0) {
  if (lamp >= 2) return 320;
  if (lamp === 1 && zone.id <= 2) return 200;
  return 70;
}
