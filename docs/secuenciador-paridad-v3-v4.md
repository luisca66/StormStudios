# Auditoría de paridad: Workstation v3 → Sequencer v4.0

Fecha: 30 de septiembre de 2026. Auditoría del código local; estados registrados al comienzo de esta revisión, antes de las correcciones simultáneas. No equivale a una certificación visual o musical. La v3 sigue disponible en `/es/sequencer`; la v4 vive en `/es/sequencer/v4`.

Fuentes: `public/tools/secuenciador.html`, `components/sequencer/{SequencerStudio,ScoreView,PianoRoll}.tsx`, `lib/sequencer/{types,model,mouse-editing,audio-engine,export}.ts`.

## Regla de aceptación

La v4 debe conservar todas las funciones operables de la v3. Conservar la v3 en otra ruta no sustituye la paridad. Las mejoras nuevas no justifican perder un gesto, un control musical o información de proyectos antiguos. No se deben reproducir errores de la v3, como eliminar notas al cambiar de vista.

## Correcciones prioritarias

1. Línea continua auténtica: clave, armadura y métrica solo al inicio, o cuando cambian; sin margen repetido por compás. Los cuatro pentagramas SATB mantienen una misma línea y tiempos alineados.
2. Audición al agarrar notas y durante su arrastre: suena la altura inicial en pointerdown, cambia al pasar a otra altura, se detiene al soltar/cancelar. La edición genera una sola acción de deshacer por arrastre. Debe funcionar en partitura y Piano Roll.
3. Recuperar alteraciones inmediatas, ornamento rojo, claves por compás, teclado histórico y cifrados sobre la partitura.
4. Recuperar monitor de cifrado vigente, cursor y seguimiento en Piano Roll, metrónomo que respeta el denominador y volumen durante la reproducción.
5. Importación sin pérdida de ornamentos, texto de notas y cambios internos de clave. Escritura que cruza compases y se representa mediante ligaduras automáticas.

## Inventario completo de funciones operables

