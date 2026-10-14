// Menu-style screens (dock, payout, ...). Placeholder launch/shoot/payout until Phase 4.
import { CONFIG } from './config.js';
import { G } from './game.js';
import { addButton } from './ui.js';
import { drawSea, text, rr, drawBoat } from './draw.js';
import { wearDrawer } from './icons.js';
import { startRun } from './play.js';
import { ZONES } from './data/zones.js';
import { zoneUnlocked, lockReason, refreshUnlocks, fishPay, runTotal, gearOf, canBuy, buy, equip, owns, isEquipped, grantGifts } from './economy.js';
import { ITEMS, TABS, GUN } from './data/shop.js';
import { drawItemIcon } from './icons.js';
import { SPECIES } from './data/fish.js';
import { settleRun } from './settle.js';
import { sfx } from './audio.js';
import { PRESET_NAMES, PRESET_COLORS, freshSlot } from './save.js';
import { drawFish } from './fishart.js';

const { W, H } = CONFIG;

export function bigButton(ctx, x, y, w, h, label, onTap, opts = {}) {
  const b = addButton({ x, y, w, h, onTap, disabled: opts.disabled, label });
  ctx.fillStyle = opts.disabled ? 'rgba(255,255,255,0.18)' : opts.color || '#ffd166';
  rr(ctx, x, y, w, h, Math.min(24, h / 3)); ctx.fill();
  ctx.strokeStyle = 'rgba(0,30,50,0.35)'; ctx.lineWidth = 4; ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2, opts.size || Math.min(40, h * 0.42), opts.disabled ? '#cfe9ff' : opts.ink || '#4a2c00');
  return b;
}

// Sun / moon toggle icon.
function skyIcon(ctx, x, y, night) {
  if (night) {
    ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d3557'; ctx.beginPath(); ctx.arc(x + 9, y - 6, 17, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) { ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 24, y + Math.sin(a) * 24); ctx.lineTo(x + Math.cos(a) * 31, y + Math.sin(a) * 31); ctx.stroke(); }
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
  }
}

export function castFromDock() {
  const slot = G.slot, zone = ZONES[slot.zone - 1];
  startRun({ zone, ...gearOf(slot, zone.id), cond: { night: slot.settings.night, hat: slot.equip.hat, suit: slot.equip.outfit, post: slot.flags.bossBeaten } });
  G.go('cast');
}

const money = (n) => '$' + Math.round(n).toLocaleString();

G.scenes.dock = {
  steers: false,
  enter() { refreshUnlocks(G.slot); grantGifts(G.slot); G.persist(); },
  render(ctx, t) {
    const slot = G.slot, zone = ZONES[slot.zone - 1], night = slot.settings.night;
    drawSea(ctx, night ? [30, 60, 110] : [120, 210, 245], night ? [5, 20, 50] : [20, 90, 140], t * 20, t);
    text(ctx, 'WEIRD FISHING', W / 2, 80, 52);
    text(ctx, `${slot.name} · ${money(slot.cash)}`, W / 2, 140, 26, '#ffe066');
    // zone picker
    const step = (d) => { slot.zone = ((slot.zone - 1 + d + ZONES.length) % ZONES.length) + 1; G.persist(); };
    bigButton(ctx, 20, 185, 88, 104, '◀', () => step(-1), { color: '#cfe9ff' });
    bigButton(ctx, W - 108, 185, 88, 104, '▶', () => step(1), { color: '#cfe9ff' });
    const open = zoneUnlocked(slot, zone);
    text(ctx, zone.name, W / 2, 220, 32, open ? '#fff' : '#9fb7c9');
    text(ctx, open ? (Number.isFinite(zone.maxDepth) ? `${zone.maxDepth} m deep · best ${slot.bestDepth[zone.id] || 0} m` : `endless! · best ${slot.bestDepth[4] || 0} m`) : lockReason(slot, zone),
      W / 2, 262, 18, '#cfe9ff');
    // Day / Night toggle
    const b = bigButton(ctx, 130, 315, 280, 86, '', () => { slot.settings.night = !slot.settings.night; G.persist(); }, { color: night ? '#1d3557' : '#bde0fe' });
    skyIcon(ctx, b.x + 56, b.y + 43, night);
    text(ctx, night ? 'Night' : 'Day', b.x + 170, b.y + 43, 34, night ? '#fff3b0' : '#4a2c00');
    bigButton(ctx, 30, 430, 230, 110, 'SHOP', () => G.go('shop'), { color: '#8ac926' });
    bigButton(ctx, 280, 430, 230, 110, 'FISH BOOK', () => G.go('dex'), { color: '#4cc9f0', size: 30 });
    bigButton(ctx, 30, 565, 230, 80, slot.settings.muted ? 'Sound: off' : 'Sound: on', () => { slot.settings.muted = !slot.settings.muted; G.persist(); }, { color: '#e9ecef', size: 26 });
    bigButton(ctx, 280, 565, 230, 80, 'Kids', () => G.go('back'), { color: '#e9ecef', size: 26 });
    bigButton(ctx, 70, 690, 400, 170, open ? 'CAST!' : 'LOCKED', castFromDock, { disabled: !open, size: 64 });
  },
};

