# Verificación de la Lección 8

Fecha: 2026-10-07. Lección en construcción, sin MDX ni publicación.

Los dos MIDIs correctos se comprobaron nota por nota: tesituras, construcción, intervalos melódicos y las seis parejas S–A, S–T, S–B, A–T, A–B, T–B. Las pruebas incluyen una comprobación numérica independiente de 5as y 8as paralelas/contrarias. Cada nota común de las voces superiores permanece en su voz; el bajo respeta los estados asignados.

## Leccion_8_Do_mayor_correcta.mid

| Enlace | Grados | S | A | T | B |
| --- | --- | --- | --- | --- | --- |
| 1 | I–IV | C5 → C5 (unísono) | G3 → A3 (2a mayor) | E3 → F3 (2a menor) | C3 → F3 (4a justa) |
| 2 | IV–V | C5 → B4 (2a menor) | F4 → D4 (3a menor) | A3 → G3 (2a mayor) | F3 → G3 (2a mayor) |
| 3 | V–I | B4 → C5 (2a menor) | G3 → G3 (unísono) | D3 → E3 (2a mayor) | G2 → C3 (4a justa) |
| 4 | II–V | D5 → D5 (unísono) | A3 → B3 (2a mayor) | F3 → G3 (2a mayor) | D3 → G3 (4a justa) |
| 5 | V–VI | B4 → C5 (2a menor) | D4 → C4 (2a mayor) | G3 → E3 (3a menor) | G2 → A2 (2a mayor) |
| 6 | VI–II | C5 → D5 (2a mayor) | A3 → A3 (unísono) | E3 → F3 (2a menor) | A2 → D3 (4a justa) |
| 7 | I–VII6/3 | C5 → B4 (2a menor) | E4 → D4 (2a mayor) | E3 → F3 (2a menor) | C3 → D3 (2a mayor) |
| 8 | IV6/3–V | C5 → B4 (2a menor) | F4 → G4 (2a mayor) | C4 → D4 (2a mayor) | A2 → G2 (2a mayor) |

## Leccion_8_Sol_mayor_desordenada_correcta.mid

| Enlace | Grados | S | A | T | B |
| --- | --- | --- | --- | --- | --- |
| 1 | I–VII6/3 | D5 → C5 (2a mayor) | B3 → C4 (2a menor) | G3 → F#3 (2a menor) | G2 → A2 (2a mayor) |
| 2 | V–I | D5 → D5 (unísono) | A3 → B3 (2a mayor) | F#3 → G3 (2a menor) | D3 → G3 (4a justa) |
| 3 | VI–II | E5 → E5 (unísono) | B3 → C4 (2a menor) | G3 → A3 (2a mayor) | E3 → A3 (4a justa) |
| 4 | I–IV | D5 → E5 (2a mayor) | B3 → C4 (2a menor) | G3 → G3 (unísono) | G2 → C3 (4a justa) |
| 5 | IV6/3–V | C5 → D5 (2a mayor) | G3 → A3 (2a mayor) | G3 → F#3 (2a menor) | E3 → D3 (2a mayor) |
| 6 | V–VI | D5 → B4 (3a menor) | A3 → G3 (2a mayor) | F#3 → G3 (2a menor) | D3 → E3 (2a mayor) |
| 7 | IV–V | C5 → A4 (3a menor) | E4 → D4 (2a mayor) | G3 → F#3 (2a menor) | C3 → D3 (2a mayor) |
| 8 | II–V | C5 → D5 (2a mayor) | A3 → A3 (unísono) | E3 → F#3 (2a mayor) | A2 → D3 (4a justa) |

## POST real al servidor de desarrollo

`POST http://localhost:3028/api/maestro-virtual/check`, FormData `midi` y `lessonId`; todos devolvieron HTTP 200.

| MIDI | passed | score | Descripciones |
| --- | --- | --- | --- |
| Leccion_6_Do_mayor_correcta.mid | true | 100 | 8 |
| Leccion_6_Do_mayor_errores.mid | false | 0 | 7 |
| Leccion_6_Re_mayor_desordenada_correcta.mid | true | 100 | 8 |
| Leccion_7_Bajo_Sib_mayor_correcta.mid | true | 100 | 2 |
| Leccion_7_Contralto_Sol_mayor_correcta.mid | true | 100 | 2 |
| Leccion_7_Soprano_Do_mayor_correcta.mid | true | 100 | 2 |
| Leccion_7_Soprano_Do_mayor_errores.mid | false | 25 | 2 |
| Leccion_7_Tenor_Re_mayor_correcta.mid | true | 100 | 2 |
| Leccion_7_Tenor_Re_mayor_errores.mid | false | 55 | 2 |
| Leccion_8_Do_mayor_correcta.mid | true | 100 | 9 |
| Leccion_8_Re_mayor_errores.mid | false | 0 | 8 |
| Leccion_8_Sol_mayor_desordenada_correcta.mid | true | 100 | 9 |

Regresión de Lección 6: la respuesta completa del validador (incluidos mensajes y posiciones) coincide exactamente con el código anterior en HEAD para los tres MIDIs. Lección 7 conserva 100/100 en los cuatro correctos y 25/100 y 55/100 en los incorrectos, con las mismas reglas y posiciones de sus pruebas previas.

## Re mayor incorrecto: reglas y posiciones esperadas y observadas

La posición indica el segundo acorde del enlace; 0 corresponde al archivo entero. Son 14 acordes: falta IV6/3–V y el II6/3–V no cubre II–V.

| ruleId | Acorde | Cantidad |
| --- | --- | --- |
| LINK_CHORD_COUNT | 0 | 1 |
| LINK_MISSING | 0 | 1 |
| HARMONIC_PARALLEL_FIFTHS | 2 | 1 |
| MELODIC_FORBIDDEN_INTERVAL | 4 | 1 |
| HARMONIC_CONTRARY_OCTAVES | 4 | 1 |
| LINK_LEADING_TONE_SOPRANO | 6 | 1 |
| LINK_UNASSIGNED | 8 | 1 |
| HARMONIC_SIMULTANEOUS_LEAPS | 10 | 1 |

Ocho errores exactos, sin errores adicionales de construcción.

## Comprobaciones

- `npm run lint`: aprobado (una advertencia previa en `generar-figuras-leccion-7.mjs`).
- `npx tsc --noEmit`: aprobado.
- `npm test`: 632 aprobadas; 3 pendientes previas.
- `npm run build`: aprobado.

La tabla general usa grados 1–7 e inversiones 0/1/2 y prohíbe libremente 6/4. Las flechas con origen sin cifra se aplican al estado fundamental; un enlace obligatorio al final de una progresión también se reporta como pendiente. La Lección 8 solo nombra el material y no exige continuaciones entre parejas.
