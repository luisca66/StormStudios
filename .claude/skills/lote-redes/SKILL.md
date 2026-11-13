---
name: lote-redes
description: Prepare Storm Studios' weekly social-media batch for Luis to approve and schedule — pick the week's pieces from the strategy and the log, write the vertical-short scripts (Remotion `Corto` JSON, ES and EN), render and review them when the machine allows it, and write every caption, title and post text into one LOTE.md. Never publishes. Use when Luis asks for the weekly batch or anything like it ("prepara el lote de redes", "qué publicamos esta semana", "haz los cortos de la semana", "arma el contenido de redes"), when he reports what he published, or when he asks how the pieces performed.
---

# Lote semanal de redes

Prepara lo que Storm Studios publica en una semana y lo deja listo para que Luis revise las piezas y dé un solo «sí». Genera `LOTE.md` y `manifiesto.json`; después de la aprobación explícita del lote, la automatización `scripts/redes/publicar-lote.mjs --confirmar` sube y programa YouTube y la página propia de Facebook. Sin aprobación, solo `--dry-run`. Esta skill no abre cuentas. WhatsApp sigue siendo manual.

Todo lo que lee Luis va en español. Las piezas en inglés solo van a YouTube.

## Dónde está cada cosa

Raíz del sitio: `C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios`. Taller de video: `C:\Users\Luis\Documents\Claude Cowork\nuevo_website\video-demo-storm`.

| Qué | Ruta |
|---|---|
| Estrategia (pilares, cadencia, reglas) | `apps-src/plan-lanzamiento/ESTRATEGIA-REDES-2026-11-11.md` |
| Bitácora de piezas | `apps-src/plan-lanzamiento/redes/BITACORA.md` |
| Lotes | `apps-src/plan-lanzamiento/redes/lotes/<AAAA>-S<NN>/` |
| Videos del canal y páginas del sitio | `apps-src/plan-lanzamiento/encargos/inventario-youtube/INVENTARIO-YOUTUBE.md` |
| Plantilla de cortos y su contrato | taller, `montaje/NOTAS-CORTOS.md` |
| Tomas de juegos y apps ya capturadas | taller, `tomas/` (se ven en Remotion como `tomas/<id>.mp4`) |
| Voz de Luis por ElevenLabs | taller, `largo/generar-voz.py` |

`apps-src/plan-lanzamiento/` está fuera de git a propósito: nada de ahí se sube al repositorio.

## Pasos

### 1. Leer antes de decidir

- La estrategia, secciones 6 (pilares), 8 (cadencia) y 11 (reglas).
- La bitácora completa: qué se preparó, qué se publicó y qué quedó sin usar.
- Qué hay nuevo en el sitio desde el último lote: `git log --since=<fecha del último lote> --oneline main` y mira lecciones, apps, juegos y artículos nuevos. Una lección nueva manda sobre todo lo demás.
- Si hay piezas preparadas y sin publicar de lotes anteriores, van primero: no prepares más encima.

### 2. Elegir las piezas

El lote normal lleva:

- **2 cortos**, cada uno en español y en inglés.
- **1 publicación de Facebook** con enlace al sitio.
- **1 estado de WhatsApp.**
- Si hay lección nueva: título y descripción del video largo, al estilo del inventario.

Reglas de selección:

- Rota los pilares P1 (reto de oído), P2 (el juego) y P3 (un concepto en 40 segundos). No repitas pilar en los dos cortos de una semana.
- Producto (P5: libro, app, clases): como mucho una de cada cinco piezas. Cuenta en la bitácora.
- Una pieza personal (P4) al mes necesita material de Luis (foto, video, anécdota). Pídeselo en el lote; no la inventes.
- No repitas un tema que ya esté en la bitácora en las últimas ocho semanas.
- Cada pieza remata en una página concreta del sitio que exista. Compruébala.

### 3. Escribir los guiones de los cortos

Un JSON por corto y por idioma en `montaje/cortos/<AAAA>-S<NN>-<tema>.<es|en>.json`, según el contrato de `NOTAS-CORTOS.md`. Los `ejemplo-*.json` de esa carpeta son el modelo.

- De 15 a 40 segundos. Una sola idea y una sola acción al final.
- El texto de pantalla es corto: si un bloque no cabe, la plantilla falla al renderizar. Divide la frase.
- El `cta` siempre lleva `stormstudios.com.mx`: los enlaces de las descripciones de Shorts y Reels no se pueden pulsar.
- La música teórica tiene que ser correcta: nombres de notas, intervalos y grados comprobados contra la lección. En inglés, notas en letras (C, D, E♭).
- Las tomas quedan silenciadas por la plantilla. Si la pieza necesita el sonido del juego, extrae el audio de la toma con ffmpeg a `montaje/public/` y añádelo como pista de `audio`.
- Voz de Luis: solo cuando la pieza la necesita. Haz una prueba corta antes de generar todo y no gastes caracteres en repetir tomas.
- Música de fondo: solo de Luis. Si no hay, el corto va sin música.

