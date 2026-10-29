// Showcase 3 · Level up (9:16, 8 s = 16 beats at 120 BPM), all on-screen text in Chinese.
// Brief: "做一支 9:16、8 秒的竖版短视频，用游戏升级的方式宣布一个新功能：任务完成卡片滑下来，
// 经验条涨满，「升级！」砸出来，技能卡解锁写着「解锁新技能：像素方块」，金币飞进右上角的计数器。"
//
//   beats 0–2    quest card slides down in 8-pixel steps, lands on beat 2
//   beats 2–5    the XP bar fills one cell per sixteenth
//   beat 6       flash; 升级！ builds one character per eighth; level 01 → 02 on beat 7
//   beats 8–10   skill card border draws clockwise, its title types in
//   beats 10–12  eight coins arc from the card into the HUD counter
//   beats 13–16  点击 ▶ 开始, the tomato hops on beats 14 and 15

import fs from 'node:fs';
import { ARCADE, C, SPRITES, beats, blink, drawHero, fall, glyphCells, hop, pad, step } from '../scripts/pixel.mjs';

const W = 180;
const H = 320;
const b = beats(120);
const SIXTEENTH = b(0.25);
const EIGHTH = b(0.5);
const SPRITE_SCALE = 2;
const table = (name) => JSON.parse(fs.readFileSync(new URL(`./${name}.json`, import.meta.url)));
const SMALL = table('cjk-12');
const MEDIUM = table('cjk-16');
const TITLE_FONT = table('cjk-title');

const QUEST = { x: 10, y: 34, w: 160, h: 46 };
const XP = { x: 10, y: 120, cells: 12, cell: 11, gap: 2, start: b(2) };
const xpCellAt = (n) => XP.start + (n + 1) * SIXTEENTH;
const FLASH = b(6);
const LEVEL_UP_AT = b(7);
const SKILL = { x: 10, y: 214, w: 160, h: 52, open: b(8) };
const COIN_HUD = { x: 120, y: 8 };
const COINS = 8;
const coinLaunch = (i) => b(10) + i / 12;
const COIN_FLIGHT = b(1);
const FLOOR_Y = 304;
const HERO_X = 24;

// 升级！ — one character per eighth from the flash, cells bottom row first
const LEVEL = { text: '升级！', y: 148, scale: 3 };
const levelLayout = glyphCells(LEVEL.text, TITLE_FONT, LEVEL.scale);
const levelLeft = Math.round((W - levelLayout.width) / 2);
const letterCount = [...LEVEL.text].length;
const levelBlocks = [];
for (let index = 0; index < letterCount; index++) {
  const glyph = levelLayout.cells.filter((cell) => cell.index === index).sort((a, c) => c.row - a.row || a.column - c.column);
  const windowStart = FLASH + index * EIGHTH;
  glyph.forEach((cell, order) => levelBlocks.push({
    x: levelLeft + cell.x,
    y: LEVEL.y + cell.y,
    land: windowStart + (EIGHTH * (order + 1)) / glyph.length,
    color: ARCADE[index % ARCADE.length],
  }));
}

function coinPosition(i, t) {
  const p = (t - coinLaunch(i)) / COIN_FLIGHT;
  const from = { x: SKILL.x + SKILL.w / 2, y: SKILL.y };
  const control = { x: from.x + (i % 2 ? 70 : -70), y: 120 };
  const to = COIN_HUD;
  const q = 1 - p;
  return {
    x: Math.round(q * q * from.x + 2 * q * p * control.x + p * p * to.x),
    y: Math.round(q * q * from.y + 2 * q * p * control.y + p * p * to.y),
  };
}

function drawFloor(frame) {
  for (let row = 0; FLOOR_Y + row * 7 < H; row++) {
    for (let x = row % 2 === 0 ? 0 : -5; x < W; x += 10) frame.block(x, FLOOR_Y + row * 7, 10, 7, C.dim);
  }
}

