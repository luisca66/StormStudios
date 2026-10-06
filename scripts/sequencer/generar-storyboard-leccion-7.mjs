// Generates the Lesson 7 storyboards and audio maps (ES and EN) from the sentence-per-line scripts.
// Usage: node scripts/sequencer/generar-storyboard-leccion-7.mjs
//
// Each line of content/storyboards/<locale>/08-leccion-7.guion.txt is one ElevenLabs clip.
// Every still declares the clip range it covers, so narration, audio map and subtitles come from
// the same data and cannot drift. Both locales share projects, music, reveals and highlights.
// Melodic examples follow Medrano's melodic rules; every SATB chord respects the Lesson 6 rules,
// and the "correct" connection has no parallel or contrary 5ths/octaves.
import { readFileSync, writeFileSync } from "node:fs";

const LESSON = "08-leccion-7";
const IMG = "/images/curso/leccion-7";

// ── Music ────────────────────────────────────────────────────────────────────────────────────────
const VOICES = ["soprano", "alto", "tenor", "bass"];
const single = (title, measures, key = "C", tempo = 72) => ({ mode: "single", title, key, time: [4, 4], measures, tempo });
const satbSetup = (title, measures, key = "C", tempo = 60) => ({ mode: "satb", title, key, time: [4, 4], measures, tempo });
/** Melody: one array per measure, each item "C4 mitad" / "silencio cuarto". */
const melody = measures => "voz melody\n" + measures.map((m, i) => `compas ${i + 1}\n${m.join("; ")}`).join("\n");
const pairs = list => list.map(([a, b]) => [`${a} mitad`, `${b} mitad`]);
const three = list => list.map(notes => [...notes.map(n => `${n} cuarto`), ...(notes.length === 3 ? ["silencio cuarto"] : ["silencio mitad"])]);
/** SATB with one whole note per measure: chords [S, A, T, B]; "-" is a whole rest. */
const satb = chords => VOICES.map((voice, v) =>
  `voz ${voice}\n` + chords.map((c, i) => `compas ${i + 1}\n${c[v] === "-" ? "silencio" : c[v]} entera`).join("\n")).join("\n");
/** SATB with an 8-quarter melody in one voice and the other staves empty. */
const satbMelody = (voice, notes) => VOICES.map(v => `voz ${v}\n` + [0, 1].map(m =>
  `compas ${m + 1}\n` + (v === voice ? notes.slice(m * 4, m * 4 + 4).map(n => `${n} cuarto`).join("; ") : "silencio entera")).join("\n")).join("\n");
const texts = list => list.map((text, i) => ({ measure: i + 1, beat: 1, text, kind: "roman" }));

