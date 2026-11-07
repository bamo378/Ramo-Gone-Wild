// Sons et musique 100 % synthétisés (Web Audio) : aucun fichier à télécharger, aucune licence.
let ctx = null, master = null, musicGain = null, sfxGain = null;
let enabled = true, musicTimer = null, step = 0, musicMode = 'classic';

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = enabled ? 0.8 : 0; master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = 0.7; sfxGain.connect(master);
}
export function setSound(on) {
  enabled = on;
  if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.02);
}
export const soundOn = () => enabled;

function tone(freq, dur, { type = 'square', vol = 0.3, slide = 0, delay = 0, dest = sfxGain } = {}) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, { vol = 0.3, delay = 0, freq = 1200 } = {}) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t);
}

export const sfx = {
  beer()   { tone(880, 0.08, { type: 'triangle' }); tone(1320, 0.12, { type: 'triangle', delay: 0.06 }); },
  big()    { [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.1, { type: 'triangle', delay: i * 0.05 })); },
  golden() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, { type: 'sine', vol: 0.35, delay: i * 0.06 })); noise(0.4, { vol: 0.15, freq: 5000 }); },
  chope()  { tone(400, 0.25, { type: 'sawtooth', slide: 800, vol: 0.2 }); tone(600, 0.3, { type: 'square', slide: 900, vol: 0.12, delay: 0.1 }); },
  jump()   { tone(300, 0.18, { type: 'square', slide: 500, vol: 0.12 }); },
  slide()  { noise(0.25, { vol: 0.2, freq: 900 }); },
  lane()   { tone(500, 0.05, { type: 'sine', vol: 0.08 }); },
  hit()    { noise(0.35, { vol: 0.5, freq: 300 }); tone(200, 0.4, { type: 'sawtooth', slide: -150, vol: 0.25 }); tone(140, 0.25, { type: 'square', vol: 0.15, delay: 0.25, slide: -60 }); },
  gameover() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.3, delay: i * 0.22 })); },
  record() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.16, { type: 'square', vol: 0.18, delay: i * 0.1 })); },
  click()  { tone(700, 0.05, { type: 'sine', vol: 0.15 }); },
  kiss()   { tone(1800, 0.06, { type: 'sine', vol: 0.3, slide: -900 }); noise(0.05, { vol: 0.2, freq: 3000, delay: 0.02 }); },
  boing()  { tone(180, 0.35, { type: 'sine', vol: 0.4, slide: 400 }); },
  wolf()   { tone(900, 0.25, { type: 'sine', vol: 0.25, slide: 900 }); tone(1400, 0.45, { type: 'sine', vol: 0.25, slide: -900, delay: 0.3 }); },
  heat()   { tone(200, 0.5, { type: 'sawtooth', slide: 1200, vol: 0.18 }); noise(0.5, { vol: 0.15, freq: 2000 }); },
  beep(go) { if (go) { tone(880, 0.35, { type: 'square', vol: 0.22 }); tone(1320, 0.4, { type: 'triangle', vol: 0.2, delay: 0.05 }); } else tone(523, 0.18, { type: 'square', vol: 0.2 }); },
  gate()   { tone(1046, 0.08, { type: 'triangle', vol: 0.25 }); tone(1568, 0.14, { type: 'triangle', vol: 0.22, delay: 0.06 }); },
  tick()   { tone(1200, 0.05, { type: 'square', vol: 0.12 }); },
  combo(m) { [0, 1, 2].forEach((i) => tone(440 * Math.pow(1.26, m + i), 0.12, { type: 'square', vol: 0.15, delay: i * 0.07 })); },
  squeak() { tone(1200 + Math.random() * 600, 0.08, { type: 'square', vol: 0.12, slide: 300 }); },
};

// ---------- Musique : petite boucle festive (fanfare) / disco (After Dark) ----------
const CLASSIC = { bpm: 136, bass: [130.8, 196, 130.8, 196, 174.6, 261.6, 196, 246.9],
  mel: [523, 0, 659, 784, 659, 0, 523, 587, 698, 0, 880, 698, 784, 659, 587, 0] };
const DISCO = { bpm: 118, bass: [110, 220, 110, 220, 98, 196, 130.8, 261.6],
  mel: [440, 0, 523, 0, 587, 523, 0, 440, 392, 0, 440, 0, 523, 587, 659, 0] };

export function startMusic(mode = 'classic') {
  musicMode = mode;
  if (!ctx) return;
  stopMusic();
  step = 0;
  const loop = () => {
    const m = musicMode === 'adult' ? DISCO : CLASSIC;
    const beat = 60 / m.bpm / 2;
    if (enabled) {
      const b = m.bass[Math.floor(step / 2) % m.bass.length];
      if (step % 2 === 0) tone(b, beat * 1.6, { type: 'triangle', vol: 0.5, dest: musicGain });
      const n = m.mel[step % m.mel.length];
      if (n) tone(n, beat * 0.9, { type: musicMode === 'adult' ? 'sawtooth' : 'square', vol: 0.12, dest: musicGain });
      if (musicMode === 'adult' && step % 2 === 0) noise(0.05, { vol: 0.12, freq: 8000 });
      if (step % 4 === 0) noise(0.06, { vol: musicMode === 'adult' ? 0.35 : 0.18, freq: 150 });
    }
    step++;
    musicTimer = setTimeout(loop, beat * 1000);
  };
  loop();
}
export function stopMusic() { if (musicTimer) clearTimeout(musicTimer); musicTimer = null; }