// ---- shop ----
const PER_PAGE = 6;
const shopState = { tab: 'lines', page: 0 };
const PISTOL = { id: 'pistol', cat: 'guns', name: GUN.pistol.name, price: 0, req: [], desc: 'Your trusty starter' };
const itemsOf = (tab) => (tab === 'guns' ? [PISTOL] : []).concat(ITEMS.filter((i) => i.cat === tab));

function action(slot, it) {
  const equipable = it.cat === 'guns' || it.hat || it.outfit || it.start;
  if (it.id === 'pistol' || owns(slot, it.id)) {
    if (!equipable) return { label: 'OWNED', disabled: true };
    return isEquipped(slot, it) ? { label: 'ON ✓', color: '#ffd166', tap: () => it.cat !== 'guns' && equip(slot, it) }
      : { label: 'USE', color: '#bde0fe', tap: () => equip(slot, it) };
  }
  const why = canBuy(slot, it);
  return why ? { label: money(it.price), disabled: true, why } : { label: `BUY ${money(it.price)}`, color: '#8ac926', tap: () => buy(slot, it) };
}

G.scenes.shop = {
  steers: false,
  render(ctx, t) {
    const slot = G.slot;
    drawSea(ctx, [140, 200, 160], [30, 80, 70], 0, t);
    text(ctx, 'SHOP', W / 2, 60, 48);
    text(ctx, money(slot.cash), W / 2, 112, 30, '#ffe066');
    bigButton(ctx, 16, 28, 110, 70, 'BACK', () => G.go('back'), { color: '#e9ecef', size: 24 });
    TABS.forEach(([id, label], i) => {
      bigButton(ctx, 12 + i * 130, 150, 126, 72, label, () => { shopState.tab = id; shopState.page = 0; },
        { color: shopState.tab === id ? '#ffd166' : '#cfe9ff', size: 24 });
    });
    const list = itemsOf(shopState.tab), pages = Math.ceil(list.length / PER_PAGE);
    shopState.page = Math.min(shopState.page, pages - 1);
    list.slice(shopState.page * PER_PAGE, shopState.page * PER_PAGE + PER_PAGE).forEach((it, i) => {
      const y = 240 + i * 100;
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; rr(ctx, 16, y, W - 32, 90, 16); ctx.fill();
      drawItemIcon(ctx, it, 62, y + 45);
      text(ctx, it.name, 106, y + 28, 24, '#fff', 'left');
      const a = action(slot, it);
      text(ctx, a.why || it.desc, 106, y + 62, 16, a.why ? '#ffd6a5' : '#e0f2ff', 'left', '600');
      bigButton(ctx, W - 186, y + 14, 160, 62, a.label, () => { a.tap?.(); G.persist(); }, { disabled: a.disabled, color: a.color, size: 22 });
    });
    if (pages > 1) {
      bigButton(ctx, 30, 860, 140, 80, '◀', () => { shopState.page = (shopState.page + pages - 1) % pages; }, { color: '#cfe9ff' });
      bigButton(ctx, W - 170, 860, 140, 80, '▶', () => { shopState.page = (shopState.page + 1) % pages; }, { color: '#cfe9ff' });
      text(ctx, `${shopState.page + 1} / ${pages}`, W / 2, 900, 26);
    }
  },
};

