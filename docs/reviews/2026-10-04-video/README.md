# Prueba C — imagen y música externa

Video privado: https://drive.google.com/file/d/1vtcfpy2vqOksk4451Loz17JX6aw5ED8b/view?usp=drivesdk

Tres stills: título, círculo de quintas de `content/storyboards/es/06-leccion-5.json`, y gráfico preclásico con `musicFile`, recorte 0–6 s y crédito original. La voz reutiliza únicamente los clips 1–3 del material local; es una prueba de herramientas, no un montaje editorial de la Lección 5. Los originales no se modificaron.

Salida local: `stills/es/prueba-imagen-musica/video/leccion-prueba-imagen-musica-v1.mp4`, SRT y `timeline.json`. Formato H.264 1920×1080, yuv420p, 30 fps; AAC estéreo 48 kHz. Duración: 28.433 s frente a 28.420 s de timeline (18.320 voz + 6 música + 4.100 pausas). `verification.json` registra siete comparaciones de fotogramas contra las capturas esperadas, con diferencia media en gris de 0.13–0.24 (< 4). El crédito aparece durante los seis segundos de música y desaparece en la pausa posterior; no hay cursores.

Se verificó la subida privada mediante metadatos: 970054 bytes, igual que el MP4 local, sin permiso público. MP3/WAV/PNG/MP4 permanecen fuera de Git. Las capturas del PR son JPEG.

Comandos ejecutados con `npx next dev --port 3100`:

```sh
npm run stills -- .local-work/codex-review/demo/board.json
npm run video -- .local-work/codex-review/demo/board.json --audio .local-work/codex-review/demo/audio.json --clips .local-work/06-leccion-5-audio-es --out stills/es/prueba-imagen-musica/video
npx playwright test e2e/sequencer-stills.spec.ts --workers=2
```

`demo-storyboard.json` conserva el storyboard de la prueba con ruta relativa al MP3 local solicitado. El DOCX reducido, mapa y tabla de tres clips son materiales temporales en `.local-work/codex-review/demo/`; no sustituyen los guiones ni los mapas de la lección. D queda pendiente de la corrección musical de Luis.
