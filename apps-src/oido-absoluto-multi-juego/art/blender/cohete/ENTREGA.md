# ENTREGA — Cohete del jugador · Walking AP Multi, nivel 3 «El Cosmos»

> Modelado por Claude. Integrado en `src/3d/blender-cosmos.ts` (`buildRocket`) y `player.ts` (`buildSpaceship`).

## Estado

- Versión / ronda: v1
- Fecha: 2026-09-26
- Lista para: integración (integrado; falta que Luis lo vea jugando)

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-cohete.py` | fuente reproducible |
| `cohete.blend` | escena editable |
| `cohete.glb` | modelo portable |
| `cohete.json` / `cohete-juego.glb` | lo que carga el juego; el GLB se copia a `src/3d/assets/cohete.glb` |
| `render-cerca.png`, `render-juego.png` | revisión |

## Datos técnicos

| Dato | Valor |
|---|---|
| Frente | +Z (como la nave anterior) |
| Tamaño | largo ≈ 3.9 m (nariz en z = 2.12, tobera en z = −1.75), envergadura ≈ 4.2 m |
| Triángulos | 4 296 |
| GLB de juego | 35 KB |
| Oclusión ambiental | distance 0.35, strength 0.5 |

## Partes

| `part` | `segment` | Pivote (Three) | En el juego |
|---|---|---|---|
| `body` | — | (0, 0, 0) | fijo; el juego mueve su contenedor (deriva y estirón) |
| `wing` | 0 izquierda, 1 derecha | (∓0.62, −0.12, −0.25), raíz del ala | `rotation.z` = giro × 0.3 (ángulo base 0) |
| `flame` | — | (0, 0, −1.75), boca de la tobera | escala Z 0 → 1.8 con la velocidad; X e Y a 0 en reposo |

Colores: crema `f3e6d0`→`fffaf0`, nariz y franja coral `ff7a6b`, franja turquesa `3fe0d0`, anillo amarillo
`ffe66d`, cúpula `1aa89c`→`b6fff6` con aro dorado, alas coral→durazno con puntas amarillas, antena lavanda
con bolita rosa. Llama: emisión `ffb35c` 2.5, de crema a coral.
