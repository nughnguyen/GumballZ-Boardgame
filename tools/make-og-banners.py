# -*- coding: utf-8 -*-
"""Generate per-game Open Graph share banners (1200x630, neobrutalism).

Usage:
    python3 tools/make-og-banners.py [--only <slug>] [--out DIR]

- Illustration: cropped from the game's existing shared/img/og/<slug>.jpg
  (template: left art panel; custom banners: the game's own art
  region). The crop never includes the old logo or the old brand line.
- Style: palette FFD273 / FEE686 / FEC5E6 / DEB5D7 / BFAEE3, ink #2a2340,
  thick ink borders + hard offset shadows, brand "GumballZ Games".
- Overwrites shared/img/og/<slug>.jpg in place (same filenames, so all
  existing og:image tags keep working).
"""
import argparse
import html
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OG_DIR = os.path.join(ROOT, "shared", "img", "og")
INK = (42, 35, 64)          # #2a2340
CARD = (255, 253, 247)
PALETTE = [(255, 210, 115),  # FFD273
           (254, 230, 134),  # FEE686
           (254, 197, 230),  # FEC5E6
           (222, 181, 215),  # DEB5D7
           (191, 174, 227)]  # BFAEE3
FONT_XB = "/usr/share/fonts/truetype/noto/NotoSans-ExtraBold.ttf"
FONT_B = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"

# Display names (banner title). Keys = game slug.
NAMES = {
    "bacao": "Ba Cào", "baitan": "Bài Tấn", "bang": "CÀ ĐÙNG!",
    "bantau": "Bắn Tàu", "baucua": "Bầu Cua", "camel": "Đua Lạc Đà",
    "cangua": "Cờ Cá Ngựa", "caro": "Cờ Caro", "catte": "Cát Tê",
    "cholon": "Chợ Lớn", "codam": "Cờ Đam", "colat": "Cờ Lật", "cothu": "Cờ Thú", "cotuong": "Cờ Tướng",
    "covay": "Cờ Vây", "covua": "Cờ Vua", "cuuho": "Đội Cứu Hộ",
    "daochinh": "Đảo Chính", "khaihoang": "Đảo Khai Hoang",
    "giandiep": "Ai là Gián Điệp",
    "lieng": "Liêng",
    "maubinh": "Mậu Binh",
    "loto": "Lô Tô", "masoi": "Ma Sói", "memory": "Memory",
    "meono": "Mèo Nổ", "noitu": "Nối Từ", "oanquan": "Ô Ăn Quan",
    "poker": "Poker", "ranvathang": "Rắn và Thang", "sam": "Sâm Lốc",
    "scribble": "Scribble it!", "solitaire": "Xếp Bài", "tala": "Tá Lả",
    "tamquoc": "Tam Quốc Sát", "thathaythach": "Thật hay Thách",
    "tictactoe": "TicTacToe", "tienlen": "Tiến Lên", "tusac": "Tứ Sắc",
    "typhu": "Cờ Tỷ Phú", "uno": "UNÔ", "xidach": "Xì Dách",
    "xiecthu": "Gánh Xiếc Thú", "xuyenviet": "Tàu Xuyên Việt",
    "xito": "Xì Tố",
    "domino": "Domino",
    "connect4": "Connect 4",
    "matthu": "Mật Thư",
    "avalon": "Avalon",
    "sudoku": "Sudoku",
    "wordle": "Wordle",
    "domi": "Dò Mìn",
    "s2048": "2048",
    "matchu": "Mạt Chược",
    "loveletter": "Love Letter",
    "sushigo": "Sushi Go",
    "lay6": "Lấy 6",
    "saboteur": "Saboteur",
    "skull": "Skull",
    "hanabi": "Hanabi",
    "chan": "Chắn",
    "totom": "Tổ Tôm",
    "carcassonne": "Carcassonne",
    "azul": "Azul",
    "splendor": "Splendor",
    "conhay": "Cờ Nhảy",
    "backgammon": "Backgammon",
    "rummikub": "Rummikub",
    "quoridor": "Quoridor",
    "blokus": "Blokus",
    "scrabble": "Scrabble",
    "mastermind": "Mastermind",
    "ailatrieuphu": "Ai Là Triệu Phú",
    "haithat1gia": "2 Thật 1 Giả",
    "doanhdong": "Đoán Hành Động",
    "wavelength": "Wavelength",
    "resistance": "The Resistance",
    "vetruyentin": "Vẽ Truyền Tin",
    "tetris": "Tetris",
    "ransanmoi": "Rắn Săn Mồi",
    "xepkeo": "Xếp Kẹo",
    "banbong": "Bắn Bóng",
    "nonogram": "Nonogram",
    "ghephinh": "Ghép Hình",
    "nhen": "Nhện",
    "bida8": "Bida 8-ball",
    "dapenalty": "Đá Penalty",
    "phitieu": "Phi Tiêu",
    "keobuabao": "Kéo Búa Bao",
    "dovui": "Đố Vui",
    "hoisanquai": "Hội Săn Quái",
    "lansau": "Lặn Sâu",
    "vuatiengviet": "Vua Tiếng Việt",
}

