// Chip sound effects synthesised from a scene's cues, the way an 8-bit console makes them:
// square, triangle and noise voices with hard envelopes. No samples, no deps.
//
// A cue is { t, sound, pitch? }: `t` in seconds, `sound` a key of SOUNDS, `pitch` in semitones
// (ticks and blips climb with it, so a stack of blocks plays a rising scale).

export const SAMPLE_RATE = 44100;

const semitones = (hz, steps = 0) => hz * 2 ** (steps / 12);

function voice(out, start, { wave = 'square', duty = 0.5, from, to = from, duration, volume = 0.2, hold = false }) {
  const length = Math.round(duration * SAMPLE_RATE);
  const attack = Math.round(0.002 * SAMPLE_RATE);
  let phase = 0;
  let noise = 0;
  let seed = 22222;
  for (let i = 0; i < length && start + i < out.length; i++) {
    const p = i / length;
    const frequency = from * (to / from) ** p;
    const before = phase;
    phase = (phase + frequency / SAMPLE_RATE) % 1;
    let sample;
    if (wave === 'square') sample = phase < duty ? 1 : -1;
    else if (wave === 'triangle') sample = 4 * Math.abs(phase - 0.5) - 1;
    else {
      // noise: a new random level each cycle, like the NES noise channel
      if (phase < before) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        noise = (seed / 0x7fffffff) * 2 - 1;
      }
      sample = noise;
    }
    const envelope = (hold ? (p < 0.85 ? 1 : (1 - p) / 0.15) : 1 - p) * Math.min(1, i / attack);
    if (start + i >= 0) out[start + i] += sample * volume * envelope;
  }
}

const at = (seconds) => Math.round(seconds * SAMPLE_RATE);

export const SOUNDS = {
  /** a small block lands */
  tick: (out, s, cue) => voice(out, s, { from: semitones(523, cue.pitch), to: semitones(392, cue.pitch), duration: 0.045, volume: 0.09, duty: 0.25 }),
  /** a letter or a heavy block lands */
  land: (out, s) => {
    voice(out, s, { wave: 'noise', from: 2400, to: 500, duration: 0.09, volume: 0.16 });
    voice(out, s, { from: 196, to: 98, duration: 0.08, volume: 0.1, duty: 0.25 });
  },
  coin: (out, s) => {
    voice(out, s, { from: 988, duration: 0.06, volume: 0.1, hold: true });
    voice(out, s + at(0.06), { from: 1319, duration: 0.24, volume: 0.1 });
  },
  /** UI step: a progress cell fills, a letter types */
  blip: (out, s, cue) => voice(out, s, { from: semitones(880, cue.pitch), duration: 0.05, volume: 0.07, duty: 0.125 }),
  type: (out, s) => voice(out, s, { from: 1760, duration: 0.018, volume: 0.05, duty: 0.25 }),
  jump: (out, s) => voice(out, s, { from: 262, to: 784, duration: 0.14, volume: 0.09, duty: 0.25 }),
  powerup: (out, s) => {
    [523, 659, 784, 1047, 1319, 1568].forEach((hz, i) => voice(out, s + at(i * 0.045), { from: hz, duration: 0.06, volume: 0.09, hold: true }));
  },
  flash: (out, s) => {
    voice(out, s, { wave: 'noise', from: 6000, to: 900, duration: 0.3, volume: 0.14 });
    voice(out, s, { wave: 'triangle', from: 110, to: 55, duration: 0.3, volume: 0.25 });
  },
  select: (out, s) => {
    voice(out, s, { from: 784, duration: 0.05, volume: 0.08, hold: true });
    voice(out, s + at(0.06), { from: 1175, duration: 0.09, volume: 0.08 });
  },
  whoosh: (out, s) => voice(out, s, { wave: 'noise', from: 900, to: 5000, duration: 0.18, volume: 0.08 }),
  clear: (out, s) => {
    [784, 988, 1175].forEach((hz, i) => voice(out, s + at(i * 0.09), { from: hz, duration: 0.08, volume: 0.09, hold: true }));
    voice(out, s + at(0.27), { from: 1568, duration: 0.35, volume: 0.09 });
  },
};

/** Mix every cue into one mono track `duration` seconds long. */
export function synth(cues, duration) {
  const out = new Float32Array(Math.ceil(duration * SAMPLE_RATE));
  for (const cue of cues) {
    const sound = SOUNDS[cue.sound];
    if (!sound) throw new Error(`unknown sound "${cue.sound}" (have: ${Object.keys(SOUNDS).join(', ')})`);
    sound(out, at(cue.t), cue);
  }
  return out;
}

/** 16-bit mono PCM WAV. */
export function wavBuffer(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, i) => data.writeInt16LE(Math.round(Math.tanh(sample * 1.2) * 32000), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
