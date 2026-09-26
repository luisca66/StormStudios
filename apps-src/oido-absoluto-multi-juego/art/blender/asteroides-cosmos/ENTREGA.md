# ENTREGA — Asteroides · Walking AP Multi, El Cosmos

> Escrito por Gemini al terminar el modelado. Breve: el integrador la usa en lugar de leer el script.

## Estado

- Versión / ronda: v1, ronda 1
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-asteroides-cosmos.py` | fuente reproducible (regenera todo lo de abajo) |
| `asteroides-cosmos.blend` | escena editable |
| `asteroides-cosmos.glb` | modelo portable (visor de Blender) |
| `asteroides-cosmos.json` | geometría para el juego (`kit.export_glb` / `export_parts`) |
| `asteroides-cosmos-juego.glb` | la misma geometría en GLB optimizado para el juego (`kit.export_glb`), con AO |
| `render-kit.png` | revisión |

Regenerar (desde la carpeta del modelo):

```cmd
C:\Users\Luis\blender-bpy\modelar.cmd "C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios\apps-src\oido-absoluto-multi-juego\art\blender\asteroides-cosmos\modelar-asteroides-cosmos.py"
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño real (largo × alto × ancho, u) | Variable por asteroide (radio base ~0.4–0.8 m; el juego escala a radio 2–8.5 m) |
| Origen | Centro de cada asteroide en (0, 0, 0) |
| Frente | +Z en espacio Three (el juego los gira al azar) |
| Triángulos totales | 1 280 (320 asteroide A + 320 asteroide B + 640 asteroide C) |
| Mallas exportadas | 3 (`asteroid_a`, `asteroid_b`, `asteroid_c`) |
| Peso del JSON / del GLB de juego | 260 kB / 38 kB |
| Oclusión ambiental | distance: 0.3, strength: 0.6 |
| Puntos en `meta` | `forward="+Z"`, `note="kit instanciado; pivote en el centro; el juego escala a radio 2-8.5 m"` |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Asteroide A | `asteroid_a` | — | (0, 0, 0) | Asteroide | Libre | — | Giro lento / obstáculo | Redondo y grumoso; 320 tris; facetado |
| Asteroide B | `asteroid_b` | — | (0, 0, 0) | Asteroide | Libre | — | Giro lento / obstáculo | Alargado tipo papa; 320 tris; facetado |
| Asteroide C | `asteroid_c` | — | (0, 0, 0) | Asteroide | Libre | — | Giro lento / obstáculo | Conglomerado de dos rocas pegadas; 640 tris; facetado |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emisión | Alfa | Qué debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Asteroide | Pigmento por vértice (`26335a` en hondonadas, `3a4a78` en roca base, `9aaddc` en caras superiores) | 0.0 / 0.9 | 0.0 | 1.0 | Sombreado facetado (caras planas) azul pizarra sobre fondo azul medianoche; el juego reparte ~40 por el nivel y los rota al azar |

## Diferencias con el brief

Ninguna. Se cumplió la receta exacta, partes, presupuesto de triángulos (1 280 vs máx 2 400), oclusión ambiental horneada y parámetros de render.

## Sugerencias para integrar

- Kit instanciado para colocar como obstáculos giratorios en El Cosmos (radio 2–8.5 m).
- Pivote en el centro exacto (0, 0, 0); el juego puede rotar en cualquier eje.
- Flotan en el espacio sin apoyo en suelo.
