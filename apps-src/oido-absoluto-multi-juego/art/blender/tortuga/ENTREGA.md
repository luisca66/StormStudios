# ENTREGA — Tortuga marina · Walking AP Multi

## Estado

- Versión: v3; corrección propia 2 de 2. Fecha: 2026-09-15.
- Lista para revisión de Luis; integración a cargo del integrador.

## Archivos

| Archivo | Contenido |
|---|---|
| modelar-tortuga.py | Regenera todos los entregables. |
| tortuga.blend | Escena editable, seis partes en reposo. |
| tortuga.glb | COLOR_0 conectado, partes y segmentos en extras. |
| tortuga.json | Exportación neutral kit.export_parts. |
| render-juego.png, render-cerca.png, render-arriba.png, render-pose.png | Cycles 40 muestras y denoise; FOV vertical 60°, near 0.1. |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-tortuga.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Largo × alto × ancho total | 4.030 × 1.338 × 4.860 u |
| Caparazón aproximado | 3.0 × 0.86 × 2.4 u, largo × alto × ancho |
| Origen | Centro del caparazón (0,0,0); articulaciones de aletas en Y=0.06. |
| Frente | +Z Three / −Y Blender. |
| Triángulos / mallas | 8646 / 6 |
| JSON | 382.0 KiB |
| meta.mouth | (0, -0.026, 2.2), hocico neutral, espacio Three; transformar con head al animar. |

## Partes

| Objeto | part | segment | Pivote Three | Material | Eje | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Caparazón, plastrón y cola | body | — | (0,0,0) | Caparazón | — | Fijo | 0 | Escudos en relieve. |
| Cabeza y cuello | head | — | (0,0,1.10) | Piel | X / Y | ±0.12 / ±0.25 rad | 0.45 / 0.30 rad/s | Mirada lenta. |
| Delantera 0 | flipper | 0 | (−0.82,0.06,0.65) | Piel | Z | ±0.5 rad | 1.6 rad/s | Lado −X. |
| Delantera 1 | flipper | 1 | (0.82,0.06,0.65) | Piel | Z | ±0.5 rad | 1.6 rad/s | Lado +X. |
| Trasera 2 | flipper | 2 | (−0.70,0.06,−0.94) | Piel | Z | ±0.15 rad | 0.8 rad/s | Timón. |
| Trasera 3 | flipper | 3 | (0.70,0.06,−0.94) | Piel | Z | ±0.15 rad | 0.8 rad/s | Timón. |

## Materiales

| Material | Pigmentos hex | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Caparazón | #2f5236–#4e7a4a, suturas #c8a24a, plastrón #e6d9a8 | 0 / 0.43 | 0 | 1 | Un acabado en body, incluida cola. |
| Piel | #5d7f6a, motas #b5c4a0, cuello #e6d9a8, ojos #182923 | 0 / 0.62 | 0 | 1 | Ojos comparten acabado mate; destello geométrico sin emisión. |

## Diferencias con el brief

El kit preserva +Z en el JSON: meta.forward declara +Z sin invertir silenciosamente el modelo. Body comparte material satinado en plastrón y cola, por el límite de un material por parte. Las articulaciones quedan 0.06 u sobre el origen central para mantener las raíces cubiertas. No se incluyen cáusticas ni niebla horneadas en el modelo.

## Sugerencias para integrar

La pose solicitada usa +0.5 rad Z en ambas delanteras y +0.25 rad Y en cabeza. Para un vuelo bilateral simétrico, usar la misma fase temporal y signos contrarios de Z a cada lado; el mismo signo produce balanceo. Exportaciones en reposo, sin clips horneados. Meta se almacena en la raíz del JSON por convenio de kit. Para mouth móvil, restar el pivote de head antes de aplicar su matriz.

## Revisión propia

El generador comprueba presupuesto, dimensiones, seis partes, COLOR_0 del GLB y anillos interiores de articulación en los extremos ±0.5/±0.15 y ±0.25 rad. Esta comprobación cubre la continuidad de las raíces, no es una prueba de intersección de toda la superficie.

Revisados visualmente los cuatro renders finales: silueta reconocible a 25 u; caparazón ovalado con escudos continuos en ámbar y relieve suave; cabeza redondeada con ojos pequeños y párpados; aletas con grosor y moteado. En la pose +0.5/+0.25 no se observan huecos expuestos en las uniones visibles. Se corrigieron los cruces de la base con los escudos y las juntas oscuras. No se ha probado la animación dentro del juego.