Valida cada guion: `node scripts/props-corto.mjs cortos/<nombre>.json` (desde `montaje/`).

### 4. Renderizar y revisar

Requiere Windows con Node en la máquina de Luis. **Si la sesión no puede ejecutar comandos ahí** (por ejemplo, en Cowork sin acceso a la terminal de Windows), no lo intentes por otra vía: deja los guiones validados y escribe en el lote la sección «Pendiente de render» con los comandos exactos.

```sh
node scripts/props-corto.mjs cortos/<nombre>.json
npx remotion render src/index.ts Corto out/cortos/<nombre>.mp4 --props=out/props-corto.json --codec=h264
```

Revisión de cada MP4, porque no se puede «ver»:

- Saca tres cuadros (inicio, mitad y cierre) con `npx remotion still … --frame=<n> --scale=0.4` y míralos: texto legible, sin faltas, nada en los 220 px de arriba ni en los 420 px de abajo, el cierre con logo y dirección.
- `ffprobe`: 1080×1920, duración igual a la del guion, pista de audio presente si el guion la pide.
- Lee el texto de cada bloque una vez más buscando erratas y errores de teoría.

Un corto con un error de nota no se entrega: se corrige o se saca del lote.

### 5. Escribir los textos

Para cada pieza, en el idioma que le toca:

- **YouTube Short**: título de hasta 70 caracteres con el tema primero; descripción de dos líneas (qué se practica y la dirección de la página).
- **Facebook**: dos o tres frases y el enlace.
- **Instagram** (solo si la cuenta ya existe según la bitácora): pie de foto corto; el enlace va en la biografía.
- **WhatsApp**: una o dos frases, tono personal de Luis.

Enlaces al sitio con UTM, sin datos personales: `?utm_source=<youtube|facebook|instagram|whatsapp>&utm_medium=social&utm_campaign=lote-<AAAA>-S<NN>`.

### 6. Pasar las reglas de la casa

Antes de entregar, revisa cada pieza contra la sección 11 de la estrategia. Las que más se rompen:

- Nada de «garantizado», «en 7 días» ni promesas de oído absoluto. Se dice «entrena», «practica», «aprende».
- Solo música de Luis o con licencia clara.
- Ningún alumno sin permiso escrito; menores, nunca.
- Nada de «comenta SÍ para recibir el enlace» ni títulos engañosos.
- No anunciar una app como disponible si la tienda no la ha aprobado. Si no consta en la bitácora o en el plan, pregunta.

### 7. Entregar

Escribe `apps-src/plan-lanzamiento/redes/lotes/<AAAA>-S<NN>/LOTE.md` con este orden:

1. **Resumen**: qué trae el lote y cuánto tiempo le toma a Luis.
2. **Una sección por pieza**: pilar, archivo (ruta completa del MP4, o «pendiente de render»), día y hora sugeridos, y los textos listos para copiar, por canal.
3. **Lo que necesito de ti**: material personal, permisos, dudas de teoría o de producto.
4. **Pendiente de render**, si aplica.

Añade una fila por pieza a la bitácora con estado `preparado`. Envía `LOTE.md` a Luis y dile en dos o tres frases qué trae.

#### Manifiesto y aprobación semanal

Junto a `LOTE.md`, genera `manifiesto.json`, versión 1, según `scripts/redes/ejemplo-manifiesto.json` y `docs/automatizacion-redes.md`. Una entrada por destino: cuatro Shorts (dos ES y dos EN), dos Reels ES y una publicación de Facebook con enlace. WhatsApp queda solo en LOTE.md. Cada entrada lleva `key` estable, `platform`, `kind`, `language`, `file` (MP4 absoluto o relativo al manifiesto; null para enlace), `title`, `description`, `tags`, `publishAt` con sufijo `-06:00`. Los videos llevan `width`, `height`, `durationSeconds` comprobados en el render; YouTube también `madeForKids` y `containsSyntheticMedia` según su contenido. No deduzcas que tener voz sintética implica siempre etiquetado: revisa la política de YouTube y el contenido real. Nunca añadas secretos.

Propón primero las fechas con `node scripts/redes/calendario.mjs AAAA-SNN`: semana ISO, martes 19:00 texto con enlace, jueves 19:00 corto 1 ES y 19:30 EN, domingo 12:00 corto 2 ES y 12:30 EN. Facebook repite solo los ES a la misma hora. Son horarios iniciales propuestos, no resultados de medición. Respeta cimientos/calendario de lanzamiento de la estrategia: si no hay revisión o falta una aprobación de producto, no publiques. Si un horario ya pasó, mueve esa pieza a una fecha explícita futura y muéstrala en LOTE.md; no la publiques inmediatamente ni la recorras en silencio.

