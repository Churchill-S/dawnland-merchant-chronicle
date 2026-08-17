# -*- coding: utf-8 -*-
"""用纯标准库生成 PWA / 苹果图标（米色底 + 金色日轮 + 三座绿丘）"""
import os
import struct
import zlib


def in_tri(px, py, a, b, c):
    def sign(p1, p2, p3):
        return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
    d1 = sign((px, py), a, b)
    d2 = sign((px, py), b, c)
    d3 = sign((px, py), c, a)
    has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (has_neg and has_pos)


def make_png(path, size):
    w = h = size
    bg = (243, 230, 200)
    sun = (206, 148, 48)
    ring = (138, 115, 70)
    hill = (110, 150, 90)
    rows = []
    for y in range(h):
        row = bytearray([0])
        for x in range(w):
            u = x / (w - 1)
            v = y / (h - 1)
            c = bg
            dx = u - 0.5
            dy = v - 0.52
            d = (dx * dx + dy * dy) ** 0.5
            if d < 0.30:
                c = sun
            elif d < 0.37:
                c = ring
            # 三座绿丘（底部）
            hills = [
                ((0.08, 1.02), (0.30, 0.62), (0.52, 1.02)),
                ((0.32, 1.02), (0.55, 0.70), (0.78, 1.02)),
                ((0.58, 1.02), (0.80, 0.64), (1.02, 1.02)),
            ]
            for tri in hills:
                if in_tri(u, v, tri[0], tri[1], tri[2]):
                    c = hill
                    break
            row += bytes(c)
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print("written", path)


def main():
    out = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(out, exist_ok=True)
    for size in (180, 192, 512):
        make_png(os.path.join(out, "icon-%d.png" % size), size)


if __name__ == "__main__":
    main()
