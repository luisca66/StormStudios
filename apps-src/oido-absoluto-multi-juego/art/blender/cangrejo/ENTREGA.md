# ENTREGA — Cangrejo · Walking AP Multi

## Estado

- Versión: v3, segunda y última ronda de corrección visual. Fecha: 2026-09-16.
- Lista para: revisión de Luis; integración a cargo del integrador.

## Archivos

| Archivo | Contenido |
|---|---|
| modelar-cangrejo.py | Genera toda esta entrega con bpy |
| cangrejo.blend | Escena editable, reposo, arena y luces de revisión |
| cangrejo.glb | 14 mallas, COLOR_0 conectado; sin arena ni luces |
| cangrejo.json | kit.export_parts, pivotes, segmentos y metadatos Three |
| render-juego.png, render-cerca.png, render-arriba.png, render-pose.png | Cycles, 40 muestras, denoise, FOV vertical 60°, near 0.1 |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-cangrejo.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Largo × alto × ancho total | 5.076 × 2.315 × 6.500 u |
| Caparazón, ancho × fondo × alto | 2.993 × 2.199 × 1.100 u |
| Origen | (0,0,0), centro del caparazón proyectado al suelo; puntas neutrales Y=0 |
| Frente / marcha | +Z / eje X |
| Triángulos / mallas | 9984 / 14 |
| JSON | 426.9 KiB |
| pincerHinge0 | (-1.6, 1.03, 2.63), charnela lado −X |
| pincerHinge1 | (2.2, 1.03, 2.63), charnela lado +X |
| eyeBase | (0, 1.24, 0.68), pivote común de los pedúnculos |

Los campos pasados como meta se escriben en la raíz JSON, según kit. Otros campos: walkAxis=X, pincerParent0=claw:0, pincerParent1=claw:1, pincerOpeningAxis=+Y; poseChecks=27144; minimumFootYAtIndependentExtremes=-0.5378 u.

## Partes

| Objeto | part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Caparazón y vientre | body | — | (0.0, 0.0, -0.0) | Coral satinado | Y, traslación | ±0.1 u | 3 rad/s | Aplicar al grupo articulado; no separar las raíces. |
| Ojos sobre pedúnculos | eyes | — | (0.0, 1.24, 0.68) | Ojos y pedúnculos | Z | ±0.15 rad | 0.8 rad/s | Pedúnculos solidarios. |
| Pata 0 | leg | 0 | (-1.13, 0.93, 0.62) | Patas y juntas | X / Z | ±0.4 / ±0.1 rad | 3 rad/s | Fase 0; lado −X. |
| Pata 1 | leg | 1 | (-1.13, 0.93, 0.22) | Patas y juntas | X / Z | ±0.4 / ±0.1 rad | 3 rad/s | Fase π; lado −X. |
| Pata 2 | leg | 2 | (-1.13, 0.93, -0.22) | Patas y juntas | X / Z | ±0.4 / ±0.1 rad | 3 rad/s | Fase 0; lado −X. |
| Pata 3 | leg | 3 | (-1.13, 0.93, -0.62) | Patas y juntas | X / Z | ±0.4 / ±0.1 rad | 3 rad/s | Fase π; lado −X. |
| Pata 4 | leg | 4 | (1.13, 0.93, 0.62) | Patas y juntas | X / Z | ±0.4 / ±0.1 rad | 3 rad/s | Fase 0; lado +X. |
| Pata 5 | leg | 5 | (1.13, 0.93, 0.22) | Patas y juntas | X / Z | ±0.4 / ±0.1 rad | 3 rad/s | Fase π; lado +X. |
| Pata 6 | leg | 6 | (1.13, 0.93, -0.22) | Patas y juntas | X / Z | ±0.4 / ±0.1 rad | 3 rad/s | Fase 0; lado +X. |
| Pata 7 | leg | 7 | (1.13, 0.93, -0.62) | Patas y juntas | X / Z | ±0.4 / ±0.1 rad | 3 rad/s | Fase π; lado +X. |
| Brazo y pinza 0 | claw | 0 | (-0.92, 0.98, 0.74) | Coral satinado | Z | ±0.15 rad | 0.7 rad/s | Elevar con signo −; mover su pincer como hija. |
| Brazo y pinza 1 | claw | 1 | (0.92, 0.98, 0.74) | Coral satinado | Z | ±0.15 rad | 0.7 rad/s | Elevar con signo +; mover su pincer como hija. |
| Dedo móvil 0 | pincer | 0 | (-1.6, 1.03, 2.63) | Coral satinado | Y | 0 → +0.5 rad | apertura 1 rad/s; pausa 3–5 s | Charnela local respecto al brazo; véase jerarquía. |
| Dedo móvil 1 | pincer | 1 | (2.2, 1.03, 2.63) | Coral satinado | Y | 0 → +0.5 rad | apertura 1 rad/s; pausa 3–5 s | Charnela local respecto al brazo; véase jerarquía. |

