# Storm Sequencer v4.0: entrega local

Fecha: 30 de septiembre de 2026. Demo v4.0: http://localhost:3100/es/sequencer/v4 (inglés: /en/sequencer/v4). La versión v3 de los cuatro videos conserva /es/sequencer y /en/sequencer, con un enlace visible hacia v4. Ambas versiones se preparan para coexistir; no se ha publicado. El servidor local está en ejecución. Si se cierra, arrancar `npm run dev -- --port 3100` desde este repositorio.

## Qué quedó implementado

- Editor React compartido ES/EN, VexFlow 5 instalado y un documento musical tipado de 960 PPQ. Pentagrama, Piano Roll, tabla, reproducción, escenas y exportaciones parten del mismo documento.
- Escritura exacta por voz, compás y pulso; notas/acordes/silencios, seis duraciones, puntillos, tresillos y ligaduras. Atajos A–G/R y duraciones 1–6 en la región de escritura, más entrada textual transaccional con errores por línea y cinco ejemplos.
- Melodía/acordes o SATB; cambio de vista y modo conserva las voces. Selección múltiple, edición, eliminación, copiar/pegar, transposición, duplicar compás, deshacer/rehacer y autoguardado independiente del editor anterior.
- Escritura con mouse en pentagrama y Piano Roll, borrado con clic derecho o herramienta Borrar, arrastre para cambiar altura y Ctrl/Cmd+clic para añadir acordes en pentagrama. Piano Roll permite mover en tiempo y altura y redimensionar la duración. Las operaciones se validan y se deshacen.
- SATB en una partitura conjunta con corchete y alineación rítmica entre las cuatro voces. Vista continua horizontal con seguimiento y vista por páginas con una página visible, navegación manual y cambio automático al reproducir. Detener conserva la página alcanzada.
- Barra de figuras musicales y botones destacados con los colores azul, violeta, verde, rosa, ámbar y cian de la workstation.
- Paridad v3: audición al agarrar y arrastrar, sostenida hasta soltar; alteraciones inmediatas y dobles por repetición; ↑/↓ por semitono con sonido, T para ligar y Backspace para borrar; marca roja de ornamento; claves internas por voz/compás y herencia de clave/armadura/métrica hasta otro cambio explícito. Cifrados inline por negra, mostrar/ocultar y monitor del cifrado vigente en el compás actual. Cursor y seguimiento también en Piano Roll, rango inicial D2–C6, volumen durante reproducción y metrónomo según denominador/acento. Inventario: [paridad v3→v4](secuenciador-paridad-v3-v4.md).
- Línea continua con clave/armadura/métrica solo al inicio y cuando cambian, cancelación de armadura y doble barra al modular; nombres de voces/corchete solo al inicio, pentagramas unidos y plicas SATB S/T arriba y A/B abajo.
- Cambio de compás mantiene la posición dentro de cada compás de las notas posteriores, también en voces ocultas. Rechaza notas que no caben; los silencios explícitos que dejan de caber pasan a huecos silenciosos. Rechaza anotaciones que quedan fuera del compás.
- Cifrados y anotaciones por compás/pulso, con edición y eliminación. Se guardan en JSON, se dibujan en la partitura y viajan a las imágenes y a MusicXML. Los cifrados `cipherData` del JSON anterior se migran.
- Cinco bancos R2 y sintetizador; carga a demanda, caché de buffers, máximo seis descargas durante preparación de reproducción, timeout/reintento y aviso de fallback. Stop cancela el inicio pendiente. Fuera de C2–B6 se transpone la muestra del límite a la altura solicitada. Localhost usa el proxy existente /api/audio; producción usa R2.
- Mezclador por voz con instrumento, volumen, mute y solo; metrónomo y repetición.
- Guardar/abrir JSON actual y JSON anterior; exportar MIDI compatible con SP: y canales SATB del Maestro Virtual; importar/exportar MusicXML sin comprimir; exportar WAV estéreo 44.1 kHz, SVG y PNG con fuentes embebidas.
- Escenas con título, explicación, rango, enfoque por voz y formatos 16:9/9:16; reproducción/exportación del rango y pantalla completa con espacio para reproducir/detener.
- Controles nativos con nombres accesibles estables, tabla de notas con botones que identifican voz/compás/pulso, eventos SVG con IDs y teclado. Se evita escribir antes de hidratar/recuperar el borrador.

## Cómo usarlo con un agente

1. Abrir la demo. Elegir modo y ejemplo, o pegar el bloque musical en «Texto musical».
2. Pulsar «Validar texto», leer el resumen y aplicar solo cuando haya cero errores.
3. Para una corrección, abrir «Lista de notas», buscar «Editar [voz], compás [N], pulso [N]», modificar el inspector y pulsar «Actualizar selección».
4. Añadir cifrados desde «Cifrados y anotaciones» con el compás/pulso del inspector.
5. Guardar JSON. Preparar la escena, presentarla y exportar PNG/SVG y WAV. Estos son insumos reproducibles para edición de video.

Ejemplo de entrada:

