// Bar sounds. Each one is built from the physics of the real thing (struck metal,
// glass partials, filtered noise for liquid and ice) rather than a beep, and quiet
// enough to sit under a long session. A recording dropped into public/sounds/<name>.mp3
// replaces the built-in version of that sound.
export type Sound =
  | 'door'
  | 'register'
  | 'coin'
  | 'pour'
  | 'ice'
  | 'shake'
  | 'stir'
  | 'muddle'
  | 'glass'
  | 'garnish'
  | 'page';

let context: AudioContext | null = null;
let master: GainNode | null = null;
const samples = new Map<Sound, AudioBuffer | null>();
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

function ready() {
  if (typeof window === 'undefined') return null;
  try {
    context ??= new AudioContext();
    if (!master) {
      master = context.createGain();
      master.gain.value = 0.7;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}
function loadSample(kind: Sound) {
  if (samples.has(kind)) return;
  samples.set(kind, null);
  const ctx = ready();
  if (!ctx) return;
  fetch(base + '/sounds/' + kind + '.mp3')
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => samples.set(kind, buffer))
    .catch(() => {});
}
let noiseBuffer: AudioBuffer | null = null;
function noise(ctx: AudioContext) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  source.loopStart = Math.random();
  return source;
}
/** A struck bell or glass: a few inharmonic partials, each ringing down on its own. */
function strike(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  pitch: number,
  partials: [number, number, number][],
  level = 1,
) {
  for (const [ratio, gain, decay] of partials) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = pitch * ratio;
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(gain * level, at + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }
}
/** A burst of filtered noise: liquid, ice, a drawer, a shaker. */
function hiss(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  length: number,
  filter: { type: BiquadFilterType; frequency: number; q?: number },
  level: number,
  attack = 0.01,
) {
  const src = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = filter.type;
  f.frequency.value = filter.frequency;
  f.Q.value = filter.q ?? 1;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(level, at + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, at + length);
  src.connect(f).connect(env).connect(out);
  src.start(at);
  src.stop(at + length + 0.05);
  return f;
}
const glassPartials: [number, number, number][] = [
  [1, 0.5, 0.5],
  [2.32, 0.3, 0.35],
  [4.25, 0.18, 0.22],
  [6.63, 0.1, 0.14],
];
const bellPartials: [number, number, number][] = [
  [1, 0.6, 1.6],
  [2.76, 0.3, 1.1],
  [5.4, 0.15, 0.7],
  [8.93, 0.07, 0.4],
];
function clink(ctx: AudioContext, out: AudioNode, at: number, level = 1) {
  strike(ctx, out, at, 2400 + Math.random() * 900, glassPartials, 0.18 * level);
}
const builders: Record<Sound, (ctx: AudioContext, out: AudioNode, t: number) => void> = {
  // The shop-door bell: two quick strikes on a small brass bell.
  door: (ctx, out, t) => {
    strike(ctx, out, t, 1318, bellPartials, 0.16);
    strike(ctx, out, t + 0.13, 1568, bellPartials, 0.12);
  },
  // An old till: the drawer's clack and slide, then its bell.
  register: (ctx, out, t) => {
    hiss(ctx, out, t, 0.05, { type: 'bandpass', frequency: 1800, q: 2 }, 0.5, 0.002);
    hiss(ctx, out, t + 0.06, 0.22, { type: 'bandpass', frequency: 700, q: 0.8 }, 0.18, 0.02);
    strike(ctx, out, t + 0.05, 2093, bellPartials, 0.14);
    for (let i = 0; i < 4; i++) clink(ctx, out, t + 0.28 + i * 0.045 + Math.random() * 0.02, 0.5);
  },
  coin: (ctx, out, t) => {
    for (let i = 0; i < 3; i++)
      strike(ctx, out, t + i * 0.06, 3100 + Math.random() * 600, glassPartials, 0.07);
  },
  // Liquid from a bottle: low-passed noise that gurgles as the bottle glugs.
  pour: (ctx, out, t) => {
    const f = hiss(ctx, out, t, 0.55, { type: 'bandpass', frequency: 650, q: 1.5 }, 0.22, 0.05);
    for (let i = 0; i < 6; i++)
      f.frequency.setValueAtTime(500 + Math.random() * 500, t + 0.05 + i * 0.08);
  },
  ice: (ctx, out, t) => {
    for (let i = 0; i < 4; i++) {
      const at = t + i * 0.07 + Math.random() * 0.03;
      clink(ctx, out, at, 0.8);
      hiss(ctx, out, at, 0.04, { type: 'highpass', frequency: 3000 }, 0.12, 0.002);
    }
  },
  // Ice rattling in a tin, back and forth.
  shake: (ctx, out, t) => {
    for (let i = 0; i < 4; i++) {
      const at = t + i * 0.16;
      hiss(ctx, out, at, 0.12, { type: 'bandpass', frequency: 2600, q: 0.7 }, 0.2, 0.01);
      clink(ctx, out, at + 0.02, 0.35);
    }
  },
  // A bar spoon turning against the glass.
  stir: (ctx, out, t) => {
    for (let i = 0; i < 3; i++) clink(ctx, out, t + i * 0.22 + Math.random() * 0.04, 0.4);
  },
  muddle: (ctx, out, t) => {
    for (let i = 0; i < 3; i++)
      hiss(ctx, out, t + i * 0.2, 0.12, { type: 'lowpass', frequency: 420 }, 0.3, 0.005);
  },
  // A glass set down on the wooden counter.
  glass: (ctx, out, t) => {
    hiss(ctx, out, t, 0.08, { type: 'lowpass', frequency: 300 }, 0.35, 0.002);
    clink(ctx, out, t + 0.01, 0.7);
  },
  garnish: (ctx, out, t) => {
    hiss(ctx, out, t, 0.06, { type: 'bandpass', frequency: 1200, q: 1 }, 0.12, 0.004);
  },
  page: (ctx, out, t) => {
    hiss(ctx, out, t, 0.18, { type: 'highpass', frequency: 1500 }, 0.08, 0.03);
  },
};
let soundOn = () => true;
export function setSoundSwitch(on: () => boolean) {
  soundOn = on;
}
export function play(kind: Sound) {
  if (!soundOn()) return;
  const ctx = ready();
  if (!ctx || !master) return;
  loadSample(kind);
  const sample = samples.get(kind);
  const t = ctx.currentTime + 0.01;
  try {
    if (sample) {
      const src = ctx.createBufferSource();
      src.buffer = sample;
      src.connect(master);
      src.start(t);
    } else builders[kind](ctx, master, t);
  } catch {
    /* Silent mode remains playable. */
  }
}

