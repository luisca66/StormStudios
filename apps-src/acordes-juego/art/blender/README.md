# Medusa Luna — piloto local de Batisfera

Modelo original creado con el módulo oficial bpy de Blender 4.5.3 LTS y Python 3.11.15. No requiere abrir ni descargar el ejecutable de Blender.

## Entregables

- `medusa-luna.blend`: escena editable, modificadores, materiales, animación, cámara e iluminación.
- `medusa-luna.glb`: modelo con las acciones activas combinadas en una animación de cuatro segundos.
- `medusa-luna-preview.png`: render Cycles de 1100 × 1100, 32 muestras y denoising.
- `modelar-medusa.py`: fuente reproducible del modelo y de todas las exportaciones.
- `../../src/3d/creatures/assets/medusa-luna.json`: geometría evaluada, normales y pivotes de Blender para el juego.

## Dirección visual y referencia

Interpretación estilizada de la medusa luna: campana festoneada, canales radiales, cuatro anillos interiores, cuatro brazos orales plegados y 24 filamentos en ocho grupos animables. Paleta de estudio: agua `#061A27`, membrana rosa translúcida, motas berenjena, brazos ciruela y filamentos rosa pálido, según la foto aportada por el usuario. El juego conserva esta pigmentación en todas las familias de acordes y varía la intensidad del destello.

Se inspeccionó visualmente esta [fotografía del National Aquarium publicada por Meanderings Abound](https://meanderingsabound.com/2013/06/06/jellies-invasion-exhibit-at-national-aquarium-baltimore/), en particular [esta imagen](https://meanderingsabound.com/wp-content/uploads/2013/05/p5200538.jpg). Es referencia de forma; no se incluye como textura ni se redistribuye con el juego.

Tras el primer render se suavizó la terminación de los brazos y se retiraron los extremos de los canales de la coronilla. La vista de inspección mantiene la tipografía del sistema, el modelo como foco y controles en una columna lateral; en pantallas estrechas los controles pasan debajo.

## Reproducir desde la raíz del repositorio, en PowerShell

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\acordes-juego\art\blender\modelar-medusa.py
```

Python 3.11 y bpy 4.5.3 viven en `C:\Users\Luis\blender-bpy\` (instalación propia, ver `PLAN-3D-BLENDER.md` en la raíz).

El script reemplaza únicamente sus entregables y el JSON generado. No abre ni modifica los archivos del proyecto de carreras de Jonas.

## Prueba local

Desde `apps-src/acordes-juego`:

```powershell
npm run dev -- --port 5183 --strictPort
```

- Inspección: http://127.0.0.1:5183/dev/medusa.html
- Juego: http://127.0.0.1:5183/?debug=1

En el juego, iniciar una inmersión y pulsar **Acercar Medusa Luna** cuando haya aparecido una. Ese botón se habilita únicamente en desarrollo y en el panel debug. Después se puede hacer clic en la criatura y contestar el acorde normalmente. La página de inspección usa `Creature` y la fábrica real de la especie para los destellos, captura y huida; centra el ejemplar y permite girar la cámara. Sus destellos son visuales, sin audio.

## Integración y comprobaciones

El JSON se descarga una vez antes de iniciar el juego y queda separado del JavaScript; el inicio muestra un botón de reintento si la carga falla. Three.js monta `BufferGeometry` con los vértices y normales exportados por Blender. No genera la anatomía. Cada instancia posee sus materiales y geometrías, que `Creature.dispose()` libera al retirarla.

- 17 mallas, 23,104 triángulos y 17 llamadas de dibujo por medusa.
- Aproximadamente 60 FPS observados en la vista de una criatura, en esta computadora; no constituye una medición en teléfonos ni con seis medusas simultáneas.
- `npm run build` y `npm run qa`: correctos. El QA existente incluye 150 preguntas, acordes, zonas, modos, escucha y progresión.
- Comprobados en navegador: modelo, selección de familia sin sustituir la pigmentación rosa/ciruela, luz de profundidad, destello, captura y huida en inspector; selección y respuesta incorrecta con huida dentro de Batisfera. Sin errores/advertencias en las consolas revisadas.
- Validación de posiciones/normales finitas, índices en rango, encabezado GLB y presencia de animación.
- El inspector está fuera de las entradas del build; no se copia a `public/apps`. No se ejecutó deploy ni publicación.

Antes de publicar conviene aprobar el estilo y probar varios ejemplares simultáneos en dispositivos objetivo. La iluminación de Cycles y la de tiempo real no son idénticas.

---

# Cabina sci-fi — Batisfera

Modelada con bpy 4.5.3 según `BRIEF-CABINA-SCIFI.md` y el concepto v1 aprobado por Luis
(`cabina-scifi-concepto-v1.png`). Reemplaza la esfera de cristal y el marco CSS (aro,
costillas, consola cenital).

## Entregables

- `modelar-cabina.py` — fuente reproducible (usa `kit.py` del Expreso Tonal).
- `cabina-scifi.blend` / `cabina-scifi.glb` — escena y modelo armados en 16:9.
- `cabina-scifi-pov.png` — render Cycles desde el asiento del piloto (FOV vertical 60°).
- `../../src/3d/assets/cabina-scifi.json` — geometría evaluada por módulo y material
  (0.69 MB; 124 kB con gzip).

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 art\blender\modelar-cabina.py
```

`$env:CAB_RENDER='0'` omite el render; `$env:CAB_SAMPLES='n'` ajusta la calidad.

## Encuadre adaptable

La cabina son 10 módulos anclados a bordes de pantalla (`cockpit.ts` repite el cálculo
del script):

| Módulo | Ancla | Contenido |
|---|---|---|
| `railTop` / `railSill` | arriba / abajo, centro | rieles de perfil extruido; se **estiran en X** |
| `header` | arriba-centro | placa BTH con barra cian |
| `cornerL/R` | esquinas superiores | chaflán, pilar doble con rendija (ventana lateral), luz cian, cables |
| `chamferL/R` | esquinas inferiores | chaflán inferior del ventanal |
| `consoleL/R` | esquinas inferiores (d = 0.86) | consolas inclinadas: pantalla del sonar / de datos, perilla, interruptores, asa |
| `consoleC` | abajo-centro (d = 0.9) | consola baja con el hueco de las respuestas |

- Escala de piezas `k = clamp(mitadAncho / 1.03, 0.45, 1)`; con aspecto < 1.1 no se
  dibujan las consolas laterales y el HUD pasa a su disposición compacta.
- Cada `resize` fusiona la geometría por material: **8 llamadas de dibujo** en total.
  17 732 triángulos en panorámico.
- Se dibuja en una segunda pasada (`clearDepth`) con cámara y luces propias: no la tiñe
  el agua, no la ilumina el foco y ninguna criatura la atraviesa.
- El JSON exporta las esquinas de las tres pantallas; `HUD.setLayout()` coloca encima el
  sonar, los datos y la consola HTML reales (texto, botones y accesibilidad sin cambios).

## Validación (2026-09-13)

- `npm run build` y `npm run qa` correctos; sin errores de consola en la partida.
- Probado con medusa y cardumen a la vista, pregunta con respuesta, pausa y abortar.
- Aspectos revisados: 907×678 (1.34), 1400×600 (2.33), 740×360 táctil (2.06) y
  375×812 táctil (vertical). ~60 FPS en la PC de Luis; falta medirlo en un teléfono real.
- Inspección: `npm run dev` → http://127.0.0.1:5173/?debug=1 (botones **Acercar Medusa
  Luna** y **Acercar Cardumen Prisma**); cambiar el tamaño de la ventana recoloca la cabina.
