# Arte 3D de Blender — Walking AP Multi (El Océano)

Método común y reglas: `PLAN-3D-BLENDER.md` (raíz del sitio). Plan del nivel: `../PLAN-OCEANO-BLENDER.md`.
Cada modelo vive en su carpeta con `BRIEF.md` (encargo), `modelar-<pieza>.py` (fuente reproducible),
`.blend`, `.glb`, `.json` (`kit.export_parts`), renders y `ENTREGA.md`.

Regenerar una pieza (desde su carpeta):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-<pieza>.py
```

## Piezas

| Pieza | Carpeta | Estado |
|---|---|---|
| Pez protagonista | `pez/` | ✅ integrado (2026-09-15). Modelado por Astra (v1 + ronda 1); Claude fundió el pedúnculo con el cuerpo, cambió el aro del ojo por párpados de piel y agrandó el iris. |

### Pez protagonista

- 13 200 triángulos · 6 mallas · JSON 537 kB · 2.72 × 2.08 × 2.30 u (largo × alto × ancho).
- El juego lo carga en [src/3d/blender-fish.ts](../src/3d/blender-fish.ts) desde
  `src/3d/assets/pez.json` (copia del entregable; se pide al cargar el módulo, así que ya está
  en memoria cuando el jugador entra al nivel) y lo arma [player.ts](../src/3d/player.ts) `buildFish`.
- Partes y animación (de `pez/ENTREGA.md`): `body` estira ×1.15 en Z con la velocidad, `eyes`
  estáticos, `tail` guiña en Y ±0.15 rad a 6 rad/s, `fin` 0 y 1 giran en X ±0.4 rad a 10 rad/s,
  `dorsal` ondula en Z ±0.08 rad a 2 rad/s. El contenedor del pez recibe el estiramiento y el
  balanceo de reposo; la geometría ya viene proporcionada, su escala base es 1.
- El frente del modelo es +Z, igual que el avance del jugador: no lleva giro extra.