# Illustration crop (x0, y0, x1, y1) inside the game's current og jpg.
# Games not listed use template_crop() (template left art panel).
CROPS = {
    "caro": (45, 105, 545, 550),
    "tictactoe": (45, 105, 545, 550),
    "memory": (60, 145, 580, 575),
    "oanquan": (56, 56, 490, 470),
    "cothu": (430, 200, 770, 610),
    "codam": (60, 40, 620, 600),
    "colat": (60, 40, 620, 600),
    "lieng": (60, 40, 620, 600),
    "maubinh": (60, 40, 620, 600),
    "xito": (60, 40, 620, 600),
    "domino": (60, 40, 620, 600),
    "connect4": (60, 40, 620, 600),
    "matthu": (60, 40, 620, 600),
    "avalon": (60, 40, 620, 600),
    "sudoku": (60, 40, 620, 600),
    "wordle": (60, 40, 620, 600),
    "domi": (60, 40, 620, 600),
    "s2048": (60, 40, 620, 600),
    "matchu": (60, 40, 620, 600),
    "loveletter": (60, 40, 620, 600),
    "sushigo": (60, 40, 620, 600),
    "lay6": (60, 40, 620, 600),
    "saboteur": (60, 40, 620, 600),
    "skull": (60, 40, 620, 600),
    "hanabi": (60, 40, 620, 600),
    "chan": (60, 40, 620, 600),
    "totom": (60, 40, 620, 600),
    "carcassonne": (60, 40, 620, 600),
    "azul": (60, 40, 620, 600),
    "splendor": (60, 40, 620, 600),
    "conhay": (60, 40, 620, 600),
    "backgammon": (60, 40, 620, 600),
    "rummikub": (60, 40, 620, 600),
    "quoridor": (60, 40, 620, 600),
    "blokus": (60, 40, 620, 600),
    "scrabble": (60, 40, 620, 600),
    "mastermind": (60, 40, 620, 600),
    "ailatrieuphu": (60, 40, 620, 600),
    "haithat1gia": (60, 40, 620, 600),
    "doanhdong": (60, 40, 620, 600),
    "wavelength": (60, 40, 620, 600),
    "resistance": (60, 40, 620, 600),
    "vetruyentin": (60, 40, 620, 600),
    "tetris": (60, 40, 620, 600),
    "ransanmoi": (60, 40, 620, 600),
    "xepkeo": (60, 40, 620, 600),
    "banbong": (60, 40, 620, 600),
    "nonogram": (60, 40, 620, 600),
    "ghephinh": (60, 40, 620, 600),
    "nhen": (60, 40, 620, 600),
    "bida8": (60, 40, 620, 600),
    "dapenalty": (60, 40, 620, 600),
    "phitieu": (60, 40, 620, 600),
    "keobuabao": (60, 40, 620, 600),
    "dovui": (60, 40, 620, 600),
    "hoisanquai": (60, 40, 620, 600),
    "lansau": (60, 40, 620, 600),
    "vuatiengviet": (60, 40, 620, 600),
    "covay": (700, 70, 1140, 565),
    "ranvathang": (725, 55, 1155, 520),
}


def template_crop(slug):
    """Template: left art panel, cut just above the name strip.

    The strip's name text is white (gold on bang/tamquoc: no white text,
    fall back to the standard bottom). Returns (56, 56, 504, bottom).
    """
    src = Image.open(os.path.join(OG_DIR, slug + ".jpg")).convert("RGB")
    px = src.load()
    top = None
    for y in range(400, 578):
        for x in range(100, 461, 2):
            r, g, b = px[x, y]
            if r > 225 and g > 225 and b > 225:
                top = y
                break
        if top is not None:
            break
    bottom = 478 if top is None else min(top - 12, 478)
    return (56, 56, 504, max(440, bottom))

