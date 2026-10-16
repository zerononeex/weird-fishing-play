// Shop data (GAME_SPEC §5). Prices are the original 2013 values; payouts get CASH_MULTIPLIER instead.
import { CONFIG } from '../config.js';
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
import { SPECIES } from './fish.js';
import { FINAL_ZONE } from './zones.js';
// Lines, shortest first. Ids are save data: line1-line6 are the v1.0 ids (line6 = Forever Reel), v1.4 inserts
// line7-line11 (900-2000 m) between the 700 m Line and the Forever Reel, which stays the last and priciest. [TUNE]
const L = (id, price, m, prev) => ({ id, cat: 'lines', name: m === Infinity ? 'Forever Reel' : `${m.toLocaleString('en-US')} m Line`, price, req: prev ? [prev] : [], line: m,
  desc: m === Infinity ? 'Endless line for The Whirlpool' : `Fish down to ${m.toLocaleString('en-US')} m` });
const LINE_ROWS = [['line1', 40, 100], ['line2', 250, 200], ['line3', 500, 300], ['line4', 2000, 500], ['line5', 7000, 700],
  ['line7', 12000, 900], ['line8', 20000, 1100], ['line9', 32000, 1300], ['line10', 50000, 1600], ['line11', 80000, 2000],
  ['line6', 120000, Infinity]];
export const LINE_ITEMS = LINE_ROWS.map(([id, price, m], i) => L(id, price, m, LINE_ROWS[i - 1]?.[0]));
// Wear abilities (GAME_SPEC §10.B): exactly one per hat/outfit. cashPct/launchPct/sawFuelPct are percent
// numbers; fallSlow is a gravity multiplier during SHOOT.
const A = (kind, value) => ({ kind, value });
export function abilityText({ kind, value }) {
  if (kind === 'cashPct') return `+${value}% cash`;
  if (kind === 'fallSlow') return `Fall slows ${Math.round((1 - value) * 100)}%`;
  if (kind === 'launchPct') return `Fish fly ${value}% higher`;
  if (kind === 'sawFuelPct') return `+${value}% saw fuel`;
  return '';
}
const reached = (zone, m, label) => (slot) => ((slot.bestDepth[zone] || 0) >= m ? '' : `Reach ${m.toLocaleString('en-US')} m in ${label}`);
const finalBeaten = (s) => !!s.flags.bossBeaten;
// Start-depth items (GAME_SPEC §5, v1.4 §13): start = [zone, depth]; buyable after reaching that depth once in the zone.
const S = (id, name, price, zone, m, label) => ({ id, cat: 'lures', name, price, req: [], start: [zone, m], need: reached(zone, m, label), desc: `Start ${label} at ${m.toLocaleString('en-US')} m` });

