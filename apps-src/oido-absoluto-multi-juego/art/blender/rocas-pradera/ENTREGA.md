# ENTREGA — Rocas de La Pradera · Walking AP Multi

> La escribe **Gemini** al terminar el modelado. Breve: el integrador la usa en lugar de leer el script.

## Estado

- Versión / ronda: v1, ronda 1
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-rocas-pradera.py` | fuente reproducible (regenera todo lo de abajo) |
| `rocas-pradera.blend` | escena editable |
| `rocas-pradera.glb` | modelo portable (visor) |
| `rocas-pradera.json` | geometría para el juego (`kit.export_glb`) |
| `rocas-pradera-juego.glb` | la misma geometría en GLB para el juego (`kit.export_glb`), con AO horneada |
| `render-kit.png` | render de revisión |

Regenerar (desde la carpeta del modelo):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-rocas-pradera.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño real (largo × alto × ancho, u) | rock_a: 1.4 × 0.8 × 1.1 u · rock_b: 0.9 × 1.5 × 0.8 u · rock_c: ~1.6 × ~0.9 × ~1.0 u |
| Origen | centro de la base en (0, 0, 0); apoya en z = 0 y se hunde 0.08 m |
| Frente | +Z en espacio Three |
| Triángulos totales | 3 520 (rock_a: 1 280, rock_b: 1 280, rock_c: 960) |
| Mallas exportadas | 3 (`rock_a`, `rock_b`, `rock_c`) |
| Peso del JSON / del GLB de juego | 159 kB / 26 kB |
| Oclusión ambiental | distance: 0.4, strength: 0.7 |
| Puntos en `meta` | forward="+Z", note="kit instanciado; pivote en la base; el juego escala 0.5-1.8" |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Roca A | `rock_a` | — | (0, 0, 0) | Piedra | — | — | — | Canto rodado bajo y redondeado; estática, instanciada |
| Roca B | `rock_b` | — | (0, 0, 0) | Piedra | — | — | — | Roca alta achatada en la punta; estática, instanciada |
| Roca C | `rock_c` | — | (0, 0, 0) | Piedra | — | — | — | Trío de rocas agrupadas; estática, instanciada |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emisión | Alfa | Qué debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Piedra | Vértices (Pigment: 5f8f3e, 8a8270, c4b99a) | 0.0 / 0.95 | 0.0 | 1.0 | Colores por vértice (`Pigment`); un solo material para las tres variantes |

## Diferencias con el brief

Ninguna.

## Sugerencias para integrar

Las tres rocas son piezas estáticas concebidas para instanciarse (`InstancedMesh`) con escala aleatoria de 0.5 a 1.8 y rotación aleatoria sobre el eje vertical Y en el nivel de La Pradera. El pivote está en la base con un hundimiento de 0.08 m para asentarse naturalmente en el terreno.
