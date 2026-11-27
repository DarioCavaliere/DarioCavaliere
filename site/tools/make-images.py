"""Builds the public site's images from the originals in assets/food and the logo.
Usage: python3 site/tools/make-images.py <dist-folder>   (needs Pillow: pip install pillow)
Per recipe: og/<id>.jpg 1200x630 (social previews), 4x3/<id>.webp 1200x900, 1x1/<id>.webp 1080x1080 (Google rich results).
Also icons: favicon.ico, favicon-32.png, apple-touch-icon.png (180), icon-192.png, icon-512.png, logo.png."""
import os, sys, glob
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DIST = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "site", "dist"))
FOOD = os.path.join(ROOT, "assets", "food")
PURPLE = (164, 140, 244)

def crop(im, ratio):
    w, h = im.size
    if w / h > ratio: nw = round(h * ratio); x = (w - nw) // 2; return im.crop((x, 0, x + nw, h))
    nh = round(w / ratio); y = (h - nh) // 2; return im.crop((0, y, w, y + nh))

def recipes():
    for f in sorted(glob.glob(os.path.join(FOOD, "*-original.jpg"))):
        yield os.path.basename(f)[: -len("-original.jpg")], f

def main():
    for sub in ("og", "4x3", "1x1"): os.makedirs(os.path.join(DIST, "img", sub), exist_ok=True)
    n = 0
    for rid, src in recipes():
        im = Image.open(src).convert("RGB")
        crop(im, 1200 / 630).resize((1200, 630), Image.LANCZOS).save(os.path.join(DIST, "img", "og", rid + ".jpg"), "JPEG", quality=82, optimize=True, progressive=True)
        crop(im, 4 / 3).resize((1200, 900), Image.LANCZOS).save(os.path.join(DIST, "img", "4x3", rid + ".webp"), "WEBP", quality=78, method=6)
        sq = crop(im, 1); s = min(1080, sq.size[0])
        sq.resize((s, s), Image.LANCZOS).save(os.path.join(DIST, "img", "1x1", rid + ".webp"), "WEBP", quality=78, method=6)
        n += 1
    logo = Image.open(os.path.join(ROOT, "assets", "logo-artboard-6-original.png")).convert("RGBA")
    logo = logo.crop(logo.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox())
    lw = 600; logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS).save(os.path.join(DIST, "img", "logo.png"), optimize=True)
    def icon(size, radius_ratio=.22):
        base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        m = Image.new("L", (size, size), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, size - 1, size - 1), radius=round(size * radius_ratio), fill=255)
        bg = Image.new("RGBA", (size, size), PURPLE + (255,)); base.paste(bg, (0, 0), m)
        inner = round(size * .78); l = logo.copy(); l.thumbnail((inner, inner), Image.LANCZOS)
        base.alpha_composite(l, ((size - l.width) // 2, (size - l.height) // 2)); return base
    icon(512).save(os.path.join(DIST, "icon-512.png")); icon(192).save(os.path.join(DIST, "icon-192.png"))
    icon(180, 0).convert("RGB").save(os.path.join(DIST, "apple-touch-icon.png"))
    icon(32).save(os.path.join(DIST, "favicon-32.png"))
    icon(64).save(os.path.join(DIST, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"Made images for {n} recipes and the site icons in {DIST}")

main()
