# Storm Sequencer v5 — estado y relevo

Arranque: 14 de noviembre de 2026. Última actualización: 15 de noviembre de 2026 (Claude Fable 5.2). Este documento es el punto de entrada para quien continúe: Opus, Codex (Sol / Astra) o Gemini. Léelo completo antes de tocar código.

## Qué es

Un estudio de armonía de **una sola pantalla**, con Cubase como referencia: transporte arriba, pistas a la izquierda, editor al centro (partitura o editor de teclas), inspector a la derecha y una zona inferior con pestañas. Vive en `/es/sequencer/v5` y `/en/sequencer/v5` (`noIndex`, enlazada desde la página del curso).

La v3 (`/sequencer`) y la v4 (`/sequencer/v4`) **no se tocan**: tienen videos hechos. La v5 reutiliza el modelo, el audio y las vistas de la v4, no los modifica.

## Decisiones de Luis (no reabrir)

1. **Tiene que servir para hacer el curso.** El flujo guion → stills → video (`docs/secuenciador-stills.md`, `.claude/skills/video-leccion/SKILL.md`) sigue usando la v4 y su página `stage`; la v5 no lo rompe y comparte el mismo formato de partitura.
2. **Nada de «Maestro en vivo».** El secuenciador no corrige ni marca errores mientras el alumno escribe: «porque no van a pensar». La corrección sigue siendo entregar el ejercicio al Maestro Virtual.
3. **La magia es solo para Luis (modo autor).** Repartir voces, armonizar, revisar con las reglas y transportar existen, pero el alumno no los ve ni los recibe. Ver «Modo autor».
4. Referencia de diseño: Cubase (Luis usa Cubase 16).
5. **Publicación autorizada por Luis el 15 de noviembre de 2026**, conservando las versiones 3 y 4 y sus rutas. La v5 se publica en su ruta propia.

## Qué ya funciona (verificado en navegador el 2026-11-15)

Público (lo que recibe el alumno):

