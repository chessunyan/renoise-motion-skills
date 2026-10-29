---
name: pixel-blocks-motion
description: Make pixel-art motion graphics in the Pixel Blocks style (deep navy pixel grid, four arcade inks, words and charts built block by block, stepped 12 fps motion, chunky bitmap type, chiptune sound effects) entirely with code. A brief becomes a beat-locked storyboard, a scene module drawn on a 320×180 framebuffer, probe stills, then an MP4 or GIF rendered by ffmpeg in about a second, with no browser and no npm packages. Use when the user asks for pixel, 8-bit, arcade or retro-game style motion graphics, a pixel launch intro, title card or logo build, a pixel data chart or year-in-review animation, a level-up / achievement / loading clip, 像素风动效, 8-bit 风格视频, or names the Pixel Blocks style from Renoise Motion Studio. Not for single pixel-art illustrations, live-action or realistic footage, or the other Motion Studio styles.
---

# Pixel Blocks motion

One of the 54 styles of [Renoise Motion Studio](https://renoise.ai/motion-studio?utm_source=renoise-motion-skills-tomato-202610&utm_medium=github&utm_content=skill-md), packaged so any coding agent can make it locally. The look is drawn by code, frame by frame: every block sits on the grid, every letter is a bitmap, and any frame can be re-rendered on its own.

Requirements: Node 18+ and ffmpeg. Pillow only if you need Chinese / Japanese / Korean text (`scripts/bake-glyphs.py`).

Reply to the user in their language. Keep the style text below in English when you quote it into prompts: it is the contract the look is judged against.

## The style contract

> Deep navy ground under a coarse pixel grid. Everything is built from square blocks in an arcade palette of hot pink, cyan, lemon and lime, with chunky pixel type. Shapes and words build up block by block, sprites walk in stepped frames, progress bars fill whole cells at a time and coins blink. Motion is stepped and never smooth, at a low frame rate. Avoid anti-aliased curves, gradients, soft shadows and realistic light.

| Token | Value | In the engine |
|---|---|---|
| Ground | `#0B1030` navy | `C.navy` (frames are cleared to it) |
| Grid | `#151D4F`, a 1-px line every 10 px | `frame.grid(10, C.grid)` |
| Inks | pink `#FF3E9A`, cyan `#33E1FF`, lemon `#FFE14D`, lime `#8CFF5A`, plus white `#F4F6FF` | `C.*`, `ARCADE` (the four, in cycle order) |
| Canvas | 320×180 (16:9), 180×320 (9:16), 180×180 (1:1); ×6 on output | `width`, `height`, `--scale 6` |
| Motion | 12 poses a second, held on twos at 24 fps; 6 poses per beat at 120 BPM | `step(t)` |
| Block | a square with a hard 1-px bevel (light top-left, dark bottom-right) | `frame.block(x, y, w, h, ink)` |
| Type | 5×7 bitmap face, uppercase; titles at scale 4–5 drawn as blocks | `frame.text(str, x, y, { scale, block })` |
| CJK type | anti-aliasing off, baked from a system font: 12 px for HUD labels, 16 px for lines and cards, bold 16 px ×3 as blocks for titles | `bake-glyphs.py` → `frame.glyphText()`, `glyphCells()` |
| Sprites | hero (the examples use 一颗西红柿番茄's pixel tomato), coin (4-frame spin), trophy, star, heart, sparkle; one scale per layer | `drawHero()`, `SPRITES`, `frame.sprite(rows, x, y, { scale, inks })` |
| Never | anti-aliasing, gradients, soft shadows, glow, realistic light, a fifth ink | — |

A single extra shade for depth (`C.gold` on coins, `C.dim` for floors and panel borders) is fine; a second accent family is not. The one exception is a brand character, which keeps its own colours (the tomato's reds and olive leaf, `TOMATO_INKS`). To use your own hero, replace `SPRITES.tomato`, `TOMATO_INKS` and `HERO` in `pixel.mjs`.

## Workflow

### 1 · Brief

You need four things: **what it is** (product, game, data, announcement), **the one message**, **where it ends** (end card, CTA, 开始游戏), and **format + length** (default 16:9, 8 s). If any is missing, ask ONE short question at a time, and offer a default with a one-line reason instead of asking the user to pick technical terms.

Brief template the user can fill:

```
Make a [8]s [16:9] Pixel Blocks piece for [what]. It should show [the message as 2–4 beats of action]. End on [end card / CTA]. Music: [my track / chiptune / none].
```

### 2 · Storyboard on the beat

Pick the tempo first (the user's track, measured; otherwise 120 BPM, where a beat is 0.5 s and 6 poses). Then write the storyboard as a beat table and show it before building:

| Beats | Time | What happens | Sound cue |
|---|---|---|---|
| 0 | 0–0.5 s | grid boots three rows per pose, 请投币 blinks, HUD on | select |
| 1–5 | 0.5–3 s | the title lands one character per beat, each built from falling blocks | land × characters |
| 6–11 | 3–5.5 s | the hero collects a coin per eighth, each fills a bar cell | coin × 10 |
| 12 | 6 s | flash (2 inverted poses), title wave | flash, powerup |
| 13–16 | 6.5–8 s | end card blinks, holds lit for the last beat | select, jump |

Rules of thumb: big events on downbeats (beat 0, 4, 8, 12), repeated small events on eighths or sixteenths, one idea per bar, and the last beat is a hold.

If generating music or anything else spends credits, show the storyboard with the cost and wait for an explicit yes first.

### 3 · Build the scene

Copy the example closest to the brief from `examples/` and change it; don't start from a blank file.

| Example | Format | Shows how to |
|---|---|---|
| `launch-intro.mjs` | 16:9 · 8 s | build a Chinese title (方块大作战) from falling blocks, hop the hero over coins that fill a bar, flash on the drop, end on 开始游戏 |
| `data-story.mjs` | 16:9 · 8 s | type a header, stack bar towers on sixteenths with values (0.9万…) inside the bars, hop the hero across them, open a callout, rain confetti |
| `level-up.mjs` | 9:16 · 8 s | slide a card in from under a HUD strip, fill an XP bar, stamp 升级！ in blocks, draw a card border clockwise, type a skill name, arc coins into a HUD counter |
| `reel.mjs` | 16:9 · 16 s | chain scenes back to back with continuous music |

A scene is a module:

```js
import { ARCADE, C, SPRITES, beats, blink, drawHero, fall, glyphCells, hop, step, textCells } from '../scripts/pixel.mjs';

const b = beats(120);              // b(k) = time of beat k
export default {
  width: 320, height: 180,
  duration: b(16),
  draw(frame, t) {                 // a pure function of t: no state between frames
    const s = step(t);             // animate on s, never on raw t
    frame.grid(10, C.grid);
    // ...
  },
  cues: () => [{ t: b(1), sound: 'land' }],   // computed from the same timing constants as draw
  music: { file: '../assets/chiptune-120bpm.mp3', from: 18.012 },  // offset of a downbeat in the track
};
```

Build rules:

- **Time.** Every position comes from `s = step(t)`. Derive event times from the beat clock (`b(k)`, `EIGHTH = b(0.5)`, `SIXTEENTH = b(0.25)`), and build `cues()` from the same functions as `draw`, so a sound can never drift off its picture.
- **Pixels.** Whole-pixel rectangles only (`rect`, `block`, `sprite`, `text`). Never draw at a fraction, never scale a sprite by a non-integer.
- **Blocks.** Make words out of falling cells with `textCells(str, scale)` (Latin) or `glyphCells(str, table, scale)` (CJK): give each cell a `land` time (one letter per eighth or one Chinese character per beat, bottom row first inside a glyph) and draw it at `fall(s, land, height, 0.35)`. `fall` returns `null` before the cell spawns.
- **Motion vocabulary.** Drops land with gravity (`fall`), jumps are parabolas (`hop`), bars fill one whole cell at a time, numbers roll in whole increments (`roll`), blinking is `blink(s, perSecond)`, the drop gets a 2-pose `frame.invert()` flash, boxes open in 3 poses, borders draw one side per pose.
- **Scale.** Latin title blocks at scale 4–5, CJK title blocks at scale 3, HUD text at scale 1–2, coins at scale 2, the hero at its native size (`drawHero(frame, x, footY, lift)`). Keep one scale per layer.
- **Randomness.** Only seeded: `random(seed)`.
- **Chinese / Japanese / Korean.** Bake every character the scene uses: `python3 scripts/bake-glyphs.py "解锁新技能" --size 16 --out examples/cjk-16.json` (also `--size 12` for HUD labels, and `--size 16 --index 2` for the bold title face). Draw with `frame.glyphText(str, x, y, table, { color, align, scale })`; digits and Latin the table lacks fall back to the 5×7 face, so `第 1-1 关` or `0.9万` is one call. Don't bake digits: the 5×7 ones look more arcade.

### 4 · Probe before rendering

Render one still per beat (or 12–20 at key moments) and look at the contact sheet:

```bash
node scripts/render.mjs examples/my-scene.mjs --stills 0.25,0.75,1.5,2.5,3.5,4.5,5.5,6.05,7.95 --out qa/my-scene
```

`qa/my-scene/sheet.png` labels each still with its time. Check, and fix before the full render:

- [ ] Every element is inside the frame at its extreme (tallest bar, highest jump, trophy above the hero)
- [ ] No text overlaps a sprite lane, another label or a moving object
- [ ] The hero and coins read at a glance
- [ ] Each event sits on its beat (compare the still times with the storyboard)
- [ ] The first frame is not empty and the last frame reads (a blinking end card stays lit for the last beat)
- [ ] Only the six inks; no smooth movement anywhere

### 5 · Render and mix

```bash
node scripts/render.mjs examples/my-scene.mjs --out showcases/my-scene.mp4          # 8 s renders in about 1 s
node scripts/render.mjs examples/my-scene.mjs --out showcases/gif/my-scene.gif --scale 2   # silent GIF for a README
node scripts/render.mjs examples/my-scene.mjs --out showcases/my-scene.mp4 --watermark path/to/logo.png   # optional
```

- Frames go straight from the framebuffer to ffmpeg and are scaled ×6 with nearest-neighbour, so edges stay hard. Keep the scale even: H.264 stores colour at half resolution, and an even block size keeps colour edges on the block edges.
- **Music.** The user's track, a generated chiptune (with the Renoise MCP: `lyria-pro`, instrumental 8-bit, 120 BPM; show the cost and wait for approval), or none. Measure the tempo and the first downbeat before trusting a prompt's BPM, and set `music.from` to a downbeat so scene time 0 lands on one.
- **Sound effects** are synthesised from `cues` by `scripts/chip.mjs` (square, triangle and noise voices): `tick` (block lands, `pitch` in semitones), `land`, `coin`, `blip`, `type`, `jump`, `powerup`, `flash`, `select`, `whoosh`, `clear`. Rising `pitch` on stacked blocks turns a build into an arpeggio. Effects sit under the music; the mix is normalised to about -14 LUFS.
- **Watermark.** `--watermark logo.png` stamps a PNG bottom-right after the ×6 upscale, so the logo stays sharp: 5% of the short side tall, inset 2.8%, 92% opacity. Keep the scene's own content out of that corner. For stills, `brand/apply-watermark.py` in the repo does the same and adds a dark plate on light corners.
- Deliver the MP4, the contact sheet and the storyboard table; offer the GIF and a 9:16 cut if the piece is for social.

## Engine reference (`scripts/pixel.mjs`)

| Function | Does |
|---|---|
| `step(t, fps = 12)` | quantise time to the pose grid |
| `beats(bpm, offset)` → `b(k)` | beat clock |
| `prog(t, start, duration)` | 0→1 progress |
| `fall(t, landAt, height, duration)` | height above the landing spot under gravity; `null` before spawn |
| `hop(t, start, duration, height)` | parabolic jump height |
| `roll(t, start, duration, from, to, increment)` | number that rolls in whole steps |
| `blink(t, perSecond)` | on for the first half of each period |
| `random(seed)` | deterministic PRNG |
| `textWidth(str, scale)`, `textCells(str, scale)` | layout, and every lit cell of a string for block builds |
| `glyphCells(str, table, scale)` | the same for a baked CJK table; returns `{ cells, width }` |
| `drawHero(frame, x, footY, lift)`, `HERO` | the hero centred on x, standing on footY; `HERO.width / height` for layout |
| `frame.clear / rect / frame / grid / block / sprite / text / glyphText / invert` | drawing |
| `SPRITES` | `tomato`, `coin[4]`, `trophy`, `star`, `heart`, `sparkle`, `arrowDown` |

## Gotchas found while making the showcases

- A 14-px sprite on a 320-px canvas disappears; a hero needs about 25 px, coins scale 2.
- Ink outlines vanish on navy: give edges a colour.
- A hero without legs still walks: hop it 3 px on every other pose.
- Labels under a progress bar collide with a coin row; put labels beside the bar.
- Stacked bars plus a hero plus a trophy run off the top; lower the block height before shrinking anything else, and put values inside the bars so the hero can stand on them. Give each value a flat plate the colour of its bar, or the bevel lines run through the type.
- A blinking end card can land on its off frame; keep it lit for the final beat.
- Anything sliding in from the top passes over the HUD; give the HUD its own navy strip and draw it after.
- `python3 -I` hides user-installed Pillow; run `bake-glyphs.py` without `-I`.
