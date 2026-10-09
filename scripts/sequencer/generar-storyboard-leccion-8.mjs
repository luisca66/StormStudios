// Generates the Lesson 8 storyboards and audio maps (ES and EN) from the sentence-per-line scripts.
// Usage: node scripts/sequencer/generar-storyboard-leccion-8.mjs
//
// Each line of content/storyboards/<locale>/09-leccion-8.guion.txt is one ElevenLabs clip.
// Every still declares the clip range it covers, so narration, audio map and subtitles come from
// the same data and cannot drift. Both locales share projects, music, reveals and highlights.
// Every "correct" connection respects the Lesson 6 construction rules and the Lesson 7 melodic and
// harmonic rules, and gives 100/100 in the Lesson 8 validator (test-midis/Leccion_8_tonalidades_variadas_correcta.mid).
import { readFileSync, writeFileSync } from "node:fs";

const LESSON = "09-leccion-8";
const IMG = "/images/curso/leccion-8";

// ── Music ────────────────────────────────────────────────────────────────────────────────────────
const VOICES = ["soprano", "alto", "tenor", "bass"];
const satbSetup = (title, measures, key = "C", tempo = 60) => ({ mode: "satb", title, key, time: [4, 4], measures, tempo });
/** SATB with one whole note per measure: chords [S, A, T, B]. */
const wholes = chords => VOICES.map((voice, v) =>
  `voz ${voice}\n` + chords.map((c, i) => `compas ${i + 1}\n${c[v]} entera`).join("\n")).join("\n");
/** SATB with two half notes per measure: each measure is a connection [[S, A, T, B], [S, A, T, B]]. */
const links = measures => VOICES.map((voice, v) =>
  `voz ${voice}\n` + measures.map(([a, b], i) => `compas ${i + 1}\n${a[v]} mitad; ${b[v]} mitad`).join("\n")).join("\n");
const roman = (measure, beat, text) => ({ measure, beat, text, kind: "roman" });
/** Cipher pairs, one per measure. */
const ciphers = pairs => pairs.flatMap(([a, b], i) => [roman(i + 1, 1, a), roman(i + 1, 3, b)]);
const link = (title, key, from, to, a, b) => ({ setup: satbSetup(title, 1, key), text: links([[from, to]]), annotations: ciphers([[a, b]]) });

const MATERIAL = [
  ["C5", "G4", "E4", "C3", "I"], ["C5", "G4", "C4", "E3", "I 6/3"], ["D5", "A4", "F4", "D3", "II"], ["D5", "A4", "D4", "F3", "II 6/3"],
  ["E5", "B4", "G4", "E3", "III"], ["C5", "A4", "F4", "F3", "IV"], ["C5", "F4", "C4", "A3", "IV 6/3"], ["D5", "B4", "G4", "G3", "V"],
  ["D5", "G4", "D4", "B2", "V 6/3"], ["C5", "A4", "E4", "A3", "VI"], ["B4", "F4", "D4", "D3", "VII 6/3"],
];