| Función v3 | Evidencia v3 | Estado inicial v4 / diferencia |
| --- | --- | --- |
| Melodía simple y Cuarteto SATB | `setMode`, `syncModeUI` | Conservado; datos de los cinco tracks se mantienen al cambiar modo. |
| Elegir voz S/A/T/B y hacerlo al clicar su pentagrama | `setActiveTrack`, `handleMouseDown` | Selección por inspector y clic de nota conservada; revisar clic de silencio/espacio que active la voz visualmente. |
| Instrumentos Sinte, Piano, Cello, Corno, Coro, Fagot | selector y `handleInstrumentChange` | Todos presentes; v4 añade instrumento independiente por voz. |
| Armaduras mayores completas hasta siete alteraciones | `key-sig-select` | Todas presentes. |
| Compases 4/4, 3/4, 2/4, 6/8 | `time-sig-select` | Todos presentes; v4 agrega más. |
| Clave Sol/Fa en melodía | `clef-select`, `applyToSelectedMeasure` | Faltaba selector v4; `Voice.clef` global no permite cambio interno. |
| Aplicar clave/armadura/métrica al compás seleccionado | `applyToSelectedMeasure` | Armadura/métrica editables en inspector; faltaba clave y gesto de aplicación conjunta. |
| Heredar ajustes hasta el siguiente cambio explícito | `getSettingsForMeasure` | v4 modela cada compás explícitamente y cambia solo uno. Falta herencia musical o control equivalente para aplicar tramo. |
| Clave/armadura/métrica solo al inicio o cambio | `renderSingle`, `renderQuartet` | Inicialmente se repetían en cada compás. En corrección durante auditoría. |
| Cancelación de armadura anterior y doble barra en modulación | `addMeasureKeySignature` | Cancelación disponible por VexFlow; faltaba doble barra. |
| SATB con corchete y barras comunes | `renderQuartet` | Conservado en v4 tras primera corrección. |
| Plicas SATB: S/T arriba, A/B abajo | `getStemDirectionForTrack` | v4 usaba `autoStem` en todas las voces; diferencia visible. |
| Redonda, blanca, negra, corchea y semicorchea | `setDuration` | Conservado; v4 añade fusa. |
| Puntillo para próximas notas | `toggleDottedMode`, `getEffectiveDuration` | Conservado por checkbox; v4 también permite semicorchea con puntillo. No hay evidencia de edición inmediata de duración en v3. |
| Escribir clicando silencios; respeta armadura | `handleMouseDown`, `getNoteFromY` | Conservado; v4 además admite clic en zona vacía y acordes. |
| Seleccionar nota con clic y oírla mientras se sostiene | `startPreviewSound`, `handleMouseDown` | Inicialmente v4 seleccionaba al soltar sin audición inicial. |
| Arrastrar altura y oír cambios durante arrastre | `handleGlobalMouseMove`, `updateNotePitch` | Inicialmente v4 solo previsualizaba tras soltar. |
| Detener audición al soltar mouse | `handleGlobalMouseUp` | Requiere `stopPreview` en pointerup y pointercancel v4. |
| Borrado con clic derecho | `handleContextMenu` | Conservado en partitura y Piano Roll. |
| Delete y Backspace borran selección | `handleKeyDown` | Delete presente; faltaba Backspace. |
| Escape quita selección | `handleKeyDown` | Conservado. |
| ArrowUp/Down transpone semitono y audiciona | `shiftPitchChromatic` | Faltaba; v4 ofrece transposición en inspector pero no este gesto. |
| T alterna ligadura de nota seleccionada | `handleKeyDown`, `toggleTie` | Faltaba atajo; v4 checkbox exige actualizar selección. |
| Botón de ligadura inmediata | `toggleTie` | Representación y reproducción presentes; faltaba gesto inmediato. |
| Ornamento (+): marca nota roja | `toggleOrnament`, `isOrnament` | Faltaba campo, control y dibujo. En v3 es marca de color, no nota de adorno interpretada. |
| Alteraciones inmediatas en selección: ##, #, natural, b, bb | `applyAccidental` | v4 inicialmente solo cambiaba alteración de próxima entrada. |
| Repetir # sobre # produce ##; b sobre b produce bb | `applyAccidental` | Faltaba mismo comportamiento. |
| Insertar nota que atraviesa barra: partir representación y ligar | `insertNote`, `pendingSplitNote`, `buildMeasureContent` | v4 rechazaba cruce; debe permitir división sin perder duración/pitch/ornamento. |
| Escritura sustituye música solapada | `insertNote` | v4 `writeWithMouse` conserva fragmentos laterales, mejora compatible; edición/resize que invade otro evento aún se rechaza. |
| Silencios rellenan espacios automáticamente | `renderSingle`, `buildMeasureContent` | Conservado; además silencios explícitos v4. |
| Deshacer/rehacer y Ctrl/Cmd+Z, Shift+Z, Y | `undo`, `redo`, `handleKeyDown` | Conservado. |
| Añadir compás | `addMeasure` | Conservado; v4 además permite eliminar y duplicar compases. |
| Limpiar partitura | `clearScore` | Conservado como nuevo proyecto; verificar que elimina anotaciones y voces y es reversible. |
| Mostrar partitura o Piano Roll | `setView` | Conservado, sin eliminación de notas al cambiar. |
| Piano Roll muestra todas las voces activas | `renderPianoRollNotes` | Conservado. |
| Piano Roll con rango mínimo D2–C6 y ampliación por notas | `updatePianoRollRange` | v4 mínimo C3–C5 (MIDI48–72); faltan registros bajos para escribir antes de que exista la primera nota grave. |
| Piano Roll clic para insertar, arrastre de altura, resize derecha | `handlePianoRollMouseDown/Move` | Conservado salvo audición continua; v4 añade movimiento horizontal. |
| Grid Piano Roll con nombres de compás y barras musicales | `renderPianoRollGrid` | v4 muestra filas/lineado simple; revisar referencias de compás y agrupación acorde con cambios métricos. |
| Cursor de reproducción visible en ambas vistas | `setPlaybackStartTick`, `animate` | Partitura presente; faltaba cursor en Piano Roll. |
| Clic fija inicio de reproducción, incluso zona vacía | `setPlaybackStartTick`, mouse handlers | Nota seleccionada actualiza draft; revisar espacio/cursor sin insertar y cursor visible detenido. |
| Seguir cursor mediante scroll | `setPlaybackStartTick`, `animate` | Línea de partitura presente; faltaba seguimiento en Piano Roll. |
| Play/Stop, inicia desde cursor, notas sostenidas truncadas desde cursor | `playScore`, `stopPlayback` | Motor nuevo conserva reproducción desde posición y cadenas de ligaduras. |
| Tempo 40–220 BPM | `tempo-slider` | v4 permite30–240; cubre rango antiguo. |
| Volumen 0–100%, ajuste sin detener playback | `updateVolumeDisplay` | Rango presente; v4 commit detenía reproducción al cambiarlo. |
| Metrónomo ON/OFF y BPM visibles | `toggleMetronome`, `updateMetronomeBpmDisplay` | Presente como checkbox/tempo; feedback visual menos inmediato. |
| Metrónomo respeta denominador y acentúa primera pulsación | `getBeatTicksForTimeSig`, `scheduleMetronomeClicks`, `playMetronomeClick` | v4 inicial clic cada PPQ, sin acento; incorrecto para6/8 y cambios métricos. |
| Cifrados inline debajo de cada negra, escribir sin abrir panel | `renderCipherInputs` | Datos y panel de anotaciones presentes; faltaba entrada directa alineada a notas. |
| Mostrar/ocultar cifrados | `toggleCiphers` | Faltaba conmutador. |
| Monitor grande de cifrado vigente al mover/reproducir cursor | `updateMonitor`, `chord-monitor` | Faltaba monitor; debe elegir último cifrado no vacío en/antes posición dentro de compás actual. |
| Guardar y abrir proyecto JSON | `saveProject`, `loadProject` | Conservado; v4 añade autoguardado. |
| Abrir proyectos v3 sin pérdida musical | `restoreState`, `serializeState` | Notas, voces, instrumento, métrica, armadura, ligaduras y cifrados importados. Se descartaban ornamento, texto de nota y cambios internos de clave. |
| Exportar MIDI con spelling SP: por nota | `downloadMIDI` | Conservado con canales SATB; v4 añade MusicXML, SVG, PNG, WAV. |

