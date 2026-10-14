// Shop data (GAME_SPEC §5). Prices are the original 2013 values; payouts get CASH_MULTIPLIER instead.
// Guns differ ONLY by rate (shots/s), damage, pellets and spread (px radius). [TUNE]
export const GUNS = [
  { id: 'pistol', name: 'Pea Pistol', price: 0, req: [], rate: 5, damage: 1, pellets: 1, spread: 0 },
  { id: 'shotgun', name: 'Boom Shotgun', price: 200, req: [], rate: 1.6, damage: 1, pellets: 6, spread: 46 },
  { id: 'blunder', name: 'Blunder Buster', price: 300, req: ['shotgun'], rate: 1.2, damage: 2, pellets: 7, spread: 60 },
  { id: 'smg', name: 'Buzz SMG', price: 580, req: [], rate: 12, damage: 0.5, pellets: 1, spread: 14 },
  { id: 'twinsmg', name: 'Twin Buzz', price: 1700, req: ['smg'], rate: 12, damage: 0.5, pellets: 2, spread: 22 },
  { id: 'spinner', name: 'Spinner', price: 2600, req: ['smg'], rate: 22, damage: 0.6, pellets: 1, spread: 20 },
  { id: 'cannon', name: 'Hand Cannon', price: 3000, req: [], rate: 3, damage: 4, pellets: 1, spread: 0 },
  { id: 'beam', name: 'Sky Beam', price: 10000, req: [], rate: 8, damage: 1.5, pellets: 3, spread: 30 },
  { id: 'autoboom', name: 'Auto Boomer', price: 12500, req: ['blunder'], rate: 4, damage: 1, pellets: 6, spread: 48 },
  { id: 'twinspin', name: 'Twin Spinners', price: 20000, req: ['spinner'], rate: 22, damage: 0.6, pellets: 2, spread: 30 },
  { id: 'bazooka', name: 'Big Bazooka', price: 50000, req: [], rate: 2.5, damage: 10, pellets: 1, spread: 10 },
];
export const GUN = Object.fromEntries(GUNS.map((g) => [g.id, g]));

// Everything for sale (GAME_SPEC §5). cat = shop tab; need(slot) = extra unlock rule (returns '' when met).
const L = (tier, price, m) => ({ id: 'line' + tier, cat: 'lines', name: m === Infinity ? 'Forever Reel' : `${m} m Line`, price, req: tier > 1 ? ['line' + (tier - 1)] : [], line: m,
  desc: m === Infinity ? 'Endless line for The Whirlpool' : `Fish down to ${m} m` });
const reached = (zone, m, label) => (slot) => ((slot.bestDepth[zone] || 0) >= m ? '' : `Reach ${m} m in ${label}`);

