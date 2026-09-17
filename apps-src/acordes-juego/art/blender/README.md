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

---

# Calamar Vela — Batisfera

Modelado por Astra (Codex) con el flujo de `PLAN-3D-BLENDER.md` §6; integrado por Claude.
Encargo, entrega y fuente en `calamar-vela/` (`BRIEF.md`, `ENTREGA.md`, `modelar-calamar.py`).

- 11 partes, 11 714 triángulos, 4.55 u de largo; JSON copiado a
  `src/3d/creatures/assets/calamar-vela.json` (533 kB; 124 kB con gzip). Al regenerar el modelo,
  volver a copiarlo.
- `src/3d/creatures/blender-squid.ts`: manto y fotóforos comparten el pulso de propulsión
  (±9 %), las velas aletean acompañando al manto, brazos y tentáculos ondulan con fases
  distintas. Fotóforos y brazos toman el color de la familia del acorde; el par de brazos
  `segment = i` destella con la nota i. Sustituye al calamar de primitivas en `species.ts`.
- Inspector: http://127.0.0.1:5173/dev/calamar.html (séptimas / sextas, destello, captura, huida).
- Juego: `?debug=1`, zona 2 o 3, botón **Acercar Calamar Vela**.
- Verificado 2026-09-13: build y QA; en zona 2 se tocó, destelló por nota y huyó al fallar;
  sin errores de consola; 50–60 FPS en la PC de Luis. Zona 3 revisada: se distingue con el foco. Falta teléfono.

---

# Rape Abisal — Batisfera

Modelado por Astra (Codex), integrado por Claude. Encargo, entrega y fuente en `rape-abisal/`.

- v3 (ronda de corrección 1): 7 partes, 9 992 triángulos, 2.9 u de largo; JSON copiado a
  `src/3d/creatures/assets/rape-abisal.json` (458 kB; 107 kB con gzip). Al regenerar, volver a copiarlo.
- `src/3d/creatures/blender-angler.ts`: la caña gira desde su base y lleva colgado el señuelo
  (punta de caña = centro del señuelo, anotado en el JSON como `rodTip`); mandíbula, aletas y
  cola animadas desde sus pivotes con las amplitudes y frecuencias de `ENTREGA.md`. El señuelo toma el color de la familia, lleva el halo aditivo
  (`creatures/halo.ts`, ahora compartido) y parpadea una vez por nota. El cuerpo no emite: se ve
  con el foco del submarino. Sustituye al rape de primitivas en `species.ts`.
- Inspector: http://127.0.0.1:5173/dev/rape.html (sextas / novenas).
- Juego: `?debug=1`, zona 3 o 4, botón **Acercar Rape Abisal**.
- Verificado 2026-09-13: build y QA; en zona 3 se tocó, parpadeó, preguntó y huyó al fallar;
  sin errores de consola; ~55 FPS; el script de Astra regenera el mismo JSON con la instalación
  de Luis. v3 revisada también en zona 4 (señuelo magenta, silueta legible). Falta teléfono.

---

# Pulpo Dumbo — Batisfera

Modelado por Astra (Codex), integrado por Claude. Encargo, entrega y fuente en `pulpo-dumbo/`.

- 12 partes (cuerpo, 2 orejas, membrana y 8 brazos con `segment` 0–7), 11 820 triángulos, 2.7 u
  de alto; JSON copiado a `src/3d/creatures/assets/pulpo-dumbo.json` (536 kB; 130 kB con gzip).
  Al regenerar, volver a copiarlo. El script comprueba presupuesto, encuadre de cada render y el
  solape membrana–brazos.
- `src/3d/creatures/blender-dumbo.ts`: orejas, brazos (giro radial con fase por ángulo), membrana
  y respiración con los valores de `ENTREGA.md`. **Cada brazo destella con su nota** (los acordes del juego tienen hasta 5; sobran brazos en
  11ª/13ª) con el color de la familia. Sustituye al dumbo de primitivas en `species.ts`.