let tally = 0;
G.scenes.payout = {
  steers: false,
  enter() { G.payout = settleRun(G.slot, G.run, G.shoot); tally = 0; G.persist(); if (G.payout.total > 0) sfx.tada(); },
  update(dt) { tally = Math.min(1, tally + dt / 1.5); },
  render(ctx, t) {
    const p = G.payout;
    drawSea(ctx, [120, 210, 245], [20, 90, 140], 0, t);
    text(ctx, p.rows.length ? 'NICE CATCH!' : 'No fish this time!', W / 2, 90, 48);
    const shown = p.rows.slice(0, 9);
    shown.forEach((r, i) => {
      const y = 170 + i * 62, k = Math.min(1, Math.max(0, tally * shown.length - i));
      if (k <= 0) return;
      ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(ctx, 30, y - 27, W - 60, 54, 14); ctx.fill();
      drawFish(ctx, r.sp, 72, y, Math.min(r.sp.r, 22), 1, t);
      text(ctx, `${r.sp.name}${r.n > 1 ? ' ×' + r.n : ''}`, 110, y, 22, '#fff', 'left');
      text(ctx, `${r.pay < 0 ? '-' : ''}$${Math.abs(Math.round(r.pay)).toLocaleString()}`, W - 50, y, 24, r.pay < 0 ? '#ff8fa3' : '#ffe066', 'right');
      ctx.globalAlpha = 1;
    });
    if (p.rows.length > shown.length) text(ctx, `+ ${p.rows.length - shown.length} more kinds`, W / 2, 170 + 9 * 62 - 20, 20, '#cfe9ff');
    if (p.lost) text(ctx, `${p.lost} got away`, W / 2, 710, 20, '#cfe9ff');
    const news = [p.newSpecies.length && `${p.newSpecies.length} new for your fish book!`, ...p.opened.map((z) => `${z.name} is open!`)].filter(Boolean);
    news.forEach((n, i) => text(ctx, n, W / 2, 742 + i * 28 - (news.length - 1) * 14, 22, '#b9fbc0'));
    text(ctx, `+$${Math.round(p.total * tally).toLocaleString()}`, W / 2, 800, 52, '#ffe066');
    text(ctx, `Wallet: $${G.slot.cash.toLocaleString()}`, W / 2, 850, 24, '#fff');
    bigButton(ctx, 120, 870, 300, 76, tally < 1 ? 'SKIP' : 'OK', () => {
      if (tally < 1) { tally = 1; return; }
      G.go(p.bossLanded ? 'bossLanded' : 'done');
    });
  },
};

