# ENTREGA — Árboles · Walking AP Multi

> Modelado por **Gemini** siguiendo la receta y contrato técnico de `BRIEF-GEMINI.md`.

## Estado

- Versión / ronda: v1, ronda 1
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-arboles.py` | fuente reproducible (regenera todo lo de abajo) |
| `arboles.blend` | escena editable de Blender |
| `arboles.glb` | modelo estándar para visor |
| `arboles.json` | geometría exportada para el juego (`kit.export_glb`) |
| `arboles-juego.glb` | geometría optimizada en GLB para el juego (`kit.export_glb`) con AO horneado |
| `render-kit.png` | render de presentación en Cycles (1600 × 900) |

Regenerar (desde la carpeta del modelo):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-arboles.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño real (largo × alto × ancho, u) | `tree_round`: ~4.5 × 5.8 × 4.5 u · `tree_tall`: ~3.0 × 7.3 × 3.0 u · `tree_wide`: ~6.0 × 5.8 × 4.0 u · `bush`: ~2.5 × 1.2 × 2.0 u |
| Origen | Base del tronco en (0, 0, 0) |
| Frente | +Z en espacio Three |
| Triángulos totales | 3 628 (presupuesto: ≤ 8 000) |
| Mallas exportadas | 4 |
| Peso del JSON / del GLB de juego | 159 kB / 27 kB |
| Oclusión ambiental | distance: 1.2, strength: 0.7 |
| Puntos en `meta` | forward="+Z", note="kit instanciado; pivote en la base del tronco" |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Árbol redondo | `tree_round` | — | (0, 0, 0) | Follaje | — | — | — | Copa redonda grande sobre tronco chaparrito; instanciable |
| Árbol alto | `tree_tall` | — | (0, 0, 0) | Follaje | — | — | — | Copa ovalada alta sobre tronco; instanciable |
| Árbol ancho | `tree_wide` | — | (0, 0, 0) | Follaje | — | — | — | Copa ancha de tres bolas sobre tronco; instanciable |
| Arbusto | `bush` | — | (0, 0, 0) | Follaje | — | — | — | Arbusto bajo de tres bolas sin tronco; instanciable |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emisión | Alfa | Qué debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Corteza | `4a3226` → `7a5236` (vértice) | 0.0 / 0.95 | 0.0 | 1.0 | Color por atributo de vértice `Pigment` (más oscuro abajo) |
| Follaje | Gradientes verdes con motas `c8ec9a` (vértice) | 0.0 / 0.85 | 0.0 | 1.0 | Color por atributo de vértice `Pigment` (`tree_round`: `2e7d32`→`7cc05a`, `tree_tall`: `1e6b3c`→`5fb35a`, `tree_wide`: `388e3c`→`8fcf5f`, `bush`: `2f6b3a`→`7cc05a`) |

## Diferencias con el brief

Ninguna.

## Sugerencias para integrar

- Las cuatro partes están optimizadas para `InstancedMesh`.
- El pivote de todas está en la base (Y = 0 en Three.js), listas para sembrarse sobre el terreno.
- En el juego se pueden plantar unas 90 instancias combinadas con escala aleatoria entre 0.75 y 1.8 y giro al azar en Y.
