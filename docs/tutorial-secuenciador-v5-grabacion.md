# Grabación del tutorial «Cómo usar Storm Sequencer v5»

Estado: ronda 3 aprobada. Ensayo con video de 39 clips, Piano local y tres pausas reales del AudioContext: 42 previews dentro de ±17.22 ms; 35 marcas codificadas y tres escuchas dentro de ±40 ms tras el ajuste final. La grabación final antigua requiere regrabar porque sus 39 WAV son silencio.

## Archivos

- `scripts/sequencer/grabar-tutorial-v5.mjs`: copia independiente del grabador v4; conserva CDP, AudioWorklet PCM, montaje, subtítulos y normalización.
- `scripts/sequencer/tutorial-v5-support.mjs`: servidor de producción, dispositivos MIDI/Mic y agrupación del audio continuo.
- `scripts/sequencer/tutorial-sync-v5.mjs`: medición visual con la zona del editor v5.
- `scripts/sequencer/revisar-tutorial-v5.mjs`: revisión de los 39 clips, audio separado, subtítulos y sincronía.
- `scripts/sequencer/preparar-ensayo-v5.mjs`: silencios provisionales, fuera de la carpeta de narración.
- `content/tutoriales/secuenciador-v5-es.json`: texto aprobado y acciones de los 39 párrafos.
- `content/tutoriales/secuenciador-v5-inicio.json` y `secuenciador-v5-seleccion.json`: proyectos de preparación (Melodía, 72 BPM, Piano, Do mayor).

La v4 y sus herramientas originales no se editan. Tampoco se modifica `components/`, `lib/` o `app/`. Sin operaciones de git.

## Preparación y ensayo

El puerto 3100 debe estar libre. El grabador rechaza cualquier proceso que lo ocupe; nunca lo detiene ni lo reutiliza. No iniciar manualmente un servidor: el grabador ejecuta `next build`, verifica la ausencia del bundle autor y después ejecuta `next start -p 3100`. Fuerza `NODE_ENV=production` y `NEXT_PUBLIC_SEQUENCER_AUTHOR=0` para estos procesos y comprueba también la interfaz. Cierra solo el servidor que inició.

Requiere dependencias npm completas, Chromium de Playwright, FFmpeg y FFprobe en PATH. Se restauraron las dependencias locales con `npm install --ignore-scripts --no-save --package-lock=false`, sin cambiar package.json ni el lockfile. En esta sesión el lanzador de shell restringido falla al crear pipes de procesos hijos (EPERM); la ejecución desde Node REPL sí generó los 39 silencios y llegó a la comprobación del puerto.

Si aún no están los MP3 definitivos:

```powershell
node scripts/sequencer/preparar-ensayo-v5.mjs
node scripts/sequencer/grabar-tutorial-v5.mjs content/tutoriales/secuenciador-v5-es.json --clips .local-work/tutorial-v5-provisional --out .local-work/tutorial-v5-ensayo --rehearse
node scripts/sequencer/revisar-tutorial-v5.mjs .local-work/tutorial-v5-ensayo --rehearse
node scripts/sequencer/grabar-tutorial-v5.mjs content/tutoriales/secuenciador-v5-es.json --clips .local-work/tutorial-v5-provisional --out .local-work/tutorial-v5-ensayo --rehearse-video
node scripts/sequencer/revisar-tutorial-v5.mjs .local-work/tutorial-v5-ensayo --rehearse
```

Cuando existan los 39 MP3, repetir esos dos ensayos usando `--clips .local-work/video-secuenciador-v5-audio-es`. Se exigen los 39 textos y duraciones, en el formato de la v4; se comparan con el texto del plan y con los WAV decodificados completos. No se genera voz.

El ensayo rápido omite los tiempos de narración. Guarda `work/clip-N.png`, `work/rehearsal-N.png`, rectángulos durante el gesto, selección posterior, WAV reales por clip y `work/rehearsal.json`. El ensayo de video conserva los tiempos completos de la voz y mantiene las animaciones del mouse y añade `work/segment-N.mp4` y la medición visual de las marcas. Estos segmentos son mudos; el audio real separado está en `work/sequencer-N.wav`. El montaje final combina voz y audio.

## Grabación final

