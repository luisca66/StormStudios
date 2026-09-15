# ENTREGA — Leviatán · Batisfera

## Estado
- Versión / ronda: v3, ronda de corrección 2/2 (final)
- Fecha: 2026-09-14
- Lista para: revisión de Luis

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-leviatan.py` | Fuente bpy reproducible |
| `leviatan.blend` | Originales rectos ocultos y colección de revisión en S |
| `leviatan.glb` | 19 piezas, pigmento por vértice conectado |
| `leviatan.json` | kit.export_parts, 19 piezas con pivotes y segmentos |
| `render-juego.png`, `render-cerca.png`, `render-perfil.png`, `render-detalle.png`, `render-cenital.png` | Cycles 40 muestras, denoise, foco frío |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-leviatan.py
```

## Datos técnicos
- Total: **29774 triángulos, 19 mallas**.
- Tamaño recto completo largo × alto × ancho: **49.400 × 8.878 × 8.940 u**, incluye placas y pectorales.
- P0=(0,0,0) en unión cabeza–cuerpo. Frente −Z Three / +Y Blender. Cola +Z Three / −Y Blender.
- Los pivotes se guardan en la pose recta: P_i=(0,0,4.6·i). Las posiciones de vértice del JSON son locales al pivote.
- Meta: forward=-Z; pointSpacing=4.6; chainPoints=P0…P8; bodyEnd=(0,0,4.6); plateHosts identifica head/body; jointRadii=[3.0, 2.85, 2.63, 2.38, 2.08, 1.76, 1.43, 1.12, 0.9].
- Radio vertical de interfaz común en cada unión; radio horizontal = 0.62 × radio vertical. Así coinciden los grosores nominales sin escalados del integrador.
- Extremos delanteros ocultos hasta −0.95 u y faldón posterior hasta +5.45 u: el solape cubre la articulación, el paso sigue siendo 4.6 u.
- **Uniones:** 10800 muestras dentro de la piel poligonal anterior con giro Y entre ±0.20 rad y X entre ±0.08 rad, combinados. Se comprueban cabeza/body1, body1…body8 y body8/cola. Margen mínimo de inserción 0.0752 u.
- JSON: 1283.4 KiB.
- Cámara de juego: distancia 55 u del centro del conjunto, FOV vertical 60°, near 0.1, far 400; ocupa 41.51% del ancho y cabe entero. Cercana a 25 u de (0,0.3,−2.5), cabeza y primeros cuerpos. Perfil completo; detalle solo head y plate0.

Dimensiones por pieza: ancho X × alto Y × largo Z, en coordenadas locales, incluyen solapes.

| Pieza | Triángulos | Dimensiones X × Y × Z (u) |
|---|---|---|
| head | 9026 | 8.940 × 6.295 × 9.626 |
| body 1 | 1572 | 3.720 × 6.192 × 6.400 |
| body 2 | 1572 | 3.534 × 5.898 × 6.400 |
| body 3 | 1572 | 3.261 × 5.461 × 6.400 |
| body 4 | 1572 | 2.951 × 4.965 × 6.400 |
| body 5 | 1572 | 2.579 × 4.366 × 6.400 |
| body 6 | 1572 | 2.182 × 3.727 × 6.400 |
| body 7 | 1572 | 1.773 × 3.066 × 6.400 |
| body 8 | 1572 | 1.389 × 2.438 × 6.400 |
| tail | 2160 | 1.116 × 2.440 × 5.950 |
| plate 0 | 668 | 0.380 × 4.373 × 3.550 |
| plate 1 | 668 | 0.316 × 3.029 × 3.420 |
| plate 2 | 668 | 0.314 × 2.848 × 3.290 |
| plate 3 | 668 | 0.367 × 2.599 × 3.160 |
| plate 4 | 668 | 0.296 × 2.413 × 3.030 |
| plate 5 | 668 | 0.291 × 2.168 × 2.900 |
| plate 6 | 668 | 0.367 × 1.926 × 2.770 |
| plate 7 | 668 | 0.319 × 1.683 × 2.640 |
| plate 8 | 668 | 0.311 × 1.440 × 2.510 |

