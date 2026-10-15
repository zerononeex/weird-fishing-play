// Save-code panel on the kid-pick screen (GAME_SPEC §12). Real DOM over the canvas, because a code has to be
// selectable text and the clipboard needs a real click. Laid out in logical px and scaled with the canvas.
import { G } from './game.js';
import { sfx } from './audio.js';
import { FONT } from './draw.js';
import { encodeSlot, newImport, loadCode, tapSlot } from './savecode.js';

export const BAD_CODE = "That code doesn't work — check it was copied fully.";
export const KEEP_NOTE = 'Keep this code in Notes. Anyone with it can load this save.';

const CSS = `
#codeui { position: fixed; left: 0; top: 0; width: 540px; height: 960px; transform-origin: 0 0; pointer-events: none;
  font: bold 22px ${FONT}; color: #fff; display: none; z-index: 5; }
#codeui.on { display: block; }
#codeui .dim { position: absolute; inset: 0; background: rgba(0,25,45,0.55); pointer-events: auto; }
#codeui .box { position: absolute; left: 24px; top: 104px; width: 492px; box-sizing: border-box; padding: 22px 24px;
  background: #13506f; border: 5px solid rgba(255,255,255,0.85); border-radius: 26px; pointer-events: auto;
  display: flex; flex-direction: column; gap: 14px; }
#codeui.pick .dim { display: none; }
#codeui.pick .box { top: 836px; height: 116px; padding: 12px 16px; flex-direction: row; align-items: center; }
#codeui.pick .ta, #codeui.pick .go, #codeui.pick .title { display: none; }
#codeui .title { font-size: 32px; text-align: center; }
#codeui .msg { font-size: 22px; line-height: 1.3; min-height: 58px; }
#codeui.pick .msg { flex: 1; min-height: 0; font-size: 21px; }
#codeui .msg.bad { color: #ffd6a5; }
#codeui .ta { height: 286px; resize: none; box-sizing: border-box; padding: 12px; border-radius: 16px; border: 3px solid #cfe9ff;
  font: 18px ui-monospace, Menlo, monospace; word-break: break-all; color: #0b3d5c; background: #fffaf0;
  -webkit-user-select: text; user-select: text; touch-action: auto; }
#codeui button { min-height: 72px; border: 4px solid rgba(0,30,50,0.35); border-radius: 22px; font: bold 28px ${FONT};
  color: #4a2c00; background: #e9ecef; touch-action: manipulation; }
#codeui button.go { min-height: 88px; font-size: 34px; background: #8ac926; }
#codeui.pick button.cancel { min-width: 150px; }
`;

let root = null, el = {}, imp = null;
export const codeUI = { mode: null, slot: -1, confirm: null };   // mode: null | 'export' | 'paste' | 'pick'

function build() {
  if (root) return;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  root = document.createElement('div'); root.id = 'codeui';
  root.innerHTML = '<div class="dim"></div><div class="box"><div class="title"></div><div class="msg"></div>'
    + '<textarea class="ta" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"></textarea>'
    + '<button class="go"></button><button class="cancel"></button></div>';
  document.body.appendChild(root);
  for (const k of ['title', 'msg', 'ta', 'go', 'cancel']) el[k] = root.querySelector('.' + k);
  el.go.addEventListener('click', () => (codeUI.mode === 'export' ? copy() : load()));
  el.cancel.addEventListener('click', () => { sfx.close(); close(); });
  el.ta.addEventListener('focus', () => { if (codeUI.mode === 'export') el.ta.setSelectionRange(0, el.ta.value.length); });
  el.ta.addEventListener('input', () => { if (codeUI.mode === 'paste') say('Paste the code here, then tap Load code.'); });
  place();
}

// Keeps the panel exactly over the canvas (called from main.js fit()).
export function place() {
  const c = document.getElementById('game');
  if (!root || !c) return;
  const r = c.getBoundingClientRect();
  root.style.left = r.left + 'px'; root.style.top = r.top + 'px';
  root.style.transform = `scale(${r.width / 540})`;
}

function say(text, bad = false) { el.msg.textContent = text; el.msg.classList.toggle('bad', bad); }
function show(mode) {
  codeUI.mode = mode; codeUI.confirm = null;
  root.className = mode ? 'on ' + mode : '';
  if (!mode) el.ta.blur();
}

export function openExport(i) {
  build();
  const slot = G.data.slots[i];
  if (!slot) return;
  codeUI.slot = i;
  el.title.textContent = `${slot.name}'s save code`;
  el.ta.readOnly = true; el.ta.value = encodeSlot(slot); el.ta.placeholder = '';
  el.go.textContent = 'Copy code'; el.cancel.textContent = 'Close';
  say(KEEP_NOTE);
  show('export');
}

export function openImport() {
  build();
  imp = newImport(); codeUI.slot = -1;
  el.title.textContent = 'Load a save code';
  el.ta.readOnly = false; el.ta.value = ''; el.ta.placeholder = 'Paste the code here';
  el.go.textContent = 'Load code'; el.cancel.textContent = 'Cancel';
  say('Paste the code here, then tap Load code.');
  show('paste');
}

export function close() { imp = null; show(null); }

async function copy() {
  const text = el.ta.value;
  el.ta.focus(); el.ta.setSelectionRange(0, text.length);
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch { /* not allowed here: try the old way */ }
  if (!ok) try { ok = document.execCommand('copy'); } catch { ok = false; }
  sfx.equip();
  say(ok ? 'Copied! Now paste it into Notes.' : 'Press and hold the code, tap Select All, then Copy.');
}

function load() {
  imp = loadCode(imp, el.ta.value);
  if (imp.error) { sfx.error(); say(BAD_CODE, true); return; }
  sfx.equip(); el.ta.blur();
  say(`Got ${imp.slot.name}'s save! Tap a slot to put it in.`);
  show('pick');
}

// Slot card i tapped while picking (screens.js). Only the confirmed tap writes.
export function pickSlot(i) {
  if (codeUI.mode !== 'pick') return;
  imp = tapSlot(imp, G.data, i); codeUI.confirm = imp.confirm;
  if (imp.mode === 'done') {
    if (G.data.activeSlot === i) G.slot = G.data.slots[i];
    G.persist(); sfx.kidPick(); close();
  } else if (imp.confirm === i) {
    sfx.error(); say(`Replace ${G.data.slots[i].name}'s save? Tap again to be sure.`, true);
  }
}
