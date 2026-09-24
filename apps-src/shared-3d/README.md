# shared-3d — librería común de modelos 3D

Fases A–C del plan de renovación (`AUDITORIA-JUEGOS-2026-09-24.md` §7). Carga los modelos de Blender de
todos los juegos con un solo código, en JSON (`kit.export_parts`, el formato de siempre) o en GLB, e
incluye el inspector, la prueba visual y las capturas con la luz de cada nivel.

**Ningún juego la usa todavía.** Se conectará en el piloto de La Pradera, con OK de Luis. No se publica
en `public/apps`: `npm run apps:check` solo corre sus tipos y pruebas.

```powershell
cd apps-src\shared-3d
npm install
npm run dev            # inspector en http://127.0.0.1:5190
npm run check          # tipos + pruebas (incluye ida y vuelta JSON -> GLB de todos los modelos)
npm run convert-all    # GLB de todos los modelos en .cache/glb + tabla de pesos
npm run compare        # prueba visual JSON vs GLB (requiere convert-all)
npm run capture -- --models=tortuga --preset=multi-2-oceano   # capturas + reporte de presupuestos
```

## Qué hay

| Archivo | Para qué |
|---|---|
| `src/model.ts` | Formato común (`ModelData`) y lectura del JSON |
| `src/glb.ts` | Lectura del GLB al mismo formato (se carga bajo demanda) |
| `src/load.ts` | `loadModel(url)` con caché; distingue JSON y GLB por la firma del archivo |
| `src/build.ts` | `buildModel` / `buildPart`: mallas iguales a las de los `blender-*.ts` actuales |
| `src/vertex-emission.ts` | Emisión por vértice (la de Batisfera, generalizada) |
| `src/dispose.ts`, `src/stats.ts` | Liberar memoria; triángulos, draw calls, materiales |
| `inspector/` | Visor de cualquier modelo de cualquier juego, con luz de nivel. Se puede arrastrar un `.glb`/`.json` a la ventana |
| `inspector/presets.ts` | Luz de los 5 niveles de Walking AP Multi, copiada de `environment.ts` |
| `scripts/json-to-glb.mjs` | Convertidor JSON → GLB (+ gltfpack). Lo usa también `kit.export_glb` |
| `scripts/compare-renders.mjs` | Prueba visual píxel a píxel en Chromium |
| `scripts/capture.mjs` | Capturas de aprobación y reporte de presupuestos (`presupuestos.json`) |
| `scripts/prueba-blender.py` | Prueba de `kit.export_glb` para correr con `bpy-run.ps1` |

## Contrato del GLB

- `scene.extras` = meta del modelo (anclas, colisionadores…: todo lo que el JSON tenía fuera de `meshes`).
- Un nodo por parte con `extras.part`, `extras.name` (GLTFLoader cambia espacios por `_`) y
  `segment`/`variant` si los hay. La traslación del nodo es el pivote.
- Emisión por vértice en `COLOR_1` (gltfpack descarta atributos propios).
- Color por vértice mayor que 1 (faroles): se guarda dividido y `material.extras.colorScale` lo restaura
  (gltfpack recorta a 1).
- `material.extras.emission` / `emissionColor`: los valores originales del Principled BSDF.

## Modos de compresión

| Modo | Qué hace | 33 modelos, con brotli |
|---|---|---:|
| JSON actual | — | 3 177 KB |
| `none` | GLB sin comprimir, idéntico al JSON | 3 600 KB |
| `meshopt` | meshopt sin cuantizar, color en 16 bits | 4 239 KB |
| **`meshopt-q`** | meshopt con cuantización (por defecto) | **1 583 KB** |

Con brotli (lo que sirve Vercel) solo el modo cuantizado gana: **la mitad** que el JSON. Además el
navegador no tiene que interpretar megas de texto.

## Qué se comprobó

- **Ida y vuelta de los 33 modelos de los 4 juegos** (`test/roundtrip.test.ts`): geometría, normales,
  color, emisión, pivotes, materiales y meta llegan iguales (tolerancia 1e-4) sin comprimir y con meshopt.
- **Prueba visual** (`npm run compare`, 2026-09-24): 33 modelos × 3 vistas = 99 comparaciones.
  - GLB sin comprimir y GLB exacto: **99/99 sin un solo píxel distinto** respecto al JSON.
  - GLB ligero: 25/99 idénticas; en el resto, píxeles sueltos en bordes finos. Peor caso: medusa luna de
    lado, 50 de 172 800 píxeles (0.03 %); promedio 0.003 %. No se distingue a simple vista.
- **Presupuestos** (`npm run capture`): 30 de 33 modelos dentro de la propuesta de `presupuestos.json`.
  Pasan: leviatán (29 774 tri), portal arcoíris (19 148) y unicornio (25 598), todos ya aprobados y
  publicados. Los límites son una propuesta por confirmar con Luis.
- **`kit.export_glb` en bpy 4.5.3** (el mismo de la PC de Luis): reproduce el JSON publicado del cangrejo
  byte a byte, exporta los tres modos y hornea AO en 2 s sin tocar la escena.

Hallazgos en modelos publicados (no se ven en el juego, se documentan):
- `salientes-roca` (48 triángulos), `barco-hundido` y `canasta` tienen triángulos de área cero; gltfpack
  los quita. Agrandaban la caja del modelo: la prueba visual encuadra todos los formatos con la del JSON.
- `barco-hundido`, casco: 4 vértices con normal cero en 2 triángulos.
- Colores por vértice mayores que 1 en `barco-hundido` (farol) y `cielo`: ver `colorScale`.

## Cómo la usará un juego (receta probada, sin aplicar)

1. Importar con ruta relativa: `import { loadModel, buildModel } from "../../../shared-3d/src";`
2. En su `vite.config.ts`: `resolve: { dedupe: ["three"] }`. **Sin esto el juego lleva dos copias de
   Three.js** (en Walking AP Multi el paquete pasó de 601 KB a 1 169 KB). Con `dedupe` queda en 633 KB
   (+32 KB) y el lector de GLB va aparte (69 KB, solo se descarga si el juego carga un GLB).
3. `npm run apps:install` instala todas las carpetas antes de compilar, así que los tipos de la librería
   ya están cuando se compila el juego.

## Blender: `kit.export_glb`

En `apps-src/grados-mayores-juego/art/blender/kit.py` (se queda ahí: ~30 scripts lo importan de esa ruta).

```python
kit.export_glb(ROOT / "modelo.glb", objects=objs, meta=meta,
               ao={"distance": 0.6, "strength": 0.85, "samples": 64},   # opcional
               pack="meshopt-q",                                        # o "meshopt" / "none"
               json_path=ROOT / "modelo.json")                          # opcional, mientras el juego lea JSON
```

Pasa por `export_parts` y por `json-to-glb.mjs`, así que el GLB sale igual que los probados aquí.
Necesita Node en el PATH y `npm install` en esta carpeta. `bake_ao` trabaja sobre copias con los
modificadores aplicados y deja la escena como estaba.
