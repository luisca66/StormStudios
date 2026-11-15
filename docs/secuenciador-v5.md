# Storm Sequencer v5 — estado y relevo

Fecha de arranque: 14 de noviembre de 2026 (Claude Fable 5.2). Este documento es el punto de entrada para quien continúe: Opus, Codex (Sol / Astra) o Gemini. Léelo completo antes de tocar código.

## Qué es

Un estudio de armonía de **una sola pantalla**, con Cubase como referencia: transporte arriba, pistas a la izquierda, editor al centro (partitura o editor de teclas), inspector a la derecha y una zona inferior con pestañas. Vive en `/es/sequencer/v5` y `/en/sequencer/v5` (`noIndex`, todavía sin enlaces desde el sitio).

La v3 (`/sequencer`) y la v4 (`/sequencer/v4`) **no se tocan**: tienen videos hechos. La v5 reutiliza el modelo, el audio y las vistas de la v4, no los modifica.

## Decisiones de Luis (no reabrir)

1. **Tiene que servir para hacer el curso.** El flujo guion → stills → video (`docs/secuenciador-stills.md`, `.claude/skills/video-leccion/SKILL.md`) sigue usando la v4 y su página `stage`; la v5 no lo rompe y comparte el mismo formato de partitura.
2. **Nada de «Maestro en vivo».** El secuenciador no corrige ni marca errores mientras el alumno escribe: «porque no van a pensar». La corrección sigue siendo entregar el ejercicio al Maestro Virtual.
3. **La magia es solo para Luis (modo autor).** Repartir voces y armonizar existen, pero el alumno no los ve ni los recibe. Ver «Modo autor».
4. Referencia de diseño: Cubase (Luis usa Cubase 16).

## Qué ya funciona (verificado en navegador el 2026-11-14)

- Estudio de una pantalla, sin scroll de página; se adapta a pantallas más angostas ocultando inspector y pistas.
- Transporte: inicio, detener, reproducir, final, repetir, metrónomo; pantalla con posición, tempo editable, tono · compás y acorde vigente; volumen general.
- Pistas con mezclador integrado: voz activa, M / S, instrumento y volumen por voz (en vivo, sin detener la reproducción). Modo Melodía / SATB.
- Editor: partitura continua (`ScoreView` de la v4) y editor de teclas (`PianoRoll` de la v4), con escritura, arrastre, borrado y selección por rectángulo con el mouse.
- Herramientas: escribir / seleccionar / borrar, figuras, puntillo, tresillo, ligadura, alteraciones, deshacer / rehacer.
- Teclado (en toda la pantalla): Espacio, A–G (con la armadura y la octava más cercana a la nota anterior), R, 1–6, punto, T, flechas, Inicio / Fin, Re Pág / Av Pág, Supr, Ctrl+Z / Y / C / X / V / D / A / S, M, L.
- Inspector: cursor, notas o acordes por texto, armadura, compás (con re-barrado), clave por voz, transposición de octava y duplicado de la selección.
- **Pista de acordes** (pública): el cifrado se escribe bajo cada pulso de la partitura o como progresión de texto («I IV V I», «C F G/B C») repartida cada 1, 2, 3 o 4 pulsos. Acepta romano y americano diatónico. No genera notas ni corrige.
- Entrada por texto (misma gramática de la v4) con ejemplos, validación y aplicación.
- Archivo: nuevo, abrir JSON / MusicXML, guardar JSON, exportar MIDI, MusicXML y WAV. Autoguardado local; la primera vez adopta el borrador de la v4.
- API de agentes `window.stormSequencer` (la misma de la v4).
- **Modo autor**: repartir la pista de acordes a 4 voces y armonizar la soprano escrita (ofrece hasta 4 progresiones distintas).

## Arquitectura

