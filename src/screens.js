// Menu-style screens: shop, payout, ending, Fish book, kid slots. The dock + title scene live in dock.js.
import { CONFIG } from './config.js';
import { G } from './game.js';
import { addButton, inPanel, PANEL_W } from './ui.js';
import { drawSea, text, rr, drawBoat } from './draw.js';
import { wearDrawer } from './icons.js';
import { ZONES } from './data/zones.js';
import { canBuy, buy, equip, owns, isEquipped } from './economy.js';
import { ITEMS, TABS, GUN, abilityText } from './data/shop.js';
import { drawItemIcon } from './icons.js';
import { SPECIES } from './data/fish.js';
import { settleRun } from './settle.js';
import { sfx } from './audio.js';
import { PRESET_NAMES, PRESET_COLORS, freshSlot } from './save.js';
import { drawFish, drawFishSprite, fishArtPath, GOLD_INK } from './fishart.js';
import { goldenCount } from './economy.js';
import { BY_ID } from './data/fish.js';
import { FINAL_BOSS } from './data/zones.js';
import { art } from './art.js';
import { codeUI, openExport, openImport, pickSlot } from './codeui.js';

// v1.4.2: every screen here is a text panel. It keeps its designed PANEL_W (540) layout, centred in the live
// canvas width (inPanel); only its sea background spans the full CONFIG.W.
const W = PANEL_W;
const centred = (top, bottom, body) => function (ctx, t) { drawSea(ctx, top, bottom, 0, t); inPanel(ctx, () => body.call(this, ctx, t)); };

export function bigButton(ctx, x, y, w, h, label, onTap, opts = {}) {
  const b = addButton({ x, y, w, h, onTap, disabled: opts.disabled, label, silent: opts.silent });
  ctx.fillStyle = opts.disabled ? 'rgba(255,255,255,0.18)' : opts.color || '#ffd166';
  rr(ctx, x, y, w, h, Math.min(24, h / 3)); ctx.fill();
  ctx.strokeStyle = 'rgba(0,30,50,0.35)'; ctx.lineWidth = 4; ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2, opts.size || Math.min(40, h * 0.42), opts.disabled ? '#cfe9ff' : opts.ink || '#4a2c00');
  return b;
}

const money = (n) => '$' + Math.round(n).toLocaleString();

// ---- shop ----
const PER_PAGE = 6;
const shopState = { tab: 'lines', page: 0 };
const PISTOL = { id: 'pistol', cat: 'guns', name: GUN.pistol.name, price: 0, req: [], desc: 'Your trusty starter' };
const itemsOf = (tab) => (tab === 'guns' ? [PISTOL] : []).concat(ITEMS.filter((i) => i.cat === tab));

function action(slot, it) {
  const equipable = it.cat === 'guns' || it.hat || it.outfit || it.start || it.charm;
  if (it.id === 'pistol' || owns(slot, it.id)) {
    if (!equipable) return { label: 'OWNED', disabled: true };
    return isEquipped(slot, it) ? { label: 'EQUIPPED', color: '#ffd166', tap: () => it.cat !== 'guns' && equip(slot, it) && sfx.equip() }
      : { label: 'EQUIP', color: '#bde0fe', tap: () => { equip(slot, it); sfx.equip(); } };
  }
  const why = canBuy(slot, it);
  return why ? { label: money(it.price), disabled: true, why }
    : { label: `BUY ${money(it.price)}`, color: '#8ac926', tap: () => { buy(slot, it); sfx.buy(); } };
}

export const shopLines = (it, why) => (it.ability ? [abilityText(it.ability), why || it.desc] : [why || it.desc]);