Después de pasar los ensayos y revisar los tiempos contra la voz definitiva:

```powershell
node scripts/sequencer/grabar-tutorial-v5.mjs content/tutoriales/secuenciador-v5-es.json --clips .local-work/video-secuenciador-v5-audio-es --out .local-work/tutorial-v5-final --samples .local-work/piano-samples
node scripts/sequencer/revisar-tutorial-v5.mjs .local-work/tutorial-v5-final
```

Salidas: `tutorial-secuenciador-v5.mp4`, `tutorial-secuenciador-v5.srt` (39 entradas), `timeline.json`, `hoja-contactos.png` y `revision.json`. Se puede repetir solo el montaje con `--assemble`, conservando la carpeta work completa.

## Contrato del plan

- `at` se mide en segundos desde el inicio de la voz del clip. Con `afterVoice: true`, se mide desde su final. Los clips reservan 0.4 s antes y 0.6 s después (el primero 1.5 s antes).
- `prepare` ejecuta acciones fuera del segmento. Carga los ejemplos limpios y precalienta Piano.
- `requiredAudio` declara los clips cuya salida del secuenciador debe superar −45 dBFS. El micrófono no se audita como salida musical: escucha un tono real con armónicos sin enviarlo a las bocinas.
- `continuousPlayback` contiene grupos de números consecutivos, por ejemplo `[[37,38,39]]`. Mantiene la captura CDP y agrupa la normalización y el desplazamiento PCM. En el plan actual no hay reproducción entre clips: cada escucha se detiene en su propio párrafo.
- `finalFade` fija el fundido visual del último clip; `outputs` fija los nombres finales.
- `midi`: `notes` (números MIDI simultáneos), `velocity` opcional y `seconds` para sostener. Se activa primero el botón MIDI.
- `micTone`: `frequency` en Hz y `seconds`. Se activa primero Mic; el selector «Escribir a» se cambia mediante `select`. Se exige que cada tono escriba exactamente un evento.
- `marquee`: `view: staff | roll`; usa geometría real de las primeras notas, captura el rectángulo y exige al menos dos notas seleccionadas.
- Antes de los atajos se desenfoca el campo activo. Los clics, arrastres y sonidos pasan por la aplicación real.

## Preparación inicial (histórico; sustituida por la ronda 4)

Los tiempos `at` son una primera colocación editorial. Falta verificarlos con la voz real y ajustar cualquier selector/geometría que falle en el ensayo. Especial atención a escritura por pulsos, selección y movimiento de grupos, duración en Teclas, pausa del micrófono durante reproducción y encuadre de los menús. La tolerancia de sincronía permanece en ±40 ms; no se ha medido todavía en esta preparación.

Validación realizada: sintaxis Node de los grabadores/revisor, generación de 39 silencios y ESLint sobre los cinco módulos nuevos. No declarar aprobado el ensayo mientras no existan sus capturas, WAV y revisión completa.


## Ajustes de la revisión de grabación

- El grabador detecta versiones de Chromium ya instaladas si falta la versión que espera Playwright; `--browser <exe>` permite elegir una explícitamente.
- `--reuse-build` reutiliza el build local durante correcciones del plan; siempre vuelve a comprobar el bundle autor y arranca `next start`. La grabación final sin esa opción vuelve a compilar.
- `--samples <carpeta>` o `TUTORIAL_PIANO_SAMPLES` permiten servir al navegador las muestras originales locales `C4.mp3`, `D4.mp3`, etc., sin alterar el motor ni reconstruir la música. Deben ser las muestras originales, no silencios o tonos de prueba.
- `tutorial-audio-v5.mjs` conserva la captura de salida del motor y excluye los contextos de micrófono. Valida una nota lógica, incluyendo sus fragmentos ligados cuando cruza la barra.
- Se guardan capturas del menú abierto, tono sostenido, rectángulo visible y arrastre de grupo. Los dos arrastres de grupo deben modificar varias notas.
- La barra de Teclas se escribe y alarga en el cuarto compás vacío para evitar traslaparse con el ejemplo de copiar y duplicar.
- Los selectores de listas usan su nombre accesible por prefijo; las opciones forman parte del texto de sus etiquetas.
- Cualquier fallo de muestras queda en `sampleFailures`. Ni el grabador final ni el revisor aprueban el sonido de reserva como Piano.

