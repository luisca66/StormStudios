// Generates the Lesson 9 storyboards and audio maps (ES and EN) from the sentence-per-line scripts.
// Usage: node scripts/sequencer/generar-storyboard-leccion-9.mjs
//
// Each line of content/storyboards/<locale>/10-leccion-9.guion.txt is one ElevenLabs clip.
// Every still declares the clip range it covers, so narration, audio map and subtitles come from
// the same data and cannot drift. Both locales share projects, music, reveals and highlights.
// Every cadence respects the Lesson 6 construction rules and the Lesson 7–8 melodic and harmonic
// rules (checked by hand by Claude); the four task-format cadences match
// test-midis/Leccion_9_cadencias_correcta.mid, which gives 100/100 in the Lesson 9 validator.
import { readFileSync, writeFileSync } from "node:fs";

const LESSON = "10-leccion-9";

// ── Music ────────────────────────────────────────────────────────────────────────────────────────
const VOICES = ["soprano", "alto", "tenor", "bass"];
const satbSetup = (title, measures, key, time = [4, 4], tempo = 60) => ({ mode: "satb", title, key, time, measures, tempo });
/** measures: [[[S, A, T, B] | "rest", value], ...] per measure; value is a text duration ("mitad", "negra", "entera", "mitad puntillo"). */
const write = measures => VOICES.map((voice, v) =>
  `voz ${voice}\n` + measures.map((events, i) => `compas ${i + 1}\n` +
    events.map(([chord, value]) => `${chord === "rest" ? "silencio" : chord[v]} ${value}`).join("; ")).join("\n")).join("\n");
const roman = (measure, beat, text) => ({ measure, beat, text, kind: "roman" });
const project = (title, key, measures, ciphers, time) =>
  ({ setup: satbSetup(title, measures.length, key, time), text: write(measures), annotations: ciphers.map(([m, b, t]) => roman(m, b, t)) });

// Chords as [S, A, T, B], scientific octave (C4 = middle C).
const G = { V: ["F#4", "D4", "A3", "D3"], I: ["G4", "D4", "B3", "G2"] };
const Bb = { IV: ["G4", "Eb4", "Bb3", "Eb3"], I: ["F4", "D4", "Bb3", "Bb2"] };
const D = { II6: ["E5", "B4", "E4", "G3"], V: ["C#5", "A4", "E4", "A3"], I: ["D5", "A4", "F#4", "D3"] };
const Eb = { IV: ["C5", "Ab4", "Eb4", "Ab2"], I64: ["Bb4", "G4", "Eb4", "Bb2"], V: ["Bb4", "F4", "D4", "Bb2"], I: ["G4", "Eb4", "Bb3", "Eb3"] };
// Strong-beat schemes (Medrano p. 20): 2/4 in F, 3/4 in A, 4/4 in D, and the 3/4 exception in B♭.
const F24 = { IV: ["D5", "Bb4", "F4", "Bb2"], I64: ["C5", "A4", "F4", "C3"], V: ["C5", "G4", "E4", "C3"], I: ["C5", "A4", "F4", "F2"] };
const A34 = { IV: ["F#4", "D4", "A3", "D3"], I64: ["E4", "C#4", "A3", "E3"], V: ["E4", "B3", "G#3", "E3"], I: ["E4", "C#4", "A3", "A2"] };
const D44 = { IV: ["B4", "G4", "D4", "G2"], I64: ["A4", "F#4", "D4", "A2"], V: ["A4", "E4", "C#4", "A2"], I: ["A4", "F#4", "D4", "D3"] };
const Bb34 = { II6: ["C5", "G4", "C4", "Eb3"], I64: ["Bb4", "F4", "D4", "F3"], V: ["A4", "F4", "C4", "F3"], I: ["Bb4", "F4", "D4", "Bb2"] };

