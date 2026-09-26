# ENTREGA — Castillo de La Pradera · Walking AP Multi

## Estado
- Versión / ronda: v1-ronda1b
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos
`modelar-castillo.py`, `castillo.blend`, `castillo.glb` (pigmento conectado), `castillo-juego.glb`, `castillo.json`, `render-juego.png`, `render-cerca.png`.

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-castillo.py
```

## Datos técnicos
| Dato | Valor |
|---|---|
| Dimensiones X × Y × Z (Three) | 45.58 × 26.80 × 45.58 m |
| Triángulos | 38140 |
| Mallas | 10 |
| JSON / GLB juego | 2702.2 / 342.5 KiB |
| Origen / frente | Centro de planta a suelo / +Z Three, −Y Blender |
| Muros | Exteriores ±20; 2 m grueso; 6 m alto más almenas |
| Torre central | 10 × 10 m; cuerpo 15 m |
| Puerta libre | 6.4 m ancho; rectángulo libre 5 m alto; arco llega a 8.2 m |
| AO | distance=3.0, strength=0.8 |

## Partes
| Objeto | part | segment | Pivote Three | Eje | Amplitud | Velocidad |
|---|---|---|---|---|---|---|
| Piedra miel, Molduras y dovelas, Tejados esmaltados, Carpintería, Hiedra, Flores y emblemas, Ventanas y herrajes | static | — | (0,0,0) | — | 0 | 0 |
| Banderín 0 | flag | 0 | (-19,18.2,19) | Y local | ±0.16 rad | 1.5 ciclos/s |
| Banderín 1 | flag | 1 | (19,18.2,19) | Y local | ±0.19 rad | 1.3 ciclos/s |
| Banderín 2 | flag | 2 | (0,26.5,0) | Y local | ±0.14 rad | 1.1 ciclos/s |

Animación sugerida: rotación Y = amplitud × sin(2π × frecuencia × tiempo + segment × 1.1). Tela con DoubleSide en juego y visor; los banderines pequeños del arco son estáticos.

## Materiales
Pigmento por vértice, metal 0, emisión 0, alfa 1. Piedra e2d3b3/b9a582 y tono intermedio d4bf9c, rugosidad .8; teja d9534f/4a7fc1, .55; madera 8a5a3b, .85; herrajes 4a4a52, .65; hojas 8fcf5f/4f9a3e, .9; flores y banderas ffd84d/ff8fb1/ffffff/b28dff, .72. Un material por malla.

## Meta
forward=+Z; gateCenter=(0,0,19); gateClearWidth=6.4; gateClearHeight=5; wallOuterBounds=(-20,20); courtyardGroundY=0. Unidades Three. Los metadatos de paso son informativos; no se incluyen colisionadores.

## Diferencias con el brief
- Puerta ensanchada de 6 a 6.4 m para dar holgura; mantiene íntegro el paso rectangular de 5 m bajo el arranque del arco.
- Torres en (±19,±19), radio del cuerpo 2.85 m y zócalo 3.15 m; tejados sobresalen hasta 3.79 m. Las dimensiones totales incluyen esos vuelos, no cambian la planta de muralla 40 × 40.
- La torre central tiene puerta decorativa cerrada: el espacio explorable solicitado es el patio. No hay hoja en la entrada de muralla.
- Escalera interior ornamental adosada al muro izquierdo, sin colisiones ni navegación incluidas. La pradera y las luces son solo de revisión, excluidas de los GLB.

## Revisión
Astra revisó render-juego.png y render-cerca.png de ronda 1, ejecutada por Claude: 36 780 triángulos, 10 mallas. La silueta, tejados de colores, banderas, volumen de torres y suavidad de piedra se leen bien. La hiedra se veía como bloques en zigzag: en ronda 1b se sustituye por dos tallos curvos, 18 ramas y 54 hojas abombadas en racimos abiertos, con variación de tamaño y orientación. La vista cercana cortaba el remate de la torre: FOV cercano ampliado a 68° y objetivo elevado a 8.5 m; cámara inicial sin cambios. Los nuevos renders deben comprobarse en la ejecución de Claude; esta revisión visual no los anticipa.
Recuento previsto por cambio de topología: 38 140 triángulos (margen 1 860). La tabla técnica de esta entrega contiene el recuento real de la ejecución que la genera. Se mantienen nombres, partes, pivotes, planta, puerta, dimensiones y paleta. Exportación con límites comprobados por el script. Cámara inicial (0,1.8,60), 40 m delante de la cara frontal, FOV vertical 60°, 1600 × 900; cámara cercana a 15.6 m de la esquina frontal derecha. La piedra de los renders recibe rebote verde de la pradera; valorar su calidez final con la luz del juego. La aprobación final corresponde a capturas del integrador con la luz real del nivel.