- Estudio de una pantalla, sin scroll de página; en pantallas más angostas oculta inspector y pistas.
- Transporte: inicio, detener, reproducir, final, repetir, metrónomo; pantalla con posición, tempo editable, tono · compás y acorde vigente; volumen general.
- Pistas con mezclador integrado: voz activa, M / S, instrumento y volumen por voz. Modo Melodía / SATB.
- Editor: partitura continua o **por páginas** (`ScoreView` de la v4) y editor de teclas (`PianoRoll` de la v4), con escritura, arrastre, borrado y **selección por rectángulo con el mouse en las dos vistas** (en teclas la añade `RollMarquee.tsx`, que envuelve a `PianoRoll` sin tocarlo y además centra la vista en la música escrita).
- Herramientas: escribir / seleccionar / borrar, figuras, puntillo, tresillo, ligadura, ornamento (nota roja), alteraciones, deshacer / rehacer, mostrar u ocultar cifrado.
- Teclado de computadora (en toda la pantalla): Espacio, A–G (con la armadura y la octava más cercana a la nota anterior), R, 1–6, punto, T, flechas, Inicio / Fin, Re Pág / Av Pág, Supr, Esc, Ctrl+Z / Y / C / X / V / D / A / S, M, L.
- **Teclado MIDI** (botón MIDI; Web MIDI en Chrome y Edge): cada tecla escribe la nota en el cursor con la figura elegida y la grafía de la armadura; las teclas simultáneas forman un acorde.
- **Micrófono** (botón Mic): cantar o tocar escribe cada nota sostenida, una sola vez. Se pausa al reproducir y no suena al escribir, para no transcribirse a sí mismo. El audio no sale de la computadora. «Escribir a» permite transponer solo la entrada del micrófono −24, −12, 0, +12 o +24 semitonos; muestra la nota escuchada y la escrita y no cambia las notas existentes ni la entrada MIDI.
- Inspector: cursor, notas o acordes por texto, armadura, compás (lista, numerador y denominador libres, con re-barrado), clave por voz, **insertar / quitar / copiar compases**, transponer por semitonos u octavas, duplicar selección, aplicar notas a la selección, texto de la nota.
- **Clic derecho en el editor** abre el menú de herramientas en el puntero (Escribir / Seleccionar / Borrar, teclas E / S / B o 1 / 2 / 3; sobre una nota, además «Borrar esta nota»). En la v5 el clic derecho ya no borra directo. Componente: `ToolMenu.tsx`.
- **Arrastrar una nota seleccionada mueve toda la selección** (con Escribir o Seleccionar): en la partitura por grados del pentagrama con la armadura de cada compás; en el editor de teclas por semitonos y en el tiempo. Lógica en `lib/sequencer/group-move.ts`; `ScoreView` y `PianoRoll` solo lo hacen si la v5 pasa `dragWithSelect`, así la v4 no cambia.
- **Snap** (como en Cubase), selector en la barra: «Figura activa» (el valor por omisión, igual a la figura elegida) o una rejilla fija de redonda a fusa, con tresillos de negra, corchea y semicorchea. Gobierna dónde cae una nota al escribir, al moverla y la duración al estirarla en teclas. La rejilla se cuenta desde la barra de compás; al mover, lo que redondea a la barra cae en el tiempo 1 del compás siguiente (`snapTick`), y al escribir con clic se queda en el último punto de la rejilla del compás pulsado (`snapWriteTick`). Nunca queda una nota fuera de la rejilla. En la partitura, el arrastre horizontal mueve la nota (o la selección) en el tiempo, incluso a otro compás, y una línea punteada marca dónde caerá; el tiempo se lee en el renglón donde empezó el arrastre, así que subir o bajar solo cambia la altura. Llega a `ScoreView` y `PianoRoll` como `mouse.snap` y `mouse.onMoveStaff`; sin ellos (en la v4) todo queda igual.
- **«+ Compás» siempre añade al final** y no recorre nada. «Insertar aquí» pone un compás vacío donde está el cursor (el compás actual y lo que sigue se recorren a la derecha).
- **Pista de acordes**: el cifrado se escribe bajo cada pulso de la partitura o como progresión de texto («I IV V I», «C F G/B C») cada 1, 2, 3 o 4 pulsos. Romano y americano diatónico. No genera notas ni corrige.
- **Pista de marcadores**: las escenas sobre una regla de compases (título, rango, formato 16:9 o 9:16, explicación, voz resaltada). «Presentar» muestra la escena sola, con pantalla completa y exportación PNG / SVG.
- **Lista de notas** accesible (lectores de pantalla y agentes) y anotaciones de texto.
- Entrada por texto (misma gramática de la v4) con ejemplos, validación y aplicación.
- Archivo: nuevo, abrir JSON / MusicXML, guardar JSON, exportar MIDI, MusicXML, WAV, PNG y SVG. Autoguardado local; la primera vez adopta el borrador de la v4.
- Zona inferior de alto ajustable (se arrastra el borde; recuerda el alto).
- API de agentes `window.stormSequencer` (la misma de la v4).

Modo autor (solo Luis):

- **Repartir la pista de acordes a 4 voces.**
- **Armonizar la soprano escrita** (hasta 4 progresiones distintas para elegir).
- **Revisar con las reglas del curso**: construcción de acordes, 5as y 8as, movimientos melódicos y tabla de enlaces, con compás y pulso de cada observación. Para comprobar un ejemplo antes de grabarlo.
- **Pasar todo a otra tonalidad**: transporte por intervalo escrito (conserva la grafía de cada grado); avisa si alguna voz queda fuera de tesitura.

## Arquitectura