const projects = {
  autentica: project("Cadencia auténtica en Sol mayor", "G", [[[G.V, "mitad"], [G.I, "mitad"]]], [[1, 1, "V"], [1, 3, "I"]]),
  plagal: project("Cadencia plagal en Si♭ mayor", "Bb", [[[Bb.IV, "mitad"], [Bb.I, "mitad"]]], [[1, 1, "IV"], [1, 3, "I"]]),
  completa: project("Cadencia completa en Re mayor", "D", [[[D.II6, "mitad"], [D.V, "mitad"]], [[D.I, "entera"]]],
    [[1, 1, "II 6/3"], [1, 3, "V"], [2, 1, "I"]]),
  ampliada: project("Cadencia ampliada en Mi♭ mayor", "Eb", [[[Eb.IV, "mitad"], [Eb.I64, "mitad"]], [[Eb.V, "mitad"], [Eb.I, "mitad"]]],
    [[1, 1, "IV"], [1, 3, "I 6/4"], [2, 1, "V"], [2, 3, "I"]]),
  "pulso-24": project("Ampliada en 2/4 (Fa mayor)", "F", [[[F24.IV, "mitad"]], [[F24.I64, "negra"], [F24.V, "negra"]], [[F24.I, "mitad"]]],
    [[1, 1, "IV"], [2, 1, "I 6/4"], [2, 2, "V"], [3, 1, "I"]], [2, 4]),
  "pulso-34": project("Ampliada en 3/4 (La mayor)", "A", [[[A34.IV, "mitad puntillo"]], [[A34.I64, "negra"], [A34.V, "mitad"]], [[A34.I, "mitad puntillo"]]],
    [[1, 1, "IV"], [2, 1, "I 6/4"], [2, 2, "V"], [3, 1, "I"]], [3, 4]),
  "pulso-44": project("Ampliada en 4/4 (Re mayor)", "D", [[[D44.IV, "entera"]], [[D44.I64, "mitad"], [D44.V, "mitad"]], [[D44.I, "entera"]]],
    [[1, 1, "IV"], [2, 1, "I 6/4"], [2, 3, "V"], [3, 1, "I"]]),
  excepcion: project("Excepción en 3/4 (Si♭ mayor)", "Bb", [[[Bb34.II6, "negra"], [Bb34.I64, "negra"], [Bb34.V, "negra"]], [[Bb34.I, "mitad puntillo"]]],
    [[1, 1, "II 6/3"], [1, 2, "I 6/4"], [1, 3, "V"], [2, 1, "I"]], [3, 4]),
  // Half cadences: the connections already checked in Lesson 8, now as points of rest.
  "semi-v": project("Semicadencia a la dominante (Re mayor)", "D", [[[["D5", "B4", "G4", "G2"], "mitad"], [["C#5", "A4", "E4", "A2"], "mitad"]]], [[1, 1, "IV"], [1, 3, "V"]]),
  "semi-v64": project("Semicadencia a la dominante con I 6/4 (Mi♭ mayor)", "Eb", [[[Eb.IV, "mitad"], [Eb.I64, "mitad"]], [[Eb.V, "mitad"], ["rest", "mitad"]]],
    [[1, 1, "IV"], [1, 3, "I 6/4"], [2, 1, "V"]]),
  "semi-iv": project("Semicadencia a la subdominante (Sol mayor)", "G", [[[["B4", "G4", "D4", "G3"], "mitad"], [["C5", "G4", "E4", "C3"], "mitad"]]], [[1, 1, "I"], [1, 3, "IV"]]),
  "semi-vi": project("Semicadencia al sexto grado (La mayor)", "A", [[[["G#4", "E4", "B3", "E3"], "mitad"], [["A4", "C#4", "A3", "F#3"], "mitad"]]], [[1, 1, "V"], [1, 3, "VI"]]),
};

const L = (es, en) => ({ es, en });
const title = { kind: "title" };
const image = name => ({ kind: "image", image: lang => `/images/curso/leccion-9/${name}-${lang}.svg` });
const score = (p, extra = {}) => ({ project: p, ...extra });
const listen = (p, extra = {}) => score(p, { audio: true, cursor: { measure: extra.measures?.[0] ?? 1, beat: 1 }, ...extra });
const hl = (measure, color, label, extra = {}) => ({ measure, color, label, ...extra });
const vox = (voice, color, label, measure = 1) => ({ measure, voice, color, label });
const ok = "green", amber = "amber";

