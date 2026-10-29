// Bar sounds are real recordings, trimmed into short clips in public/sounds (see
// public/licenses/sounds.txt for where each one comes from). Nothing is synthesized:
// a sound without a recording simply stays quiet.
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

/** The clips for each sound (one is picked at random) and how loud it sits in the mix. */
const clips: Partial<Record<Sound, { files: string[]; gain: number; hold?: boolean }>> = {
  door: { files: ['door'], gain: 0.55 },
  register: { files: ['register'], gain: 0.6 },
  coin: { files: ['coin'], gain: 0.5 },
  pour: { files: ['pour'], gain: 0.55 },
  ice: { files: ['ice-1', 'ice-2', 'ice-3'], gain: 0.55 },
  // Held motions repeat while the button is held; a clip is not restarted over itself.
  shake: { files: ['shake'], gain: 0.5, hold: true },
  stir: { files: ['stir'], gain: 0.5, hold: true },
  muddle: { files: ['stir'], gain: 0.25, hold: true },
  glass: { files: ['glass'], gain: 0.6 },
  garnish: { files: ['ice-1'], gain: 0.15 },
};

let context: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, AudioBuffer | null>();
const busyUntil = new Map<Sound, number>();
const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? '') + '/sounds/';

function ready() {
  if (typeof window === 'undefined') return null;
  try {
    context ??= new AudioContext();
    if (!master) {
      master = context.createGain();
      master.gain.value = 0.8;
      master.connect(context.destination);
      // Fetch every clip once, so the first door bell is not late.
      for (const c of Object.values(clips)) for (const f of c.files) load(context, f);
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}
function load(ctx: AudioContext, file: string) {
  if (buffers.has(file)) return;
  buffers.set(file, null);
  fetch(base + file + '.mp3')
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => buffers.set(file, buffer))
    .catch(() => buffers.delete(file));
}
let soundOn = () => true;
export function setSoundSwitch(on: () => boolean) {
  soundOn = on;
}
export function play(kind: Sound) {
  if (!soundOn()) return;
  const clip = clips[kind];
  const ctx = ready();
  if (!clip || !ctx || !master) return;
  if (clip.hold && (busyUntil.get(kind) ?? 0) > ctx.currentTime) return;
  const buffer = buffers.get(clip.files[Math.floor(Math.random() * clip.files.length)]);
  if (!buffer) return;
  try {
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    // A touch of variation so repeats don't sound copied.
    src.playbackRate.value = 0.96 + Math.random() * 0.08;
    gain.gain.value = clip.gain;
    src.connect(gain).connect(master);
    src.start();
    busyUntil.set(kind, ctx.currentTime + buffer.duration / src.playbackRate.value - 0.05);
  } catch {
    /* Silent mode remains playable. */
  }
}

// ---------- The jukebox ----------
// "Bossa Antigua" by Kevin MacLeod, streamed and looped quietly under the bar sounds.
let music: HTMLAudioElement | null = null;
let fade: number | undefined;
const musicVolume = 0.22;
function fadeTo(target: number, done?: () => void) {
  clearInterval(fade);
  fade = window.setInterval(() => {
    if (!music) return clearInterval(fade);
    const v = music.volume + Math.sign(target - music.volume) * 0.02;
    music.volume = Math.max(0, Math.min(1, Math.abs(target - v) < 0.02 ? target : v));
    if (music.volume === target) {
      clearInterval(fade);
      done?.();
    }
  }, 60);
}
let wanted = false;
export function setMusic(on: boolean, retry = false) {
  if (typeof window === 'undefined') return;
  // Called on every change to the game; act only when the answer changes.
  if (on === wanted && !retry) return;
  wanted = on;
  if (!on) {
    if (music && !music.paused) fadeTo(0, () => music?.pause());
    return;
  }
  if (!music) {
    music = new Audio(base + 'jukebox.mp3');
    music.loop = true;
    music.preload = 'auto';
    music.volume = 0;
  }
  if (music.paused)
    music.play().catch(() => {
      // Browsers wait for a tap before playing music; try again on the next one.
      document.addEventListener('pointerup', () => wanted && setMusic(true, true), {
        once: true,
      });
    });
  fadeTo(musicVolume);
}
