#!/usr/bin/env python3
"""Genera iconos PNG para el manifiesto PWA usando solo la biblioteca estándar."""
import math
import struct
import sys
import zlib
from pathlib import Path


def render_icon(size: int) -> bytes:
    pixels = bytearray(size * size * 4)

    def put(x: int, y: int, color):
        if 0 <= x < size and 0 <= y < size:
            offset = (y * size + x) * 4
            pixels[offset:offset + 4] = bytes((*color, 255))

    # Fondo azul degradado.
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * max(1, size - 1))
            put(x, y, (
                int(18 + 22 * t),
                int(48 + 58 * t),
                int(83 + 76 * t)
            ))

    scale = size / 512

    def p(value):
        return int(round(value * scale))

    def rounded_rect(x1, y1, x2, y2, radius, color):
        x1, y1, x2, y2, radius = map(p, (x1, y1, x2, y2, radius))
        for y in range(max(0, y1), min(size, y2 + 1)):
            for x in range(max(0, x1), min(size, x2 + 1)):
                cx = min(max(x, x1 + radius), x2 - radius)
                cy = min(max(y, y1 + radius), y2 - radius)
                if (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2:
                    put(x, y, color)

    def line(x1, y1, x2, y2, width, color):
        x1, y1, x2, y2, width = map(p, (x1, y1, x2, y2, width))
        dx, dy = x2 - x1, y2 - y1
        length2 = dx * dx + dy * dy
        radius2 = (width / 2) ** 2
        for y in range(max(0, min(y1, y2) - width), min(size, max(y1, y2) + width + 1)):
            for x in range(max(0, min(x1, x2) - width), min(size, max(x1, x2) + width + 1)):
                t = 0 if not length2 else max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / length2))
                qx, qy = x1 + t * dx, y1 + t * dy
                if (x - qx) ** 2 + (y - qy) ** 2 <= radius2:
                    put(x, y, color)

    # Cuerpo de calendario y cabecera.
    rounded_rect(82, 82, 430, 430, 48, (248, 251, 255))
    rounded_rect(82, 82, 430, 220, 48, (45, 131, 198))
    for y in range(p(162), p(221)):
        for x in range(p(82), min(size, p(431))):
            put(x, y, (45, 131, 198))

    # Anillas.
    rounded_rect(158, 61, 182, 132, 12, (189, 235, 255))
    rounded_rect(330, 61, 354, 132, 12, (189, 235, 255))

    # Bloques que representan las clases de la semana.
    pale = (220, 235, 250)
    cells = [
        (132, 258, pale), (218, 258, pale), (304, 258, pale),
        (132, 326, pale), (218, 326, (32, 182, 165)), (304, 326, pale)
    ]
    for x, y, color in cells:
        rounded_rect(x, y, x + 54, y + 42, 12, color)

    # Marca de selección dentro de uno de los bloques.
    line(230, 348, 243, 360, 8, (255, 255, 255))
    line(243, 360, 266, 334, 8, (255, 255, 255))
    rounded_rect(130, 390, 382, 399, 5, (197, 215, 235))

    # PNG RGBA con compresión estándar.
    raw = b''.join(b'\x00' + pixels[y * size * 4:(y + 1) * size * 4]
                   for y in range(size))

    def chunk(kind: bytes, data: bytes) -> bytes:
        return (struct.pack('>I', len(data)) + kind + data +
                struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff))

    header = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) +
            chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def main():
    destination = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('dist/icons')
    destination.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        path = destination / f'app-{size}.png'
        path.write_bytes(render_icon(size))
        print(f'Icono generado: {path} ({path.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
