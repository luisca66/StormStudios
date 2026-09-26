# ENTREGA — Kit de lunas · Cosmic Ear

> Escrito por Gemini al terminar el modelado. Breve: el integrador la usa en lugar de leer el script.

## Estado

- Versión / ronda: v1, ronda 1
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-lunas.py` | fuente reproducible (regenera todo lo de abajo) |
| `lunas.blend` | escena editable |
| `lunas.glb` | modelo portable (visor de Blender) |
| `lunas.json` | geometría para el juego (`kit.export_glb` / `export_parts`) |
| `lunas-juego.glb` | la misma geometría en GLB optimizado para el juego (`kit.export_glb`) |
| `render-kit.png` | revisión |

Regenerar (desde la carpeta del modelo):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-lunas.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño real (largo × alto × ancho, u) | ≈ 2.0 × 2.0 × 2.0 u por luna (radio ≈ 1 u; el juego las escala) |
| Origen | Centro de cada luna en (0, 0, 0) |
| Frente | +Z en espacio Three |
| Triángulos totales | 2 640 (1 280 lisa + 1 280 cráteres + 80 cristal) |
| Mallas exportadas | 3 (`moon_smooth`, `moon_crater`, `moon_crystal`) |
| Peso del JSON / del GLB de juego | 126 kB / 22 kB |
| Oclusión ambiental | Sin AO (`None`; el juego tiñe y hace brillar) |
| Puntos en `meta` | `forward="+Z"`, `note="el juego tiñe cada luna con el color de su nota; pivote en el centro"` |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Luna lisa | `moon_smooth` | — | (0, 0, 0) | Luna | Rotación Y | — | Órbita / giro continuo | Esfera subdiv 4 deformada con Clouds (ondulaciones suaves) |
| Luna de cráteres | `moon_crater` | — | (0, 0, 0) | Luna | Rotación Y | — | Órbita / giro continuo | Esfera subdiv 4 deformada con Voronoi (cráteres y hundimientos) |
| Luna de cristal | `moon_crystal` | — | (0, 0, 0) | Luna | Rotación Y | — | Órbita / giro continuo | Esfera subdiv 2 deformada con Clouds, sombreado plano (facetada) |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emisión | Alfa | Qué debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Luna | Pigmento por vértice (`f4f1ea` a `ffffff` en cumbres, sombras sutiles) | 0.0 / 0.85 | 0.0 | 1.0 | Casi blancas: el juego tiñe cada luna con el color de su nota y le da emisión/brillo al cantarla |

## Diferencias con el brief

Ninguna. Se cumplieron todas las especificaciones, receta, presupuesto de triángulos (2 640 vs máx 6 000) y parámetros de render.

## Sugerencias para integrar

- Cada luna tiene su pivote exactamente en su centro geométrico (0, 0, 0).
- Instanciar o escalar según la nota/acorde de Cosmic Ear.
- Aplicar tinte y emisión dinámica en el material Principled BSDF al cantar la nota asociada.