function draw(frame, t) {
  const s = step(t);
  const pose = Math.floor(s * 12);
  frame.grid(10, C.grid);
  drawFloor(frame);

  // quest card slides down 8 pixels a pose and lands on beat 2
  const questY = Math.min(QUEST.y, QUEST.y - (12 - pose) * 8);
  if (questY > -QUEST.h) {
    frame.rect(QUEST.x, questY, QUEST.w, QUEST.h, C.ink);
    frame.frame(QUEST.x, questY, QUEST.w, QUEST.h, C.cyan);
    frame.frame(QUEST.x + 2, questY + 2, QUEST.w - 4, QUEST.h - 4, C.cyan);
    if (pose % 6 < 4) frame.sprite(SPRITES.star, QUEST.x + 10, questY + 16, { scale: SPRITE_SCALE });
    frame.glyphText('任务完成！', QUEST.x + 40, questY + 8, MEDIUM, { color: C.lemon });
    frame.glyphText('第 1-1 关 已通关', QUEST.x + 40, questY + 28, SMALL);
  }

  // HUD: level badge and coin counter on a strip of its own, so the card slides in from under it
  frame.rect(0, 0, W, 26, C.navy);
  frame.rect(0, 26, W, 1, C.dim);
  const badge = frame.glyphText('等级', 10, 6, MEDIUM) + 16;
  if (s >= LEVEL_UP_AT && s < LEVEL_UP_AT + 2 / 12) frame.text('--', badge, 7, { scale: 2, color: C.white });
  else frame.text(s >= LEVEL_UP_AT ? '02' : '01', badge, 7, { scale: 2, color: s >= LEVEL_UP_AT ? C.lime : C.lemon });
  const banked = Array.from({ length: COINS }, (_, i) => s >= coinLaunch(i) + COIN_FLIGHT).filter(Boolean).length;
  frame.sprite(SPRITES.coin[banked > 0 && s < coinLaunch(COINS - 1) + COIN_FLIGHT + 0.2 ? pose % 4 : 0], COIN_HUD.x, COIN_HUD.y);
  frame.text(`×${pad(40 + banked * 10, 4)}`, W - 10, 9, { align: 'right', color: C.lemon });

  // XP bar: on screen (empty) from frame 0, then one cell per sixteenth
  {
    const filled = Array.from({ length: XP.cells }, (_, n) => s >= xpCellAt(n)).filter(Boolean).length;
    frame.glyphText('经验', XP.x, XP.y - 22, MEDIUM);
    frame.text(`${pad(filled * 100, 4)}/1200`, XP.x + QUEST.w, XP.y - 17, { align: 'right', color: filled === XP.cells ? C.lime : C.lemon });
    frame.frame(XP.x, XP.y, QUEST.w, 16, C.white);
    for (let n = 0; n < XP.cells; n++) {
      const cellX = XP.x + 3 + n * (XP.cell + XP.gap);
      if (n < filled) frame.block(cellX, XP.y + 3, XP.cell, 10, filled === XP.cells && pose % 2 ? C.lemon : C.lime);
      else frame.rect(cellX, XP.y + 3, XP.cell, 10, C.grid);
    }
  }

  // 升级！ blocks
  for (const block of levelBlocks) {
    const height = fall(s, block.land, block.y + 8, 0.25);
    if (height !== null) frame.block(block.x, block.y - height, LEVEL.scale, LEVEL.scale, block.color);
  }

  // skill card: border draws clockwise in four poses, then the title types in
  if (s >= SKILL.open) {
    const sides = Math.min(4, Math.floor((s - SKILL.open) * 12) + 1);
    const { x, y, w, h } = SKILL;
    if (sides >= 4) frame.rect(x + 1, y + 1, w - 2, h - 2, C.ink);
    if (sides >= 1) frame.rect(x, y, w, 2, C.lime);
    if (sides >= 2) frame.rect(x + w - 2, y, 2, h, C.lime);
    if (sides >= 3) frame.rect(x, y + h - 2, w, 2, C.lime);
    if (sides >= 4) {
      frame.rect(x, y, 2, h, C.lime);
      // the skill's icon: four blocks in the four inks
      ARCADE.forEach((ink, i) => frame.block(x + 10 + (i % 2) * 11, y + 14 + Math.floor(i / 2) * 11, 11, 11, ink));
      const typed = Math.max(0, Math.floor((s - SKILL.open) * 12) - 3);
      frame.glyphText('解锁新技能'.slice(0, typed), x + 40, y + 8, MEDIUM);
      frame.glyphText('像素方块'.slice(0, Math.max(0, typed - 5)), x + 40, y + 28, MEDIUM, { color: C.lemon });
      if (typed >= 9) {
        frame.rect(x + w - 24, y + 8, 16, 14, C.pink);
        frame.glyphText('新', x + w - 16, y + 9, SMALL, { align: 'center', color: C.white });
      }
    }
  }

  // coins arc from the card into the counter
  for (let i = 0; i < COINS; i++) {
    if (s < coinLaunch(i) || s >= coinLaunch(i) + COIN_FLIGHT) continue;
    const { x, y } = coinPosition(i, s);
    frame.sprite(SPRITES.coin[(pose + i) % 4], x - 8, y - 8, { scale: SPRITE_SCALE });
  }

  // the tomato
  drawHero(frame, HERO_X, FLOOR_Y, hop(s, FLASH, b(1), 24) + hop(s, b(14), b(0.5), 10) + hop(s, b(15), b(0.5), 10));

  if (s >= b(13) && (blink(s - b(13), 2) || s >= b(15))) frame.glyphText('点击 ▶ 开始', W / 2 + 14, 284, SMALL, { align: 'center' });

  if (s >= FLASH && s < FLASH + 2 / 12) frame.invert();
}

function cues() {
  const list = [{ t: 0, sound: 'whoosh' }, { t: b(2), sound: 'select' }];
  for (let n = 0; n < XP.cells; n++) list.push({ t: xpCellAt(n), sound: 'blip', pitch: n });
  list.push({ t: FLASH, sound: 'flash' }, { t: FLASH, sound: 'jump' });
  for (let letter = 0; letter < letterCount; letter++) list.push({ t: FLASH + (letter + 1) * EIGHTH, sound: 'land' });
  list.push({ t: LEVEL_UP_AT, sound: 'powerup' }, { t: SKILL.open, sound: 'select' });
  for (let i = 0; i < 9; i++) list.push({ t: SKILL.open + (i + 4) / 12, sound: 'type' });
  for (let i = 0; i < COINS; i++) list.push({ t: coinLaunch(i) + COIN_FLIGHT, sound: 'coin' });
  list.push({ t: b(13), sound: 'select' }, { t: b(14), sound: 'jump' }, { t: b(15), sound: 'clear' });
  return list;
}

export default {
  width: W,
  height: H,
  duration: b(16),
  draw,
  cues,
  music: { file: '../assets/chiptune-120bpm.mp3', from: 44.012 },
};
