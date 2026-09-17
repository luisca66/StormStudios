# ENTREGA — Arcos de roca · Batisfera

## Estado
- Versión v3, segunda y última ronda de corrección visual. Fecha: 2026-09-17.
- Lista para revisión de Luis e integración por el otro modelo.

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
- Triángulos: **27062**. A: **13461**; B: **13601**. Tres mallas por variante.
- Dimensiones X × Y × Z de todo el activo local: A **[49.127, 26.133, 27.088] u**; B **[40.139, 31.818, 26.222] u**.
- Origen: cara de pared, media luz, pie inferior y=0. Y arriba; frente −Z.
- JSON: 1912.0 KiB.
- Trasera de pies y cubierta: z=sqrt(96²−x²)−96+3; penetración axial 3 u.
- Luz nominal A 34 u / B 26 u; altura de roca A ≈24 / B ≈30.5; alcance A 23.6 / B 23 u.
- Paso central conservador: caja de 12 × 14 × 12 u en cada variante; sin suelo exportado.
- Pies retraídos hacia la curva: la salida lateral discurre por delante de las raíces de roca.

## Partes
| Objeto | part | variant | Triángulos | Pivote Three | Movimiento |
|---|---|---|---|---|---|
| A_rock | rock | A | 4048 | (0,0,0) | Fija; 0 rad; 0 rad/s |
| A_growth | growth | A | 7768 | (0,0,0) | Fija; 0 rad; 0 rad/s |
| A_glow | glow | A | 1645 | (0,0,0) | Fija; 0 rad; 0 rad/s |
| B_rock | rock | B | 4188 | (0,0,0) | Fija; 0 rad; 0 rad/s |
| B_growth | growth | B | 7768 | (0,0,0) | Fija; 0 rad; 0 rad/s |
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

## Diferencias con el brief
- Crecimiento concentrado en el lomo; pies sin colonias específicas. Espolón y derrumbe poco legibles en penumbra.
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
El criterio de detalle cercano queda parcialmente resuelto: la penumbra oculta el espolón y parte
del derrumbe, y persisten facetas en los bordes rocosos. El crecimiento se concentra en el lomo,
sin colonias específicas en los pies. No se declara aceptación artística completa de esos puntos.
Se agotaron las dos rondas de corrección permitidas; no se ha realizado integración ni QA del juego.
