# ENTREGA — Portal atlante · Walking AP Multi

## Estado

- Versión: v1, generación inicial. Fecha: 2026-09-16.
- Lista para revisión de Luis; integración a cargo del integrador.

## Archivos

| Archivo | Contenido |
|---|---|
| modelar-portal.py | Regenera todos los entregables mediante bpy |
| portal.blend | Escena editable, iris cerrado; arena con hueco y luces de revisión |
| portal.glb | Nueve mallas, COLOR_0 conectado, sin arena ni luces |
| portal.json | kit.export_parts, ejes Three, bisagras, ángulo y metadatos |
| render-juego.png, render-cerca.png, render-abierto.png, render-planta.png | Cycles, 40 muestras y denoise; perspectivas FOV vertical 60°, near 0.1 |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-portal.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Fondo × alto × ancho cerrado | 10.800 × 1.770 × 10.800 u |
| Diámetro máximo | 10.800 u |
| Origen | Centro del mecanismo, pie del aro en Y=0 |
| Orientación | Radial; segmento 0 hacia +Z; 1 hacia +X,+Z; orden horario desde arriba |
| Triángulos / mallas | 7956 / 9 |
| JSON | 555.9 KiB |
| Abierto | radio central libre ≥ 3.390 u; punto inferior Y=-1.845 u |

## Partes

| Objeto | part | segment | Pivote Three | Material | Eje de giro Three | Amplitud | Velocidad |
|---|---|---|---|---|---|---|---|
| Aro tallado | frame | — | (0,0,0) | Piedra | — | fijo | 0 |
| Incrustaciones y cojinetes | frame_gold | — | (0,0,0) | Oro | — | fijo | 0 |
| Pétalo 0 | iris_leaf | 0 | (0.0000, 1.3200, 3.5000) | Piedra y pigmento oro | (-1.0000, 0.0000, 0.0000) | 0 → 1.919862 rad | 2.743 rad/s media, 0.7 s |
| Pétalo 1 | iris_leaf | 1 | (3.0311, 1.3200, 1.7500) | Piedra y pigmento oro | (-0.5000, 0.0000, 0.8660) | 0 → 1.919862 rad | 2.743 rad/s media, 0.7 s |
| Pétalo 2 | iris_leaf | 2 | (3.0311, 1.3200, -1.7500) | Piedra y pigmento oro | (0.5000, 0.0000, 0.8660) | 0 → 1.919862 rad | 2.743 rad/s media, 0.7 s |
| Pétalo 3 | iris_leaf | 3 | (0.0000, 1.3200, -3.5000) | Piedra y pigmento oro | (1.0000, 0.0000, 0.0000) | 0 → 1.919862 rad | 2.743 rad/s media, 0.7 s |
| Pétalo 4 | iris_leaf | 4 | (-3.0311, 1.3200, -1.7500) | Piedra y pigmento oro | (0.5000, 0.0000, -0.8660) | 0 → 1.919862 rad | 2.743 rad/s media, 0.7 s |
| Pétalo 5 | iris_leaf | 5 | (-3.0311, 1.3200, 1.7500) | Piedra y pigmento oro | (-0.5000, 0.0000, -0.8660) | 0 → 1.919862 rad | 2.743 rad/s media, 0.7 s |
| Luz del paso | glow | — | (0,0.085,0) | Turquesa | intensidad emisiva | 0.22 → 2.0 | transición 0.7 s |

## Materiales

| Material | Pigmento hex | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Arenisca | #dcd3bc a #b4a98f, vetas #d9a441 | 0 / 0.78 | 0 | 1 | Un material por hoja; vetas talladas con pigmento dorado mate |
| Oro fijo | #d9a441, luces #f1d488 | 0.6 / 0.30 | 0 | 1 | Malla adicional frame_gold: molduras, runas y cojinetes |
| Paso | #7fe9ff | 0 / 0.65 | 0.22 cerrado, 2.0 abierto; #7fe9ff | 1 | Disco opaco sin textura; única parte emisiva |

## Meta y apertura

El exportador escribe los campos de meta en la raíz del JSON. `hingeAxis=(-1,0,0)` es el eje de referencia del segmento 0, no un eje global idéntico para todas las hojas. `hingeAxes` contiene los seis ejes globales Three de la tabla; `hingePivots` contiene sus seis bisagras. Para segmento i, eje = RY(i·π/3)·(-1,0,0).

`openAngle=1.919862177` rad (110°), `openingDuration=0.7` s. Aplicar una rotación de eje arbitrario sobre el pivote de cada malla con su eje global correspondiente; las geometrías ya vienen orientadas radialmente, no volver a girarlas i·60°. Una interpolación suave entre 0 y openAngle abre hacia abajo y afuera. El centro queda despejado al llegar a 110°.

`glowCenter=(0,0.085,0)`, `glowRadius=3.34`, `glowEmissionClosed=0.22`, `glowEmissionOpen=2.0`. `openMinimumY=-1.8454`, `openClearRadius=3.3901`, `collisionChecks=216`. `radial=true`, `segment0Direction=+Z`, `segmentOrder=clockwise_from_above`.

## Diferencias con el brief

Se añade frame_gold, novena malla, para conservar el oro satinado del aro. Las vetas y ejes de las seis hojas comparten rugosidad mate de la piedra: kit exporta un solo material por parte y separarlos excedería las diez mallas. El hueco interior es hexagonal, con exterior circular; permite seis bisagras tangenciales y pétalos que sellan sin solaparse. Abierto, las hojas bajan hasta Y=-1.845, bajo el plano de apoyo, como exige el plegado bajo el aro; la altura cerrada es 1.770 u.

## Sugerencias para integrar

Mantener frame y frame_gold fijos. Animar simultáneamente los seis iris_leaf y la emisión de glow durante 0.7 s; no cambiar su color. El render usa arena con una abertura real: el suelo del juego debe dejar visible el paso y permitir las hojas bajo Y=0. La zona de corte usada tiene apotema 4.45 u y queda cubierta por el aro. La arena, las luces y el bloom de revisión no se exportan en GLB/JSON. Exportaciones cerradas, sin clips horneados.

## Revisión propia

El script verifica 216 pares de superficies mediante BVH de triángulos a 0°, 15°, 30°, 45°, 60°, 75°, 90° y 110°: cada hoja frente a las otras y frente a frame y frame_gold. No admite intersecciones en estas ocho poses. Los cilindros de bisagra giran dentro de cojinetes huecos con holgura. También verifica el radio central libre abierto, dimensiones cerradas, presupuesto, opacidad, emisión exclusiva de glow y COLOR_0 en cada primitiva GLB. Son ocho poses discretas, no una prueba continua del movimiento completo.