## Resultado de la sesión de ensayo

Se conservaron 31 estados y capturas; los 11 clips de audio obligatorio alcanzados superan −45 dBFS (falta el clip 37). Las 33 marcas de vistas previas del navegador pasaron ±40 ms. Esto no certifica el audio de Piano —se activó el sonido de reserva— ni sustituye la revisión sobre video codificado. Los errores del plan encontrados se corrigieron; falta repetir las 39 acciones completas tras restaurar las dependencias y disponer de las muestras originales. El servidor propio se cerró y confirmó libre el puerto 3100.

La vista con voz puede generarse tras capturar el ensayo completo con node scripts/sequencer/montar-ensayo-v5.mjs .local-work/tutorial-v5-ensayo: genera ensayo-con-voz.mp4, subtítulos y hoja de contactos. Ese archivo es de revisión y nunca reemplaza la entrega final.

## Ronda 3: reloj de audio tras pausas

El reloj de muestras (currentFrame/currentTime) no equivale a tiempo de pared. Un ancla única tomada al principio queda obsoleta tras una suspensión o parada del reloj de renderizado. El Map original ya distinguía contextos, pero cada contexto conservaba ese epoch para siempre. Las muestras se fechaban antes de su clip y el recorte las descartaba.

La captura v5 conserva ahora anclas por contexto y por tramo de reloj. Valida getOutputTimestamp contra performance.now y currentTime, descarta timestamps obsoletos y renueva el ancla al reanudar o detectar un cambio de la relación entre relojes. Los eventos de sonido y los paquetes PCM usan el mismo mapa; un paquete que cruza una frontera se divide. El micrófono conserva contextos nativos excluidos de la captura.

Cada nueva grabación guarda audioClockVersion: 2, audioClocks, pcmArchive y los archivos work/context-N.f32 y work/context-N.jsonl. Estos conservan el PCM continuo, el índice de muestra, el contexto, el ancla y la posición dentro del archivo. Los clips de audio obligatorio se comprueban inmediatamente; una pista muda detiene la grabación antes del montaje.

La opción de regresión --clock-stalls introduce pausas reales de 17.35, 1.66 y 13 segundos en los tramos silenciosos de los clips 5, 19 y 36. No se usa en la entrega. Sirve para reproducir los saltos acumulados de unos 17.35, 19.01 y 32.01 segundos, sin modificar el producto.

Los 39 WAV de la grabación final antigua contienen únicamente ceros y no hay archivo PCM continuo. El diagnóstico está en .local-work/tutorial-v5-final/work/auditoria-pcm-ronda3.json. Esa captura requiere regrabar: cambiar las marcas de recording.json o ejecutar --assemble no recupera las muestras descartadas.

### Evidencia de la ronda 3

- Informe: .local-work/tutorial-v5-ensayo/ronda3-resultados.json.
- Referencia larga sin pausas forzadas: ronda3-antes (39 clips; el salto no se produjo espontáneamente en este Chromium).
- Reproducción con el reloj antiguo y una pausa programada de 17.35 s: ronda3-reproduccion; desfase constante entre −21.15 y −21.19 s en el clip 10, WAV mudo.
- Ensayo corregido: ronda3-corregido (466.133 s), con pausas programadas de 17.35, 1.66 y 13 s. Revisor: 12 clips con audio > −45 dB y 35 marcas dentro de ±40 ms; sampleFailures: 0.
- Las 42 previews del reloj del navegador tienen un error máximo de 17.22 ms. Con el mismo ajuste común de audio que emplea el montaje final, las 35 marcas codificadas tienen un máximo de 36.52 ms y las tres escuchas un máximo de 30.49 ms.
- El contexto del motor siguió siendo el número 1 y registró tres reanudaciones con cambios de ancla de aproximadamente 17.375, 1.679 y 13.018 s. El micrófono quedó excluido.
- El PCM continuo y su índice coinciden en tamaño y posiciones. Las pruebas de regresión y ESLint pasan.
- --assemble se probó con la captura antigua y se detuvo ante el WAV mudo del clip 10, sin sustituir la voz ni reconstruir música.