const projects = {
  material: { setup: satbSetup("Material armónico en Do mayor", MATERIAL.length), text: wholes(MATERIAL), annotations: MATERIAL.map((c, i) => roman(i + 1, 1, c[4])) },
  repetir: { setup: satbSetup("Repetir el acorde", 1), text: links([[["C5", "G4", "E4", "C3"], ["G4", "E4", "C4", "E3"]]]), annotations: ciphers([["I", "I 6/3"]]) },
  ej1: link("I – IV en Sol mayor", "G", ["B4", "G4", "D4", "G3"], ["C5", "G4", "E4", "C3"], "I", "IV"),
  ej2: link("IV – V en Re mayor", "D", ["D5", "B4", "G4", "G2"], ["C#5", "A4", "E4", "A2"], "IV", "V"),
  ej3: link("V – I en Fa mayor", "F", ["E5", "G4", "C4", "C3"], ["F5", "A4", "C4", "F2"], "V", "I"),
  ej4: link("II – V en Si♭ mayor", "Bb", ["C5", "G4", "Eb4", "C3"], ["C5", "A4", "F4", "F2"], "II", "V"),
  ej5: link("V – VI en La mayor", "A", ["G#4", "E4", "B3", "E3"], ["A4", "C#4", "A3", "F#3"], "V", "VI"),
  ej6: link("VI – II en Mi♭ mayor", "Eb", ["G4", "Eb4", "C4", "C3"], ["Ab4", "F4", "C4", "F2"], "VI", "II"),
  ej7: link("I – VII 6/3 en Do mayor", "C", ["C5", "G4", "E4", "C3"], ["B4", "F4", "D4", "D3"], "I", "VII 6/3"),
  ej8: link("IV 6/3 – V en Mi mayor", "E", ["A4", "E4", "A3", "C#3"], ["B4", "D#4", "F#3", "B2"], "IV 6/3", "V"),
  // Typical mistakes in C major: measure 1 wrong, measure 2 correct.
  "error-paralelas": { setup: satbSetup("IV – V: quintas y octavas paralelas", 2),
    text: links([[["C5", "A4", "F4", "F3"], ["D5", "B4", "G4", "G3"]], [["C5", "A4", "F4", "F3"], ["B4", "G4", "D4", "G3"]]]),
    annotations: ciphers([["IV", "V"], ["IV", "V"]]) },
  "error-sensible": { setup: satbSetup("V – I: la sensible en la soprano", 2),
    text: links([[["B4", "G4", "D4", "G3"], ["G4", "E4", "C4", "C3"]], [["B4", "G4", "D4", "G3"], ["C5", "G4", "E4", "C3"]]]),
    annotations: ciphers([["V", "I"], ["V", "I"]]) },
};

const L = (es, en) => ({ es, en });
const title = { kind: "title" };
const image = (name, lesson = "leccion-8") => ({ kind: "image", image: lang => `/images/curso/${lesson}/${name}-${lang}.svg` });
const score = (project, extra = {}) => ({ project, ...extra });
const listen = (project, extra = {}) => score(project, { audio: true, cursor: { measure: extra.measures?.[0] ?? 1, beat: 1 }, ...extra });
const hl = (measure, color, label, extra = {}) => ({ measure, color, label, ...extra });
/** One voice across both halves of a connection measure. */
const vox = (voice, color, label, measure = 1) => ({ measure, voice, color, label });
const ok = "green", no = "rose", amber = "amber";
const mat = (to, marks = []) => score("material", { reveal: to ? { measure: to } : undefined, highlights: marks });

