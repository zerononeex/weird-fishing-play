// The 66 Weird Fishing species (GAME_SPEC §4.5). All names are original.
// [id, name, zone, dMin, dMax, value, size, behaviour, rarity, conditions, shape, colour]
// rarity: c common · u uncommon · r rare · v very rare · boss
// conditions: day · night · midnight · post (after final boss) · pre (before it) ·
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
  [43, 'The Frozen Block', 3, 690, 700, 5000, 'Boss', 'boss', 'boss', ['pre'], 'ice', '#a9def9'],
  [44, 'Golden Bloop', 3, 690, 700, 300, 'M', 'drift', 'u', ['post'], 'fish', '#ffd700'],
  [45, 'Snow Pup', 3, 10, 200, 15, 'S', 'drift', 'c', [], 'seal', '#e9ecef'],
  [46, 'Icicle Eel', 3, 250, 650, 55, 'M', 'dart', 'u', [], 'eel', '#a2d2ff'],
  [47, 'Penguin Fish', 3, 50, 350, 40, 'M', 'school', 'c', [], 'penguin', '#343a40'],
  [48, 'Walrus Puff', 3, 300, 650, 85, 'L', 'drift', 'u', [], 'puffer', '#b08968'],
  [49, 'Aurora Jelly', 3, 400, 700, -15, 'L', 'glow', 'u', [], 'jelly', '#72efdd'],
  [50, 'Crystal Shrimp', 3, 450, 700, 8, 'S', 'school', 'c', [], 'shrimp', '#ffafcc'],
  // The Whirlpool (endless)
  [51, 'Copycat Fish', 4, 600, I, 35, 'S', 'chase', 'r', ['midnight'], 'fish', '#ff006e'],
  [52, 'Skeleton Fish', 4, 100, I, 110, 'M', 'drift', 'c', [], 'bones', '#f1faee'],
  [53, 'Spikeback', 4, 300, I, 90, 'L', 'drift', 'u', [], 'spikeback', '#588157'],
  [54, 'Star Pal', 4, 50, I, 90, 'S', 'bob', 'c', [], 'star', '#ffbe0b'],
  [55, 'Face Beetle', 4, 400, I, 200, 'M', 'dart', 'u', [], 'beetle', '#8338ec'],
  [56, 'Grin Eel', 4, 200, I, 60, 'M', 'dart', 'u', [], 'eel', '#52b788'],
  [57, 'Void Puff', 4, 300, I, 45, 'S', 'drift', 'c', [], 'puffer', '#5a189a'],
  [58, 'Lantern Lord', 4, 500, I, 150, 'L', 'glow', 'r', [], 'angler', '#fb5607'],
  [59, 'Tangle Squid', 4, 250, I, 75, 'M', 'chase', 'u', [], 'squid', '#c9184a'],
  [60, 'Rocket Fish', 4, 150, I, 130, 'M', 'flee', 'r', [], 'rocket', '#e63946'],
  [61, 'Ghost Fin', 4, 700, I, 95, 'M', 'glow', 'u', [], 'ghost', '#e0fbfc'],
  [62, 'Tooth Swarm', 4, 100, I, 10, 'S', 'school', 'c', [], 'fish', '#adb5bd'],
  [63, 'Whirl Jelly', 4, 50, I, -25, 'M', 'bob', 'c', [], 'jelly', '#00f5d4'],
  [64, 'Deep Diva', 4, 1000, I, 180, 'L', 'drift', 'r', [], 'diva', '#f72585'],
  [65, 'Clock Fish', 4, 1500, I, 250, 'M', 'dart', 'v', [], 'clock', '#ffd166'],
  [66, 'Old Boot Fish', 4, 0, I, 1, 'S', 'drift', 'u', [], 'boot', '#7f5539'],
];

export const RADIUS = { S: 16, M: 24, L: 34, Boss: 80 };
export const HP = { S: 1, M: 2, L: 3 };
export const BOSS_HP = { 13: 20, 30: 30, 43: 40 };

export const SPECIES = ROWS.map(([id, name, zone, dMin, dMax, value, size, beh, rarity, cond, shape, color]) => ({
  id, name, zone, dMin, dMax, value, size, beh, rarity, cond, shape, color,
  r: RADIUS[size], hp: BOSS_HP[id] ?? HP[size], jelly: shape === 'jelly',
}));
export const BY_ID = new Map(SPECIES.map((s) => [s.id, s]));
