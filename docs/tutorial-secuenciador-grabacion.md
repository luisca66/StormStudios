# Grabación del tutorial del secuenciador · ronda 2

Comando para Claude (Piano, sin override):

```sh
npm run tutorial -- content/tutoriales/secuenciador-es.json --clips .local-work/video-secuenciador-audio-es --out stills/es/tutorial-secuenciador/video
node scripts/sequencer/revisar-tutorial.mjs stills/es/tutorial-secuenciador/video
```

Requiere Chromium de Playwright, FFmpeg y FFprobe. Utiliza el servidor local en 3100 o inicia y cierra uno. Conserva Piano en el plan y el proyecto. No cambia ramas ni componentes del editor. Los 52 MP3 originales se decodifican completos a 48 kHz, se contrastan con su tabla y se normalizan a −16 LUFS; la pista de voz concatenada recibe también una calibración medida en dos pasadas a −16 LUFS. Los WAV de voz solo se reutilizan si son más recientes que sus originales.

Antes de cargar la aplicación se instala una envoltura de AudioContext y de AudioNode.connect/disconnect. Cada conexión a la salida real también alimenta un tap de AudioWorklet: captura muestras PCM estéreo de 48 kHz continuamente, incluidas escritura, selección con audición, arrastres, alteraciones, flechas y reproducción. La ruta audible original permanece intacta; la salida del worklet es silencio y no duplica el sonido. OfflineAudioContext no se intercepta. No se usa el botón WAV ni se reconstruye música a partir de la partitura.

El procesador envía lotes de 1024 frames con el índice exacto de su primera muestra. getOutputTimestamp vincula el reloj de muestras con performance.timeOrigin/performanceTime; se conserva un ancla fija para evitar que el retraso de los mensajes cambie la alineación. Si aún no hay timestamp de salida se usa performance.now/currentTime. Los segmentos recortan esa pista por su captureEpoch, el mismo reloj absoluto de las marcas CDP del compositor. Este método evita el padding y la latencia de Opus/MediaRecorder. Antes del clip 5 se precargan los sonidos mediante una reproducción breve de preparación, fuera de los segmentos; después se restaura la partitura vacía. Así las descargas de Piano no retrasan las primeras notas de la demostración.

El módulo temporal del worklet se sirve desde public/vendor/ y se elimina al terminar. Esa ruta evita el enrutado de idiomas y respeta la política de scripts del mismo origen. pointerdown y keydown identifican cada gesto en el navegador. Si produce sonido, su anillo o insignia se programa desde el instante de salida PCM, con un fotograma de anticipación para el pintado; los controles silenciosos tienen un fallback de 100 ms. Las insignias pulsan en violeta para distinguir teclas repetidas. El timeline conserva esos eventos y los inicios programados del motor. Los movimientos del cursor usan Web Animations (420 ms; 550 ms al arrastrar).

La imagen usa CDP Page.startScreencast, JPEG 100, 1920×1080 y tiempos del compositor. FFmpeg convierte a 30 fps, H.264 yuv420p con rango limitado explícito. Solo mantiene fotogramas cuando el compositor no publica cambios. Los clips 50–52 comparten una captura continua; toda la codificación se hace después de grabar.

La pista real se normaliza en dos pasadas por segmento (50–52 como un solo tramo continuo) a −19 LUFS (3 dB por debajo de la voz), para que las vistas previas breves tengan un nivel útil además de los acordes largos. Bajo narración recibe únicamente 3.5 dB de ducking, con ataque de 40 ms y liberación de 150 ms. No se silencian las vistas previas. Un limitador a −1.5 dBFS con compensación de latencia evita saturar la suma sin renormalizar toda la voz. work/sequencer-ducked.wav permite revisar el resultado musical sin la voz.

Cada segmento reserva 0.4 s antes de la voz y 0.6 s después; el primero 1.5 s. Se redondean las fronteras a 1/30 s. Las escuchas 18, 21 y 44 añaden 5, 2 y 18 s; el cierre añade un segundo de fundido. Se conserva la voz completa y el texto original en 52 entradas SRT.

En el clip 30 se fija explícitamente «Desde el compás» en 6, se resalta la sección exacta (no la sección raíz) y se alinea su borde inferior a 30 px del borde de la pantalla. Solo durante ese clip, una decoración de grabación mantiene el panel de trabajo visible con posición sticky y altura máxima de 750 px. Se restaura su estilo al terminar. La partitura sigue arriba y la tarjeta queda abajo; no se modifica CSS ni código del producto. work/clip-30-tarjeta.png y cardFraming documentan el encuadre.

Borrar, deshacer/rehacer, elegir duración e insertar un silencio no suenan por sí mismos. Se añade una audición real de la nota antes de borrar (15), al recuperarla (16 y 40) y antes del ejercicio de duración (26); en este último se devuelve el cursor al pulso 4 con → para conservar C–D–E y el silencio. No se añaden sonidos artificiales. Piano Roll conserva el sexto compás vacío del plan y la maniobra A4 → B4, octavo → cuarto.

Salidas finales: tutorial-secuenciador-v2.mp4, tutorial-secuenciador-v2.srt, timeline.json y hoja-contactos.png. La v1 permanece como referencia. work/ conserva WAV reales por clip, PCM, fotogramas, registros y estados. Ningún binario se añade a Git.

Ensayo local de todas las acciones (override solo en memoria):

```sh
npm run tutorial -- content/tutoriales/secuenciador-es.json --clips .local-work/video-secuenciador-audio-es --out .local-work/tutorial-ronda2-synth --rehearse --instrument Synth
node scripts/sequencer/revisar-tutorial.mjs .local-work/tutorial-ronda2-synth --rehearse
```

--rehearse-video añade captura y codificación del ensayo corto, sin montaje con voz. Permite detectar anillos e insignias en fotogramas reales. --rehearse omite las esperas de narración, mantiene audiciones suficientes para medir audio y escribe work/rehearsal.json, capturas, WAV por clip y revision-rehearsal.json. --instrument Synth solo altera el estado cargado en esa sesión; no escribe el plan ni el proyecto. --assemble monta una captura completa de work/recording.json; una captura v1 sin pista real no sirve para este montaje. --repair-intro se rechaza porque reemplazar solo el inicio dejaría incompatible la captura de audio continua.

La revisión exige audio del secuenciador con pico mayor de −45 dBFS en 12–19, 25–27, 37–40 y las escuchas 20, 21, 44 y 50. Mide la pista separada para impedir que la voz oculte una ausencia de música. Además comprueba formato, continuidad, voz completa y 52 subtítulos. Para cada escucha, el montaje detecta el inicio de la forma de onda PCM (tres muestras consecutivas sobre −60 dBFS), y compara ese inicio real con el avance del cursor del video codificado. El montaje detecta también el primer fotograma violeta de cada anillo o pulso de insignia y contrasta su tiempo con el reloj PCM. Calcula un desplazamiento común por clip que satisface todas las marcas y la escucha dentro de ±40 ms. Ajusta la pista real completa de ese clip; los clips 50–52 se desplazan juntos, sin cortar su continuidad. No cambia velocidades ni reconstruye notas. Se conserva el audio en las reservas de silencio; ajustes de más de 150 ms o diferencias internas que no permiten la tolerancia detienen el montaje. La revisión final vuelve a medir el cursor del MP4 y comprueba también la pista musical después del ducking.

Ensayo visual utilizado en la ronda 2: sustituir --rehearse por --rehearse-video en el comando local anterior. El timeline conserva previewSync (reloj del navegador), previewVisualSync (detección en video) y audioDelayMs (corrección aplicada al PCM).
