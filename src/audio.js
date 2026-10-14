// Sound (GAME_SPEC §10.G). Every music track and SFX has a key (audio-keys.js, docs/MUSIC_PROMPTS.md).
// A key plays its MP3 from assets/music|sfx/<key>.mp3 when that file exists (listed in manifest.js), and
// falls back to the WebAudio synth otherwise, or if the file fails to load or decode: never silent, never
// an error. Music streams through an <audio> element into a gain node (low memory) and crossfades ~1 s.
// iOS needs a user gesture before sound can play, so main.js calls unlock() on the first tap/key.
import { MUSIC, SFX } from './manifest.js';
import { GUN_FAMILY } from './audio-keys.js';

const HAS_MUSIC = new Set(MUSIC), HAS_SFX = new Set(SFX);
const FADE = 1.0;
let ac = null, master = null, musicBus = null, sfxBus = null, sfxMuted = false, musicMuted = false;
const lastPlayed = {}, buffers = new Map(), failed = new Set();
let wanted = null, current = null;

export function unlock() {
  try {
    if (!ac) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination);
      musicBus = ac.createGain(); musicBus.gain.value = musicMuted ? 0 : 1; musicBus.connect(master);
      sfxBus = ac.createGain(); sfxBus.gain.value = sfxMuted ? 0 : 1; sfxBus.connect(master);
      for (const key of HAS_SFX) loadSfx(key);
      if (wanted) startTrack(wanted);
    }
    if (ac.state === 'suspended') ac.resume();
  } catch { /* no audio available: play silently */ }
}

// Two per-slot toggles: Sound (effects) and Music.
export function setMuted(sound, music = sound) {
  if (!!sound === sfxMuted && !!music === musicMuted) return; // called every frame: only act on a change
  sfxMuted = !!sound; musicMuted = !!music;
  if (!ac) return;
  sfxBus.gain.setTargetAtTime(sfxMuted ? 0 : 1, ac.currentTime, 0.02);
  musicBus.gain.setTargetAtTime(musicMuted ? 0 : 1, ac.currentTime, 0.05);
}

// ---- synth voices (the fallback for every key) ----
function tone(freq, dur, { type = 'square', vol = 0.15, to = null, at = 0, bus = sfxBus } = {}) {
  if (!ac) return;
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noise(dur, { vol = 0.2, freq = 1200, at = 0, q = 0.8, bus = sfxBus } = {}) {
  if (!ac) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + at, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.02);
}
const arp = (notes, step, opts) => notes.forEach((f, i) => tone(f, opts.dur || 0.12, { ...opts, at: i * step }));

