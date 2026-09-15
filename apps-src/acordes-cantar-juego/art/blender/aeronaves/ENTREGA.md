# ENTREGA — Aeronaves por capa · Aerostato

## Estado

- Versión: v4. Estratosférico corregido por Claude (sin tokens de Astra): tomas de aire, tobera, alas con perfil suavizado y variación de tono. Jet ronda 2/2; avioneta y satélite 1/2.
- Fecha: 2026-09-14.
- Lista para revisión de Luis.

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-aeronaves.py` | Fuente bpy reproducible; regenera todos los entregables |
| `aeronaves.blend` | Cuatro colecciones en fila a escala real, cámara y luz de revisión |
| `avioneta/jet/estratosferico/satelite.glb` | Un archivo por modelo, pigmento conectado al material |
| `avioneta/jet/estratosferico/satelite.json` | Un archivo por modelo con kit.export_parts |
| `render-<modelo>-juego.png` y `render-<modelo>-cerca.png` | Ocho vistas a 60 u y 15 u, FOV vertical 60°, 1600×900 |
| `render-conjunto.png` | Cuatro modelos a la misma escala, 2000×900 |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-aeronaves.py
```

## Datos técnicos

Metros, Y arriba, morro +Z en Three / −Y en Blender. JSON y GLB centrados independientemente; body en (0,0,0), en el eje del fuselaje o centro de la caja. La disposición en fila del .blend es solo de revisión, aplicada después de exportar.

| Modelo | Triángulos / límite | Mallas | Largo × alto × ancho (u) | JSON |
|---|---|---|---|---|
| avioneta | 1788 / 2500 | 2 | 4.510 × 2.280 × 7.000 | 109.3 KiB |
| jet | 2254 / 3000 | 1 | 9.000 × 2.990 × 8.500 | 123.1 KiB |
| estratosferico | 1700 / 2000 | 1 | 7.500 × 1.470 × 13.000 | 87.6 KiB |
| satelite | 1316 / 2500 | 4 | 1.636 × 2.370 × 8.500 | 127.0 KiB |

`meta.forward="+Z"`; `meta.size=[ancho,alto,largo]`, valores de la tabla.
`contrailOrigins` Three: jet `[[-1.6,-0.65,-0.15],[1.6,-0.65,-0.15]]`, centros de las salidas posteriores de los motores; estratosférico `[[0,0.03,-3.75]]`, boca de la tobera.

## Partes y animación sugerida

Pivotes en Three relativos al modelo exportado. Todas las rotaciones iniciales de las partes son identidad.

| Modelo / part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|
| Avioneta / body | — | (0,0,0) | Pintura | Z del conjunto | ±0.035 rad | 0.22 ciclos/s | Aplicar balanceo al grupo que contiene body y prop; avance 9 u/s |
| Avioneta / prop | — | (0,-0.04,2.05) | Pintura | +Z local | Giro continuo | 26 rad/s | Buje y dos palas; eje centrado |
| Jet / body | — | (0,0,0) | Pintura | — | 0 | 14 u/s | Rígido |
| Estratosférico / body | — | (0,0,0) | Metal oscuro | — | 0 | 10 u/s | Rígido |
| Satélite / body | — | (0,0,0) | Foil | Emisión | 0.12 a 2 | 0.12 ciclos/s | Avance del grupo 5 u/s |
| Satélite / panel | 0 | (-0.65,0,0) | Solar | X local | ±0.30 rad | 0.04 ciclos/s | Fase 0 |
| Satélite / panel | 1 | (0.65,0,0) | Solar | X local | ±0.30 rad | 0.04 ciclos/s | Fase π |
| Satélite / beacon | — | (0,0.99,0) | Baliza | Emisión | 0 a 3 | 0.8 ciclos/s | Encendida 20% de cada ciclo |

## Materiales

Un material por malla; colores, ventanas, franjas y celdas en Pigment, atributo POINT. Base Color blanco multiplicado por pigmento; alfa 1, sin transparencias. Variación suave de valor en cada superficie.

| Material | Paleta principal | Metal / rugosidad | Emisión |
|---|---|---|---|
| Pintura | crema #f3ead7, ladrillo #b5402e; blanco #f4f4f0, azul #3a5a8c | 0 / 0.60 | 0 |
| Metal oscuro | #30343a | 0.28 / 0.55 | 0 |
| Foil | #c9a227, plato claro | 0.85 / 0.30 | #5a3300 × 0.12 |
| Solar | #24558c con variación azul, rejilla clara | 0.25 / 0.58 | #0a2d66 × 0.5 |
| Baliza | #ff1808 | 0 / 0.50 | #ff1808 × 3 |

## Diferencias con el brief

Ninguna desviación técnica. El estratosférico conserva medidas, origen y contrailOrigins; su tobera queda en el extremo de cola. Plato y antenas comparten el acabado metálico y la emisión del body, conforme al requisito de una sola parte. No hay clips de animación: los pivotes quedan listos para el integrador.

## Revisión propia y sugerencias para integrar

Revisión propia: nueve imágenes inspeccionadas; siluetas reconocibles a 60 u, curvas suaves a 15 u, ala alta continua, ventanas del jet definidas, alas largas y paneles legibles. Dimensiones y presupuestos conformes; ocho partes con pivotes y meta presentes; color de vértice presente en los cuatro GLB. Sin logos ni transparencias. Cycles 32 muestras, denoise, sol cálido y cielo degradado de cada capa. No se añaden estelas ni sombras de suelo.
Las curvas usan perfiles y normales suaves; el foil conserva pequeñas facetas para sugerir arrugas. Hélice simétrica en su plano XY; paneles con pivote en el brazo. El JSON conserva los offsets relativos al pivote: sumar pivot al colocar cada malla. Ventanas y celdas no añaden materiales ni partes. Sin logos, matrículas ni textos.