const projects = {
  intervalos: { setup: single("Intervalos melódicos permitidos", 9),
    text: melody(pairs([["E4", "F4"], ["C4", "D4"], ["D4", "F4"], ["C4", "E4"], ["C4", "F4"], ["C4", "G4"], ["E4", "C5"], ["C4", "A4"], ["C4", "C5"]])) },
  sensible: { setup: single("La sensible en Do mayor", 2), text: melody(pairs([["B4", "C5"], ["B3", "B4"]])) },
  disminuidos: { setup: single("Quinta disminuida en Do mayor", 4), text: melody(three([["B4", "F5", "E5"], ["F5", "B4", "C5"], ["B4", "F5", "G5"], ["F4", "B4"]])) },
  saltos: { setup: single("Saltos sucesivos", 4), text: melody(three([["C4", "F4", "C5"], ["C4", "G4", "C5"], ["D4", "G4", "C5"], ["C4", "A4", "D4"]])) },
  // Two voices: soprano and bass (alto and tenor hidden).
  "octavas-paralelas": { setup: satbSetup("Octavas paralelas", 2), text: satb([["C5", "-", "-", "C3"], ["D5", "-", "-", "D3"]]) },
  "quintas-paralelas": { setup: satbSetup("Quintas paralelas", 2), text: satb([["G4", "-", "-", "C3"], ["A4", "-", "-", "D3"]]) },
  "octavas-contrarias": { setup: satbSetup("Octavas contrarias", 2), text: satb([["G4", "-", "-", "G3"], ["C5", "-", "-", "C3"]]) },
  unisono: { setup: satbSetup("Unísonos paralelos", 2), text: satb([["-", "C4", "C4", "-"], ["-", "D4", "D4", "-"]]) },
  "quintas-no-justas": { setup: satbSetup("Quintas paralelas no justas", 6),
    text: satb([["G4", "-", "-", "C3"], ["F4", "-", "-", "B2"], ["F4", "-", "-", "B2"], ["G4", "-", "-", "C3"], ["G4", "-", "-", "C3"], ["A4", "-", "-", "D3"]]) },
  "quintas-contrarias": { setup: satbSetup("Quintas contrarias", 4),
    text: satb([["G4", "-", "-", "C3"], ["C5", "-", "-", "F2"], ["-", "-", "G3", "C3"], ["-", "-", "C4", "F2"]]) },
  "saltos-simultaneos": { setup: satbSetup("Saltos simultáneos", 6),
    text: satb([["E4", "-", "-", "C3"], ["B4", "-", "-", "G3"], ["E4", "-", "-", "C3"], ["A4", "-", "-", "F3"], ["E4", "-", "-", "C3"], ["B4", "-", "-", "G2"]]) },
  // IV–V in C major: measures 1–2 with parallel 5ths (tenor–bass), measures 3–4 written correctly.
  enlace: { setup: satbSetup("Enlace IV – V en Do mayor", 4),
    text: satb([["A4", "F4", "C4", "F3"], ["B4", "D4", "D4", "G3"], ["C5", "A4", "F4", "F3"], ["B4", "G4", "D4", "G3"]]),
    annotations: texts(["IV", "V", "IV", "V"]) },
  // The four correct assignment melodies (test-midis/Leccion_7_*_correcta.mid).
  "tarea-soprano": { setup: satbSetup("Soprano en Do mayor", 2, "C", 72), text: satbMelody("soprano", ["C5", "B4", "A4", "G4", "E4", "F4", "D4", "C4"]) },
  "tarea-contralto": { setup: satbSetup("Contralto en Sol mayor", 2, "G", 72), text: satbMelody("alto", ["G4", "D4", "E4", "C4", "A3", "B3", "F#4", "G4"]) },
  "tarea-tenor": { setup: satbSetup("Tenor en Re mayor", 2, "D", 72), text: satbMelody("tenor", ["D4", "A3", "B3", "G3", "C#3", "E3", "C#3", "D3"]) },
  "tarea-bajo": { setup: satbSetup("Bajo en Si♭ mayor", 2, "Bb", 72), text: satbMelody("bass", ["Bb2", "D3", "F3", "Eb3", "C3", "F2", "A2", "Bb2"]) },
  tesituras: { setup: satbSetup("Tesituras", 2), text: satb([["C4", "G3", "B2", "F2"], ["G5", "D5", "G4", "B3"]]) },
};

const L = (es, en) => ({ es, en });
const title = { kind: "title" };
const image = name => ({ kind: "image", image: lang => `${IMG}/${name}-${lang}.svg` });
const score = (project, extra = {}) => ({ project, ...extra });
const listen = (project, extra = {}) => score(project, { audio: true, cursor: { measure: extra.measures?.[0] ?? 1, beat: 1 }, ...extra });
/** Highlight a whole measure (optionally one voice) or a beat span inside it. */
const hl = (measure, color, label, extra = {}) => ({ measure, color, label, ...extra });
const half = (measure, beat, color, label) => ({ measure, beat, endBeat: beat + 2, color, label });
const SB = ["soprano", "bass"];
const ok = "green", no = "rose";

// Interval labels of the "intervalos" project, one per measure.
const IV = [L("2ª m", "m2"), L("2ª M", "M2"), L("3ª m", "m3"), L("3ª M", "M3"), L("4ª J", "P4"), L("5ª J", "P5"), L("6ª m", "m6"), L("6ª M", "M6"), L("8ª J", "P8")];
const ivHl = (from, to, color = "amber") => IV.slice(from - 1, to).map((label, i) => hl(from + i, color, label));
const groups = n => [
  ...ivHl(1, 2, "green"), ...(n > 1 ? ivHl(3, 4, "cyan") : []), ...(n > 2 ? ivHl(5, 5, "amber") : []), ...(n > 3 ? ivHl(6, 9, "violet") : []),
];
const tesitura = (voice, es, en) => score("tesituras", { focusVoice: voice, highlights: [{ measure: 1, endMeasure: 2, voice, color: "amber", label: L(es, en) }] });

