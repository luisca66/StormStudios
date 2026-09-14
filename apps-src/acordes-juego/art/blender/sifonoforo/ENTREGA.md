# ENTREGA — Sifonóforo · Batisfera

## Estado
- Versión / ronda: v1, entrega inicial
- Fecha: 2026-09-13
- Lista para: revisión de Luis

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-sifonoforo.py` | Fuente bpy reproducible |
| `sifonoforo.blend` | Cuatro originales ocultos y colonia de revisión en colección separada |
| `sifonoforo.glb` | Solo cuatro piezas originales, pigmento y dos materiales dentro de head |
| `sifonoforo.json` | Solo head, node, lantern, tail mediante kit.export_parts |
| `render-juego.png`, `render-cerca.png`, `render-perfil.png`, `render-detalle.png` | Cycles 40 muestras y denoise |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-sifonoforo.py
```

## Datos técnicos
Dimensiones locales en unidades Three: ancho X × alto Y × fondo Z. Cada pieza se entrega en su propio origen; no separar las piezas trasladándolas en el JSON o GLB.

| Pieza | Triángulos | Dimensiones X × Y × Z | Pivote Three |
|---|---|---|---|
| head | 2148 | 0.592 × 1.005 × 0.589 | (0,0,0) |
| node | 492 | 0.320 × 0.596 × 0.222 | (0,0,0) |
| lantern | 128 | 0.142 × 0.145 × 0.142 | (0,0,0) |
| tail | 820 | 0.277 × 0.811 × 0.233 | (0,0,0) |

- Total de recursos: 3588 triángulos, 4 mallas. Colonia de revisión: head + 14 node + 14 lantern + tail.
- Sin frente; cadena en −Y Three / −Z Blender.
- Meta: `axisDirection=(0,-1,0)`, `nodeSpacing=0.42`, `nodeEnd=(0,-0.42,0)`, `lanternPivot=(0,0,0)`.
- Pitch exacto: 0.42 u entre pivotes, independiente del giro de cada instancia.
- Nudo inferior centrado en nodeEnd, radio 0.085 u. Sobresale del extremo nominal para cubrir la articulación.
- Unión comprobada en geometría poligonal: 5184 muestras, ángulos −0.25/0/+0.25 rad, 12 ejes radiales y escalas independientes 0.9/1/1.1. Anillo superior del siguiente tallo dentro del nudo anterior; margen mínimo 0.0189 u.
- Cámara de juego a 25 u del centro: altura 25.95% del cuadro. Cámara cercana a 10 u del centro de head y cinco primeros nodos: ese grupo ocupa 27.37%, FOV vertical 60°, 1600×900. La colonia sigue completa en el render cercano.
- Peso JSON: 156.0 KiB.

## Partes y animación sugerida
| Objeto | part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Flotador y ocho campanas | head | — | 0,0,0 | Tejido opaco + campanas | Z / X | ±0.08 / ±0.04 rad | 0.16 / 0.12 ciclos/s | Balanceo desde unión inferior |
| Cormidio reutilizable | node | — | 0,0,0 | Tejido opaco | Traslación XZ de curva; orientación −Y | Onda X ±0.32 u; Z ±0.10 u | 0.18 ciclos/s; fase 0.40 rad por nodo | Remuestrear curva a 0.42 u; limitar ángulo vecino a 0.25 rad |
| Farol del cormidio | lantern | — | 0,0,0 | Emisión neutra | Misma matriz que node / emisión | Base 2; pulso 2→5→2 | 0.18 s por nota | No trasladar al centro del bulbo: comparte pivote con node |
| Remate y filamentos | tail | — | 0,0,0 | Tejido opaco | X / Z | ±0.06 / ±0.08 rad | 0.23 / 0.19 ciclos/s | Desde último punto de la curva; filamentos integrados, sin pivotes propios |

## Materiales
| Material | Color | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Tejido | Blanco × pigmento crema #f2d9c4, rosa #e6c9c0; saco #d9573b | 0 / 0.32 | 0 | 1 | VertexColors, sin texturas |
| Campanas de head | #dfe9ec con variación | 0 / 0.32 | 0 | 0.65 | Solo Blender/GLB; cavidad y borde doblado, no láminas simples |
| Farol | #fff6ea | 0 / 0.32 | #fff6ea, 2 | 1 | Teñir por familia, misma transformación que node |

## Diferencias con el brief
Head mide aproximadamente 1.00 u de alto × 0.59 u de ancho frente a los ≈0.9 × 0.7 u orientativos. El JSON compartido solo transporta un material por pieza: head se exporta opaco en JSON; en Blender y GLB únicamente las ocho campanas tienen alfa 0.65 y el flotador permanece opaco. Resolver transparencia selectiva en el juego requeriría ampliar el formato o separar head, por eso se mantienen exactamente cuatro piezas. El pigmento azulado de las campanas sí llega al JSON. El engrosamiento inferior sobresale 0.085 u tras el extremo nominal, sin cambiar la separación de 0.42 u.

## Revisión propia
Se revisaron los cuatro renders y se corrigieron la suavidad de bráctea/filamentos y su inserción: cadena de luces a distancia; ocho campanas huecas bajo el flotador; bráctea, saco rojizo y dos tentáculos por nodo; cápsula luminosa visible alrededor del tallo. Exportación comprueba presupuesto por pieza, radio del nodo, pivotes y uniones con giro/escala. Todas las copias de revisión carecen de part y no entran en JSON/GLB.

## Sugerencias para integrar
Usar las cuatro geometrías locales sin desplazamientos adicionales. Head se sitúa en el punto inicial, node/lantern en los puntos 0–13 y tail en el punto 14. El nudo de cada nodo cubre el nacimiento del siguiente. Variar giro sobre Y y escala ±10% aplicando exactamente la misma matriz a node y lantern. Agrupar los 14 faroles en 3–7 tramos según las notas. Tentáculos ya tienen curva de reposo; no hay piezas, huesos ni animaciones horneadas para deformarlos individualmente.
