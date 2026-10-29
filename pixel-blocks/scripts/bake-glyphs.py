"""Bake text into a 1-bit glyph table for Frame.glyphText (CJK, or any font the 5x7 face lacks).

  python3 bake-glyphs.py "解锁新技能：像素方块" --size 16 --out assets/cjk-16.json
  python3 bake-glyphs.py "你好" --size 16 --font "/System/Library/Fonts/STHeiti Medium.ttc"
  python3 bake-glyphs.py "升级" --size 16 --index 2 --out title.json   # Hiragino W6, for block-built titles

The font is rasterised with anti-aliasing off (Pillow fontmode "1"), so every glyph is whole
pixels on the same grid as the rest of the scene. Use 16 px for Chinese: at 12 px dense glyphs
(解, 锁) clog up. Needs Pillow (pip install pillow). Default font: Hiragino Sans GB on macOS,
Noto Sans CJK on Linux; pass --font for anything else.
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

DEFAULT_FONTS = [
    ('/System/Library/Fonts/Hiragino Sans GB.ttc', 0),
    ('/System/Library/Fonts/STHeiti Medium.ttc', 0),
    ('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 2),
    ('/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc', 2),
]


def arg(name, default=None):
    flag = '--' + name
    return sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default


def main():
    if len(sys.argv) < 2 or sys.argv[1].startswith('--'):
        print(__doc__)
        sys.exit(1)
    text = sys.argv[1]
    size = int(arg('size', 12))
    out = arg('out', f'cjk-{size}.json')
    font_path, index = arg('font'), arg('index')
    if not font_path:
        font_path, default_index = next(((path, i) for path, i in DEFAULT_FONTS if os.path.exists(path)), (None, 0))
        index = index if index is not None else default_index
    index = int(index or 0)
    if not font_path:
        sys.exit('no CJK font found: pass --font <path>')
    font = ImageFont.truetype(font_path, size, index=index)

    table = {'font': os.path.basename(font_path), 'size': size, 'glyphs': {}}
    if os.path.exists(out):
        table['glyphs'] = json.load(open(out)).get('glyphs', {})
    for char in dict.fromkeys(text):
        if char.isspace():
            table['glyphs'][char] = {'advance': size // 2, 'rows': []}
            continue
        canvas = Image.new('1', (size * 2, size + 4), 0)
        draw = ImageDraw.Draw(canvas)
        draw.fontmode = '1'
        draw.text((0, 0), char, font=font, fill=1)
        advance = round(font.getlength(char))
        rows = [''.join('#' if canvas.getpixel((x, y)) else '.' for x in range(advance)) for y in range(size)]
        table['glyphs'][char] = {'advance': advance, 'rows': rows}

    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    json.dump(table, open(out, 'w'), ensure_ascii=False, indent=1)
    print(f'{len(table["glyphs"])} glyphs -> {out}')
    for line in range(size):
        print(''.join(table['glyphs'][c]['rows'][line] if table['glyphs'][c]['rows'] else ' ' * table['glyphs'][c]['advance'] for c in dict.fromkeys(text)))


if __name__ == '__main__':
    main()
