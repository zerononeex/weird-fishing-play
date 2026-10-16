// The nine fishing zones (GAME_SPEC §4.1–4.2, v1.4 §13). Names are original.
// Zone ids 1-3 are unchanged since v1.0. v1.4 inserts zones 4-8; the endless Whirlpool moved from id 4 to id 9
// (save.js remaps old slots). `music` is the dive track (each sea has its own since v1.4 Act 2),
// `short` is the buoy label on the dock.
export const ZONES = [
  { id: 1, name: 'Puddle Bay', short: 'Puddle', key: 'puddle', bg: 'bg/sea_puddle.png', maxDepth: 300, unlockSpecies: 0, boss: 13,
    darkDepth: 600, minLight: 0.55, dark: [[150, 260]], sea: [[110, 205, 240], [8, 40, 75]], music: 'music_dive_puddle' },
  { id: 2, name: 'Grumble Sea', short: 'Grumble', key: 'grumble', bg: 'bg/sea_grumble.png', maxDepth: 500, unlockSpecies: 10, boss: 30,
    darkDepth: 700, minLight: 0.40, dark: [[320, 480]], sea: [[90, 160, 190], [10, 30, 60]], music: 'music_dive_grumble' },
  { id: 3, name: 'Iceberg Alley', short: 'Iceberg', key: 'iceberg', bg: 'bg/sea_iceberg.png', maxDepth: 700, unlockSpecies: 22, boss: 43, postBoss: 44,
    darkDepth: 800, minLight: 0.25, dark: [[450, 700]], sea: [[170, 225, 245], [10, 35, 70]], music: 'music_dive_iceberg' },
  { id: 4, name: 'Jellyfish Jungle', short: 'Jellyfish', key: 'jellyfish', bg: 'bg/sea_jellyfish.png', maxDepth: 900, unlockSpecies: 34, boss: 75,
    darkDepth: 900, minLight: 0.22, dark: [[520, 760]], sea: [[40, 140, 140], [4, 30, 40]], music: 'music_dive_jellyfish', jellyShare: 0.3 },
  { id: 5, name: 'Sunken City', short: 'Sunken', key: 'sunken', bg: 'bg/sea_sunken.png', maxDepth: 1100, unlockSpecies: 46, boss: 84,
    darkDepth: 1000, minLight: 0.20, dark: [[600, 950]], sea: [[70, 150, 170], [8, 28, 50]], music: 'music_dive_sunken' },
  { id: 6, name: 'Volcano Deep', short: 'Volcano', key: 'volcano', bg: 'bg/sea_volcano.png', maxDepth: 1300, unlockSpecies: 58, boss: 93,
    darkDepth: 1100, minLight: 0.18, dark: [[700, 1150]], sea: [[90, 110, 130], [30, 10, 12]], music: 'music_dive_volcano' },
  { id: 7, name: 'Moonlight Trench', short: 'Moonlight', key: 'trench', bg: 'bg/sea_trench.png', maxDepth: 1600, unlockSpecies: 70, boss: 102,
    darkDepth: 1000, minLight: 0.12, dark: [[300, 1600]], sea: [[40, 70, 120], [3, 6, 24]], music: 'music_dive_trench' },
  { id: 8, name: "Dragon's Deep", short: 'Dragon', key: 'dragon', bg: 'bg/sea_dragon.png', maxDepth: 2000, unlockSpecies: 82, boss: 111,
    darkDepth: 1400, minLight: 0.12, dark: [[900, 1900]], sea: [[60, 90, 130], [20, 6, 30]], music: 'music_dive_dragon' },
  { id: 9, name: 'The Whirlpool', short: 'Whirlpool', key: 'whirlpool', bg: 'bg/sea_whirlpool.png', maxDepth: Infinity, needsBoss: true,
    darkDepth: 900, minLight: 0.10, dark: [[300, Infinity]], sea: [[80, 120, 170], [6, 6, 30]], music: 'music_dive_whirlpool', jellyShare: 0.2,
    // earlier species that also swim here, with their Whirlpool depth band
    extras: [[7, 0, 600, 'c'], [8, 100, 900, 'u'], [9, 50, 400, 'r'], [10, 300, 1200, 'u'],
             [27, 200, 1000, 'u'], [37, 400, Infinity, 'u'], [42, 100, 800, 'c'], [13, 800, Infinity, 'r']] },
];
export const zoneById = (id) => ZONES.find((z) => z.id === id);
// The endless zone (v1.0-v1.3 id 4, v1.4 id 9) and the zone whose boss is the FINAL boss.
export const WHIRLPOOL = ZONES.find((z) => !Number.isFinite(z.maxDepth));
export const FINAL_ZONE = ZONES.filter((z) => z.boss).at(-1);
export const FINAL_BOSS = FINAL_ZONE.boss;

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