## Partes y animación sugerida
| Objeto | part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Cabeza mandíbula y pectorales | head | — | 0.00, 0.00, -0.00 | Piel pizarra satinada | Y / X | ±0.08 / ±0.03 rad | 0.10 / 0.08 ciclos/s | Mandíbula con dientes discretos y pectorales integradas: amplitud propia 0 rad, velocidad 0 |
| Cuerpo 01 | body | 1 | 0.00, 0.00, 0.00 | Piel pizarra satinada | Curva en X; orientación +Z | Onda lateral ±1.4 u; vertical ±0.20 u | 0.10 ciclos/s; longitud de onda 36.8 u | Remuestrear por arco a 4.6 u; diferencias vecinas ≤0.20 Y y ≤0.08 X |
| Cuerpo 02 | body | 2 | 0.00, 0.00, 4.60 | Piel pizarra satinada | Curva en X; orientación +Z | Onda lateral ±1.4 u; vertical ±0.20 u | 0.10 ciclos/s; longitud de onda 36.8 u | Remuestrear por arco a 4.6 u; diferencias vecinas ≤0.20 Y y ≤0.08 X |
| Cuerpo 03 | body | 3 | 0.00, 0.00, 9.20 | Piel pizarra satinada | Curva en X; orientación +Z | Onda lateral ±1.4 u; vertical ±0.20 u | 0.10 ciclos/s; longitud de onda 36.8 u | Remuestrear por arco a 4.6 u; diferencias vecinas ≤0.20 Y y ≤0.08 X |
| Cuerpo 04 | body | 4 | 0.00, 0.00, 13.80 | Piel pizarra satinada | Curva en X; orientación +Z | Onda lateral ±1.4 u; vertical ±0.20 u | 0.10 ciclos/s; longitud de onda 36.8 u | Remuestrear por arco a 4.6 u; diferencias vecinas ≤0.20 Y y ≤0.08 X |
| Cuerpo 05 | body | 5 | 0.00, 0.00, 18.40 | Piel pizarra satinada | Curva en X; orientación +Z | Onda lateral ±1.4 u; vertical ±0.20 u | 0.10 ciclos/s; longitud de onda 36.8 u | Remuestrear por arco a 4.6 u; diferencias vecinas ≤0.20 Y y ≤0.08 X |
| Cuerpo 06 | body | 6 | 0.00, 0.00, 23.00 | Piel pizarra satinada | Curva en X; orientación +Z | Onda lateral ±1.4 u; vertical ±0.20 u | 0.10 ciclos/s; longitud de onda 36.8 u | Remuestrear por arco a 4.6 u; diferencias vecinas ≤0.20 Y y ≤0.08 X |
| Cuerpo 07 | body | 7 | 0.00, 0.00, 27.60 | Piel pizarra satinada | Curva en X; orientación +Z | Onda lateral ±1.4 u; vertical ±0.20 u | 0.10 ciclos/s; longitud de onda 36.8 u | Remuestrear por arco a 4.6 u; diferencias vecinas ≤0.20 Y y ≤0.08 X |
| Cuerpo 08 | body | 8 | 0.00, 0.00, 32.20 | Piel pizarra satinada | Curva en X; orientación +Z | Onda lateral ±1.4 u; vertical ±0.20 u | 0.10 ciclos/s; longitud de onda 36.8 u | Remuestrear por arco a 4.6 u; diferencias vecinas ≤0.20 Y y ≤0.08 X |
| Cola y aleta terminal | tail | — | 0.00, 0.00, 36.80 | Piel pizarra satinada | Y / X | ±0.12 / ±0.04 rad | 0.18 / 0.12 ciclos/s | Desde P8, siguiendo el último tramo |
| Placa dorsal 00 | plate | 0 | 0.00, 0.00, -0.00 | Placa craneal emisión 2 | Matriz anfitriona / emisión | 2 reposo → 5 pulso | 0.16 s por placa | Misma matriz que cabeza o body correspondiente |
| Placa dorsal 01 | plate | 1 | 0.00, 0.00, 0.00 | Placas nacaradas emisión 2 | Matriz anfitriona / emisión | 2 reposo → 5 pulso | 0.16 s por placa | Misma matriz que cabeza o body correspondiente |
| Placa dorsal 02 | plate | 2 | 0.00, 0.00, 4.60 | Placas nacaradas emisión 2 | Matriz anfitriona / emisión | 2 reposo → 5 pulso | 0.16 s por placa | Misma matriz que cabeza o body correspondiente |
| Placa dorsal 03 | plate | 3 | 0.00, 0.00, 9.20 | Placas nacaradas emisión 2 | Matriz anfitriona / emisión | 2 reposo → 5 pulso | 0.16 s por placa | Misma matriz que cabeza o body correspondiente |
| Placa dorsal 04 | plate | 4 | 0.00, 0.00, 13.80 | Placas nacaradas emisión 2 | Matriz anfitriona / emisión | 2 reposo → 5 pulso | 0.16 s por placa | Misma matriz que cabeza o body correspondiente |
| Placa dorsal 05 | plate | 5 | 0.00, 0.00, 18.40 | Placas nacaradas emisión 2 | Matriz anfitriona / emisión | 2 reposo → 5 pulso | 0.16 s por placa | Misma matriz que cabeza o body correspondiente |
| Placa dorsal 06 | plate | 6 | 0.00, 0.00, 23.00 | Placas nacaradas emisión 2 | Matriz anfitriona / emisión | 2 reposo → 5 pulso | 0.16 s por placa | Misma matriz que cabeza o body correspondiente |
| Placa dorsal 07 | plate | 7 | 0.00, 0.00, 27.60 | Placas nacaradas emisión 2 | Matriz anfitriona / emisión | 2 reposo → 5 pulso | 0.16 s por placa | Misma matriz que cabeza o body correspondiente |
| Placa dorsal 08 | plate | 8 | 0.00, 0.00, 32.20 | Placas nacaradas emisión 2 | Matriz anfitriona / emisión | 2 reposo → 5 pulso | 0.16 s por placa | Misma matriz que cabeza o body correspondiente |