export const ITEMS = [
  L(1, 40, 100), L(2, 250, 200), L(3, 500, 300), L(4, 2000, 500), L(5, 7000, 700), L(6, 20000, Infinity),
  ...GUNS.filter((g) => g.price > 0).map((g) => ({ id: g.id, cat: 'guns', name: g.name, price: g.price, req: g.req,
    desc: `${g.rate}/s · ${g.damage} dmg${g.pellets > 1 ? ` · ${g.pellets} pellets` : ''}` })),
  { id: 'chainsaw', cat: 'lures', name: 'Chainsaw Lure', price: 120, req: [], desc: 'Hold to saw through fish' },
  { id: 'fuel1', cat: 'lures', name: 'Fuel Can', price: 800, req: ['chainsaw'], desc: '+2 s of saw fuel' },
  { id: 'fuel2', cat: 'lures', name: 'Mega Fuel Can', price: 8000, req: ['fuel1'], desc: '+5 s of saw fuel' },
  { id: 'turbo', cat: 'lures', name: 'Turbo Saw', price: 1200, req: ['chainsaw'], desc: 'Bigger, faster saw' },
  { id: 'float', cat: 'lures', name: 'Float Saw', price: 1800, req: ['turbo'], desc: 'Hold to rise slowly' },
  { id: 'gizmo', cat: 'lures', name: 'Gizmo Lure', price: 10000, req: ['float'], desc: 'Sinks fast, rises slow, auto-blades' },
  { id: 'toaster', cat: 'lures', name: 'Toaster', price: 900, req: [], desc: 'Zaps the first fish you bump' },
  { id: 'hairdryer', cat: 'lures', name: 'Hairdryer', price: 2300, req: ['toaster'], desc: 'Zaps a second bump' },
  { id: 'coil', cat: 'lures', name: 'Zap Coil', price: 12000, req: ['hairdryer'], desc: 'Zaps every fish on screen' },
  { id: 'lamp', cat: 'lures', name: 'Lamp', price: 600, req: [], desc: 'Light for Puddle Bay & Grumble Sea' },
  { id: 'biglamp', cat: 'lures', name: 'Big Lamp', price: 4000, req: ['lamp'], desc: 'Lights up every sea' },
  { id: 'spring', cat: 'lures', name: 'Spring', price: 600, req: [], desc: 'Fish fly higher' },
  { id: 'antigrav', cat: 'lures', name: 'Antigravity', price: 65000, req: ['spring'], desc: 'Fish fall slower' },
  { id: 'knife', cat: 'lures', name: 'Knife', price: 100, req: [], desc: 'Cut the line and start over' },
  { id: 'dex', cat: 'lures', name: 'Fish-o-pedia', price: 30, req: [], desc: 'Your fish collection book' },
  { id: 'boot', cat: 'lures', name: 'Old Boot', price: 1000, req: [], start: [1, 100], need: reached(1, 100, 'Puddle Bay'), desc: 'Start Puddle Bay at 100 m' },
  { id: 'ball', cat: 'lures', name: 'Bowling Ball', price: 5500, req: [], start: [2, 200], need: reached(2, 200, 'Grumble Sea'), desc: 'Start Grumble Sea at 200 m' },
  { id: 'drum', cat: 'lures', name: 'Oil Drum', price: 140000, req: [], start: [3, 300], need: reached(3, 300, 'Iceberg Alley'), desc: 'Start Iceberg Alley at 300 m' },
  { id: 'vest', cat: 'wear', name: 'Fancy Vest', price: 1200, req: [], outfit: true, desc: '+10% fish money' },
  { id: 'robe', cat: 'wear', name: 'Star Robe', price: 6000, req: [], outfit: true, desc: '+20% fish money' },
  { id: 'pajamas', cat: 'wear', name: "King's Pajamas", price: 30000, req: [], outfit: true, desc: '+50% fish money' },
  { id: 'fancap', cat: 'wear', name: 'Fan Cap', price: 100, req: [], hat: true, need: (s) => (Object.keys(s.dex).length >= 66 ? '' : 'Find all 66 fish'), desc: 'For true fish fans' },
  { id: 'captain', cat: 'wear', name: 'Captain Hat', price: 10000, req: [], hat: true, desc: 'Very official' },
  { id: 'safari', cat: 'wear', name: 'Safari Hat', price: 10000, req: [], hat: true, desc: 'Ready for adventure' },
  { id: 'paperhat', cat: 'wear', name: 'Paper Boat Hat', price: 80000, req: [], hat: true, desc: 'Folded with love' },
  { id: 'pirate', cat: 'wear', name: 'Pirate Hat', price: 80000, req: [], hat: true, desc: 'Arr!' },
  { id: 'frost', cat: 'wear', name: 'Frost Beanie', price: 0, req: [], hat: true, gift: true, need: (s) => (s.flags.bossBeaten ? '' : 'A gift for beating the final boss'), desc: 'Cosy! Some fish love it' },
  { id: 'suncrown', cat: 'wear', name: 'Sun Crown', price: 20000, req: [], hat: true, need: (s) => (s.flags.bossBeaten ? '' : 'Beat the final boss'), desc: 'Peeper Fish are curious…' },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const TABS = [['lines', 'Lines'], ['guns', 'Guns'], ['lures', 'Lures'], ['wear', 'Wear']];
