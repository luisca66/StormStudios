# ENTREGA — Portal del Cosmos · Walking AP Multi

## Estado

- Versión / ronda: v1, preparación; revisión visual pendiente.
- Fecha: 2026-09-26.
- Lista para: ejecución de Claude
- No se ha importado bpy ni ejecutado Blender en el sandbox. Los valores de geometría son calculados por construcción, no medidos en una ejecución.

## Dirección artística

Un umbral de joyería de cuento: aro exterior turquesa y lavanda, corona intermedia rosa con coral y aro interior amarillo estrella. Las estrellas abombadas acompañan el giro. Tres estelas con estrellas se enroscan hacia atrás, como una escalera de luz. El centro permanece oscuro y abierto para invitar a atravesarlo; no hay disco opaco ni piezas puntiagudas amenazantes.

## Archivos

| Archivo | Estado / contenido |
|---|---|
| `modelar-portal-cosmos.py` | Entregado; fuente reproducible |
| `portal-cosmos.blend` | Lo genera Claude; escena editable con cámara y luces |
| `portal-cosmos.glb` | Lo genera Claude; visor, pigmento conectado al material |
| `portal-cosmos.json` | Lo genera Claude; partes, pivotes, pigmento y metadatos |
| `portal-cosmos-juego.glb` | Lo genera Claude con kit, sin AO |
| `render-juego.png` | Lo genera Claude; 1600 × 900, cámara a 60 m aproximadamente |
| `render-cerca.png` | Lo genera Claude; 1600 × 900, vista de tres cuartos |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-portal-cosmos.py
```

El script comprueba presupuesto, pivotes y triángulos antes de exportar. Si falta Node o falla el convertidor del kit, conserva el JSON, continúa con el visor y los renders y anota el motivo aquí. No instala dependencias. Exporta todas las partes en pose neutra antes de crear la escena de revisión.

## Datos técnicos

| Dato | Valor previsto |
|---|---|
| Tamaño XYZ (ancho × alto × profundidad) | Aproximadamente 32 × 32 × 6 m; se anota el valor medido al ejecutar |
| Radio exterior | Aproximadamente 16.1 m incluyendo estrellas; cuerpo del toro hasta 15.8 m |
| Paso central libre | Radio conservador 2.7 m; diámetro 5.4 m, superior a la envergadura de 4 m |
| Origen / frente | Centro (0, 0, 0); +Z en Three; Y arriba |
| Triángulos | 17 756 previstos: aros 8192 + estelas 4644 + estrellas 4920 |
| Mallas | 4; tres `ring` y un `core` |
| Peso JSON / GLB | Pendiente de ejecución |
| AO | Sin AO (`ao=None`) |
| Puntos de meta | `portalCenter=(0,0,0)`, `entryPoint=(0,0,2)`, `exitPoint=(0,0,-6)`, en Three |

Otros metadatos: `dimensionsXYZ`, `outerRadius`, `clearPassageRadius`, `ringAngularVelocities`, `openSpeedMultiplier`, `corePulseAmplitude`, `corePulseHz`, unidades y frente. Entrada y salida son referencias sugeridas; el integrador decide el sentido real de cruce.

## Partes

| Objeto | part | segment | Pivote Three | Eje / amplitud | Velocidad sugerida |
|---|---|---|---|---|---|
| Aro_00 | ring | 0 | (0,0,0) | Z, giro continuo 2π | +0.12 rad/s; abierto +0.36 |
| Aro_01 | ring | 1 | (0,0,0) | Z, giro continuo 2π | −0.18 rad/s; abierto −0.54 |
| Aro_02 | ring | 2 | (0,0,0) | Z, giro continuo 2π | +0.24 rad/s; abierto +0.72 |
| Remolino_estelar | core | — | (0,0,0) | Escala uniforme 1 ± 4 % | 0.65 ciclos/s; emisión 0.65 → 1.5 al abrir |

Las estrellas están incluidas en sus respectivas mallas. No necesitan objetos ni pivotes adicionales. Interpolar la aceleración durante 1.2 s. El script entrega geometría neutra sin animaciones horneadas. El paso indicado contempla el pulso mínimo de 96 %.

## Materiales

| Material | Pigmento | Metal / rugosidad | Emisión base (color, intensidad) | Alfa |
|---|---|---|---|---|
| Esmalte astral 0 | Turquesa/lavanda, estrellas amarillas/rosa | 0.08 / 0.36 | #3fe0d0, 0.34 | 1 |
| Esmalte astral 1 | Rosa/coral, estrellas amarillas/rosa | 0.08 / 0.36 | #ff8fd8, 0.28 | 1 |
| Esmalte astral 2 | Amarillo/turquesa | 0.08 / 0.36 | #ffe66d, 0.40 | 1 |
| Luz del umbral | Turquesa/lavanda/rosa y estrellas amarillas | 0.08 / 0.36 | #b8a4ff, 0.65 | 1 |

Pigmento lineal por vértice con variación suave de tono y valor. Un material por malla, emisión constante por parte compatible con el kit. Sin transparencias, texturas, dependencias externas de imagen ni bloom imprescindible. Las superficies cerradas funcionan sin DoubleSide. Fondo de revisión #0b1438.

## Diferencias con el brief

- Ninguna desviación prevista de tamaño, paleta, partes o presupuesto. Se omite `frame`, expresamente opcional.
- Decisión artística: el remolino es de estelas y estrellas con profundidad de unos 5 m hacia −Z, no una superficie que tape el paso. Las estelas son decoración; no deben usarse como colisionadores.
- Por instrucción expresa del encargo, esta v1 entrega solo script y documento. Los binarios y renders quedan pendientes de ejecución de Claude; la aceptación visual queda pendiente de la reanudación de Astra.

## Revisión propia pendiente

Cuando Claude devuelva ambos renders, comprobar silueta a 60 m, curvas y estrellas de cerca, volumen del remolino, lectura del pigmento, encuadre y criterios del brief. No se afirma aprobación visual antes de verlos. Máximo dos rondas de corrección.

<!-- RESULTADO-EJECUCION -->
## Resultado de ejecución automática

- Blender: 4.5.3 LTS; 4 mallas; 17756 triángulos.
- Dimensiones XYZ: 32.139 × 32.139 × 5.964 m.
- GLB de juego: 104788 bytes.
- Escena, GLB de visor y dos renders generados. Revisión visual de Astra pendiente.