```
app/[locale]/sequencer/v5/page.tsx        ruta (noIndex)
components/sequencer/v5/
  StudioV5.tsx        interfaz: barra, pistas, editor, inspector, zona inferior, atajos
  useStudio.ts        estado y acciones (partitura, historial, selección, cursor, audio, archivos)
  ChordPanel.tsx      pista de acordes (público)
  TextPanel.tsx       entrada por texto
  AuthorPanel.tsx     MODO AUTOR — solo con la variable de entorno
  studio.module.css   estilos; repite las variables --paper, --v-*, etc. que leen ScoreView/PianoRoll
lib/sequencer/harmony/
  chords.ts           lee cifrado romano y americano → acorde del material del curso (público)
  chord-track.ts      la pista = anotaciones `kind:"roman"` de la v4; leer y escribir a mano (público)
  voicing.ts          todas las disposiciones SATB correctas de un acorde (autor)
  realize.ts          progresión → 4 voces, búsqueda en haz con las reglas del curso (autor)
  harmonize.ts        melodía de soprano → progresiones + voces (autor)
  score-bridge.ts     escribe el resultado en la partitura (autor)
  harmony.test.ts     14 pruebas
```

Reglas de la casa:

- **La interfaz no modifica la partitura por su cuenta**: todo pasa por `commit` de `useStudio`, que valida con `validateScore` y guarda historial.
- **El formato de partitura no cambió** (`Score` versión 1). La pista de acordes son las anotaciones romanas que la v4 ya tenía, así que un proyecto de la v5 se abre en la v4 y viceversa. Si algo nuevo necesita datos nuevos, hay que añadirlos también a `validateScore` (zod/validación estricta) y pensar en la v4.
- **El motor no inventa teoría**: usa las mismas funciones del Maestro Virtual (`lib/maestro-virtual/voice-leading.ts`, `satb-chords-validator.ts`, `harmonic-material.ts`). Las pruebas pasan cada resultado por esos validadores; si el Maestro cambia una regla, el motor la hereda.
- `ScoreView` y `PianoRoll` traen estilos de `sequencer.module.css`; algunas reglas de la v4 están declaradas bajo su raíz `.studio` y **no aplican** en la v5. Las que hacen falta están copiadas en `studio.module.css` (sección «Reglas que la v4 declara bajo su propia raíz»). Si una vista se ve rota en la v5, mira primero ahí.

## Modo autor (lo que el alumno nunca debe recibir)

- Se activa solo si `NEXT_PUBLIC_SEQUENCER_AUTHOR=1`. Esa línea está en el `.env.local` de la PC de Luis (ignorado por git). En producción la variable no existe: la pestaña no aparece y `AuthorPanel` no se importa.
- Para usarlo: `preview_start` con la configuración `sequencer` (puerto 3100) y abrir `http://localhost:3100/es/sequencer/v5`.
- **Nunca** importar `score-bridge.ts`, `realize.ts`, `harmonize.ts` ni `voicing.ts` desde un archivo público. `StudioV5` solo importa `chord-track.ts` y `chords.ts`.
- **Nunca** poner la variable en Cloudflare ni en `.env.example`.
- Verificación tras cada cambio que toque esto: compilar sin la variable y buscar en `.next/static` las cadenas `author-voice` y `Repartir la pista`; no deben aparecer.

### Alcance actual del motor

Tríadas diatónicas del **modo mayor** en las 15 tonalidades, estados fundamental, 6/3 y 6/4, una sola tonalidad por pasada. Reglas: tesituras y separaciones de la Lección 6, sin cruce, sensible sin duplicar, disminuido completo; movimientos armónicos y melódicos de Medrano (pp. 13–15); para armonizar, tabla de enlaces y continuaciones obligadas (pp. 15–17). Si no existe solución con las reglas, lo dice en la barra de estado en vez de escribir algo incorrecto.

## Lo que falta

### A. Paridad con la v4 (antes de enlazar la v5 desde el sitio)

