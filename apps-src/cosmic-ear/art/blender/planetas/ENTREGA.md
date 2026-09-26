# ENTREGA — Planetas-instrumento · Cosmic Ear

## Estado

- Versión / ronda: v1, preparación de ronda 1.
- Fecha: 2026-09-26.
- Lista para: ejecución de Claude
- No se ha importado bpy ni ejecutado Blender en el sandbox. Revisión visual pendiente de los dos renders que devolverá Claude; no se declara aprobación artística ni exportación verificada.

## Archivos

Entregados: `modelar-planetas.py` y este documento, en UTF-8.

El script generará `planetas.blend`, `planetas.glb`, `planetas-juego.glb`, `planetas.json`, `render-kit.png` y `render-cerca.png`. Ambos renders son de 1600 × 900. La escena editable conserva los cinco planetas en fila; ambos GLB se exportan antes de acomodarlos, con todos los pivotes en cero.

Desde esta carpeta, Claude puede ejecutar:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-planetas.py
```

Si el convertidor compartido falla por Node o dependencias, el script conserva el JSON mediante `kit.export_parts`, continúa con el GLB de visor y renders, y anexa aquí el error. No instala dependencias.

## Datos técnicos

| Dato | Valor |
|---|---|
| Cuerpos | Radio envolvente máximo 1 u, incluyendo detalles |
| Anillos | Radio envolvente máximo 2.2 u, comprobado antes de exportar |
| Ejes | Y arriba en Three; frente artístico +Z |
| Orígenes | Los diez en (0, 0, 0) |
| Mallas | Exactamente diez; un material por malla |
| Presupuesto | El script detiene la exportación si un planeta supera 6000 triángulos o el kit supera 30000 |
| Triángulos reales / dimensiones XYZ / pesos | Pendientes de ejecución; no medidos en Blender |
| AO | Sin AO, `ao=None` |
| Pigmento | Atributo POINT `Color` lineal, conectado al Principled BSDF para el visor |
| Metadatos | `coreRadius`, `ringMaxRadius`, `instruments`, `trianglesByPlanet`, `dimensionsByPlanet`, `forward`, `note`; sin anclajes adicionales |

## Partes y movimiento sugerido

Conteo calculado por topología del script (caras triangulares y polígonos n−2), todavía sin verificar con Blender. No hay modificadores que añadan geometría.

| Planeta | Triángulos calculados |
|---|---:|
| Piano | 4000 |
| Cello | 3492 |
| Corno | 3860 |
| Coro | 5140 |
| Fagot | 5180 |
| Total | 21672 |

Todas las amplitudes y ejes son de Three. Sin `segment`. Los núcleos pueden pulsar uniformemente al acorde: escala ±2 %, 2 ciclos/s durante 0.5 s, volviendo a 1. Los giros de anillo son continuos; la vibración se suma sólo durante el sonido y vuelve a cero.

| `part` | Pivote | Eje de giro | Velocidad | Vibración de acorde |
|---|---|---|---|---|
| piano_core | (0,0,0) | Y | 0.025 rad/s | Escala ±2 % |
| piano_ring | (0,0,0) | Y | 0.10 rad/s | X ±0.025 rad, 3 Hz |
| cello_core | (0,0,0) | Y | 0.025 rad/s | Escala ±2 % |
| cello_ring | (0,0,0) | Y | 0.075 rad/s | Z ±0.035 rad, 2 Hz |
| corno_core | (0,0,0) | Y | 0.025 rad/s | Escala ±2 % |
| corno_ring | (0,0,0) | Y | 0.09 rad/s | X ±0.04 rad, 2.5 Hz |
| coro_core | (0,0,0) | Y | 0.025 rad/s | Escala ±2 % |
| coro_ring | (0,0,0) | Y | 0.065 rad/s | Escala ±3 %, 1.5 Hz |
| fagot_core | (0,0,0) | Y | 0.025 rad/s | Escala ±2 % |
| fagot_ring | (0,0,0) | Y | 0.08 rad/s | Z ±0.03 rad, 3 Hz |

## Materiales y decisiones artísticas

| Planeta | Pigmentos dominantes | Metal core/ring | Rugosidad core/ring | Emisión |
|---|---|---|---|---|
| Piano | Marfil #fff0cf, ébano #292039, oro #ffcf5a | 0.06 / 0.06 | 0.32 / 0.29 | 0 |
| Cello | Madera #c87537, cuerdas #dce7eb | 0.05 / 0.05 | 0.32 / 0.29 | 0 |
| Corno | Oro #ffcf5a, ámbar #d59036 | 0.68 / 0.68 | 0.32 / 0.29 | 0 |
| Coro | Perla #e4dbf7, marfil, magenta #ff6fb5, turquesa #3fd2c7 | 0.08 / 0.08 | 0.32 / 0.29 | Ring: 0.08, magenta |
| Fagot | Madera #683849 y #894d3a, plata #dce7eb | 0.18 / 0.18 | 0.32 / 0.29 | 0 |

Todos opacos. Material base blanco para no multiplicar dos veces el pigmento. La variación suave de color está en vértices, no en texturas. El piano lleva 28 teclas claras con grupos reconocibles de dos y tres negras; el cello una cintura, puente, cuatro cuerdas y voluta orbital; el corno una espiral y campana abierta de doble pared; el coro tres voces con bocas en O, nubes y tres líneas ondulantes; el fagot dos tubos, tudel y llaves orbitales.

## Diferencias con el brief

- Por instrucción explícita del encargo, esta v1 entrega sólo fuente y documento. Los binarios, renders, mediciones reales y revisión propia quedan para la ejecución de Claude y la reanudación de Astra.
- Interpreto radio 1 como la envolvente del cuerpo completo con accesorios. Cello y fagot son cuerpos estilizados con cintura / alargados, no esferas perfectas; se normalizan uniformemente alrededor del origen para respetar esa envolvente.
- Para conservar exactamente dos partes por instrumento, la plata de cuerdas y llaves comparte rugosidad y metal con la madera de su respectiva parte. Su distinción es de pigmento; no se promete metal independiente.
- El GLB de visor contiene los cinco pares superpuestos en origen, según el requisito de exportar antes de acomodar. El visor debe aislar un par para inspeccionarlo. La fila sólo corresponde al `.blend` y al render de kit.

## Revisión pendiente

Comprobar en `render-kit.png` la lectura inmediata de los cinco instrumentos y la separación visual entre núcleo y anillos. En `render-cerca.png`, revisar la curva del tubo y la boca de la campana del corno. Verificar especialmente que las cuerdas del cello se lean y que las voces del coro no parezcan cráteres. Máximo dos rondas de corrección por modelo. El script anexará los conteos y dimensiones reales al finalizar; esto no sustituye la revisión visual.

## Resultado automático de ejecución

Geometría y renders generados; revisión visual de Astra pendiente.

| Planeta | Triángulos | Dimensiones XYZ (u) |
|---|---:|---|
| piano | 4000 | [3.9576, 1.9769, 3.7808] |
| cello | 3492 | [3.53, 2.7771, 3.1852] |
| corno | 3860 | [3.5852, 2.4333, 2.5963] |
| coro | 5140 | [3.7963, 1.8214, 3.7434] |
| fagot | 5180 | [4.11, 1.7346, 3.6288] |

Total: 21672 triángulos; 10 partes.
