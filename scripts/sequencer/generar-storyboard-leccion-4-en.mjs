// Same visual sequence and music as ES, aligned to the English ElevenLabs script.
// Usage: node scripts/sequencer/generar-storyboard-leccion-4-en.mjs <script.docx>
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { docxParagraphs, validateAudioMap } from "./video-utils.mjs";
import { buildAudioMap } from "./mapa-audio.mjs";

const script = path.resolve(process.argv[2] ?? "H:/Website Clases/04 Lección 4/Lesson 4 elevenlabs.docx");
const paragraphs = docxParagraphs(await readFile(script));
if (paragraphs.length !== 137) throw new Error(`Expected 137 English paragraphs, got ${paragraphs.length}`);
const board = JSON.parse(await readFile("content/storyboards/es/05-leccion-4.json", "utf8"));
board.locale = "en";
board.title = "Lesson 4 — Fifth Chords";
board.source = script.replaceAll("\\", "/");

const translations = {
  "Acordes de quinta": "Fifth chords",
  "Lección 4 · Curso de Armonía · Storm Studios Learning": "Lesson 4 · Harmony Course · Storm Studios Learning",
  "¿Qué es un acorde?": "What is a chord?",
  "Toda simultaneidad de sonidos diferentes, dos o más.": "Two or more different notes sounding at the same time.",
  "Ejemplos de acordes": "Examples of chords",
  "Dos, tres o más sonidos diferentes al mismo tiempo": "Two, three or more different notes at the same time",
  "La armonía": "Harmony",
  "Estructura interválica de los acordes y leyes de su enlace": "The intervallic structure of chords and how they connect",
  "Armonías, en plural": "Harmonies, in the plural",
  "Época · género · corriente estilística · compositor": "Historical period · genre · musical style · composer",
  "Construcción de acordes": "Building chords",
  "Fundamental + terceras superpuestas": "Root + stacked thirds",
  "Dos terceras sobre cada grado de las escalas básicas en Do": "Two thirds on each degree of the basic scales in C",
  "Cada nota puede ser fundamental de un acorde": "Every note can be the root of a chord",
  "Acorde de quinta o tríada": "Fifth chord or triad",
  "Mi es la tercera y Sol es la quinta de Do": "E is the third and G is the fifth above C",
  "Acorde mayor": "Major chord",
  "Tercera mayor y quinta justa": "Major third and perfect fifth",
  "Acorde menor": "Minor chord",
  "Tercera menor y quinta justa": "Minor third and perfect fifth",
  "Acorde disminuido": "Diminished chord",
  "Tercera menor y quinta disminuida": "Minor third and diminished fifth",
  "Cada acorde es un grado": "A chord on each degree",
  "I mayor · ii menor · iii menor · IV mayor · V mayor · vi menor · vii° disminuido": "I major · ii minor · iii minor · IV major · V major · vi minor · vii° diminished",
  "El sexto grado desciende: La bemol": "The sixth degree is lowered: A-flat",
  "Tercera mayor y quinta aumentada": "Major third and augmented fifth",
  "Cambió una nota, cambiaron tres acordes": "One note changed, three chords changed",
  "El séptimo grado sube: Si♭ → Si": "The seventh degree is raised: B♭ → B",
  "También sube el sexto grado: La♭ → La": "The sixth degree is also raised: A♭ → A",
  "Al descender: menor natural": "Descending: natural minor",
  "Recuperamos Si♭ y La♭": "Return to B♭ and A♭",
  "Los cuatro tipos de acordes de quinta": "The four types of fifth chords",
  "Cada grado, una fundamental": "Each degree becomes a root",
  "Superponemos terceras respetando las notas de la escala": "Stack thirds using the notes of the scale",
  "Tu tarea": "Your assignment",
  "Construye los acordes de cada escala básica y súbelos al Maestro Virtual": "Build the chords of each basic scale and upload to the Virtual Teacher",
  "¡Suerte!": "Good luck!",
  "Te veo en la próxima lección": "See you in the next lesson",
  "fundamental": "root", "3ª": "3rd", "3ª + 3ª": "3rd + 3rd", "3ª y 5ª": "3rd and 5th",
  "3M + 5J": "M3 + P5", "3m + 5J": "m3 + P5", "3m + 5dis": "m3 + dim5", "3M + 5aum": "M3 + aug5",
  "primer grado": "first degree", "sexto grado": "sixth degree",
  "sin cambio": "unchanged", "disminuido": "diminished", "menor": "minor", "ahora menor": "now minor", "mayor": "major", "aumentado": "augmented",
};
function translate(text) {
  if (!text) return text;
  if (translations[text]) return translations[text];
  return text
    .replaceAll("Acordes de ", "Chords of ").replaceAll("Acorde sobre ", "Chord on ").replaceAll("Sobre ", "On ")
    .replaceAll("mayor natural", "natural major").replaceAll("mayor armónica", "harmonic major")
    .replaceAll("menor natural", "natural minor").replaceAll("menor armónica", "harmonic minor")
    .replaceAll("menor melódica ascendente", "ascending melodic minor").replaceAll("menor melódica descendente", "descending melodic minor")
    .replace(/\b(Do|Re|Mi|Fa|Sol|La|Si)\b/g, note => ({ Do: "C", Re: "D", Mi: "E", Fa: "F", Sol: "G", La: "A", Si: "B" })[note]);
}
for (const project of Object.values(board.projects)) project.setup.title = translate(project.setup.title);
for (const still of board.stills) {
  still.heading = translate(still.heading);
  if (still.caption) still.caption = translate(still.caption);
  for (const item of [...(still.highlights ?? []), ...(still.marks ?? [])]) if (item.label) item.label = translate(item.label);
}