CAT_LABEL = {"board": "CỜ BÀN", "card": "GAME BÀI",
             "party": "TỤ TẬP", "other": "KIỂU KHÁC"}

GAMES = sorted(NAMES.keys())


def font(path, size):
    return ImageFont.truetype(path, size)


def clean_tagline(raw):
    """Short, emoji-free tagline from the page's og:description."""
    s = html.unescape(raw or "")
    for marker in ("👑", "Bấm link", "bấm link"):
        i = s.find(marker)
        if i >= 0:
            s = s[:i]
    out = []
    for ch in s:
        o = ord(ch)
        if ch.isalnum() or ch in " ,.:;!?–—•…''\"\"()/%+=×'":
            out.append(ch)
        elif ch in " \t\n":
            out.append(" ")
    s = re.sub(r"\s+", " ", "".join(out)).strip(" ,.:;")
    if len(s) > 120:
        s = s[:117].rsplit(" ", 1)[0] + "…"
    return s


def parse_site():
    """Return {slug: (category, tagline)} from homepage tiles + og:description."""
    home = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    cats = dict(re.findall(
        r'<a class="tile \w+" href="(\w+)/"[^>]*data-cat="(\w+)"', home))
    info = {}
    for slug in GAMES:
        page = os.path.join(ROOT, slug, "index.html")
        s = open(page, encoding="utf-8", errors="ignore").read()
        m = re.search(r'og:description" content="([^"]*)"', s)
        info[slug] = (cats.get(slug, "other"), clean_tagline(m.group(1) if m else ""))
    return info


def text_w(draw, text, fnt):
    return draw.textlength(text, font=fnt)


def wrap(draw, text, fnt, max_w, max_lines=3):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if text_w(draw, t, fnt) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
            if len(lines) == max_lines:
                break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    if len(lines) == max_lines and (len(words) > sum(len(x.split()) for x in lines)):
        lines[-1] = lines[-1].rstrip("…") + "…"
    return lines


def fit_name(draw, name, max_w):
    """Biggest single-line size in [58, 108]; else 2 lines at 84px."""
    for size in range(108, 57, -2):
        f = font(FONT_XB, size)
        if text_w(draw, name, f) <= max_w:
            return [(name, f)]
    f = font(FONT_XB, 84)
    words = name.split()
    best, best_max = None, None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        m = max(text_w(draw, a, f), text_w(draw, b, f))
        if best_max is None or m < best_max:
            best, best_max = (a, b), m
    return [(best[0], f), (best[1], f)]


def rounded(draw, box, radius, **kw):
    draw.rounded_rectangle(box, radius=radius, **kw)


def star(draw, cx, cy, r, fill, outline, width=3):
    pts = []
    for i in range(8):
        ang = -90 + i * 45
        rr = r if i % 2 == 0 else r * 0.42
        import math
        pts.append((cx + rr * math.cos(math.radians(ang)),
                    cy + rr * math.sin(math.radians(ang))))
    draw.polygon(pts, fill=fill, outline=outline, width=width)


def plus(draw, cx, cy, r, outline, width=5):
    draw.line([(cx - r, cy), (cx + r, cy)], fill=outline, width=width)
    draw.line([(cx, cy - r), (cx, cy + r)], fill=outline, width=width)


def dice_glyph(draw, x, y, s=36):
    rounded(draw, [x, y, x + s, y + s], radius=9, fill=(255, 255, 255),
            outline=INK, width=3)
    d = s / 4
    pts = [(x + d, y + d), (x + 3 * d, y + d), (x + 2 * d, y + 2 * d),
           (x + d, y + 3 * d), (x + 3 * d, y + 3 * d)]
    for px, py in pts:
        draw.ellipse([px - 3.5, py - 3.5, px + 3.5, py + 3.5], fill=INK)


