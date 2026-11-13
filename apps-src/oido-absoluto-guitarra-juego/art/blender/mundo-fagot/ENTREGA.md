# ENTREGA — Dentro del fagot · Resonancia

## Estado

- Versión / ronda: **v1, preparación para ronda 1**.
- Fecha: 2026-10-17.
- **Lista para: ejecución de Claude**.
- Script completo; auditoría de geometría ejecutada con Python estándar (`--audit`). No se ha importado bpy, abierto Blender ni intentado renderizar en este sandbox.
- **Revisión visual pendiente**: Claude ejecuta en la PC de Luis y devuelve `render-juego.png` y `render-cerca.png` a Astra. Esta v1 no afirma aprobación visual ni existencia de exportaciones.

## Archivos

| Archivo | Estado / contenido |
|---|---|
| `modelar-mundo-fagot.py` | Entregado; genera geometría, materiales, exportaciones, escena editable y dos renders |
| `ENTREGA.md` | Entregado; esta v1 |
| `mundo-fagot.blend` | Pendiente de ejecución; colección canónica y presentación separadas |
| `mundo-fagot.glb` | Pendiente; kit canónico para visor, materiales conectados a `Pigment` |
| `mundo-fagot-juego.glb` | Pendiente; exportación compartida con AO |
| `mundo-fagot.json` | Pendiente; mismo contrato de partes y pigmento con AO |
| `render-juego.png` | Pendiente; vista elevada 1600 × 900 con un fragmento de laberinto y portal |
| `render-cerca.png` | Pendiente; detalle del arce y las llaves, 1600 × 900 |

