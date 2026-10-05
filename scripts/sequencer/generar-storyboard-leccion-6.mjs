// Generates the Lesson 6 storyboards and audio maps (ES and EN) from the sentence-per-line scripts.
// Usage: node scripts/sequencer/generar-storyboard-leccion-6.mjs
//
// Each line of content/storyboards/<locale>/07-leccion-6.guion.txt is one ElevenLabs clip.
// Every still declares the clip range it covers, so narration, audio map and subtitles come from
// the same data and cannot drift. Both locales share projects, music, reveals and highlights.
// All chords respect the Lesson 6 rules (ranges, spacing, no crossing, leading tone not doubled).
import { readFileSync, writeFileSync } from "node:fs";

const LESSON = "07-leccion-6";

// ── Music (SATB, one whole note per measure) ─────────────────────────────────────────────────────
const VOICES = ["soprano", "alto", "tenor", "bass"];
const setup = (title, measures, key = "C") => ({ mode: "satb", title, key, time: [4, 4], measures, tempo: 60 });
/** chords: [S, A, T, B] per measure; "-" is a whole rest. */
const satb = chords => VOICES.map((voice, v) =>
  `voz ${voice}\n` + chords.map((c, i) => `compas ${i + 1}\n${c[v] === "-" ? "silencio" : c[v]} entera`).join("\n")).join("\n");
const texts = list => list.map((text, i) => ({ measure: i + 1, beat: 1, text, kind: "roman" }));

const DO = ["C5", "E4", "G3", "C3"];
const projects = {
  do: { setup: setup("Do mayor", 1), text: satb([DO]) },
  tesituras: { setup: setup("Tesituras", 2), text: satb([["C4", "G3", "B2", "F2"], ["G5", "D5", "G4", "B3"]]) },
  separaciones: { setup: setup("Separaciones máximas", 3),
    text: satb([["G5", "C4", "-", "-"], ["-", "E4", "C3", "-"], ["-", "-", "F4", "F2"]]) },
  sensible: { setup: setup("La sensible en Do mayor", 3),
    text: satb([["B4", "G4", "D4", "G2"], ["D4", "B3", "F3", "D3"], ["E4", "B3", "G3", "E3"]]), annotations: texts(["V", "VII", "III"]) },
  duplicaciones: { setup: setup("Duplicaciones en Do mayor", 3),
    text: satb([DO, ["G4", "E4", "G3", "C3"], ["E4", "G3", "E3", "C3"]]) },
  "sin-quinta": { setup: setup("Do mayor sin quinta", 3),
    text: satb([["E4", "C4", "E3", "C3"], ["C5", "E4", "C4", "C3"], ["E5", "E4", "E3", "C3"]]) },
  disminuido: { setup: setup("VII de Do mayor", 1), text: satb([["D4", "B3", "F3", "D3"]]), annotations: texts(["VII"]) },
  aumentado: { setup: setup("III de La menor armónica", 1, "Am"), text: satb([["E4", "C4", "G#3", "C3"]]), annotations: texts(["III"]) },
  estados: { setup: setup("Estados de Do mayor", 3),
    text: satb([DO, ["C5", "C4", "G3", "E3"], ["G4", "C4", "E3", "G2"]]), annotations: texts(["I", "I 6/3", "I 6/4"]) },
  "la-63": { setup: setup("La mayor", 1, "A"), text: satb([["A4", "E4", "A3", "C#3"]]), annotations: texts(["I 6/3"]) },
  "solb-64": { setup: setup("Sol♭ mayor", 1, "Gb"), text: satb([["Db4", "Bb3", "Gb3", "Db3"]]), annotations: texts(["I 6/4"]) },
  posicion: { setup: setup("Posición melódica", 3), text: satb([DO, ["E5", "G4", "C4", "C3"], ["G5", "C5", "E4", "C3"]]) },
  disposicion: { setup: setup("Disposición interna", 2), text: satb([["E4", "C4", "G3", "C3"], DO]) },
  // The correct example of the assignment (test-midis/Leccion_6_Do_mayor_correcta.mid).
  tarea: { setup: setup("Tarea: siete grados de Do mayor", 7),
    text: satb([DO, ["D5", "A4", "D4", "F3"], ["E4", "B3", "G3", "E3"], ["F4", "A3", "F3", "C3"], ["B4", "G4", "D4", "G2"], ["C5", "A4", "C4", "A2"], ["D4", "B3", "F3", "D3"]]),
    annotations: texts(["I", "II 6/3", "III", "IV 6/4", "V", "VI", "VII 6/3"]) },
};