const SYNTH = {
  sfx_button_tap: () => tone(660, 0.06, { type: 'triangle', vol: 0.12 }),
  sfx_panel_open: () => tone(440, 0.07, { type: 'triangle', to: 660, vol: 0.1 }),
  sfx_panel_close: () => tone(520, 0.06, { type: 'triangle', to: 330, vol: 0.1 }),
  sfx_game_start: () => arp([392, 523, 659, 784], 0.07, { type: 'triangle', vol: 0.13, dur: 0.18 }),
  sfx_kid_pick: () => arp([659, 880], 0.08, { type: 'triangle', vol: 0.13 }),
  sfx_zone_select: () => tone(300, 0.12, { type: 'sine', to: 700, vol: 0.12 }),
  sfx_error_buzz: () => tone(140, 0.22, { type: 'square', vol: 0.1 }),
  sfx_daynight_sparkle: () => arp([1319, 1568, 2093], 0.05, { type: 'sine', vol: 0.08 }),
  sfx_equip_click: () => tone(880, 0.05, { type: 'square', vol: 0.08 }),
  sfx_shop_buy: () => arp([784, 1175, 1568], 0.07, { type: 'triangle', vol: 0.12, dur: 0.1 }),
  sfx_page_flip: () => noise(0.12, { vol: 0.12, freq: 3000, q: 0.5 }),
  sfx_rod_swish: () => noise(0.25, { vol: 0.15, freq: 2500 }),
  sfx_cast_splash: () => { noise(0.45, { vol: 0.35, freq: 700 }); tone(300, 0.3, { type: 'sine', to: 90, vol: 0.12 }); },
  sfx_lure_plop: () => tone(500, 0.12, { type: 'sine', to: 160, vol: 0.14 }),
  sfx_hook_thud: () => { tone(120, 0.18, { type: 'sine', to: 60, vol: 0.25 }); noise(0.08, { vol: 0.15, freq: 400 }); },
  sfx_line_taut: () => tone(180, 0.25, { type: 'sawtooth', to: 140, vol: 0.08 }),
  sfx_reel_cue: () => { tone(900, 0.5, { type: 'sawtooth', to: 200, vol: 0.08 }); tone(1200, 0.5, { type: 'square', to: 300, vol: 0.05, at: 0.05 }); },
  sfx_reel_start: () => noise(0.35, { vol: 0.16, freq: 1500, q: 0.4 }),
  sfx_charm_zap: () => { noise(0.25, { vol: 0.25, freq: 3000, q: 3 }); tone(1500, 0.2, { type: 'sawtooth', to: 300, vol: 0.08 }); },
  sfx_saw_buzz: () => tone(110, 0.12, { type: 'sawtooth', vol: 0.06 }),
  sfx_saw_cut: () => noise(0.1, { vol: 0.18, freq: 1800 }),
  sfx_fish_hooked: () => tone(520, 0.09, { type: 'triangle', to: 880, vol: 0.14 }),
  sfx_knife_cut: () => { noise(0.1, { vol: 0.2, freq: 5000, q: 2 }); tone(1800, 0.1, { type: 'triangle', to: 900, vol: 0.06 }); },
  sfx_boss_roar: () => { tone(110, 0.6, { type: 'sawtooth', vol: 0.12 }); tone(82, 0.8, { type: 'square', vol: 0.08, at: 0.1 }); },
  sfx_launch_whoosh: () => { noise(0.4, { vol: 0.2, freq: 900, q: 0.5 }); tone(200, 0.4, { type: 'sine', to: 800, vol: 0.06 }); },
  sfx_gun_pistol: () => noise(0.07, { vol: 0.22, freq: 2200 }),
  sfx_gun_shotgun: () => noise(0.18, { vol: 0.3, freq: 900 }),
  sfx_gun_smg: () => noise(0.05, { vol: 0.18, freq: 2600 }),
  sfx_gun_cannon: () => { noise(0.3, { vol: 0.35, freq: 300 }); tone(90, 0.3, { type: 'sine', to: 40, vol: 0.2 }); },
  sfx_gun_beam: () => tone(1400, 0.12, { type: 'sawtooth', to: 500, vol: 0.07 }),
  sfx_fish_hit: () => tone(220, 0.07, { type: 'square', vol: 0.1 }),
  sfx_fish_splat: () => noise(0.12, { vol: 0.2, freq: 500 }),
  sfx_coin: () => { tone(988, 0.08, { type: 'square', vol: 0.08 }); tone(1319, 0.14, { type: 'square', vol: 0.08, at: 0.07 }); },
  sfx_fish_lost: () => tone(400, 0.18, { type: 'sine', to: 120, vol: 0.08 }),
  sfx_jelly_sting: () => tone(300, 0.25, { type: 'square', to: 120, vol: 0.1 }),
  sfx_cash_tally: () => tone(1568, 0.04, { type: 'square', vol: 0.05 }),
  sfx_payout_fanfare: () => arp([523, 659, 784, 1047], 0.12, { type: 'triangle', vol: 0.14, dur: 0.25 }),
  sfx_new_species: () => arp([784, 988, 1175, 1568, 1976], 0.08, { type: 'sine', vol: 0.12, dur: 0.2 }),
  sfx_zone_unlock: () => arp([392, 523, 659, 784, 1047], 0.1, { type: 'triangle', vol: 0.13, dur: 0.3 }),
  sfx_no_catch: () => arp([392, 370, 349], 0.18, { type: 'triangle', vol: 0.1, dur: 0.25 }),
};

