"""Generate VegEats app icon, adaptive icon layers, splash and favicon.

The mark is the produce sticker from the app: a tilted basil-green disc with a dashed
inner ring and a leaf. Run from the repo root:  python3 scripts/generate-icons.py
"""
import math
import os

from PIL import Image, ImageDraw

BASIL = (23, 88, 58, 255)
BASIL_DEEP = (14, 61, 39, 255)
MINT = (220, 235, 221, 255)
MIST = (238, 242, 236, 255)
WHITE = (255, 255, 255, 255)

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "images")


def leaf(draw: ImageDraw.ImageDraw, cx: float, cy: float, size: float, color, angle_deg: float = -35):
    """A simple leaf: two arcs meeting at the tips, plus a midrib."""
    pts = []
    n = 60
    a = math.radians(angle_deg)
    for i in range(n + 1):
        t = i / n
        x = (t - 0.5) * size
        y = -math.sin(math.pi * t) * size * 0.32
        pts.append((x, y))
    for i in range(n, -1, -1):
        t = i / n
        x = (t - 0.5) * size
        y = math.sin(math.pi * t) * size * 0.32
        pts.append((x, y))
    rot = [(cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)) for x, y in pts]
    draw.polygon(rot, fill=color)
    # midrib in the background color
    x0, y0 = -size * 0.42, 0
    x1, y1 = size * 0.38, 0
    p0 = (cx + x0 * math.cos(a) - y0 * math.sin(a), cy + x0 * math.sin(a) + y0 * math.cos(a))
    p1 = (cx + x1 * math.cos(a) - y1 * math.sin(a), cy + x1 * math.sin(a) + y1 * math.cos(a))
    return p0, p1


def dashed_ring(draw, cx, cy, r, color, width, dashes=36):
    for i in range(dashes):
        start = 360 / dashes * i
        draw.arc([cx - r, cy - r, cx + r, cy + r], start, start + 360 / dashes * 0.55, fill=color, width=width)


def sticker(size: int, disc=BASIL, ink=MINT, transparent_bg=True, bg=MIST, scale=0.78) -> Image.Image:
    ss = 4  # supersample for smooth edges
    S = size * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0) if transparent_bg else bg)
    d = ImageDraw.Draw(img)
    cx = cy = S / 2
    r = S * scale / 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=disc)
    dashed_ring(d, cx, cy, r * 0.86, ink, max(2, int(S * 0.012)))
    p0, p1 = leaf(d, cx + r * 0.02, cy - r * 0.02, r * 1.05, ink)
    d.line([p0, p1], fill=disc, width=max(2, int(S * 0.012)))
    return img.rotate(-8, resample=Image.BICUBIC).resize((size, size), Image.LANCZOS)


def save(img: Image.Image, name: str):
    path = os.path.join(OUT, name)
    img.save(path)
    print("wrote", os.path.relpath(path))


def main():
    # iOS / general icon: full-bleed mist background with the sticker.
    icon = Image.new("RGBA", (1024, 1024), MIST)
    icon.alpha_composite(sticker(1024, scale=0.8))
    save(icon.convert("RGB"), "icon.png")

    # Android adaptive: foreground inside the 66% safe zone, solid background, monochrome mask.
    save(sticker(1024, scale=0.58), "android-icon-foreground.png")
    save(Image.new("RGBA", (1024, 1024), MIST), "android-icon-background.png")
    mono = sticker(1024, disc=(0, 0, 0, 255), ink=(0, 0, 0, 0), scale=0.58)
    save(mono, "android-icon-monochrome.png")

    # Splash: sticker in white on transparent (background color comes from app config).
    save(sticker(512, disc=WHITE, ink=BASIL, scale=0.9), "splash-icon.png")

    fav = Image.new("RGBA", (192, 192), (0, 0, 0, 0))
    fav.alpha_composite(sticker(192, scale=0.96))
    save(fav, "favicon.png")


if __name__ == "__main__":
    main()
