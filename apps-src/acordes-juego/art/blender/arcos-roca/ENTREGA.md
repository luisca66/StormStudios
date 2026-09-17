# ENTREGA — Arcos de roca · Batisfera

## Estado
- Versión v4. v1–v3 de Astra; v4 de Claude (integrador), pedida por Luis tras ver los arcos
  dentro del juego. Fecha: 2026-09-17. Integrada y publicada por Claude.

## Archivos
| Archivo | Contenido |
|---|---|
| modelar-arcos.py | Fuente bpy reproducible; regenera la entrega |
| arcos-roca.blend | Seis mallas editables; variantes separadas 54 u para revisión |
| arcos-roca.glb | Seis mallas, pivotes locales cero, Pigment conectado, extras variant |
| arcos-roca.json | kit.export_parts; variant añadido después de exportar |
| render-juego.png / render-oscuro.png | Comparación a 70 u, FOV vertical 60° |
| render-cerca.png | B a 25 u, tres cuartos inferior |
| render-paso.png | A, cámara a 3 u del passage mirando +X |
| render-perfil.png | Planta ortográfica sin niebla, curva R96 |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-arcos.py
```

## Datos técnicos
- Triángulos: **30152**. A: **14981**; B: **15171**. Tres mallas por variante.
- Dimensiones X × Y × Z de todo el activo local: A **[50.306, 24.709, 30.911] u**; B **[42.297, 30.735, 30.7] u**.
- Origen: cara de pared, media luz, pie inferior y=0. Y arriba; frente −Z.
- JSON: 1968.3 KiB.
- Trasera de pies y cubierta: z=sqrt(96²−x²)−96+6.5; penetración axial 6.5 u (v4: la pared
  del juego tiene relieve de hasta +5 u y podían abrirse rendijas).
- Luz nominal A 34 u / B 26 u; altura de roca A ≈24 / B ≈30.5; alcance A 23.6 / B 23 u.
- Paso central conservador: caja de 12 × 14 × 12 u en cada variante; sin suelo exportado.
- Pies retraídos hacia la curva: la salida lateral discurre por delante de las raíces de roca.

## Partes
| Objeto | part | variant | Triángulos | Pivote Three | Movimiento |
|---|---|---|---|---|---|
| A_rock | rock | A | 4048 | (0,0,0) | Fija; 0 rad; 0 rad/s |
| A_growth | growth | A | 9288 | (0,0,0) | Fija; 0 rad; 0 rad/s |
| A_glow | glow | A | 1645 | (0,0,0) | Fija; 0 rad; 0 rad/s |
| B_rock | rock | B | 4238 | (0,0,0) | Fija; 0 rad; 0 rad/s |
| B_growth | growth | B | 9288 | (0,0,0) | Fija; 0 rad; 0 rad/s |
| B_glow | glow | B | 1645 | (0,0,0) | Fija; 0 rad; 0 rad/s |
Sin segment. Todas fijas. Glow respira por emisión: 1.3 + 0.25·sin(2π·0.055·t + fase),
amplitud 19.23 %, 0.055 ciclos/s; fase A=0, B=1.7 rad. No animar geometría.

## Materiales
| Material | Paleta | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| rock | #0d151d…#293946, sedimento #3a4650 | 0 / .95 | 0 | 1 |
| growth | #8e8a7c, #6a2f2c, #b9ad90 | 0 / .90 | 0 | 1 |
| glow | #b48cff | 0 / .90 | 1.3, #b48cff | 1 |
Blanco multiplicado por Pigment; único material por parte. Colonias en parches superficiales;
usar DoubleSide en glow para visibilidad de ambos lados de la lámina.

## Meta
Claves raíz: variants={"A": {"span": 34, "height": 24, "reach": 23.6, "passage": [0, 9, -11], "clearance": [12, 14, 12]}, "B": {"span": 26, "height": 30.5, "reach": 23, "passage": [0, 11, -11], "clearance": [12, 14, 12]}}, wallRadius=96,
wallCenter=[0,0,-96], forward="-Z". passage está en Three local y sirve como centro de cruce.
clearance es la caja conservadora libre X,Y,Z alrededor del passage.

## Cambios v4 (Claude)
- Estratos con el doble de relieve y pigmento de rango más ancho (#0d151d…#46586a); las caras que
  miran al centro del pozo se aclaran un 30 %: en el juego la roca era una mancha negra.
- Organismos donde el jugador los ve: esponjas de copa en el intradós y en la cara frontal, y
  corales látigo colgando del intradós. Se redujo el crecimiento del lomo, que no se ve desde abajo.
- Espolón de B rehecho como colmillo largo y afilado; derrumbe con bloques mayores y por delante.
- Pies metidos 6.5 u en la pared (antes 3 u).

## Diferencias con el brief
- Presupuesto: hasta 16 500 triángulos por variante en lugar de 14 000 (decisión del integrador
  para escritorio, como en el barco hundido).
- Cámara conjunta a 70 u del objetivo desde el lado del centro del pozo; las dos paredes locales
  se presentan trasladadas junto con las variantes. No representa una colocación conjunta real en el cilindro.
- Niebla volumétrica de revisión 0.002; la niebla exponencial final corresponde al integrador.
- La planta es ortográfica; un rectángulo de 12 × 12 u proyecta el paso libre de 14 u de alto sobre la cubierta.
- kit no serializa variant: el script lo añade al resultado de kit.export_parts sin modificar el kit.

## Sugerencias para integrar
Agrupar por variant antes de instanciar; ambos conjuntos exportados se superponen en origen de forma intencional.
Colocar cada grupo a radio 96 y rotarlo alrededor de Y. La separación ±27 de Blender es solo presentación.
Al espejar X, mantener normales y material de doble cara de colonias. Pared, volumen, guía y luces no se exportan.

## Revisión propia
Cinco vistas Cycles, 32 muestras, denoise, 1600 × 900. Presupuesto y seis partes comprobados por el script.
Revisados los cinco renders finales: A ancho y bajo y B alto se distinguen; glow traza ambos ojos
con interrupciones naturales; la vista de paso muestra salida lateral tras retraer los pies.
Presupuesto, seis partes, pivotes cero, variant, pigmento y emisión exclusiva de glow comprobados.
Pared y lomo penetran 3 u; el volumen central libre se indica en meta y en la guía de planta.
La v4 atiende los tres puntos que Astra dejó abiertos (roca ilegible en penumbra, espolón y
derrumbe poco visibles, crecimiento solo en el lomo). Persisten facetas en los bordes rocosos,
a propósito: la silueta manda y el detalle fino se pierde a 40 u.