const L = (es, en) => ({ es, en });
const title = { kind: "title" };
const score = (project, extra = {}) => ({ project, ...extra });
const mark = (measure, voice, color, label) => ({ measure, beat: 1, voice, color, label });
const bar = (measure, color, label, voice) => ({ measure, color, label, ...(voice ? { voice } : {}) });
const listen = project => score(project, { audio: true, cursor: { measure: 1, beat: 1 } });

const fund = L("fundamental", "root"), terc = L("3ª", "3rd"), quin = L("5ª", "5th"), sens = L("sensible", "leading tone");

// ── Stills: [id, [firstClip, lastClip], visual, es text, en text] ──────────────────────────────────
const STILLS = [
  ["titulo", [1, 3], title, { heading: "Cuarteto vocal armónico", caption: "Lección 6 · Curso de Armonía · Storm Studios Learning" }, { heading: "The Harmonic Vocal Quartet", caption: "Lesson 6 · Harmony Course · Storm Studios Learning" }],
  ["acordes-sueltos", [4, 6], title, { heading: "Acordes sueltos", caption: "Todavía sin movimiento melódico ni enlaces" }, { heading: "Individual chords", caption: "No melodic motion or connections yet" }],
  ["voces", [7, 7], score("do"), { heading: "Soprano · contralto · tenor · bajo", caption: "Dos voces femeninas y dos masculinas" }, { heading: "Soprano · alto · tenor · bass", caption: "Two female and two male voices" }],
  ["piano", [8, 10], title, { heading: "En el curso original", caption: "Partitura de piano: dos voces por pentagrama, con plicas opuestas" }, { heading: "In the original course", caption: "Piano score: two voices per staff, with opposite stems" }],
  ["secuenciador", [11, 12], score("do"), { heading: "Cuarteto SATB", caption: "Un pentagrama por voz en el secuenciador" }, { heading: "SATB quartet", caption: "One staff per voice in the sequencer" }],
  ["tesituras", [13, 15], score("tesituras"), { heading: "Tesituras", caption: "Nota más grave y más aguda de cada voz · Do4 = Do central" }, { heading: "Ranges", caption: "Lowest and highest note of each voice · C4 = middle C" }],
  ["tesitura-soprano", [16, 16], score("tesituras", { focusVoice: "soprano", highlights: [{ measure: 1, endMeasure: 2, voice: "soprano", color: "amber", label: L("Do4 – Sol5", "C4 – G5") }] }), { heading: "Soprano", caption: "Do4 a Sol5" }, { heading: "Soprano", caption: "C4 to G5" }],
  ["tesitura-contralto", [17, 17], score("tesituras", { focusVoice: "alto", highlights: [{ measure: 1, endMeasure: 2, voice: "alto", color: "amber", label: L("Sol3 – Re5", "G3 – D5") }] }), { heading: "Contralto", caption: "Sol3 a Re5" }, { heading: "Alto", caption: "G3 to D5" }],
  ["tesitura-tenor", [18, 18], score("tesituras", { focusVoice: "tenor", highlights: [{ measure: 1, endMeasure: 2, voice: "tenor", color: "amber", label: L("Si2 – Sol4", "B2 – G4") }] }), { heading: "Tenor", caption: "Si2 a Sol4" }, { heading: "Tenor", caption: "B2 to G4" }],
  ["tesitura-bajo", [19, 19], score("tesituras", { focusVoice: "bass", highlights: [{ measure: 1, endMeasure: 2, voice: "bass", color: "amber", label: L("Fa2 – Si3", "F2 – B3") }] }), { heading: "Bajo", caption: "Fa2 a Si3" }, { heading: "Bass", caption: "F2 to B3" }],
  ["tesituras-limites", [20, 20], score("tesituras"), { heading: "Respeta estos límites" }, { heading: "Stay within these limits" }],
  ["separaciones", [21, 21], title, { heading: "Separación entre voces vecinas", caption: "Soprano–contralto · contralto–tenor · tenor–bajo" }, { heading: "Spacing between adjacent voices", caption: "Soprano–alto · alto–tenor · tenor–bass" }],
  ["sep-sa", [22, 22], score("separaciones", { highlights: [bar(1, "amber", L("12ª", "12th"))] }), { heading: "Soprano – contralto", caption: "Máximo una doceava" }, { heading: "Soprano – alto", caption: "At most a twelfth" }],
  ["sep-at", [23, 23], score("separaciones", { highlights: [bar(1, "amber", L("12ª", "12th")), bar(2, "cyan", L("10ª", "10th"))] }), { heading: "Contralto – tenor", caption: "Máximo una décima" }, { heading: "Alto – tenor", caption: "At most a tenth" }],
  ["sep-tb", [24, 24], score("separaciones", { highlights: [bar(1, "amber", L("12ª", "12th")), bar(2, "cyan", L("10ª", "10th")), bar(3, "violet", L("15ª", "15th"))] }), { heading: "Tenor – bajo", caption: "Máximo una quinceava: dos octavas" }, { heading: "Tenor – bass", caption: "At most a fifteenth: two octaves" }],
  ["bajo-robusto", [25, 27], score("do", { highlights: [{ measure: 1, voice: "bass", color: "violet", label: L("bajo", "bass") }] }), { heading: "Voces de arriba compactas", caption: "Un bajo más separado hace el acorde más robusto" }, { heading: "Compact upper voices", caption: "A more distant bass makes the chord more robust" }],
  ["sin-cruces", [28, 29], score("do"), { heading: "Las voces no se cruzan", caption: "Soprano arriba de contralto, contralto arriba de tenor, tenor arriba de bajo" }, { heading: "Voices do not cross", caption: "Soprano above alto, alto above tenor, tenor above bass" }],
  ["tres-notas", [30, 33], title, { heading: "Tres notas, cuatro voces", caption: "Duplicamos una de ellas" }, { heading: "Three notes, four voices", caption: "We double one of them" }],
  ["do-mayor", [34, 34], score("do"), { heading: "Do mayor" }, { heading: "C major" }],
  ["do-bajo", [35, 35], score("do", { focusVoice: "bass", marks: [mark(1, "bass", "amber", L("Do3", "C3"))] }), { heading: "Bajo: Do3" }, { heading: "Bass: C3" }],
  ["do-tenor", [36, 36], score("do", { focusVoice: "tenor", marks: [mark(1, "tenor", "amber", L("Sol3", "G3"))] }), { heading: "Tenor: Sol3" }, { heading: "Tenor: G3" }],
  ["do-contralto", [37, 37], score("do", { focusVoice: "alto", marks: [mark(1, "alto", "amber", L("Mi4", "E4"))] }), { heading: "Contralto: Mi4" }, { heading: "Alto: E4" }],
  ["do-soprano", [38, 38], score("do", { focusVoice: "soprano", marks: [mark(1, "soprano", "amber", L("Do5", "C5"))] }), { heading: "Soprano: Do5" }, { heading: "Soprano: C5" }],
  ["do-duplica", [39, 39], score("do", { marks: [mark(1, "bass", "amber", fund), mark(1, "soprano", "amber", fund)] }), { heading: "Fundamental duplicada" }, { heading: "Doubled root" }],
  ["do-intervalos", [40, 41], score("do", { marks: [mark(1, "tenor", "cyan", L("5ª", "5th")), mark(1, "alto", "cyan", L("6ª", "6th")), mark(1, "soprano", "cyan", L("6ª", "6th"))] }), { heading: "Tesituras y separaciones correctas", caption: "Bajo–tenor 5ª · tenor–contralto 6ª · contralto–soprano 6ª" }, { heading: "Correct ranges and spacing", caption: "Bass–tenor 5th · tenor–alto 6th · alto–soprano 6th" }],
  ["do-escuchar", [42, 42], listen("do"), { heading: "Do mayor" }, { heading: "C major" }],
  ["sensible-excepcion", [43, 44], title, { heading: "Duplicamos cualquier nota menos la sensible", caption: "La única nota que no duplicamos" }, { heading: "We double any note except the leading tone", caption: "The only note we never double" }],
  ["sensible-si", [45, 46], score("sensible", { marks: [1, 2, 3].map(m => mark(m, m === 1 ? "soprano" : "alto", "rose", L("Si", "B"))) }), { heading: "En Do mayor, la sensible es Si", caption: "El séptimo grado de la escala" }, { heading: "In C major, the leading tone is B", caption: "The seventh degree of the scale" }],
  ["sensible-acordes", [47, 48], score("sensible", { highlights: [bar(1, "rose", L("Si = 3ª", "B = 3rd")), bar(2, "rose", L("Si = fundamental", "B = root")), bar(3, "rose", L("Si = 5ª", "B = 5th"))] }), { heading: "V · VII · III", caption: "Si va en una sola voz" }, { heading: "V · VII · III", caption: "B goes in a single voice" }],
  ["sensible-resuelve", [49, 49], title, { heading: "La sensible resuelve a la tónica", caption: "Duplicada, esa resolución quedaría en dos voces" }, { heading: "The leading tone resolves to the tonic", caption: "Doubled, that resolution would be in two voices" }],
  ["duplicaciones", [50, 50], score("duplicaciones", { highlights: [bar(1, "amber", L("fundamental ×2", "root ×2")), bar(2, "amber", L("5ª ×2", "5th ×2"))] }), { heading: "Mayores y menores", caption: "De preferencia, fundamental o quinta duplicada" }, { heading: "Major and minor chords", caption: "Preferably a doubled root or fifth" }],
  ["dup-tercera", [51, 51], score("duplicaciones", { highlights: [bar(1, "amber", L("fundamental ×2", "root ×2")), bar(2, "amber", L("5ª ×2", "5th ×2")), bar(3, "rose", L("3ª ×2", "3rd ×2"))] }), { heading: "Tercera duplicada", caption: "Posible, pero un poco dura" }, { heading: "Doubled third", caption: "Possible, but a little harsh" }],
  ["sin-quinta", [52, 53], score("sin-quinta", { reveal: { measure: 2 }, highlights: [bar(1, "cyan", L("fund. ×2 · 3ª ×2", "root ×2 · 3rd ×2"))] }), { heading: "Sin quinta", caption: "Fundamental y tercera duplicadas" }, { heading: "Without the fifth", caption: "Root and third doubled" }],
  ["triple-fund", [54, 54], score("sin-quinta", { reveal: { measure: 3 }, highlights: [bar(1, "cyan", L("fund. ×2 · 3ª ×2", "root ×2 · 3rd ×2")), bar(2, "cyan", L("fundamental ×3", "root ×3"))] }), { heading: "Fundamental triplicada", caption: "Y una sola tercera" }, { heading: "Tripled root", caption: "And a single third" }],
  ["triple-tercera", [55, 55], score("sin-quinta", { highlights: [bar(1, "cyan", L("fund. ×2 · 3ª ×2", "root ×2 · 3rd ×2")), bar(2, "cyan", L("fundamental ×3", "root ×3")), bar(3, "rose", L("3ª ×3", "3rd ×3"))] }), { heading: "Tercera triplicada", caption: "Con menos frecuencia" }, { heading: "Tripled third", caption: "Less often" }],
  ["nunca-suprimir", [56, 58], title, { heading: "Nunca suprimimos la fundamental ni la tercera", caption: "Sin fundamental no se reconoce el acorde · sin tercera no sabemos si es mayor o menor" }, { heading: "We never omit the root or the third", caption: "Without the root the chord is not recognized · without the third we cannot tell major from minor" }],
  ["completos", [59, 59], title, { heading: "Disminuidos y aumentados", caption: "Siempre completos" }, { heading: "Diminished and augmented chords", caption: "Always complete" }],
  ["disminuido", [60, 61], score("disminuido", { marks: [mark(1, "alto", "rose", sens), mark(1, "bass", "amber", L("Re ×2", "D ×2")), mark(1, "soprano", "amber", L("Re ×2", "D ×2"))] }), { heading: "VII de Do mayor: Si · Re · Fa", caption: "Si es la sensible: duplicamos Re o Fa" }, { heading: "VII of C major: B · D · F", caption: "B is the leading tone: we double D or F" }],
  ["aumentado", [62, 63], score("aumentado"), { heading: "III de La menor armónica", caption: "Do · Mi · Sol♯" }, { heading: "III of A harmonic minor", caption: "C · E · G♯" }],
  ["aumentado-sensible", [64, 64], score("aumentado", { marks: [mark(1, "tenor", "rose", sens), mark(1, "bass", "amber", L("Do ×2", "C ×2")), mark(1, "alto", "amber", L("Do ×2", "C ×2"))] }), { heading: "Sol♯ es la sensible", caption: "Duplicamos Do o Mi" }, { heading: "G♯ is the leading tone", caption: "We double C or E" }],
  ["estados", [65, 66], score("estados", { highlights: [{ measure: 1, endMeasure: 3, voice: "bass", color: "violet", label: L("bajo", "bass") }] }), { heading: "Estados del acorde", caption: "Dependen de la nota del bajo" }, { heading: "Chord states", caption: "They depend on the bass note" }],
  ["estado-fund", [67, 67], score("estados", { highlights: [bar(1, "amber", fund, "bass")] }), { heading: "Estado fundamental", caption: "Fundamental en el bajo" }, { heading: "Root position", caption: "Root in the bass" }],
  ["estado-63", [68, 68], score("estados", { highlights: [bar(1, "amber", fund, "bass"), bar(2, "cyan", terc, "bass")] }), { heading: "Primera inversión", caption: "Tercera en el bajo" }, { heading: "First inversion", caption: "Third in the bass" }],
  ["estado-64", [69, 69], score("estados", { highlights: [bar(1, "amber", fund, "bass"), bar(2, "cyan", terc, "bass"), bar(3, "rose", quin, "bass")] }), { heading: "Segunda inversión", caption: "Quinta en el bajo" }, { heading: "Second inversion", caption: "Fifth in the bass" }],
  ["cifrados", [70, 71], score("estados"), { heading: "Cifrados 6/3 y 6/4", caption: "Intervalos de las otras notas sobre el bajo" }, { heading: "Figures 6/3 and 6/4", caption: "Intervals of the other notes above the bass" }],
  ["la-intro", [72, 73], score("la-63"), { heading: "La mayor en primera inversión", caption: "La · Do♯ · Mi" }, { heading: "A major in first inversion", caption: "A · C♯ · E" }],
  ["la-bajo", [74, 74], score("la-63", { marks: [mark(1, "bass", "cyan", L("Do♯ · 3ª", "C♯ · 3rd"))] }), { heading: "Do♯ en el bajo" }, { heading: "C♯ in the bass" }],
  ["la-fund", [75, 75], score("la-63", { marks: [mark(1, "bass", "cyan", L("Do♯ · 3ª", "C♯ · 3rd")), mark(1, "tenor", "amber", fund)] }), { heading: "No suprimimos la fundamental" }, { heading: "We do not omit the root" }],
  ["la-duplica", [76, 76], score("la-63", { marks: [mark(1, "bass", "cyan", L("Do♯ · 3ª", "C♯ · 3rd")), mark(1, "tenor", "amber", fund), mark(1, "soprano", "amber", fund)] }), { heading: "Fundamental duplicada" }, { heading: "Doubled root" }],
  ["solb-intro", [77, 78], score("solb-64"), { heading: "Sol♭ mayor en segunda inversión", caption: "Sol♭ · Si♭ · Re♭" }, { heading: "G♭ major in second inversion", caption: "G♭ · B♭ · D♭" }],
  ["solb-bajo", [79, 79], score("solb-64", { marks: [mark(1, "bass", "rose", L("Re♭ · 5ª", "D♭ · 5th"))] }), { heading: "Re♭ en el bajo" }, { heading: "D♭ in the bass" }],
  ["solb-fund-terc", [80, 80], score("solb-64", { marks: [mark(1, "bass", "rose", L("Re♭ · 5ª", "D♭ · 5th")), mark(1, "tenor", "amber", fund), mark(1, "alto", "cyan", terc)] }), { heading: "Fundamental y tercera" }, { heading: "Root and third" }],
  ["solb-duplica", [81, 81], score("solb-64", { marks: [mark(1, "bass", "rose", L("Re♭ · 5ª", "D♭ · 5th")), mark(1, "tenor", "amber", fund), mark(1, "alto", "cyan", terc), mark(1, "soprano", "rose", quin)] }), { heading: "Quinta duplicada" }, { heading: "Doubled fifth" }],
  ["estados-escuchar", [82, 82], listen("estados"), { heading: "Los tres estados", caption: "Do mayor: fundamental · 6/3 · 6/4" }, { heading: "The three states", caption: "C major: root position · 6/3 · 6/4" }],
  ["posicion", [83, 84], score("posicion", { highlights: [{ measure: 1, endMeasure: 3, voice: "soprano", color: "violet", label: L("soprano", "soprano") }] }), { heading: "Posición melódica", caption: "Depende de la nota de la soprano" }, { heading: "Melodic position", caption: "It depends on the soprano note" }],
  ["posicion-8", [85, 85], score("posicion", { highlights: [bar(1, "amber", L("8ª", "octave"), "soprano")] }), { heading: "Posición melódica de octava", caption: "Fundamental en la soprano" }, { heading: "Melodic position of the octave", caption: "Root in the soprano" }],
  ["posicion-3", [86, 86], score("posicion", { highlights: [bar(1, "amber", L("8ª", "octave"), "soprano"), bar(2, "cyan", terc, "soprano")] }), { heading: "Posición melódica de tercera", caption: "Tercera en la soprano" }, { heading: "Melodic position of the third", caption: "Third in the soprano" }],
  ["posicion-5", [87, 87], score("posicion", { highlights: [bar(1, "amber", L("8ª", "octave"), "soprano"), bar(2, "cyan", terc, "soprano"), bar(3, "rose", quin, "soprano")] }), { heading: "Posición melódica de quinta", caption: "Quinta en la soprano" }, { heading: "Melodic position of the fifth", caption: "Fifth in the soprano" }],
  ["posicion-escuchar", [88, 88], listen("posicion"), { heading: "Las tres posiciones melódicas" }, { heading: "The three melodic positions" }],
  ["disposicion", [89, 90], score("disposicion", { highlights: [1, 2].flatMap(m => ["soprano", "alto", "tenor"].map(v => ({ measure: m, voice: v, color: "violet" }))) }), { heading: "Disposición interna", caption: "Solo las tres voces de arriba" }, { heading: "Internal spacing", caption: "Only the three upper voices" }],
  ["disposicion-def", [91, 92], score("disposicion"), { heading: "Cerrada o abierta", caption: "¿Cabe otra nota del acorde entre ellas?" }, { heading: "Close or open", caption: "Does another chord tone fit between them?" }],
  ["cerrada", [93, 94], score("disposicion", { highlights: [bar(1, "amber", L("cerrada", "close"))] }), { heading: "Disposición cerrada", caption: "Sol · Do · Mi: no cabe otra nota de Do mayor" }, { heading: "Close spacing", caption: "G · C · E: no other note of C major fits" }],
  ["abierta", [95, 96], score("disposicion", { highlights: [bar(1, "amber", L("cerrada", "close")), bar(2, "cyan", L("abierta · cabe Do", "open · C fits"))] }), { heading: "Disposición abierta", caption: "Entre Sol y Mi cabe un Do" }, { heading: "Open spacing", caption: "A C fits between G and E" }],
  ["disposicion-escuchar", [97, 97], listen("disposicion"), { heading: "Cerrada y abierta" }, { heading: "Close and open" }],
  ["tarea", [98, 98], title, { heading: "Tarea para el Maestro Virtual" }, { heading: "Assignment for the Virtual Teacher" }],
  ["tarea-grados", [99, 101], score("tarea"), { heading: "Siete acordes, uno por grado", caption: "Cualquier tonalidad mayor, en cualquier orden" }, { heading: "Seven chords, one per degree", caption: "Any major key, in any order" }],
  ["tarea-libre", [102, 103], score("tarea"), { heading: "Estado, posición y disposición libres", caption: "Varíalos para practicar todas las combinaciones" }, { heading: "Free state, position and spacing", caption: "Vary them to practice every combination" }],
  ["tarea-enteras", [104, 105], score("tarea"), { heading: "Una entera por compás", caption: "Secuenciador en modo Cuarteto SATB · exporta el MIDI" }, { heading: "One whole note per measure", caption: "Sequencer in SATB quartet mode · export the MIDI" }],
  ["maestro-revisa", [106, 109], title, { heading: "El Maestro Virtual revisa", caption: "Tonalidad y grados · tesituras · separaciones y cruces · duplicaciones, supresiones y sensible · grafía" }, { heading: "The Virtual Teacher checks", caption: "Key and degrees · ranges · spacing and crossings · doublings, omissions and leading tone · spelling" }],
  ["maestro-describe", [110, 110], score("tarea"), { heading: "Y describe cada acorde", caption: "Estado · posición melódica · disposición" }, { heading: "And describes each chord", caption: "State · melodic position · spacing" }],
  ["recapitulemos", [111, 111], title, { heading: "Recapitulemos" }, { heading: "Let's recap" }],
  ["recap-tesituras", [112, 113], score("tesituras"), { heading: "Tesituras y separaciones", caption: "Sin cruces de voces" }, { heading: "Ranges and spacing", caption: "No voice crossing" }],
  ["recap-duplicaciones", [114, 114], score("duplicaciones"), { heading: "Duplicaciones y supresiones", caption: "Nunca la sensible · en mayores y menores se puede suprimir la quinta" }, { heading: "Doublings and omissions", caption: "Never the leading tone · in major and minor chords the fifth may be omitted" }],
  ["recap-estado", [115, 115], score("estados"), { heading: "Bajo: estado · soprano: posición melódica", caption: "Tres voces de arriba: disposición" }, { heading: "Bass: state · soprano: melodic position", caption: "Three upper voices: spacing" }],
  ["siguiente", [116, 116], title, { heading: "Próximas lecciones", caption: "El enlace de los acordes" }, { heading: "Next lessons", caption: "Connecting chords" }],
  ["cierre", [117, 118], title, { heading: "Gracias", caption: "Nos vemos en la lección 7" }, { heading: "Thank you", caption: "See you in lesson 7" }],
];

