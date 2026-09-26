# ENTREGA — Asteroides decorativos · Cosmic Ear

> Escrito por Gemini al terminar el modelado. Breve: el integrador la usa en lugar de leer el script.

## Estado

- Versión / ronda: v1, ronda 1
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-asteroides.py` | fuente reproducible (regenera todo lo de abajo) |
| `asteroides.blend` | escena editable |
| `asteroides.glb` | modelo portable (visor de Blender) |
| `asteroides.json` | geometría para el juego (`kit.export_glb` / `export_parts`) |
| `asteroides-juego.glb` | la misma geometría en GLB optimizado para el juego (`kit.export_glb`), con AO |
| `render-kit.png` | revisión |

Regenerar (desde la carpeta del modelo):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-asteroides.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño real (largo × alto × ancho, u) | Variable por asteroide (entre 0.6 y 1.6 u; escala del juego 0.3 a 1.2) |
| Origen | Centro de cada asteroide en (0, 0, 0) |
| Frente | +Z en espacio Three (el juego los gira al azar) |
| Triángulos totales | 1 280 (320 asteroide A + 320 asteroide B + 640 asteroide C) |
| Mallas exportadas | 3 (`asteroid_a`, `asteroid_b`, `asteroid_c`) |
| Peso del JSON / del GLB de juego | 260 kB / 36 kB |
| Oclusión ambiental | distance: 0.3, strength: 0.6 |
| Puntos en `meta` | `forward="+Z"`, `note="kit instanciado; pivote en el centro; el juego escala 0.3-1.2"` |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Asteroide A | `asteroid_a` | — | (0, 0, 0) | Asteroide | Libre | — | Giro libre / rotación decorativa | Redondo y grumoso; 320 tris; facetado |
| Asteroide B | `asteroid_b` | — | (0, 0, 0) | Asteroide | Libre | — | Giro libre / rotación decorativa | Alargado tipo papa; 320 tris; facetado |
| Asteroide C | `asteroid_c` | — | (0, 0, 0) | Asteroide | Libre | — | Giro libre / rotación decorativa | Conglomerado de dos rocas pegadas; 640 tris; facetado |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emisión | Alfa | Qué debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Asteroide | Pigmento por vértice (`2a1838` en hondonadas, `3d2547` en roca base, `7a6690` en caras superiores) | 0.0 / 0.9 | 0.0 | 1.0 | Sombreado facetado (caras planas); el juego escala de 0.3 a 1.2 y rota al azar |

## Diferencias con el brief

Ninguna. Se cumplió la receta exacta, partes, presupuesto de triángulos (1 280 vs máx 2 400), oclusión ambiental y parámetros de render.

## Sugerencias para integrar

- Kit instanciado para cinturones decorativos alrededor de planetas.
- Pivote en el centro exacto (0, 0, 0); el juego puede rotar y escalar libremente en rango 0.3 - 1.2.
- No requiere suelo ya que flota en el espacio.