def build_banner(slug, name, cat, tagline, bg, pill_bg):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)
    # corner doodles on the background
    star(d, 22, 22, 15, (255, 255, 255), INK, 3)
    plus(d, 1178, 22, 11, INK, 5)
    d.ellipse([10, 596, 34, 620], fill=(255, 255, 255), outline=INK, width=3)
    star(d, 1178, 608, 13, (255, 255, 255), INK, 3)
    # main card + hard shadow
    card = [44, 44, 1156, 586]
    rounded(d, [card[0] + 12, card[1] + 12, card[2] + 12, card[3] + 12],
            radius=26, fill=INK)
    rounded(d, card, radius=26, fill=CARD, outline=INK, width=5)

    # ---- illustration panel (left) ----
    src = Image.open(os.path.join(OG_DIR, slug + ".jpg")).convert("RGB")
    x0, y0, x1, y1 = CROPS.get(slug) or template_crop(slug)
    art = src.crop((x0, y0, x1, y1))
    panel = [74, 95, 514, 535]  # 440 x 440
    pw, ph = panel[2] - panel[0], panel[3] - panel[1]
    # fill colour = average of the crop's corners (blends letterbox bands)
    cw, ch = art.size
    corner = []
    for cx, cy in [(4, 4), (cw - 5, 4), (4, ch - 5), (cw - 5, ch - 5)]:
        corner.append(art.getpixel((cx, cy)))
    fill = tuple(sum(c[i] for c in corner) // 4 for i in range(3))
    scale = min(pw / cw, ph / ch)
    art2 = art.resize((max(1, round(cw * scale)), max(1, round(ch * scale))),
                      Image.LANCZOS)
    base = Image.new("RGB", (pw, ph), fill)
    base.paste(art2, ((pw - art2.width) // 2, (ph - art2.height) // 2))
    mask = Image.new("L", (pw, ph), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, pw - 1, ph - 1], radius=24, fill=255)
    rounded(d, [panel[0] + 8, panel[1] + 8, panel[2] + 8, panel[3] + 8],
            radius=24, fill=INK)
    img.paste(base, (panel[0], panel[1]), mask)
    rounded(d, panel, radius=24, outline=INK, width=5)

    # ---- text column (right) ----
    tx, tw = 552, 570
    # category pill
    cat_f = font(FONT_B, 26)
    label = CAT_LABEL.get(cat, "KIỂU KHÁC")
    cw2 = int(text_w(d, label, cat_f)) + 44
    py0, py1 = 100, 146
    rounded(d, [tx + 5, py0 + 5, tx + cw2 + 5, py1 + 5], radius=23, fill=INK)
    rounded(d, [tx, py0, tx + cw2, py1], radius=23, fill=pill_bg,
            outline=INK, width=4)
    d.text((tx + 22, py0 + 9), label, font=cat_f, fill=INK)
    # game name
    y = 172
    for line, f in fit_name(d, name, tw):
        d.text((tx, y), line, font=f, fill=INK)
        y += int(f.size * 1.08)
    # tagline
    y += 22
    tf = font(FONT_B, 29)
    for line in wrap(d, tagline, tf, tw, max_lines=3):
        d.text((tx, y), line, font=tf, fill=INK)
        y += 40
    # brand pill (bottom-right)
    bf = font(FONT_XB, 34)
    bt = "GumballZ Games"
    bw = int(text_w(d, bt, bf)) + 36 + 14 + 44
    bx0, by0, bx1, by1 = 1122 - bw, 494, 1122, 554
    rounded(d, [bx0 + 5, by0 + 5, bx1 + 5, by1 + 5], radius=30, fill=INK)
    rounded(d, [bx0, by0, bx1, by1], radius=30, fill=(255, 255, 255),
            outline=INK, width=4)
    dice_glyph(d, bx0 + 20, by0 + 12)
    d.text((bx0 + 70, by0 + 12), bt, font=bf, fill=INK)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    info = parse_site()
    slugs = [args.only] if args.only else GAMES
    outdir = args.out or OG_DIR
    os.makedirs(outdir, exist_ok=True)
    for i, slug in enumerate(slugs):
        name = NAMES[slug]
        cat, tagline = info[slug]
        bg = PALETTE[i % len(PALETTE)] if not args.only else PALETTE[0]
        pill_bg = PALETTE[(i + 2) % len(PALETTE)] if not args.only else PALETTE[2]
        img = build_banner(slug, name, cat, tagline, bg, pill_bg)
        path = os.path.join(outdir, slug + ".jpg")
        img.save(path, "JPEG", quality=88, optimize=True)
        print(f"{slug}: {name} [{CAT_LABEL.get(cat)}] bg={bg} tagline={tagline[:60]!r} -> {path}")


if __name__ == "__main__":
    main()
