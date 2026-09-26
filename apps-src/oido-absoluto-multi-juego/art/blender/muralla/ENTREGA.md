# ENTREGA — Muralla perimetral · Walking AP Multi, La Pradera

> Modelo creado por Gemini siguiendo `BRIEF-GEMINI.md`.

## Estado

- Versión / ronda: v1
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-muralla.py` | fuente reproducible (regenera todo lo de abajo) |
| `muralla.blend` | escena editable en Blender |
| `muralla.glb` | modelo para visor glTF |
| `muralla.json` | geometría para el juego (`kit.export_glb`) |
| `muralla-juego.glb` | geometría optimizada en GLB con AO horneada (`kit.export_glb`) |
| `render-kit.png` | render de revisión con Cycles |

Regenerar (desde la carpeta del modelo):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-muralla.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño real (largo × alto × ancho, u) | `wall_segment`: 8.0 × 7.0 × 1.8 u / `wall_tower`: Ø 4.6 × 11.2 u |
| Origen | Centro de la base en (0, 0, 0); apoya en y = 0 (Three.js) |
| Frente | +Z en espacio Three (`forward="+Z"`, tramo simétrico) |
| Triángulos totales | 1 030 (presupuesto ≤ 1 300) |
| Mallas exportadas | 2 partes (`wall_segment`, `wall_tower`) |
| Peso del JSON / del GLB de juego | 131 kB / 19 kB |
| Oclusión ambiental | distance: 1.0, strength: 0.5 |
| Puntos en `meta` | note="kit instanciado; tramo de 8 m a lo largo de X; pivote en la base" |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Tramo de muralla | `wall_segment` | - | (0, 0, 0) | Piedra | - | - | - | Tramo de 8 m a lo largo de X, cornisa a 5.85 m, 4 almenas hasta 7.0 m y 12 piedras salientes |
| Torreta | `wall_tower` | - | (0, 0, 0) | Piedra | - | - | - | Torreta cilíndrica (Ø 3.6 m cuerpo, 8 m alto), anillo, techo cónico rojo (Ø 4.6 m alero, alto total 11.2 m) y 2 aspilleras |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emisión | Alfa | Qué debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Piedra | Color por vértice (`Pigment`) | 0.0 / 0.9 | 0.0 | 1.0 | Colores horneados por vértice: gradiente piedra (`b9a582` → `e2d3b3`), musgo base (`6f8f4a`), cornisas (`d6c49e`), piedras salientes (`c9b58f`, `a8946f`, `d9c8a2`), techo cónico (`a83a36` → `d9534f`) y aspilleras (`3a2f28`). |

## Diferencias con el brief

Ninguna.

## Sugerencias para integrar

- Kit instanciado concebido para `InstancedMesh`.
- El tramo `wall_segment` mide exactamente 8 m en X, pensado para colocarse a pasos continuos de 8 unidades formando el perímetro de 300 × 300 m.
- Las torretas `wall_tower` se ubican en las esquinas del perímetro y flanqueando el portón de acceso.
- Ambos objetos tienen su pivote exactamente en el centro de su base a y = 0.