// ── Stills: [id, [firstClip, lastClip], visual, es text, en text] ──────────────────────────────────
const STILLS = [
  ["titulo", [1, 2], title, { heading: "Cadencias", caption: "Lección 9 · Curso de Armonía · Storm Studios Learning" }, { heading: "Cadences", caption: "Lesson 9 · Harmony Course · Storm Studios Learning" }],
  ["final-frase", [3, 3], listen("autentica"), { heading: "Cómo termina una frase musical" }, { heading: "How a musical phrase ends" }],
  ["tres-partes", [4, 5], title, { heading: "Tres partes", caption: "Qué es una cadencia · los cuatro tipos · las semicadencias" }, { heading: "Three parts", caption: "What a cadence is · the four types · half cadences" }],
  ["que-es", [6, 7], title, { heading: "¿Qué es una cadencia?", caption: "Una sucesión de acordes con intención conclusiva" }, { heading: "What is a cadence?", caption: "A succession of chords with a conclusive intention" }],
  ["regiones", [8, 10], image("regiones"), { heading: "Hacia regiones cada vez más importantes", caption: "Subdominante → dominante → tónica" }, { heading: "Toward more and more important regions", caption: "Subdominant → dominant → tonic" }],
  ["dos-ultimos", [11, 12], score("completa", { highlights: [hl(1, amber, L("V fund.", "V root"), { beat: 3, endBeat: 5 }), hl(2, amber, L("I fund.", "I root"))] }), { heading: "Los dos últimos acordes, en estado fundamental", caption: "Le dan firmeza al final" }, { heading: "The last two chords, in root position", caption: "They give the ending its firmness" }],
  ["cuatro-tipos", [13, 13], image("tipos-cadencia"), { heading: "Los cuatro tipos de cadencia" }, { heading: "The four types of cadence" }],
  ["autentica", [14, 15], score("autentica", { highlights: [hl(1, ok, "V → I")] }), { heading: "1 · Cadencia auténtica", caption: "Del quinto grado al primero" }, { heading: "1 · Authentic cadence", caption: "From the fifth degree to the first" }],
  ["autentica-escucha", [16, 16], listen("autentica", { highlights: [vox("soprano", amber, L("Fa♯ → Sol", "F♯ → G"))] }), { heading: "Auténtica en Sol mayor", caption: "La sensible sube a la tónica" }, { heading: "Authentic cadence in G major", caption: "The leading tone rises to the tonic" }],
  ["plagal", [17, 19], score("plagal", { highlights: [hl(1, ok, "IV → I")] }), { heading: "2 · Cadencia plagal", caption: "Del cuarto grado al primero · sin pasar por la dominante" }, { heading: "2 · Plagal cadence", caption: "From the fourth degree to the first · without the dominant" }],
  ["plagal-escucha", [20, 20], listen("plagal", { highlights: [vox("tenor", ok, L("Si♭ común", "common B♭"))] }), { heading: "Plagal en Si♭ mayor" }, { heading: "Plagal cadence in B♭ major" }],
  ["completa", [21, 22], image("tipos-cadencia"), { heading: "3 · Cadencia completa", caption: "Subdominante → dominante → tónica" }, { heading: "3 · Complete cadence", caption: "Subdominant → dominant → tonic" }],
  ["completa-estados", [23, 24], score("completa", { highlights: [hl(1, ok, L("II 6/3 → V", "II 6/3 → V")), hl(2, amber, L("I fund.", "I root"))] }), { heading: "IV o II: fundamental o seis tres", caption: "V y I en estado fundamental" }, { heading: "IV or II: root position or six three", caption: "V and I in root position" }],
  ["completa-escucha", [25, 25], listen("completa", { measures: [1, 2] }), { heading: "Completa en Re mayor", caption: "Con el segundo grado en seis tres" }, { heading: "Complete cadence in D major", caption: "With the second degree in six three" }],
  ["ampliada", [26, 27], score("ampliada"), { heading: "4 · Cadencia ampliada", caption: "Empieza con IV o II · fundamental o seis tres" }, { heading: "4 · Extended cadence", caption: "It begins with IV or II · root position or six three" }],
  ["seis-cuatro", [28, 30], score("ampliada", { highlights: [hl(1, amber, "I 6/4", { beat: 3, endBeat: 5 })] }), { heading: "Un acorde nuevo: el I 6/4", caption: "Primer caso específico del seis cuatro" }, { heading: "A new chord: I 6/4", caption: "The first specific case of the six four" }],
  ["mismo-bajo", [31, 32], score("ampliada", { highlights: [{ measure: 1, beat: 3, endMeasure: 2, endBeat: 3, voice: "bass", color: amber, label: L("I 6/4 y V: el mismo Si♭", "I 6/4 and V: the same B♭") }] }), { heading: "El mismo bajo que el V", caption: "Un adorno que retrasa la dominante" }, { heading: "The same bass as V", caption: "An ornament that delays the dominant" }],
  ["pulso-fuerte", [33, 33], title, { heading: "El I 6/4 va en pulso fuerte" }, { heading: "I 6/4 goes on a strong beat" }],
  ["pulso-24", [34, 34], score("pulso-24", { highlights: [hl(2, amber, L("I 6/4: tiempo 1", "I 6/4: beat 1"), { beat: 1, endBeat: 2 })] }), { heading: "En 2/4: primer tiempo" }, { heading: "In 2/4: first beat" }],
  ["pulso-34", [35, 35], score("pulso-34", { highlights: [hl(2, amber, L("I 6/4: tiempo 1", "I 6/4: beat 1"), { beat: 1, endBeat: 2 })] }), { heading: "En 3/4: primer tiempo" }, { heading: "In 3/4: first beat" }],
  ["pulso-44", [36, 36], score("pulso-44", { highlights: [hl(2, amber, L("I 6/4: tiempo 1", "I 6/4: beat 1"), { beat: 1, endBeat: 3 })] }), { heading: "En 4/4: primero o tercer tiempo", caption: "Aquí en el primero; en la tarea, en el tercero" }, { heading: "In 4/4: first or third beat", caption: "Here on the first; in the assignment, on the third" }],
  ["duracion", [37, 37], score("pulso-34"), { heading: "Después llega el V", caption: "Siempre antes del I final" }, { heading: "Then comes V", caption: "Always before the final I" }],
  ["excepcion", [38, 38], score("excepcion", { highlights: [hl(1, amber, L("I 6/4 en el tiempo 2", "I 6/4 on beat 2"), { beat: 2, endBeat: 3 })] }), { heading: "La única excepción", caption: "En 3/4: I 6/4 en el segundo tiempo, V en el tercero" }, { heading: "The only exception", caption: "In 3/4: I 6/4 on the second beat, V on the third" }],
  ["ampliada-escucha", [39, 40], listen("ampliada", { measures: [1, 2] }), { heading: "Ampliada en Mi♭ mayor", caption: "IV → I 6/4 (pulso fuerte) → V → I" }, { heading: "Extended cadence in E♭ major", caption: "IV → I 6/4 (strong beat) → V → I" }],
  ["resumen", [41, 45], image("tipos-cadencia"), { heading: "Los cuatro tipos" }, { heading: "The four types" }],
  ["semicadencias", [46, 46], title, { heading: "Semicadencias" }, { heading: "Half cadences" }],
  ["reposo", [47, 49], title, { heading: "Un reposo parcial", caption: "Como respirar para el coro · al final de una frase del texto" }, { heading: "A partial rest", caption: "Like breathing for the choir · at the end of a phrase of the text" }],
  ["sin-tecnica", [50, 50], title, { heading: "Después del reposo, sin técnica de enlace", caption: "La música vuelve a empezar" }, { heading: "After the rest, no connection technique", caption: "The music starts again" }],
  ["semi-v", [51, 52], listen("semi-v", { highlights: [hl(1, ok, L("reposo en V", "rest on V"))] }), { heading: "Semicadencia a la dominante", caption: "Desde I, II, IV o VI" }, { heading: "Half cadence on the dominant", caption: "From I, II, IV or VI" }],
  ["semi-v64", [53, 53], listen("semi-v64", { measures: [1, 2], highlights: [hl(2, ok, L("reposo en V", "rest on V"))] }), { heading: "También pasando por el I 6/4", caption: "Desde II o IV" }, { heading: "Also through I 6/4", caption: "From II or IV" }],
  ["semi-iv", [54, 54], listen("semi-iv", { highlights: [hl(1, ok, L("reposo en IV", "rest on IV"))] }), { heading: "Semicadencia a la subdominante", caption: "Del I al IV" }, { heading: "Half cadence on the subdominant", caption: "From I to IV" }],
  ["semi-vi", [55, 55], listen("semi-vi", { highlights: [hl(1, ok, L("reposo en VI", "rest on VI"))] }), { heading: "Semicadencia al sexto grado", caption: "Desde III, V o VII 6/3" }, { heading: "Half cadence on the sixth degree", caption: "From III, V or VII 6/3" }],
  ["rota", [56, 57], title, { heading: "¿«Cadencia rota»?", caption: "Más preciso: semicadencia al sexto grado" }, { heading: "A «deceptive cadence»?", caption: "More precise: half cadence on the sixth degree" }],
  ["bach", [58, 58], title, { heading: "Excepcionalmente: semicadencia al I", caption: "En algunos corales de Bach" }, { heading: "Exceptionally: a half cadence on I", caption: "In some of Bach's chorales" }],
  ["tarea", [59, 59], title, { heading: "Tarea para el Maestro Virtual" }, { heading: "Assignment for the Virtual Teacher" }],
  ["tarea-tipos", [60, 61], title, { heading: "Una cadencia de cada tipo, en el orden que quieras", caption: "Auténtica · plagal · completa · ampliada · SATB en 4/4" }, { heading: "One cadence of each type, in any order", caption: "Authentic · plagal · complete · extended · SATB in 4/4" }],
  ["tarea-formato", [62, 65], score("ampliada"), { heading: "Una tonalidad mayor distinta por cadencia", caption: "Armadura al inicio · compás nuevo · blancas · 11 acordes" }, { heading: "A different major key for each cadence", caption: "Key signature at the start · new measure · half notes · 11 chords" }],
  ["tarea-exporta", [66, 66], title, { heading: "Exporta el MIDI y súbelo" }, { heading: "Export the MIDI and upload it" }],
  ["maestro-revisa", [67, 70], title, { heading: "El Maestro Virtual revisa", caption: "Tonalidad y tipo · acordes · estados · I 6/4 en pulso fuerte · cada voz · 5as y 8as · sensible" }, { heading: "The Virtual Teacher checks", caption: "Key and type · chords · inversions · I 6/4 on a strong beat · each voice · 5ths and octaves · leading tone" }],
  ["recapitulemos", [71, 71], title, { heading: "Recapitulemos" }, { heading: "Let's recap" }],
  ["recap-definicion", [72, 73], image("regiones"), { heading: "Intención conclusiva", caption: "Los dos últimos acordes, en estado fundamental" }, { heading: "Conclusive intention", caption: "The last two chords, in root position" }],
  ["recap-tipos", [74, 75], image("tipos-cadencia"), { heading: "Cuatro tipos", caption: "En la ampliada, el I 6/4 en pulso fuerte" }, { heading: "Four types", caption: "In the extended cadence, I 6/4 on a strong beat" }],
  ["recap-semi", [76, 76], title, { heading: "Semicadencias", caption: "A la dominante · a la subdominante · al sexto grado" }, { heading: "Half cadences", caption: "On the dominant · on the subdominant · on the sixth degree" }],
  ["proxima", [77, 77], title, { heading: "Próxima lección", caption: "El modo menor y sus casos especiales" }, { heading: "Next lesson", caption: "The minor mode and its special cases" }],
  ["cierre", [78, 79], title, { heading: "Gracias", caption: "Nos vemos en la lección 10" }, { heading: "Thank you", caption: "See you in lesson 10" }],
];

