# ENTREGA — La guitarra gigante · Resonancia

## Estado

- Versión / ronda: **v1, ronda 1 preparada**.
- Fecha: 2026-10-17.
- **Lista para: ejecución de Claude**.
- Script completo; no se ha importado bpy, abierto Blender ni generado renders en este entorno, según la instrucción del encargo. Revisión visual propia pendiente de recibir los dos renders. Los recuentos siguientes se calculan a partir de la topología escrita, no de una ejecución de Blender.

## Dirección artística

Una guitarra de taller cálida, de cedro miel y aros oscuros, con una silueta continua de cintura estrecha. El laberinto descansa sobre ébano con veta longitudinal. Los trastes son redondos y de latón, los marcadores son rombos de nácar y los muros recuerdan varetas con hombros biselados, doble filete y marquetería verde petróleo. La boca está abierta y tiene profundidad real; alrededor, cuatro filas de mosaico y bandas concéntricas. Puente de alas, selleta de hueso, clavijero calado con seis mecanismos y seis cuerdas completas.

## Archivos

Ahora se entregan `modelar-mundo-guitarra.py` y este documento. El script genera en esta misma carpeta:

| Archivo | Contenido |
|---|---|
| `mundo-guitarra.blend` | Escena editable con prototipos ocultos y exposición mediante copias enlazadas |
| `mundo-guitarra.glb` | GLB portable de los prototipos, materiales conectados a `Pigment` |
| `mundo-guitarra.json` | Contrato de partes, pivotes, pigmento y AO horneada |
| `mundo-guitarra-juego.glb` | Conversión compartida del mismo JSON |
| `render-juego.png` | Vista elevada, laberinto de muestra y portal; 1600 × 900 |
| `render-cerca.png` | Portal, boca y transición de ébano a cedro; 1600 × 900 |