G.scenes.shop = {
  steers: false,
  render: centred([140, 200, 160], [30, 80, 70], function (ctx, t) {
    const slot = G.slot;
    text(ctx, 'SHOP', W / 2, 60, 48);
    text(ctx, money(slot.cash), W / 2, 112, 30, '#ffe066');
    bigButton(ctx, 16, 28, 110, 70, 'BACK', () => { sfx.close(); G.go('back'); }, { color: '#e9ecef', size: 24, silent: true });
    const tw = (W - 24) / TABS.length;
    TABS.forEach(([id, label], i) => {
      bigButton(ctx, 12 + i * tw, 150, tw - 4, 72, label, () => { shopState.tab = id; shopState.page = 0; },
        { color: shopState.tab === id ? '#ffd166' : '#cfe9ff', size: 20 });
    });
    const list = itemsOf(shopState.tab), pages = Math.ceil(list.length / PER_PAGE);
    shopState.page = Math.min(shopState.page, pages - 1);
    list.slice(shopState.page * PER_PAGE, shopState.page * PER_PAGE + PER_PAGE).forEach((it, i) => {
      const y = 240 + i * 100;
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; rr(ctx, 16, y, W - 32, 90, 16); ctx.fill();
      drawItemIcon(ctx, it, 62, y + 45);
      const a = action(slot, it), lines = shopLines(it, a.why);
      if (lines.length === 2) {   // wear: name · ability (gold) · note
        text(ctx, it.name, 106, y + 20, 22, '#fff', 'left');
        text(ctx, lines[0], 106, y + 46, 18, '#ffe066', 'left');
        text(ctx, lines[1], 106, y + 71, 14, a.why ? '#ffd6a5' : '#e0f2ff', 'left', '600');
      } else {
        text(ctx, it.name, 106, y + 28, 24, '#fff', 'left');
        text(ctx, lines[0], 106, y + 62, 16, a.why ? '#ffd6a5' : '#e0f2ff', 'left', '600');
      }
      bigButton(ctx, W - 186, y + 14, 160, 62, a.label, () => { a.tap?.(); G.persist(); },
        { disabled: a.disabled, color: a.color, size: a.label.length > 9 ? 18 : 22, silent: !!a.tap });
      if (a.disabled && a.why) addButton({ x: W - 186, y: y + 14, w: 160, h: 62, onTap: () => sfx.error(), label: 'why' + it.id, silent: true });
    });
    if (pages > 1) {
      bigButton(ctx, 30, 860, 140, 80, '◀', () => { shopState.page = (shopState.page + pages - 1) % pages; }, { color: '#cfe9ff' });
      bigButton(ctx, W - 170, 860, 140, 80, '▶', () => { shopState.page = (shopState.page + 1) % pages; }, { color: '#cfe9ff' });
      text(ctx, `${shopState.page + 1} / ${pages}`, W / 2, 900, 26);
    }
  }),
};

let tally = 0, after = 0;
export const payoutDrawn = { hero: null, rows: [] }; // which sprite art the payout actually drew (smoke test)
const HERO = 180, ROW_Y = 378, ROW_H = 54, ROWS = 6;

