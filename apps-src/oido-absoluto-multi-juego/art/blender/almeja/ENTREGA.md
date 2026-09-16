# ENTREGA — Almeja con perla · Walking AP Multi

## Estado

- Versión / ronda: v1, dos ajustes de revisión propia.
- Fecha: 2026-09-15.
- Lista para: revisión de Luis.

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-almeja.py` | Generador reproducible de toda la entrega. |
| `almeja.blend` | Escena editable, cerrada. |
| `almeja.glb` | Colores por vértice conectados a materiales; seis mallas. |
| `almeja.json` | kit.export_parts, geometría neutral cerrada. |
| `render-lejos.png`, `render-cerca.png`, `render-cerrada.png`, `render-perfil.png` | Cycles, 40 muestras, denoise. |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-almeja.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Fondo × alto cerrado × ancho | 2.795 × 2.138 × 3.415 u |
| Origen | Centro de la perla, (0,0,0). |
| Frente | +Z Three, apertura hacia +Y. |
| Triángulos | 8640 |
| Mallas | 6 |
| Peso JSON | 380.5 KiB |
| Perla | Diámetro 1.000 u. |
| Meta | hinge=(0,0,−1.32); pearlCenter=(0,0,0); openingAxis=−X; openingAngle=0.9. |

## Partes

| Objeto / part | Pivote Three | Material | Eje | Amplitud | Velocidad sugerida |
|---|---|---|---|---|---|
| Valva inferior / shell_lower | (0,0,−1.32) | Exterior | — | Fija | 0 |
| Valva superior / shell_upper | (0,0,−1.32) | Exterior | X | 0 a −0.9 rad | 1.2 rad/s |
| Nácar inferior / lining_lower | (0,0,−1.32) | Interior | — | Fija | 0 |
| Nácar superior / lining_upper | (0,0,−1.32) | Interior | X | 0 a −0.9 rad | 1.2 rad/s, sincronizada con shell_upper |
| Manto / mantle | (0,0,−1.32) | Manto | Escala XYZ | ±4 % | 0.8 rad/s |
| Perla / pearl | (0,0,0) | Perla | — | Tinte y emisión | Transición 0.25 s |

## Materiales

| Material | Pigmento | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| Exterior | #efdfc0 / #c9ad86, costillas y crecimiento | 0 / 0.67 | 0 | 1 |
| Interior | #bcd9e6 → #fdf6ee | 0 / 0.16 | 0 | 1 |
| Manto | #3fd2c7 / #8f7bd6 | 0 / 0.32 | 0 | 1 |
| Perla | #f6f2ea | 0 / 0.05 | 1.2, blanco | 1 |

## Diferencias con el brief

Dos mallas adicionales (lining_lower y lining_upper) conservan la rugosidad nacarada en JSON sin mezclarla con el exterior mate. Se respeta el máximo de seis. Con bisagra trasera en −Z y frente +Z, abrir hacia +Y requiere rotación X negativa: −0.9 rad, magnitud solicitada 0.9. Rendija de 0.028 u entre bordes coincidentes. A 35 u la silueta se reconoce, pero el brillo de la rendija no destaca: necesita la baliza prevista del juego. Esta condición visual del brief no se considera plenamente satisfecha por el modelo aislado.

## Sugerencias para integrar

Sincronizar lining_upper con shell_upper. Teñir base y emisión de pearl con la nota; el resto no emite. Girar el conjunto Y a 0.15 rad/s y desplazarlo verticalmente ±0.12 u a 0.8 rad/s alrededor del centro de la perla. No hay animaciones horneadas. La luz de baliza distante corresponde al juego.
