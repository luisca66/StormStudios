# ENTREGA — Gran Ballena Celeste · Aerostato

## Estado
- Versión / ronda: v3, ronda de corrección 2/2 (final).
- Fecha: 2026-09-15.
- Lista para: revisión de Luis.

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-ballena-celeste.py` | Generador bpy reproducible, incluye comprobaciones geométricas |
| `ballena-celeste.blend` | Escena editable y cámara de juego |
| `ballena-celeste.glb` | Cuatro mallas glTF, diez primitivas de material y pigmento por vértice |
| `render-juego.png`, `render-cerca.png`, `render-perfil.png`, `render-arnes.png`, `render-cenital.png` | Cinco vistas Cycles, 40 muestras y denoise |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-ballena-celeste.py
```

## Datos técnicos
| Dato | Valor |
|---|---|
| Dimensiones largo × alto total × ancho | 25.072 × 8.405 × 17.000 u |
| Altura del cuerpo sin crestas | 6.96 u aproximadamente |
| Origen | (0, 0, 0), bajo el anillo |
| Frente | +Z Three / −Y Blender |
| Triángulos | 15786 |
| Mallas | 4; varias primitivas de material dentro del cuerpo |
| GLB | 404.0 KiB |
| Punto de amarre | (0, 4.2, 0) Three, propiedad extra `mooringRing_Three` del cuerpo |

Triángulos por objeto: Ballena_Cuerpo_Central: 13106, Aleta_Pectoral_Izq: 696, Aleta_Pectoral_Der: 696, Aleta_Cola: 1288.

## Partes
| Objeto | part | segment | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Ballena_Cuerpo_Central | Ballena_Cuerpo_Central | — | (0.0, 0.0, -0.0) | Varios / pigmento | — | 0 | 0 | Rígido; anillo, 7 crestas y arnés incluidos |
| Aleta_Pectoral_Izq | Aleta_Pectoral_Izq | — | (-2.45, -0.95, 3.8) | Varios / pigmento | Z | ±0.16 rad | 0.10 ciclos/s | En espejo; izquierda fase 0, derecha π |
| Aleta_Pectoral_Der | Aleta_Pectoral_Der | — | (2.45, -0.95, 3.8) | Varios / pigmento | Z | ±0.16 rad | 0.10 ciclos/s | En espejo; izquierda fase 0, derecha π |
| Aleta_Cola | Aleta_Cola | — | (0.0, 0.0, -10.4) | Varios / pigmento | X | ±0.16 rad | 0.12 ciclos/s | Cola, desfase π/2 |

Las rotaciones iniciales son identidad, escalas unitarias. Pectorales y cola son hijas del cuerpo. Los pivotes están dentro de las uniones musculares; las raíces se prolongan dentro de la piel.

## Materiales
| Material | Color | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Piel satinada | #1f3563 → #3a5a94; vientre #d8e4ee | 0 / 0.5 | 0 | 1 | COLOR_0 conectado a Base Color |
| Latón remachado | #c4a05e | 0.85 / 0.3 | 0 | 1 | Anillo, montura y herrajes |
| Cuero | #473932 | 0 / 0.87 | 0 | 1 | Una cincha ajustada |
| Crestas celestes · pulso | Raíz #245e72 → punta #a9ffdf | 0 / 0.32 | #5fe8d0 × 2.5 | 1 | Siete crestas, un material compartido |
| Núcleo nacarado | #c7fff1 | 0 / 0.3 | #c7fff1 × 2.5 | 1 | Nervadura de las crestas |
| Faroles | Rojo babor / verde estribor | 0 / 0.3 | #ff463b / #58ff9c × 2.5 | 1 | Fijos a la cincha, jaula de latón |
| Ojos | #111d2b | 0 / 0.5 | 0 | 1 | Comparten piel; ojos pequeños, sin sonrisa |

## Comprobaciones del generador
- Presupuesto, nombres, dimensiones, rotaciones identidad y centro del anillo mediante aserciones.
- 1092 muestras de raíces a lo largo de ±0.2 rad; profundidad mínima dentro de la piel: 0.2628 u. Pectorales: Y Blender / Z Three; cola: X en ambos.
- Contrato del GLB leído después de exportar: nombres, COLOR_0 en cada primitiva y emisión conservados.
- Cámara de juego a 40 u del origen, FOV vertical 60°; cercana a 15 u de (0, 0, 8) Three. Perfil y cenital ortográficos.
- Renders Cycles 40 muestras, denoise, sol 1.6 y ambiental 0.4. No se exportan luces, cámara ni sombras.

## Diferencias con el brief
Sin JSON, conforme al encargo específico de GLB. El BRIEF.md original se conserva como documento fuente. Las siete crestas comparten material: admiten pulso simultáneo, no individual. Los ojos comparten el acabado satinado de la piel para limitar el GLB a diez primitivas de material. La geometría rígida contiene componentes solapados e integrados visualmente, no es una única superficie soldada.

## Revisión propia
Se revisan los cinco renders: silueta completa de rorcual, garganta con surcos, aletas de espesor real, cola horizontal bilobulada, siete crestas y dorsal menor. Corrección 1: pigmento menos contrastado, aro con sección continua, crestas ajustadas al lomo y encuadres de perfil/arnés más próximos. Las cicatrices y percebes quedan discretos. Corrección 2: nervaduras luminosas ajustadas a las crestas, sin puntas sobresalientes. Los renders se entregan para la valoración artística de Luis.

## Sugerencias para integrar
Buscar por nombre los cuatro nodos, aunque GLTFLoader represente el cuerpo multimaterial como grupo con primitivas hijas. Usar su transformación como pivote; no mover las primitivas por separado. Aleteo Z en espejo, ±0.16 rad a 0.10 ciclos/s; cola X ±0.16 rad a 0.12 ciclos/s. Límite comprobado: ±0.2 rad. Pulso simultáneo del material de crestas y núcleo: intensidad 2.5 ±0.5 a 0.08 ciclos/s. Faroles constantes. La cuerda se conecta al centro local (0,4.2,0). Sin animaciones horneadas.
