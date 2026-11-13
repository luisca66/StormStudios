# Encargo para Codex — Video tutorial del secuenciador (grabación de pantalla automática)

Fecha: 2026-10-02. Lo escribe Claude; Luis aprobó el guion y la narración.

## Objetivo

Producir `tutorial-secuenciador-v1.mp4` (1920×1080, 30 fps, H.264 CRF 18 yuv420p, AAC 48 kHz, faststart) y su `.srt`: una grabación de pantalla **automatizada** del Storm Sequencer v4 real (`/es/sequencer/v4`, modo «Melodía y acordes»), sincronizada con la narración ya generada de Luis.

No es un video de stills: el navegador se graba mientras un script de Playwright ejecuta en pantalla lo que dice cada clip.

## Materiales (no los modifiques)

- Clips de voz: `.local-work/video-secuenciador-audio-es/{n}_Chapter_1.mp3`, n = 1…52.
- Duraciones: `.local-work/video-secuenciador-audio-es/Duraciones_Video_Secuenciador.txt` (`001 1_Chapter_1.mp3 3.600`).
- Texto de cada clip, una línea por clip: `.local-work/video-secuenciador-audio-es/guion-clips.txt` (fuente del SRT).
- Guion con indicaciones de pantalla: `docs/guion-video-secuenciador-borrador.md`.
- Montaje de lecciones ya existente (para reutilizar normalización, SRT, verificación): `scripts/sequencer/video.mjs`, `docs/secuenciador-video.md`.

## Qué construir

1. `content/tutoriales/secuenciador-es.json`: plan de grabación, una entrada por clip con sus acciones (lista de pasos declarativos: `click`, `ctrlClick`, `drag`, `rightClick`, `type`, `key`, `scroll`, `highlight`, `toast`, `play`, `wait`, `loadProject`…). Que el plan sea datos, no código, para poder reusarlo en la versión inglesa y en el video de SATB.
2. `scripts/sequencer/grabar-tutorial.mjs` (+ `npm run tutorial -- content/tutoriales/secuenciador-es.json --clips <dir> --out <dir>`):
   - Playwright Chromium, viewport 1920×1080, `deviceScaleFactor` 1, contexto limpio (sin localStorage), servidor `npx next dev --port 3100` (o `next start` si lo prefieres por fluidez).
   - Captura a 30 fps reales (CDP screencast o `recordVideo`; elige la que dé imagen nítida sin saltos y documenta por qué).
   - **Cursor visible**: Playwright no dibuja el puntero. Inyecta un cursor tipo flecha que se mueva con aceleración suave (300–600 ms por desplazamiento) y un anillo breve en cada clic. Clic derecho con un anillo de otro color.
   - **Insignia de teclas**: al presionar atajos (Ctrl+Z, Ctrl+Y, Ctrl+clic, Espacio, letras A–G, números, flechas, Re Pág/Av Pág) aparece abajo al centro una insignia tipo `Ctrl + Z` durante ~1.2 s.
   - **Resaltado de zonas** (`highlight`): rectángulo redondeado con halo violeta (`#8b5cf6`) alrededor de un elemento, con el resto de la pantalla atenuado ~35%. Desaparece con fundido.
   - **Toast** para descargas y selector de archivo: Playwright intercepta la descarga / el file chooser; muestra un aviso discreto «storm-project.json descargado» o el nombre elegido.
   - No agregues subtítulos quemados ni títulos: Luis pone logos, entrada y salida en Vegas.
3. Montaje: cada segmento = 0.4 s + voz del clip + 0.6 s (el primero empieza con 1.5 s). Si las acciones de un clip no caben, alarga ese segmento con silencio (máx. +2 s) y repórtalo. Los segmentos de escucha (abajo) se alargan lo que dure la música.
4. **Audio del secuenciador**: Playwright no graba audio. En los momentos de escucha exporta el WAV del mismo estado del proyecto con la función del propio secuenciador (botón WAV / su función interna) y colócalo exactamente donde en el video se presionó Reproducir, para que el cursor de reproducción y el sonido coincidan (±40 ms). Los sonidos de vista previa al escribir notas se omiten. Normaliza como `video.mjs`: voz −16 LUFS, música −19 LUFS, loudnorm final −16 LUFS en dos pasadas.
5. Salidas en `stills/es/tutorial-secuenciador/video/`: `tutorial-secuenciador-v1.mp4`, `tutorial-secuenciador-v1.srt` (una entrada por clip con su texto de `guion-clips.txt` y tiempos reales), `timeline.json`, y **una hoja de contactos**: un fotograma a mitad de cada clip, numerado, en un PNG (para mi revisión).