// ── Build ────────────────────────────────────────────────────────────────────────────────────────
const resolve = (value, lang) => (value && typeof value === "object" && "es" in value && "en" in value ? value[lang] : value);
const localize = (items, lang) => items?.map(item => ({ ...item, ...(item.label ? { label: resolve(item.label, lang) } : {}) }));
const PROJECT_TITLES_EN = {
  "Do mayor": "C major", Tesituras: "Ranges", "Separaciones máximas": "Maximum spacing", "La sensible en Do mayor": "The leading tone in C major",
  "Duplicaciones en Do mayor": "Doublings in C major", "Do mayor sin quinta": "C major without the fifth", "VII de Do mayor": "VII of C major",
  "III de La menor armónica": "III of A harmonic minor", "Estados de Do mayor": "States of C major", "La mayor": "A major", "Sol♭ mayor": "G♭ major",
  "Posición melódica": "Melodic position", "Disposición interna": "Internal spacing", "Tarea: siete grados de Do mayor": "Assignment: seven degrees of C major",
};

for (const lang of ["es", "en"]) {
  const dir = `content/storyboards/${lang}`;
  const lines = readFileSync(`${dir}/${LESSON}.guion.txt`, "utf8").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  let expected = 1;
  const stills = STILLS.map(([id, [from, to], visual, es, en]) => {
    if (from !== expected || to < from) throw new Error(`${id}: clips ${from}-${to}, se esperaba empezar en ${expected}`);
    expected = to + 1;
    const still = { id, ...visual, ...(lang === "es" ? es : en), narration: lines.slice(from - 1, to).join(" ") };
    if (visual.highlights) still.highlights = localize(visual.highlights, lang);
    if (visual.marks) still.marks = localize(visual.marks, lang);
    if (visual.project) still.showCiphers = true;
    return still;
  });
  if (expected - 1 !== lines.length) throw new Error(`${lang}: los stills cubren ${expected - 1} de ${lines.length} frases`);
  const localizedProjects = Object.fromEntries(Object.entries(projects).map(([key, p]) =>
    [key, { ...p, setup: { ...p.setup, title: lang === "es" ? p.setup.title : PROJECT_TITLES_EN[p.setup.title] } }]));
  const titles = { es: "Lección 6 — Cuarteto vocal armónico", en: "Lesson 6 — The Harmonic Vocal Quartet" };
  const storyboard = { version: 1, lesson: LESSON, locale: lang, title: titles[lang], source: `${dir}/${LESSON}.guion.txt`,
    format: { aspect: "16:9", theme: "storm" }, projects: localizedProjects, stills };
  writeFileSync(`${dir}/${LESSON}.json`, JSON.stringify(storyboard, null, 2) + "\n");
  const audio = { lesson: LESSON,
    source: { script: `${dir}/${LESSON}.guion.txt`, durations: `${dir}/${LESSON}.durations.txt`, clipPattern: "{n}_Chapter_1.mp3", clips: lines.length },
    note: "Una frase del guion por clip; cada still cubre clips completos.",
    stills: STILLS.map(([id, [from, to]]) => ({ id, start: { clip: from, at: 0 }, end: { clip: to, at: 1 } })) };
  writeFileSync(`${dir}/${LESSON}.audio.json`, JSON.stringify(audio, null, 2) + "\n");
  console.log(`${dir}/${LESSON}.json: ${stills.length} stills, ${lines.length} clips`);
}
