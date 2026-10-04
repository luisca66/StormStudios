// Generates the Lesson 5 storyboards and audio maps (ES and EN) from the sentence-per-line scripts.
// Usage: node scripts/sequencer/generar-storyboard-leccion-5.mjs
//
// Each line of content/storyboards/<locale>/06-leccion-5.guion.txt is one ElevenLabs clip.
// Every still declares the clip range it covers, so narration, audio map and subtitles come from
// the same data and cannot drift. Both locales share projects, music, reveals and highlights.
import { readFileSync, writeFileSync } from "node:fs";

const LESSON = "06-leccion-5";
const IMG = "/images/curso/leccion-5";
const MUSIC = "../../../.local-work/06-leccion-5-musica";

// ── Music (text grammar of the editor; figure names of Luis's method) ────────────────────────────
const setup = (title, measures, extra = {}) => ({ mode: "single", title, key: "C", time: [4, 4], measures, tempo: 72, ...extra });
const quarters = notes => notes.map(n => (n === "-" ? "silencio cuarto" : `${n} cuarto`)).join("; ");
const twoBars = notes => `voz melody\ncompas 1\n${quarters(notes.slice(0, 4))}\ncompas 2\n${quarters(notes.slice(4))}`;
const wholes = chords => "voz melody\n" + chords.map((c, i) => `compas ${i + 1}\n[${c}] entera`).join("\n");
const romans = (list, perBar = 4) => list.map((text, i) => ({ measure: Math.floor(i / perBar) + 1, beat: (i % perBar) + 1, text, kind: "roman" }));