- Inspector: http://127.0.0.1:5173/dev/dumbo.html (novenas / oncenas y trecenas).
- Juego: `?debug=1`, zona 4 o 5, botón **Acercar Pulpo Dumbo**.
- Verificado 2026-09-13: build y QA; en zona 4 se tocó, destelló, preguntó novenas y huyó al
  fallar; sin errores de consola; ~60 FPS; el script regenera el mismo JSON. Falta zona 5 y teléfono.

---

# Sifonóforo — Batisfera

Modelado por Astra (Codex), integrado por Claude. Encargo, entrega y fuente en `sifonoforo/`.

- Cuatro piezas que el juego encadena: `head` (2 148 tri), `node` (492), `lantern` (128) y `tail`
  (820); separación de 0.42 u entre nodos; JSON copiado a `src/3d/creatures/assets/sifonoforo.json`
  (160 kB; 50 kB con gzip). Al regenerar, volver a copiarlo. El script comprueba presupuesto,
  uniones con ±0.25 rad y escala 0.9–1.1, y el encuadre de los renders.
- `src/3d/creatures/blender-siphonophore.ts`: curva recalculada por frame con separación exacta
  (onda X ±0.32 u, Z ±0.10 u, 0.18 ciclos/s, fase 0.40 rad por nodo); 14 `node` y 14 `lantern`
  con `InstancedMesh` (misma matriz, giro en espiral y ±10 % de escala), 4 llamadas de dibujo por
  colonia. La emisión de los faroles se multiplica por el color de instancia (`onBeforeCompile`)
  para encender un tramo por nota con el color de la familia. Sustituye al sifonóforo de primitivas.
- Inspector: http://127.0.0.1:5173/dev/sifonoforo.html (sextas / oncenas y trecenas).
- Juego: `?debug=1`, zona 3, 4 o 5, botón **Acercar Sifonóforo**.
- Verificado 2026-09-13: build y QA; en zona 3 se tocó, preguntó sextas y huyó al fallar; sin
  errores de consola; ~60 FPS; el script regenera el mismo JSON. Falta zonas 4–5 y teléfono.

---

# Leviatán — Batisfera

Modelado por Astra (Codex) en tres entregas (v1 y dos rondas de corrección), integrado por Claude.
Encargo, entrega y fuente en `leviatan/`.

- 19 piezas: `head` (con mandíbula, ojos y pectorales), `body` 1–8, `tail` y `plate` 0–8;
  29 774 triángulos. Pivotes en P0…P8 a 4.6 u; plate 0 comparte pivote con head y plate i con
  body i. JSON copiado a `src/3d/creatures/assets/leviatan.json` (1.3 MB; 265 kB con gzip). Al
  regenerar, volver a copiarlo. El script comprueba presupuesto y uniones con ±0.20 rad de giro y
  ±0.08 de cabeceo.
- `src/3d/creatures/blender-leviathan.ts`: rumbo por tramo con onda lateral (longitud 36.8 u,
  periodo 10 s, pendiente máxima ≈ 0.24 rad que crece del 60 % al 100 % hacia la cola) y cabeceo
  suave; el giro entre vecinas se limita a ±0.19 rad y el cabeceo a ±0.07. La cadena se centra en
  Z = 17 para que la esfera de click cubra el cuerpo. Cabeza y cola balancean según ENTREGA.md.
  Una piel compartida; cada placa tiene material propio (emisión × color de vértice vía
  `onBeforeCompile`) para encenderse por nota; el bramido de aparición es `pulse(9)`.
  19 llamadas de dibujo.
- Inspector: http://127.0.0.1:5173/dev/leviatan.html (oncenas y trecenas / séptimas; botón Bramido).
- Juego: `?debug=1`, zona 5, botón **Acercar Leviatán** (la primera pulsación fuerza que el
  siguiente spawn sea el Leviatán; la segunda lo trae a 26 u).
