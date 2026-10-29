// Showcase 2 · Data story (16:9, 8 s = 16 beats at 120 BPM), all on-screen text in Chinese.
// Brief: "做一支 8 秒的年度数据动画：月活按季度从 0.9 万涨到 3.6 万。柱子用方块一块块叠上去，
// 番茄跳到最高的柱子上拿奖杯，弹出 +300% 的标注，最后撒彩纸。"
//
//   beats 0–2    header types in, one character per pose
//   beats 2–8    the four quarter towers stack on sixteenth notes, one beat apart; values roll per block
//   beats 8–10   the tomato hops tower to tower on the eighths
//   beat 10      it lands on the last tower, the trophy rises ("item get")
//   beat 11      +300% callout opens, a marching dashed line points at the winner
//   beats 12–16  confetti, the tomato bounces on the beat

import fs from 'node:fs';
import { ARCADE, C, HERO, SPRITES, beats, blink, drawHero, fall, hop, random, step } from '../scripts/pixel.mjs';

const W = 320;
const H = 180;
const b = beats(120);
const SIXTEENTH = b(0.25);
const GROUND = 149;
const BLOCK = { w: 28, h: 6 };
const table = (name) => JSON.parse(fs.readFileSync(new URL(`./${name}.json`, import.meta.url)));
const SMALL = table('cjk-12');
const MEDIUM = table('cjk-16');

const HEADER = [...'2026 年度数据'];
const SUBTITLE = [...'月活跃用户'];
const TOWERS = [3, 5, 8, 12].map((blocks, i) => ({
  label: `${i + 1}季度`,
  blocks,
  x: 60 + i * 56,
  color: ARCADE[i],
  start: b(2 + i),
  top: GROUND - blocks * BLOCK.h,
}));
const PER_BLOCK = 0.3; // 万 users
const blockLands = (tower, k) => tower.start + (k + 1) * SIXTEENTH;
const towerDone = (tower) => blockLands(tower, tower.blocks - 1);

// the tomato: ground → each tower in turn, one hop per eighth from beat 8
const HOP = b(0.5);
const stands = [{ x: 30, y: GROUND }, ...TOWERS.map((tower) => ({ x: tower.x + BLOCK.w / 2, y: tower.top }))];
const hopStart = (i) => b(8) + i * HOP;
const ARRIVE = hopStart(TOWERS.length);

function heroPosition(t) {
  if (t < hopStart(0)) return stands[0];
  for (let i = 0; i < TOWERS.length; i++) {
    if (t < hopStart(i + 1)) {
      const p = (t - hopStart(i)) / HOP;
      const from = stands[i];
      const to = stands[i + 1];
      const arc = Math.round(4 * 16 * p * (1 - p));
      return { x: Math.round(from.x + (to.x - from.x) * p), y: Math.round(from.y + (to.y - from.y) * p) - arc };
    }
  }
  const bounce = [12, 13, 14, 15].reduce((sum, k) => sum + hop(t, b(k), b(0.5), 6), 0);
  return { ...stands[TOWERS.length], y: stands[TOWERS.length].y - bounce };
}

const CALLOUT = { x: 32, y: 50, w: 112, h: 56, open: b(11) };

const confetti = (() => {
  const next = random(2026);
  return Array.from({ length: 46 }, () => ({
    x: Math.floor(next() * W),
    start: b(12) + next() * b(3),
    speed: 60 + next() * 50,
    sway: next() * Math.PI * 2,
    color: ARCADE[Math.floor(next() * ARCADE.length)],
  }));
})();