// ── Stills: [id, [firstClip, lastClip], visual, es text, en text] ──────────────────────────────────
const STILLS = [
  ["titulo", [1, 3], title, { heading: "Material armónico y enlaces", caption: "Lección 8 · Curso de Armonía · Storm Studios Learning" }, { heading: "Harmonic Material and Chord Connections", caption: "Lesson 8 · Harmony Course · Storm Studios Learning" }],
  ["enlazar", [4, 5], listen("ej1"), { heading: "Enlazar dos acordes", caption: "El último paso antes del primer coral" }, { heading: "Connecting two chords", caption: "The last step before the first chorale" }],
  ["tres-partes", [6, 6], title, { heading: "Tres partes", caption: "Material armónico · tabla general de enlaces · técnica de enlace" }, { heading: "Three parts", caption: "Harmonic material · general table of connections · connection technique" }],
  ["material", [7, 7], title, { heading: "Material armónico" }, { heading: "Harmonic material" }],
  ["material-figura", [8, 9], image("material-armonico"), { heading: "Los acordes que usamos, y en qué estado", caption: "Corales de Bach · acordes de quinta · modo mayor" }, { heading: "The chords we use, and in which position", caption: "Bach chorales · triads · major mode" }],
  ["mat-i", [10, 10], mat(3, [hl(1, ok, "I"), hl(2, ok, "I 6/3")]), { heading: "Primer grado", caption: "Fundamental y seis tres" }, { heading: "First degree", caption: "Root position and six three" }],
  ["mat-ii", [11, 11], mat(5, [hl(3, ok, "II"), hl(4, ok, "II 6/3")]), { heading: "Segundo grado", caption: "Fundamental y seis tres" }, { heading: "Second degree", caption: "Root position and six three" }],
  ["mat-iii", [12, 12], mat(6, [hl(5, amber, L("solo fund.", "root only"))]), { heading: "Tercer grado", caption: "Solo en estado fundamental" }, { heading: "Third degree", caption: "Root position only" }],
  ["mat-iv-v", [13, 13], mat(10, [hl(6, ok, "IV"), hl(7, ok, "IV 6/3"), hl(8, ok, "V"), hl(9, ok, "V 6/3")]), { heading: "Cuarto y quinto grado", caption: "Fundamental y seis tres" }, { heading: "Fourth and fifth degrees", caption: "Root position and six three" }],
  ["mat-vi", [14, 14], mat(11, [hl(10, amber, L("solo fund.", "root only"))]), { heading: "Sexto grado", caption: "Solo en estado fundamental" }, { heading: "Sixth degree", caption: "Root position only" }],
  ["mat-vii", [15, 15], mat(null, [hl(11, amber, L("solo 6/3", "6/3 only"))]), { heading: "Séptimo grado", caption: "Solo en seis tres" }, { heading: "Seventh degree", caption: "Six three only" }],
  ["tres-cosas", [16, 16], listen("material"), { heading: "Tres cosas de esta lista" }, { heading: "Three things about this list" }],
  ["seis-cuatro", [17, 19], title, { heading: "Sin seis cuatro libre", caption: "Se forma una cuarta con el bajo · lo veremos en casos específicos" }, { heading: "No free six four", caption: "A fourth forms above the bass · we will see it in specific cases" }],
  ["iii-vi", [20, 21], mat(null, [hl(5, amber, "III"), hl(10, amber, "VI")]), { heading: "III y VI en estado fundamental", caption: "Dos regiones tonales · color modal" }, { heading: "III and VI in root position", caption: "Two tonal regions · modal color" }],
  ["vii", [22, 23], mat(null, [hl(11, amber, L("disminuido", "diminished"))]), { heading: "VII solo en seis tres", caption: "Sin quinta disminuida con el bajo" }, { heading: "VII only in six three", caption: "No diminished fifth above the bass" }],
  ["tabla", [24, 27], image("tabla-enlaces"), { heading: "Tabla general de enlaces", caption: "(6/3): fundamental o seis tres" }, { heading: "General table of connections", caption: "(6/3): root position or six three" }],
  ["tabla-i", [28, 30], image("tabla-enlaces"), { heading: "Del primer grado", caption: "I → III obliga a seguir a IV" }, { heading: "From the first degree", caption: "I → III must continue to IV" }],
  ["tabla-ii", [31, 32], image("tabla-enlaces"), { heading: "Del segundo grado", caption: "II → IV obliga a seguir a V" }, { heading: "From the second degree", caption: "II → IV must continue to V" }],
  ["tabla-iii", [33, 34], image("tabla-enlaces"), { heading: "Del tercer grado", caption: "III → V obliga a seguir a VI" }, { heading: "From the third degree", caption: "III → V must continue to VI" }],
  ["tabla-iv", [35, 35], image("tabla-enlaces"), { heading: "Del cuarto grado" }, { heading: "From the fourth degree" }],
  ["tabla-v", [36, 37], image("tabla-enlaces"), { heading: "Del quinto grado", caption: "V → VII 6/3 obliga a seguir a I" }, { heading: "From the fifth degree", caption: "V → VII 6/3 must continue to I" }],
  ["tabla-v-iv", [38, 38], image("tabla-enlaces"), { heading: "Caso especial", caption: "V fundamental → IV 6/3" }, { heading: "Special case", caption: "V in root position → IV 6/3" }],
  ["tabla-vi", [39, 40], image("tabla-enlaces"), { heading: "Del sexto grado", caption: "VI → I obliga a seguir a II" }, { heading: "From the sixth degree", caption: "VI → I must continue to II" }],
  ["tabla-vii", [41, 41], image("tabla-enlaces"), { heading: "Del séptimo grado en seis tres" }, { heading: "From the seventh degree in six three" }],
  ["obligatorias", [42, 43], title, { heading: "Continuaciones obligatorias", caption: "No son sugerencias: son reglas" }, { heading: "Required continuations", caption: "They are not suggestions: they are rules" }],
  ["repetir", [44, 45], listen("repetir"), { heading: "Repetir el acorde", caption: "Sin técnica de enlace: las voces se mueven libremente" }, { heading: "Repeating the chord", caption: "No connection technique: the voices move freely" }],
  ["tecnica", [46, 46], title, { heading: "Cómo se enlazan dos acordes" }, { heading: "How two chords are connected" }],
  ["construir", [47, 49], image("tecnica-enlace"), { heading: "Primero, cada acorde bien construido", caption: "Como en la lección 6" }, { heading: "First, each chord well built", caption: "As in lesson 6" }],
  ["cada-voz", [50, 51], score("ej1"), { heading: "Después, cada voz", caption: "Solo intervalos melódicos permitidos" }, { heading: "Then, each voice", caption: "Only allowed melodic intervals" }],
  ["nota-comun", [52, 54], score("ej1", { highlights: [vox("alto", ok, L("nota común", "common tone"))] }), { heading: "La nota común", caption: "Se queda en la misma voz · las demás, por el camino más corto" }, { heading: "The common tone", caption: "It stays in the same voice · the others take the shortest path" }],
  ["seis-pares", [55, 56], score("ej2"), { heading: "Los seis pares de voces", caption: "S–A · S–T · S–B · A–T · A–B · T–B" }, { heading: "The six pairs of voices", caption: "S–A · S–T · S–B · A–T · A–B · T–B" }],
  ["paralelas", [57, 59], image("paralelas", "leccion-7"), { heading: "Sin quintas ni octavas paralelas o contrarias", caption: "Contrarias sí, fuera de soprano y bajo · sin saltos simultáneos" }, { heading: "No parallel or contrary fifths or octaves", caption: "Contrary is fine outside soprano and bass · no simultaneous leaps" }],
  ["sensible", [60, 62], score("ej3", { highlights: [vox("soprano", amber, L("sensible → tónica", "leading tone → tonic"))] }), { heading: "Regla nueva: la sensible en la soprano", caption: "Sube a la tónica · excepción: III – IV" }, { heading: "New rule: the leading tone in the soprano", caption: "It rises to the tonic · exception: III – IV" }],
  ["ocho", [63, 63], title, { heading: "Los ocho enlaces de la tarea", caption: "Cada uno en una tonalidad distinta" }, { heading: "The eight connections in the assignment", caption: "Each one in a different key" }],
  ["ej1", [64, 64], listen("ej1"), { heading: "1 · I – IV en Sol mayor" }, { heading: "1 · I – IV in G major" }],
  ["ej1-voces", [65, 66], score("ej1", { highlights: [vox("alto", ok, L("Sol común", "common G")), vox("bass", amber, L("5ª ↓", "5th ↓"))] }), { heading: "1 · I – IV en Sol mayor", caption: "Sol se queda en la contralto" }, { heading: "1 · I – IV in G major", caption: "G stays in the alto" }],
  ["ej2", [67, 67], listen("ej2"), { heading: "2 · IV – V en Re mayor" }, { heading: "2 · IV – V in D major" }],
  ["ej2-voces", [68, 70], score("ej2", { highlights: [vox("bass", amber, L("sube", "up")), vox("soprano", ok, L("baja", "down")), vox("alto", ok, L("baja", "down")), vox("tenor", ok, L("baja", "down"))] }), { heading: "2 · IV – V en Re mayor", caption: "Sin notas comunes: superiores contra el bajo" }, { heading: "2 · IV – V in D major", caption: "No common tones: upper voices against the bass" }],
  ["ej3", [71, 71], listen("ej3"), { heading: "3 · V – I en Fa mayor" }, { heading: "3 · V – I in F major" }],
  ["ej3-voces", [72, 73], score("ej3", { highlights: [vox("soprano", amber, L("Mi → Fa", "E → F")), vox("tenor", ok, L("Do común", "common C"))] }), { heading: "3 · V – I en Fa mayor", caption: "La sensible sube a la tónica" }, { heading: "3 · V – I in F major", caption: "The leading tone rises to the tonic" }],
  ["ej4", [74, 74], listen("ej4"), { heading: "4 · II – V en Si♭ mayor" }, { heading: "4 · II – V in B♭ major" }],
  ["ej4-voces", [75, 76], score("ej4", { highlights: [vox("soprano", ok, L("Do común", "common C"))] }), { heading: "4 · II – V en Si♭ mayor", caption: "Do se queda en la soprano" }, { heading: "4 · II – V in B♭ major", caption: "C stays in the soprano" }],
  ["ej5", [77, 77], listen("ej5"), { heading: "5 · V – VI en La mayor" }, { heading: "5 · V – VI in A major" }],
  ["ej5-voces", [78, 80], score("ej5", { highlights: [vox("soprano", amber, L("Sol♯ → La", "G♯ → A")), vox("tenor", ok, L("La: 3ª doble", "A: doubled 3rd"))] }), { heading: "5 · V – VI en La mayor", caption: "La sensible sube · en el VI se duplica la tercera" }, { heading: "5 · V – VI in A major", caption: "The leading tone rises · in VI the third is doubled" }],
  ["ej6", [81, 81], listen("ej6"), { heading: "6 · VI – II en Mi♭ mayor" }, { heading: "6 · VI – II in E♭ major" }],
  ["ej6-voces", [82, 83], score("ej6", { highlights: [vox("tenor", ok, L("Do común", "common C"))] }), { heading: "6 · VI – II en Mi♭ mayor", caption: "Do se queda en el tenor" }, { heading: "6 · VI – II in E♭ major", caption: "C stays in the tenor" }],
  ["ej7", [84, 84], listen("ej7"), { heading: "7 · I – VII 6/3 en Do mayor" }, { heading: "7 · I – VII 6/3 in C major" }],
  ["ej7-voces", [85, 87], score("ej7", { highlights: [vox("bass", amber, L("Re: 3ª en el bajo", "D: third in the bass"))] }), { heading: "7 · I – VII 6/3 en Do mayor", caption: "VII completo · Re duplicado · la sensible una sola vez" }, { heading: "7 · I – VII 6/3 in C major", caption: "VII complete · D doubled · the leading tone only once" }],
  ["ej8", [88, 88], listen("ej8"), { heading: "8 · IV 6/3 – V en Mi mayor" }, { heading: "8 · IV 6/3 – V in E major" }],
  ["ej8-voces", [89, 90], score("ej8", { highlights: [vox("bass", amber, L("grado conjunto", "step"))] }), { heading: "8 · IV 6/3 – V en Mi mayor", caption: "El bajo baja por grado conjunto" }, { heading: "8 · IV 6/3 – V in E major", caption: "The bass moves down by step" }],
  ["errores", [91, 91], title, { heading: "Dos errores típicos" }, { heading: "Two typical mistakes" }],
  ["error-paralelas", [92, 93], listen("error-paralelas", { measures: [1, 1], highlights: [vox("soprano", no, L("5ª", "5th")), vox("tenor", no, L("8ª", "8ve")), vox("bass", no, "")] }), { heading: "IV – V con todas las voces hacia arriba", caption: "5as paralelas soprano–bajo · 8as paralelas tenor–bajo" }, { heading: "IV – V with every voice moving up", caption: "Parallel 5ths soprano–bass · parallel octaves tenor–bass" }],
  ["error-paralelas-bien", [94, 94], listen("error-paralelas", { measures: [2, 2], highlights: [hl(2, ok, L("✓ contrario al bajo", "✓ against the bass"))] }), { heading: "Corregido", caption: "Voces superiores en sentido contrario al bajo" }, { heading: "Corrected", caption: "Upper voices in contrary motion to the bass" }],
  ["error-sensible", [95, 95], listen("error-sensible", { measures: [1, 1], highlights: [vox("soprano", no, L("✗ Si → Sol", "✗ B → G"))] }), { heading: "V – I: la sensible baja", caption: "Si → Sol en la soprano" }, { heading: "V – I: the leading tone goes down", caption: "B → G in the soprano" }],
  ["error-sensible-bien", [96, 96], listen("error-sensible", { measures: [2, 2], highlights: [vox("soprano", ok, L("✓ Si → Do", "✓ B → C"), 2)] }), { heading: "Corregido", caption: "La sensible sube al Do" }, { heading: "Corrected", caption: "The leading tone rises to C" }],
  ["tarea", [97, 97], title, { heading: "Tarea para el Maestro Virtual" }, { heading: "Assignment for the Virtual Teacher" }],
  ["tarea-tonalidades", [98, 98], title, { heading: "Una tonalidad mayor distinta por enlace", caption: "Tú escoges cuáles" }, { heading: "A different major key for each connection", caption: "You choose which ones" }],
  ["tarea-enlaces", [99, 101], title, { heading: "Ocho enlaces, en el orden que quieras", caption: "I–IV · IV–V · V–I · II–V · V–VI · VI–II · I–VII 6/3 · IV 6/3–V" }, { heading: "Eight connections, in any order", caption: "I–IV · IV–V · V–I · II–V · V–VI · VI–II · I–VII 6/3 · IV 6/3–V" }],
  ["tarea-compas", [102, 104], score("ej5"), { heading: "Un compás por enlace", caption: "Dos mitades · armadura al inicio de cada compás · 16 acordes" }, { heading: "One measure per connection", caption: "Two half notes · key signature at the start of each measure · 16 chords" }],
  ["tarea-exporta", [105, 105], title, { heading: "Exporta el MIDI y súbelo" }, { heading: "Export the MIDI and upload it" }],
  ["maestro-revisa", [106, 109], title, { heading: "El Maestro Virtual revisa", caption: "Tonalidad y enlace · acordes · cada voz · 5as y 8as · saltos simultáneos · sensible" }, { heading: "The Virtual Teacher checks", caption: "Key and connection · chords · each voice · 5ths and octaves · simultaneous leaps · leading tone" }],
  ["recapitulemos", [110, 110], title, { heading: "Recapitulemos" }, { heading: "Let's recap" }],
  ["recap-material", [111, 112], image("material-armonico"), { heading: "Material armónico" }, { heading: "Harmonic material" }],
  ["recap-tabla", [113, 113], image("tabla-enlaces"), { heading: "Tabla general de enlaces" }, { heading: "General table of connections" }],
  ["recap-tecnica", [114, 115], image("tecnica-enlace"), { heading: "Al enlazar" }, { heading: "When connecting" }],
  ["proxima", [116, 116], title, { heading: "Próxima lección", caption: "El modo menor y sus casos especiales" }, { heading: "Next lesson", caption: "The minor mode and its special cases" }],
  ["cierre", [117, 118], title, { heading: "Gracias", caption: "Nos vemos en la lección 9" }, { heading: "Thank you", caption: "See you in lesson 9" }],
];