| Pendiente | Dónde está en la v4 | Nota |
|---|---|---|
| Vista por páginas (sistemas) | `SequencerStudio.tsx`, `scoreLayout`, `barsPerPageFor` | `ScoreView` ya lo soporta: `layout="page"`, `from`, `to`, `pageInfo` |
| Modo Presentación y escenas | `presentation`, `scene`, panel «Escenas» | En la v5 debe ser una **pista de marcadores** en la zona inferior |
| Exportar SVG / PNG | `saveGraphic`, `exportGraphic` | Necesita el `ref` del lienzo |
| Lista de eventos accesible | panel «Lista de notas» | Para lectores de pantalla y agentes |
| Anotaciones de texto (`kind:"text"`) | panel «Cifrados y anotaciones» | La v5 solo edita las romanas |
| Transponer N semitonos, duplicar compás a N | panel «Transformar» | La v5 solo tiene ±8ª y duplicar selección |
| Ornamento (nota roja) | `toggleSelectedFlag("ornament")` | Marca pedagógica de la v3 |
| Quitar un compás intermedio | — | La v5 solo quita el último |
| Aviso al importar proyectos v3 | `loadFile` (`legacy`) | El import ya funciona; falta el aviso |
| Mostrar / ocultar cifrados | `cipherVisible` | |

Referencia completa: `docs/secuenciador-paridad-v3-v4.md`. Criterio de Luis: no se pierde ninguna función operable.

### B. Nuevo de la v5

1. **Teclado MIDI** (Web MIDI): tocar una tecla escribe la nota en el cursor con la figura elegida; acordes si se tocan juntas.
2. **Micrófono**: cantar o tocar escribe la nota (reutilizar la detección de `apps-src/afinador`).
3. **Pista de marcadores** para escenas, y desde ahí stills y video sin salir del estudio.
4. **Pista de acordes como carril propio** sobre la partitura (hoy son las casillas bajo cada pulso más la lista de la zona inferior).
5. Motor (modo autor): modo menor, acordes de séptima, modulación dentro de una pasada, preferencias de cadencia (ver `cadences-validator.ts`), 6/4 al armonizar. Cada ampliación entra con su lección del curso y con pruebas contra el validador correspondiente.
6. Pruebas Playwright de la v5 (`npm run test:e2e`, `--workers=2`; el servidor de desarrollo se satura con más).
7. Lección «P04.2 Cómo usar el Sequencer v5», entrada de blog y enlaces desde el sitio — **solo cuando A esté completo**.

### C. Detalles conocidos

- La zona inferior tiene altura fija (188 px); en Cubase se arrastra.
- En pantallas menores de 860 px se ocultan las pistas: no hay forma de cambiar de voz ahí. El móvil no es prioridad (los juegos y herramientas de escritorio son para laptop).
- El selector de compás del inspector no ofrece numerador y denominador libres como la v4.

## Reparto sugerido

- **Opus**: coordinar, revisar cada PR y cuidar las decisiones de Luis de arriba. Ampliaciones del motor (B5), porque exigen leer el curso con cuidado.
- **Codex — Sol** (código): bloque A completo, cada punto con su prueba; Web MIDI (B1); pruebas Playwright (B6).
- **Codex — Astra** (visual): pulido del estudio, pista de marcadores (B3), carril de acordes (B4), zona inferior redimensionable.
- **Gemini**: tareas de receta cerrada — revisar los textos en inglés de `components/sequencer/v5`, redactar el borrador de la lección P04.2 y de la entrada de blog. Recordar que `agy` solo escribe dentro de `apps-src`: sus borradores se copian después.

## Cómo comprobar

```bash
npx vitest run lib/sequencer/harmony
```

```bash
npm test
```

```bash
npm run typecheck
```

Manual: abrir `/es/sequencer/v5`, escribir «I VI IV II V6 I IV V I» en la pista de acordes (cada 2 pulsos), abrir «Modo autor» → «Repartir…»; reproducir con Espacio. Después borrar todo menos la soprano y probar «Armonizar la soprano escrita».

Flujo de git: rama `claude/…` o `codex/…` → PR → checks verdes → merge. `main` se publica solo (Workers Builds).
