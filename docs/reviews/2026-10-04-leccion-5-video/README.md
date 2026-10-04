# Entrega Lección 5 — ES y EN — 4 de octubre de 2026

Montaje realizado sobre `codex/video-imagen-musica` (#34), después de incorporar los SVG regenerados de `codex/leccion-5-teorica` (#33). #33 está listo para revisión. Se mantiene `construction` y el aviso genérico, según confirmación de Claude. La fuente tiene 14 SVG generales y 48 variantes de video; todos se copiaron sin cambios.

| Versión | MP4 | Timeline | Voz | Música | Pausas | Bytes |
| --- | --- | --- | --- | --- | --- | --- |
| ES | 948.966667 s | 948.964667 s | 654.400 s | 192.714667 s | 101.850 s | 32532280 |
| EN | 895.444 s | 895.444667 s | 600.880 s | 192.714667 s | 101.850 s | 30531164 |

La música incluye los nueve MP3 completos (175.848 s) y el piano del secuenciador. Sin `musicTrim`. Los MP3 originales conservan sus hashes SHA-256; narraciones, guiones, mapas y storyboards no se modificaron.

Archivos entregados en `H:/Website Clases/05 Lección 5/Video 2026/`:

- `leccion-5-v1.mp4`, `leccion-5-v1.srt`, `timeline.json`.
- `leccion-5-v1-en.mp4`, `leccion-5-v1-en.srt`, `timeline-en.json`.

Copias privadas de Drive, verificadas por metadatos y tamaño:

- [Español](https://drive.google.com/file/d/1kS_Q4elkBokxDixqS1OfRckiJ6lAZPJu/view?usp=drivesdk).
- [English](https://drive.google.com/file/d/1rxrfMXI_Vb_ZkB07XFzPcA0pxp7lAHR9/view?usp=drivesdk).

Ambos montajes tienen 90 stills, 133 clips completos una vez y en orden, 133 entradas SRT, nueve tramos externos con crédito y sin cursores, más los cursores de piano. Se comprobó continuidad entre stills y suma de voz + música + pausas, con diferencia MP4/timeline menor de 0.1 s. Formato: H.264 1920×1080, yuv420p, 30 fps, AAC 48 kHz. Las copias de H: coinciden por SHA-256 con los MP4 de `stills/{es,en}/06-leccion-5/video/`.

Comandos ejecutados en ambos idiomas, con `npx next dev --port 3100`:

```sh
npm run stills -- content/storyboards/<locale>/06-leccion-5.json
npm run video -- content/storyboards/<locale>/06-leccion-5.json --audio content/storyboards/<locale>/06-leccion-5.audio.json --clips .local-work/06-leccion-5-audio-<locale> --out stills/<locale>/06-leccion-5/video
```

B: lint, TypeScript y 539 pruebas unitarias aprobados. C: lint, TypeScript, 555 unitarias y 9 Playwright aprobados. Las previews de B y C se desplegaron correctamente. El CI general conserva el fallo previo de audición al arrastrar del editor, también presente en main; no afecta a los comandos de captura y montaje ejecutados.

Claude confirmó formato, continuidad, SRT y los 180 fotogramas. Se remontó una vez por idioma con limitador previo a la música y normalización lineal a −19 LUFS / −1.5 dBTP. La mezcla usa ganancia fija y limitador a −1.5 dBTP, según el nuevo encargo. Las entregas se reemplazaron en los mismos nombres/IDs. **17/18 tramos cumplen: impresionismo ES queda 0.1 LU por encima del rango solicitado**, sin iteraciones adicionales; véase [mediciones e incidencia](audio-normalization.md). MP3/WAV/PNG/MP4 permanecen fuera de Git.
