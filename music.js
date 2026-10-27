//---------------------------------------------------------|  Background Music (generated live, no audio files)  |-------------------------------------------------//
// A funky disco/synthwave loop played by a tiny Web Audio synth: drums, bass, chord stabs and a lead hook.
// Menus get a chill version (no kick, clap or lead); during a match the full groove plays.
// Starts on the first click/key press (browsers block sound before that). N toggles it, volume is in the panel.

const MUSIC_BPM = 112;
const MUSIC_SWING = 0.12; // delay every second 16th note by this share of a step

// 8-bar loop in A minor (dorian): [root note for the bass, chord notes for the stabs]
const MUSIC_PROGRESSION = [
  [45, [57, 60, 64, 67]], // Am7
  [45, [57, 60, 64, 67]], // Am7
  [38, [54, 57, 60, 64]], // D9
  [38, [54, 57, 60, 64]], // D9
  [45, [57, 60, 64, 67]], // Am7
  [45, [57, 60, 64, 67]], // Am7
  [41, [53, 57, 60, 64]], // Fmaj7
  [43, [55, 59, 62, 65]], // G7
];

// [16th step, semitones above the root, length in steps]: syncopated octave-jumping funk bass
const MUSIC_BASS = [[0, 0, 2], [3, 0, 1], [6, 12, 1], [7, 0, 1], [10, 7, 1], [12, 0, 1], [14, 10, 1], [15, 12, 1]];
// [16th step, length in steps]: offbeat chord stabs
const MUSIC_STABS = [[3, 1], [6, 1], [10, 2], [14, 1]];
// two-bar lead hook: [16th step, MIDI note, length in steps]
const MUSIC_HOOK = [
  [[0, 69, 2], [3, 72, 1], [4, 74, 2], [6, 76, 2], [10, 74, 1], [11, 72, 1], [12, 69, 3]],
  [[0, 67, 2], [2, 69, 1], [4, 72, 2], [7, 69, 1], [8, 74, 3], [12, 72, 1], [14, 69, 2]],
];

let music = null; // audio graph, built on first start

function mtof(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// connect audio nodes in a row. (p5.sound replaces AudioNode.connect with a version that doesn't
// return the next node, so the usual a.connect(b).connect(c) chaining doesn't work here.)
function musicChain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
}

function musicBuild() {
  let ctx = getAudioContext(); // share p5.sound's context so the ball hit sound and music unlock together
  let master = ctx.createGain();
  master.gain.value = 0;
  let comp = ctx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(ctx.destination);

  // echo for the lead
  let delay = ctx.createDelay(1);
  delay.delayTime.value = (60 / MUSIC_BPM / 4) * 3; // dotted 8th
  let feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  let wet = ctx.createGain();
  wet.gain.value = 0.3;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(master);

  // one second of white noise for hats and claps
  let noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  let data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  music = { ctx, master, delay, noise, step: 0, nextTime: 0, timer: null };
}