export const ITEMS = [
  ...LINE_ITEMS,
  ...GUNS.filter((g) => g.price > 0).map((g) => ({ id: g.id, cat: 'guns', name: g.name, price: g.price, req: g.req,
    desc: `${+(g.rate * CONFIG.GUN_RATE_MULT).toFixed(1)}/s · ${g.damage} dmg${g.pellets > 1 ? ` · ${g.pellets} pellets` : ''}` })),
  { id: 'chainsaw', cat: 'lures', name: 'Chainsaw Lure', price: 120, req: [], desc: 'Hold to saw through fish' },
  { id: 'fuel1', cat: 'lures', name: 'Fuel Can', price: 800, req: ['chainsaw'], desc: '+2 s of saw fuel' },
  { id: 'fuel2', cat: 'lures', name: 'Mega Fuel Can', price: 8000, req: ['fuel1'], desc: '+5 s of saw fuel' },
  { id: 'turbo', cat: 'lures', name: 'Turbo Saw', price: 1200, req: ['chainsaw'], desc: 'Bigger, faster saw' },
  { id: 'float', cat: 'lures', name: 'Float Saw', price: 1800, req: ['turbo'], desc: 'Hold to rise slowly' },
  { id: 'gizmo', cat: 'lures', name: 'Gizmo Lure', price: 10000, req: ['float'], desc: 'Sinks fast, rises slow, auto-blades' },
  { id: 'lamp', cat: 'lures', name: 'Lamp', price: 600, req: [], desc: 'Light for Puddle Bay & Grumble Sea' },
  { id: 'biglamp', cat: 'lures', name: 'Big Lamp', price: 4000, req: ['lamp'], desc: 'Lights up every sea' },
  { id: 'spring', cat: 'lures', name: 'Spring', price: 600, req: [], desc: 'Fish fly higher' },
  { id: 'antigrav', cat: 'lures', name: 'Antigravity', price: 65000, req: ['spring'], desc: 'Fish fall slower' },
  { id: 'knife', cat: 'lures', name: 'Knife', price: 100, req: [], desc: 'Cut the line and start over' },
  { id: 'dex', cat: 'lures', name: 'Fish-o-pedia', price: 30, req: [], desc: 'Your fish collection book' },
  S('boot', 'Old Boot', 1000, 1, 100, 'Puddle Bay'),
  S('ball', 'Bowling Ball', 5500, 2, 200, 'Grumble Sea'),
  S('drum', 'Oil Drum', 140000, 3, 300, 'Iceberg Alley'),
  S('anvil', 'Anvil', 180000, 4, 700, 'Jellyfish Jungle'),
  S('chest', 'Treasure Chest', 240000, 5, 900, 'Sunken City'),
  S('leadboots', 'Lead Boots', 320000, 6, 1100, 'Volcano Deep'),
  S('piano', 'Grand Piano', 420000, 7, 1400, 'Moonlight Trench'),
  S('anchor', "Ship's Anchor", 550000, 8, 1800, "Dragon's Deep"),
  // Hook Charms (GAME_SPEC §10.E): equip one. charges = zaps per dive (refill every cast); all = each zap hits
  // every visible fish; bonus = pay × for zapped fish; magnet = ascent pull radius (px). [TUNE]
  { id: 'charm_toaster', cat: 'charms', name: 'Toaster Charm', price: 900, req: [], charm: { charges: 2 }, desc: 'Zaps 2 fish you bump' },
  { id: 'charm_hairdryer', cat: 'charms', name: 'Hairdryer Charm', price: 2300, req: ['charm_toaster'], charm: { charges: 3 }, desc: 'Zaps 3 fish you bump' },
  { id: 'charm_magnet', cat: 'charms', name: 'Magnet Charm', price: 3500, req: [], charm: { magnet: 90 }, desc: 'Reeling up pulls close fish in' },
  { id: 'charm_lucky', cat: 'charms', name: 'Lucky Charm', price: 6000, req: [], charm: { charges: 2, bonus: 2 }, desc: '2 zaps · zapped fish pay double' },
  { id: 'charm_storm', cat: 'charms', name: 'Storm Coil Charm', price: 12000, req: ['charm_hairdryer'], charm: { charges: 2, all: true }, desc: '2 zaps · each hits every fish on screen' },
  { id: 'vest', cat: 'wear', name: 'Fancy Vest', price: 1200, req: [], outfit: true, ability: A('cashPct', 10), desc: 'Smart and shiny' },
  { id: 'robe', cat: 'wear', name: 'Star Robe', price: 6000, req: [], outfit: true, ability: A('cashPct', 20), desc: 'Twinkly wizard wear' },
  { id: 'pajamas', cat: 'wear', name: "King's Pajamas", price: 30000, req: [], outfit: true, ability: A('cashPct', 50), desc: 'Fit for a fish king' },
  { id: 'fancap', cat: 'wear', name: 'Fan Cap', price: 100, req: [], hat: true, ability: A('cashPct', 5), need: (s) => (Object.keys(s.dex).length >= SPECIES.length ? '' : `Find all ${SPECIES.length} fish`), desc: 'For true fish fans' },
  { id: 'captain', cat: 'wear', name: 'Captain Hat', price: 10000, req: [], hat: true, ability: A('fallSlow', 0.9), desc: 'Very official' },
  { id: 'safari', cat: 'wear', name: 'Safari Hat', price: 10000, req: [], hat: true, ability: A('launchPct', 15), desc: 'Ready for adventure' },
  { id: 'paperhat', cat: 'wear', name: 'Paper Boat Hat', price: 80000, req: [], hat: true, ability: A('fallSlow', 0.8), desc: 'Folded with love' },
  { id: 'pirate', cat: 'wear', name: 'Pirate Hat', price: 80000, req: [], hat: true, ability: A('cashPct', 25), desc: 'Arr!' },
  { id: 'frost', cat: 'wear', name: 'Frost Beanie', price: 0, req: [], hat: true, gift: true, ability: A('fallSlow', 0.9), need: (s) => (finalBeaten(s) ? '' : `A gift for beating the boss of ${FINAL_ZONE.name}`), desc: 'Cosy! Some fish love it' },
  { id: 'suncrown', cat: 'wear', name: 'Sun Crown', price: 20000, req: [], hat: true, ability: A('cashPct', 15), need: (s) => (finalBeaten(s) ? '' : `Beat the boss of ${FINAL_ZONE.name}`), desc: 'Peeper Fish are curious…' },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const TABS = [['lines', 'Lines'], ['guns', 'Guns'], ['lures', 'Lures'], ['charms', 'Charms'], ['wear', 'Wear']];
export const CHARMS = ITEMS.filter((i) => i.charm);
