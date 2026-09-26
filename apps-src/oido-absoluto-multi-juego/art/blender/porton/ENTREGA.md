# ENTREGA — Portón de madera · Walking AP Multi, La Pradera

> Modelo creado por Gemini siguiendo `BRIEF-GEMINI.md`.

## Estado

- Versión / ronda: v1
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-porton.py` | fuente reproducible (regenera todo lo de abajo) |
| `porton.blend` | escena editable en Blender |
| `porton.glb` | modelo portable glTF |
| `porton.json` | geometría para el juego (`kit.export_glb`) |
| `porton-juego.glb` | geometría optimizada en GLB con AO horneada (`kit.export_glb`) |
| `render-kit.png` | render de revisión con Cycles |

Regenerar (desde la carpeta del modelo):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-porton.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño real (largo × alto × ancho, u) | Marco: 7.9 × 5.3 × 1.1 u; Luz libre de paso: 6.0 × 4.27 u; Hojas: 3.0 × 4.0 × 0.22 u cada una |
| Origen / Pivotes | `frame`: (0, 0, 0); `door` segment 0: (−3.0, 2.0, 0.0); `door` segment 1: (3.0, 2.0, 0.0) en espacio Three.js |
| Frente | +Z en espacio Three (−Y de Blender; las argollas van por esa cara) |
| Triángulos totales | 2 436 (presupuesto ≤ 4 000) |
| Mallas exportadas | 3 partes (`frame`, `door` seg 0, `door` seg 1) |
| Peso del JSON / del GLB de juego | 304 kB / 36 kB |
| Oclusión ambiental | distance: 0.4, strength: 0.6 |
| Puntos en `meta` | forward="+Z", note="las hojas giran en Y alrededor de su pivote (bisagra)" |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Marco | `frame` | - | (0, 0, 0) | Piedra | - | - | - | Estático. Dos postes de piedra cálida en x = ±3.4 con remates achaflanados y viga superior de madera en z = 4.55 m (Z Blender) |
| Hoja izquierda | `door` | 0 | (−3.0, 2.0, 0.0) | Madera | Y | 0 a −80° aprox. | configurable | Hoja de 3 × 4 m formada por 5 tablones de alturas y tonos variables, dos bandas de hierro y argolla dorada cerca del borde de apertura |
| Hoja derecha | `door` | 1 | (3.0, 2.0, 0.0) | Madera | Y | 0 a +80° aprox. | configurable | Hoja simétrica de 3 × 4 m formada por 5 tablones, dos bandas de hierro y argolla dorada cerca del borde de apertura |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emisión | Alfa | Qué debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Madera | Color por vértice (`Pigment`) | 0.0 / 0.85 | 0.0 | 1.0 | Tablones con variedad tonal (`8a5a3b`, `7a4e33`, `9a6644`, `84553a`, `946040`), oscureciendo hacia `5e3b25` en la base. Viga en `7a4e33`. Bandas de hierro en `4a4a52` y argollas doradas en `d9a441`. |
| Piedra | Color por vértice (`Pigment`) | 0.0 / 0.90 | 0.0 | 1.0 | Postes con gradiente vertical (`b9a582` → `e2d3b3`) y remates en `d6c49e`. |

## Diferencias con el brief

Ninguna.

## Sugerencias para integrar

- Las hojas giran directamente sobre su pivote alrededor del eje Y de Three.js (la bisagra en x = ±3.0, y = 2.0).
- Hoja izquierda (`segment 0`) abre rotando en sentido negativo alrededor de Y; hoja derecha (`segment 1`) abre rotando en sentido positivo, ambas abriéndose hacia +Z del juego (frente hacia el jugador).
- El marco es estático y asienta en y = 0 del juego.
