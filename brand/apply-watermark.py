"""Stamp the 一颗西红柿番茄 watermark on still images, the same size and corner as the videos.

  python3 brand/apply-watermark.py in.png out.png [more pairs...]
  python3 brand/apply-watermark.py --dir images/raw images        # every PNG in raw/ -> images/

The mark is 5% of the short side tall, inset 2.8% from the bottom-right corner, at 92% opacity
(render.mjs --watermark uses the same numbers). Where the corner is light, a translucent navy
plate goes under it so the white type stays readable.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageStat

MARK = Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'watermark-tomato.png')).convert('RGBA')


def stamp(src, dst):
    image = Image.open(src).convert('RGBA')
    short = min(image.size)
    height = round(short * 0.05)
    width = round(MARK.width * height / MARK.height)
    inset = round(short * 0.028)
    mark = MARK.resize((width, height), Image.LANCZOS)
    alpha = mark.getchannel('A').point(lambda a: round(a * 0.92))
    mark.putalpha(alpha)
    x = image.width - width - inset
    y = image.height - height - inset

    corner = image.crop((x, y, x + width, y + height)).convert('L')
    if ImageStat.Stat(corner).mean[0] > 140:
        pad = round(height * 0.3)
        plate = Image.new('RGBA', image.size, (0, 0, 0, 0))
        ImageDraw.Draw(plate).rounded_rectangle((x - pad, y - pad // 2, x + width + pad // 2, y + height + pad // 2), radius=pad, fill=(11, 16, 48, 170))
        image = Image.alpha_composite(image, plate)

    layer = Image.new('RGBA', image.size, (0, 0, 0, 0))
    layer.paste(mark, (x, y))
    image = Image.alpha_composite(image, layer)
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    image.convert('RGB').save(dst, optimize=True)
    print(f'{src} -> {dst}')


def main():
    args = sys.argv[1:]
    if args[:1] == ['--dir'] and len(args) == 3:
        src_dir, dst_dir = args[1], args[2]
        for name in sorted(os.listdir(src_dir)):
            if name.lower().endswith('.png'):
                stamp(os.path.join(src_dir, name), os.path.join(dst_dir, name))
    elif args and len(args) % 2 == 0:
        for src, dst in zip(args[::2], args[1::2]):
            stamp(src, dst)
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == '__main__':
    main()