```
app/[locale]/sequencer/v5/page.tsx        ruta (noIndex)
components/sequencer/v5/
  StudioV5.tsx        interfaz: barra, pistas, editor, inspector, zona inferior, atajos
  useStudio.ts        estado y acciones (partitura, historial, selección, cursor, audio, archivos)
  ChordPanel.tsx      pista de acordes
  ScenesPanel.tsx     pista de marcadores (escenas)
  RollMarquee.tsx     selección por rectángulo y centrado inicial del editor de teclas
  Stage.tsx           presentación de una escena y exportación de imagen
  EventsPanel.tsx     lista de notas y anotaciones de texto
  TextPanel.tsx       entrada por texto
  useMidiInput.ts     teclado MIDI (Web MIDI)
  useMicInput.ts      micrófono (getUserMedia + AnalyserNode)
  AuthorPanel.tsx     MODO AUTOR — solo con la variable de entorno
  studio.module.css   estilos; repite las variables --paper, --v-*, etc. que leen ScoreView/PianoRoll
lib/sequencer/
  measure-edit.ts     insertar, quitar y copiar compases completos
  midi-input.ts       grafía de una tecla MIDI según la armadura; agrupar teclas en acordes
  mic-input.ts        detector de altura (YIN) y separador de notas
lib/sequencer/harmony/
  chords.ts           lee cifrado romano y americano → acorde del material del curso (público)
  chord-track.ts      la pista = anotaciones `kind:"roman"` de la v4; leer y escribir a mano (público)
  voicing.ts          todas las disposiciones SATB correctas de un acorde (autor)
  realize.ts          progresión → 4 voces, búsqueda en haz con las reglas del curso (autor)
  harmonize.ts        melodía de soprano → progresiones + voces (autor)
  score-bridge.ts     escribe el resultado en la partitura (autor)
  review.ts           revisión de la partitura con las reglas del curso (autor)
  transpose.ts        transporte a otra tonalidad por intervalo escrito (autor)
e2e/sequencer-v5.spec.ts   8 pruebas de la pantalla contra el build de producción
```

Reglas de la casa:

- **La interfaz no modifica la partitura por su cuenta**: todo pasa por `commit` de `useStudio`, que valida con `validateScore` y guarda historial. La única excepción es la mezcla en vivo (`patchVoice`, `setMasterVolume`), que no entra al historial.
- **El formato de partitura no cambió** (`Score` versión 1). La pista de acordes son las anotaciones romanas que la v4 ya tenía y los marcadores son sus escenas, así que un proyecto de la v5 se abre en la v4 y viceversa. Si algo nuevo necesita datos nuevos, hay que añadirlos también a `validateScore` (validación estricta) y pensar en la v4.
- **El motor no inventa teoría**: usa las mismas funciones del Maestro Virtual (`lib/maestro-virtual/voice-leading.ts`, `satb-chords-validator.ts`, `harmonic-material.ts`). Las pruebas pasan cada resultado por esos validadores; si el Maestro cambia una regla, el motor la hereda.
- `ScoreView` y `PianoRoll` traen estilos de `sequencer.module.css`; algunas reglas de la v4 están declaradas bajo su raíz `.studio` y **no aplican** en la v5. Las que hacen falta están copiadas en `studio.module.css` (sección «Reglas que la v4 declara bajo su propia raíz»). Si una vista se ve rota en la v5, mira primero ahí.
- Una función del navegador guardada en una propiedad pierde su `this` (`setTimeout` dio «Illegal invocation» en el teclado MIDI). Envolverla: `(run, ms) => setTimeout(run, ms)`.

## Modo autor (lo que el alumno nunca debe recibir)

- Se activa solo si `NODE_ENV === "development"` y `NEXT_PUBLIC_SEQUENCER_AUTHOR=1` (preferentemente en `.env.development.local`, ignorado por git y nunca cargado en `next build`). En cualquier build de producción (`next build` / `cf:build` / `cf:deploy`), la pestaña no aparece y `AuthorPanel` ni sus módulos de armonización entran al bundle.
- Para usarlo: `preview_start` con la configuración `sequencer` (puerto 3100, `next dev`) y abrir `http://localhost:3100/es/sequencer/v5`.
- **Nunca** importar `score-bridge.ts`, `realize.ts`, `harmonize.ts`, `voicing.ts`, `review.ts` ni `transpose.ts` desde un archivo público (protegido por `no-restricted-imports` en `eslint.config.mjs`). `StudioV5` solo importa `chord-track.ts` y `chords.ts`.
- **Nunca** poner la variable en Cloudflare ni en `.env.example`.
- Verificación automática: `postbuild` (`scripts/verify-no-author-bundle.mjs`) escanea `.next/static` y falla el build si aparece cualquier símbolo del modo autor en los chunks públicos. La primera prueba de `e2e/sequencer-v5.spec.ts` también lo comprueba en CI.

### Alcance actual del motor