// ── Build ────────────────────────────────────────────────────────────────────────────────────────
const resolveText = (value, lang) => (value && typeof value === "object" && "es" in value && "en" in value ? value[lang] : value);
const localize = (items, lang) => items?.map(item => ({ ...item, ...(item.label !== undefined ? { label: resolveText(item.label, lang) } : {}) }));
const PROJECT_TITLES_EN = {
  "Cadencia auténtica en Sol mayor": "Authentic cadence in G major", "Cadencia plagal en Si♭ mayor": "Plagal cadence in B♭ major",
  "Cadencia completa en Re mayor": "Complete cadence in D major", "Cadencia ampliada en Mi♭ mayor": "Extended cadence in E♭ major",
  "Ampliada en 2/4 (Fa mayor)": "Extended in 2/4 (F major)", "Ampliada en 3/4 (La mayor)": "Extended in 3/4 (A major)",
  "Ampliada en 4/4 (Re mayor)": "Extended in 4/4 (D major)", "Excepción en 3/4 (Si♭ mayor)": "Exception in 3/4 (B♭ major)",
  "Semicadencia a la dominante (Re mayor)": "Half cadence on the dominant (D major)",
  "Semicadencia a la dominante con I 6/4 (Mi♭ mayor)": "Half cadence on the dominant through I 6/4 (E♭ major)",
  "Semicadencia a la subdominante (Sol mayor)": "Half cadence on the subdominant (G major)",
  "Semicadencia al sexto grado (La mayor)": "Half cadence on the sixth degree (A major)",
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
    if (visual.project) still.showCiphers = true;
    return still;
  });
  if (expected - 1 !== lines.length) throw new Error(`${lang}: los stills cubren ${expected - 1} de ${lines.length} frases`);
  const localizedProjects = Object.fromEntries(Object.entries(projects).map(([key, p]) => {
    const t = lang === "es" ? p.setup.title : PROJECT_TITLES_EN[p.setup.title];
    if (!t) throw new Error(`Falta el título en inglés de ${p.setup.title}`);
    return [key, { ...p, setup: { ...p.setup, title: t } }];
  }));
  const titles = { es: "Lección 9 — Cadencias", en: "Lesson 9 — Cadences" };
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
