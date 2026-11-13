# ENTREGA — Dentro del piano de cola · Resonancia

## Estado

- Versión / ronda: **v1, preparación de ronda 1**.
- Fecha: 2026-10-17.
- **Lista para: ejecución de Claude**.
- Fuente completa y sintaxis Python comprobada con `ast.parse`, sin importar `bpy`.
- Blender no se ha cargado ni ejecutado. No existen todavía renders revisados ni exportaciones verificadas. Astra debe revisar los dos renders cuando Claude la reanude; esta entrega no declara aprobación visual.

## Dirección artística

Una nave cálida de abeto y nogal: el laberinto ocupa una pasarela clara, prácticamente a ras de la tabla armónica, dentro de un piano de cola asimétrico. A ambos lados hay tres órdenes de cuerdas por grupo, clavijas monumentales, puentes dorados y apagadores de fieltro salvia. Una fila de martillos crema con cintas carmín recibe al robot. La tapa abierta tiene casetones y filetes dorados, como una bóveda de madera. Las rosetas de luz y la puerta con corona de diapasón añaden magia sin texturas ni partículas.

Las superficies transitables son continuas: no hay cuerdas, vigas ni elementos del decorado atravesando el rectángulo jugable a la altura del robot. El modelo existente del robot se importa solo en la presentación, desde `../robot/robot.glb`, sin volver a modelarlo.

## Archivos

| Archivo | Estado / contenido |
|---|---|
| `modelar-mundo-piano.py` | Entregado; fuente reproducible, rutas desde `__file__` |
| `ENTREGA.md` | Entregado; v1 para ejecución |
| `mundo-piano.blend` | Pendiente de ejecución; escena editable con muestras y cámaras |
| `mundo-piano.glb` | Pendiente; biblioteca portable con pigmento conectado al material |
| `mundo-piano-juego.glb` | Pendiente; biblioteca para juego, exportada mediante el kit y con AO |
| `mundo-piano.json` | Pendiente; datos por parte, pivotes, pigmento y metadatos |
| `render-juego.png` | Pendiente; 1600 × 900, vista elevada con muestras de laberinto y portal al fondo |
| `render-cerca.png` | Pendiente; 1600 × 900, detalle de martillos, clavijas y cuerdas |

Desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-mundo-piano.py
```

El script valida los prototipos y exporta ambos GLB antes de colocar las muestras. Luego guarda la escena y genera los dos renders. Añade a este documento los recuentos medidos, las dimensiones reales, los tamaños de archivo y cualquier fallo del conversor. El importador del robot es opcional: si falla, registra el motivo y sigue con el mundo. No instala dependencias.

## Datos técnicos previstos

Los números siguientes proceden de contar las caras generadas (`n − 2` por polígono). **No son mediciones de una ejecución de Blender.** El script contrasta el recuento contra `calc_loop_triangles()` y comprueba los presupuestos antes de exportar.

| Dato | Valor |
|---|---|
| Ejes / unidades | Three: Y arriba; 1 unidad = 1 m |
| Mundo, origen | `(0, 0, 0)` en las cinco mallas |
| Envolvente aproximada del decorado | X: −48…59; Y: −3…48; Z: −103…81 m; límites exactos tras ejecutar |
| Zona jugable | X: −17.5…17.5; Z: −50…52.6; superficie Y = 0 |
| Muros | X: `5 × 1.2 × 0.34`; Z: `0.34 × 1.2 × 5.7` m |
| Poste | `0.5 × 1.35 × 0.5` m |
| Portal | Frente +Z; centro `(0, 2.3, 0)`; luz del marco ~2.2 m de radio |
| Mundo | **23.352 triángulos**, límite 60.000 |
| Portal completo | **6.800 triángulos**, límite 15.000 |
| Total de biblioteca | **32.640 triángulos**, 12 mallas; sin las copias de presentación ni el robot |
| AO | `distance=1.5`, `strength=0.7`, mediante `kit.export_glb` |
| Peso JSON / GLB | Pendiente de ejecución |

## Partes, pivotes y animación

Todos los valores son de espacio Three. Los objetos `world` se consumen juntos, conservando sus segmentos. Las muestras de muros se crean después de exportar, con datos de malla compartidos y sin propiedad `part`.

| Objeto | `part` | `segment` | Tris previstos | Pivote | Animación sugerida |
|---|---|---:|---:|---|---|
| Tabla y tapa | `world` | 0 | 4.704 | `(0,0,0)` | Estático |
| Arpa y molduras | `world` | 1 | 9.476 | `(0,0,0)` | Estático |
| Cuerdas y clavijas | `world` | 2 | 3.432 | `(0,0,0)` | Estático |
| Fieltros | `world` | 3 | 5.460 | `(0,0,0)` | Estático |
| Rosetas luminosas | `world` | 4 | 280 | `(0,0,0)` | Estático |
| Apagadores X | `wall_x` | — | 1.140 | `(0,0,0)`, centro de base | Estático; se instancia |
| Apagadores Z | `wall_z` | — | 1.140 | `(0,0,0)`, centro de base | Estático; se instancia |
| Clavija de unión | `post` | — | 208 | `(0,0,0)`, centro de base | Estático; se instancia |
| Puerta del diapasón | `portal_frame` | — | 3.056 | `(0,2.3,0)` | Estático |
| Aro de afinación 0 | `portal_ring` | 0 | 1.680 | `(0,2.3,0)` | Eje Z local; vuelta completa 2π; +0.18 rad/s |
| Aro de afinación 1 | `portal_ring` | 1 | 1.680 | `(0,2.3,0)` | Eje Z local; vuelta completa 2π; −0.12 rad/s |
| Corazón de resonancia | `portal_core` | — | 384 | `(0,2.3,0)` | Escala uniforme `1 + 0.035·sin(2π·0.7·t)`; ±3.5%, 0.7 ciclos/s |

En movimiento reducido: detener aros y mantener escala del núcleo en 1. El núcleo es una lente opaca luminosa; ocultarlo hasta desbloquear la puerta. Al abrir, subir escala de 0.01 a 1 en unos 0.6 s y después aplicar el pulso. Su material tiene emisión 1.6; puede oscilar entre 1.3 y 1.9 con el mismo periodo del pulso.

## Materiales

Todos usan `Pigment` por vértice conectado al color base, color base numérico blanco, alfa 1 y una sola ranura de material por malla. Los colores listados son sRGB de autoría; el kit recibe sus valores lineales. No hay transparencias ni texturas externas.

| Material | Paleta principal (hex) | Metal / rugosidad | Emisión |
|---|---|---|---|
| Abeto y nogal barnizado | `edca8d`, `d9aa69`, `693420` | 0 / 0.46 | 0 |
| Hierro dorado y latón | `d6a04c`, `e2b55c`, `ffe1a0` | 0.68 / 0.31 | 0 |
| Acero de cuerdas | `eee0b4`, `e3b66e`, `a1a6a3` | 0.72 / 0.28 | 0 |
| Fieltros | `f5dfb8`, `9d3646`, `56705a` | 0 / 0.91 | 0 |
| Apagador, material único | `825037`, `a83e4d`, `f1d6a6` | 0.08 / 0.62 | 0 |
| Marcas y rosetas | `ffe4a2`, `8eb8a9`, `fff0c1` | 0.25 / 0.36 | 0.55, `ffce76` |
| Resonancia abierta | `a7e3ca` | 0.05 / 0.42 | 1.6, `a7e3ca` |

## Puntos y datos de `meta`

- `portalCenter = [0,2.3,0]`: pivote contractual de las cuatro mallas del portal.
- `portalRadius = 2.2`: radio nominal del hueco del marco.
- `portalSuggestedPosition = [0,0,-58]`: traslación sugerida del conjunto; el centro final queda `[0,2.3,-58]`.
- `robotSuggestedPosition = [0,0,43]`: base sugerida para la presentación, no cambia el rig del juego.
- `floorY = 0` y `mazeBounds`: límites transitables del brief.
- `worldSegments`: mapa 0 madera, 1 dorado, 2 acero, 3 fieltro, 4 luz.
- `animation`: velocidades de aros y amplitud/frecuencia del núcleo indicadas arriba.
- `forward = "+Z"`: frente del portal. No es una orden para girar el decorado fijo.

## Diferencias y decisiones respecto al brief

1. **Entregables visuales aplazados por instrucción explícita del encargo:** esta v1 contiene únicamente el script y este documento. Claude ejecuta en la PC de Luis; Astra revisa después los renders. No se intentó cargar Blender en el sandbox.
2. **Distribución de cuerdas:** van a los lados de la pasarela del laberinto, sobre la misma tabla armónica. La superficie central permanece despejada en Y=0 para que el robot camine y las paredes se lean bien. La tabla lateral queda 3 cm más abajo para evitar caras coplanares. No se usa una rejilla transparente que permita ver cuerdas bajo sus pies.
3. **Muros de apagadores:** ocho zapatas crema con cinta carmín y madera por tramo. Se conserva exactamente el volumen contractual. Cada tramo tiene un solo material satinado; los distintos acabados se expresan con pigmento. Así se evita multiplicar mallas y llamadas de dibujo por cada muro repetido. El poste comparte ese material; el decorado fijo sí separa los metales y fieltros.
4. **Tapa estilizada:** una hoja inclinada a la izquierda con casetones y dos soportes dorados, para dar lectura de catedral y dejar abierta la cámara desde la derecha. No reproduce la mecánica de una marca comercial.
5. **Portal:** dos aros concéntricos con doce marcas legibles cada uno, corona de diapasón y núcleo opaco salvia. No añade partes fuera del contrato. El marco se entierra ligeramente bajo el piso por su circunferencia; el hueco mantiene su centro Y=2.3.
6. Si falla el conversor de GLB del kit por falta de Node o dependencias, el script deja un JSON de respaldo **sin AO**, lo registra y sigue produciendo la escena, el GLB portable y los renders. Ese caso exige completar el GLB de juego con AO antes de integrar; no instala paquetes ni cambia archivos ajenos.

## Revisión propia pendiente

Cuando Claude devuelva los renders, revisar silueta de piano de cola bajo la tapa, continuidad visual de la madera, redondez de martillos y clavijas en el acercamiento, lectura del piso frente a las cuerdas, iluminación cálida y visibilidad del portal. Comprobar que el robot importado conserve escala y posición de apoyo. Máximo dos rondas de corrección; todavía no se ha consumido una ronda de revisión visual.

## Lecciones aprendidas

Pendiente de la primera ejecución y revisión visual. La preparación usa geometría determinista, biseles explícitos y materiales por parte compatibles con el exportador del kit.


## Resultado de ejecución (automático; revisión visual pendiente)

| Parte | Segmento | Triángulos |
|---|---|---:|
| `world` | 0 | 4,704 |
| `world` | 1 | 9,476 |
| `world` | 2 | 3,432 |
| `world` | 3 | 5,460 |
| `world` | 4 | 280 |
| `wall_x` | — | 1,140 |
| `wall_z` | — | 1,140 |
| `post` | — | 208 |
| `portal_frame` | — | 3,056 |
| `portal_ring` | 0 | 1,680 |
| `portal_ring` | 1 | 1,680 |
| `portal_core` | — | 384 |

Total prototipos: **32,640 triángulos**.

Límites reales del mundo (Three, XYZ): [-53.4162483215332, -3.0, -102.09254455566406] a [58.09330749511719, 46.9800910949707, 88.97830963134766].

Dimensiones XYZ: [111.51, 49.98, 191.071] m.

Robot existente importado solo para renders, sin cambiar escala.

GLB de juego y JSON generados con AO distance=1.5, strength=0.7.

- `mundo-piano.blend`: 4,353,249 bytes.
- `mundo-piano.glb`: 1,452,632 bytes.
- `mundo-piano-juego.glb`: 294,408 bytes.
- `mundo-piano.json`: 2,484,517 bytes.
- `render-juego.png`: 1,998,882 bytes.
- `render-cerca.png`: 2,192,091 bytes.