## Campos heredados que no son una función operable probada

La v3 serializa objetos completos de nota; admite `text` dentro de datos antiguos y lo copia en átomos de render. En el HTML inspeccionado no hay editor de letra/texto asociado a nota, ni `Annotation` que dibuje ese texto. Debe preservarse en importación/exportación sin afirmar que existía un editor de letras funcional. Esto no impide agregarlo como mejora nueva.

El selector de claves de la v3 está deshabilitado en SATB; las cuatro claves son fijas Sol/Sol/Fa/Fa. Paridad exige cambios de clave internos en melodía. Claves SATB configurables serían mejora adicional.

En el HTML local v3 no aparece selector de vista paginada: renderiza una única línea. La vista de páginas sigue siendo requisito explícito del usuario aunque proceda de otra versión anterior.

Las teclas del Piano Roll v3 son etiquetas visuales; el handler descarta clics sobre su panel. No hay evidencia de piano virtual reproducible requerido para paridad.

## Mejoras v4 que deben conservarse

Entrada textual validada, lista de eventos accesible, acordes, selección múltiple, copiar/pegar, transposición de selección, duplicación de compás, tresillos, fusa, mezclador por voz, mute/solo, loop, escenas y presentación, exportaciones gráficas/audio/MusicXML, importación MusicXML y autoguardado. No sustituir estas mejoras por un iframe v3 dentro de v4.

## Pruebas de aceptación necesarias

Revisión posterior aplicada: se corrigieron las diferencias de cabeceras continuas, márgenes/voz repetidos, plicas SATB, audición inicial/durante arrastre/hasta soltar, alteraciones inmediatas, atajos, ornamento/texto, claves por compás, herencia con límites explícitos, división ligada entre barras, cifrados inline/visibilidad/monitor, rango y cursor/seguimiento/referencias del Piano Roll, metrónomo y volumen en vivo. El inventario superior describe el estado inicial, no una lista de pendientes actual. Validación final: 340 pruebas unitarias y 25 de navegador pasan; lint/TypeScript/build correctos. Los casos siguientes siguen disponibles para la revisión musical manual de Luis.

- Crear nota con mouse, agarrarla y comprobar audio antes de mouseup; arrastrar por tres alturas y verificar tres cambios; cancelar y comprobar silencio y datos originales.
- Repetir con Piano Roll, y verificar que undo vuelve al estado anterior con una sola acción.
- En línea continua contar una clave y una armadura por voz al inicio; modificar tonalidad/métrica/clave a mitad y comprobar aparición puntual y herencia adecuada.
- Probar todos los botones de alteraciones y sus repeticiones, marca roja y ligadura; guardar/importar JSON antiguo y nuevo, exportar MusicXML y comprobar conservación.
- Escribir redonda desde el último pulso de un compás y verificar división, ligadura y duración audible total.
- Cifrar varios pulsos directamente sobre la partitura, mostrar/ocultar, ver monitor al seleccionar nota y durante reproducción.
- Reproducir6/8 y transición3/4→6/8; verificar rejilla de pulsos y acento. Cambiar volumen sin parar.
- En Piano Roll reproducir varios compases y verificar cursor, scroll y referencia de compás; escribir una nota D2 desde proyecto vacío.
- Validar mismos controles por mouse, teclado y árbol de accesibilidad para agentes de computer use; ES/EN y viewport móvil.