Ejecutar desde esta carpeta en la PC de Luis:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-mundo-fagot.py
```

Auditoría sin Blender, sin importar bpy y sin escribir archivos:

```powershell
python modelar-mundo-fagot.py --audit
```

Si falta Node o falla el convertidor compartido, el script conserva el JSON con AO mediante `kit.export_parts` e imprime `PENDIENTE GLB de juego`. Claude debe consignar ese resultado aquí antes de devolver la ejecución. No se instala nada automáticamente. Otros errores detienen la ejecución.

## Dirección artística

Un suelo continuo y legible de arce conduce entre siete tubos gigantes doblados en U. Las virolas y varillas sostienen cazoletas de níquel con zapatillas de cuero: son las hojas del bosque, no follaje vegetal. Un puente de mecanismo cruza muy alto; el tudel curvo y dos palas separadas de caña quedan al fondo. El pabellón de 49.3 m aparece como una torre hueca, con retorno interior oscuro y cuatro llaves grandes. La luz es de taller cálido, con reflejos fríos suaves para distinguir el níquel.

El decorado de suelo permanece plano en y = 0; las masas del bosque quedan fuera del rectángulo jugable. No se copia ni modifica el robot ya existente. El pequeño laberinto de presentación muestra la escala de los mecanismos.

## Datos técnicos

Los conteos son **exactos para las caras generadas**, verificados sin Blender; el script vuelve a compararlos con `loop_triangles` antes de exportar. No hay subdivisión, biseles ni modificadores que inflen el presupuesto.

| Dato | Valor |
|---|---|
| Ejes / escala | Three: Y arriba, 1 u = 1 m; conversión mediante `kit.make` / `kit.B` |
| Mundo: límites X / Y / Z | [−57, 46.65] / [−2.1, 49.3] / [−101.3, 64] m |
| Mundo: largo Z × alto Y × ancho X | 165.3 × 51.4 × 103.65 m |
| Piso | x [−22, 22], z [−82, 64], superficie y = 0; cubre laberinto y acceso al portal |
| Origen del mundo | (0, 0, 0) |
| Muros | `wall_x`: 5 × 1.2 × 0.34; `wall_z`: 0.34 × 1.2 × 5.7 m; pivote centro de base |
| Poste | 0.5 × 1.35 × 0.5 m; pivote centro de base |
| Portal | Frente +Z; apertura de marco r = 2.2 m; pivotes locales (0, 0, 0) |
| Triángulos totales del kit | **57 752** |
| Mallas exportadas | **15**; mundo 7, muros/poste 3, marco 2, aros 2, núcleo 1 |
| Peso JSON / GLB | Pendiente de ejecución; el script imprime los KiB del GLB |
| AO | distance = 1.5, strength = 0.7; grupos de horneado aislados: mundo, cada prototipo y portal completo |

### Triángulos por parte

| `part` | Triángulos | Límite |
|---|---:|---:|
| `world` (7 materiales / segmentos) | **50 752** | 60 000 |
| `wall_x` | **396** | 1 500 |
| `wall_z` | **396** | 1 500 |
| `post` | **132** | 1 500 |
| `portal_frame` (arce y níquel) | **3 128** | Compartido portal |
| `portal_ring` segmento 0 | **1 156** | Compartido portal |
| `portal_ring` segmento 1 | **1 156** | Compartido portal |
| `portal_core` | **636** | Compartido portal |
| Portal completo | **6 076** | 15 000 |

### Partes, pivotes y animación sugerida

| `part` | `segment` | Pivote Three | Material | Eje / amplitud | Velocidad |
|---|---|---|---|---|---|
| `world` | 0…6 | (0, 0, 0) | Piso, arce, níquel, cuero, interior, caña, hilo | Estático | 0 |
| `wall_x` | — | (0, 0, 0), centro base | Compuesto con pigmentos | Estático; longitud X 5 m | 0 |
| `wall_z` | — | (0, 0, 0), centro base | Compuesto con pigmentos | Estático; longitud Z 5.7 m | 0 |
| `post` | — | (0, 0, 0), centro base | Compuesto con pigmentos | Estático | 0 |
| `portal_frame` | — (2 mallas) | (0, 0, 0), centro hueco | Arce / níquel separados | Estático | 0 |
| `portal_ring` | 0 | (0, 0, 0), centro hueco | Níquel ámbar luminoso | Z, giro continuo 2π | Cerrado 0.035 rad/s; abierto 0.36 rad/s |
| `portal_ring` | 1 | (0, 0, 0), centro hueco | Níquel ámbar luminoso | Z, giro continuo 2π | Cerrado 0.035 rad/s; abierto 0.52 rad/s |
| `portal_core` | — | (0, 0, 0), centro hueco | Luz ámbar opaca | Escala uniforme 1 ± 0.035 al abrir | 0.8 ciclos/s; emisión sugerida 1.4 ± 0.2 |

Los pequeños botones de cada aro hacen visible el giro. No hay animaciones horneadas; el juego controla las partes. Ocultar núcleo al cerrar; crecer de escala 0.01 a 1 al abrir. No sumar dos pulsos de escala si el juego ya controla la transición.

### Puntos y convenciones en `meta`

- `portalPlacement = [0, 2.3, -70]`: posición sugerida del grupo del portal, **sin sumar de nuevo 2.3 a sus mallas**.
- `portalPivotConvention`: las coordenadas del portal son locales a su hueco; pivote en cero.
- `portalClearRadius = 2.2`: radio del marco; los aros móviles decorativos están dentro, r = 2.09 y 1.92.
- `towerTop = [8, 49.3, -95]`: referencia de la cima del pabellón.
- `bocalEnd = [-18, 44, -87]`: unión del tudel con la caña; no es la punta final de las palas.
- `mazeBounds`: x [−17.5, 17.5], z [−50, 52.6], `floorY = 0`.
- `worldOrigin`, `units`, `forward`, `triangleCounts`: descripción del kit y sus presupuestos.

## Materiales

Todos usan pigmento por vértice, sin imágenes ni dependencias de texturas. Los hex indican los extremos del pigmento; el color base numérico del material es blanco para evitar multiplicar el color dos veces.

| Material | Pigmento sRGB | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| Arce barnizado | #6f3019 → #ac6130 | 0 / 0.28 | 0 | 1 |
| Piso de arce | #92502c → #c38a50 | 0 / 0.48 | 0 | 1 |
| Níquel | #87979c → #e3e5df | 0.82 / 0.23 | 0 | 1 |
| Cuero | #67402b → #c69b66 | 0 / 0.78 | 0 | 1 |
| Interior del pabellón | #160d0a → #382014 | 0 / 0.72 | 0 | 1 |
| Caña | #b68a42 → #edcf87 | 0 / 0.52 | 0 | 1 |
| Ataduras | #784c25 → #b27e35 | 0.15 / 0.56 | 0 | 1 |
| Compuesto instanciable | Arce, níquel y cuero por vértice | 0.12 / 0.34 | 0 | 1 |
| Aros | #c5a464 → #ffe6ac | 0.45 / 0.25 | 0.3, #ffcf83 | 1 |
| Núcleo | #e9ac58 → #fff1c2 | 0.05 / 0.32 | 1.4, #ffcf83 | 1 |

## Diferencias y decisiones respecto del brief

1. **Ejecución aplazada por instrucción expresa**: solo se entregan fuente y esta v1. `.blend`, GLB, JSON y renders los genera Claude en la PC de Luis; la inspección visual viene después.
2. **Portal guardado centrado en cero**: el brief describe el hueco a y = 2.3 del suelo. La fuente guarda sus piezas alrededor de (0, 0, 0) y aplica [0, 2.3, −70] en la presentación, para conservar el pivote de giro y encajar con el cargador actual, que coloca el grupo. No exporta el portal ya desplazado al fondo del mundo.
3. **Un solo acabado físico en cada muro/poste**, con colores de arce, níquel y cuero: el instanciador actual toma una malla por `part`. Se priorizan 396/396/132 triángulos y una sola llamada de dibujo por familia. El metal de esos prototipos tiene brillo aproximado; el níquel del mundo y del marco sí conserva su material metálico independiente.
4. **Núcleo opaco y de volumen muy somero**, en lugar de transparencia: evita problemas de orden de dibujo. Desaparece al cerrar y luce ámbar al abrir. El brief no fijaba transparencia.
5. Escala de cuento deliberada: el pabellón es una torre y las cazoletas son hojas; no se presenta como una reconstrucción anatómica a escala del interior real del fagot.

## Sugerencias para integrar y revisar

- El juego actual añade `FLOOR_Y = 0.6` al mundo y los muros. Mantener ese desplazamiento común si se usa el cargador existente; el modelo conserva su piso local en cero, como pide el contrato.
- El cargador actual escala el portal por 2.2 y sitúa su centro a `0.6 + 2.3 × 2.2`; ya asume las piezas centradas en el hueco. `portalPlacement` describe la composición artística a escala 1, no una segunda transformación automática que deba sumarse.
- Las copias `VISTA__…` carecen de `part`; nunca se incluyen en las exportaciones. El GLB portable es el kit canónico. La composición con laberinto se conserva en `.blend` y en los renders.
- El horneado AO usa el kit compartido y separa prototipos durante el horneado para que los muros cruzados en el origen no se manchen entre sí. No altera `kit.py` en disco.
- Revisar tras ejecución: lectura del pabellón y la caña desde la vista elevada, brillo del níquel, suavidad de curvas en el detalle, escala de las llaves, piso claro y ausencia de decorado a ras de suelo dentro del laberinto. Comprobar que el primer plano no oculte la meta.
- No se modificó código del juego ni se integró el nuevo entorno. No se ejecutó git, npm ni Blender.

## Lecciones / revisión posterior

Pendiente de los dos renders y de la inspección propia de Astra. Máximo dos rondas de corrección según las instrucciones del proyecto.
