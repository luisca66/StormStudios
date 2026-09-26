# ENTREGA — Cubo de nota · Walking AP Multi, La Pradera

> La escribe **Gemini** al terminar el modelado. Breve: el integrador la usa en lugar de leer el script.

## Estado

- Versión / ronda: v1, ronda 1
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-cubo-nota.py` | fuente reproducible (regenera todo lo de abajo) |
| `cubo-nota.blend` | escena editable |
| `cubo-nota.glb` | modelo portable (exportador de Blender) |
| `cubo-nota.json` | geometría para el juego (`kit.export_glb` / `export_parts`) |
| `cubo-nota-juego.glb` | la misma geometría en GLB para el juego (`kit.export_glb`), sin AO |
| `render-kit.png` | revisión |

Regenerar (desde la carpeta del modelo):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-cubo-nota.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño real (largo × alto × ancho, u) | 1.6 × 1.6 × 1.6 u (marco con esferas; gema de 1.1 u) |
| Origen | Centro del cubo (0, 1.2, 0) en espacio Three |
| Frente | +Z en espacio Three |
| Triángulos totales | 1 868 |
| Mallas exportadas | 2 (`Gema`, `Marco`) |
| Peso del JSON / del GLB de juego | 255 kB / 26.8 kB |
| Oclusión ambiental | sin AO |
| Puntos en `meta` | note = "glow: el juego lo tiñe con el color de la nota; pivote en el centro" |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Gema | glow | — | (0, 1.2, 0) | Cristal | Y (rotación) | continuo | suave | El juego la tiñe con el color de la nota |
| Marco | frame | — | (0, 1.2, 0) | Marco | Y (rotación) | continuo | suave | Marco dorado exterior con esferas en esquinas |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emisión | Alfa | Qué debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Cristal | `ffffff` → `d8d8e8` | 0.0 / 0.15 | 0.0 | 1.0 | Teñir con el color de la nota en tiempo real |
| Marco | `d9a441` | 0.6 / 0.35 | 0.0 | 1.0 | Metálico dorado estático |

## Diferencias con el brief

Ninguna.

## Sugerencias para integrar

Hacer flotar con un movimiento senoidal leve en Y y girar despacio sobre su eje Y. La gema `glow` se tiñe multiplicando su pigmento o ajustando el color según la nota de destino.