// ── Stills: [id, [firstClip, lastClip], visual, es text, en text] ──────────────────────────────────
const STILLS = [
  ["titulo", [1, 3], title, { heading: "Movimientos melódicos y armónicos", caption: "Lección 7 · Curso de Armonía · Storm Studios Learning" }, { heading: "Melodic and Harmonic Motion", caption: "Lesson 7 · Harmony Course · Storm Studios Learning" }],
  ["dos-partes", [4, 4], title, { heading: "Dos partes", caption: "Movimientos melódicos · movimientos armónicos" }, { heading: "Two parts", caption: "Melodic motion · harmonic motion" }],
  ["una-voz", [5, 5], score("tarea-soprano", { voices: ["soprano"] }), { heading: "Movimiento melódico", caption: "Una sola voz, de una nota a la siguiente" }, { heading: "Melodic motion", caption: "A single voice, from one note to the next" }],
  ["dos-voces", [6, 6], score("enlace", { measures: [3, 4], voices: SB }), { heading: "Movimiento armónico", caption: "Dos voces que se mueven al mismo tiempo" }, { heading: "Harmonic motion", caption: "Two voices moving at the same time" }],
  ["cada-voz", [7, 8], score("enlace", { measures: [3, 4] }), { heading: "Cada voz canta su propia melodía", caption: "Antes del primer coral, practicamos cada voz por separado" }, { heading: "Each voice sings its own melody", caption: "Before the first chorale, we practice each voice on its own" }],
  ["paso-a-paso", [9, 11], title, { heading: "Paso a paso", caption: "Primero cada voz, después los enlaces, después el coral" }, { heading: "Step by step", caption: "First each voice, then connections, then the chorale" }],
  ["melodicos", [12, 12], title, { heading: "Movimientos melódicos" }, { heading: "Melodic motion" }],
  ["intervalos-figura", [13, 13], image("intervalos-melodicos"), { heading: "Intervalos permitidos" }, { heading: "Allowed intervals" }],
  ["iv-segundas", [14, 14], score("intervalos", { reveal: { measure: 3 }, highlights: ivHl(1, 2) }), { heading: "Segunda menor y segunda mayor" }, { heading: "Minor second and major second" }],
  ["iv-terceras", [15, 15], score("intervalos", { reveal: { measure: 5 }, highlights: ivHl(1, 4) }), { heading: "Tercera menor y tercera mayor" }, { heading: "Minor third and major third" }],
  ["iv-cuarta-quinta", [16, 16], score("intervalos", { reveal: { measure: 7 }, highlights: ivHl(1, 6) }), { heading: "Cuarta justa y quinta justa" }, { heading: "Perfect fourth and perfect fifth" }],
  ["iv-sextas", [17, 17], score("intervalos", { reveal: { measure: 9 }, highlights: ivHl(1, 8) }), { heading: "Sexta menor y sexta mayor" }, { heading: "Minor sixth and major sixth" }],
  ["iv-octava", [18, 18], score("intervalos", { highlights: ivHl(1, 9) }), { heading: "Octava justa" }, { heading: "Perfect octave" }],
  ["sin-aumentados", [19, 20], title, { heading: "Sin intervalos aumentados", caption: "Sin séptimas · nada mayor que la octava" }, { heading: "No augmented intervals", caption: "No sevenths · nothing larger than an octave" }],
  ["clasificacion", [21, 21], image("intervalos-melodicos"), { heading: "Cuatro grupos" }, { heading: "Four groups" }],
  ["grado-conjunto", [22, 22], score("intervalos", { highlights: groups(1) }), { heading: "Grado conjunto", caption: "Las segundas" }, { heading: "Step", caption: "Seconds" }],
  ["camino-corto", [23, 23], score("intervalos", { highlights: groups(2) }), { heading: "Camino corto", caption: "Las terceras" }, { heading: "Short path", caption: "Thirds" }],
  ["salto-corto", [24, 24], score("intervalos", { highlights: groups(3) }), { heading: "Salto corto", caption: "La cuarta justa" }, { heading: "Short leap", caption: "The perfect fourth" }],
  ["saltos-largos", [25, 25], score("intervalos", { highlights: groups(4) }), { heading: "Saltos largos", caption: "Quinta justa, sextas y octava" }, { heading: "Long leaps", caption: "Perfect fifth, sixths and octave" }],
  ["intervalos-escuchar", [26, 26], listen("intervalos", { highlights: groups(4) }), { heading: "Los nueve intervalos" }, { heading: "The nine intervals" }],
  ["con-cuidado", [27, 28], title, { heading: "El grado conjunto es lo más natural", caption: "Los saltos dan carácter, con cuidado" }, { heading: "The step is the most natural", caption: "Leaps give character, with care" }],
  ["sensible", [29, 30], score("sensible", { reveal: { measure: 2 }, highlights: [half(1, 1, "amber", L("sensible", "leading tone"))] }), { heading: "La sensible: Si", caption: "Quiere subir a Do" }, { heading: "The leading tone: B", caption: "It wants to rise to C" }],
  ["sensible-octava", [31, 31], score("sensible", { highlights: [half(1, 1, "amber", L("sensible", "leading tone")), hl(2, no, L("✗ 8ª con la sensible", "✗ octave on the leading tone"))] }), { heading: "Sin saltos de octava con la sensible" }, { heading: "No octave leaps on the leading tone" }],
  ["disminuidos-figura", [32, 33], image("disminuidos"), { heading: "Intervalos disminuidos" }, { heading: "Diminished intervals" }],
  ["compensar", [34, 36], title, { heading: "5ª, 4ª y 7ª disminuidas", caption: "Permitidas si después la voz cambia de dirección: compensar" }, { heading: "Diminished 5th, 4th and 7th", caption: "Allowed if the voice then changes direction: compensating" }],
  ["dis-si-fa", [37, 37], score("disminuidos", { reveal: { measure: 1, beat: 3 }, highlights: [{ measure: 1, beat: 1, endBeat: 3, color: "amber", label: L("5ª dis.", "dim. 5th") }] }), { heading: "Si – Fa hacia arriba", caption: "Quinta disminuida" }, { heading: "B – F upward", caption: "Diminished fifth" }],
  ["dis-baja", [38, 38], score("disminuidos", { reveal: { measure: 2 }, highlights: [hl(1, ok, L("✓ baja a Mi", "✓ down to E"))] }), { heading: "Compensada", caption: "La voz baja" }, { heading: "Compensated", caption: "The voice moves down" }],
  ["dis-fa-si", [39, 39], score("disminuidos", { reveal: { measure: 2, beat: 3 }, highlights: [hl(1, ok, L("✓ baja a Mi", "✓ down to E")), { measure: 2, beat: 1, endBeat: 3, color: "amber", label: L("5ª dis.", "dim. 5th") }] }), { heading: "Fa – Si hacia abajo", caption: "También quinta disminuida" }, { heading: "F – B downward", caption: "Also a diminished fifth" }],
  ["dis-sube", [40, 40], score("disminuidos", { reveal: { measure: 3 }, highlights: [hl(1, ok, L("✓ baja a Mi", "✓ down to E")), hl(2, ok, L("✓ sube a Do", "✓ up to C"))] }), { heading: "Compensada", caption: "La voz sube" }, { heading: "Compensated", caption: "The voice moves up" }],
  ["dis-sin-compensar", [41, 41], score("disminuidos", { reveal: { measure: 4 }, highlights: [hl(1, ok, L("✓ baja a Mi", "✓ down to E")), hl(2, ok, L("✓ sube a Do", "✓ up to C")), hl(3, no, L("✗ sigue subiendo", "✗ keeps rising"))] }), { heading: "Sin compensar", caption: "Después de Si y Fa sigue a Sol" }, { heading: "Not compensated", caption: "After B and F it goes on to G" }],
  ["cuarta-aumentada", [42, 44], score("disminuidos", { highlights: [hl(1, ok, L("✓", "✓")), hl(2, ok, L("✓", "✓")), hl(3, no, L("✗", "✗")), hl(4, no, L("✗ 4ª aum.", "✗ aug. 4th"))] }), { heading: "Fa – Si hacia arriba: cuarta aumentada", caption: "Las cuartas aumentadas no se usan" }, { heading: "F – B upward: augmented fourth", caption: "Augmented fourths are not used" }],
  ["modo-menor", [45, 45], title, { heading: "4ª y 7ª disminuidas", caption: "Aparecen en el modo menor · las veremos más adelante" }, { heading: "Diminished 4th and 7th", caption: "They appear in the minor mode · we will see them later" }],
  ["saltos-figura", [46, 48], image("saltos-sucesivos"), { heading: "Saltos sucesivos", caption: "Misma dirección: solo 4ª y 5ª, o 5ª y 4ª" }, { heading: "Successive leaps", caption: "Same direction: only a 4th and a 5th, or a 5th and a 4th" }],
  ["saltos-4-5", [49, 49], score("saltos", { reveal: { measure: 2 }, highlights: [hl(1, ok, L("✓ 4ª + 5ª", "✓ 4th + 5th"))] }), { heading: "Do – Fa – Do" }, { heading: "C – F – C" }],
  ["saltos-5-4", [50, 50], score("saltos", { reveal: { measure: 3 }, highlights: [hl(1, ok, L("✓ 4ª + 5ª", "✓ 4th + 5th")), hl(2, ok, L("✓ 5ª + 4ª", "✓ 5th + 4th"))] }), { heading: "Do – Sol – Do" }, { heading: "C – G – C" }],
  ["saltos-4-4", [51, 51], score("saltos", { reveal: { measure: 4 }, highlights: [hl(1, ok, L("✓ 4ª + 5ª", "✓ 4th + 5th")), hl(2, ok, L("✓ 5ª + 4ª", "✓ 5th + 4th")), hl(3, no, L("✗ 4ª + 4ª", "✗ 4th + 4th"))] }), { heading: "Re – Sol – Do", caption: "Dos cuartas hacia arriba" }, { heading: "D – G – C", caption: "Two fourths upward" }],
  ["saltos-direccion", [52, 52], score("saltos", { highlights: [hl(1, ok, L("✓ 4ª + 5ª", "✓ 4th + 5th")), hl(2, ok, L("✓ 5ª + 4ª", "✓ 5th + 4th")), hl(3, no, L("✗ 4ª + 4ª", "✗ 4th + 4th")), hl(4, ok, L("✓ cambia de dirección", "✓ changes direction"))] }), { heading: "Cambio de dirección", caption: "Sin problema" }, { heading: "Change of direction", caption: "No problem" }],
  ["armonicos", [53, 54], title, { heading: "Movimientos armónicos", caption: "Dos voces que se mueven al mismo tiempo" }, { heading: "Harmonic motion", caption: "Two voices moving at the same time" }],
  ["paralelas-figura", [55, 57], image("paralelas"), { heading: "Quintas y octavas paralelas", caption: "La regla más famosa de la armonía" }, { heading: "Parallel fifths and octaves", caption: "The most famous rule in harmony" }],
  ["octavas-paralelas", [58, 59], score("octavas-paralelas", { voices: SB, highlights: [hl(1, no, L("8ª", "8ve")), hl(2, no, L("8ª", "8ve"))] }), { heading: "Octavas paralelas", caption: "Soprano Do5 – Re5 · bajo Do3 – Re3" }, { heading: "Parallel octaves", caption: "Soprano C5 – D5 · bass C3 – D3" }],
  ["octavas-escuchar", [60, 60], listen("octavas-paralelas", { voices: SB }), { heading: "Octavas paralelas" }, { heading: "Parallel octaves" }],
  ["una-sola-voz", [61, 62], score("octavas-paralelas", { voices: SB }), { heading: "Suenan como una sola voz", caption: "Perdemos una voz del cuarteto" }, { heading: "They sound like a single voice", caption: "We lose a voice of the quartet" }],
  ["quintas-paralelas", [63, 64], score("quintas-paralelas", { voices: SB, highlights: [hl(1, no, L("5ª J", "P5")), hl(2, no, L("5ª J", "P5"))] }), { heading: "Quintas paralelas", caption: "Las voces se funden y el sonido se vuelve hueco" }, { heading: "Parallel fifths", caption: "The voices blend and the sound becomes hollow" }],
  ["contrarias", [65, 66], score("octavas-contrarias", { voices: SB }), { heading: "Quintas y octavas contrarias", caption: "Las mismas, en direcciones opuestas" }, { heading: "Contrary fifths and octaves", caption: "The same, in opposite directions" }],
  ["octavas-contrarias", [67, 68], score("octavas-contrarias", { voices: SB, highlights: [hl(1, no, L("8ª", "8ve")), hl(2, no, L("2 × 8ª", "2 × 8ve"))] }), { heading: "Octavas contrarias", caption: "Soprano Sol4 – Do5 · bajo Sol3 – Do3" }, { heading: "Contrary octaves", caption: "Soprano G4 – C5 · bass G3 – C3" }],
  ["unisono", [69, 69], score("unisono", { voices: ["alto", "tenor"], highlights: [hl(1, no, L("unísono", "unison")), hl(2, no, L("unísono", "unison"))] }), { heading: "El unísono cuenta como octava" }, { heading: "The unison counts as an octave" }],
  ["dos-casos", [70, 70], title, { heading: "Quintas permitidas", caption: "Dos casos" }, { heading: "Allowed fifths", caption: "Two cases" }],
  ["no-justas", [71, 71], image("quintas-permitidas"), { heading: "Quintas paralelas no justas" }, { heading: "Parallel fifths that are not perfect" }],
  ["justa-dis", [72, 72], score("quintas-no-justas", { voices: SB, reveal: { measure: 3 }, highlights: [hl(1, ok, L("5ª J", "P5")), hl(2, ok, L("5ª dis.", "dim. 5th"))] }), { heading: "Justa → disminuida" }, { heading: "Perfect → diminished" }],
  ["dis-justa", [73, 73], score("quintas-no-justas", { voices: SB, reveal: { measure: 5 }, highlights: [hl(1, ok, L("5ª J", "P5")), hl(2, ok, L("5ª dis.", "dim. 5th")), hl(3, ok, L("5ª dis.", "dim. 5th")), hl(4, ok, L("5ª J", "P5"))] }), { heading: "Disminuida → justa" }, { heading: "Diminished → perfect" }],
  ["justa-justa", [74, 74], score("quintas-no-justas", { voices: SB, highlights: [hl(1, ok, L("5ª J", "P5")), hl(2, ok, L("5ª dis.", "dim. 5th")), hl(3, ok, L("5ª dis.", "dim. 5th")), hl(4, ok, L("5ª J", "P5")), hl(5, no, L("5ª J", "P5")), hl(6, no, L("5ª J", "P5"))] }), { heading: "Justa → justa: no" }, { heading: "Perfect → perfect: no" }],
  ["extremas", [75, 76], title, { heading: "Voces extremas", caption: "La soprano y el bajo: la de arriba y la de abajo" }, { heading: "Outer voices", caption: "The soprano and the bass: the top one and the bottom one" }],
  ["contrarias-sb", [77, 77], score("quintas-contrarias", { measures: [1, 2], highlights: [hl(1, no, L("5ª", "5th")), hl(2, no, L("5ª", "5th"))] }), { heading: "Soprano y bajo: no" }, { heading: "Soprano and bass: no" }],
  ["contrarias-tb", [78, 78], score("quintas-contrarias", { highlights: [hl(1, no, L("5ª", "5th")), hl(2, no, L("5ª", "5th")), hl(3, ok, L("5ª", "5th")), hl(4, ok, L("5ª", "5th"))] }), { heading: "Tenor y bajo: sí" }, { heading: "Tenor and bass: yes" }],
  ["simultaneos-figura", [79, 79], image("saltos-simultaneos"), { heading: "Saltos simultáneos" }, { heading: "Simultaneous leaps" }],
  ["simultaneos-no", [80, 80], score("saltos-simultaneos", { voices: SB, reveal: { measure: 3 }, highlights: [hl(1, no, L("✗ dos 5ª", "✗ two 5ths"), { endMeasure: 2 })] }), { heading: "Dos saltos en la misma dirección" }, { heading: "Two leaps in the same direction" }],
  ["simultaneos-cuartas", [81, 81], score("saltos-simultaneos", { voices: SB, reveal: { measure: 5 }, highlights: [hl(1, no, L("✗ dos 5ª", "✗ two 5ths"), { endMeasure: 2 }), hl(3, ok, L("✓ dos 4ª J", "✓ two P4"), { endMeasure: 4 })] }), { heading: "Excepción: dos cuartas justas" }, { heading: "Exception: two perfect fourths" }],
  ["simultaneos-contrarios", [82, 82], score("saltos-simultaneos", { voices: SB, highlights: [hl(1, no, L("✗ dos 5ª", "✗ two 5ths"), { endMeasure: 2 }), hl(3, ok, L("✓ dos 4ª J", "✓ two P4"), { endMeasure: 4 }), hl(5, ok, L("✓ contrarios", "✓ contrary"), { endMeasure: 6 })] }), { heading: "Direcciones contrarias", caption: "Sin problema" }, { heading: "Opposite directions", caption: "No problem" }],
  ["enlace-mal", [83, 83], listen("enlace", { measures: [1, 2], highlights: [1, 2].flatMap(m => ["tenor", "bass"].map(voice => ({ measure: m, voice, color: no }))) }), { heading: "IV – V con quintas paralelas", caption: "Tenor y bajo: Fa – Do y luego Sol – Re" }, { heading: "IV – V with parallel fifths", caption: "Tenor and bass: F – C, then G – D" }],
  ["enlace-bien", [84, 84], listen("enlace", { measures: [3, 4] }), { heading: "IV – V escrito correctamente" }, { heading: "IV – V written correctly" }],
  ["proximas", [85, 88], title, { heading: "Próximas lecciones", caption: "Material armónico y enlaces · enlaces de dos acordes · primer coral" }, { heading: "Coming lessons", caption: "Harmonic material and connections · two-chord connections · first chorale" }],
  ["tarea", [89, 89], title, { heading: "Tarea para el Maestro Virtual" }, { heading: "Assignment for the Virtual Teacher" }],
  ["cuatro-ejercicios", [90, 91], title, { heading: "Cuatro ejercicios", caption: "Soprano · contralto · tenor · bajo · cada uno se sube por separado" }, { heading: "Four exercises", caption: "Soprano · alto · tenor · bass · each one uploaded separately" }],
  ["tarea-soprano", [92, 94], score("tarea-soprano", { highlights: [{ measure: 1, beat: 1, endBeat: 2, voice: "soprano", color: "amber", label: "I" }, { measure: 2, beat: 4, endBeat: 5, voice: "soprano", color: "amber", label: "I" }] }), { heading: "Ocho cuartos, dos compases", caption: "Cualquier tonalidad mayor · empieza y termina en la tónica" }, { heading: "Eight quarter notes, two measures", caption: "Any major key · begins and ends on the tonic" }],
  ["tarea-tenor", [95, 97], score("tarea-tenor", { focusVoice: "tenor" }), { heading: "Modo Cuarteto SATB", caption: "Solo el pentagrama de la voz que practicas" }, { heading: "SATB Quartet mode", caption: "Only the staff of the voice you are practicing" }],
  ["tarea-reglas", [98, 100], score("tarea-contralto", { focusVoice: "alto" }), { heading: "Intervalos permitidos", caption: "Reglas del movimiento melódico · sin notas repetidas" }, { heading: "Allowed intervals", caption: "Melodic motion rules · no repeated notes" }],
  ["tarea-tesituras", [101, 101], score("tesituras"), { heading: "Dentro de la tesitura de cada voz" }, { heading: "Within the range of each voice" }],
  ["tesitura-soprano", [102, 102], tesitura("soprano", "Do4 – Sol5", "C4 – G5"), { heading: "Soprano", caption: "Do4 a Sol5" }, { heading: "Soprano", caption: "C4 to G5" }],
  ["tesitura-contralto", [103, 103], tesitura("alto", "Sol3 – Re5", "G3 – D5"), { heading: "Contralto", caption: "Sol3 a Re5" }, { heading: "Alto", caption: "G3 to D5" }],
  ["tesitura-tenor", [104, 104], tesitura("tenor", "Si2 – Sol4", "B2 – G4"), { heading: "Tenor", caption: "Si2 a Sol4" }, { heading: "Tenor", caption: "B2 to G4" }],
  ["tesitura-bajo", [105, 105], tesitura("bass", "Fa2 – Si3", "F2 – B3"), { heading: "Bajo", caption: "Fa2 a Si3" }, { heading: "Bass", caption: "F2 to B3" }],
  ["tarea-exporta", [106, 106], score("tarea-bajo", { focusVoice: "bass" }), { heading: "Exporta cada melodía como MIDI", caption: "Y súbela al Maestro Virtual" }, { heading: "Export each melody as MIDI", caption: "And upload it to the Virtual Teacher" }],
  ["maestro-revisa", [107, 109], title, { heading: "El Maestro Virtual revisa", caption: "Voz y tonalidad · cada intervalo · tesitura · tónica inicial y final" }, { heading: "The Virtual Teacher checks", caption: "Voice and key · every interval · range · opening and closing tonic" }],
  ["recapitulemos", [110, 110], title, { heading: "Recapitulemos" }, { heading: "Let's recap" }],
  ["recap-intervalos", [111, 112], image("intervalos-melodicos"), { heading: "Intervalos permitidos" }, { heading: "Allowed intervals" }],
  ["recap-disminuidos", [113, 113], image("disminuidos"), { heading: "Disminuidos: se compensan" }, { heading: "Diminished: compensated" }],
  ["recap-saltos", [114, 114], image("saltos-sucesivos"), { heading: "Sensible y saltos sucesivos" }, { heading: "Leading tone and successive leaps" }],
  ["recap-armonicos", [115, 115], image("paralelas"), { heading: "Entre dos voces" }, { heading: "Between two voices" }],
  ["cierre", [116, 117], title, { heading: "Gracias", caption: "Nos vemos en la lección 8" }, { heading: "Thank you", caption: "See you in lesson 8" }],
];

