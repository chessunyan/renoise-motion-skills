// Render a Pixel Blocks scene to MP4, or to probe stills and a contact sheet. Needs only ffmpeg.
//
//   node render.mjs scene.mjs --stills 0.5,1,2,3.5 --out qa/        → qa/still-<t>.png + qa/sheet.png
//   node render.mjs scene.mjs --out out/scene.mp4                   → video with chip SFX from the scene's cues
//   node render.mjs scene.mjs --out out/scene.mp4 --music track.mp3 --music-from 18.012
//   node render.mjs scene.mjs --out out/scene.gif --scale 2              → silent GIF for a README
//   add --watermark logo.png to stamp a PNG in the bottom-right corner (after the ×6 upscale, so it stays sharp)
//
// A scene module exports default { width, height, duration, draw(frame, t), cues?, music? }.
// Options: --scale 6 (logical pixel → output pixels)  --fps 24  --no-sfx  --crf 14
// `music` in the scene ({ file, from }) is the default for --music / --music-from; the file path
// is relative to the scene file.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { C, Frame } from './pixel.mjs';
import { synth, wavBuffer } from './chip.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const sceneFile = path.resolve(args[0] ?? '');
if (!args[0] || !fs.existsSync(sceneFile)) {
  console.error('usage: node render.mjs scene.mjs [--stills 1,2,3] --out <file|dir>');
  process.exit(1);
}
const scene = (await import(pathToFileURL(sceneFile).href)).default;
const FPS = Number(option('fps', scene.fps ?? 24));
const SCALE = Number(option('scale', 6));
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

function drawAt(t) {
  const frame = new Frame(scene.width, scene.height);
  frame.clear(C.navy);
  scene.draw(frame, t);
  return frame;
}

function writePng(file, frame, scale) {
  const result = spawnSync(FFMPEG, [
    '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${frame.width}x${frame.height}`, '-i', '-',
    '-vf', `scale=${frame.width * scale}:${frame.height * scale}:flags=neighbor`, '-frames:v', '1', file,
  ], { input: Buffer.from(frame.pixels) });
  if (result.status !== 0) throw new Error(result.stderr.toString());
}

if (option('stills')) {
  // Probe stills: one PNG per time at full scale, plus a labelled contact sheet to review at a glance.
  const outDir = path.resolve(option('out', 'qa'));
  fs.mkdirSync(outDir, { recursive: true });
  const times = option('stills').split(',').map(Number);
  const columns = Number(option('cols', Math.min(4, times.length)));
  const gap = 4;
  const label = 11;
  const rows = Math.ceil(times.length / columns);
  const sheet = new Frame(columns * (scene.width + gap) + gap, rows * (scene.height + gap + label) + gap);
  sheet.clear(C.ink);
  times.forEach((t, i) => {
    const frame = drawAt(t);
    writePng(path.join(outDir, `still-${t.toFixed(2)}.png`), frame, SCALE);
    const left = gap + (i % columns) * (scene.width + gap);
    const top = gap + Math.floor(i / columns) * (scene.height + gap + label);
    for (let y = 0; y < frame.height; y++) {
      const from = y * frame.width * 4;
      sheet.pixels.set(frame.pixels.subarray(from, from + frame.width * 4), ((top + y) * sheet.width + left) * 4);
    }
    sheet.text(`T ${t.toFixed(2)}`, left, top + scene.height + 2, { color: C.lemon });
  });
  writePng(path.join(outDir, 'sheet.png'), sheet, Number(option('sheet-scale', 2)));
  console.log(`stills -> ${outDir} (${times.length}) + sheet.png`);
  process.exit(0);
}

// ── video ───────────────────────────────────────────────────────────────────

const out = path.resolve(option('out', `out/${path.basename(sceneFile, '.mjs')}.mp4`));
fs.mkdirSync(path.dirname(out), { recursive: true });
const duration = scene.duration;
const gif = out.endsWith('.gif');
const sceneDir = path.dirname(sceneFile);
const musicFile = option('music', scene.music?.file ? path.resolve(sceneDir, scene.music.file) : null);
const musicFrom = Number(option('music-from', scene.music?.from ?? 0));
const cues = typeof scene.cues === 'function' ? scene.cues() : (scene.cues ?? []);
const withSfx = !gif && !flag('no-sfx') && cues.length > 0;