## Materiales

| Material | Pigmentos hex | Metal / rugosidad | Emisión | Alfa | Notas |
|---|---|---|---|---|---|
| Coral satinado | #e8472a, #b8361f, #ff9a70, crema #f1e2c4, puntas #7a2418 | 0 / 0.44 | 0 | 1 | Caparazón, vientre y pinzas comparten acabado; pigmento propio |
| Patas y juntas | Coral, rojo oscuro, crema | 0 / 0.56 | 0 | 1 | Rodillas claras y extremos oscuros |
| Ojos y pedúnculos | #fff7e7, #191719, #ffffff, coral y crema | 0 / 0.34 | 0 | 1 | Brillo geométrico blanco; no emisión |

## Diferencias con el brief

Los materiales se agrupan por parte: el vientre comparte rugosidad del caparazón y los pedúnculos la de los ojos. Ambas pinzas abren con +Y de 0 a 0.5 rad como se pide; por eso el dedo móvil está en el borde +X de ambas manos (interior en la izquierda, exterior en la derecha). La vista cercana está a 6.08 u del punto de mirada, aproximadamente 5 u de la superficie anterior. Sin clips horneados ni cáusticas horneadas.

## Sugerencias para integrar

Al colgar pincer de claw, su traslación local es pincerHinge menos el pivote del hombro: izquierda (-0.68, 0.05, 1.89), derecha (1.28, 0.05, 1.89). No volver a sumar su pivote global. Aplicar la rotación Y del dedo después de la transformación del brazo.

La subida y bajada de 0.1 u debe trasladar el conjunto de articulaciones para conservar las inserciones. Las patas son mallas rígidas articuladas en el hombro: combinaciones independientes de X/Z pueden dejar puntas hasta 0.538 u bajo la arena. En render-pose se compensa la altura de todo el conjunto hasta apoyar la punta más baja; no se cambia el reposo exportado. Para caminar, coordinar fase y altura del conjunto o resolver apoyo en el integrador. No hay esqueleto ni articulaciones internas de rodilla exportadas.

## Revisión propia

El script comprueba dimensiones, presupuesto, segmentos, opacidad, emisión cero y COLOR_0 en GLB. Recorre 27144 posiciones de vértices en los extremos y en reposo, comparándolos con una envolvente elipsoidal del caparazón. Excluye únicamente las inserciones deliberadas dentro de las rótulas; comprueba continuidad exacta de los pivotes y de las charnelas con brazo elevado y dedo abierto. Las raíces de los ojos permanecen dentro del caparazón en ±0.15 rad. Esta comprobación es aproximada por envolvente, no una prueba booleana exhaustiva de todas las superficies entre sí.

Revisados los cuatro renders finales: silueta reconocible a 18 u; ocho patas separadas en la vista cenital; ojos, sonrisa y pinzas redondeadas legibles de cerca; brazos y dedos permanecen unidos en la pose abierta. Los surcos del caparazón son sutiles y el moteado aporta la mayor variación visible. La pose extrema usa la compensación vertical descrita arriba.
