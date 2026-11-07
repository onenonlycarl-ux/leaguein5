#!/usr/bin/env python3
"""Make the 1200x630 share cards used when a League In 5 link is posted to Facebook, X, iMessage, etc.

Writes og/default.png (home + week pages) and og/<abbr>.png for each of the 32 teams.
Team colours come from app.js and team names from stories.json, so they stay in sync with the site.

Run only when the look changes (the images are committed; the daily run does not touch them):
    python3 pipeline/make_share_images.py
Needs Pillow (pip install pillow). Fonts are in pipeline/fonts/ (Playfair Display, Manrope: SIL OFL).
"""
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "pipeline" / "fonts"
OUT = ROOT / "og"
W, H = 1200, 630
ORANGE = (255, 106, 26)
NIGHT = (12, 14, 17)
WHITE = (255, 255, 255)

SERIF = lambda size: ImageFont.truetype(str(FONTS / "PlayfairDisplay-ExtraBold.ttf"), size)
SANS = lambda size: ImageFont.truetype(str(FONTS / "Manrope-Bold.ttf"), size)
SANS_XB = lambda size: ImageFont.truetype(str(FONTS / "Manrope-ExtraBold.ttf"), size)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def team_colors():
    src = (ROOT / "app.js").read_text()
    return {m[0]: (hex_rgb(m[1]), hex_rgb(m[2]))
            for m in re.findall(r'([A-Z]{2,3}):\["(#[0-9A-Fa-f]{6})","(#[0-9A-Fa-f]{6})"\]', src)}


def cover(im, w, h, focus=(0.5, 0.5)):
    """Resize + crop an image to exactly w x h, like CSS background-size: cover."""
    scale = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    x = round((im.width - w) * focus[0])
    y = round((im.height - h) * focus[1])
    return im.crop((x, y, x + w, y + h))


def diagonal_gradient(c1, c2):
    """135-degree gradient from c1 (top-left) to c2 (bottom-right)."""
    g = Image.new("RGB", (W, H))
    px = g.load()
    for y in range(H):
        for x in range(W):
            t = (x / W + y / H) / 2
            px[x, y] = tuple(round(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return g


def vertical_shade(im, top_alpha, bottom_alpha):
    """Darken an image with a top-to-bottom black overlay."""
    overlay = Image.new("L", (W, H))
    px = overlay.load()
    for y in range(H):
        a = round(top_alpha + (bottom_alpha - top_alpha) * (y / H))
        for x in range(W):
            px[x, y] = a
    return Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), im, overlay)


def paste_logo(im, x, y, size):
    logo = Image.open(ROOT / "logo-512.png").convert("RGB").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=round(size * 0.22), fill=255)
    im.paste(logo, (x, y), mask)


def wrap(draw, text, font, max_w):
    lines, cur = [], ""
    for word in text.split():
        trial = (cur + " " + word).strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def brand_footer(im, d, left=64, bottom=48):
    size = 64
    y = H - bottom - size
    paste_logo(im, left, y, size)
    d.text((left + size + 20, y + 4), "League In 5", font=SERIF(34), fill=WHITE)
    d.text((left + size + 20, y + 42), "leaguein5.com", font=SANS(22), fill=(255, 255, 255, 190))
    d.rectangle((0, H - 10, W, H), fill=ORANGE)


def default_card():
    base = cover(Image.open(ROOT / "hero.jpg").convert("RGB"), W, H, focus=(0.72, 0.35))
    im = vertical_shade(base, 90, 235)
    d = ImageDraw.Draw(im, "RGBA")
    d.text((64, 70), "THE DAILY NFL BRIEFING", font=SANS_XB(26), fill=ORANGE)
    d.text((64, 128), "32 Teams. 5 Stories.", font=SERIF(104), fill=WHITE)
    d.text((64, 252), "One League.", font=SERIF(104), fill=ORANGE)
    d.text((64, 410), "Five stories for every team, every morning.", font=SANS(32), fill=(255, 255, 255, 215))
    brand_footer(im, d)
    return im


def team_card(abbr, name, c1, c2):
    im = diagonal_gradient(c1, c2)
    # soft light in the top-right corner, like the team page header
    glow = Image.new("RGB", (W, H), (255, 255, 255))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).ellipse((W - 700, -420, W + 300, 320), fill=60)
    mask = mask.filter(ImageFilter.GaussianBlur(90))
    im = Image.composite(glow, im, mask)
    im = vertical_shade(im, 20, 150)
    d = ImageDraw.Draw(im, "RGBA")

    # big translucent abbreviation on the right
    # (drawn on its own transparent layer: ImageDraw ignores alpha for text drawn straight onto an RGB image)
    ab_font = SERIF(300 if len(abbr) < 3 else 250)
    bbox = d.textbbox((0, 0), abbr, font=ab_font)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((W - 64 - (bbox[2] - bbox[0]) - bbox[0], 120 - bbox[1]), abbr, font=ab_font, fill=(255, 255, 255, 40))
    im = Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")
    d = ImageDraw.Draw(im, "RGBA")

    d.text((64, 70), "TODAY'S 5 STORIES", font=SANS_XB(26), fill=ORANGE)
    # team name: city on top, nickname below
    parts = name.split()
    nick = parts[-1]
    city = " ".join(parts[:-1])
    size = 112
    while size > 60 and max(d.textlength(city, font=SERIF(size)), d.textlength(nick, font=SERIF(size))) > W - 128:
        size -= 4
    f = SERIF(size)
    d.text((64, 140), city, font=SERIF(round(size * 0.55)), fill=(255, 255, 255, 225))
    d.text((64, 140 + round(size * 0.55) + 10), nick, font=f, fill=WHITE)
    d.text((64, 418), "Injuries. Player spotlight. Stat of the day. What's next.", font=SANS(28), fill=(255, 255, 255, 215))
    brand_footer(im, d)
    return im


def main():
    OUT.mkdir(exist_ok=True)
    colors = team_colors()
    data = json.loads((ROOT / "stories.json").read_text())
    teams = [t for div in data["divisions"] for t in div["teams"]]
    default_card().save(OUT / "default.png", optimize=True)
    for t in teams:
        c1, c2 = colors[t["abbr"]]
        team_card(t["abbr"], t["name"], c1, c2).save(OUT / f"{t['abbr'].lower()}.png", optimize=True)
    print(f"Wrote og/default.png and {len(teams)} team cards to {OUT}")


if __name__ == "__main__":
    main()
