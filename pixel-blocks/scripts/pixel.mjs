// Pixel Blocks engine: pixel-art motion drawn as a pure function of time.
//
// A scene draws onto a small framebuffer (320×180 for 16:9, 180×320 for 9:16) with integer
// rectangles only, so nothing is ever anti-aliased. render.mjs scales every frame up with
// nearest-neighbour (×6 → 1920×1080) and pipes it to ffmpeg. No browser, no canvas, no deps.
//
// Rules the helpers enforce:
//   - every frame is draw(frame, t): no state carried between frames, so any frame renders alone;
//   - motion is stepped: animate on step(t) (12 poses a second), never on raw t;
//   - positions are whole pixels: rect() rounds, nothing is drawn at a fraction.

// ── colour ──────────────────────────────────────────────────────────────────

export function hex(value) {
  const n = parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(from, to, amount) {
  return from.map((channel, i) => Math.round(channel + (to[i] - channel) * amount));
}

export const C = {
  navy: hex('#0b1030'),
  grid: hex('#151d4f'),
  ink: hex('#05081c'),
  white: hex('#f4f6ff'),
  pink: hex('#ff3e9a'),
  cyan: hex('#33e1ff'),
  lemon: hex('#ffe14d'),
  lime: hex('#8cff5a'),
};
C.gold = mix(C.lemon, C.ink, 0.35);
C.dim = mix(C.cyan, C.navy, 0.62);

/** The four arcade inks, in the order letters and towers cycle through them. */
export const ARCADE = [C.pink, C.cyan, C.lemon, C.lime];

// ── time ────────────────────────────────────────────────────────────────────

export const STEP_FPS = 12;

/** Quantise time to the pose grid: 12 poses a second, held on twos at 24 fps. */
export const step = (t, fps = STEP_FPS) => Math.floor(t * fps + 1e-6) / fps;
export const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const lerp = (a, b, p) => a + (b - a) * p;
/** 0→1 progress of t across [start, start + duration]. */
export const prog = (t, start, duration) => clamp((t - start) / duration);
/** On for the first half of every period. */
export const blink = (t, perSecond = 2) => Math.floor(t * perSecond * 2) % 2 === 0;

/** Beat clock: beats(120)(k) is the time of beat k. */
export const beats = (bpm, offset = 0) => (k) => offset + (k * 60) / bpm;

/**
 * Height above the landing spot of something dropped under gravity that lands at landAt
 * after falling `height` pixels for `duration` seconds. null before it spawns, 0 once landed.
 */
export function fall(t, landAt, height, duration = 0.3) {
  if (t >= landAt) return 0;
  const start = landAt - duration;
  if (t < start) return null;
  const p = (t - start) / duration;
  return Math.round(height * (1 - p * p));
}

/** Height of a hop that leaves at start and lands after duration (a parabola, peak `height`). */
export function hop(t, start, duration, height) {
  if (t < start || t >= start + duration) return 0;
  const p = (t - start) / duration;
  return Math.round(4 * height * p * (1 - p));
}

/** A number that rolls from `from` to `to` in whole increments of `increment`. */
export function roll(t, start, duration, from, to, increment = 1) {
  const value = lerp(from, to, prog(t, start, duration));
  return Math.round(value / increment) * increment;
}

export const pad = (value, width) => String(value).padStart(width, '0');

/** Deterministic PRNG (mulberry32): same seed, same confetti, every render. */
export function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let r = Math.imul(state ^ (state >>> 15), 1 | state);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 5×7 bitmap font ─────────────────────────────────────────────────────────
// One string per glyph, rows joined with '/'. Glyphs are 5 wide unless drawn narrower.

const GLYPHS = {
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
  B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.###./#...#/#..../#..../#..../#...#/.###.',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####',
  F: '#####/#..../#..../####./#..../#..../#....',
  G: '.###./#...#/#..../#.###/#...#/#...#/.####',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '###/.#./.#./.#./.#./.#./###',
  J: '..###/...#./...#./...#./...#./#..#./.##..',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  N: '#...#/#...#/##..#/#.#.#/#..##/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  W: '#...#/#...#/#...#/#.#.#/#.#.#/#.#.#/.#.#.',
  X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
  Z: '#####/....#/...#./..#../.#.../#..../#####',
  0: '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  1: '.#./##./.#./.#./.#./.#./###',
  2: '.###./#...#/....#/...#./..#../.#.../#####',
  3: '####./....#/....#/.###./....#/....#/####.',
  4: '...#./..##./.#.#./#..#./#####/...#./...#.',
  5: '#####/#..../####./....#/....#/#...#/.###.',
  6: '..##./.#.../#..../####./#...#/#...#/.###.',
  7: '#####/....#/...#./..#../.#.../.#.../.#...',
  8: '.###./#...#/#...#/.###./#...#/#...#/.###.',
  9: '.###./#...#/#...#/.####/....#/...#./.##..',
  ' ': '.../.../.../.../.../.../...',
  '.': '././././././#',
  ',': '../../../../../.#/#.',
  '!': '#/#/#/#/#/./#',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  ':': '././#/././#/.',
  '-': '.../.../.../###/.../.../...',
  '+': '...../..#../..#../#####/..#../..#../.....',
  '%': '##..#/##..#/...#./..#../.#.../#..##/#..##',
  '/': '....#/....#/...#./..#../.#.../#..../#....',
  "'": '#/#/././././.',
  '·': './././#/././.',
  '>': '#.../.#../..#./...#/..#./.#../#...',
  '<': '...#/..#./.#../#.../.#../..#./...#',
  '▶': '#.../##../###./####/###./##../#...',
  '×': '...../#...#/.#.#./..#../.#.#./#...#/.....',
  '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.',
  '=': '...../...../#####/...../#####/...../.....',
  '(': '..#/.#./#../#../#../.#./..#',
  ')': '#../.#./..#/..#/..#/.#./#..',
  '_': '...../...../...../...../...../...../#####',
};

function parseGlyph(source) {
  return source.split('/').map((row) => [...row].map((cell) => cell === '#'));
}

export const FONT = Object.fromEntries(Object.entries(GLYPHS).map(([char, source]) => [char, parseGlyph(source)]));

export const GLYPH_HEIGHT = 7;

function glyphFor(char) {
  return FONT[char.toUpperCase()] ?? FONT['?'];
}

/** Width in pixels of str at `scale`, with one column (×scale) between glyphs. */
export function textWidth(str, scale = 1, spacing = 1) {
  const chars = [...str];
  if (chars.length === 0) return 0;
  const columns = chars.reduce((sum, char) => sum + glyphFor(char)[0].length, 0);
  return (columns + spacing * (chars.length - 1)) * scale;
}

/**
 * Every lit cell of str laid out at `scale`: { x, y, index (which char), column, row }.
 * x / y are relative to the text's top-left. Use it to make letters out of falling blocks.
 */
export function textCells(str, scale = 1, spacing = 1) {
  const cells = [];
  let cursor = 0;
  [...str].forEach((char, index) => {
    const glyph = glyphFor(char);
    glyph.forEach((row, rowIndex) => {
      row.forEach((lit, column) => {
        if (lit) cells.push({ x: (cursor + column) * scale, y: rowIndex * scale, index, column, row: rowIndex });
      });
    });
    cursor += glyph[0].length + spacing;
  });
  return cells;
}

/** Like textCells, for a baked glyph table: every lit pixel of str at `scale`. */
export function glyphCells(str, table, scale = 1) {
  const cells = [];
  let cursor = 0;
  [...str].forEach((char, index) => {
    const glyph = table.glyphs[char];
    glyph?.rows.forEach((row, rowIndex) => {
      [...row].forEach((cell, column) => {
        if (cell === '#') cells.push({ x: (cursor + column) * scale, y: rowIndex * scale, index, column, row: rowIndex });
      });
    });
    cursor += glyph?.advance ?? table.size;
  });
  return { cells, width: cursor * scale };
}

// ── sprites ─────────────────────────────────────────────────────────────────
// Rows of characters; '.' is transparent, every other letter is looked up in SPRITE_INKS.

export const SPRITE_INKS = {
  K: C.ink, W: C.white, P: C.pink, C: C.cyan, Y: C.lemon, L: C.lime, O: C.gold, D: C.dim,
};

export const SPRITES = {
  coin: [
    ['..KKKK..', '.KYYYYK.', 'KYWYYYOK', 'KYWYYYOK', 'KYYYYYOK', 'KYYYYYOK', '.KOOOOK.', '..KKKK..'],
    ['...KK...', '..KYYK..', '..KWYO..', '..KWYO..', '..KYYO..', '..KYYO..', '..KOOK..', '...KK...'],
    ['...KK...', '...YO...', '...YO...', '...YO...', '...YO...', '...YO...', '...YO...', '...KK...'],
    ['...KK...', '..KYYK..', '..OYWK..', '..OYWK..', '..OYYK..', '..OYYK..', '..KOOK..', '...KK...'],
  ],
  trophy: [
    'KKKKKKKKKKKK',
    'KYYYWYYYYYOK',
    'YKYYWYYYYOKY',
    'YKYYYYYYYOKY',
    '.KKYYYYYYOK.',
    '..KKYYYYOK..',
    '....KYOK....',
    '....KYOK....',
    '...KYYYOK...',
    '..KKKKKKKK..',
  ],
  star: ['....Y....', '...YYY...', 'YYYYYYYYY', '.YYYYYYY.', '..YYYYY..', '.YYY.YYY.', '.YY...YY.'],
  heart: ['.PP.PP.', 'PPPPPPP', 'PPPPPPP', '.PPPPP.', '..PPP..', '...P...'],
  arrowDown: ['#####', '.###.', '..#..'],
  sparkle: ['..W..', '.....', 'W.W.W', '.....', '..W..'],
  // the hero: 一颗西红柿番茄's pixel tomato, sampled from its 32×32 avatar (one eye, looking right, no limbs)
  tomato: [
    '.............GGB.........',
    '.............GG..........',
    '.............GK..........',
    '........KGGGKGKBBGK......',
    '......EEEGGBKBKGGKB......',
    '....ESSKGGGGGKGGGGGE.....',
    '...ESRSSREGGBBGGEEBSRE...',
    '..DSRRRRRKBSSRDBBRRRRRE..',
    '.ESRRRRRRLRRRRRRRRRRORRE.',
    '.DSRRRRLPPLRRRRRRRRRRRRS.',
    'ESSRRRRLOPLLLRRRRRRRRRRR.',
    'DSSRRRRRLRRRRRRRRRRRRRRRS',
    'ESSSRRRRRRRRRRRRRRRRRRRRS',
    'DSSSRRRRRRRRRRRRRRRKWPRRS',
    'DDSSSRRRRRRRRRRRRRRKKKKRL',
    'EDSSSRRRRRRRRRRRRRRKKKERL',
    'DDSSSSRRRRRRRRRRRRRRKKRRS',
    'EDDSSSSRRRRRRRRRRRRRRRERB',
    '.DDDSSSSRRRRRRRRRRRRRRRK.',
    '.EDDSSSSSSSRRRRRRRRRRRSE.',
    '..EDDDSSSSSSSSRRRRRRSSE..',
    '...EDDDDSSSSSSSSSSSSDE...',
    '.....EDDDDDDSDSSEDDD.....',
  ],
};

/** The tomato keeps its own brand reds and olive leaf: the one exception to the four inks. */
export const TOMATO_INKS = {
  R: hex('#e94117'), L: hex('#e95428'), S: hex('#d43112'), D: hex('#b72816'), E: hex('#9e2710'),
  G: hex('#554e2f'), B: hex('#533228'), K: hex('#1e1b19'), W: hex('#f1e2d5'), P: hex('#d4af9d'), O: hex('#d69166'),
};
export const HERO = { width: 25, height: 23 };

/** Draw the hero centred on x with its base on footY, raised by lift (hops, the walk bob). */
export function drawHero(frame, x, footY, lift = 0) {
  frame.sprite(SPRITES.tomato, Math.round(x - HERO.width / 2), footY - HERO.height - lift, { inks: TOMATO_INKS });
}

// ── framebuffer ─────────────────────────────────────────────────────────────

export class Frame {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 4);
  }

  clear(color) {
    const { pixels } = this;
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = 255;
    }
  }

  rect(x, y, w, h, color) {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.width, Math.round(x) + Math.round(w));
    const y1 = Math.min(this.height, Math.round(y) + Math.round(h));
    const { pixels, width } = this;
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * width + px) * 4;
        pixels[i] = color[0];
        pixels[i + 1] = color[1];
        pixels[i + 2] = color[2];
        pixels[i + 3] = 255;
      }
    }
  }

  /** 1-pixel outline of a box. */
  frame(x, y, w, h, color) {
    this.rect(x, y, w, 1, color);
    this.rect(x, y + h - 1, w, 1, color);
    this.rect(x, y, 1, h, color);
    this.rect(x + w - 1, y, 1, h, color);
  }

  /** The coarse background grid: 1-pixel lines every `spacing` pixels. */
  grid(spacing, color, rows = Infinity) {
    for (let x = 0; x < this.width; x += spacing) this.rect(x, 0, 1, Math.min(this.height, rows * spacing), color);
    for (let y = 0, row = 0; y < this.height && row < rows; y += spacing, row++) this.rect(0, y, this.width, 1, color);
  }

  /** A square block with a hard 1-pixel bevel (light top-left, dark bottom-right). */
  block(x, y, w, h, color, bevel = true) {
    this.rect(x, y, w, h, color);
    if (!bevel || w < 3 || h < 3) return;
    const light = mix(color, C.white, 0.45);
    const dark = mix(color, C.ink, 0.35);
    this.rect(x, y, w, 1, light);
    this.rect(x, y, 1, h, light);
    this.rect(x, y + h - 1, w, 1, dark);
    this.rect(x + w - 1, y + 1, 1, h - 1, dark);
  }

  /** scale: whole-number upscale for hero sprites; keep one scale per layer so pixels stay even. */
  sprite(rows, x, y, { flip = false, inks = SPRITE_INKS, tint = null, scale = 1 } = {}) {
    rows.forEach((row, rowIndex) => {
      [...row].forEach((cell, column) => {
        if (cell === '.') return;
        const color = tint ?? (cell === '#' ? C.white : inks[cell]);
        const px = flip ? row.length - 1 - column : column;
        this.rect(x + px * scale, y + rowIndex * scale, scale, scale, color);
      });
    });
  }

  /**
   * Bitmap text. colors: one ink, or an array cycled per character.
   * block: draw every glyph cell as a bevelled block (use with scale ≥ 3).
   * Returns the drawn width.
   */
  text(str, x, y, { scale = 1, color = C.white, spacing = 1, align = 'left', block = false, shadow = null } = {}) {
    const width = textWidth(str, scale, spacing);
    const left = Math.round(align === 'center' ? x - width / 2 : align === 'right' ? x - width : x);
    const inkFor = (index) => (Array.isArray(color[0]) ? color[index % color.length] : color);
    for (const cell of textCells(str, scale, spacing)) {
      if (shadow) this.rect(left + cell.x + scale, y + cell.y + scale, scale, scale, shadow);
    }
    for (const cell of textCells(str, scale, spacing)) {
      if (block) this.block(left + cell.x, y + cell.y, scale, scale, inkFor(cell.index));
      else this.rect(left + cell.x, y + cell.y, scale, scale, inkFor(cell.index));
    }
    return width;
  }

  /**
   * CJK text from a baked 1-bit glyph table (scripts/bake-glyphs.py). Characters the table lacks
   * (digits, Latin, symbols) fall back to the 5×7 face, ×2 next to 16 px glyphs, centred in the line.
   * Returns the drawn width.
   */
  glyphText(str, x, y, table, { color = C.white, align = 'left', scale = 1 } = {}) {
    const fallback = table.size >= 16 ? 2 : 1;
    const advance = (char) => table.glyphs[char]?.advance ?? (glyphFor(char)[0].length + 1) * fallback;
    const chars = [...str];
    const width = chars.reduce((sum, char) => sum + advance(char), 0) * scale;
    let cursor = Math.round(align === 'center' ? x - width / 2 : align === 'right' ? x - width : x);
    for (const char of chars) {
      const glyph = table.glyphs[char];
      if (glyph) {
        glyph.rows.forEach((row, rowIndex) => {
          [...row].forEach((cell, column) => {
            if (cell === '#') this.rect(cursor + column * scale, y + rowIndex * scale, scale, scale, color);
          });
        });
      } else {
        const top = y + Math.round((table.size - GLYPH_HEIGHT * fallback) / 2) * scale;
        this.text(char, cursor, top, { scale: fallback * scale, color });
      }
      cursor += advance(char) * scale;
    }
    return width;
  }

  /** Swap every pixel for its negative: the one-frame arcade flash. */
  invert() {
    const { pixels } = this;
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 255 - pixels[i];
      pixels[i + 1] = 255 - pixels[i + 1];
      pixels[i + 2] = 255 - pixels[i + 2];
    }
  }
}