// ── Build ────────────────────────────────────────────────────────────────────────────────────────
const resolveText = (value, lang) => (value && typeof value === "object" && "es" in value && "en" in value ? value[lang] : value);
const localize = (items, lang) => items?.map(item => ({ ...item, ...(item.label ? { label: resolveText(item.label, lang) } : {}) }));
const PROJECT_TITLES_EN = {
  "Intervalos melódicos permitidos": "Allowed melodic intervals", "La sensible en Do mayor": "The leading tone in C major",
  "Quinta disminuida en Do mayor": "Diminished fifth in C major", "Saltos sucesivos": "Successive leaps",
  "Octavas paralelas": "Parallel octaves", "Quintas paralelas": "Parallel fifths", "Octavas contrarias": "Contrary octaves",
  "Unísonos paralelos": "Parallel unisons", "Quintas paralelas no justas": "Parallel fifths that are not perfect",
  "Quintas contrarias": "Contrary fifths", "Saltos simultáneos": "Simultaneous leaps", "Enlace IV – V en Do mayor": "IV – V connection in C major",
  "Soprano en Do mayor": "Soprano in C major", "Contralto en Sol mayor": "Alto in G major", "Tenor en Re mayor": "Tenor in D major",
  "Bajo en Si♭ mayor": "Bass in B♭ major", Tesituras: "Ranges",
};

