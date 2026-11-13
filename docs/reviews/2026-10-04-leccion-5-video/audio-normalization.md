# Revisión de sonoridad — Lección 5, limitador y mezcla con ganancia fija

Aplicado el nuevo encargo: cada fragmento externo se recorta, recibe sus fades, se sobremuestrea a 192 kHz y pasa por `alimiter` (−6 dB, ataque 5 ms, liberación 50 ms, `level=false`, compensación de latencia). Se mide y normaliza con `loudnorm` lineal a −19 LUFS / −1.5 dBTP. Tres segundos de silencio de análisis vacían el buffer en ambas pasadas; se recortan de la salida y se conserva su longitud en muestras. Se verifica el modo lineal aplicado y se mide cada WAV final con EBU R128 antes de la mezcla. Los nueve fragmentos miden −19.0 LUFS, salvo ars nova a −18.9, en ambos idiomas; cumplen ±0.3 LUFS.

La mezcla calcula una sola ganancia para llegar a −16 LUFS. En ambos idiomas no cabe bajo −1.5 dBTP, por lo que utiliza la alternativa autorizada: `volume` con ganancia fija (ES +0.96 dB / EN +0.84 dB) y `alimiter` a −1.5 dBTP, sobremuestreado y sin autonivel. Nunca aplica loudnorm dinámico a la mezcla de salida. El informe `normalization.measured` describe la primera pasada de análisis; su salida dinámica se descarta. El modo efectivamente aplicado se registra en `normalization.mode`, y los resultados del MP4 en `normalization.verified`.

Medición directamente del AAC de cada MP4 con `ffmpeg -ss <inicio> -i <mp4> -t <duración> -vn -af ebur128=peak=true -f null -`. Voz: desde el inicio del primer clip hasta el final del último del mismo still, incluidas las pausas internas de 0.25 s. Música: intervalo completo del timeline, incluidos los fades. Valores integrados del resumen final a 0.1 LU; intervalos y niveles absolutos en `loudness.json`.

| Still | Música − voz ES (LU) | Música − voz EN (LU) | Reducción de pico previa (dB) |
| --- | --- | --- | --- |
| monodia | -2.7 | -2.9 | 0.00 |
| organum | -2.4 | -2.5 | 0.00 |
| ars-nova | -2.5 | -2.9 | 1.49 |
| preclasico | -2.6 | -2.6 | 1.38 |
| clasico | -2.6 | -2.4 | 0.00 |
| impresionismo | **-1.9** | -2.3 | 0.00 |
| expresionismo | -2.2 | -2.4 | 0.94 |
| dodecafonia | -2.6 | -2.6 | 1.52 |
| microtonalismo | -2.0 | -2.3 | 4.14 |

**17 de 18 tramos cumplen −2 a −3.5 LU.** Solo impresionismo ES queda fuera: −1.9 LU, 0.1 LU por encima del límite de −2.0. No se realizaron ajustes adicionales ni otro remontaje tras medirlo, conforme al encargo. La reducción de pico de la tabla es la diferencia entre el máximo verdadero antes/después del limitador previo, antes de la ganancia de normalización; queda registrada con ambas mediciones en cada timeline.

| Versión | Sonoridad global | Pico verdadero máximo | Duración MP4 |
| --- | --- | --- | --- |
| ES | −16.0 LUFS | −1.4 dBTP | 948.966667 s |
| EN | −16.0 LUFS | −1.4 dBTP | 895.444 s |

Ambos cumplen −16 ±0.5 LUFS y pico ≤ −1.0 dBTP, medidos después de AAC. Revisión con [`alimiter` documentado por FFmpeg](https://ffmpeg.org/ffmpeg-filters.html#alimiter), sobremuestreo y compensación de latencia.

Remontaje único con `npm run video` por idioma reutilizando los 90 PNG base. Duraciones, 133 clips/SRT, continuidad y formato comprobados; narración, música de origen, storyboard y tiempos conservados. Entregas reemplazadas en H: y los mismos IDs privados de Drive, con los mismos nombres. Copias de H: verificadas byte por byte; tamaño y privacidad remotos verificados por metadatos.

Pruebas: lint y TypeScript aprobados; 560 unitarias aprobadas, 3 todo; 9 Playwright aprobadas. Incluyen la ganancia de mezcla, selección lineal frente a ganancia fija/limitador, frontera del pico, atenuación, LRA, ausencia de autonivel, compensación de latencia y silencio.
