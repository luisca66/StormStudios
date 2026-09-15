# ENTREGA — Pez protagonista · Walking AP Multi

## Estado

- Version / ronda: v2, ronda de correccion 1/2
- Fecha: 2026-09-15
- Lista para: revision de Luis

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-pez.py` | Fuente reproducible; regenera todos los entregables. |
| `pez.blend` | Escena editable neutral, camara de juego y luces. |
| `pez.glb` | Seis mallas, pigmento por vertice y propiedades `part`/`segment`. |
| `pez.json` | Geometria mediante `kit.export_parts`. |
| `render-juego.png`, `render-cerca.png`, `render-perfil.png`, `render-arriba.png` | Cycles, 40 muestras y denoise. |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-pez.py
```

## Datos tecnicos

| Dato | Valor |
|---|---|
| Tamano real (largo × alto × ancho, u) | 2.723 × 2.083 × 2.297 |
| Origen | Centro del cuerpo, (0, 0, 0). |
| Frente | +Z en espacio Three. |
| Triangulos totales | 13200 |
| Mallas exportadas | 6 |
| Peso del JSON | 575.6 KiB |
| Puntos en `meta` | `mouth` = (0.000, −0.200, 1.080) Three; emision de burbujas. |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Cuerpo labios y operculos | `body` | — | 0.000, 0.000, 0.000 | Piel satinada | escala Z / X-Y | +15 % / −7 % | ligada a velocidad | Balanceo idle ±0.035 rad Y, 1.2 rad/s. |
| Ojos expresivos | `eyes` | — | 0.000, 0.000, 0.000 | Ojos brillantes | — | 0 | — | Estaticos respecto al cuerpo. |
| Pedunculo y cola abanico vertical | `tail` | — | 0.000, 0.000, −0.880 | Aletas satinadas | Y | ±0.15 rad | 6 rad/s | Pivote y pedunculo solapados dentro del cuerpo; abanico en Y-Z. |
| Pectoral izquierda | `fin` | 0 | −0.470, −0.040, 0.180 | Aletas satinadas | X | ±0.40 rad | 10 rad/s | Idle ±0.10 rad a 1.5 rad/s. |
| Pectoral derecha | `fin` | 1 | 0.470, −0.040, 0.180 | Aletas satinadas | X | ±0.40 rad | 10 rad/s | Fase opuesta; idle ±0.10 rad. |
| Aleta dorsal alta | `dorsal` | — | 0.000, 0.620, 0.100 | Aletas satinadas | Z | ±0.08 rad | 2.0 rad/s | Ondulacion leve, fase retrasada. |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emision | Alfa | Que debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Piel satinada | Pigmento #e8322e → #a3141c; vientre #ffd23d; labios #ff785e | 0 / 0.38 | 0 | 1 | Activar vertex colors; un material por parte. |
| Ojos brillantes | #fff4dc, iris #42b9c5, pupila #141526, brillo #ffffff | 0 / 0.05 | 0 | 1 | Los dos ojos estan fusionados en una sola parte. |
| Aletas satinadas | #f04425 con borde/radios #ffb08a | 0 / 0.32 | 0 | 1 | Opacas y de doble cara; evita problemas de orden de transparencia. |

## Diferencias con el brief

Las aletas son opacas, con borde aclarado por pigmento, en lugar de usar la transparencia opcional. Se conservaron las seis partes y los pivotes del brief. Sin otras diferencias previstas.

## Sugerencias para integrar

Conservar `vertexColors`. Aplicar el estiramiento de velocidad a `body` y acompañarlo en `eyes` para que la cara permanezca unida. Cola y pectorales tienen solape en la base para tolerar sus amplitudes maximas sin huecos. No hay animaciones horneadas ni emision.
