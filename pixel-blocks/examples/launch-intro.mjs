// Showcase 1 · Launch intro (16:9, 8 s = 16 beats at 120 BPM), all on-screen text in Chinese.
// Brief: "给我的独立游戏《方块大作战》做一支 16:9、8 秒的发布开场：标题用方块一块块落下拼出来，
// 番茄一蹦一蹦地过来吃金币填满进度条，重拍上闪一下，最后停在「开始游戏」。"
//
//   beat 0      grid boots row by row, 请投币 blinks (so frame 0 is never empty), HUD comes on
//   beats 1–6   方块大作战 lands one character per beat, each built from falling blocks
//   beats 6–11  the tomato collects 10 coins on the eighths, each one fills a bar cell (+10%)
//   beat 12     100% → flash, title does a wave, the tomato jumps
//   beats 13–16 开始游戏 blinks, launch date, the tomato hops on beat 14

import fs from 'node:fs';
import { ARCADE, C, SPRITES, beats, blink, drawHero, fall, glyphCells, hop, pad, random, step } from '../scripts/pixel.mjs';

const W = 320;
const H = 180;
const b = beats(120);
const EIGHTH = b(0.5);
const BEAT = b(1);
const table = (name) => JSON.parse(fs.readFileSync(new URL(`./${name}.json`, import.meta.url)));
const SMALL = table('cjk-12');
const MEDIUM = table('cjk-16');
const TITLE_FONT = table('cjk-title');

// ── title: one character per beat, the blocks inside a character land bottom row first ──

const TITLE = { text: '方块大作战', y: 26, start: b(1), scale: 3 };
const titleLayout = glyphCells(TITLE.text, TITLE_FONT, TITLE.scale);
const titleLeft = Math.round((W - titleLayout.width) / 2);
const titleBlocks = [];
const CHARS = [...TITLE.text].length;
for (let index = 0; index < CHARS; index++) {
  const glyph = titleLayout.cells
    .filter((cell) => cell.index === index)
    .sort((a, c) => c.row - a.row || a.column - c.column);
  const windowStart = TITLE.start + index * BEAT;
  glyph.forEach((cell, order) => titleBlocks.push({
    x: titleLeft + cell.x,
    y: TITLE.y + cell.y,
    land: windowStart + (BEAT * (order + 1)) / glyph.length,
    color: ARCADE[index % ARCADE.length],
    char: index,
  }));
}
const charLanded = (index) => TITLE.start + (index + 1) * BEAT;

// ── coins, bar, hero ──

const COINS = 10;
const coinX = (n) => 40 + n * 24;
const coinAt = (n) => b(6.5) + n * EIGHTH; // collected on the eighths, 3.25 s … 5.5 s
const HERO_SPEED = 24 / EIGHTH; // one coin gap per eighth
const heroX = (t) => Math.min(coinX(0) + (t - coinAt(0)) * HERO_SPEED, 280);
const BAR = { x: 103, y: 92, cell: 9, gap: 2 };
BAR.w = 3 + COINS * (BAR.cell + BAR.gap) - BAR.gap + 3;
const FLOOR_Y = 166;
const COIN_Y = 138;
const FLASH = b(12);

const twinkles = (() => {
  const next = random(7);
  return Array.from({ length: 22 }, () => ({ x: Math.floor(next() * W), y: 16 + Math.floor(next() * 96), phase: Math.floor(next() * 8) }));
})();

function drawFloor(frame) {
  for (let row = 0; row * 7 + FLOOR_Y < H; row++) {
    for (let x = row % 2 === 0 ? 0 : -5; x < W; x += 10) frame.block(x, FLOOR_Y + row * 7, 10, 7, C.dim);
  }
}

