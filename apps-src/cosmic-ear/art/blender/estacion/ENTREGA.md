# ENTREGA — Estación de salida · Cosmic Ear

> Modelada por Claude. Integrada en `src/scene/station.js`.

## Estado

- Versión / ronda: v1, ronda 1
- Fecha: 2026-09-26
- Lista para: integración (integrada; falta que Luis la vea jugando)

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-estacion.py` | fuente reproducible (regenera todo lo de abajo) |
| `estacion.blend` | escena editable |
| `estacion.glb` | modelo portable |
| `estacion.json` / `estacion-juego.glb` | lo que carga el juego (`kit.export_glb`); el GLB se copia a `src/scene/assets/estacion.glb` |
| `render-cerca.png`, `render-juego.png` | revisión, con la nave encima |

Regenerar (desde esta carpeta):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-estacion.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño | cubierta de radio 3.2 en y = 0; panza hasta y = −2.9; anillo de radio 3.85; faroles hasta y = 1.4 |
| Origen | centro de la cubierta |
| Frente | −Z (las flechas turquesa señalan la salida, como la nariz de la nave) |
| Triángulos totales | 6 508 |
| Mallas exportadas | 4 |
| GLB de juego | 48 KB |
| Oclusión ambiental | distance 0.5, strength 0.6 |

## Partes

| `part` | Qué es | Material | En el juego |
|---|---|---|---|
| `pad` | cuerpo trompo-isla, cubierta y 4 postes | Pintura (color por vértice) | fija en (0, −1.1, 0), bajo la nave |
| `pad_lights` | 12 luces de la cubierta y 3 flechas | Luces, emisión turquesa `3fd2c7` 1.6 | laten |
| `pad_beacons` | focos de los 4 faroles | Focos, emisión magenta `ff6fb5` 2.0 | laten |
| `pad_ring` | anillo dorado con 6 cuentas | Oro, metal 0.6, emisión `ffcf5a` 0.35 | gira en Y (0.25 rad/s) |

Colores: cubierta `3b2466`→`4d2f80`, anillo de aterrizaje `8c63b8`, centro `ffcf5a`, borde `fff7ea`,
canto `ff6fb5`, panza `2a1650`→`6b4487`, punta `3fd2c7`.

## Diferencias con el plan

El plan la daba a Gemini como pieza simple; la modeló Claude porque es lo primero que ve el alumno al
empezar cada misión.
