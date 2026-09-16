# ENTREGA — Ballena jorobada · Walking AP Multi

## Estado

- Versión / ronda: v3, revisión propia 2 de 2.
- Fecha: 2026-09-15.
- Lista para: revisión de Luis.

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-ballena.py` | Fuente reproducible de todos los entregables. |
| `ballena.blend` | Escena editable, cinco partes en reposo y cámara a 100 u. |
| `ballena.glb` | Cinco mallas con COLOR_0, material conectado al pigmento y extras. |
| `ballena.json` | Geometría neutral mediante kit.export_parts. |
| `render-juego.png`, `render-cerca.png`, `render-perfil.png`, `render-cola.png` | Cycles, 40 muestras, denoise; FOV vertical 60°. |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-ballena.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Largo × alto total × envergadura | 40.995 × 10.061 × 21.300 u |
| Alto del tronco | Aproximadamente 9 u, dorsal incluida en el alto total. |
| Ancho de cola | 15.200 u |
| Origen | (0,0,0), centro del tronco a la altura de las articulaciones. |
| Frente | +Z Three; −Y Blender. |
| Triángulos | 19434 |
| Mallas exportadas | 5 |
| Peso JSON | 861.1 KiB |
| meta.blowhole | (0.000, 3.702, 8.200), burbujas. |
| meta.eye | (3.567, 0.320, 10.100), referencia ojo +X. |

## Partes

| Objeto | part | segment | Pivote Three | Material | Eje | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Cuerpo, cabeza, ojos, dorsal | body | — | (0,0,0) | Piel | — | Fijo | 0 | Garganta posterior y tubérculos incluidos. |
| Pedúnculo y cola | tail | — | (0,0,−12) | Piel | X | ±0.2 rad | 4 rad/s | Batido vertical. |
| Pectoral izquierda | flipper | 0 | (−3.25,−0.55,3.8) | Piel | X | ±0.1 rad | 1.5 rad/s | Movimiento lento. |
| Pectoral derecha | flipper | 1 | (3.25,−0.55,3.8) | Piel | X | ±0.1 rad | 1.5 rad/s | Desfase sugerido 0.4 rad. |
| Mandíbula y pliegues | jaw | — | (0,−0.6,6) | Piel | X | 0 a +0.25 rad | 0.15 rad/s | Abrir una vez cada 12–20 s, pausa 1 s. |

## Materiales

| Material | Pigmentos | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Piel satinada | #3f6485 → #27465e, garganta #e8e2d2, caras inferiores #f1efe6, ojo #111e29 | 0 / 0.46 | 0 | 1 | Vertex colors; un único material por parte. |

## Diferencias con el brief

La garganta móvil y sus pliegues se agrupan con jaw para acompañar la apertura; el resto de la cabeza y los ojos pertenecen a body. El render cercano está a 18 u del punto observado en la cabeza, por lo que muestra la pasada y no pretende encuadrar toda la longitud de 40 u.

Revisión visual final: no se observa hueco en el pedúnculo a +0.2 rad, pero persiste una leve costura de sombreado en la unión bajo luz rasante. La continuidad visual totalmente fundida de ese punto no se considera plenamente satisfecha tras las dos correcciones permitidas.

## Sugerencias para integrar

Animar las cinco partes desde sus pivotes, sin trasladar sus vértices otra vez. No hay animaciones horneadas. Emitir burbujas cada 0.25 s desde meta.blowhole transformado por el conjunto. La órbita y la esfera de colisión de radio 12.5 u corresponden al integrador.

## Revisión del generador

Comprobadas las raíces por anillos de puntos contenidos en el cuerpo para cola −0.2/0/+0.2 rad y pectorales −0.1/0/+0.1 rad. Esa comprobación evita raíces expuestas, no sustituye la revisión visual de toda la superficie. Verificados presupuesto, dimensiones, pivotes, pigmentos COLOR_0 del GLB y ausencia de emisión. Los renders se generan después de exportar la pose neutral.