for (const lang of ["es", "en"]) {
  const dir = `content/storyboards/${lang}`;
  const lines = readFileSync(`${dir}/${LESSON}.guion.txt`, "utf8").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  let expected = 1;
  const stills = STILLS.map(([id, [from, to], visual, es, en]) => {
    if (from !== expected || to < from) throw new Error(`${id}: clips ${from}-${to}, se esperaba empezar en ${expected}`);
    expected = to + 1;
    const still = { id, ...visual, ...(lang === "es" ? es : en), narration: lines.slice(from - 1, to).join(" ") };
    if (typeof visual.image === "function") still.image = visual.image(lang);
    if (visual.highlights) still.highlights = localize(visual.highlights, lang);
    if (visual.marks) still.marks = localize(visual.marks, lang);
    if (visual.project) still.showCiphers = true;
    return still;
  });
  if (expected - 1 !== lines.length) throw new Error(`${lang}: los stills cubren ${expected - 1} de ${lines.length} frases`);
  const localizedProjects = Object.fromEntries(Object.entries(projects).map(([key, p]) => {
    const t = lang === "es" ? p.setup.title : PROJECT_TITLES_EN[p.setup.title];
    if (!t) throw new Error(`Falta el título en inglés de ${p.setup.title}`);
    return [key, { ...p, setup: { ...p.setup, title: t } }];
  }));
  const titles = { es: "Lección 7 — Movimientos melódicos y armónicos", en: "Lesson 7 — Melodic and Harmonic Motion" };
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