function draw(frame, t) {
  const s = step(t);
  const pose = Math.floor(s * 12);
  frame.grid(10, C.grid);

  // header types one character per pose, block cursor after it
  const typed = Math.min(HEADER.length, pose);
  const headerWidth = frame.glyphText(HEADER.slice(0, typed).join(''), 16, 10, MEDIUM);
  if (typed < HEADER.length || (blink(s, 2) && s < b(8))) frame.rect(16 + headerWidth + (typed ? 3 : 0), 10, 8, 16, C.lemon);
  if (s >= b(2)) frame.glyphText(SUBTITLE.slice(0, Math.max(0, pose - 11)).join(''), 16, 32, SMALL, { color: C.cyan });

  // ground and towers
  // the ground and the hero are there from frame 0, so the first frame is never empty
  frame.rect(32, GROUND, Math.min(W - 64, (pose + 1) * 48), 1, C.white);
  for (const tower of TOWERS) {
    if (s < tower.start - b(0.5)) continue;
    frame.glyphText(tower.label, tower.x + BLOCK.w / 2, GROUND + 3, SMALL, { align: 'center' });
    let landed = 0;
    for (let k = 0; k < tower.blocks; k++) {
      const height = fall(s, blockLands(tower, k), 28, 0.17);
      if (height === null) continue;
      if (height === 0) landed++;
      frame.block(tower.x, GROUND - (k + 1) * BLOCK.h - height, BLOCK.w, BLOCK.h, tower.color);
    }
    // the value rides inside the top of the bar, so the hero can stand on it (once the bar is tall enough)
    if (landed >= 3) {
      const top = GROUND - landed * BLOCK.h;
      frame.rect(tower.x + 1, top + 1, BLOCK.w - 2, 14, tower.color);
      frame.glyphText(`${(landed * PER_BLOCK).toFixed(1)}万`, tower.x + BLOCK.w / 2, top + 2, SMALL, { align: 'center', color: C.ink });
    }
  }

  // the trophy rises over the hero once it reaches the top ("item get")
  const hero = heroPosition(s);
  if (s >= ARRIVE) {
    const rise = Math.min(3, Math.floor((s - ARRIVE) * 12)) * 4;
    const bob = s >= b(12) ? (Math.floor(s * 4) % 2) : 0;
    const top = hero.y - HERO.height - 8 - rise - bob;
    frame.sprite(SPRITES.trophy, hero.x - 12, top - 20, { scale: 2 });
    if (pose % 4 < 2) frame.sprite(SPRITES.sparkle, hero.x + 14, top - 26, { scale: 1 });
    if (pose % 4 >= 2) frame.sprite(SPRITES.sparkle, hero.x - 20, top - 12, { scale: 1 });
  }
  drawHero(frame, hero.x, hero.y);

  // callout: the box opens from its centre in three poses, then the number stamps in
  if (s >= CALLOUT.open) {
    const opened = Math.min(3, Math.floor((s - CALLOUT.open) * 12) + 1) / 3;
    const w = Math.round(CALLOUT.w * opened);
    const x = CALLOUT.x + Math.round((CALLOUT.w - w) / 2);
    frame.rect(x, CALLOUT.y, w, CALLOUT.h, C.ink);
    frame.frame(x, CALLOUT.y, w, CALLOUT.h, C.lime);
    frame.frame(x + 2, CALLOUT.y + 2, w - 4, CALLOUT.h - 4, C.lime);
    if (opened === 1) {
      frame.text('+300%', CALLOUT.x + CALLOUT.w / 2, CALLOUT.y + 8, { scale: 3, color: C.lime, align: 'center' });
      frame.glyphText('全年增长', CALLOUT.x + CALLOUT.w / 2, CALLOUT.y + 33, MEDIUM, { align: 'center' });
      // marching dashes from the box to the Q4 tower
      const from = CALLOUT.x + CALLOUT.w + 4;
      const to = TOWERS[3].x - 6;
      for (let x = from + (pose % 4) * 2; x < to; x += 8) frame.rect(x, CALLOUT.y + CALLOUT.h / 2, 4, 1, C.lime);
      frame.rect(to - 1, CALLOUT.y + CALLOUT.h / 2 - 2, 2, 5, C.lime);
    }
  }

  // confetti: 2×2 pieces falling in steps, swaying a pixel either way
  for (const piece of confetti) {
    if (s < piece.start) continue;
    const y = Math.round((s - piece.start) * piece.speed) - 4;
    if (y > H) continue;
    const x = piece.x + Math.round(Math.sin(piece.sway + s * 6) * 2);
    frame.rect(x, y, 3, 3, piece.color);
  }
}

function cues() {
  const list = [];
  for (let i = 0; i < HEADER.length; i += 2) list.push({ t: (i + 1) / 12, sound: 'type' });
  list.push({ t: b(2), sound: 'blip', pitch: 7 });
  TOWERS.forEach((tower, i) => {
    for (let k = 0; k < tower.blocks; k++) list.push({ t: blockLands(tower, k), sound: 'tick', pitch: k + i * 2 });
    list.push({ t: towerDone(tower), sound: 'land' });
  });
  for (let i = 0; i < TOWERS.length; i++) list.push({ t: hopStart(i), sound: 'jump' });
  list.push({ t: ARRIVE, sound: 'powerup' }, { t: CALLOUT.open, sound: 'select' }, { t: b(12), sound: 'clear' });
  return list;
}

export default {
  width: W,
  height: H,
  duration: b(16),
  draw,
  cues,
  music: { file: '../assets/chiptune-120bpm.mp3', from: 26.012 },
};