G.scenes.payout = {
  steers: false,
  enter() {
    G.payout = settleRun(G.slot, G.run, G.shoot); tally = 0; after = 0; G.persist(); if (!G.payout.rows.length) sfx.noCatch();
    for (const r of G.payout.rows) art(fishArtPath(r.sp)); // make sure every sprite is loading
  },
  update(dt) {
    const p = G.payout, was = after;
    if (tally < 1) { tally = Math.min(1, tally + dt / 1.5); if (p.total > 0) sfx.tally(); return; }
    after += dt; // after the tally: fanfare, then new species, then zone unlocks
    const at = (s) => was < s && after >= s;
    if (at(0.01) && p.total > 0) sfx.tada();
    if (at(0.6) && p.newSpecies.length) sfx.newSpecies();
    if (at(1.3) && p.opened.length) sfx.zoneUnlock();
  },
  render: centred([120, 210, 245], [20, 90, 140], function (ctx, t) {
    const p = G.payout, h = p.hero;
    text(ctx, p.rows.length ? 'NICE CATCH!' : 'No fish this time!', W / 2, h ? 52 : 90, h ? 44 : 48);
    payoutDrawn.hero = null; payoutDrawn.rows = [];
    if (h) { // hero: the run's most valuable fish, big, popping in
      const cy = 178, k = Math.min(1, 0.5 + tally * 3), bob = Math.sin(t * 2.5) * 5;
      const glow = ctx.createRadialGradient(W / 2, cy, 10, W / 2, cy, HERO * 0.62);
      glow.addColorStop(0, 'rgba(255,240,170,0.75)'); glow.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(W / 2, cy, HERO * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(W / 2, cy + bob); ctx.scale(k, k);
      if (drawFishSprite(ctx, h.sp, 0, 0, HERO, t, h.golden)) payoutDrawn.hero = h.art;
      ctx.restore();
      text(ctx, h.golden ? `Golden ${h.sp.name}` : h.sp.name, W / 2, 292, 32, h.golden ? GOLD_INK : '#fff');
      text(ctx, `${h.pay < 0 ? '-' : ''}$${Math.abs(Math.round(h.pay)).toLocaleString()}`, W / 2, 330, 28, h.pay < 0 ? '#ff8fa3' : '#ffe066');
    }
    const shown = p.rows.slice(0, ROWS);
    shown.forEach((r, i) => {
      const y = ROW_Y + i * ROW_H, k = Math.min(1, Math.max(0, tally * shown.length - i));
      if (k <= 0) return;
      ctx.globalAlpha = k;
      ctx.fillStyle = r.golden ? 'rgba(255,210,63,0.35)' : 'rgba(255,255,255,0.18)'; rr(ctx, 30, y - 24, W - 60, 48, 14); ctx.fill();
      if (r.golden) { ctx.strokeStyle = GOLD_INK; ctx.lineWidth = 3; ctx.stroke(); }
      if (drawFishSprite(ctx, r.sp, 74, y, 46, t, r.golden)) payoutDrawn.rows.push(r.art);
      const name = `${r.golden ? 'Golden ' : ''}${r.sp.name}${r.n > 1 ? ' ×' + r.n : ''}`;
      text(ctx, name, 110, y, name.length > 24 ? 17 : 22, r.golden ? GOLD_INK : '#fff', 'left');
      if (r.golden) text(ctx, `${r.mult}× pay!`, W - 50, y - 15, 13, '#fff6c2', 'right');
      text(ctx, `${r.pay < 0 ? '-' : ''}$${Math.abs(Math.round(r.pay)).toLocaleString()}`, W - 50, y + (r.golden ? 7 : 0), r.golden ? 20 : 24, r.pay < 0 ? '#ff8fa3' : '#ffe066', 'right');
      ctx.globalAlpha = 1;
    });
    if (p.rows.length > shown.length) text(ctx, `+ ${p.rows.length - shown.length} more kinds`, W / 2, ROW_Y + ROWS * ROW_H - 14, 20, '#cfe9ff');
    payoutDrawn.golden = p.rows.filter((r) => r.golden).length;
    if (p.lost) text(ctx, `${p.lost} got away`, W / 2, 710, 20, '#cfe9ff');
    const news = [p.newSpecies.length && `${p.newSpecies.length} new for your fish book!`, ...p.opened.map((z) => `${z.name} is open!`)].filter(Boolean);
    news.forEach((n, i) => text(ctx, n, W / 2, 742 + i * 28 - (news.length - 1) * 14, 22, '#b9fbc0'));
    text(ctx, `+$${Math.round(p.total * tally).toLocaleString()}`, W / 2, 800, 52, '#ffe066');
    text(ctx, `Wallet: $${G.slot.cash.toLocaleString()}`, W / 2, 850, 24, '#fff');
    bigButton(ctx, 120, 870, 300, 76, tally < 1 ? 'SKIP' : 'OK', () => {
      if (tally < 1) { tally = 1; return; }
      if (p.bossLanded) ending.story = p.story;
      G.go(p.bossLanded ? 'bossLanded' : 'done');
    });
  }),
};

// ---- ending: an original, gentle 3-panel comic ----
// v1.4: two stories. 'ice' plays the first time the Frozen Block (#43) is landed (the penguin buddy joins);
// the final one plays the first time Grandpa Dragonfish (the Dragon's Deep boss) is landed (the Whirlpool opens).
const ICE = SPECIES[42], PENGUIN = SPECIES[46];
export const ending = { story: FINAL_BOSS };
let comic = 0;
const STORIES = {
  43: { lines: ['Something big and cold is on the line!', 'The warm sun melts the ice… drip, drip…', 'A little penguin! A new fishing buddy!'],
    end: ['Brrr-illiant!', 'New seas are waiting! Tap to keep fishing'] },
  [FINAL_BOSS]: { lines: ['Something HUGE is on the line!', 'It\'s Grandpa Dragonfish… and he\'s smiling!', 'He shows you the way to the Whirlpool!'],
    end: ['THE END… or is it?', 'The Whirlpool is open! Tap to keep fishing'] },
};
function panel(ctx, i, y, t) {
  const show = Math.max(0, Math.min(1, comic - i * 1.6));
  if (show <= 0) return;
  const story = ending.story === 43 ? 43 : FINAL_BOSS, big = story === 43 ? ICE : BY_ID.get(FINAL_BOSS);
  ctx.save(); ctx.globalAlpha = show;
  ctx.fillStyle = '#fffaf0'; rr(ctx, 30, y, W - 60, 240, 20); ctx.fill();
  ctx.strokeStyle = '#1b263b'; ctx.lineWidth = 5; ctx.stroke();
  ctx.save(); ctx.beginPath(); rr(ctx, 30, y, W - 60, 240, 20); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + 240);
  g.addColorStop(0, i === 1 ? '#ffd6a5' : '#bde0fe'); g.addColorStop(0.62, '#e0f2ff'); g.addColorStop(0.62, '#48b5e0'); g.addColorStop(1, '#1d6f9e');
  ctx.fillStyle = g; ctx.fillRect(30, y, W - 60, 240);
  const wy = y + 150;
  if (i === 0) { drawBoat(ctx, 170, wy + 4, t, G.slot.color, wearDrawer(G.slot.equip)); drawFish(ctx, big, 380, wy - 40 + Math.sin(t * 3) * 6, 56, 1, t); }
  if (i === 1 && story === 43) {
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(430, y + 50, 34, 0, Math.PI * 2); ctx.fill();
    drawBoat(ctx, 170, wy + 4, t, G.slot.color, wearDrawer(G.slot.equip));
    ctx.save(); ctx.globalAlpha *= 0.75; drawFish(ctx, ICE, 360, wy - 34, 42, 1, t); ctx.restore();
    ctx.fillStyle = '#4cc9f0'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(330 + k * 20, wy - 2 + ((t * 60 + k * 15) % 30), 4, 0, Math.PI * 2); ctx.fill(); }
  }
  if (i === 1 && story !== 43) {
    drawBoat(ctx, 150, wy + 4, t, G.slot.color, wearDrawer(G.slot.equip));
    drawFish(ctx, big, 370, wy - 30 + Math.sin(t * 2) * 5, 64, -1, t);
    hearts(ctx, [[300, y + 50], [440, y + 40]], t);
  }
  if (i === 2 && story === 43) {
    drawBoat(ctx, 230, wy + 4, t, G.slot.color, wearDrawer(G.slot.equip));
    drawFish(ctx, PENGUIN, 290, wy - 52 + Math.abs(Math.sin(t * 5)) * -10, 24, -1, t);
    hearts(ctx, [[260, wy - 110], [320, wy - 125]], t);
  }
  if (i === 2 && story !== 43) { // a swirling whirlpool opens in the sea
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.8 - k * 0.15})`; ctx.lineWidth = 5; ctx.beginPath();
      ctx.ellipse(380, wy + 40, 100 - k * 22, 30 - k * 6, 0, t * (2 + k) , t * (2 + k) + Math.PI * 1.4); ctx.stroke();
    }
    drawBoat(ctx, 160, wy + 4, t, G.slot.color, wearDrawer(G.slot.equip));
  }
  ctx.restore();
  text(ctx, STORIES[story].lines[i], W / 2, y + 212, 20, '#fff');
  ctx.restore();
}
function hearts(ctx, at) {
  ctx.fillStyle = '#ff6b9a';
  for (const [hx, hy] of at) { ctx.beginPath(); ctx.arc(hx - 5, hy, 6, 0, Math.PI * 2); ctx.arc(hx + 5, hy, 6, 0, Math.PI * 2); ctx.moveTo(hx - 11, hy + 2); ctx.lineTo(hx, hy + 14); ctx.lineTo(hx + 11, hy + 2); ctx.fill(); }
}

G.scenes.ending = {
  steers: false,
  enter() { comic = 0; },
  update(dt) { comic += dt; },
  pointerDown() { sfx.page(); if (comic < 5) comic = Math.ceil((comic + 0.01) / 1.6) * 1.6; else G.go('done'); return true; },
  render: centred([255, 214, 165], [255, 158, 170], function (ctx, t) {
    panel(ctx, 0, 30, t); panel(ctx, 1, 300, t); panel(ctx, 2, 570, t);
    if (comic > 5) {
      const [a, b] = STORIES[ending.story === 43 ? 43 : FINAL_BOSS].end;
      text(ctx, a, W / 2, 860, 40, '#fff');
      text(ctx, b, W / 2, 910, 20, '#fff');
    }
  }),
};

// ---- Fish book (Fish-o-pedia) ----

const dexState = { page: 0, pick: null };
const DEX_PAGE = 16;

// Original hint text for a species not found yet.
export function hint(sp) {
  const z = ZONES[sp.zone - 1].name, band = Number.isFinite(sp.dMax) ? `${sp.dMin.toLocaleString('en-US')}–${sp.dMax.toLocaleString('en-US')} m` : `below ${sp.dMin.toLocaleString('en-US')} m`;
  const extra = sp.cond.map((c) => ({ day: 'by day', night: 'at night', midnight: 'around midnight', post: 'after the big ending',
    pre: '', 'pre:3': '', 'post:3': 'after the ice melts', 'hat:suncrown': 'with a royal hat', 'hat:frost': 'with a cosy hat', 'suit:pajamas': 'in fancy pajamas' }[c] ?? (c.startsWith('after:') ? 'if you bump its friend' : ''))).filter(Boolean);
  if (sp.rarity === 'boss') extra.push('at the very bottom');
  return [`${z} · ${band}`, extra.join(', ')];
}

G.scenes.dex = {
  steers: false,
  enter() { dexState.pick = null; },
  render: centred([110, 190, 210], [20, 70, 100], function (ctx, t) {
    const slot = G.slot, found = Object.keys(slot.dex).length;
    bigButton(ctx, 16, 28, 110, 70, 'BACK', () => G.go('back'), { color: '#e9ecef', size: 24 });
    text(ctx, 'FISH BOOK', W / 2 + 40, 52, 40);
    text(ctx, `${found} / ${SPECIES.length} found`, W / 2 + 40, 100, 24, '#ffe066');
    if (!owns(slot, 'dex')) {
      text(ctx, 'Your fish book is still in the shop!', W / 2, 380, 26);
      text(ctx, `Buy the Fish-o-pedia for $30 to read it.`, W / 2, 425, 22, '#cfe9ff');
      text(ctx, `(You have already found ${found} kinds.)`, W / 2, 470, 22, '#cfe9ff');
      bigButton(ctx, 120, 560, 300, 100, 'GO TO SHOP', () => { G.go('back'); G.go('shop'); }, { color: '#8ac926', size: 30 });
      return;
    }
    const pages = Math.ceil(SPECIES.length / DEX_PAGE);
    SPECIES.slice(dexState.page * DEX_PAGE, (dexState.page + 1) * DEX_PAGE).forEach((sp, i) => {
      const x = 22 + (i % 4) * 126, y = 140 + Math.floor(i / 4) * 126, known = !!slot.dex[sp.id];
      addButton({ x, y, w: 118, h: 118, onTap: () => { dexState.pick = sp; }, label: 'dex' + sp.id });
      ctx.fillStyle = dexState.pick === sp ? 'rgba(255,209,102,0.55)' : 'rgba(255,255,255,0.2)'; rr(ctx, x, y, 118, 118, 16); ctx.fill();
      drawFish(ctx, sp, x + 59, y + 52, Math.min(sp.r, 30), 1, t, { silhouette: !known });
      text(ctx, known ? sp.name : '???', x + 59, y + 102, sp.name.length > 12 ? 13 : 15, known ? '#fff' : '#9fb7c9');
      const gold = goldenCount(slot, sp.id);
      if (gold) goldStar(ctx, x + 100, y + 18, gold);
    });
    const p = dexState.pick;
    ctx.fillStyle = 'rgba(0,30,50,0.35)'; rr(ctx, 16, 652, W - 32, 190, 18); ctx.fill();
    if (!p) text(ctx, 'Tap a fish to read about it', W / 2, 747, 24, '#cfe9ff');
    else if (slot.dex[p.id]) {
      const e = slot.dex[p.id], worth = p.value * CONFIG.CASH_MULTIPLIER;
      drawFish(ctx, p, 90, 747, 40, 1, t);
      text(ctx, p.name, 160, 690, 28, '#fff', 'left');
      text(ctx, `Worth ${worth < 0 ? '-' : ''}$${Math.abs(worth).toLocaleString()}${p.jelly ? ' (ouch!)' : ''}`, 160, 732, 22, worth < 0 ? '#ff8fa3' : '#ffe066', 'left');
      text(ctx, `Caught ${e.n} · deepest ${e.best.toLocaleString('en-US')} m`, 160, 770, 20, '#e0f2ff', 'left', '600');
      const gold = goldenCount(slot, p.id);
      text(ctx, ZONES[p.zone - 1].name, 160, 806, 20, '#cfe9ff', 'left', '600');
      if (gold) { goldStar(ctx, W - 58, 728, gold); text(ctx, 'golden', W - 58, 752, 13, GOLD_INK); }
    } else {
      const [a, b] = hint(p);
      drawFish(ctx, p, 90, 747, 40, 1, t, { silhouette: true });
      text(ctx, 'Not found yet', 160, 700, 26, '#fff', 'left');
      text(ctx, a, 160, 745, 20, '#e0f2ff', 'left', '600');
      if (b) text(ctx, b, 160, 782, 20, '#ffd6a5', 'left', '600');
    }
    bigButton(ctx, 30, 860, 140, 80, '◀', () => { sfx.page(); dexState.page = (dexState.page + pages - 1) % pages; dexState.pick = null; }, { color: '#cfe9ff', silent: true });
    bigButton(ctx, W - 170, 860, 140, 80, '▶', () => { sfx.page(); dexState.page = (dexState.page + 1) % pages; dexState.pick = null; }, { color: '#cfe9ff', silent: true });
    text(ctx, `${dexState.page + 1} / ${pages}`, W / 2, 900, 26);
  }),
};
// Gold star + count: a species' golden catches (v1.4).
function goldStar(ctx, x, y, n) {
  ctx.fillStyle = GOLD_INK; ctx.strokeStyle = 'rgba(90,50,0,0.8)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? 6 : 14; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  text(ctx, String(n), x, y + 1, 11, '#5a3200', 'center');
}

// ---- kid slots ----
const cycle = (list, v, d = 1) => list[(list.indexOf(v) + d + list.length) % list.length];
export const SLOT_CARD = { Y: 116, STEP: 240, H: 228 }; // v1.3: a touch shorter, to fit the Import code button
G.scenes.slots = {
  steers: false,
  render: centred([120, 210, 245], [20, 90, 140], function (ctx, t) {
    const picking = codeUI.mode === 'pick';
    text(ctx, picking ? 'Pick a slot' : "Who's fishing?", W / 2, 62, 46);
    G.data.slots.forEach((slot, i) => {
      const y = SLOT_CARD.Y + i * SLOT_CARD.STEP, view = slot || freshSlot(i);
      // decided at tap time: the panel can change mode between this frame and the tap
      const tap = () => { if (codeUI.mode === 'pick') pickSlot(i); else if (!codeUI.mode) { sfx.kidPick(); G.useSlot(i); G.go('pick'); } };
      const card = addButton({ x: 24, y, w: W - 48, h: SLOT_CARD.H, onTap: tap, label: 'slot' + i, silent: true });
      ctx.fillStyle = view.color; rr(ctx, card.x, card.y, card.w, card.h, 26); ctx.fill();
      ctx.strokeStyle = !picking ? 'rgba(255,255,255,0.8)' : codeUI.confirm === i ? '#ff4d6d' : '#ffe066'; ctx.lineWidth = picking ? 8 : 5; ctx.stroke();
      drawBoat(ctx, 110, y + 196, t + i, view.color === '#ffd166' ? '#ff6b9a' : '#ffd166', wearDrawer(view.equip));
      text(ctx, view.name, 340, y + 44, 34, '#fff');
      text(ctx, slot ? `$${slot.cash.toLocaleString()} · ${Object.keys(slot.dex).length}/${SPECIES.length} fish` : 'New player!', 340, y + 88, 22, '#fff');
      text(ctx, picking ? (slot ? 'tap to replace' : 'tap to load here') : 'tap to play', 340, y + 122, 20, 'rgba(255,255,255,0.85)');
      if (picking) return;
      const ensure = () => (G.data.slots[i] ||= freshSlot(i)), free = () => !codeUI.mode;
      bigButton(ctx, 196, y + 148, 98, 64, 'name', () => { if (!free()) return; const s = ensure(); s.name = cycle(PRESET_NAMES, s.name); G.persist(); }, { color: '#fff', size: 20 });
      bigButton(ctx, 302, y + 148, 98, 64, 'colour', () => { if (!free()) return; const s = ensure(); s.color = cycle(PRESET_COLORS, s.color); G.persist(); }, { color: '#fff', size: 20 });
      if (slot) bigButton(ctx, 408, y + 148, 100, 64, 'Share code', () => { if (free()) { sfx.open(); openExport(i); } }, { color: '#bde0fe', size: 16, silent: true });
    });
    if (!picking) bigButton(ctx, 100, 846, 340, 90, 'Import code', () => { if (!codeUI.mode) { sfx.open(); openImport(); } }, { color: '#8ac926', size: 32, silent: true });
  }),
};
