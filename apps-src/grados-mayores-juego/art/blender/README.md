# Modelos de Blender — Expreso Tonal

`kit.py` reúne los generadores compartidos (conversión Three↔Blender, cajas, tornos, tubos,
remaches…). Cada modelo tiene su script reproducible.

## 1. Cabina de vapor

Modelada con el módulo oficial **bpy de Blender 4.5.3 LTS**, sin abrir el ejecutable de
Blender y sin depender de Codex. El diseño es propio; las fotos de referencia de Luis
solo aportaron ideas de forma y no se incluyen en el proyecto.

## Entregables

- `modelar-cabina.py` — fuente reproducible del modelo, las exportaciones y los renders.
- `cabina-vapor.blend` — escena editable, con modificadores de bisel y booleanos vivos.
- `cabina-vapor.glb` — el modelo para abrirlo en cualquier visor glTF.
- `cabina-vapor-pov.png` — render Cycles desde el ojo del maquinista (misma cámara que el juego).
- `cabina-vapor-vista.png` — render Cycles de conjunto (frente de caldera).
- `../../src/3d/assets/cabina-vapor.json` — geometría evaluada por Blender para el juego:
  mallas fusionadas por material, parámetros PBR, pivote de la palanca del silbato y el
  marco de cada manómetro (2.5 MB; 330 kB con gzip).

## Reglas de diseño que el script comprueba

- Las tres ventanas conservan las medidas validadas de la cabina anterior.
- `below_sightline()` falla la ejecución si una pieza cruza la visual ojo→borde inferior
  del parabrisas: la vía nunca se tapa.
- Se autora en el espacio local de la cabina de Three.js (Y arriba, el tren avanza a −Z)
  y se convierte a Blender (Z arriba) al crear cada malla.

## Reproducir (PowerShell, desde `apps-src/grados-mayores-juego`)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 art\blender\modelar-cabina.py
```

- `$env:CAB_RENDER='0'` omite los renders (≈3 s en vez de ≈40 s).
- `$env:CAB_SAMPLES='64'` ajusta la calidad de Cycles.

El Python 3.11 y bpy viven en `C:\Users\Luis\blender-bpy\` (instalación propia).

## Probar en el juego

`npm run dev` → http://127.0.0.1:5175, iniciar viaje. Arrastrar con el mouse para mirar
a los lados y hacia abajo (puerta del hogar, nivel de agua, freno); `B` tira la palanca.

La cabina incluye pared trasera con ventanillas redondas y el frente del ténder.

## 2. Tren de carga que se cruza

`modelar-tren-carga.py` → `tren-carga.blend` / `.glb` / `-vista.png` / `-loco.png` y
`../../src/3d/assets/tren-carga.json` (1.6 MB; 210 kB con gzip).

- Locomotora de vapor hermana de la cabina (caldera negra con flejes de latón, chimenea de
  diamante, farol, domo, campana, cabina rojo óxido con el 7), ténder con carbón y tres
  vagones: caja de madera con refuerzos en Z, góndola con carbón y cisterna.
- Color horneado en vertex colors y tres clases de material (pintura · metal · farol):
  cada pieza cuesta 2–3 draw calls; los vagones se instancian por tipo con tinte propio.
- Partes vivas exportadas aparte: rueda motriz (6 instancias), rueda del bogie delantero
  y las dos bielas, que en el juego giran o se trasladan con la distancia recorrida
  (manivelas a 90° entre lados).

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 art\blender\modelar-tren-carga.py
```

Para verlo pasar sin esperar: `npm run dev`, abrir con `?dev=1`, iniciar viaje y en consola
`ExpresoF2.journey.crossing.spawn({ distance: ExpresoF2.journey.train.distance + 70, fromLeft: false, fired: true })`.