## Estado inicial y proyecto preparado

- Clips 1–19: proyecto nuevo y vacío, Do mayor, 4/4, tempo 72, clave de Sol.
- Al iniciar el clip 20 se carga (corte limpio con fundido de 0.3 s) el proyecto preparado `content/tutoriales/secuenciador-proyecto-1.json` que debes crear: 5 compases; compases 1–4 con acordes enteros I–IV–V–I en Do mayor (C4 E4 G4 · C4 F4 A4 · B3 D4 G4 · C4 E4 G4), compás 5 vacío, sin cifrados.

## Acciones por clip

Las duraciones son de la voz. Las notas usan nombres en inglés con octava (C4 = Do central).

| Clip | s | Acción en pantalla |
|---|---|---|
| 1 | 3.6 | Página `/es/curso-armonia`, arriba. Cursor quieto. |
| 2 | 8.6 | Scroll lento hacia abajo por la página del curso. |
| 3 | 7.0 | Sigue el scroll lento. |
| 4 | 11.4 | Llega al final; `highlight` del recuadro «Storm Sequencer v4.0»; clic en «Abrir v4.0»; carga el secuenciador. |
| 5 | 4.0 | Vista general del secuenciador vacío. |
| 6 | 13.4 | `highlight` barra de transporte; el cursor señala en orden: Reproducir, Detener, Tempo, Posición, Métrica · tono, Cifrado. |
| 7 | 9.6 | `highlight` título del proyecto y selector Modo (muestra «Melodía y acordes»). |
| 8 | 7.2 | `highlight` botones de archivo; el cursor pasa por Nuevo, Guardar JSON, Abrir, Exportar. |
| 9 | 9.4 | `highlight` la partitura; luego la barra de herramientas (Figura, Mouse, Alteración). |
| 10 | 10.2 | `highlight` el inspector. |
| 11 | 10.5 | El cursor recorre los botones de figura mientras se nombran (entera → treintaidosavo) y hace clic en «Entera». |
| 12 | 9.7 | Clic en «✎ Escribir»; clic en el pentagrama en C4, compás 1. |
| 13 | 8.5 | Clic en el compás 2 en D4 (nota «mal puesta»); arrastrarla hacia arriba hasta F4. |
| 14 | 12.1 | Seleccionar esa F4; clic ♯ (F♯4); clic ♮; clic «Armadura». |
| 15 | 5.8 | Clic derecho sobre la nota del compás 2: se borra. Clic en «⌫ Borrador» y de vuelta a «✎ Escribir». |
| 16 | 7.4 | `Ctrl+Z` (la nota regresa) y `Ctrl+Y` (se borra otra vez). Insignias. |
| 17 | 10.6 | `Ctrl+clic` en E4 del compás 1 → acorde C–E. Insignia «Ctrl + clic». |
| 18 | 6.3 | `Ctrl+clic` en G4 → C–E–G. **Escucha**: después de la voz, Reproducir; suena el acorde (~3.5 s a 72 BPM). |
| 19 | 11.7 | Clic en el E4 del acorde (solo él queda seleccionado); clic ♭ → E♭4; `Ctrl+Z`. |
| 20 | 7.2 | Corte al proyecto preparado. Clic en Reproducir; suena; `Espacio` detiene. **Escucha** con audio. |
| 21 | 5.0 | `Espacio`: reproduce; se ve el cursor de reproducción avanzar. **Escucha** con audio hasta ~6 s; `Espacio` detiene. |
| 22 | 12.4 | Clic en Tempo, escribir 60, Enter; activar Metrónomo; activar Repetir; luego desactivar ambos (sin reproducir). |
| 23 | 6.1 | Clic «Ir al final» y «Ir al inicio»; la Posición cambia. |
| 24 | 6.0 | Clic «⌨ Escribir con teclado». Clic en el número del compás 5 para poner ahí el cursor. |
| 25 | 12.2 | Teclas `3` (cuarto), luego `C`, `D`, `E`: se escriben en el compás 5. Insignias. |
| 26 | 11.0 | Teclas `4` y `3` (cambia la figura en la barra), `R` (silencio, completa el compás), `PageUp` y `PageDown` (insignias «Re Pág» / «Av Pág»). |
| 27 | 10.2 | `←` `←`; clic sobre el E4 del compás 5; `↑` `↑` y luego `↓` `↓` (suena; aquí sin audio). |
| 28 | 6.2 | Scroll hasta «Atajos de teclado», abrirlo, pausa, cerrarlo, scroll de regreso. |
| 29 | 9.1 | Clic «＋ Añadir compás» → aparece el compás 6. |
| 30 | 11.9 | `highlight` tarjeta «Cambio de armadura, compás o clave»; cambiar el compás 6 a 3/4 (o a Sol mayor) y aplicarlo; luego `Ctrl+Z`. |
| 31 | 6.2 | Clic «Vista por páginas», pausa, «Vista continua». |
| 32 | 6.2 | Clic «↖ Seleccionar»; arrastrar un rectángulo sobre los acordes de los compases 1–2. |
| 33 | 11.6 | `Ctrl+C`; clic en el número del compás 6; `Ctrl+V` (aparecen los acordes); `Ctrl+Z`; reseleccionar y `Ctrl+D`. Insignia para `Ctrl+X` sin ejecutarlo. |
| 34 | 9.2 | `Ctrl+Z` hasta volver a 5 compases como en el proyecto preparado + compás 5 escrito por teclado. Cursor tranquilo. |
| 35 | 6.9 | Clic en la pestaña «Piano Roll». |
| 36 | 12.2 | El cursor señala las etiquetas de nota a la izquierda, los encabezados de compás arriba y una barra. |
| 37 | 5.6 | Clic «✎ Escribir»; clic en una fila vacía (A4, compás 5, pulso 4 si está libre; si no, el compás que esté libre) → nueva barra. |
| 38 | 8.4 | Arrastrar esa barra un semitono o dos arriba y un pulso a la derecha (dentro de compases existentes). |
| 39 | 5.8 | Arrastrar su borde derecho para alargarla. |
| 40 | 4.3 | Clic derecho → se borra; `Ctrl+Z` → regresa. |
| 41 | 8.0 | Clic en la pestaña «Pentagrama»; `highlight` sobre la nota editada. |
| 42 | 11.8 | Escribir en las casillas de cifrado del pulso 1 de los compases 1–4: `I`, `IV`, `V`, `I`. |
| 43 | 8.5 | Pausa con cursor tranquilo sobre los cifrados. |
| 44 | 10.4 | Clic «Ocultar cifrados» y «Mostrar cifrados»; Reproducir desde el inicio: `highlight` de la celda «Cifrado» del transporte mientras cambia. **Escucha** con audio (compases 1–4). |
| 45 | 8.2 | `highlight` del indicador «Borrador guardado en este navegador». |
| 46 | 10.5 | Clic «Guardar JSON»; toast de descarga. |
| 47 | 5.9 | Clic «Abrir proyecto»; interceptar el selector y cargar ese mismo JSON; toast con el nombre. |
| 48 | 5.2 | Clic «Exportar MIDI»; toast de descarga. |
| 49 | 4.3 | Clic «Proyecto nuevo» (partitura vacía); recargar el proyecto (Ctrl+Z si se puede, o el JSON guardado) al inicio del clip 50. |
| 50 | 9.4 | Proyecto completo a la vista; Reproducir con audio. |
| 51 | 7.4 | Sigue sonando. |
| 52 | 1.9 | Detener; fundido a negro de 1 s después de la voz. |

