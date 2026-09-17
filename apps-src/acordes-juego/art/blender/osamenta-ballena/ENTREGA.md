# ENTREGA — Osamenta de ballena y anémonas-farol · Batisfera

## Estado
Versión v3, segunda y última ronda de corrección. 2026-09-17. Revisión propia completada; lista para revisión de Luis.

## Archivos
| Archivo | Contenido |
|---|---|
| modelar-osamenta.py | Fuente bpy reproducible; regenera todos los entregables |
| osamenta-ballena.blend | 5 partes del hito y 3 anémonas editables; escenografía separada |
| osamenta-ballena.glb | 8 mallas, un material por malla, pigmento y emisión embebida |
| osamenta-ballena.json | kit.export_parts; vertexColor en todas y vertexEmission solo en colonia/anémonas |
| render-juego.png / render-oscuro.png | 65 u, FOV vertical 60°, 1600×900, con/sin faro |
| render-cerca.png | 20 u, tres cuartos ligeramente inferior, 1600×900 |
| render-craneo.png | Cráneo y mandíbulas, 11.5 u, 1200×900 |
| render-anemonas.png | Con faro a la izquierda / solo emisión a la derecha; 6 u, 1600×900 |
| render-perfil.png | Perfil longitudinal a 45 u, curva R96, sin niebla, 1600×900 |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-osamenta.py
```

## Datos técnicos y partes
Osamenta incluida repisa y colonia: **25130 triángulos, 5 mallas**.
Kit completo: **28594 triángulos, 8 mallas**. Esqueleto: **29.940 u de eslora X**.
Dimensiones de la repisa: **[36.0, 3.961, 15.775] u**. Ejes: Y arriba; frente −Z; cráneo −X.
Origen: apoyo posterior del cráneo, superficie nominal y=0; exportación sin separaciones de presentación.
JSON: 1477.9 KiB.

| Objeto / part | Triángulos | Dimensiones X × Y × Z (u) | Pivote Three | Animación geométrica |
|---|---|---|---|---|
| ledge | 1548 | 36.0 × 3.961 × 15.775 | (0, 0, 0) | Fija; 0 rad; 0 rad/s |
| skull | 3600 | 12.109 × 4.461 × 8.789 | (0, 0, 0) | Fija; 0 rad; 0 rad/s |
| spine | 7908 | 17.791 × 5.499 × 6.064 | (0, 0, 0) | Fija; 0 rad; 0 rad/s |
| ribs | 7832 | 12.419 × 4.508 × 8.554 | (0, 0, 0) | Fija; 0 rad; 0 rad/s |
| colony | 4242 | 26.9 × 5.339 × 8.952 | (0, 0, 0) | Fija; 0 rad; 0 rad/s |
| lantern-a | 1180 | 1.749 × 2.198 × 1.749 | (0, 0, 0) | Fija; 0 rad; 0 rad/s |
| lantern-b | 1108 | 1.514 × 3.195 × 1.456 | (0, 0, 0) | Fija; 0 rad; 0 rad/s |
| lantern-c | 1176 | 1.715 × 2.292 × 1.399 | (0, 0, 0) | Fija; 0 rad; 0 rad/s |
Sin segment. Geometría fija. El juego puede modular emisión; no mover la osamenta.

## Materiales
| Material / partes | Color | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| Hueso: skull, spine, ribs | Pigmento #7d7a70–#b9b3a4, manchas oscuras | 0 / .94 | 0 exacto | 1 |
| Roca: ledge | #0d151d–#293946, estratos | 0 / .94 | 0 exacto | 1 |
| Vida: colony y lantern-* | Bacterias pálidas, valvas marfil, Osedax #7a2f3a y tejidos rosa | 0 / .94 | Rosa #ff7fd0, 2.2 × máscara local | 1 |
Pigmento conectado a Base Color en Blender y COLOR_0 en GLB. Atributo reactivado por nombre inmediatamente antes de exportar.
Una sola llamada por malla: no hay parte emisiva adicional ni transparencias.
JSON conserva el convenio del jardín: vertexEmission contiene una terna RGB lineal por vértice (misma longitud que position); multiplicar por emission=2.2. emissionColor blanco. Los ceros son exactos.
El GLB reproduce esa máscara mediante EmissionUV y una rampa embebida. EmissionMask en Blender es escalar.
Almejas y gusanos no emiten; solo parches de bacterias y coronas de anémonas. Los huesos no tienen vertexEmission.

## Meta
Claves en la raíz del JSON:
- wallRadius=96; wallCenter=[0,0,-84]; forward="-Z".
- lanternAnchors=[[-9, 0.08, 3.5], [-6, 0.02, 6], [-2, 0.02, -0.8], [1.5, 0.01, 7], [4.8, 0.03, -0.8], [7, 0.02, 7.4], [10.8, 0.02, 1], [14, 0.03, 4.7], [16, 0.04, 1.6], [-1.1, 4.2, 3.2]]. Diez posiciones Three para instancias; las copias de revisión no se exportan.
- lanterns={"lantern-a": {"height": 2.198, "glowCenter": [0.7231, 2.1437, 0.1457]}, "lantern-b": {"height": 3.195, "glowCenter": [0.0701, 3.145, 0.6036]}, "lantern-c": {"height": 2.292, "glowCenter": [0.0064, 1.6469, 0.1952]}}. glowCenter local sirve para un destello.
- ribGaps=[[3.88, 2.0, 1.3], [7.52, 2.0, 1.4], [11.2, 1.5, 2.0]]. Tres centros de pasos entre costillas, sin volumen de colisión garantizado.
Trasera de repisa: z=sqrt(96²−x²)−84+1.2; penetración radial aproximada 1.2 u.

## Diferencias con el brief
- vertexEmission usa RGB como el jardín integrado, una terna por vértice en vez de un escalar; el atributo Blender sí es escalar.
- El volumen de revisión usa absorción Cycles .006, sin dispersión del faro para evitar un velo blanco; la niebla exponencial .022–.028 corresponde al integrador.
- Cámara de descubrimiento a 65 u del objetivo desde el lado del centro del pozo; no está sobre el eje exacto local z=−84.

## Sugerencias para integrar
Instanciar anémonas desde sus pivotes cero usando lanternAnchors; no importar copias de revisión, pared, volumen, cámara o faro.
Pulso suave de coronas: multiplicador 1 + 0.12 sin(2π·0.055·t + fase), ±12 %, .055 ciclos/s, fase distinta por instancia.
Colonia: multiplicador 1 + 0.06 sin(2π·0.025·t), ±6 %, .025 ciclos/s. Mantener todos los ceros; no iluminar el hueso por emisión.
No animar traslación, rotación o escala de la osamenta (0 rad, 0 rad/s).

## Revisión propia
Se miraron los seis renders finales; Cycles, 32 muestras, denoise y las resoluciones pedidas. Dos rondas de corrección agotadas.
- Medidas y pared: conformes. Hito completo X × Y × Z = 36.000 × 9.465 × 15.775 u; cota superior del hueso 5.489 u sobre y=0. La repisa penetra 1.2 u en la curva.
- Presupuesto: conformes las 5 mallas del hito y cada una de las 3 anémonas; comprobado por kit.export_parts y aserciones del generador.
- Anatomía y silueta: cráneo largo sin dientes, dos mandíbulas desarticuladas, 24 vértebras articuladas más 3 centros rodados, 19 costillas (2 truncadas) y 3 fragmentos caídos. Se distinguen cabeza, columna y caja abierta a 65 u con faro.
- Oscuridad: quedan coronas rosa separadas y pequeñas esteras; el hueso desaparece casi por completo al retirar el faro, salvo reflejos locales de la colonia.
- Volumen: maxilares, arcos orbitarios, cresta, procesos vertebrales y costillas ovales con curvas continuas. No se usaron toros cerrados como costillas ni cajas como cráneo.
- Cerca: las formas principales son suaves. Persisten pequeños quiebres de silueta en algunos tentáculos, especialmente lantern-c; el requisito de ausencia total de facetas no se considera plenamente cumplido. No se hizo una tercera ronda.
- Pigmento: variación por vértice en todas las partes; la erosión del hueso es sutil bajo el faro frío. Almejas y Osedax se reservan para las vistas próximas.
- Emisión: hueso y roca con emisión 0 y sin vertexEmission. Colonia y anémonas con máscara local y ceros exactos; sin emisión añadida al hueso para facilitar la vista distante.
- Exportación: las 8 mallas del GLB contienen COLOR_0 y una primitiva cada una; las 8 del JSON tienen vertexColor alineado con position. Todos los pivotes exportados son (0,0,0).
- Meta: 10 anclajes, 3 variantes con altura y glowCenter, 3 ribGaps y datos de pared completos. Las copias de anémonas de los renders pertenecen solo a la revisión.
- Reproducibilidad: ejecución completa con bpy-run.ps1 de Luis; todos los archivos se generan junto al script. Sin archivos temporales en la entrega.

Límite artístico pendiente de aprobación: las anémonas conservan un acabado algo facetado en las puntas; la osamenta es una interpretación estilizada, con la superficie picada representada de forma discreta mediante irregularidad y pigmento.
