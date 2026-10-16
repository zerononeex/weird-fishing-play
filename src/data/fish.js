// The 111 Weird Fishing species (GAME_SPEC §4.5; v1.4 §13 adds 67-111 for zones 4-8). All names are original.
// [id, name, zone, dMin, dMax, value, size, behaviour, rarity, conditions, shape, colour]
// rarity: c common · u uncommon · r rare · v very rare · boss
// conditions: day · night · midnight · post (after the final boss) · pre:<zone> / post:<zone> (before / after that
//             zone's boss was first landed) ·
//             hat:<id> · suit:<id> · after:<species id touched on the descent this run>
const I = Infinity;
const ROWS = [
  // Puddle Bay
  [1, 'Bloop', 1, 5, 100, 3, 'S', 'drift', 'c', [], 'fish', '#ffb347'],
  [2, 'Shiny Carp', 1, 20, 120, 30, 'S', 'drift', 'c', [], 'fish', '#ffd23f'],
  [3, 'Bubble Jelly', 1, 30, 300, -5, 'S', 'bob', 'c', [], 'jelly', '#f7a8ff'],
  [4, 'Pebble Turtle', 1, 40, 160, 25, 'M', 'drift', 'c', [], 'turtle', '#6cc070'],
  [5, 'Sun Pony', 1, 20, 140, 5, 'S', 'drift', 'c', ['day'], 'horse', '#ffe066'],
  [6, 'Moon Pony', 1, 20, 140, 5, 'S', 'drift', 'c', ['night'], 'horse', '#a5b4fc'],
  [7, 'Nibbler', 1, 60, 200, 9, 'S', 'school', 'c', [], 'fish', '#ef476f'],
  [8, 'Noodle Eel', 1, 100, 260, 35, 'M', 'dart', 'u', [], 'eel', '#06d6a0'],
  [9, 'Hoppy Toad', 1, 60, 80, 90, 'S', 'flee', 'r', [], 'frog', '#8ac926'],
  [10, 'Bulb Angler', 1, 150, 260, 50, 'M', 'glow', 'u', [], 'angler', '#ff7b54'],
  [11, 'Wobble Jelly', 1, 120, 300, -10, 'M', 'bob', 'u', [], 'jelly', '#c77dff'],
  [12, 'Zoomfin', 1, 120, 280, 150, 'M', 'flee', 'r', [], 'fish', '#4cc9f0'],
  [13, 'Hornwhale', 1, 290, 300, 800, 'Boss', 'boss', 'boss', [], 'whale', '#7aa6c2'],
  [14, 'Squidpop', 1, 5, 20, 230, 'M', 'drift', 'r', ['post'], 'squid', '#ff99c8'],
  [15, 'Peeper Fish', 1, 130, 140, 30, 'S', 'drift', 'r', ['hat:suncrown'], 'eye', '#fefae0'],
  [16, 'Key Fish', 1, 175, 185, 50, 'S', 'drift', 'r', ['hat:suncrown', 'after:15'], 'key', '#ffd60a'],
  [17, 'Wand Fish', 1, 215, 225, 50, 'S', 'drift', 'r', ['hat:suncrown', 'after:16'], 'wand', '#ffc8dd'],
  [18, 'The Big Hello', 1, 250, 260, 500, 'L', 'drift', 'r', ['hat:suncrown', 'after:17'], 'blob', '#ffd166'],
  // Grumble Sea
  [19, 'Wormy', 2, 5, 150, 5, 'S', 'drift', 'c', [], 'worm', '#f4a261'],
  [20, 'Cannonfin', 2, 20, 200, 14, 'S', 'dart', 'c', [], 'fish', '#8d99ae'],
  [21, 'Big Gob', 2, 60, 260, 30, 'M', 'chase', 'c', [], 'gob', '#e76f51'],
  [22, 'Zap Jelly', 2, 30, 500, -10, 'S', 'bob', 'c', [], 'jelly', '#ffee32'],
  [23, 'Puffball', 2, 80, 300, 20, 'S', 'drift', 'c', [], 'puffer', '#f6bd60'],
  [24, 'Mustache Fish', 2, 120, 380, 45, 'M', 'drift', 'u', [], 'fish', '#b5838d'],
  [25, 'Flipper', 2, 100, 350, 40, 'L', 'dart', 'u', [], 'dolphin', '#90a8c3'],
  [26, 'Bluejaw', 2, 50, 250, 23, 'S', 'school', 'c', [], 'fish', '#3a86ff'],
  [27, 'Snapcrab', 2, 200, 480, 45, 'M', 'drift', 'u', [], 'crab', '#ff595e'],
  [28, 'Spooky Crab', 2, 55, 65, 30, 'S', 'drift', 'r', ['midnight'], 'crab', '#e0e1dd'],
  [29, 'Pearl Clam', 2, 250, 480, 190, 'M', 'drift', 'u', [], 'clam', '#cdb4db'],
  [30, 'Jelly King', 2, 490, 500, 2000, 'Boss', 'boss', 'boss', [], 'jking', '#ff70a6'],
  [31, 'Bubble Snail', 2, 10, 120, 12, 'S', 'drift', 'c', [], 'snail', '#a3c4bc'],
  [32, 'Grumpfish', 2, 150, 400, 18, 'M', 'chase', 'c', [], 'fish', '#6d597a'],
  [33, 'Anchor Fish', 2, 300, 480, 60, 'L', 'drift', 'u', [], 'anchor', '#adb5bd'],
  [34, 'Storm Squid', 2, 320, 480, 80, 'M', 'glow', 'r', [], 'squid', '#80ffdb'],
  // Iceberg Alley
  [35, 'Glider Fish', 3, 10, 250, 24, 'S', 'dart', 'c', [], 'glider', '#bde0fe'],
  [36, 'Frost Jelly', 3, 50, 700, -20, 'M', 'bob', 'c', [], 'jelly', '#caf0f8'],
  [37, 'Golden Spike', 3, 200, 600, 100, 'M', 'flee', 'u', [], 'fish', '#ffc300'],
  [38, "Fool's Goldfish", 3, 395, 405, 120, 'S', 'drift', 'v', ['midnight', 'hat:frost', 'suit:pajamas'], 'fish', '#d4a017'],
  [39, 'Blanket Ray', 3, 150, 500, 70, 'L', 'drift', 'u', [], 'ray', '#577590'],
  [40, 'Spikeball', 3, 600, 650, 65, 'S', 'drift', 'v', [], 'urchin', '#9d4edd'],
  [41, 'Dozy Cod', 3, 20, 300, 25, 'M', 'drift', 'c', [], 'fish', '#94a3b8'],
  [42, 'Honk Fish', 3, 100, 450, 30, 'M', 'school', 'c', [], 'goose', '#f8f9fa'],
  [43, 'The Frozen Block', 3, 690, 700, 5000, 'Boss', 'boss', 'boss', ['pre:3'], 'ice', '#a9def9'],
  [44, 'Golden Bloop', 3, 690, 700, 300, 'M', 'drift', 'u', ['post:3'], 'fish', '#ffd700'],
  [45, 'Snow Pup', 3, 10, 200, 15, 'S', 'drift', 'c', [], 'seal', '#e9ecef'],
  [46, 'Icicle Eel', 3, 250, 650, 55, 'M', 'dart', 'u', [], 'eel', '#a2d2ff'],
  [47, 'Penguin Fish', 3, 50, 350, 40, 'M', 'school', 'c', [], 'penguin', '#343a40'],
  [48, 'Walrus Puff', 3, 300, 650, 85, 'L', 'drift', 'u', [], 'puffer', '#b08968'],
  [49, 'Aurora Jelly', 3, 400, 700, -15, 'L', 'glow', 'u', [], 'jelly', '#72efdd'],
  [50, 'Crystal Shrimp', 3, 450, 700, 8, 'S', 'school', 'c', [], 'shrimp', '#ffafcc'],
  // The Whirlpool (endless; zone id 9 since v1.4)
  [51, 'Copycat Fish', 9, 600, I, 35, 'S', 'chase', 'r', ['midnight'], 'fish', '#ff006e'],
  [52, 'Skeleton Fish', 9, 100, I, 110, 'M', 'drift', 'c', [], 'bones', '#f1faee'],
  [53, 'Spikeback', 9, 300, I, 90, 'L', 'drift', 'u', [], 'spikeback', '#588157'],
  [54, 'Star Pal', 9, 50, I, 90, 'S', 'bob', 'c', [], 'star', '#ffbe0b'],
  [55, 'Face Beetle', 9, 400, I, 200, 'M', 'dart', 'u', [], 'beetle', '#8338ec'],
  [56, 'Grin Eel', 9, 200, I, 60, 'M', 'dart', 'u', [], 'eel', '#52b788'],
  [57, 'Void Puff', 9, 300, I, 45, 'S', 'drift', 'c', [], 'puffer', '#5a189a'],
  [58, 'Lantern Lord', 9, 500, I, 150, 'L', 'glow', 'r', [], 'angler', '#fb5607'],
  [59, 'Tangle Squid', 9, 250, I, 75, 'M', 'chase', 'u', [], 'squid', '#c9184a'],
  [60, 'Rocket Fish', 9, 150, I, 130, 'M', 'flee', 'r', [], 'rocket', '#e63946'],
  [61, 'Ghost Fin', 9, 700, I, 95, 'M', 'glow', 'u', [], 'ghost', '#e0fbfc'],
  [62, 'Tooth Swarm', 9, 100, I, 10, 'S', 'school', 'c', [], 'fish', '#adb5bd'],
  [63, 'Whirl Jelly', 9, 50, I, -25, 'M', 'bob', 'c', [], 'jelly', '#00f5d4'],
  [64, 'Deep Diva', 9, 1000, I, 180, 'L', 'drift', 'r', [], 'diva', '#f72585'],
  [65, 'Clock Fish', 9, 1500, I, 250, 'M', 'dart', 'v', [], 'clock', '#ffd166'],
  [66, 'Old Boot Fish', 9, 0, I, 1, 'S', 'drift', 'u', [], 'boot', '#7f5539'],
  // Jellyfish Jungle (v1.4)
  [67, 'Glowbell Jelly', 4, 20, 700, -20, 'M', 'bob', 'c', [], 'jelly', '#7df9ff'],
  [68, 'Lanternfin', 4, 10, 400, 40, 'S', 'school', 'c', [], 'fish', '#b8f2e6'],
  [69, 'Bell Ringer', 4, 100, 600, 70, 'M', 'drift', 'c', [], 'blob', '#ffd6ff'],
  [70, 'Tickle Tentacle', 4, 200, 800, 110, 'M', 'chase', 'u', [], 'squid', '#c77dff'],
  [71, 'Jellyhop Frog', 4, 150, 500, 160, 'S', 'flee', 'r', [], 'frog', '#80ffdb'],
  [72, 'Neon Noodle', 4, 300, 880, 90, 'M', 'dart', 'u', [], 'eel', '#72efdd'],
  [73, 'Puff Pudding', 4, 400, 880, 130, 'L', 'drift', 'u', [], 'puffer', '#ffafcc'],
  [74, 'Wobble Bonnet', 4, 500, 890, -30, 'L', 'glow', 'u', [], 'jelly', '#9bf6ff'],
  [75, 'Queen Jellybelly', 4, 890, 900, 8000, 'Boss', 'boss', 'boss', [], 'jking', '#f15bb5'],
  // Sunken City (v1.4)
  [76, 'Pillar Perch', 5, 20, 500, 50, 'S', 'school', 'c', [], 'fish', '#e9c46a'],
  [77, 'Coin Crab', 5, 100, 700, 90, 'M', 'drift', 'c', [], 'crab', '#ffd166'],
  [78, 'Statue Snapper', 5, 200, 900, 120, 'M', 'chase', 'c', [], 'gob', '#adb5bd'],
  [79, 'Ghost Butler', 5, 400, 1080, 160, 'M', 'glow', 'u', [], 'ghost', '#e0fbfc'],
  [80, 'Treasure Clam', 5, 600, 1080, 280, 'M', 'drift', 'u', [], 'clam', '#f4a261'],
  [81, 'Column Eel', 5, 300, 1000, 140, 'M', 'dart', 'u', [], 'eel', '#ced4da'],
  [82, 'Key Keeper', 5, 700, 1050, 350, 'S', 'flee', 'r', [], 'key', '#ffc300'],
  [83, 'Mosaic Ray', 5, 150, 900, 110, 'L', 'drift', 'u', [], 'ray', '#2a9d8f'],
  [84, 'The Barnacle King', 5, 1090, 1100, 12000, 'Boss', 'boss', 'boss', [], 'whale', '#6d6875'],
  // Volcano Deep (v1.4)
  [85, 'Ember Minnow', 6, 20, 600, 60, 'S', 'school', 'c', [], 'fish', '#ff7b00'],
  [86, 'Hothead Puff', 6, 100, 900, 120, 'M', 'chase', 'c', [], 'puffer', '#e85d04'],
  [87, 'Sizzle Crab', 6, 200, 1100, 150, 'M', 'drift', 'c', [], 'crab', '#d00000'],
  [88, 'Steam Squid', 6, 300, 1200, 180, 'M', 'dart', 'u', [], 'squid', '#ffba08'],
  [89, 'Smoky Snail', 6, 50, 700, 70, 'S', 'drift', 'c', [], 'snail', '#6c757d'],
  [90, 'Cinder Eel', 6, 500, 1280, 200, 'M', 'dart', 'u', [], 'eel', '#ff4d00'],
  [91, 'Fizzy Fire Jelly', 6, 150, 1280, -40, 'M', 'bob', 'c', [], 'jelly', '#ff9e00'],
  [92, 'Grill Fish', 6, 800, 1280, 420, 'L', 'flee', 'r', [], 'fish', '#9d0208'],
  [93, 'Magmamaw', 6, 1290, 1300, 18000, 'Boss', 'boss', 'boss', [], 'gob', '#dc2f02'],
  // Moonlight Trench (v1.4): two night-only species
  [94, 'Lantern Larry', 7, 50, 900, 90, 'M', 'glow', 'c', [], 'angler', '#ffd166'],
  [95, 'Moon Moth Fish', 7, 100, 1200, 130, 'M', 'drift', 'c', [], 'fish', '#cdb4db'],
  [96, 'Hush Jelly', 7, 100, 1590, -50, 'M', 'bob', 'c', [], 'jelly', '#bdb2ff'],
  [97, 'Googly Goblin', 7, 300, 1400, 200, 'M', 'chase', 'u', [], 'gob', '#5e60ce'],
  [98, 'Wishbone Fish', 7, 600, 1590, 260, 'M', 'drift', 'u', [], 'bones', '#e0e1dd'],
  [99, 'Starlight Seahorse', 7, 200, 1000, 220, 'S', 'drift', 'r', ['night'], 'horse', '#fff3b0'],
  [100, 'Midnight Muncher', 7, 700, 1590, 380, 'L', 'dart', 'r', ['night'], 'ghost', '#3a0ca3'],
  [101, 'Sleepy Stargazer', 7, 400, 1500, 180, 'M', 'drift', 'u', [], 'star', '#ffbe0b'],
  [102, 'Old Moonbeam', 7, 1590, 1600, 25000, 'Boss', 'boss', 'boss', [], 'diva', '#a9def9'],
  // Dragon's Deep (v1.4): the final boss's lair
  [103, 'Scale Scamp', 8, 50, 1000, 120, 'S', 'school', 'c', [], 'fish', '#e63946'],
  [104, 'Smoke Puff', 8, 100, 1400, 160, 'M', 'drift', 'c', [], 'puffer', '#6a4c93'],
  [105, 'Hoard Beetle', 8, 300, 1700, 260, 'M', 'chase', 'u', [], 'beetle', '#ffb703'],
  [106, 'Wing Fin', 8, 200, 1500, 200, 'L', 'dart', 'u', [], 'ray', '#bc4749'],
  [107, 'Dragonet Noodle', 8, 500, 1900, 320, 'M', 'dart', 'u', [], 'eel', '#2d6a4f'],
  [108, 'Snort Seahorse', 8, 700, 1990, 380, 'M', 'flee', 'r', [], 'horse', '#ff006e'],
  [109, 'Spark Jelly', 8, 100, 1990, -60, 'M', 'glow', 'c', [], 'jelly', '#fb8500'],
  [110, 'Gold Tooth Grouper', 8, 1000, 1990, 600, 'L', 'chase', 'r', [], 'gob', '#ffd60a'],
  [111, 'Grandpa Dragonfish', 8, 1990, 2000, 40000, 'Boss', 'boss', 'boss', [], 'whale', '#c1121f'],
];

export const RADIUS = { S: 16, M: 24, L: 34, Boss: 80 };
export const HP = { S: 1, M: 2, L: 3 };
export const BOSS_HP = { 13: 20, 30: 30, 43: 40, 75: 50, 84: 60, 93: 75, 102: 90, 111: 120 };
// v1.4: regular fish get tougher with the zone (zones 1-3 and the Whirlpool unchanged). [TUNE]
export const ZONE_HP = { 4: 1, 5: 1, 6: 2, 7: 2, 8: 3 };

export const SPECIES = ROWS.map(([id, name, zone, dMin, dMax, value, size, beh, rarity, cond, shape, color]) => ({
  id, name, zone, dMin, dMax, value, size, beh, rarity, cond, shape, color,
  r: RADIUS[size], hp: BOSS_HP[id] ?? HP[size] + (ZONE_HP[zone] || 0), jelly: shape === 'jelly',
}));
export const BY_ID = new Map(SPECIES.map((s) => [s.id, s]));