Si alguna acción no existe tal cual en la interfaz (p. ej. el cambio de compás requiere otro flujo), usa el equivalente más cercano y anótalo en el reporte. No inventes funciones.

## Reglas

- Rama `codex/video-tutorial-secuenciador` desde `main`. No hagas merge ni push a `main`; deja el PR abierto.
- No modifiques `components/sequencer/*` ni `lib/sequencer/*` salvo un bug que bloquee la grabación; en ese caso detente y repórtalo.
- No subas MP4/WAV/PNG/MP3 a Git (`.local-work/` y `stills/` están fuera). No subas nada a R2 ni a Drive.
- Pruebas: `npm run test` y `npm run lint` deben seguir pasando.

## Aceptación (la verifica Claude)

- `ffprobe`: 1920×1080, 30 fps, H.264 yuv420p, AAC 48 kHz; duración igual a `timeline.json` ±0.1 s; voz usada completa y en orden.
- Hoja de contactos: cada clip muestra la acción de su fila.
- En los segmentos de escucha, el cursor de reproducción y el sonido coinciden.
- El cursor y las insignias se ven nítidos; nada tapa la partitura.

## Reporte final

Lista breve: comando para regenerar, duración total, clips alargados y por qué, acciones sustituidas, y ruta del MP4, SRT y hoja de contactos.