Tríadas diatónicas del **modo mayor** en las 15 tonalidades, estados fundamental, 6/3 y 6/4, una sola tonalidad por pasada. Reglas: tesituras y separaciones de la Lección 6, sin cruce, sensible sin duplicar, disminuido completo; movimientos armónicos y melódicos de Medrano (pp. 13–15); para armonizar, tabla de enlaces y continuaciones obligadas (pp. 15–17). Si no existe solución con las reglas, lo dice en la barra de estado en vez de escribir algo incorrecto.

## Lo que falta

La paridad con la v4 quedó completa el 2026-11-15 (inventario original en `docs/secuenciador-paridad-v3-v4.md`).

### Para publicar y enlazar

1. **Visto bueno recibido** de Luis el 15 de noviembre de 2026 para publicar conservando la v3 y la v4.
2. **Video y lección «P04.2 – Uso del Secuenciador v5»**, con el patrón de `content/course/*/p04-1-secuenciador-v4.mdx` (las lecciones P04.x acompañan a un video de Luis). Entrada de blog publicada en ES/EN: `2026-11-15-storm-sequencer-v5`. Luis pidió enlazarla desde `app/[locale]/curso-armonia/page.tsx` el 15 de noviembre: las tarjetas aparecen en orden v3, v4 y v5, como pidió Luis. Sigue siendo `noIndex`.

### Por probar con equipo real

**Teclado MIDI y micrófono** están probados con dispositivos simulados (pruebas unitarias y Playwright), no con un teclado ni una voz reales. Si el micrófono escribe notas de más o de menos, ajustar `holdMs`, `releaseMs` y `toleranceCents` de `NoteSegmenter` y el umbral `silence` de `detectPitch` (`lib/sequencer/mic-input.ts`).

### Mejoras siguientes

1. **Pista de acordes como carril propio** sobre la partitura (hoy son las casillas bajo cada pulso más la lista de la zona inferior). En la partitura el cifrado se ve dos veces, dibujado y en la casilla editable; es herencia de `ScoreView`.
2. **Stills y video desde el estudio**: hoy siguen saliendo del flujo de la v4 (`npm run stills`, página `stage`). Las escenas de la v5 no son todavía el storyboard.
3. Motor (modo autor): modo menor, acordes de séptima, modulación dentro de una pasada, preferencias de cadencia (`cadences-validator.ts`), 6/4 al armonizar. Cada ampliación entra con su lección del curso y con pruebas contra el validador correspondiente. **No inventar reglas**: si el curso aún no las da, no se implementan.
4. El volumen y el instrumento de una voz cambiados durante la reproducción se oyen hasta la siguiente vez que se pulsa reproducir.
5. En pantallas menores de 860 px se ocultan las pistas: no hay forma de cambiar de voz ahí. El móvil no es prioridad (el secuenciador es de escritorio).

## Reparto sugerido

- **Opus**: coordinar, revisar cada PR y cuidar las decisiones de Luis de arriba. Ampliaciones del motor (mejora 3), porque exigen leer el curso con cuidado.
- **Codex — Sol** (código): stills y video desde el estudio (mejora 2); ajustes del micrófono y del MIDI cuando Luis los pruebe con equipo real.
- **Codex — Astra** (visual): carril de acordes (mejora 1) y pulido del estudio.
- **Gemini**: tareas de receta cerrada — revisar los textos en inglés de `components/sequencer/v5`, redactar el borrador de la lección P04.2 y de la entrada de blog. Recordar que `agy` solo escribe dentro de `apps-src`: sus borradores se copian después.

## Cómo comprobar

```bash
npx vitest run lib/sequencer
```

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build
```

```bash
npx playwright test e2e/sequencer-v5.spec.ts --workers=2
```

Las pruebas de Playwright corren contra el build de producción en el puerto 3100: hay que detener antes el servidor de desarrollo `sequencer`, o la primera prueba fallará a propósito (en desarrollo el modo autor está encendido).

Manual: abrir `/es/sequencer/v5`, poner modo SATB, escribir «I VI IV II V6 I IV V I» en la pista de acordes (cada 2 pulsos), abrir «Modo autor» → «Repartir…»; reproducir con Espacio; «Revisar con las reglas del curso» debe decir «sin observaciones». Después borrar todo menos la soprano y probar «Armonizar la soprano escrita».

Flujo de git: rama `claude/…` o `codex/…` → PR → checks verdes → merge. `main` se publica solo (Workers Builds).