```text
voz melody
compas 1
[C4 E4 G4] blanca; silencio negra; F#4 negra
compas 2
G4 corchea tresillo; A4 corchea tresillo; B4 corchea tresillo; C5 blanca puntillo
```

Los pulsos del inspector son unidades de negra; en 6/8 hay tres unidades, no seis. Las posiciones fraccionarias permiten subdivisiones precisas. El texto sustituye solo los compases/voces donde escribe eventos; no borra otras voces o anotaciones. Al escribir con mouse o Insertar nota, una nota que cruza una barra se divide y liga automáticamente. En entrada textual se escriben los fragmentos por compás y se activa ligadura en el primero.

## Verificación realizada y límites

Ver `e2e/sequencer.spec.ts` y `lib/sequencer/*.test.ts`: escritura de cuatro compases, corrección exacta, undo/redo, recuperación, cinco ejemplos, teclado, ES/EN y ancho 390 px, exportaciones, cifrados y reapertura MusicXML después de vaciar el proyecto. La exportación MusicXML hace explícitos los silencios de compases vacíos, por lo que el número de eventos importados puede aumentar sin cambiar el sonido.

La comprobación opcional `STORM_REAL_SAMPLES=1` usa MP3 C4 de los cinco instrumentos descargados de R2 en `.local-work/real-samples/`; confirma decodificación Web Audio y WAV con señal no nula, sin fallback. Las pruebas normales usan un WAV pequeño para ser reproducibles sin red. El inventario de 360 URLs está en `sequencer-samples-audit.json`: 300 muestras C2–B6 disponibles y 60 de octava 1 inexistentes. Esto no sustituye una escucha musical ni una prueba desplegada de CORS/cache en los navegadores finales.

Resultado final: lint, TypeScript y build de producción correctos; 340 pruebas unitarias pasan y 3 casos previos siguen como todo. Las 25 pruebas de navegador del secuenciador pasan, incluida la comprobación con samples reales: escritura, arrastre, audición antes de soltar, borrado y undo, SATB alineado, cabeceras solo en inicio/cambio, ambas vistas, cambio automático de página, división entre barras, atajos/alteraciones/ornamentos, herencia de ajustes, cifrados y preservación de rutas v3. La suite de humo general anterior pasó 6/7: la página de la app Acordes registró un bloqueo CSP del script de analítica de Vercel en desarrollo. Se documenta aparte; los archivos de esa app, su CSP y la analítica global no se cambiaron en esta entrega.

Importación MusicXML: una melodía o hasta cuatro partes separadas, claves de sol/fa y sus cambios internos, valores soportados, acordes y tresillos 3:2. Preserva texto de nota como lyric y marca de ornamento roja. Rechaza voces simultáneas en una sola parte y adornos sin duración. No admite `.mxl` comprimido. Atributos expresivos externos como dinámicas y slurs no tienen representación en el modelo actual.

JSON anterior: conserva notas, grafías, compases, armaduras, instrumento, ligaduras, cifrados, marca de ornamento, texto de nota y cambios internos de clave. El editor anterior permanece disponible. Los MIDI SATB repiten armaduras por pista para el parser existente; sus `keyChanges` pueden contener duplicados, aunque la asignación de tonalidad por nota y pulso es correcta.

## Siguiente prioridad

1. Producción automatizada de video: guion de escenas con duración, transiciones, seguimiento de compás y revelado por pasos; captura/exportación MP4/WebM con audio sincronizado y ejecución por lotes desde JSON. Hoy se generan escenas, imágenes y WAV; todavía no hay exportador de video ni narración.
2. Grabado musical: colisiones de cifrado, paginación configurable, claves por compás, dinámicas/articulaciones, letras y cifrado con superíndices.
3. Escritura avanzada: selección por rango, pausa/reanudar, mejor inserción automática entre barras, teclado MIDI y análisis armónico integrado con Maestro Virtual.
4. Prueba contigo en casa: timbres/volúmenes, velocidad de escritura, lectura a 1080p/vertical y una toma real de clase; después prueba de preview con el origen CORS permitido y publicación.

Claude CLI implementó modelo, gramática, MIDI/MusicXML y pruebas del motor/operaciones. Gemini en Antigravity preparó ejemplos y checklist. Codex integró, revisó y reparó la interfaz, muestras, motor, importación, cifrados, escenas, exportación gráfica y pruebas de navegador. La delegación adicional de cifrados encontró sobrecarga de Claude y se resolvió aquí.

Las licencias de VexFlow, Bravura y Academico están en `public/vendor/`; las exportaciones SVG incluyen los avisos de las fuentes. Fuentes: [Bravura oficial](https://github.com/steinbergmedia/bravura/blob/master/LICENSE.txt), [Academico: confirmación de Steinberg](https://forums.steinberg.net/t/academico-open-font-license/114847), [aviso de Academico redistribuido](https://github.com/dbenjaminmiller/academico-mirror/blob/master/COPYING).

Proyecto de demo listo para abrir con «Abrir proyecto»: [I–IV–V–I](examples/secuenciador-armonia-demo.json).