- Verificado 2026-09-14: build y QA; en zona 5 apareció, se activó a 25 m, preguntó oncenas y huyó
  al fallar; captura, huida y bramido en el inspector; sin errores propios en consola (los
  `computeBoundingSphere NaN` vienen de `Cockpit.render` y existían antes). Falta FPS y teléfono.

---

# Marco envolvente — Batisfera

Modelado por **Astra** (v3 + ronda extra de detalle v4, autorizada por Luis) a partir de
`marco-envolvente/BRIEF.md`; integrado por Claude el 2026-09-16. Recupera la sensación de
cúpula de cristal: tres ventanales (frontal y dos laterales en ángulo) con pilares delgados.

- 41 634 triángulos con consolas y `frameNarrow` · 14 módulos · JSON 1.6 MB (381 kB con gzip).
- El juego carga `src/3d/assets/cabina-envolvente.json` (copia del entregable; al regenerar, volver a copiarlo).
- Las consolas `consoleL/R/C` son idénticas a las de `cabina-scifi.json`. **No borrar
  `cabina-scifi.json`:** `modelar-marco.py` lo usa en cada ejecución para comprobar que consolas y
  esquinas del HUD no cambiaron (diferencia 0).
- Módulos nuevos con `screenSpace: true`: los vértices ya traen `(u·d, v·H·d, 1 − d)`; el juego los
  coloca en `(0, 0, −1)` con escala `(mitadAncho, 1, 1)`, sin la escala `k`. `wide: false` marca
  `frameNarrow`, que solo se dibuja con aspecto < 1.1. Fórmula completa en `marco-envolvente/ENTREGA.md`.
- El mundo se ve detrás a través del cristal curvo de `src/3d/dome-glass.ts`.

---

# Barco hundido — Batisfera (zona 1)

Primera pieza de `PLAN-ENTORNO-BLENDER.md`. Astra entregó v1–v3 desde `barco-hundido/BRIEF.md`; al
agotarse sus tokens, Claude hizo la v4 en el mismo `modelar-barco.py` (casco con proa afilada y
bovedilla, casco hundido en sedimento, esponjas de tubo y anémonas en lugar de formas de jarra,
cajas variadas, chorreones de óxido). Detalle en `barco-hundido/ENTREGA.md`.

- 34 244 triángulos · 5 partes (`ledge`, `hull`, `debris`, `growth`, `lamp`) · JSON 2.3 MB (510 kB con gzip).
- El juego carga `src/3d/assets/barco-hundido.json` (copia del entregable) con
  `src/3d/blender-shipwreck.ts`; lo coloca `environment.ts buildShipwreck()` a 84 u del eje, en
  y = −136, con el +Z local hacia la pared. Conserva las dos llamadas al RNG del prototipo para que
  el resto del decorado no cambie de sitio.
- `bubbleVents` → tres columnas de burbujas hasta la superficie (RNG propio). `lamp` late
  1.2 ± 0.15 con un ciclo de ~16 s y lleva una luz puntual débil.
- Inspección: `?debug=1` en dev → botón **Ver barco hundido**.

---

# Arcos de roca — Batisfera (zona 2)

Segunda pieza de `PLAN-ENTORNO-BLENDER.md`. Astra entregó v3 (dos rondas propias) desde
`arcos-roca/BRIEF.md`; Claude integró. Detalle en `arcos-roca/ENTREGA.md`.

- 27 062 triángulos · 2 variantes × 3 partes (`rock`, `growth`, `glow`) · JSON 1.9 MB (374 kB con gzip).
- El juego carga `src/3d/assets/arcos-roca.json` con `src/3d/blender-arches.ts`; `environment.ts
  buildArches()` coloca A, B, A espejado y B espejado a 96 u del eje, con el +Z local hacia la pared.
  Consume las 1 852 llamadas al RNG del prototipo para que el resto del decorado no cambie de sitio.
- `glow` (doble cara) respira 1.3 ± 0.25 a 0.055 Hz, fase A = 0 y B = 1.7 rad.
- Inspección: `?debug=1` en dev → botón **Ver arcos de roca**.