const projects = {
  escala: { setup: setup("Do mayor", 2), text: twoBars(["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]),
    annotations: romans(["I", "II", "III", "IV", "V", "VI", "VII", "I"]) },
  espejo: { setup: setup("Do mayor por terceras", 2), text: twoBars(["D4", "F4", "A4", "C5", "E5", "G5", "B5", "-"]),
    annotations: romans(["II", "IV", "VI", "I", "III", "V", "VII"]) },
  "la-menor": { setup: setup("La menor natural", 2), text: twoBars(["A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5"]) },
  "la-armonica": { setup: setup("La menor armónica", 2), text: twoBars(["A4", "B4", "C5", "D5", "E5", "F5", "G#5", "A5"]) },
  vii7: { setup: setup("Sensible, IV y VI", 1), text: wholes(["B4 D5 F5 A5"]) },
  "modales-alterados": { setup: setup("Grados atractivos modales", 3), text: "voz melody\ncompas 1\nDb4 entera\ncompas 2\nF#4 entera\ncompas 3\nBb4 entera" },
  terceras: { setup: setup("Acordes por terceras sobre Do", 5), text: wholes(["C4 E4 G4", "C4 E4 G4 B4", "C4 E4 G4 B4 D5", "C4 E4 G4 B4 D5 F5", "C4 E4 G4 B4 D5 F5 A5"]) },
  "cuatro-tipos": { setup: setup("Los cuatro tipos de acordes de quinta", 4), text: wholes(["C4 E4 G4", "C4 Eb4 G4", "C4 Eb4 Gb4", "C4 E4 G#4"]) },
  regiones: { setup: setup("Regiones tonales de Do mayor", 2),
    text: "voz melody\ncompas 1\n[D4 F4 A4] cuarto; [F4 A4 C5] cuarto; [A4 C5 E5] cuarto; [C4 E4 G4] cuarto\ncompas 2\n[E4 G4 B4] cuarto; [G4 B4 D5] cuarto; [B4 D5 F5] cuarto; silencio cuarto",
    annotations: romans(["II", "IV", "VI", "I", "III", "V", "VII"]) },
  sostenidos: { setup: setup("Orden de los sostenidos", 2), text: twoBars(["F#4", "C#5", "G#4", "D#5", "A#4", "E#5", "B#4", "-"]) },
  bemoles: { setup: setup("Orden de los bemoles", 2), text: twoBars(["Bb4", "Eb4", "Ab4", "Db4", "Gb4", "Cb4", "Fb4", "-"]) },
};

// Positions in the two-bar quarter-note projects: k = 1..8.
const pos = k => ({ measure: k <= 4 ? 1 : 2, beat: ((k - 1) % 4) + 1 });
const box = (k, color, label, span = 1) => { const p = pos(k); return { ...p, endBeat: p.beat + span, color, label }; };
const mark = (k, color, label) => ({ ...pos(k), color, label });
const bar = (measure, color, label, endMeasure = measure) => ({ measure, endMeasure, color, label });

// ── Stills: [id, [firstClip, lastClip], visual, es text, en text] ──────────────────────────────────
// Labels inside the visual are given as {es, en} and resolved per locale.
const L = (es, en) => ({ es, en });
const title = { kind: "title" };
const image = (name, video = false) => ({ kind: "image", image: lang => `${IMG}${video ? "/video" : ""}/${name}-${lang}.svg` });
const score = (project, extra = {}) => ({ project, ...extra });
// Fragments chosen and mixed by Luis in Cubase (H:/Website Clases/05 Lección 5/Cubase/Mixdown), credits as he listed them.
const CREDITS = {
  monodia: L("Hildegard von Bingen — Canticles of Ecstasy", "Hildegard von Bingen — Canticles of Ecstasy"),
  organum: L("Pérotin — Viderunt omnes · David Munrow", "Pérotin — Viderunt omnes · David Munrow"),
  "ars-nova": L("Palestrina — Missa Papae Marcelli · Dresdner Kammerchor", "Palestrina — Missa Papae Marcelli · Dresdner Kammerchor"),
  preclasico: L("J. S. Bach — «O Haupt voll Blut und Wunden», Pasión según San Mateo", "J. S. Bach — “O Haupt voll Blut und Wunden”, St Matthew Passion"),
  clasico: L("Chopin — Preludio en mi menor, op. 28 n.º 4", "Chopin — Prelude in E minor, Op. 28 No. 4"),
  impresionismo: L("Debussy — La cathédrale engloutie, Preludios, libro 1", "Debussy — La cathédrale engloutie, Préludes, Book 1"),
  expresionismo: L("Stravinsky — La consagración de la primavera", "Stravinsky — The Rite of Spring"),
  dodecafonia: L("Alban Berg — Concierto para violín", "Alban Berg — Violin Concerto"),
  microtonalismo: L("Julián Carrillo — Preludio a Colón (1925)", "Julián Carrillo — Preludio a Colón (1925)"),
};
const era = (n, id) => ({ ...image(`serie-${id}`, true), musicFile: `${MUSIC}/${String(n).padStart(2, "0")}-${id}.mp3`, musicCredit: CREDITS[id] });

const tonica = L("tónica", "tonic"), dominante = L("dominante", "dominant"), subdominante = L("subdominante", "subdominant");
const mediante = L("mediante", "mediant"), submediante = L("submediante", "submediant"), sensible = L("sensible", "leading tone");
const quinta = L("5ª justa", "P5");

const STILLS = [
  ["titulo", [1, 3], title, { heading: "Grados, acordes y tonalidad", caption: "Lección 5 · Curso de Armonía · Storm Studios Learning" }, { heading: "Degrees, Chords and Tonality", caption: "Lesson 5 · Harmony Course · Storm Studios Learning" }],
  ["explicativa", [4, 5], title, { heading: "Una lección explicativa", caption: "Lo que veamos hoy lo usaremos en las siguientes lecciones" }, { heading: "An explanatory lesson", caption: "Everything we see today will be used in the following lessons" }],
  ["grados", [6, 8], score("escala"), { heading: "Los nombres de los grados", caption: "Do mayor" }, { heading: "The names of the degrees", caption: "C major" }],
  ["tonica", [9, 10], score("espejo", { marks: [mark(4, "amber", tonica)] }), { heading: "Tónica", caption: "El centro de la tonalidad" }, { heading: "Tonic", caption: "The center of the key" }],
  ["dominante", [11, 11], score("espejo", { marks: [mark(4, "amber", tonica), mark(6, "cyan", dominante)] }), { heading: "Dominante", caption: "Una quinta arriba de la tónica" }, { heading: "Dominant", caption: "A fifth above the tonic" }],
  ["subdominante", [12, 12], score("espejo", { marks: [mark(2, "cyan", subdominante), mark(4, "amber", tonica), mark(6, "cyan", dominante)] }), { heading: "Subdominante", caption: "Una quinta abajo de la tónica" }, { heading: "Subdominant", caption: "A fifth below the tonic" }],
  ["mediante", [13, 13], score("espejo", { marks: [mark(2, "cyan", subdominante), mark(4, "amber", tonica), mark(5, "violet", mediante), mark(6, "cyan", dominante)] }), { heading: "Mediante", caption: "A la mitad entre tónica y dominante" }, { heading: "Mediant", caption: "Halfway between tonic and dominant" }],
  ["submediante", [14, 14], score("espejo", { marks: [mark(2, "cyan", subdominante), mark(3, "violet", submediante), mark(4, "amber", tonica), mark(5, "violet", mediante), mark(6, "cyan", dominante)] }), { heading: "Submediante", caption: "A la mitad entre tónica y subdominante, hacia abajo" }, { heading: "Submediant", caption: "Halfway between tonic and subdominant, going down" }],
  ["supertonica", [15, 15], score("escala", { marks: [mark(1, "amber", tonica), mark(2, "green", L("supertónica", "supertonic"))] }), { heading: "Supertónica", caption: "Justo arriba de la tónica" }, { heading: "Supertonic", caption: "Just above the tonic" }],
  ["espejo", [16, 16], score("espejo", { marks: [mark(2, "cyan", subdominante), mark(3, "violet", submediante), mark(4, "amber", tonica), mark(5, "violet", mediante), mark(6, "cyan", dominante)] }), { heading: "Un espejo alrededor de la tónica" }, { heading: "A mirror around the tonic" }],
  ["sensible", [17, 18], score("escala", { highlights: [box(7, "rose", L("sensible · ½ tono", "leading tone · half step"), 2)] }), { heading: "Séptimo grado: sensible", caption: "A medio tono de la tónica" }, { heading: "Seventh degree: leading tone", caption: "A half step below the tonic" }],
  ["subtonica", [19, 20], score("la-menor", { highlights: [box(7, "cyan", L("1 tono", "whole step"), 2)] }), { heading: "Subtónica", caption: "A un tono de la tónica" }, { heading: "Subtonic", caption: "A whole step below the tonic" }],
  ["la-subtonica", [21, 21], score("la-menor", { marks: [mark(7, "cyan", L("subtónica", "subtonic"))] }), { heading: "La menor natural", caption: "Sol es la subtónica" }, { heading: "A natural minor", caption: "G is the subtonic" }],
  ["la-sensible", [22, 22], score("la-armonica", { marks: [mark(7, "rose", sensible)] }), { heading: "La menor armónica", caption: "Sol♯ es la sensible" }, { heading: "A harmonic minor", caption: "G♯ is the leading tone" }],
  ["funciones", [23, 23], title, { heading: "Funciones de los grados", caption: "Tonales · modales · secundarios · atractivos" }, { heading: "Functions of the degrees", caption: "Tonal · modal · secondary · attractive" }],
  ["tonales", [24, 25], score("escala", { highlights: [1, 4, 5, 8].map(k => box(k, "amber", L("tonal", "tonal"))) }), { heading: "Grados tonales o principales", caption: "I · IV · V" }, { heading: "Tonal or principal degrees", caption: "I · IV · V" }],
  ["modales", [26, 26], score("escala", { highlights: [3, 6].map(k => box(k, "violet", L("modal", "modal"))) }), { heading: "Grados modales", caption: "III · VI" }, { heading: "Modal degrees", caption: "III · VI" }],
  ["secundarios", [27, 27], score("escala", { highlights: [2, 3, 6, 7].map(k => box(k, "cyan", L("secundario", "secondary"))) }), { heading: "Grados secundarios", caption: "II · III · VI · VII" }, { heading: "Secondary degrees", caption: "II · III · VI · VII" }],
  ["atractivos", [28, 29], title, { heading: "Grados atractivos", caption: "Requieren una resolución especial" }, { heading: "Attractive degrees", caption: "They require a special resolution" }],
  ["sensible-atractiva", [30, 30], score("escala", { marks: [mark(7, "rose", sensible)] }), { heading: "La sensible", caption: "La nota atractiva más importante" }, { heading: "The leading tone", caption: "The most important attractive note" }],
  ["con-sensible", [31, 31], score("vii7", { highlights: [bar(1, "rose", L("Si · Re · Fa · La", "B · D · F · A"))] }), { heading: "IV y VI junto a la sensible", caption: "Fa y La en el mismo acorde que Si" }, { heading: "IV and VI with the leading tone", caption: "F and A in the same chord as B" }],
  ["modales-alterados", [32, 32], score("modales-alterados", { reveal: { measure: 1 } }), { heading: "Grados atractivos modales" }, { heading: "Modal attractive degrees" }],
  ["frigio", [33, 34], score("modales-alterados", { reveal: { measure: 2 }, highlights: [bar(1, "violet", L("II frigio", "Phrygian II"))] }), { heading: "II frigio · Re♭" }, { heading: "Phrygian II · D♭" }],
  ["lidio", [35, 36], score("modales-alterados", { reveal: { measure: 3 }, highlights: [bar(1, "violet", L("II frigio", "Phrygian II")), bar(2, "violet", L("IV lidio", "Lydian IV"))] }), { heading: "IV lidio · Fa♯" }, { heading: "Lydian IV · F♯" }],
  ["mixolidio", [37, 38], score("modales-alterados", { highlights: [bar(1, "violet", L("II frigio", "Phrygian II")), bar(2, "violet", L("IV lidio", "Lydian IV")), bar(3, "violet", L("VII mixolidio", "Mixolydian VII"))] }), { heading: "VII mixolidio · Si♭" }, { heading: "Mixolydian VII · B♭" }],
  ["repaso-modos", [39, 39], title, { heading: "Repasa los modos", caption: "Lección 2" }, { heading: "Review the modes", caption: "Lesson 2" }],
  ["acorde", [40, 41], title, { heading: "El acorde", caption: "Toda simultaneidad de sonidos diferentes" }, { heading: "The chord", caption: "Any simultaneity of different sounds" }],
  ["terceras", [42, 42], score("terceras", { reveal: { measure: 2 } }), { heading: "Terceras superpuestas", caption: "A partir de la fundamental" }, { heading: "Stacked thirds", caption: "Built from the root" }],
  ["quinta", [43, 43], score("terceras", { reveal: { measure: 2 }, highlights: [bar(1, "amber", L("5ª", "5th"))] }), { heading: "Acorde de quinta", caption: "Dos terceras" }, { heading: "Fifth chord", caption: "Two thirds" }],
  ["septima", [44, 44], score("terceras", { reveal: { measure: 3 }, highlights: [bar(2, "amber", L("7ª", "7th"))] }), { heading: "Acorde de séptima", caption: "Tres terceras" }, { heading: "Seventh chord", caption: "Three thirds" }],
  ["novena", [45, 45], score("terceras", { reveal: { measure: 4 }, highlights: [bar(3, "amber", L("9ª", "9th"))] }), { heading: "Acorde de novena", caption: "Cuatro terceras" }, { heading: "Ninth chord", caption: "Four thirds" }],
  ["onceava", [46, 46], score("terceras", { reveal: { measure: 5 }, highlights: [bar(4, "amber", L("11ª", "11th"))] }), { heading: "Acorde de onceava", caption: "Cinco terceras" }, { heading: "Eleventh chord", caption: "Five thirds" }],
  ["treceava", [47, 47], score("terceras", { highlights: [bar(5, "amber", L("13ª", "13th"))] }), { heading: "Acorde de treceava", caption: "Seis terceras" }, { heading: "Thirteenth chord", caption: "Six thirds" }],
  ["nombre", [48, 48], score("terceras", { highlights: [["5ª", "5th"], ["7ª", "7th"], ["9ª", "9th"], ["11ª", "11th"], ["13ª", "13th"]].map(([es, en], i) => bar(i + 1, "cyan", L(es, en))) }), { heading: "El nombre viene de la nota más aguda", caption: "Intervalo entre la fundamental y la nota más aguda" }, { heading: "The name comes from the highest note", caption: "Interval between the root and the highest note" }],
  ["terceras-escuchar", [49, 49], score("terceras", { audio: true, cursor: { measure: 1, beat: 1 } }), { heading: "Acordes por terceras sobre Do" }, { heading: "Chords in thirds on C" }],
  ["armonia", [50, 50], title, { heading: "La armonía", caption: "Estructura interválica de los acordes y leyes de su enlace" }, { heading: "Harmony", caption: "Intervallic structure of chords and the laws of their connection" }],
  ["armonias", [51, 51], title, { heading: "Armonías, en plural", caption: "Época · género · corriente estilística · compositor" }, { heading: "Harmonies, in plural", caption: "Period · genre · stylistic movement · composer" }],
  ["serie-intro", [52, 53], title, { heading: "La serie de armónicos", caption: "Múltiplos enteros de la frecuencia fundamental" }, { heading: "The harmonic series", caption: "Whole-number multiples of the fundamental frequency" }],
  ["serie", [54, 54], image("serie-armonicos"), { heading: "Serie de armónicos sobre Do" }, { heading: "Harmonic series on C" }],
  ["serie-octava", [55, 55], image("serie-octava", true), { heading: "Armónico 2: la octava" }, { heading: "Harmonic 2: the octave" }],
  ["serie-quinta", [56, 56], image("serie-quinta", true), { heading: "Armónico 3: la quinta" }, { heading: "Harmonic 3: the fifth" }],
  ["serie-octava-2", [57, 57], image("serie-octava-2", true), { heading: "Armónico 4: otra vez la octava" }, { heading: "Harmonic 4: the octave again" }],
  ["serie-tercera", [58, 58], image("serie-tercera", true), { heading: "Armónico 5: la tercera mayor" }, { heading: "Harmonic 5: the major third" }],
  ["serie-acorde", [59, 59], image("serie-acorde-mayor", true), { heading: "Armónicos 1 a 6: acorde mayor" }, { heading: "Harmonics 1 to 6: a major chord" }],
  ["serie-septima", [60, 61], image("serie-septima", true), { heading: "Armónico 7: Si♭ calante" }, { heading: "Harmonic 7: a flat B♭" }],
  ["serie-flechas", [62, 63], image("serie-flechas", true), { heading: "Calantes ↓ y crecenti ↑" }, { heading: "Flat ↓ and sharp ↑" }],
  ["serie-historia", [64, 65], image("serie-armonicos"), { heading: "Las armonías en la historia" }, { heading: "Harmonies through history" }],
  ["monodia", [66, 68], era(1, "monodia"), { heading: "Monodia", caption: "Armónicos 1 y 2" }, { heading: "Monody", caption: "Harmonics 1 and 2" }],
  ["organum", [69, 71], era(2, "organum"), { heading: "Organum", caption: "Armónicos 3 y 4" }, { heading: "Organum", caption: "Harmonics 3 and 4" }],
  ["ars-nova", [72, 74], era(3, "ars-nova"), { heading: "Ars Nova", caption: "Armónicos 5 y 6" }, { heading: "Ars Nova", caption: "Harmonics 5 and 6" }],
  ["preclasico", [75, 77], era(4, "preclasico"), { heading: "Preclásico", caption: "Armónicos 7 y 8 · Bach · Händel · Mozart · Beethoven" }, { heading: "Pre-Classical", caption: "Harmonics 7 and 8 · Bach · Handel · Mozart · Beethoven" }],
  ["clasico", [78, 80], era(5, "clasico"), { heading: "Clásico", caption: "Armónicos 9 y 10 · Schubert · Chopin · Brahms" }, { heading: "Classical", caption: "Harmonics 9 and 10 · Schubert · Chopin · Brahms" }],
  ["siglo-xx", [81, 81], image("serie-siglo-xx", true), { heading: "Siglo XX", caption: "Armónicos 11 a 20" }, { heading: "Twentieth century", caption: "Harmonics 11 to 20" }],
  ["impresionismo", [82, 83], era(6, "impresionismo"), { heading: "Impresionismo", caption: "Debussy · Ravel · Fauré · Satie" }, { heading: "Impressionism", caption: "Debussy · Ravel · Fauré · Satie" }],
  ["expresionismo", [84, 85], era(7, "expresionismo"), { heading: "Expresionismo", caption: "Stravinsky · Shostakovich · Bartók · Scriabin" }, { heading: "Expressionism", caption: "Stravinsky · Shostakovich · Bartók · Scriabin" }],
  ["dodecafonia", [86, 88], era(8, "dodecafonia"), { heading: "Dodecafonía", caption: "Schoenberg · Berg · Webern · Hindemith" }, { heading: "Dodecaphony", caption: "Schoenberg · Berg · Webern · Hindemith" }],
  ["microtonalismo", [89, 91], era(9, "microtonalismo"), { heading: "Microtonalismo", caption: "Armónicos 21 a 24 · Julián Carrillo" }, { heading: "Microtonalism", caption: "Harmonics 21 to 24 · Julián Carrillo" }],
  ["cuatro-tipos", [92, 94], score("cuatro-tipos", { annotations: true, highlights: [bar(1, "amber", L("mayor", "major")), bar(2, "cyan", L("menor", "minor")), bar(3, "rose", L("disminuido", "diminished")), bar(4, "violet", L("aumentado", "augmented"))] }), { heading: "Cuatro tipos de acordes de quinta", caption: "Mayor o menor por su tercera; aumentado o disminuido por su quinta" }, { heading: "Four types of fifth chords", caption: "Major or minor by the third; augmented or diminished by the fifth" }],
  ["regiones-intro", [95, 95], image("regiones-tonales"), { heading: "Regiones tonales" }, { heading: "Tonal regions" }],
  ["regiones-principal", [96, 96], score("regiones", { highlights: [2, 4, 6].map(k => box(k, "amber", L("principal", "principal"))) }), { heading: "Un acorde principal y dos secundarios", caption: "Los secundarios, una tercera arriba y abajo" }, { heading: "One principal and two secondary chords", caption: "The secondary chords, a third above and below" }],
  ["regiones-terceras", [97, 97], score("regiones"), { heading: "Do mayor ordenado por terceras" }, { heading: "C major arranged in thirds" }],
  ["region-sd", [98, 98], score("regiones", { highlights: [{ measure: 1, beat: 1, endBeat: 4, color: "cyan", label: L("Subdominante", "Subdominant") }] }), { heading: "Región de subdominante", caption: "IV principal · II y VI secundarios" }, { heading: "Subdominant region", caption: "IV principal · II and VI secondary" }],
  ["region-t", [99, 99], score("regiones", { highlights: [{ measure: 1, beat: 3, endMeasure: 2, endBeat: 2, color: "amber", label: L("Tónica", "Tonic") }] }), { heading: "Región de tónica", caption: "I principal · VI y III secundarios" }, { heading: "Tonic region", caption: "I principal · VI and III secondary" }],
  ["region-d", [100, 100], score("regiones", { highlights: [{ measure: 2, beat: 1, endBeat: 4, color: "rose", label: L("Dominante", "Dominant") }] }), { heading: "Región de dominante", caption: "V principal · III y VII secundarios" }, { heading: "Dominant region", caption: "V principal · III and VII secondary" }],
  ["regiones-modales", [101, 101], score("regiones", { highlights: [box(3, "violet", L("SD · T", "SD · T")), box(5, "violet", L("T · D", "T · D"))] }), { heading: "III y VI: dos regiones", caption: "Los acordes modales" }, { heading: "III and VI: two regions", caption: "The modal chords" }],
  ["sustitucion", [102, 102], image("regiones-tonales"), { heading: "Sustitución dentro de una región", caption: "Sin alterar el sentido armónico" }, { heading: "Substitution within a region", caption: "Without changing the harmonic sense" }],
  ["tonalidad", [103, 104], title, { heading: "La tonalidad", caption: "Relaciones, funciones y jerarquías alrededor de la tónica" }, { heading: "Tonality", caption: "Relationships, functions and hierarchies around the tonic" }],
  ["modular", [105, 106], title, { heading: "Modular", caption: "Sustituir un centro tonal por otro" }, { heading: "Modulating", caption: "Replacing one tonal center with another" }],
  ["alteraciones", [107, 108], image("orden-alteraciones"), { heading: "Las alteraciones indican la tonalidad" }, { heading: "Accidentals show the key" }],
  ["sostenidos", [109, 109], score("sostenidos"), { heading: "Orden de los sostenidos", caption: "Fa · Do · Sol · Re · La · Mi · Si" }, { heading: "Order of sharps", caption: "F · C · G · D · A · E · B" }],
  ["sostenidos-quintas", [110, 110], score("sostenidos", { highlights: [box(1, "amber", quinta, 2)] }), { heading: "Cada uno, una quinta justa arriba" }, { heading: "Each one a perfect fifth above" }],
  ["bemoles", [111, 111], score("bemoles"), { heading: "Orden de los bemoles", caption: "Si · Mi · La · Re · Sol · Do · Fa" }, { heading: "Order of flats", caption: "B · E · A · D · G · C · F" }],
  ["bemoles-quintas", [112, 112], score("bemoles", { highlights: [box(1, "amber", quinta, 2)] }), { heading: "Cada uno, una quinta justa abajo" }, { heading: "Each one a perfect fifth below" }],
  ["circulo", [113, 113], image("circulo-quintas"), { heading: "El círculo de quintas" }, { heading: "The circle of fifths" }],
  ["circulo-do", [114, 114], image("circulo-do", true), { heading: "Do mayor", caption: "Sin alteraciones" }, { heading: "C major", caption: "No accidentals" }],
  ["circulo-sostenidos", [115, 115], image("circulo-sostenidos", true), { heading: "Una quinta arriba: un sostenido más" }, { heading: "A fifth above: one more sharp" }],
  ["circulo-bemoles", [116, 116], image("circulo-bemoles", true), { heading: "Una quinta abajo: un bemol más" }, { heading: "A fifth below: one more flat" }],
  ["circulo-enarmonicas", [117, 118], image("circulo-enarmonicas", true), { heading: "Tres enarmonías", caption: "Suenan igual, se escriben distinto" }, { heading: "Three enharmonic pairs", caption: "Same sound, different spelling" }],
  ["circulo-mayores", [119, 119], image("circulo-mayores", true), { heading: "Quince tonalidades mayores" }, { heading: "Fifteen major keys" }],
  ["circulo-menores", [120, 120], image("circulo-menores", true), { heading: "Relativas menores", caption: "Una tercera menor abajo, con la misma armadura" }, { heading: "Relative minors", caption: "A minor third below, same key signature" }],
  ["circulo-relativas", [121, 123], image("circulo-relativas", true), { heading: "La menor · Mi menor · Re menor", caption: "Relativas de Do, Sol y Fa mayor" }, { heading: "A minor · E minor · D minor", caption: "Relatives of C, G and F major" }],
  ["circulo-30", [124, 124], image("circulo-quintas"), { heading: "Treinta tonalidades" }, { heading: "Thirty keys" }],
  ["recapitulemos", [125, 125], title, { heading: "Recapitulemos" }, { heading: "Let's recap" }],
  ["recap-grados", [126, 126], image("grados"), { heading: "Nombres y funciones de los grados" }, { heading: "Names and functions of the degrees" }],
  ["recap-terceras", [127, 127], score("terceras"), { heading: "Acordes por terceras" }, { heading: "Chords in thirds" }],
  ["recap-serie", [128, 128], image("serie-armonicos"), { heading: "La serie de armónicos" }, { heading: "The harmonic series" }],
  ["recap-regiones", [129, 129], image("regiones-tonales"), { heading: "Regiones tonales" }, { heading: "Tonal regions" }],
  ["recap-circulo", [130, 130], image("circulo-quintas"), { heading: "El círculo de quintas" }, { heading: "The circle of fifths" }],
  ["siguiente", [131, 131], title, { heading: "Próxima lección", caption: "El cuarteto vocal armónico: soprano · contralto · tenor · bajo" }, { heading: "Next lesson", caption: "The vocal quartet: soprano · alto · tenor · bass" }],
  ["cierre", [132, 133], title, { heading: "Gracias", caption: "Nos vemos en la lección 6" }, { heading: "Thank you", caption: "See you in lesson 6" }],
];

// ── Build ────────────────────────────────────────────────────────────────────────────────────────
const resolve = (value, lang) => (value && typeof value === "object" && "es" in value && "en" in value ? value[lang] : value);
const localize = (items, lang) => items?.map(item => ({ ...item, label: resolve(item.label, lang) }));

for (const lang of ["es", "en"]) {
  const dir = `content/storyboards/${lang}`;
  const lines = readFileSync(`${dir}/${LESSON}.guion.txt`, "utf8").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  let expected = 1;
  const stills = STILLS.map(([id, [from, to], visual, es, en]) => {
    if (from !== expected || to < from) throw new Error(`${id}: clips ${from}-${to}, se esperaba empezar en ${expected}`);
    expected = to + 1;
    const text = lang === "es" ? es : en;
    const { annotations, image: img, ...rest } = visual;
    void annotations;
    const still = { id, ...rest, ...text, narration: lines.slice(from - 1, to).join(" ") };
    if (img) still.image = img(lang);
    if (visual.musicCredit) still.musicCredit = resolve(visual.musicCredit, lang);
    if (visual.highlights) still.highlights = localize(visual.highlights, lang);
    if (visual.marks) still.marks = localize(visual.marks, lang);
    if (visual.project) still.showCiphers = true;
    return still;
  });
  if (expected - 1 !== lines.length) throw new Error(`${lang}: los stills cubren ${expected - 1} de ${lines.length} frases`);
  const titles = { es: "Lección 5 — Grados, acordes y tonalidad", en: "Lesson 5 — Degrees, Chords and Tonality" };
  const storyboard = { version: 1, lesson: LESSON, locale: lang, title: titles[lang], source: `${dir}/${LESSON}.guion.txt`,
    format: { aspect: "16:9", theme: "storm" }, projects, stills };
  writeFileSync(`${dir}/${LESSON}.json`, JSON.stringify(storyboard, null, 2) + "\n");
  const audio = { lesson: LESSON,
    source: { script: `${dir}/${LESSON}.guion.docx`, durations: `${dir}/${LESSON}.durations.txt`, clipPattern: "{n}_Chapter_1.mp3", clips: lines.length },
    note: "Una frase del guion por clip; cada still cubre clips completos.",
    stills: STILLS.map(([id, [from, to]]) => ({ id, start: { clip: from, at: 0 }, end: { clip: to, at: 1 } })) };
  writeFileSync(`${dir}/${LESSON}.audio.json`, JSON.stringify(audio, null, 2) + "\n");
  console.log(`${dir}/${LESSON}.json: ${stills.length} stills, ${lines.length} clips`);
}
