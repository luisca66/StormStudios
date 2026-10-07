# Verificación de la Lección 8 — v2

Fecha: 2026-10-07. Una tonalidad mayor por enlace. Implementado sobre c3bb8f0; la lección sigue en construction, sin MDX ni publicación.

## Reconocimiento

Se toma la armadura vigente al primer acorde de cada pareja cuando identifica un enlace asignado. Si no sirve, se buscan lecturas en las 15 tonalidades mayores, se desempata por grafías y se resuelve solo si queda una lectura que cubra un enlace faltante. Las lecturas firmes se consideran antes de resolver las ambiguas, para que el orden de las parejas no cambie la decisión.

Si ninguna lectura es inequívoca, LINK_AMBIGUOUS_KEY es un error y el enlace no cuenta como confirmado. Solo se reportan defectos de construcción comunes a las lecturas posibles. LINK_KEYS resume las tonalidades; LINK_REPEATED_KEY es informativo y no reduce el score. Las reglas melódicas, armónicas y de sensible usan la tonalidad local. No se revisa nada entre parejas.

## Notas exactas del video

No se modificó ninguna nota del encargo v2. Los ocho enlaces cumplen construcción, tesituras, separaciones, grafías, intervalos melódicos y las seis parejas de voces (S–A, S–T, S–B, A–T, A–B, T–B). La auditoría de pruebas incluye una comprobación numérica independiente de 5as/8as paralelas y contrarias.

| Compás | Tonalidad | Enlace | S | A | T | B |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | G | I–IV | B4 → C5 | G4 → G4 | D4 → E4 | G3 → C3 |
| 2 | D | IV–V | D5 → C#5 | B4 → A4 | G4 → E4 | G2 → A2 |
| 3 | F | V–I | E5 → F5 | G4 → A4 | C4 → C4 | C3 → F2 |
| 4 | Bb | II–V | C5 → C5 | G4 → A4 | Eb4 → F4 | C3 → F2 |
| 5 | A | V–VI | G#4 → A4 | E4 → C#4 | B3 → A3 | E3 → F#3 |
| 6 | Eb | VI–II | G4 → Ab4 | Eb4 → F4 | C4 → C4 | C3 → F2 |
| 7 | C | I–VII6/3 | C5 → B4 | G4 → F4 | E4 → D4 | C3 → D3 |
| 8 | E | IV6/3–V | A4 → B4 | E4 → D#4 | A3 → F#3 | C#3 → B2 |

## POST reales al servidor de desarrollo

`POST http://localhost:3028/api/maestro-virtual/check`, FormData midi + lessonId; todos devolvieron HTTP 200.

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
| Leccion_8_Do_mayor_correcta.mid | true | 100 | 10 |
| Leccion_8_Re_mayor_errores.mid | false | 0 | 9 |
| Leccion_8_sin_armaduras_ambiguo.mid | true | 100 | 9 |
| Leccion_8_tonalidades_variadas_correcta.mid | true | 100 | 9 |
| sin-ninguna-armadura.mid (control adicional) | false | 55 | 7 |

### Archivo con solo la armadura inicial de Sol

Leccion_8_sin_armaduras_ambiguo.mid conserva exactamente las notas variadas y solo key_signature G en tick 0. Devuelve passed=true, score=100, sin errores de construcción ni LINK_AMBIGUOUS_KEY. La lectura musical es ambigua por sí sola, pero las prioridades del encargo sí deciden: Sol vigente confirma enlace 1 como I–IV en Sol; al estar I–IV cubierto, enlace 3 Do–Fa completa V–I en Fa.

Control adicional eliminando también Sol inicial: passed=false, score=55; LINK_MISSING@0, LINK_AMBIGUOUS_KEY@2 y LINK_AMBIGUOUS_KEY@6. No hay errores SATB de construcción y solo se confirman seis enlaces. Sol–Do admite I–IV en Sol o V–I en Do; Do–Fa admite I–IV en Do o V–I en Fa. Los dos enlaces quedan sin confirmar porque ambas asignaciones faltan. Este control se verifica por prueba unitaria, prueba de ruta y POST real.

### Re mayor incorrecto

Conserva exactamente los ocho errores de v1. Posición = segundo acorde del enlace; 0 = archivo entero. Tiene 14 acordes, falta IV6/3–V y II6/3–V no cubre II–V.

| ruleId | Posición |
| --- | --- |
| LINK_CHORD_COUNT | 0 |
| LINK_MISSING | 0 |
| HARMONIC_PARALLEL_FIFTHS | 2 |
| MELODIC_FORBIDDEN_INTERVAL | 4 |
| HARMONIC_CONTRARY_OCTAVES | 4 |
| LINK_LEADING_TONE_SOPRANO | 6 |
| LINK_UNASSIGNED | 8 |
| HARMONIC_SIMULTANEOUS_LEAPS | 10 |

## Regresión y comprobaciones

La respuesta completa de los tres MIDIs de Lección 6 coincide exactamente con c3bb8f0 (incluidos mensajes y posiciones). Los POST de Lección 7 mantienen 100 para los cuatro correctos y 25/55 para los incorrectos, con las mismas reglas y posiciones.

- npm run lint: aprobado, 0 errores; una advertencia previa de generar-figuras-leccion-7.mjs.
- npx tsc --noEmit: aprobado.
- npm test: 643 aprobadas; 3 pendientes previas.
- npm run build: aprobado.
- Pruebas nuevas: armadura vigente, armadura posterior ignorada, 15 tonalidades sin armadura por grafías, ambigüedad con ambas/ninguna asignación faltante, orden libre, sensible local, tonalidad repetida y notas del video.

El generador se conserva en el worktree y en D:/claude_code/maestro-virtual/scripts/. Los cuatro MIDIs se generan en D:/claude_code/maestro-virtual/test-midis/ y están copiados a __fixtures__. Se retiró el MIDI de Sol desordenado de v1. La tabla mayor y las continuaciones de progresión de v1 permanecen con sus pruebas.