No sobrescribas un manifiesto que tenga `remote`: es el registro de idempotencia. Los IDs solo los escribe la API o una reconciliación comprobada. Muestra a Luis el resumen con siete destinos, fechas y cualquier excepción. Ejecuta `node scripts/redes/publicar-lote.mjs <ruta/manifiesto.json>` para validar sin red. Corrige errores y revisa los MP4 antes de solicitar el «sí». Con un «sí» explícito para ese lote y fechas, se puede ejecutar el mismo comando con `--confirmar`; no se solicita permiso por cada pieza. Un lote nuevo necesita una aprobación nueva. Las credenciales se preparan una sola vez siguiendo el documento.

### 8. Cuando Luis cuenta qué publicó

Cambia en la bitácora el estado a `publicado` con la fecha y el canal, o a `descartado` con el motivo. Solo con lo que Luis diga: no lo deduzcas.

### 9. Medición (una vez al mes, o cuando Luis pregunte)

 Pídele las vistas de cada pieza publicada, o léelas del canal si te lo pide. Anótalas en la bitácora y aplica la regla de la estrategia: lo que rinde el triple de la mediana se repite tres veces; un pilar que no pasa de la mediana en seis intentos se suelta. Dilo en el siguiente lote.

Para el reporte semanal usa `node scripts/redes/reporte-semanal.mjs <ruta/manifiesto.json> --consultar`: consulta IDs ya guardados, verifica publicación real, escribe `apps-src/plan-lanzamiento/redes/reportes/` y añade estados por destino a la bitácora. Sin `--consultar` solo muestra una simulación. N/D no es cero; no inventes clics externos de Shorts ni compares vistas de plataformas distintas. El reporte es acumulado por pieza y las fechas de YouTube Analytics usan hora del Pacífico.

## Límites

- Publicar/programar YouTube y la página propia de Facebook solo mediante el manifiesto revisado y aprobado explícitamente por Luis y `--confirmar`. No publiques en Instagram ni WhatsApp. En sesiones cuyo encargo prohíba APIs reales (como la implementación inicial), no ejecutes confirmación, autorización ni consultas reales.
- No abras cuentas ni reserves nombres.
- No toques el sitio. Si el lote necesita un cambio de código (una página, la plantilla), descríbelo en «Lo que necesito de ti»: el código lo hacen Sol o Gemini Argon con `scripts/agentes/lanzar-agente.ps1`, y Claude solo revisa.
- No gastes dinero: nada de anuncios ni servicios nuevos.

## Lecciones aprendidas

Añade aquí, con fecha, lo que cada lote enseñe.

- **2026-11-12** — El lote S46 decía jueves 13, domingo 16 y martes 18; en 2026 son viernes, lunes y miércoles. El manifiesto inicial conserva las fechas numéricas como excepción visible. Los nuevos lotes usan semana ISO y calendario validado de CDMX. Si una subida pierde la respuesta, se bloquea el reintento hasta reconciliar; borrar `remote` sin comprobar podría duplicarla.

- **2026-11-11** — En la plantilla, un texto con degradado hereda la sombra de su contenedor y se ve oscuro; el título lleva `textShadow: 'none'`. Si un bloque nuevo usa texto degradado, lo mismo.
- **2026-11-11** — La medición de texto de la plantilla cuenta cualquier `transform` como desborde: un pulso de escala en la cuenta regresiva la hacía fallar en su primer cuadro. Las animaciones dentro de una placa van por opacidad o brillo, no por escala. Al revisar, saca siempre un cuadro en el **primer** cuadro de cada bloque, no solo a la mitad.
- **2026-11-11** — Las tomas del taller no tienen audio (las grabó Playwright). Un reto de oído necesita notas: se arman con los samples de piano del sitio (`https://samples.stormstudios.com.mx/Piano/<nota>.mp3`, con cabecera `Origin` del sitio) mezclados con ffmpeg en `montaje/public/cortos/`. Un clip de juego lleva la música de Luis o va sin sonido.
- **2026-11-11** — Música de Luis disponible: `video-demo-storm/music/musica-uno-diez-0N.wav` (la del demo corto); Luis confirmó que es suya y se puede usar en cortos. Volumen 1 en la plantilla; a 0.7 queda demasiado baja para un teléfono.
- **2026-11-11** — Gemini Argon por `agy` puede terminar su turno sin escribir el archivo pedido. En los encargos, decir que el turno acaba solo cuando el archivo exista.
