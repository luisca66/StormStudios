# ENTREGA — Cristal de nota · Walking AP Multi, El Cosmos

> Escrito por Gemini al terminar el modelado. Breve: el integrador la usa en lugar de leer el script.

## Estado

- Versión / ronda: v1, ronda 1
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-cristal-nota.py` | fuente reproducible (regenera todo lo de abajo) |
| `cristal-nota.blend` | escena editable |
| `cristal-nota.glb` | modelo portable (visor de Blender) |
| `cristal-nota.json` | geometría para el juego (`kit.export_glb` / `export_parts`) |
| `cristal-nota-juego.glb` | la misma geometría en GLB optimizado para el juego (`kit.export_glb`) |
| `render-kit.png` | revisión |

Regenerar (desde la carpeta del modelo):

```cmd
C:\Users\Luis\blender-bpy\modelar.cmd "C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios\apps-src\oido-absoluto-multi-juego\art\blender\cristal-nota\modelar-cristal-nota.py"
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño real (largo × alto × ancho, u) | ~5.4 × 5.4 × 4.8 u (radio aro 2.6 u); el juego lo escala x2.5 |
| Origen | Centro del cristal y del aro en (0, 0, 0) |
| Frente | +Z en espacio Three |
| Triángulos totales | 756 (Cristal: 100 núcleo + spikes + pequeñas; Aro con cuentas: 656) |
| Mallas exportadas | 2 (`crystal`, `ring`) |
| Peso del JSON / del GLB de juego | 63 kB / 13 kB |
| Oclusión ambiental | Sin AO (`None`) |
| Puntos en `meta` | `forward="+Z"`, `note="casi blanco: el juego tiñe crystal y ring con el color de la nota y los escala x2.5; ring gira"` |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Cristal | `crystal` | — | (0, 0, 0) | Cristal | Centro | — | Estático / flotación sutil | Núcleo icosaedro + 6 conos grandes + 4 conos chicos; facetado |
| Aro | `ring` | — | (0, 0, 0) | Aro | Rotación eje inclinado | — | Giro continuo | Toro mayor 2.6, menor 0.09 con 4 cuentas icosaédricas; inclinado 62° |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emisión | Alfa | Qué debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Cristal | Pigmento por vértice (`c9cfe0` a `ffffff`) | 0.0 / 0.15 | 1.0 (`ffffff`) | 1.0 | Casi blanco a propósito: el juego lo tiñe con el color de la nota actual y activa brillo |
| Aro | Pigmento por vértice (`ffffff`) | 0.0 / 0.3 | 0.8 (`ffffff`) | 1.0 | Casi blanco a propósito: el juego tiñe el aro y cuentas con el color de nota |

## Diferencias con el brief

Ninguna. Se cumplió la receta exacta, partes, presupuesto de triángulos (756 exactos vs máx 4 000), sin AO y parámetros de render del brief.

## Sugerencias para integrar

- El cristal y el aro comparten origen (0, 0, 0).
- Escalar x2.5 en el juego según indica el brief.
- Animar el aro haciéndolo rotar sobre su propio eje mientras el cristal se mantiene orientado o pulsa suavemente.
- Teñir ambos materiales con el color de la nota que canta el jugador.