// ── Build ────────────────────────────────────────────────────────────────────────────────────────
const resolveText = (value, lang) => (value && typeof value === "object" && "es" in value && "en" in value ? value[lang] : value);
const localize = (items, lang) => items?.map(item => ({ ...item, ...(item.label !== undefined ? { label: resolveText(item.label, lang) } : {}) }));
const PROJECT_TITLES_EN = {
  "Material armónico en Do mayor": "Harmonic material in C major", "Repetir el acorde": "Repeating the chord",
  "I – IV en Sol mayor": "I – IV in G major", "IV – V en Re mayor": "IV – V in D major", "V – I en Fa mayor": "V – I in F major",
  "II – V en Si♭ mayor": "II – V in B♭ major", "V – VI en La mayor": "V – VI in A major", "VI – II en Mi♭ mayor": "VI – II in E♭ major",
  "I – VII 6/3 en Do mayor": "I – VII 6/3 in C major", "IV 6/3 – V en Mi mayor": "IV 6/3 – V in E major",
  "IV – V: quintas y octavas paralelas": "IV – V: parallel fifths and octaves", "V – I: la sensible en la soprano": "V – I: the leading tone in the soprano",
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
    if (visual.reveal === undefined) delete still.reveal;
    if (visual.highlights) still.highlights = localize(visual.highlights, lang);
    if (visual.project) still.showCiphers = true;
    return still;
  });
  if (expected - 1 !== lines.length) throw new Error(`${lang}: los stills cubren ${expected - 1} de ${lines.length} frases`);
  const localizedProjects = Object.fromEntries(Object.entries(projects).map(([key, p]) => {
    const t = lang === "es" ? p.setup.title : PROJECT_TITLES_EN[p.setup.title];
    if (!t) throw new Error(`Falta el título en inglés de ${p.setup.title}`);
    return [key, { ...p, setup: { ...p.setup, title: t } }];
  }));
  const titles = { es: "Lección 8 — Material armónico y enlaces", en: "Lesson 8 — Harmonic Material and Chord Connections" };
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