// The English script separates degree lists into individual paragraphs.
// Clip 17 still spans the third and fifth reveals, so split its exact spoken text.
const ranges = [
  [1,3],[4,5],[6,6],[7,7],[8,8],[9,11],[12,13],[14,15],
  [16,16],[17,17],[17,18],[19,22],[23,25],[26,26],[27,27],[28,28],[29,29],[30,30],
  [31,31],[32,34],[35,36],[37,38],[39,40],[41,49],[50,53],
  [54,55],[56,57],[58,59],[60,61],[62,62],[63,65],[66,66],[67,67],[68,68],
  [69,71],[72,73],[74,75],[76,77],[78,79],[80,81],[82,83],[84,85],[86,86],
  [87,90],[91,93],[94,96],[97,98],[99,107],[108,110],[111,113],[114,115],[116,117],
  [118,119],[120,122],[123,127],[128,130],[131,134],[135,137],
];
if (ranges.length !== board.stills.length) throw new Error("Visual sequence length changed");
const thirdAndFifth = /^(.*?,)\s*(and a third above E is G\.)$/.exec(paragraphs[16]);
if (!thirdAndFifth) throw new Error("English clip 17 changed; review the two reveals");
board.stills.forEach((still, i) => {
  const [start, end] = ranges[i];
  still.narration = paragraphs.slice(start - 1, end).join(" ");
  if (still.id === "do-tercera") still.narration = thirdAndFifth[1];
  if (still.id === "do-quinta") still.narration = `${thirdAndFifth[2]} ${paragraphs[17]}`;
});
const map = {
  lesson: board.lesson,
  source: {
    zip: "H:/Website Clases/04 Lección 4/ElevenLabs_Lesson_4.zip",
    durations: "content/storyboards/en/05-leccion-4.durations.txt", script: board.source,
    clipPattern: "{n}_Chapter_1.mp3", clips: paragraphs.length,
  },
  note: "English narration, same 58 visual steps and music as Spanish. Split clip 17 at the detected pause; partialText preserves the exact subtitles.",
  stills: buildAudioMap(board, paragraphs),
};
for (const entry of map.stills) {
  if (entry.id === "do-tercera") entry.partialText = { 17: thirdAndFifth[1] };
  if (entry.id === "do-quinta") entry.partialText = { 17: thirdAndFifth[2] };
}
validateAudioMap(board, map);
await mkdir("content/storyboards/en", { recursive: true });
await writeFile("content/storyboards/en/05-leccion-4.json", JSON.stringify(board, null, 2) + "\n");
await writeFile("content/storyboards/en/05-leccion-4.audio.json", JSON.stringify(map, null, 2) + "\n");
console.log(`English: ${board.stills.length} stills, ${paragraphs.length} clips; original music preserved.`);