// ---------- The jukebox ----------
// A slow, soft electric-piano loop with a walking bass, mixed well under the bar
// sounds. It only plays once the jukebox is in the bar and music is switched on.
let music: { gain: GainNode; timer: number } | null = null;
const progression = [
  [220, 261.6, 329.6, 392],
  [174.6, 220, 261.6, 329.6],
  [196, 246.9, 293.7, 349.2],
  [164.8, 207.7, 246.9, 293.7],
];
function chord(ctx: AudioContext, out: AudioNode, at: number, notes: number[], length: number) {
  notes.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const start = at + i * 0.03;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(0.05, start + 0.02);
    env.gain.exponentialRampToValueAtTime(0.012, start + 0.8);
    env.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(env).connect(out);
    osc.start(start);
    osc.stop(start + length + 0.1);
  });
  const bass = ctx.createOscillator();
  const env = ctx.createGain();
  bass.type = 'sine';
  bass.frequency.value = notes[0] / 2;
  env.gain.setValueAtTime(0.12, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + length * 0.9);
  bass.connect(env).connect(out);
  bass.start(at);
  bass.stop(at + length);
}
export function setMusic(on: boolean) {
  if (!on) {
    if (music) {
      const m = music;
      clearInterval(m.timer);
      m.gain.gain.setTargetAtTime(0, m.gain.context.currentTime, 0.4);
      setTimeout(() => m.gain.disconnect(), 2000);
      music = null;
    }
    return;
  }
  if (music) return;
  const ctx = ready();
  if (!ctx || !master) return;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(0.5, ctx.currentTime, 1);
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 1800;
  gain.connect(lowpass).connect(master);
  const bar = 2.4;
  let next = ctx.currentTime + 0.1,
    step = 0;
  const schedule = () => {
    while (next < ctx.currentTime + 1.5) {
      chord(ctx, gain, next, progression[step % progression.length], bar);
      next += bar;
      step++;
    }
  };
  schedule();
  music = { gain, timer: window.setInterval(schedule, 500) };
}
