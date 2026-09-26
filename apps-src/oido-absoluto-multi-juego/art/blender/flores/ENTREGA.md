# ENTREGA — Flores y matas de pasto · Walking AP Multi, La Pradera

> La escribe **Gemini** al terminar el modelado. Breve: el integrador la usa en lugar de leer el script.

## Estado

- Versión / ronda: v1, ronda 1
- Fecha: 2026-09-26
- Lista para: revisión

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-flores.py` | fuente reproducible (regenera todo lo de abajo) |
| `flores.blend` | escena editable |
| `flores.glb` | modelo portable (visor) |
| `flores.json` | geometría para el juego (`kit.export_glb`) |
| `flores-juego.glb` | la misma geometría en GLB para el juego (`kit.export_glb`) |
| `render-kit.png` | render de revisión |

Regenerar (desde la carpeta del modelo):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-flores.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño real (largo × alto × ancho, u) | matas de flores: ~0.5 × 0.6 × 0.4 u · mata de pasto: ~0.3 × 0.5 × 0.3 u |
| Origen | base en (0, 0, 0); apoya en z = 0 (y = 0 en Three) |
| Frente | +Z en espacio Three |
| Triángulos totales | 3 606 (flores: 888 por mata, pasto: 54) |
| Mallas exportadas | 5 (`flower_yellow`, `flower_pink`, `flower_white`, `flower_purple`, `grass_tuft`) |
| Peso del JSON / del GLB de juego | 531 kB / 59 kB |
| Oclusión ambiental | sin AO (`None`) |
| Puntos en `meta` | forward="+Z", note="kit instanciado; pivote en la base" |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Eje (Three) | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Flores amarillas | `flower_yellow` | — | (0, 0, 0) | Pétalos | — | — | — | Matita de 3 flores amarillas (centro naranja) con hojas basales; estática, instanciada |
| Flores rosas | `flower_pink` | — | (0, 0, 0) | Pétalos | — | — | — | Matita de 3 flores rosas (centro amarillo) con hojas basales; estática, instanciada |
| Flores blancas | `flower_white` | — | (0, 0, 0) | Pétalos | — | — | — | Matita de 3 flores blancas (centro amarillo dorado) con hojas basales; estática, instanciada |
| Flores lilas | `flower_purple` | — | (0, 0, 0) | Pétalos | — | — | — | Matita de 3 flores lilas (centro crema-amarillo) con hojas basales; estática, instanciada |
| Mata de pasto | `grass_tuft` | — | (0, 0, 0) | Tallos | — | — | — | 9 hojas abiertas hacia afuera con gradiente verde; estática, instanciada |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emisión | Alfa | Qué debe tener en cuenta el juego |
|---|---|---|---|---|---|
| Pétalos | Vértices (Pigment) | 0.0 / 0.6 | 0.0 | 1.0 | Colores por vértice (`Pigment`); sombreado suave de pétalos |
| Tallos | Vértices (Pigment) | 0.0 / 0.8 | 0.0 | 1.0 | Colores por vértice (`Pigment`) con degradado en el pasto |

## Diferencias con el brief

Ninguna.

## Sugerencias para integrar

Las 5 partes son elementos decorativos de suelo concebidos para instanciarse por cientos mediante `InstancedMesh` a lo largo de La Pradera, con rotación aleatoria en Y y escalas sutiles (0.7 a 1.3). El pivote está en la base (z=0 / y=0) para facilitar la siembra directa sobre el terreno.
