"""Ícono del Diapasón (Claude; Astra no tenía cuota). Reproducible: python generar-icono.py

Un tramo del mástil de guitarra clásica en perspectiva (como la vista «desde el guitarrista»):
palisandro, trastes de níquel, tres graves entorchadas arriba y tres de nailon abajo, y la nota
de la pregunta marcada en dorado. Misma familia que los íconos del metrónomo y el afinador:
cuadrado redondeado oscuro con luz cálida de estudio.
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
S = 2048                      # se dibuja al doble y se reduce (antialias)
OUT = 1024
rng = random.Random(7)


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(int(round(lerp(a, b, t))) for a, b in zip(c1, c2))


# ---------------------------------------------------------------- fondo: cuadrado redondeado
img = Image.new("RGB", (S, S), (10, 6, 18))       # #0a0612, el fondo del sitio, en las esquinas
tile = Image.new("RGB", (S, S))
td = ImageDraw.Draw(tile)
for y in range(S):                                 # degradado vertical cálido
    td.line([(0, y), (S, y)], fill=mix((40, 26, 16), (12, 8, 6), y / S))
glow = Image.new("L", (S, S), 0)                   # luz de estudio arriba a la izquierda
ImageDraw.Draw(glow).ellipse([-500, -650, 1500, 1150], fill=150)
glow = glow.filter(ImageFilter.GaussianBlur(320))
tile = Image.composite(Image.new("RGB", (S, S), (196, 122, 52)), tile, glow.point(lambda v: v * 0.55))
mask = Image.new("L", (S, S), 0)
M = 110
ImageDraw.Draw(mask).rounded_rectangle([M, M, S - M, S - M], radius=380, fill=255)
img.paste(tile, (0, 0), mask)

# ---------------------------------------------------------------- geometría del mástil
# El mástil va de lejos (arriba a la izquierda, estrecho) a cerca (abajo a la derecha, ancho).
FAR_TOP, FAR_BOT = (250, 640), (330, 860)
NEAR_TOP, NEAR_BOT = (1900, 820), (2020, 1620)


def persp(u):
    """u lineal 0..1 (lejos→cerca) a parámetro en pantalla con acortamiento de perspectiva."""
    k = 0.42   # < 1: lo lejano se comprime (los trastes se juntan hacia el clavijero)
    return u * k / (1 + u * (k - 1))


def pt(u, v):
    """u a lo largo (0 lejos, 1 cerca), v a lo ancho (0 graves/arriba, 1 agudas/abajo)."""
    p = persp(u)
    top = (lerp(FAR_TOP[0], NEAR_TOP[0], p), lerp(FAR_TOP[1], NEAR_TOP[1], p))
    bot = (lerp(FAR_BOT[0], NEAR_BOT[0], p), lerp(FAR_BOT[1], NEAR_BOT[1], p))
    return (lerp(top[0], bot[0], v), lerp(top[1], bot[1], v))


neck = Image.new("RGBA", (S, S), (0, 0, 0, 0))
nd = ImageDraw.Draw(neck)

# Canto del diapasón (el grosor que se ve bajo las agudas) y sombra sobre la caja.
edge = [pt(0, 1), pt(1, 1), (NEAR_BOT[0] + 10, NEAR_BOT[1] + 120), (FAR_BOT[0] + 4, FAR_BOT[1] + 30)]
shadow = Image.new("L", (S, S), 0)
ImageDraw.Draw(shadow).polygon([(x + 40, y + 90) for x, y in edge], fill=170)
shadow = shadow.filter(ImageFilter.GaussianBlur(60))
neck.paste((0, 0, 0, 255), (0, 0), shadow)
nd.polygon(edge, fill=(58, 30, 16, 255))

# Tapa del diapasón: palisandro con veta a lo largo.
board = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)]
nd.polygon(board, fill=(74, 40, 22, 255))
for _ in range(260):
    v = rng.random()
    shade = rng.choice([(56, 28, 14), (92, 52, 28), (66, 34, 18), (104, 60, 32)])
    pts = [pt(u, v + 0.012 * math.sin(u * 9 + v * 30)) for u in [i / 40 for i in range(41)]]
    nd.line(pts, fill=shade + (rng.randint(60, 150),), width=rng.randint(2, 5))
# Brillo cálido sobre la madera, más fuerte cerca.
sheen = Image.new("L", (S, S), 0)
ImageDraw.Draw(sheen).polygon([pt(0.35, 0.05), pt(1, 0.0), pt(1, 0.45), pt(0.35, 0.35)], fill=70)
sheen = sheen.filter(ImageFilter.GaussianBlur(70))
neck.paste((255, 196, 130, 255), (0, 0), Image.composite(sheen, Image.new("L", (S, S), 0), Image.new("L", (S, S), 255)).point(lambda a: a // 2))
# Recortar el brillo al diapasón.
board_mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(board_mask).polygon(board + edge[2:], fill=255)

# Trastes (posiciones reales de un tramo del 1 al 8, normalizadas a u).
scale = 650.0
pos = [scale * (1 - 2 ** (-n / 12)) for n in range(1, 9)]
start, end = scale * (1 - 2 ** (-0.6 / 12)), scale * (1 - 2 ** (-8.4 / 12))
frets = [(p - start) / (end - start) for p in pos]
for f in frets:
    a, b = pt(f, -0.01), pt(f, 1.01)
    w = int(lerp(10, 26, persp(f)))
    nd.line([(a[0] + 4, a[1] + 6), (b[0] + 4, b[1] + 6)], fill=(20, 10, 4, 160), width=w)      # sombra
    nd.line([a, b], fill=(176, 170, 160, 255), width=w)
    nd.line([a, b], fill=(244, 240, 230, 255), width=max(2, w // 3))                          # filo brillante

# Puntos de posición (trastes 3, 5 y 7: entre trastes 2-3, 4-5, 6-7).
for i in (1, 3, 5):
    u = (frets[i - 1] + frets[i]) / 2 if i > 0 else frets[0] / 2
    c = pt(u, 0.5)
    r = lerp(12, 30, persp(u))
    nd.ellipse([c[0] - r * 1.25, c[1] - r, c[0] + r * 1.25, c[1] + r], fill=(222, 214, 196, 230))

# Cuerdas: 6ª–4ª entorchadas arriba (gruesas, metálicas), 3ª–1ª nailon abajo.
STRINGS = [  # (v, grosor cerca, color base, entorchada)
    (0.09, 30, (190, 168, 128), True),
    (0.25, 26, (200, 178, 136), True),
    (0.41, 22, (212, 190, 146), True),
    (0.57, 20, (236, 226, 206), False),
    (0.73, 16, (240, 232, 214), False),
    (0.89, 13, (244, 238, 222), False),
]
for v, w_near, col, wound in STRINGS:
    pts = [pt(u, v) for u in [i / 60 for i in range(61)]]
    for j in range(60):
        p0, p1 = pts[j], pts[j + 1]
        w = int(lerp(w_near * 0.38, w_near, persp(j / 60)))
        nd.line([(p0[0] + w * 0.5, p0[1] + w * 1.1), (p1[0] + w * 0.5, p1[1] + w * 1.1)], fill=(16, 8, 3, 120), width=w)
    for j in range(60):
        p0, p1 = pts[j], pts[j + 1]
        u = j / 60
        w = int(lerp(w_near * 0.38, w_near, persp(u)))
        nd.line([p0, p1], fill=col + (255,), width=w)
        nd.line([(p0[0], p0[1] - w * 0.22), (p1[0], p1[1] - w * 0.22)], fill=(255, 250, 238, 200), width=max(2, w // 4))
    if wound:   # vueltas del entorchado
        for j in range(0, 240):
            u = j / 240
            c = pt(u, v)
            w = lerp(w_near * 0.38, w_near, persp(u))
            nd.line([(c[0] - w * 0.18, c[1] - w * 0.48), (c[0] + w * 0.18, c[1] + w * 0.48)], fill=(120, 100, 70, 150), width=2)

neck = Image.composite(neck, Image.new("RGBA", (S, S), (0, 0, 0, 0)), Image.new("L", (S, S), 255))
img.paste(neck, (0, 0), neck)

# ---------------------------------------------------------------- la nota de la pregunta, en dorado
u_note = (frets[5] + frets[6]) / 2          # entre los trastes 6 y 7, cerca: se lee a 64 px
c = pt(u_note, 0.41)                        # sobre la 4ª cuerda
r = lerp(30, 70, persp(u_note)) * 1.15
halo = Image.new("L", (S, S), 0)
ImageDraw.Draw(halo).ellipse([c[0] - r * 2.6, c[1] - r * 2.6, c[0] + r * 2.6, c[1] + r * 2.6], fill=210)
halo = halo.filter(ImageFilter.GaussianBlur(r * 0.9))
img.paste((255, 196, 70), (0, 0), halo)
d = ImageDraw.Draw(img)
d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=(26, 16, 6), outline=(248, 206, 92), width=int(r * 0.24))
d.ellipse([c[0] - r * 0.38, c[1] - r * 0.38, c[0] + r * 0.38, c[1] + r * 0.38], fill=(255, 222, 120))

# ---------------------------------------------------------------- recorte final y borde fino
final = Image.new("RGB", (S, S), (10, 6, 18))
final.paste(img, (0, 0), mask)
ImageDraw.Draw(final).rounded_rectangle([M, M, S - M, S - M], radius=380, outline=(84, 58, 36), width=6)
final = final.resize((OUT, OUT), Image.LANCZOS)
final.save(HERE / "icono-diapason.png")
print("icono-diapason.png", final.size)