// ---- ending: an original, gentle 3-panel comic ----
const ICE = SPECIES[42], PENGUIN = SPECIES[46];
let comic = 0;
function panel(ctx, i, y, t) {
  const show = Math.max(0, Math.min(1, comic - i * 1.6));
  if (show <= 0) return;
  ctx.save(); ctx.globalAlpha = show;
  ctx.fillStyle = '#fffaf0'; rr(ctx, 30, y, W - 60, 240, 20); ctx.fill();
  ctx.strokeStyle = '#1b263b'; ctx.lineWidth = 5; ctx.stroke();
  ctx.save(); ctx.beginPath(); rr(ctx, 30, y, W - 60, 240, 20); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + 240);
  g.addColorStop(0, i === 1 ? '#ffd6a5' : '#bde0fe'); g.addColorStop(0.62, '#e0f2ff'); g.addColorStop(0.62, '#48b5e0'); g.addColorStop(1, '#1d6f9e');
  ctx.fillStyle = g; ctx.fillRect(30, y, W - 60, 240);
  const wy = y + 150;
  if (i === 0) { drawBoat(ctx, 170, wy + 4, t, G.slot.color, wearDrawer(G.slot.equip)); drawFish(ctx, ICE, 380, wy - 40 + Math.sin(t * 3) * 6, 56, 1, t); }
  if (i === 1) {
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(430, y + 50, 34, 0, Math.PI * 2); ctx.fill();
    drawBoat(ctx, 170, wy + 4, t, G.slot.color, wearDrawer(G.slot.equip));
    ctx.save(); ctx.globalAlpha *= 0.75; drawFish(ctx, ICE, 360, wy - 34, 42, 1, t); ctx.restore();
    ctx.fillStyle = '#4cc9f0'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(330 + k * 20, wy - 2 + ((t * 60 + k * 15) % 30), 4, 0, Math.PI * 2); ctx.fill(); }
  }
  if (i === 2) {
    drawBoat(ctx, 230, wy + 4, t, G.slot.color, wearDrawer(G.slot.equip));
    drawFish(ctx, PENGUIN, 290, wy - 52 + Math.abs(Math.sin(t * 5)) * -10, 24, -1, t);
    ctx.fillStyle = '#ff6b9a'; for (const [hx, hy] of [[260, wy - 110], [320, wy - 125]]) { ctx.beginPath(); ctx.arc(hx - 5, hy, 6, 0, Math.PI * 2); ctx.arc(hx + 5, hy, 6, 0, Math.PI * 2); ctx.moveTo(hx - 11, hy + 2); ctx.lineTo(hx, hy + 14); ctx.lineTo(hx + 11, hy + 2); ctx.fill(); }
  }
  ctx.restore();
  text(ctx, ['Something big and cold is on the line!', 'The warm sun melts the ice… drip, drip…', 'A little penguin! A new fishing buddy!'][i], W / 2, y + 212, 20, '#fff');
  ctx.restore();
}

G.scenes.ending = {
  steers: false,
  enter() { comic = 0; },
  update(dt) { comic += dt; },
  pointerDown() { if (comic < 5) comic = Math.ceil((comic + 0.01) / 1.6) * 1.6; else G.go('done'); return true; },
  render(ctx, t) {
    drawSea(ctx, [255, 214, 165], [255, 158, 170], 0, t);
    panel(ctx, 0, 30, t); panel(ctx, 1, 300, t); panel(ctx, 2, 570, t);
    if (comic > 5) {
      text(ctx, 'THE END… or is it?', W / 2, 860, 40, '#fff');
      text(ctx, 'The Whirlpool is open! Tap to keep fishing', W / 2, 910, 20, '#fff');
    }
  },
};

// ---- Fish book (Fish-o-pedia) ----

const dexState = { page: 0, pick: null };
const DEX_PAGE = 16;

// Original hint text for a species not found yet.
export function hint(sp) {
  const z = ZONES[sp.zone - 1].name, band = Number.isFinite(sp.dMax) ? `${sp.dMin}–${sp.dMax} m` : `below ${sp.dMin} m`;
  const extra = sp.cond.map((c) => ({ day: 'by day', night: 'at night', midnight: 'around midnight', post: 'after the big ending',
    pre: '', 'hat:suncrown': 'with a royal hat', 'hat:frost': 'with a cosy hat', 'suit:pajamas': 'in fancy pajamas' }[c] ?? (c.startsWith('after:') ? 'if you bump its friend' : ''))).filter(Boolean);
  if (sp.rarity === 'boss') extra.push('at the very bottom');
  return [`${z} · ${band}`, extra.join(', ')];
}

