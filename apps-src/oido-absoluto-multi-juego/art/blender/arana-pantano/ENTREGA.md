# ENTREGA — Arañita del pantano · Walking AP Multi

## Estado

- Versión / ronda: **v1, ronda 1 preparada**.
- Fecha: 2026-10-17.
- **Lista para: ejecución de Claude**.
- Script escrito; no se ha cargado bpy, ejecutado Blender ni realizado revisión visual. Claude debe devolver ambos renders para la revisión propia de Astra. Esta v1 no constituye aprobación para integrar.

## Diseño

Una pequeña guardiana del pantano: cuerpo jade con vientre crema, dibujo de ramita con seis hojas claras sobre el abdomen, ojos enormes de miel, pupilas redondas con dos reflejos, mejillas rosadas, sonrisa pequeña y palpos como manoplas. Tres mechoncitos redondeados sugieren peluche. Sin colmillos, pinchos ni pelos finos. Patas suaves en abanico que enmarcan la cara.

## Archivos

| Archivo | Estado / contenido |
|---|---|
| `modelar-arana-pantano.py` | Fuente reproducible completa, entregada |
| `arana-pantano.blend` | Pendiente de ejecución; modelo en reposo y escena de render |
| `arana-pantano.glb` | Pendiente; visor, pigmento conectado al material |
| `arana-pantano-juego.glb` | Pendiente; kit, AO distance 0.2 / strength 0.5 |
| `arana-pantano.json` | Pendiente; kit, mismo contrato y AO |
| `render-cerca.png` | Pendiente; 1400 × 900, tres cuartos frontal |
| `render-juego.png` | Pendiente; 1400 × 900, cámara a unos 6 m y 2 m de altura |

Desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-arana-pantano.py
```

El script exporta antes de crear el piso y antes de preparar las cámaras. No modifica las poses para los renders. Al terminar añade los valores medidos a esta entrega. Si falta Node o falla el convertidor compartido, conserva el JSON y registra el motivo; no instala dependencias. Un fallo de AO u otro error inesperado detiene la ejecución.

## Datos técnicos

| Dato | Valor previsto; pendiente de medición en Blender |
|---|---|
| Cuerpo, largo | 1.14 m, sin ojos salientes |
| Conjunto, largo × alto × ancho | Aproximadamente 1.28 × 0.68 × 2.04 m |
| Centro / pivote de cuerpo y ojos | (0, 0.38, 0) |
| Frente / unidades | −Z / metros; Y arriba |
| Triángulos | **7 056 previstos por conteo de topología**, sin modificadores; assert ≤ 8 000 al ejecutar |
| Mallas exportadas | **10**: body, eyes, ocho leg; assert al ejecutar |
| Peso de archivos | Pendiente de ejecución |
| AO | distance 0.2, strength 0.5 |
| Texturas / transparencia | Ninguna / alfa 1 |

`meta`: `forward="-Z"`; `bodyRestPivot=[0,0.38,0]`; `legOrder` describe el orden contractual; `dimensionsLHW` contiene las dimensiones medidas; `design` informa que pupilas y reflejos pertenecen a body. No hay puntos de anclaje adicionales.

## Partes

Todos los ejes y pivotes siguientes están en espacio Three, Y arriba. Las patas son mallas completas rígidas, sin jerarquía de tibia ni articulación adicional.

| Objeto | part | segment | Pivote | Eje / amplitud | Velocidad sugerida |
|---|---|---|---|---|---|
| Cuerpo | body | — | (0, 0.38, 0) | Traslación Y ±0.012 m al andar | 2 ciclos/s |
| Ojos | eyes | — | (0, 0.38, 0) | Misma traslación Y que body; sin giro independiente | 2 ciclos/s, misma fase |
| Pata delantera izquierda | leg | 0 | (−0.27, 0.34, −0.22) | X ±0.42 rad; Z −0.08 rad al levantar | 2 ciclos/s |
| Pata delantera derecha | leg | 1 | (+0.27, 0.34, −0.22) | X ±0.42 rad; Z −0.08 rad al levantar | 2 ciclos/s |
| Pata media anterior izquierda | leg | 2 | (−0.27, 0.34, −0.07) | X ±0.42 rad; Z −0.08 rad al levantar | 2 ciclos/s |
| Pata media anterior derecha | leg | 3 | (+0.27, 0.34, −0.07) | X ±0.42 rad; Z −0.08 rad al levantar | 2 ciclos/s |
| Pata media posterior izquierda | leg | 4 | (−0.27, 0.34, +0.07) | X ±0.42 rad; Z −0.08 rad al levantar | 2 ciclos/s |
| Pata media posterior derecha | leg | 5 | (+0.27, 0.34, +0.07) | X ±0.42 rad; Z −0.08 rad al levantar | 2 ciclos/s |
| Pata trasera izquierda | leg | 6 | (−0.27, 0.34, +0.20) | X ±0.42 rad; Z −0.08 rad al levantar | 2 ciclos/s |
| Pata trasera derecha | leg | 7 | (+0.27, 0.34, +0.20) | X ±0.42 rad; Z −0.08 rad al levantar | 2 ciclos/s |

Conservar las fases de la caminata existente. Los valores de velocidad y oscilación corporal son sugerencias documentales; el script no añade animación. No se cambió el signo de Z solicitado por el contrato. Las puntas terminan cerca de Y=0 con un extremo redondeado de radio 0.018 m.

## Materiales

| Material | Pigmentos sRGB principales | Metal / rugosidad | Emisión | Consideración |
|---|---|---|---|---|
| Jade y pigmentos de cuento | Jade #38756e–#afd9ba; hojas #dce5ac; mejillas #dc9f9c; pupila #162f35 | 0 / 0.64 | 0 | Un único material compartido entre cuerpo y patas; variación por vértice |
| Ojos de luciérnaga | #e9ad50–#fff0bc | 0 / 0.24 | #ffe4a3, fuerza 0.65 | Ambos ojos en una única parte; misma emisión constante en visor y kit |

Los reflejos son geometría clara dentro de body. Pupilas y reflejos usan su mismo material mate: se conserva el contraste al no emitir, a cambio de no tener un acabado especular independiente. Deben subir y bajar junto a los ojos. No escalar ni parpadear eyes de forma independiente porque la cara oscura pertenece a body.

## Diferencias con el brief

- Ningún cambio al contrato: partes, segmentos, pivotes, orientación, AO y presupuesto se conservan en el script.
- Interpretación artística elegida: jade con hojas crema y ojos miel claros; el pelo se sugiere con tres mechones blandos, sin partículas. El brief deja estas decisiones abiertas.
- Por la instrucción explícita de esta sesión, se entrega solamente el script y esta v1. Los binarios y renders quedan pendientes de ejecución por Claude; no se intentó cargar Blender en el sandbox.

## Revisión propia pendiente

Con los renders devueltos, revisar silueta a distancia, lectura de hojas, continuidad de las patas, suavidad de curvas, posición de pupilas/reflejos y brillo cálido sin perder expresión. Comprobar criterios del brief uno por uno antes de aprobar. Máximo dos rondas de corrección; esta fase aún no permite juzgar el resultado visual.

## Lecciones aprendidas

- Preparación v1: el kit exporta un solo material por parte. La emisión se reserva para eyes y los elementos oscuros de la expresión se agrupan en body, que comparte su pivote y movimiento.
- Pendiente registrar lo aprendido al revisar los renders reales.

<!-- EJECUCION -->
## Resultado de ejecución

- 7056 triángulos; 10 mallas.
- Largo × alto × ancho: 1.275 × 0.662 × 2.034 m.
- Exportación: GLB de juego con AO. GLB de juego: 53808 bytes.
- Renders generados; revisión visual de Astra pendiente.
