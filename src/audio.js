// Synthesized sound: every effect and the music loop are generated with WebAudio — no audio files.
// iOS needs a user gesture before sound can play, so main.js calls unlock() on the first tap/key.
let ac = null, master = null, musicBus = null, muted = false, musicTimer = 0, nextNote = 0, step = 0;
const lastPlayed = {};

export function unlock() {
  try {
    if (!ac) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ac.destination);
      musicBus = ac.createGain(); musicBus.gain.value = 0.22; musicBus.connect(master);
      startMusic();
    }
    if (ac.state === 'suspended') ac.resume();
  } catch { /* no audio available: play silently */ }
}

export function setMuted(m) {
  muted = !!m;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, ac.currentTime, 0.02);
}

function tone(freq, dur, { type = 'square', vol = 0.15, to = null, at = 0, bus = master } = {}) {
  if (!ac || muted) return;
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noise(dur, { vol = 0.2, freq = 1200, at = 0, q = 0.8 } = {}) {
  if (!ac || muted) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + at, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}

// Throttle very frequent sounds (fast guns) so they stay pleasant.
function every(name, secs) {
  const now = ac ? ac.currentTime : 0;
  if (now - (lastPlayed[name] || -1) < secs) return false;
  lastPlayed[name] = now; return true;
}

export const sfx = {
  tap: () => tone(660, 0.06, { type: 'triangle', vol: 0.12 }),
  splash: () => { noise(0.45, { vol: 0.35, freq: 700 }); tone(300, 0.3, { type: 'sine', to: 90, vol: 0.12 }); },
  hook: () => every('hook', 0.05) && tone(520, 0.09, { type: 'triangle', to: 880, vol: 0.14 }),
  reel: () => { tone(900, 0.5, { type: 'sawtooth', to: 200, vol: 0.08 }); tone(1200, 0.5, { type: 'square', to: 300, vol: 0.05, at: 0.05 }); },
  zap: () => { noise(0.25, { vol: 0.25, freq: 3000, q: 3 }); tone(1500, 0.2, { type: 'sawtooth', to: 300, vol: 0.08 }); },
  saw: () => every('saw', 0.12) && tone(110, 0.12, { type: 'sawtooth', vol: 0.06 }),
  shot: (pellets = 1) => every('shot', 0.06) && (pellets > 2 ? noise(0.18, { vol: 0.3, freq: 900 }) : noise(0.07, { vol: 0.22, freq: 2200 })),
  hit: () => every('hit', 0.04) && tone(220, 0.07, { type: 'square', vol: 0.1 }),
  coin: () => every('coin', 0.05) && (tone(988, 0.08, { type: 'square', vol: 0.08 }), tone(1319, 0.14, { type: 'square', vol: 0.08, at: 0.07 })),
  ouch: () => tone(300, 0.25, { type: 'square', to: 120, vol: 0.1 }),
  boss: () => { tone(110, 0.6, { type: 'sawtooth', vol: 0.12 }); tone(82, 0.8, { type: 'square', vol: 0.08, at: 0.1 }); },
  tada: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.14, at: i * 0.12 })),
};

// ---- music: a small original sea-shanty-ish loop (C major pentatonic), scheduled ahead of time ----
const BPM = 112, STEP = 60 / BPM / 2;
const BASS = [48, 0, 55, 0, 52, 0, 55, 0, 45, 0, 52, 0, 43, 0, 50, 0];
const LEAD = [72, 0, 74, 76, 0, 79, 76, 0, 74, 0, 72, 69, 0, 72, 0, 0, 76, 0, 79, 81, 0, 79, 76, 0, 74, 76, 74, 72, 0, 67, 0, 0];
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

function startMusic() {
  nextNote = ac.currentTime + 0.1;
  clearInterval(musicTimer);
  musicTimer = setInterval(() => {
    if (!ac || ac.state !== 'running') return;
    while (nextNote < ac.currentTime + 0.25) {
      const at = nextNote - ac.currentTime;
      const b = BASS[step % BASS.length], l = LEAD[step % LEAD.length];
      if (b) tone(hz(b), STEP * 1.6, { type: 'triangle', vol: 0.5, at, bus: musicBus });
      if (l) tone(hz(l), STEP * 0.9, { type: 'square', vol: 0.12, at, bus: musicBus });
      if (step % 4 === 2) noiseHat(at);
      nextNote += STEP; step++;
    }
  }, 60);
}
function noiseHat(at) { if (!muted) noise(0.04, { vol: 0.05, freq: 7000, at, q: 1 }); }

export const audioState = () => (ac ? ac.state : 'off');

// Page hidden (app switch, lock screen): silence everything until the kids come back.
export function pauseAudio(paused) {
  try { if (ac) paused ? ac.suspend() : ac.resume(); } catch { /* ignore */ }
}
