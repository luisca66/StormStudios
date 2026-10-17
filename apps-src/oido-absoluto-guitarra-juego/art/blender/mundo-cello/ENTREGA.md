# ENTREGA — Dentro del cello · Resonancia

## Estado

- Versión / ronda: **v1, preparada para primera ejecución**.
- Fecha: 2026-10-17.
- **Lista para: ejecución de Claude**.
- No se ha importado bpy ni ejecutado Blender en este sandbox, por instrucción expresa. No hay renders revisados ni binarios generados todavía. Claude debe ejecutar la fuente y reanudar a Astra con ambas imágenes para su revisión propia; máximo dos rondas de corrección.

## Archivos

| Archivo | Estado / contenido |
|---|---|
| `modelar-mundo-cello.py` | Entregado; fuente reproducible, determinista, rutas relativas, materiales con pigmento por vértice |
| `ENTREGA.md` | Esta entrega v1 |
| `mundo-cello.blend` | Lo genera el script; incluye presentación con muestras enlazadas y cámaras |
| `mundo-cello.glb` | Lo genera Blender, selección de assets originales con colores conectados al material |
| `mundo-cello-juego.glb` | Lo genera `kit.export_glb`, AO distance=1.5, strength=0.7 |
| `mundo-cello.json` | Lo genera el kit con AO; incluye recuentos por parte en `triangleCounts` |
| `render-juego.png` | Lo genera el script, 1600 × 900; cámara elevada dentro de la caja, muestras de laberinto y portal al fondo |
| `render-cerca.png` | Lo genera el script, 1600 × 900; alma, aro y madera vistos desde el interior |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-mundo-cello.py
```

La fuente verifica presupuestos y medidas antes de exportar. No ejecuta `npm install`. Si falta Node o falla el convertidor compartido, conserva JSON con AO y añade aquí la incidencia; los demás errores se propagan para corregirlos. La escena de presentación se prepara después de ambas exportaciones, sin contaminar las piezas del juego.

## Datos técnicos

**Recuentos calculados a partir de la topología escrita, pendientes de confirmar ejecutando Blender.** No son mediciones de un archivo ya exportado. El script imprime los valores efectivos y aborta si excede el contrato.

| Parte | Triángulos previstos | Presupuesto |
|---|---:|---:|
| `world` (5 segmentos por material) | 47 776 | 60 000 |
| `wall_x` | 668 | 1 500 |
| `wall_z` | 668 | 1 500 |
| `post` | 168 | 1 500 |
| `portal_frame` | 6 200 | — |
| `portal_ring`, segmento 0 | 1 280 | — |
| `portal_ring`, segmento 1 | 1 280 | — |
| `portal_core` | 80 | — |
| Portal completo | 8 840 | 15 000 |
| Total de assets únicos | **58 120** | — |

- Mallas exportadas previstas: **12**. Las copias de muros/postes de la presentación no se exportan.
- Mundo: aproximadamente **74 × 30.5 × 180 u (X × Y × Z)**; z = −90…90, origen (0,0,0). El ancho depende de la silueta de las dos cajas del cello. Medidas finales por confirmar.
- Piso transitable continuo en y=0, sin ornamentación dentro de x=−17.5…17.5, z=−50…52.6.
- Muros: 5 × 1.2 × 0.34 u y 0.34 × 1.2 × 5.7 u; postes 0.5 × 1.35 × 0.5 u. Se comprueban con tolerancia 0.001.
- Frente del portal: +Z; plano XY, centro (0,2.3,0), radio libre del marco 2.2 u.
- Peso JSON / GLB: pendiente de ejecución.

## Partes y pivotes

Todo está expresado en Three, **Y arriba**. El JSON conserva el pivote de cada objeto. La geometría del portal se exporta relativa al centro, y la del mundo conserva su origen global.

| `part` | `segment` | Pivote | Material | Animación sugerida |
|---|---|---|---|---|
| `world` | 0 | (0,0,0) | Arce miel | Estático, amplitud 0 |
| `world` | 1 | (0,0,0) | Ébano | Estático, amplitud 0 |
| `world` | 2 | (0,0,0) | Luz de efes | Estático, amplitud 0 |
| `world` | 3 | (0,0,0) | Cuerdas | Estático, amplitud 0 |
| `world` | 4 | (0,0,0) | Crin | Estático, amplitud 0 |
| `wall_x` | — | (0,0,0) | Arce, filete pigmentado | Estático; largo por X |
| `wall_z` | — | (0,0,0) | Arce, filete pigmentado | Estático; largo por Z |
| `post` | — | (0,0,0) | Arce | Estático |
| `portal_frame` | — | (0,2.3,0) | Arce | Estático |
| `portal_ring` | 0 | (0,2.3,0) | Ámbar | Eje Z; giro continuo 2π; +0.18 rad/s |
| `portal_ring` | 1 | (0,2.3,0) | Ámbar | Eje Z; giro continuo 2π; −0.13 rad/s |
| `portal_core` | — | (0,2.3,0) | Luz dorada | Escala uniforme 1 ± 0.045, 0.65 ciclos/s al abrir; oculto cerrado |

Los anillos circulares llevan variación de pigmento para que el giro sea sutil. No hay animaciones horneadas ni dependencias de jerarquías. El núcleo es opaco, con emisión: el juego puede hacerlo aparecer por escala sin problemas de transparencia.

## Materiales

Todos usan `Pigment` como color de vértice, base blanca, alfa 1 y ningún mapa de textura. Cada malla exportada tiene un solo material. Las cifras de emisión son valores de fuente; la iluminación final corresponde al nivel.

| Material | Pigmento hex aproximado | Metal / rugosidad | Emisión |
|---|---|---|---|
| Arce miel | 9c4e22…e7b66c; piso ad733d…dfb878; abeto más claro | 0 / 0.36 | 0 |
| Ébano | 281b14…80502c según talla | 0 / 0.48 | 0 |
| Cuerdas | 8f7150…e5cb94 | 0.65 / 0.32 | 0 |
| Crin | d5ba83…fff0c4 | 0 / 0.64 | 0 |
| Luz de efes | f8ba64…ffe6ac | 0 / 0.65 | 2.4, ffd185 |
| Ámbar | ba7b32…ffda86 | 0 / 0.30 | 0.22, ffc477 |
| Centro | df9d50…ffe2a2 | 0 / 0.40 | 1.7, ffdb94 |

El filete negro y la talla clara de los muros usan pigmento dentro del mismo material de arce para conservar **una malla y un material por prototipo**. No necesitan el brillo del ébano separado. Los labios de las efes son madera oscura.

## Puntos de meta

| Clave | Valor Three | Uso |
|---|---|---|
| `forward` | +Z | Frente del portal |
| `worldOrigin` | (0,0,0) | Decorado fijo |
| `playableBounds` | [−17.5,17.5,−50,52.6] | Límites x y z del contrato |
| `floorY` | 0 | Superficie del fondo |
| `portalCenter` | (0,2.3,0) | Pivote de autoría |
| `portalSuggestedPosition` | (0,2.3,−58) | Posición usada solo en presentación |
| `soundpost` | (23,0,−18) | Base del alma |
| `bassBar` | (−11,26.35,0) | Referencia bajo la tapa |
| `bridge` | (0,0,−76) | Base del puente lejano |
| `fWindows` | (−17,25,0), (17,25,0) | Referencias aproximadas para luz del nivel; la abertura real serpentea |
| `triangleCounts` | Diccionario por `part` | Recuento real escrito al ejecutar |

## Decisiones y diferencias con el brief

- Se entrega **fuente y documentación**, con binarios y revisión visual pendientes, siguiendo la instrucción de modo automático. No se ha intentado cargar Blender.
- Interpretación escenográfica deliberada: caja ancha con tapa a 21…28 u, proporciones de sala de cuento para despejar el laberinto y la cámara. El alma está desplazada a x=23; la barra está elevada. Son reconocibles sin bloquear el recorrido.
- Las efes son dos aberturas continuas en S recortadas mediante topología, con labios tallados; simplifico los ojos circulares terminales y las muescas transversales del instrumento real. No uso booleanos. Detrás hay superficies doradas opacas fuera de la tapa; el render añade luces cálidas bajo ellas.
- Las cuatro cuerdas se muestran en el tramo lejano sobre el puente, a z=−89…−56. No recorren todo el techo: así no confunden la lectura del laberinto. El arco queda apoyado en el lateral derecho, fuera del área jugable.
- El puente tiene un gran arco abierto y calados indicados con madera oscura. No es una réplica de luthería a escala exacta.
- No se remodela ni se copia el robot existente. Las imágenes previstas muestran el entorno y las piezas de laberinto.
- Nada de integración, cambios de código del juego ni archivos fuera de esta carpeta.

## Revisión pendiente y sugerencias para integrar

Claude debe devolver las dos imágenes y la salida `TRIÁNGULOS POR PARTE` / `EXPORT`. Astra revisará silueta interior, curvas, pigmento, lectura de piso y efes, alma/barra/puente/arco y portal antes de considerar terminada la entrega. **No hay aprobación visual todavía.**

Mantener el decorado fijo sin añadir colisiones a tapa, cuerdas y barra. Usar la colisión de muros existente y conservar la zona libre. Las luces y la cámara del `.blend` son de presentación y no están en los GLB. La emisión da color visible a las efes; el juego necesita su propia luz cálida para iluminar el fondo.

`world.ts` actualmente escala el portal por 2.2; esta fuente mantiene la escala del contrato y no cambia ese código. El integrador debe tener presente ese aumento al valorar la altura del marco. Los 5 segmentos `world` se colocan juntos en el origen. Las superficies interiores abiertas deben admitir ambas caras si el material del integrador activa descarte de caras.