Desde la carpeta de este modelo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-mundo-guitarra.py
```

El script imprime los recuentos reales y comprueba presupuestos antes de exportar. Si falta Node o falla `json-to-glb`, conserva el JSON con AO y añade la incidencia aquí. No instala paquetes. No produce logs ni archivos auxiliares propios.

## Datos técnicos

| Dato | Valor previsto; pendiente de ejecución |
|---|---|
| Ejes / escala | Three, Y arriba; 1 u = 1 m |
| Mundo, largo × alto × ancho | Aproximadamente 204 × 6,55 × 63 m; z −104…100, y −5,3…1,25 |
| Diapasón | 36,8 × 130 m; x ±18,4; z −56…74; cara caminable Y=0 |
| Origen `world` | (0, 0, 0), todas las mallas |
| Cuerdas | X = −15, −9, −3, 3, 9, 15; Y=0,97 en el tramo principal; puente Z=−91, cejuela Z=74 |
| Total de prototipos | **37.412 triángulos**, 15 mallas |
| Mundo / límite | **29.914 / 60.000** |
| Portal completo / límite | **6.814 / 15.000** |
| Pesos del JSON / GLB | Pendientes de ejecución |
| AO | distance=1,5; strength=0,7, horneada por grupos de uso real |
| Texturas externas | Ninguna: pigmentos por vértice, materiales Principled |

## Partes, pivotes y animaciones

Los valores son en espacio Three. Los prototipos se exportan antes de colocar copias para los renders. Una parte sin `segment` es una malla única.

| Objeto / `part` | `segment` | Triángulos previstos | Pivote | Animación sugerida |
|---|---|---:|---|---|
| `world`, ébano y puente | 0 | 12.532 | (0,0,0) | Estático; amplitud 0, velocidad 0 |
| `world`, tapa de cedro | 1 | 8.064 | (0,0,0) | Estático; amplitud 0, velocidad 0 |
| `world`, aros, mástil y clavijero | 2 | 1.608 | (0,0,0) | Estático; amplitud 0, velocidad 0 |
| `world`, nácar y cenefas | 3 | 4.020 | (0,0,0) | Estático; amplitud 0, velocidad 0 |
| `world`, latón y bordones | 4 | 2.520 | (0,0,0) | Estático; amplitud 0, velocidad 0 |
| `world`, primas y mecanismos | 5 | 624 | (0,0,0) | Estático; amplitud 0, velocidad 0 |
| `world`, cavidad | 6 | 546 | (0,0,0) | Estático; amplitud 0, velocidad 0 |
| `wall_x` | — | **252** | (0,0,0) | Estático; longitud X=5,0, altura 1,2, espesor 0,34 |
| `wall_z` | — | **252** | (0,0,0) | Estático; longitud Z=5,7, altura 1,2, espesor 0,34 |
| `post` | — | **180** | (0,0,0) | Estático; envolvente 0,504 × 1,35 × 0,504 |
| `portal_frame` | — | **3.696** | X=0 / Y=2,3 / Z=0 | Estático; cara +Z, hueco fijo de radio 2,2 |
| `portal_ring` | 0 | **912** | X=0 / Y=2,3 / Z=0 | Eje Z; giro continuo 2π; 0,035 rad/s cerrado, +0,36 rad/s abierto |
| `portal_ring` | 1 | **912** | X=0 / Y=2,3 / Z=0 | Eje Z; giro continuo 2π; 0,035 rad/s cerrado, −0,52 rad/s abierto |
| `portal_ring` | 2 | **912** | X=0 / Y=2,3 / Z=0 | Eje Z; giro continuo 2π; 0,035 rad/s cerrado, +0,68 rad/s abierto |
| `portal_core` | — | **382** | X=0 / Y=2,3 / Z=0 | Oculto cerrado; abrir escala uniforme 0,01→1 en 0,7 s; latido ±4 % a 0,8 Hz; emisión 2,4→3,0 |

Las coordenadas con coma decimal se expresan también por componentes para evitar confundir Y=2,3 con una cuarta coordenada. Los JSON usan decimales con punto.

## Materiales

| Acabado | Pigmentos principales | Metal / rugosidad | Emisión |
|---|---|---|---|
| Ébano | `24201e`, `181514`, puente `30211b` | 0,02 / 0,36 | 0 |
| Cedro | `be7a43`, variación longitudinal | 0 / 0,30 | 0 |
| Aros y mástil | `60321f`, `714027`, `95552f` | 0 / 0,34 | 0 |
| Nácar y mosaico | `e5e3cf`, `e3cf9b`, `653929`, `335b58`, `201e1a` | 0,12 / 0,24 | 0 |
| Latón y bordones | `cbb273`, `af8947`, `cbb482` | 0,78 / 0,25 | 0 |
| Primas y mecanismos | `d6e2dc`, `b6c8c2` | 0,62 / 0,20 | 0 |
| Cavidad | `21150e`, `160f0a` | 0 / 0,89 | 0 |
| Muros, poste y marco | `895237`, `d4b471`, `dacda1`, `365e56` | 0,12 / 0,39 | 0 |
| Aros móviles | `79b8ad`, `dcc89a`, `be7c68` | 0,35 / 0,25 | 0,24; color `66c4bd` |
| Núcleo | `69bcb1` | 0,10 / 0,30 | 2,4; color `73d9d0` |

Todos los materiales son opacos. El núcleo es una lente sólida de poca profundidad, con reverso, para evitar problemas de transparencia. En muros y marco, el filete color latón comparte el acabado satinado de madera; es una decisión para mantener una sola malla y un solo material por instancia. El latón del mundo sí tiene acabado metálico separado.

## Puntos y datos en `meta`

| Clave | Valor / uso |
|---|---|
| `floorY` | 0 |
| `mazeBounds` | min [−17,5, 0, −50], max [17,5, 0, 52,6] |
| `stringX`, `stringY` | Seis posiciones de cuerda y altura 0,97 |
| `portalPlacement` | [0, 2.3, −54], centro recomendado del portal colocado |
| `portalPivot` | [0, 2.3, 0], centro del prototipo exportado |
| `portalOpeningRadius` | 2,2 |
| `soundholeCenter` | [0, −0.65, −68] |
| `bridgeCenter` | [0, 0.98, −90.7] |
| `nutCenter` | [0, 0.5, 73.8] |
| `triangleCounts` | Recuento por `part` calculado durante la ejecución |

## Diferencias con el brief y decisiones autónomas

1. La caja se convierte en una silueta clásica continua de dos lóbulos y cintura de unos 19 m, dentro de la referencia de radio 31 m. Se elimina la intersección visible de los tres cilindros actuales. La boca real se centra en Z=−68 y el puente en Z=−91.
2. La tapa queda en Y=−0,65, por debajo del diapasón. Los trastes suben solo hasta Y≈0,16: la cara caminable respeta Y=0. Esto sigue el contrato del brief y difiere de la altura de las primitivas actuales.
3. Se propone portal en Z=−54, sobre el extremo del diapasón. El centro queda en Y=2,3 y mira a +Z, como pide el brief; no se usa el portal flotante actual en [0,6.8,−70]. Los aros móviles se colocan sobre el marco, dejando libre el hueco fijo de radio 2,2.
4. Marcadores de nácar en rombo en lugar de puntos circulares; marcador doble en la posición 12 y pequeñas marcas laterales. El clavijero es abierto, de hueso y metal, con cuerdas que convergen a los rodillos.
5. Muros de una malla por prototipo y un material, con marquetería y filetes definidos por pigmentos. Su latón tiene respuesta satinada compartida con la madera. No se agregan partes fuera del contrato ni geometría costosa a las instancias.
6. AO con los parámetros solicitados, horneada mediante `kit.bake_ao` por grupo: las siete mallas del mundo juntas y cada prototipo aislado. Después `kit.export_glb(..., ao=None)` convierte las copias ya horneadas. Así se evitan sombras falsas entre prototipos superpuestos en el origen, conservando sus pivotes. No hay segundo horneado.
7. Núcleo opaco con emisión en vez de disco transparente; se oculta al cerrar. La exposición del `.blend` muestra el portal abierto. El laberinto ilustrativo usa la cuadrícula real, pero no representa una partida ni una solución generada.
8. Los `.blend`, GLB, JSON y renders quedan pendientes de la ejecución externa indicada expresamente por Luis. No hay aprobación visual implícita en esta v1.

## Sugerencias para integrar y revisar

Instanciar los dos muros y el poste desde el pivote de base; no usar las copias de la colección «Exposición». Si el cargador devuelve vértices relativos al pivote, colocar las piezas del portal con el centro [0,2.3,−54]. Si conserva las coordenadas de origen exportadas, aplicar únicamente desplazamiento Z=−54; no sumar 2,3 otra vez. El mundo mantiene su origen cero. Los segmentos del mundo permiten materiales separados; no son índices de animación.

El código actual sitúa muros y robot respecto a un piso más alto y usa otro portal: el integrador deberá alinear su colocación con Y=0. No se ha tocado `src/` ni la lógica. Las cuerdas siguen siendo decorado atravesable. Están unidas a sus grupos de acabado por contrato; para reaccionar a notas, usar emisión del grupo con prudencia porque también afecta trastes o mecánica.

Al reanudar: mirar ambos renders, comprobar continuidad de caja y veta, reflejos de cuerdas, lectura de marquetería a distancia y claridad del portal. Verificar presupuesto impreso, orientación Y arriba y pivotes en el inspector. Máximo dos rondas de corrección; esta v1 no se ha renderizado aún.
