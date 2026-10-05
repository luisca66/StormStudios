# Lección 6: revisión técnica ES/EN

Revisión del 5 de octubre de 2026 en `claude/leccion-6-video`. Se conservó el commit inicial `1ca6af8` y la voz existente de ElevenLabs. Las salidas están en `stills/{es,en}/07-leccion-6/video/`; los medios quedan fuera de Git.

## Render y pruebas

- 76 stills por idioma, con las ocho hojas de contacto revisadas. Nombres completos Soprano/Contralto/Tenor/Bajo y Soprano/Alto/Tenor/Bass. Las partituras SATB de uno a tres compases se centran, reservan espacio para nombres y firmas y mantienen la escala de los cuatro pentagramas. Las redondas se separan de la armadura; las marcas quedan debajo de cada pentagrama, desplazadas de las cabezas.
- Revisión ampliada de Do, La mayor con tres sostenidos, Sol♭ mayor con seis bemoles, VII disminuido y III aumentado de La menor armónica. Sol♯ aparece como alteración del acorde aumentado; no se modificaron las notas del storyboard.
- L4: `ejemplos`, `escala-mayor`, `do-fundamental`; L5: `grados`, `tonica`, `dominante`. Diferencia media RGB frente a los baselines previos: **0.000 en las seis imágenes**.
- `npm test`: **566 correctas**, 3 `todo` existentes; 43 archivos correctos y 1 omitido. Incluye cuatro pruebas nuevas de layout y una del guion TXT.
- `npx playwright test e2e/sequencer-stills.spec.ts --workers=1`: **11 correctas**, incluidas dos nuevas de SATB ES/EN que comprueban nombres, márgenes, alineación de redondas y ausencia de colisiones entre marcas y notas.
- TypeScript, ESLint de los archivos de código modificados y `git diff --check`: correctos.

## Formato, tiempos y continuidad

Ambos MP4: **1920×1080**, H.264, yuv420p, **30 fps**, AAC estéreo a **48 kHz**. Una pista de video y una de audio.

| Medida | ES | EN |
| --- | ---: | ---: |
| MP4 | 656.166667 s (10:56.167) | 609.933333 s (10:09.933) |
| Timeline | 656.160000 s | 609.920000 s |
| Diferencia MP4–timeline | +0.006667 s | +0.013333 s |
| Voz, igual a la suma oficial | 531.760 s | 485.520 s |
| Piano, incluidas cuatro colas de 0.2 s | 36.800 s | 36.800 s |
| Pausas | 87.600 s | 87.600 s |
| Sonoridad integrada del MP4 | −16.0 LUFS | −16.0 LUFS |
| Pico verdadero del MP4 | −1.5 dBTP | −1.4 dBTP |

Los 118 clips se usan completos, una vez y en orden por idioma. Los 76 stills son contiguos: separación máxima **0.000 s**. Cada guion tiene 118 líneas no vacías y cada SRT 118 entradas; texto, índices y tiempos coinciden con clips/timeline dentro del redondeo de **0.5 ms**. No hay clips divididos. El segundo inicial medido desde 0.1 s tiene nivel máximo **−91 dBFS** en ambos archivos, sin señal audible.

## Fotogramas y cursor

Por idioma se compararon dos fotogramas por still: inicio +0.15 s y mitad del intervalo de narración. Además, tres fotogramas por cada una de las cuatro escuchas se compararon con su PNG de cursor. Diferencia media en gris requerida: menos de 4/255.

| Resultado | ES | EN |
| --- | ---: | ---: |
| Fotogramas de voz/inicio | 152/152 | 152/152 |
| Fotogramas de cursor | 12/12 | 12/12 |
| Diferencia media máxima, todos los fotogramas | 0.3320/255 | 0.2782/255 |

Las cuatro escuchas usan Piano del secuenciador, tempo **60**, redondas y cursores de **1 s por pulso**. Se verificó además la posición horizontal del cursor verde en el MP4, igual en ambos idiomas:

| Escucha | Compás:pulso muestreado | X en píxeles |
| --- | --- | --- |
| Do | 1:1 → 1:3 → 1:4 | 1036.0 → 1151.5 → 1209.5 |
| Estados | 1:1 → 2:3 → 3:4 | 713.5 → 1164.0 → 1539.5 |
| Posiciones | 1:1 → 2:3 → 3:4 | 713.5 → 1164.0 → 1539.5 |
| Disposición | 1:1 → 2:1 → 2:4 | 875.5 → 1223.5 → 1377.5 |

## Música frente a voz después de AAC

La primera mezcla dejaba el Piano 4.0–5.8 dB por debajo en RMS. Se corrigió el montaje para medir la narración normalizada de cada escucha y aplicar al Piano una ganancia fija con limitador sobremuestreado. La segunda mezcla cumple el objetivo de **2–3 dB por debajo con `volumedetect` en las ocho escuchas**.

| Escucha | RMS música−voz ES | RMS música−voz EN | LUFS música−voz ES | LUFS música−voz EN | Pico música ES / EN |
| --- | ---: | ---: | ---: | ---: | --- |
| Do | −2.5 dB | −2.5 dB | −1.8 LU | −2.3 LU | −2.1 / −2.5 dBTP |
| Estados | −2.5 dB | −2.5 dB | −1.8 LU | −1.3 LU | −1.6 / −1.5 dBTP |
| Posiciones | −2.5 dB | −2.6 dB | −1.6 LU | −0.9 LU | −1.5 / −1.4 dBTP |
| Disposición | −2.5 dB | −2.6 dB | −1.3 LU | −1.8 LU | −1.5 / −1.7 dBTP |

No hay saturación. RMS y LUFS son medidas distintas: se cumple el criterio de 2–3 dB solicitado con `volumedetect`; la diferencia integrada LUFS se informa por separado y no se presenta como si cumpliera ese mismo intervalo.

## Entrega

MP4, SRT y timeline se copiaron a `H:/Website Clases/06 Lección 6/Video 2026/`, con sufijo `-en` en inglés. Las copias privadas se actualizaron después de corregir el audio; los permisos consultados muestran únicamente a Luis como propietario.

- [MP4 español en Drive](https://drive.google.com/file/d/16o0WiIG4Al56ZQYZqdzuYGUhVSmCn0OZ/view): **21,838,878 bytes**, igual a la copia local final.
- [MP4 inglés en Drive](https://drive.google.com/file/d/1WwaFfGDO57QdEDfWQvLNRIOyRZy2sWvM/view): **20,183,435 bytes**, igual a la copia local final.

Las mediciones completas y fotogramas extraídos quedan en `.local-work/l6-review-{es,en}.json` y `.local-work/l6-review-frames-{es,en}/`. PR para revisión, sin fusionar.