## Ronda 4: palabras y colas

El plan usa `atWord` en todas las acciones habladas. Se leen exclusivamente los 39 archivos `N_Chapter_1.words.json` de la carpeta indicada con `--clips`. La comparación elimina acentos, mayúsculas y puntuación. Una palabra repetida exige `occurrence` (desde 1); una palabra ausente detiene la preparación.

`offset` negativo reserva movimiento previo del puntero; el clic o inicio de arrastre sigue teniendo como objetivo el inicio de la palabra. Un offset positivo retrasa el gesto. Los eventos reales se registran en el navegador, con su reloj de performance, incluyendo pointerdown, keydown, input y change. No se usa la hora de finalización de Playwright como medida. El revisor exige ±150 ms y entrega `sincronia-palabras.csv`, `.md` y `.json`.

Los dos ensayos conservan ahora los tiempos reales de voz, también `--rehearse`, para comprobar estas anclas. El ensayo rápido omite la captura de video. `--rehearse-video` captura y codifica el video y comprueba las marcas de vistas previas. Se ejecutan uno después del otro y el revisor lleva `--rehearse` en ambos casos.

Antes de terminar cada captura se exige salida por debajo de −55 dBFS durante 250 ms continuos, con PCM reciente y tope de 4 s; se excluye el micrófono. El WAV original se conserva. Su copia de entrega aplica 96 ms de caída al detener reproducción, 40 ms de fundido en fronteras y 80 ms finales de silencio. El montaje vuelve a proteger el final después de desplazar/normalizar. El revisor exige picos por debajo de −50 dBFS en los 80 ms anteriores a cada frontera, tanto en el original capturado como en la copia y la música mezclada cuando existe. `revision-colas.json` y `.csv` conservan la evidencia.

Se actualizan las figuras matemáticas, el arrastre temporal con línea de destino y Snap (11), la barra ligada que cruza de compás (27), y la demostración de añadir al final/insertar/quitar (30). Las restauraciones de ejemplos se hacen fuera de la voz. El clip 37 reserva la escucha completa antes de detener. `--samples .local-work/piano-samples --reuse-build` permite ensayar sin red contra el build de producción existente; el servidor propio se cierra al terminar o fallar.

### Resultado de la ronda 4 (2026-11-28)

El ensayo rápido completó los 39 clips: 124 gestos a ±150 ms, máximo 22.0 ms; 39 marcas de vista previa a ±40 ms; Piano original sin fallos de muestras. La pasada con video corregida completó los 39 clips en 484.100 s, con 425.680 s de voz; máximo de palabras 26.6 ms, 35 marcas codificadas con máximo 31.03 ms y tres escuchas con máximo 33.33 ms. Ambos revisores terminaron con código 0.

La primera pasada con video descubrió siete gestos tardíos: 24 comandos de mouse no cabían en las aproximaciones cortas. Se amplió la preparación de Ctrl/clic derecho y Reproducir, se acortó el rectángulo del clip 28 y se adaptó el número de pasos al tiempo disponible. Los metadatos del diagnóstico están en ronda4-video-diagnostico; no son una entrega aprobada.

Las 39 fronteras tienen silencio digital en los últimos 80 ms tanto en los WAV originales como en la copia de entrega y en el AAC decodificado de ensayo-con-voz.mp4. El suelo de medición de los informes es −300 dB para ceros. El clip 22 usa una caída de 96 ms al detener; los otros finales de nota ya habían decaído. Todas las copias conservan fundido de frontera de 40 ms. La espera de silencio se verificó en cada captura (máximo observado de espera adicional: 7 ms; el margen de voz ya dejaba decaer las notas).

Evidencia: .local-work/tutorial-v5-ensayo/ronda4-resultados.json, sincronia-palabras.md/.csv/.json (124 filas), revision-colas.json, revision-fronteras-mp4.json, revision-rehearsal.json, hoja-contactos-ensayo.png y ensayo-con-voz.mp4. La carpeta ronda4-rapido conserva la revisión del ensayo sin video. Dos fixtures separados prueban que el revisor rechaza un gesto tardío y una frontera con audio; las seis pruebas unitarias y ESLint pasan. Puerto 3100 confirmado libre al terminar. La grabación final queda para Luis.
