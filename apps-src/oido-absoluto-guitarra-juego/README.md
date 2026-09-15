# Resonancia — prototipo de Oído Absoluto Guitarra

Prototipo aislado del modo juego para la app de oído absoluto con guitarra clásica.
No está conectado al catálogo, a rutas de Next.js ni a `public/apps`.

```powershell
npm install
npm run dev
npm run build
```

URL local: `http://127.0.0.1:5178/`

Las muestras se reproducen desde el mismo bucket R2 que usa `apps-src/ap-guitar`.

El progreso se guarda en el navegador: respuestas correctas y totales por
altura y cuerda, sesiones, mejor racha y niveles completados. La pantalla
**Bitácora del luthier** resume estos datos sin requerir una cuenta.

## Verificación local

Durante desarrollo, `http://127.0.0.1:5178/?qa=1` reduce temporalmente la meta
a tres aciertos y muestra controles de prueba para recorrer error, repetición,
apertura de la roseta y victoria. Ese panel no se incluye en builds de producción.
También usa una clave de almacenamiento separada, por lo que las pruebas no
alteran la bitácora normal.

## Autómata luthier (Blender)

Modelado por Claude con bpy (2026-09-14). Fuente y renders en `art/blender/robot/`.

- `modelar-robot.py` genera `robot.json` (kit.export_parts, 21 548 tri, 16 partes), `robot.glb`,
  `robot.blend` y tres renders. Frente hacia −Z; pies en y = −0.45.
- Partes con pivote en su articulación: `torso` (cadera), `pack` (mochila con forma de caja de
  guitarra), `core` (boca luminosa), `head`, `eyes`, `halo` 0–2, `upperArm`/`forearm` (hombro y codo)
  y `thigh`/`shin` (cadera y rodilla), con `segment` 0 = lado +X. `meta.parents` define la jerarquía.
- `src/robot.ts` arma la jerarquía y anima el paso: muslo y brazo opuestos, rodilla que se dobla en
  el avance, codo flexionado, balanceo de cadera y mochila. `animateRobot` devuelve `true` en cada
  pisada.
- Pisadas: `src/assets/pasos-robot.mp3` (37 KB, 6 variaciones de 0.33 s cada 0.5 s), recortadas del
  WAV de pasos. `GuitarAudio.playFootstep` las reproduce con Web Audio, sin repetir la anterior y
  con ±7 % de tono; el volumen sigue a la velocidad. El contexto se habilita en el primer clic.
- El JSON se copia a `src/assets/robot.json`: al regenerar, volver a copiarlo.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\oido-absoluto-guitarra-juego\art\blender\robot\modelar-robot.py
```