function draw(frame, t) {
  const s = step(t);
  const pose = Math.floor(s * 12);
  const collected = Array.from({ length: COINS }, (_, n) => s >= coinAt(n)).filter(Boolean).length;

  // beat 0: the grid boots three rows per pose
  frame.grid(10, C.grid, s < b(1) ? pose * 3 + 1 : Infinity);
  if (s >= b(1)) {
    twinkles.forEach((star) => {
      if ((pose + star.phase) % 8 < 2) frame.rect(star.x, star.y, 1, 1, star.phase % 2 ? C.cyan : C.white);
    });
  }
  drawFloor(frame);
  if (s < b(1) && blink(s, 4)) frame.glyphText('请投币', W / 2, 82, MEDIUM, { align: 'center', color: C.lemon, scale: 2 });
  if (pose >= 3) {
    const label = frame.glyphText('得分', 8, 4, SMALL);
    frame.text(pad(collected * 100, 6), 8 + label + 4, 7, { color: C.lemon });
    frame.glyphText('第 1-1 关', W - 8, 4, SMALL, { align: 'right' });
  }

  // title blocks: fall in, then a wave hop character by character after the flash
  for (const block of titleBlocks) {
    const height = fall(s, block.land, block.y + 12, 0.35);
    if (height === null) continue;
    const wave = hop(s, FLASH + (block.char + 2) / 12, 0.25, 5);
    frame.block(block.x, block.y - height - wave, TITLE.scale, TITLE.scale, block.color);
  }

  // loading bar and coins
  if (s >= b(5.5) && s < b(13)) {
    const opened = Math.min(1, ((s - b(5.5)) * 12) / 2);
    const frameWidth = Math.round(BAR.w * (0.5 + opened / 2));
    frame.frame(BAR.x, BAR.y, frameWidth, 15, C.white);
    for (let n = 0; n < COINS; n++) {
      const cellX = BAR.x + 3 + n * (BAR.cell + BAR.gap);
      if (cellX + BAR.cell > BAR.x + frameWidth - 3) continue;
      if (n < collected) frame.block(cellX, BAR.y + 3, BAR.cell, BAR.cell, C.lime);
      else frame.rect(cellX, BAR.y + 3, BAR.cell, BAR.cell, C.grid);
    }
    const ready = collected === COINS;
    if (!ready || blink(s, 4)) frame.glyphText(ready ? '准备就绪' : '加载中', BAR.x - 6, BAR.y + 1, SMALL, { color: ready ? C.lime : C.white, align: 'right' });
    frame.text(`${collected * 10}%`, BAR.x + BAR.w + 6, BAR.y + 4, { color: C.lemon });
  }
  for (let n = 0; n < COINS; n++) {
    const appear = b(5.5) + Math.floor(n / 2) / 12;
    if (s < appear) continue;
    if (s < coinAt(n)) {
      frame.sprite(SPRITES.coin[(pose + n) % 4], coinX(n) - 8, COIN_Y, { scale: 2 });
    } else if (s < coinAt(n) + 2 / 12) {
      frame.sprite(SPRITES.sparkle, coinX(n) - 5, COIN_Y - 2 - Math.round((s - coinAt(n)) * 72), { scale: 2 });
    }
  }

  // the tomato: hop-walks in on the coin grid (it has no legs), stops, jumps on the flash, hops on beat 14
  if (s >= b(5.5)) {
    const walking = s < coinAt(COINS - 1) + EIGHTH;
    const bob = walking && pose % 2 ? 3 : 0;
    drawHero(frame, Math.round(heroX(s)), FLOOR_Y, bob + hop(s, FLASH, b(1), 22) + hop(s, b(14), b(0.5), 8));
  }

  // end card: blinks, then stays lit for the last beat so the final frame reads
  if (s >= b(13)) {
    if (blink(s - b(13), 2) || s >= b(15)) frame.glyphText('开始游戏', W / 2, 92, MEDIUM, { align: 'center', scale: 2 });
    frame.glyphText('2027.11.01 上线', W / 2, 130, SMALL, { align: 'center', color: C.lemon });
  }

  // the downbeat flash: two inverted poses
  if (s >= FLASH && s < FLASH + 2 / 12) frame.invert();
}

function cues() {
  const list = [{ t: 0, sound: 'select' }];
  for (let index = 0; index < CHARS; index++) list.push({ t: charLanded(index), sound: 'land' });
  list.push({ t: b(5.5), sound: 'blip', pitch: 12 });
  for (let n = 0; n < COINS; n++) list.push({ t: coinAt(n), sound: 'coin' });
  list.push({ t: FLASH, sound: 'flash' }, { t: FLASH, sound: 'powerup' }, { t: FLASH, sound: 'jump' });
  for (let index = 0; index < CHARS; index++) list.push({ t: FLASH + (index + 2) / 12, sound: 'tick', pitch: index * 3 });
  list.push({ t: b(13), sound: 'select' }, { t: b(14), sound: 'jump' });
  return list;
}

export default {
  width: W,
  height: H,
  duration: b(16),
  draw,
  cues,
  music: { file: '../assets/chiptune-120bpm.mp3', from: 18.012 },
};