// ---- MP3 one-shots ----
function loadSfx(key) {
  fetch(`assets/sfx/${key}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
    .then((data) => new Promise((ok, no) => ac.decodeAudioData(data, ok, no)))
    .then((buf) => buffers.set(key, buf))
    .catch(() => failed.add(key)); // stays on the synth fallback
}

// Throttle very frequent sounds (fast guns, cash tally) so they stay pleasant.
function every(name, secs) {
  const now = ac ? ac.currentTime : 0;
  if (now - (lastPlayed[name] ?? -1) < secs) return false;
  lastPlayed[name] = now; return true;
}

export function play(key, minGap = 0) {
  if (!ac || sfxMuted || (minGap && !every(key, minGap))) return;
  try {
    const buf = buffers.get(key);
    if (buf) { const s = ac.createBufferSource(); s.buffer = buf; s.connect(sfxBus); s.start(); }
    else SYNTH[key]?.();
  } catch { /* never let a sound break the game */ }
}

// The saw buzz loops while the saw runs (MP3 loop, or a throttled synth buzz).
let sawSrc = null;
export function sawLoop(on) {
  if (!ac) return;
  const buf = buffers.get('sfx_saw_buzz');
  if (!buf) { if (on) play('sfx_saw_buzz', 0.12); return; }
  if (on && !sawSrc && !sfxMuted) { sawSrc = ac.createBufferSource(); sawSrc.buffer = buf; sawSrc.loop = true; sawSrc.connect(sfxBus); sawSrc.start(); }
  if (!on && sawSrc) { try { sawSrc.stop(); } catch { /* already stopped */ } sawSrc = null; }
}

// Friendly names used around the game.
export const sfx = {
  tap: () => play('sfx_button_tap'), open: () => play('sfx_panel_open'), close: () => play('sfx_panel_close'),
  start: () => play('sfx_game_start'), kidPick: () => play('sfx_kid_pick'), zoneSelect: () => play('sfx_zone_select'),
  error: () => play('sfx_error_buzz', 0.15), sparkle: () => play('sfx_daynight_sparkle'), equip: () => play('sfx_equip_click'),
  buy: () => play('sfx_shop_buy'), page: () => play('sfx_page_flip', 0.1),
  cast: () => play('sfx_rod_swish'), splash: () => play('sfx_cast_splash'), plop: () => play('sfx_lure_plop'),
  thud: () => play('sfx_hook_thud'), taut: () => play('sfx_line_taut'), reel: () => play('sfx_reel_cue'),
  reelStart: () => play('sfx_reel_start'), zap: () => play('sfx_charm_zap', 0.05), sawCut: () => play('sfx_saw_cut', 0.05),
  hook: () => play('sfx_fish_hooked', 0.05), knife: () => play('sfx_knife_cut'), boss: () => play('sfx_boss_roar', 0.5),
  launch: () => play('sfx_launch_whoosh'), shot: (gun) => play('sfx_gun_' + (GUN_FAMILY[gun?.id] || 'pistol'), 0.06),
  hit: () => play('sfx_fish_hit', 0.04), splat: () => play('sfx_fish_splat', 0.05), coin: () => play('sfx_coin', 0.05),
  lost: () => play('sfx_fish_lost', 0.08), ouch: () => play('sfx_jelly_sting', 0.1), tally: () => play('sfx_cash_tally', 0.07),
  tada: () => play('sfx_payout_fanfare'), newSpecies: () => play('sfx_new_species'), zoneUnlock: () => play('sfx_zone_unlock'),
  noCatch: () => play('sfx_no_catch'),
};

// ---- music: one track per key with ~1 s crossfades ----
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const BASS = [48, 0, 55, 0, 52, 0, 55, 0, 45, 0, 52, 0, 43, 0, 50, 0];
const LEAD = [72, 0, 74, 76, 0, 79, 76, 0, 74, 0, 72, 69, 0, 72, 0, 0, 76, 0, 79, 81, 0, 79, 76, 0, 74, 76, 74, 72, 0, 67, 0, 0];
// Synth fallback flavour per key: the v1.0 sea-shanty loop, re-voiced by tempo, key and density.
const FLAVOUR = {
  music_title: { bpm: 96, tr: 0 }, music_shop: { bpm: 104, tr: 5, lead: 'triangle' },
  music_dive_puddle: { bpm: 100, tr: 0 }, music_dive_grumble: { bpm: 96, tr: -3 }, music_dive_iceberg: { bpm: 88, tr: 4, sparse: true },
  music_dive_whirlpool: { bpm: 108, tr: -5 }, music_deep: { bpm: 70, tr: -12, sparse: true, lead: 'sine' },
  music_boss: { bpm: 120, tr: -7, hat: 2 }, music_ending: { bpm: 80, tr: 7, lead: 'sine' },
  music_shoot_a: { bpm: 150, tr: 2, hat: 2 }, music_shoot_b: { bpm: 150, tr: 7, hat: 2, lead: 'square' }, music_shoot_c: { bpm: 146, tr: -2, hat: 2, lead: 'sawtooth' },
};

function synthTrack(key, gain) {
  const f = FLAVOUR[key] || FLAVOUR.music_title, stepS = 60 / f.bpm / 2;
  let next = ac.currentTime + 0.05, step = 0;
  const timer = setInterval(() => {
    if (!ac || ac.state !== 'running') return;
    while (next < ac.currentTime + 0.25) {
      const at = next - ac.currentTime, b = BASS[step % BASS.length], l = LEAD[step % LEAD.length];
      if (b) tone(hz(b + f.tr), stepS * 1.6, { type: 'triangle', vol: 0.5, at, bus: gain });
      if (l && !(f.sparse && step % 2)) tone(hz(l + f.tr), stepS * 0.9, { type: f.lead || 'square', vol: 0.12, at, bus: gain });
      if (step % (4 / (f.hat || 1)) === 2 % (4 / (f.hat || 1))) noise(0.04, { vol: 0.05, freq: 7000, at, q: 1, bus: gain });
      next += stepS; step++;
    }
  }, 60);
  return { stop() { clearInterval(timer); } };
}

function fileTrack(key, gain) {
  const el = new Audio(`assets/music/${key}.mp3`);
  el.loop = true;
  const src = ac.createMediaElementSource(el); src.connect(gain);
  const toSynth = () => { // missing/undecodable: swap this track to the synth, keep the fade going
    if (failed.has(key)) return;
    failed.add(key);
    if (current?.key === key) { el.pause(); current.inner = synthTrack(key, gain); }
  };
  el.addEventListener('error', toSynth);
  el.play().catch(toSynth);
  return { el, stop() { el.pause(); el.removeAttribute('src'); el.load(); } };
}

function startTrack(key) {
  if (!ac) return;
  const old = current, gain = ac.createGain(), t = ac.currentTime;
  gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(1, t + FADE); gain.connect(musicBus);
  current = { key, gain, inner: null };
  try { current.inner = HAS_MUSIC.has(key) && !failed.has(key) ? fileTrack(key, gain) : synthTrack(key, gain); }
  catch { current.inner = synthTrack(key, gain); }
  if (old) {
    old.gain.gain.cancelScheduledValues(t); old.gain.gain.setValueAtTime(old.gain.gain.value, t); old.gain.gain.linearRampToValueAtTime(0, t + FADE);
    setTimeout(() => { old.inner?.stop(); old.gain.disconnect(); }, FADE * 1000 + 100);
  }
}

// Called every frame with the track the game wants (musicmap.js); crossfades only on a change.
export function music(key) {
  if (key === wanted) return;
  wanted = key;
  try { startTrack(key); } catch { /* keep playing whatever was on */ }
}

export const audioState = () => (ac ? ac.state : 'off');
export const musicNow = () => current && { key: current.key, file: !!current.inner?.el && !failed.has(current.key) };

// Page hidden (app switch, lock screen): silence everything until the kids come back.
export function pauseAudio(paused) {
  try {
    if (!ac) return;
    if (paused) { ac.suspend(); current?.inner?.el?.pause(); }
    else { ac.resume(); current?.inner?.el?.play().catch(() => {}); }
  } catch { /* ignore */ }
}