const inputs = ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${scene.width}x${scene.height}`, '-r', String(FPS), '-i', '-'];
const audioChains = [];
let nextInput = 1;
if (musicFile && !gif) {
  inputs.push('-ss', String(musicFrom), '-t', String(duration), '-i', musicFile);
  const fadeAt = Math.max(0, duration - 0.6);
  audioChains.push(`[${nextInput}:a]aresample=44100,afade=t=out:st=${fadeAt}:d=0.6,volume=0.8[music]`);
  nextInput++;
}
let sfxFile = null;
if (withSfx) {
  sfxFile = path.join(os.tmpdir(), `pixel-sfx-${process.pid}.wav`);
  fs.writeFileSync(sfxFile, wavBuffer(synth(cues, duration)));
  inputs.push('-i', sfxFile);
  audioChains.push(`[${nextInput}:a]aresample=44100,volume=1.3[sfx]`);
  nextInput++;
}
const labels = [musicFile && !gif && '[music]', withSfx && '[sfx]'].filter(Boolean);
const outWidth = scene.width * SCALE;
const outHeight = scene.height * SCALE;
const scaled = [`[0:v]scale=${outWidth}:${outHeight}:flags=neighbor[base]`];
let picture = '[base]';
const watermarkFile = option('watermark', null);
if (watermarkFile) {
  // the watermark is 5% of the short side tall, inset 2.8% from the bottom-right corner
  const shortSide = Math.min(outWidth, outHeight);
  const markHeight = Math.round(shortSide * 0.05);
  const inset = Math.round(shortSide * 0.028);
  inputs.push('-i', path.resolve(watermarkFile));
  scaled.push(`[${nextInput}:v]scale=-1:${markHeight}:flags=lanczos,format=rgba,colorchannelmixer=aa=0.92[mark]`);
  scaled.push(`[base][mark]overlay=W-w-${inset}:H-h-${inset}[marked]`);
  picture = '[marked]';
}
// a GIF keeps the exact palette (no dithering); an MP4 is H.264 in BT.709 so the inks stay true
const video = gif
  ? `${picture}split[g1][g2];[g1]palettegen=max_colors=${watermarkFile ? 128 : 64}:stats_mode=full[p];[g2][p]paletteuse=dither=none[v]`
  : `${picture}scale=out_color_matrix=bt709:flags=neighbor,format=yuv420p[v]`;
const filters = [...scaled, video, ...audioChains];
if (labels.length > 0) {
  // effects sit under the music; the whole mix is normalised to about -14 LUFS
  filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`);
}
const encode = gif
  ? ['-loop', '0']
  : ['-c:v', 'libx264', '-preset', 'slow', '-crf', option('crf', '14'), '-tune', 'animation',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart'];
const ffmpegArgs = [
  '-y', '-loglevel', 'error', ...inputs,
  '-filter_complex', filters.join(';'), '-map', '[v]', ...(labels.length > 0 ? ['-map', '[a]', '-c:a', 'aac', '-b:a', '192k'] : []),
  ...encode, '-t', String(duration), out,
];
const ffmpeg = spawn(FFMPEG, ffmpegArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
const total = Math.round(duration * FPS);
for (let i = 0; i < total; i++) {
  const frame = drawAt(i / FPS);
  if (!ffmpeg.stdin.write(Buffer.from(frame.pixels))) await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
}
ffmpeg.stdin.end();
const code = await new Promise((resolve) => ffmpeg.on('close', resolve));
if (sfxFile) fs.rmSync(sfxFile, { force: true });
if (code !== 0) process.exit(code);
console.log(`video -> ${out} (${total} frames @ ${FPS} fps, ${scene.width * SCALE}×${scene.height * SCALE})`);