// envelope helper: quick attack, exponential fall to silence
function musicEnv(gainNode, t, peak, decay, attack = 0.003) {
  let g = gainNode.gain;
  g.setValueAtTime(0.0001, t);
  g.exponentialRampToValueAtTime(peak, t + attack);
  g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function musicKick(t) {
  let { ctx, master } = music;
  let osc = ctx.createOscillator();
  let g = ctx.createGain();
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  musicEnv(g, t, 0.9, 0.28, 0.001);
  musicChain(osc, g, master);
  osc.start(t);
  osc.stop(t + 0.35);
}

function musicNoiseHit(t, type, freq, q, peak, decay) {
  let { ctx, master, noise } = music;
  let src = ctx.createBufferSource();
  src.buffer = noise;
  let f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  let g = ctx.createGain();
  musicEnv(g, t, peak, decay, 0.001);
  musicChain(src, f, g, master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay + 0.05);
}

function musicClap(t) {
  musicNoiseHit(t, 'bandpass', 1500, 0.8, 0.5, 0.16);
  musicNoiseHit(t + 0.012, 'bandpass', 1200, 0.8, 0.35, 0.12); // second slap makes it a clap
}

function musicHat(t, open, vel) {
  musicNoiseHit(t, 'highpass', 7500, 1, (open ? 0.16 : 0.12) * vel, open ? 0.22 : 0.035);
}

function musicBass(t, midi, dur) {
  let { ctx, master } = music;
  let osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = mtof(midi);
  let f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 7;
  f.frequency.setValueAtTime(1400, t);
  f.frequency.exponentialRampToValueAtTime(220, t + dur);
  let g = ctx.createGain();
  musicEnv(g, t, 0.38, dur * 0.9);
  musicChain(osc, f, g, master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function musicStab(t, notes, dur) {
  let { ctx, master } = music;
  let f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(2600, t);
  f.frequency.exponentialRampToValueAtTime(700, t + dur);
  let g = ctx.createGain();
  musicEnv(g, t, 0.09, dur * 0.85, 0.005);
  musicChain(f, g, master);
  for (let n of notes) {
    for (let detune of [-7, 7]) { // two slightly detuned saws per note for a fat sound
      let osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = mtof(n);
      osc.detune.value = detune;
      osc.connect(f);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }
}

function musicLead(t, midi, dur) {
  let { ctx, master, delay } = music;
  let osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = mtof(midi);
  let vib = ctx.createOscillator(); // slight vibrato
  vib.frequency.value = 5.5;
  let vibAmt = ctx.createGain();
  vibAmt.gain.value = 4;
  musicChain(vib, vibAmt, osc.detune);
  let f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 2800;
  let g = ctx.createGain();
  musicEnv(g, t, 0.11, dur * 0.95, 0.01);
  musicChain(osc, f, g);
  g.connect(master);
  g.connect(delay);
  osc.start(t);
  vib.start(t);
  osc.stop(t + dur + 0.05);
  vib.stop(t + dur + 0.05);
}

function musicPlayStep(step, t) {
  let stepDur = 60 / MUSIC_BPM / 4;
  let bar = Math.floor(step / 16);
  let s = step % 16;
  let [root, chord] = MUSIC_PROGRESSION[bar];
  let full = gameState !== 'start' && gameState !== 'howToPlay'; // full groove during a match

  // drums
  if (full && s % 4 === 0) musicKick(t);
  if (full && (s === 4 || s === 12)) musicClap(t);
  if (full && bar === 7 && s >= 13) musicClap(t); // little fill into the loop restart
  if (s % 4 === 2) musicHat(t, full, 1); // offbeat: open hat in the full groove
  else musicHat(t, false, s % 2 === 0 ? 0.9 : 0.5);

  // bass
  for (let [at, semi, len] of MUSIC_BASS) if (at === s) musicBass(t, root + semi, len * stepDur);

  // chord stabs
  for (let [at, len] of MUSIC_STABS) if (at === s) musicStab(t, chord, len * stepDur);

  // lead hook
  if (full) for (let [at, note, len] of MUSIC_HOOK[bar % 2]) if (at === s) musicLead(t, note, len * stepDur);
}

function musicSchedule() {
  let { ctx, master } = music;
  let s = crtSettings;
  master.gain.setTargetAtTime(s.musicOn ? s.musicVolume * 0.7 : 0, ctx.currentTime, 0.1);
  if (!s.musicOn) return;

  let stepDur = 60 / MUSIC_BPM / 4;
  if (music.nextTime < ctx.currentTime - 0.2) music.nextTime = ctx.currentTime + 0.05; // fell behind (tab was hidden)
  while (music.nextTime < ctx.currentTime + 0.12) {
    let swing = music.step % 2 === 1 ? stepDur * MUSIC_SWING : 0;
    try {
      musicPlayStep(music.step, music.nextTime + swing);
    } catch (e) {
      console.warn('music step failed', e); // keep the beat going instead of retrying the same step forever
    }
    music.nextTime += stepDur;
    music.step = (music.step + 1) % (16 * MUSIC_PROGRESSION.length);
  }
}

function musicStart() {
  if (!music) musicBuild();
  music.ctx.resume();
  if (music.timer) return;
  music.nextTime = music.ctx.currentTime + 0.1;
  music.timer = setInterval(musicSchedule, 25);
}

// N: music on/off (remembered in this browser)
function musicToggle() {
  crtSettings.musicOn = !crtSettings.musicOn;
  try { localStorage.setItem('crtSettings', JSON.stringify(crtSettings)); } catch (e) {}
  if (crtSettings.musicOn) musicStart();
}

// browsers only allow sound after the player interacts, so start on the first click or key press
window.addEventListener('pointerdown', musicStart);
window.addEventListener('keydown', (e) => {
  if (e.key === 'n' || e.key === 'N') musicToggle();
  else musicStart();
});

// quiet while the tab is hidden, back when it returns
document.addEventListener('visibilitychange', () => {
  if (!music) return;
  if (document.hidden) music.ctx.suspend();
  else music.ctx.resume();
});
