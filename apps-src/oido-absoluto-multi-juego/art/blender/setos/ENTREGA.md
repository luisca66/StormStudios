# ENTREGA — Setos del laberinto · Walking AP Multi, La Pradera

> La escribe **Gemini** al terminar el modelado. Breve: el integrador la usa en lugar de leer el script.

## Estado

- Versión / ronda: v1, ronda 1
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-setos.py` | fuente reproducible (regenera todo lo de abajo) |
| `setos.blend` | escena editable |
| `setos.glb` | modelo portable (visor) |
| `setos.json` | geometría para el juego (`kit.export_glb`) |
| `setos-juego.glb` | la misma geometría en GLB para el juego (`kit.export_glb`), con AO horneada |
| `render-kit.png` | render de revisión |

Regenerar (desde la carpeta del modelo):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-setos.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño real (largo × alto × ancho, u) | hedge_long: 4.0 × 2.0 × 2.0 u · hedge_short: 2.0 × 2.0 × 2.0 u · topiary: ≈ 1.5 × 2.5 × 1.5 u |
| Origen | centro de la base en (0, 0, 0); todo apoya en z = 0 |
| Frente | no importa (simétricos / rotables libremente); tramos longitudinales en X |
| Triángulos totales | 6 712 (presupuesto ≤ 12 000) |
| Mallas exportadas | 3 (`hedge_long`, `hedge_short`, `topiary`) |
| Peso del JSON / del GLB de juego | 287 kB / 43 kB |
| Oclusión ambiental | distance: 0.5, strength: 0.6 |
| Puntos en `meta` | forward="+Z", note="kit instanciado; pivote en la base; tramos a lo largo de X" |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Seto largo | `hedge_long` | — | (0, 0, 0) | Follaje | — | — | — | Tramo recto de 4 m en X; estática, instanciada |
| Seto corto | `hedge_short` | — | (0, 0, 0) | Follaje | — | — | — | Tramo de 2 m en X para completar largos impares; estática, instanciada |
| Topiario | `topiary` | — | (0, 0, 0) | Follaje | — | — | — | Maceta de barro, tronco y copa esférica; estática, instanciada |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emisión | Alfa | Qué debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Follaje | Vértices (Pigment: 2f6b3a, 4f9a3e, 7cc05a, 8fcf5f, b5e38a, ff8fb1, ffffff, a64b2c, d9774a, 8a5a3b) | 0.0 / 0.9 | 0.0 | 1.0 | Colores por vértice (`Pigment`); un solo material con shader conectado a Pigment por parte |

## Diferencias con el brief

Se aseguró el origen en el cursor (0, 0, 0) para `hedge_long` y `hedge_short` igual que en `topiary`, de modo que las 3 variantes tengan su pivote en el centro de la base a z = 0 como exige la sección 2 del brief y el contrato técnico de kits instanciados.

## Sugerencias para integrar

Las tres piezas son estáticas diseñadas para instanciarse (`InstancedMesh`) con `buildKitField`. Los tramos de seto están orientados longitudinalmente en X para colocarse en fila formando los pasillos del laberinto (rotación de 90° en Y para muros perpendiculares). El topiario sirve como remate ornamental en esquinas o cruces.
