# ENTREGA — Planetas de fondo · Walking AP Multi, El Cosmos

> Escrito por Gemini al terminar el modelado. Breve: el integrador la usa en lugar de leer el script.

## Estado

- Versión / ronda: v1, ronda 1
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-planetas-cosmos.py` | fuente reproducible (regenera todo lo de abajo) |
| `planetas-cosmos.blend` | escena editable |
| `planetas-cosmos.glb` | modelo portable (visor de Blender) |
| `planetas-cosmos.json` | geometría para el juego (`kit.export_glb` / `export_parts`) |
| `planetas-cosmos-juego.glb` | la misma geometría en GLB optimizado para el juego (`kit.export_glb`) |
| `render-kit.png` | revisión |

Regenerar (desde la carpeta del modelo):

```cmd
C:\Users\Luis\blender-bpy\modelar.cmd "C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios\apps-src\oido-absoluto-multi-juego\art\blender\planetas-cosmos\modelar-planetas-cosmos.py"
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño real (largo × alto × ancho, u) | Radio base 1 u (planetas), radio exterior 1.85–2.23 u (anillos); el juego los escala a radio 14–20 m |
| Origen | Centro de cada planeta/anillo en (0, 0, 0) |
| Frente | +Z en espacio Three |
| Triángulos totales | 13 952 (Planeta A: 3 968, Anillo A: 1 024, Planeta B: 3 968, Planeta C: 3 968, Anillo C: 1 024) |
| Mallas exportadas | 5 (`planet_a`, `ring_a`, `planet_b`, `planet_c`, `ring_c`) |
| Peso del JSON / del GLB de juego | 632 kB / 83 kB |
| Oclusión ambiental | Sin AO (`None`) |
| Puntos en `meta` | `forward="+Z"`, `note="radio 1; el juego los escala a 14-20 m; ring_a y ring_c giran en su eje"` |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Planeta A | `planet_a` | — | (0, 0, 0) | Planeta | Rotación Y | — | Rotación lenta de fondo | Esfera 64×32 con rayas coral/durazno/crema y leve ondulación |
| Anillo A | `ring_a` | — | (0, 0, 0) | Anillo | Rotación local eje anillo | — | Giro lento continuo | Toro plano grueso (radio 1.85, ancho 0.38, tilt 18°), degradado turquesa |
| Planeta B | `planet_b` | — | (0, 0, 0) | Planeta | Rotación Y | — | Rotación lenta de fondo | Esfera 64×32 con desplazamiento Voronoi (cráteres turquesa con hondonadas oscuras) |
| Planeta C | `planet_c` | — | (0, 0, 0) | Planeta | Rotación Y | — | Rotación lenta de fondo | Esfera 64×32 con rayas lavanda y rosa y leve ondulación |
| Anillo C | `ring_c` | — | (0, 0, 0) | Anillo | Rotación local eje anillo | — | Giro lento continuo | Toro plano delgado (radio 1.7, ancho 0.3, tilt -24°), degradado amarillo-coral |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emisión | Alfa | Qué debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Planeta | Pigmento por vértice (`BANDS_A`, `crater_color`, `BANDS_C`) | 0.0 / 0.7 | 0.0 | 1.0 | Sombreado suave (smooth); caramelos con personalidad para fondo cósmico |
| Anillo | Pigmento por vértice (degradado interior a exterior) | 0.0 / 0.5 | 0.15 (`ffe66d`) | 1.0 | Anillos con leve emisión cálida que giran suavemente sobre su eje inclinado |

## Diferencias con el brief

Ninguna. Se cumplió la receta exacta, partes, presupuesto de triángulos (13 952 exactos vs máx 16 000), sin AO y parámetros de render del brief.

## Sugerencias para integrar

- Colocar en el fondo a 250–330 m de distancia.
- Escalar a radio 14–20 m.
- Los anillos comparten origen (0, 0, 0) con sus respectivos planetas, rotan en su propio eje de inclinación.