## Materiales
| Material | Color | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Piel | Blanco × pigmento #172330, vientre #45515e, manchas y surcos; cresta #0b121c | 0 / 0.60 | 0 | 1 | Activar vertexColors; ojos incluidos en head |
| Placas | Pigmento nacarado #f2fff9 a #bbd5d0 | 0 / 0.46 | #f2fff9 × pigmento; 2 en plate0–8 | 1 | Teñir emisión con verde abisal #7fffc8; una placa por nota |

## Diferencias con el brief
La cabeza se alarga según la corrección final: hocico hasta Z=−7.6 u y longitud total de 49.4 u (aproximadamente 48 u en el brief). Plate0 vuelve a emisión 2, igual que las otras ocho placas. Solo render-detalle usa exposición −0.65 EV. La emisión de las crestas se modula con pigmento para conservar nervaduras y raíz oscura. La mandíbula prominente tiene dientes discretos expuestos. Mandíbula y pectorales forman parte de head y no tienen articulaciones independientes. Las longitudes geométricas de los cuerpos incluyen los solapes; la distancia funcional sigue siendo exactamente 4.6 u. Cabeza, ojos y pectorales comparten rugosidad 0.60, conservada en JSON y GLB. No se utilizan transparencias.

## Cambios de la ronda 2/2
Cabeza alargada y lateralmente estrecha, frente inclinada y hocico afilado. Mandíbula inferior ósea que se integra en las mejillas; abertura real con revestimiento interior oscuro y comisura descendente con pliegue. Cuatro dientes superiores por lado, cónicos, desiguales y curvados hacia dentro. Ojos pequeños hundidos bajo un borde óseo recto. La cresta oscura intermedia se sustituye por membrana baja de espesor continuo. Plate0 vuelve a emisión 2; exposición −0.65 EV solo en render-detalle. Cuerpo, cola, placas, pivotes y pectorales conservados; únicamente cambia la membrana intermedia y lo solicitado en cabeza.

## Revisión propia
Se revisaron visualmente los cinco renders: silueta anguiliforme completa y nueve placas legibles a 55 u; cabeza de curvas suaves, boca entreabierta y ojos pequeños hundidos; pectorales curvas; pigmento de vientre y manchas; cola en cinta. El encuadre medido se documenta en los datos técnicos. Comprobaciones geométricas de uniones y presupuesto incorporadas al generador. Las copias en S no llevan part ni segment y no se exportan.

## Sugerencias para integrar
Colocar head en P0; body i y plate i (i=1…8) en P(i−1), con +Z apuntando a Pi. Plate0 comparte la matriz de head; tail en P8. Sustituir la traslación recta por la posición de la curva; no sumarla dos veces. Longitud de onda sugerida 36.8 u, amplitud lateral 1.4 u y periodo 10 s; respetar el límite angular entre vecinos. Bramido: recorrer plate0…8 con separación 0.12 s, cada pulso de 0.16 s. Sin animaciones horneadas ni integración del juego.