G.scenes.dex = {
  steers: false,
  enter() { dexState.pick = null; },
  render(ctx, t) {
    const slot = G.slot, found = Object.keys(slot.dex).length;
    drawSea(ctx, [110, 190, 210], [20, 70, 100], 0, t);
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
    });
    const p = dexState.pick;
    ctx.fillStyle = 'rgba(0,30,50,0.35)'; rr(ctx, 16, 652, W - 32, 190, 18); ctx.fill();
    if (!p) text(ctx, 'Tap a fish to read about it', W / 2, 747, 24, '#cfe9ff');
    else if (slot.dex[p.id]) {
      const e = slot.dex[p.id], worth = p.value * CONFIG.CASH_MULTIPLIER;
      drawFish(ctx, p, 90, 747, 40, 1, t);
      text(ctx, p.name, 160, 690, 28, '#fff', 'left');
      text(ctx, `Worth ${worth < 0 ? '-' : ''}$${Math.abs(worth).toLocaleString()}${p.jelly ? ' (ouch!)' : ''}`, 160, 732, 22, worth < 0 ? '#ff8fa3' : '#ffe066', 'left');
      text(ctx, `Caught ${e.n} · deepest ${e.best} m`, 160, 770, 20, '#e0f2ff', 'left', '600');
      text(ctx, ZONES[p.zone - 1].name, 160, 806, 20, '#cfe9ff', 'left', '600');
    } else {
      const [a, b] = hint(p);
      drawFish(ctx, p, 90, 747, 40, 1, t, { silhouette: true });
      text(ctx, 'Not found yet', 160, 700, 26, '#fff', 'left');
      text(ctx, a, 160, 745, 20, '#e0f2ff', 'left', '600');
      if (b) text(ctx, b, 160, 782, 20, '#ffd6a5', 'left', '600');
    }
    bigButton(ctx, 30, 860, 140, 80, '◀', () => { dexState.page = (dexState.page + pages - 1) % pages; dexState.pick = null; }, { color: '#cfe9ff' });
    bigButton(ctx, W - 170, 860, 140, 80, '▶', () => { dexState.page = (dexState.page + 1) % pages; dexState.pick = null; }, { color: '#cfe9ff' });
    text(ctx, `${dexState.page + 1} / ${pages}`, W / 2, 900, 26);
  },
};
// ---- title + kid slots ----
const TITLE_FISH = [1, 2, 12, 54, 23, 9, 47, 60].map((id) => SPECIES[id - 1]);
G.scenes.title = {
  steers: false,
  pointerDown() { G.go('tap'); return true; },
  render(ctx, t) {
    drawSea(ctx, [120, 210, 245], [10, 60, 110], t * 30, t);
    TITLE_FISH.forEach((sp, i) => {
      const dir = i % 2 ? -1 : 1, x = ((t * (40 + i * 9) * dir + i * 150) % (W + 120) + W + 120) % (W + 120) - 60;
      drawFish(ctx, sp, x, 470 + i * 58, Math.min(sp.r, 26), dir, t);
    });
    text(ctx, 'WEIRD', W / 2, 190, 96, '#ffd166');
    text(ctx, 'FISHING', W / 2, 290, 96, '#fff');
    if (Math.sin(t * 4) > -0.4) text(ctx, 'TAP TO PLAY', W / 2, 400, 36, '#fff');
  },
};

const cycle = (list, v, d = 1) => list[(list.indexOf(v) + d + list.length) % list.length];
G.scenes.slots = {
  steers: false,
  render(ctx, t) {
    drawSea(ctx, [120, 210, 245], [20, 90, 140], 0, t);
    text(ctx, "Who's fishing?", W / 2, 80, 48);
    G.data.slots.forEach((slot, i) => {
      const y = 140 + i * 260, view = slot || freshSlot(i);
      const card = addButton({ x: 24, y, w: W - 48, h: 240, onTap: () => { G.useSlot(i); G.go('pick'); }, label: 'slot' + i });
      ctx.fillStyle = view.color; rr(ctx, card.x, card.y, card.w, card.h, 26); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 5; ctx.stroke();
      drawBoat(ctx, 110, y + 200, t + i, view.color === '#ffd166' ? '#ff6b9a' : '#ffd166', wearDrawer(view.equip));
      text(ctx, view.name, 330, y + 60, 34, '#fff');
      text(ctx, slot ? `$${slot.cash.toLocaleString()} · ${Object.keys(slot.dex).length}/66 fish` : 'New player!', 330, y + 108, 22, '#fff');
      text(ctx, 'tap to play', 330, y + 146, 20, 'rgba(255,255,255,0.85)');
      const ensure = () => (G.data.slots[i] ||= freshSlot(i));
      bigButton(ctx, 210, y + 170, 140, 56, 'name', () => { const s = ensure(); s.name = cycle(PRESET_NAMES, s.name); G.persist(); }, { color: '#fff', size: 20 });
      bigButton(ctx, 370, y + 170, 140, 56, 'colour', () => { const s = ensure(); s.color = cycle(PRESET_COLORS, s.color); G.persist(); }, { color: '#fff', size: 20 });
    });
  },
};
