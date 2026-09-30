// Generates content/storyboards/es/05-leccion-4.json from the ElevenLabs script of lesson 4.
// Usage: node scripts/sequencer/generar-storyboard-leccion-4.mjs content/storyboards/es/05-leccion-4.json
import { writeFileSync } from "node:fs";

const pos = k => ({ measure: k <= 4 ? 1 : 2, beat: ((k - 1) % 4) + 1 });
const at = (k, color, label) => { const p = pos(k); return { ...p, endBeat: p.beat + 1, color, label }; };
const reveal = k => (k >= 8 ? undefined : pos(k + 1));
const chordText = chords => `voz melody\ncompas 1\n${chords.slice(0, 4).map(c => `[${c}] negra`).join("; ")}\ncompas 2\n${chords.slice(4).map(c => `[${c}] negra`).join("; ")}`;
const scaleText = notes => `voz melody\ncompas 1\n${notes.slice(0, 4).map(n => `${n} negra`).join("; ")}\ncompas 2\n${notes.slice(4).map(n => `${n} negra`).join("; ")}`;
const romans = list => list.map((text, i) => ({ ...pos(i + 1), text, kind: "roman" }));
const setup = (title, measures = 2) => ({ mode: "single", title, key: "C", time: [4, 4], measures, tempo: 72 });

const MAYOR = ["C4 E4 G4", "D4 F4 A4", "E4 G4 B4", "F4 A4 C5", "G4 B4 D5", "A4 C5 E5", "B4 D5 F5", "C5 E5 G5"];
const MAYOR_ARM = ["C4 E4 G4", "D4 F4 Ab4", "E4 G4 B4", "F4 Ab4 C5", "G4 B4 D5", "Ab4 C5 E5", "B4 D5 F5", "C5 E5 G5"];
const MENOR_NAT = ["C4 Eb4 G4", "D4 F4 Ab4", "Eb4 G4 Bb4", "F4 Ab4 C5", "G4 Bb4 D5", "Ab4 C5 Eb5", "Bb4 D5 F5", "C5 Eb5 G5"];
const MENOR_ARM = ["C4 Eb4 G4", "D4 F4 Ab4", "Eb4 G4 B4", "F4 Ab4 C5", "G4 B4 D5", "Ab4 C5 Eb5", "B4 D5 F5", "C5 Eb5 G5"];
const MENOR_MEL = ["C4 Eb4 G4", "D4 F4 A4", "Eb4 G4 B4", "F4 A4 C5", "G4 B4 D5", "A4 C5 Eb5", "B4 D5 F5", "C5 Eb5 G5"];
const MENOR_MEL_DESC = ["C5 Eb5 G5", "Bb4 D5 F5", "Ab4 C5 Eb5", "G4 Bb4 D5", "F4 Ab4 C5", "Eb4 G4 Bb4", "D4 F4 Ab4", "C4 Eb4 G4"];

const projects = {
  "ejemplos": { setup: setup("Ejemplos de acordes", 1), text: "voz melody\ncompas 1\n[C4 G4] negra; [D4 F#4 A4] negra; [E4 G4 B4 D5] negra; [F4 G4 A4] negra" },
  "fundamental": { setup: setup("Acorde sobre Do"), text: chordText(["C4", ...MAYOR.slice(1)]) },
  "tercera": { setup: setup("Acorde sobre Do"), text: chordText(["C4 E4", ...MAYOR.slice(1)]) },
  "escala-mayor": { setup: setup("Do mayor natural"), text: scaleText(["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]) },
  "mayor": { setup: setup("Acordes de Do mayor natural"), text: chordText(MAYOR), annotations: romans(["I", "ii", "iii", "IV", "V", "vi", "vii°", "I"]) },
  "escala-mayor-arm": { setup: setup("Do mayor armónica"), text: scaleText(["C4", "D4", "E4", "F4", "G4", "Ab4", "B4", "C5"]) },
  "mayor-arm": { setup: setup("Acordes de Do mayor armónica"), text: chordText(MAYOR_ARM), annotations: romans(["I", "ii°", "iii", "iv", "V", "VI+", "vii°", "I"]) },
  "escala-menor-nat": { setup: setup("Do menor natural"), text: scaleText(["C4", "D4", "Eb4", "F4", "G4", "Ab4", "Bb4", "C5"]) },
  "menor-nat": { setup: setup("Acordes de Do menor natural"), text: chordText(MENOR_NAT), annotations: romans(["i", "ii°", "III", "iv", "v", "VI", "VII", "i"]) },
  "escala-menor-arm": { setup: setup("Do menor armónica"), text: scaleText(["C4", "D4", "Eb4", "F4", "G4", "Ab4", "B4", "C5"]) },
  "menor-arm": { setup: setup("Acordes de Do menor armónica"), text: chordText(MENOR_ARM), annotations: romans(["i", "ii°", "III+", "iv", "V", "VI", "vii°", "i"]) },
  "escala-menor-mel": { setup: setup("Do menor melódica ascendente"), text: scaleText(["C4", "D4", "Eb4", "F4", "G4", "A4", "B4", "C5"]) },
  "menor-mel": { setup: setup("Acordes de Do menor melódica ascendente"), text: chordText(MENOR_MEL), annotations: romans(["i", "ii", "III+", "IV", "V", "vi°", "vii°", "i"]) },
  "menor-mel-desc": { setup: setup("Do menor melódica descendente"), text: chordText(MENOR_MEL_DESC), annotations: romans(["i", "VII", "VI", "v", "iv", "III", "ii°", "i"]) },
  "cuatro-tipos": { setup: setup("Los cuatro tipos de acordes de quinta", 4), text: "voz melody\ncompas 1\n[C4 E4 G4] redonda\ncompas 2\n[C4 Eb4 G4] redonda\ncompas 3\n[C4 Eb4 Gb4] redonda\ncompas 4\n[C4 E4 G#4] redonda",
    annotations: [{ measure: 1, beat: 1, text: "Mayor", kind: "text" }, { measure: 2, beat: 1, text: "menor", kind: "text" }, { measure: 3, beat: 1, text: "disminuido", kind: "text" }, { measure: 4, beat: 1, text: "aumentado", kind: "text" }] },
};

const stills = [];
const add = still => { stills.push({ duration: 5, ...still }); };
const chords = (project, k, extra = {}) => ({ project, measures: [1, 2], showCiphers: false, reveal: reveal(k), ...extra });

// --- Introducción ---
add({ id: "titulo", kind: "title", heading: "Acordes de quinta", caption: "Lección 4 · Curso de Armonía · Storm Studios Learning",
  narration: "Hola, bienvenidos de nuevo a Storm Studios Learning. En las lecciones anteriores estudiamos las escalas y los intervalos. Con esas herramientas, hoy comenzamos propiamente el estudio de la armonía, o las armonías.", duration: 12 });
add({ id: "que-es-acorde", kind: "title", heading: "¿Qué es un acorde?", caption: "Toda simultaneidad de sonidos diferentes, dos o más.",
  narration: "Primero tenemos que definir qué es un acorde. Llamamos acorde a toda simultaneidad de sonidos diferentes, dos o más.", duration: 8 });
add({ id: "ejemplos", project: "ejemplos", heading: "Ejemplos de acordes", caption: "Dos, tres o más sonidos diferentes al mismo tiempo",
  narration: "Estos son ejemplos de acordes.", duration: 5 });
add({ id: "armonia", kind: "title", heading: "La armonía", caption: "Estructura interválica de los acordes y leyes de su enlace",
  narration: "La armonía estudia la estructura interválica de los acordes —es decir, cómo se construyen— y las leyes que rigen cómo se enlazan unos acordes con otros.", duration: 10 });
add({ id: "armonias", kind: "title", heading: "Armonías, en plural", caption: "Época · género · corriente estilística · compositor",
  narration: "En el método hablamos de armonías, en plural, porque esos enlaces y sus usos dependen de la época, del género, de la corriente estilística y también del compositor que estamos estudiando.", duration: 11 });
add({ id: "construccion", kind: "title", heading: "Construcción de acordes", caption: "Fundamental + terceras superpuestas",
  narration: "Vamos a comenzar por la construcción de los acordes. Más adelante estudiaremos cómo enlazarlos. Para construir los acordes que vamos a trabajar aquí, partimos de un sonido generador, al que llamamos fundamental, y superponemos intervalos de tercera.", duration: 15 });
add({ id: "plan", kind: "title", heading: "Acordes de quinta", caption: "Dos terceras sobre cada grado de las escalas básicas en Do",
  narration: "Hoy vamos a superponer dos terceras para construir los llamados acordes de quinta. Lo haremos sobre cada grado de las escalas básicas, en este caso sobre las escalas de Do, para comparar cómo cambian sus acordes.", duration: 13 });

// --- Do mayor natural ---
add({ id: "escala-mayor", project: "escala-mayor", heading: "Do mayor natural", caption: "Cada nota puede ser fundamental de un acorde",
  narration: "Cada nota de la escala puede servir como fundamental de un acorde. Para construirlo, vamos a superponer dos terceras utilizando las notas de la misma escala.", duration: 10 });
add({ id: "do-fundamental", ...chords("fundamental", 1), heading: "Sobre Do", marks: [{ measure: 1, beat: 1, color: "amber", label: "fundamental" }],
  narration: "Empiezo sobre Do.", duration: 3 });
add({ id: "do-tercera", ...chords("tercera", 1), heading: "Sobre Do", highlights: [at(1, "cyan", "3ª")],
  narration: "Una tercera arriba tenemos Mi,", duration: 3 });
add({ id: "do-quinta", ...chords("mayor", 1), heading: "Do · Mi · Sol", highlights: [at(1, "amber", "3ª + 3ª")],
  narration: "y una tercera arriba de Mi tenemos Sol. Tenemos Do, Mi y Sol.", duration: 5 });
add({ id: "acorde-de-quinta", ...chords("mayor", 1), heading: "Acorde de quinta o tríada", caption: "Mi es la tercera y Sol es la quinta de Do",
  highlights: [at(1, "amber", "3ª y 5ª")],
  narration: "Con respecto a Do, Mi es la tercera y Sol es la quinta. Por eso llamamos a esta estructura acorde de quinta. También se conoce como tríada, porque contiene tres notas diferentes. Vamos a escucharlo.", duration: 13, audio: true });
add({ id: "sobre-re", ...chords("mayor", 2), heading: "Sobre Re", highlights: [at(2, "amber", "Re · Fa · La")],
  narration: "Ahora voy a hacer lo mismo sobre Re. Una tercera arriba de Re tenemos Fa, y una tercera arriba de Fa tenemos La. Nuestro acorde es Re, Fa y La.", duration: 9 });
for (const [k, heading, narration] of [
  [3, "Sobre Mi", "Sobre Mi tenemos Sol y Si."], [4, "Sobre Fa", "Sobre Fa tenemos La y Do."], [5, "Sobre Sol", "Sobre Sol tenemos Si y Re."],
  [6, "Sobre La", "Sobre La tenemos Do y Mi."], [7, "Sobre Si", "Y sobre Si tenemos Re y Fa."],
]) add({ id: `sobre-${heading.split(" ")[1].toLowerCase()}`, ...chords("mayor", k), heading, highlights: [at(k, "amber")], narration, duration: 3 });
add({ id: "mayor-escuchar", ...chords("mayor", 8), heading: "Acordes de Do mayor natural", cursor: { measure: 1, beat: 1 },
  narration: "Voy a reproducirlos para escuchar cómo cambia su sonido de un grado al siguiente.", duration: 10, audio: true });
add({ id: "mayor-tipo-mayor", ...chords("mayor", 8), heading: "Acorde mayor", caption: "Tercera mayor y quinta justa", highlights: [at(1, "amber", "3M + 5J")],
  narration: "Aunque todos están construidos superponiendo terceras, sus intervalos no son iguales. En Do, Mi y Sol tenemos una tercera mayor y una quinta justa, medidas desde la fundamental. Este es un acorde mayor.", duration: 13 });
add({ id: "mayor-tipo-menor", ...chords("mayor", 8), heading: "Acorde menor", caption: "Tercera menor y quinta justa", highlights: [at(2, "cyan", "3m + 5J")],
  narration: "En Re, Fa y La tenemos una tercera menor y una quinta justa. Este es un acorde menor.", duration: 6 });
add({ id: "mayor-tipo-disminuido", ...chords("mayor", 8), heading: "Acorde disminuido", caption: "Tercera menor y quinta disminuida", highlights: [at(7, "rose", "3m + 5dis")],
  narration: "Y en Si, Re y Fa tenemos una tercera menor y una quinta disminuida. Este es un acorde disminuido.", duration: 7 });
add({ id: "grados", ...chords("mayor", 8), showCiphers: true, heading: "Cada acorde es un grado", highlights: [at(1, "amber", "primer grado"), at(6, "cyan", "sexto grado")],
  narration: "Recordemos que cada nota de la escala es un grado, y por lo tanto, cada acorde es el acorde respectivo a su grado. Así podemos decir también: el acorde de primer grado, o el acorde de sexto grado.", duration: 11 });
add({ id: "mayor-resumen", ...chords("mayor", 8), showCiphers: true, heading: "Do mayor natural", caption: "I mayor · ii menor · iii menor · IV mayor · V mayor · vi menor · vii° disminuido",
  narration: "La estructura de nuestros acordes queda de la siguiente manera: primero mayor, segundo menor, tercero menor, cuarto mayor, quinto mayor, sexto menor y séptimo disminuido. Esta es la estructura de los acordes de la escala mayor natural.", duration: 14 });

// --- Do mayor armónica ---
add({ id: "escala-mayor-arm", project: "escala-mayor-arm", heading: "Do mayor armónica", caption: "El sexto grado desciende: La bemol",
  marks: [{ measure: 2, beat: 2, color: "rose", label: "La♭" }],
  narration: "Ahora vamos a construir los acordes de la escala mayor armónica. Si tienes alguna duda sobre cuáles son las escalas básicas no dudes en repasar la lección anterior. Voy a construir otra vez los acordes, respetando las notas de esta escala. Ahora, cada vez que aparezca La, tendrá que ser La bemol.", duration: 17 });
add({ id: "arm-1", ...chords("mayor-arm", 1), heading: "I · Do Mi Sol", highlights: [at(1, "green", "sin cambio")],
  narration: "El primer acorde sigue siendo Do, Mi y Sol. No contiene La, así que no cambia.", duration: 5 });
add({ id: "arm-2", ...chords("mayor-arm", 2), heading: "ii° · Re Fa La♭", highlights: [at(2, "rose", "disminuido")],
  narration: "El segundo ahora es Re, Fa y La bemol. Su quinta se volvió disminuida: ahora tenemos un acorde disminuido.", duration: 7 });
add({ id: "arm-3", ...chords("mayor-arm", 3), heading: "iii · Mi Sol Si", highlights: [at(3, "green", "menor")],
  narration: "El tercero, Mi, Sol y Si, tampoco cambia. Sigue siendo menor.", duration: 5 });
add({ id: "arm-4", ...chords("mayor-arm", 4), heading: "iv · Fa La♭ Do", highlights: [at(4, "rose", "ahora menor")],
  narration: "El cuarto ahora es Fa, La bemol y Do. Antes era mayor y ahora es menor.", duration: 5 });
add({ id: "arm-5", ...chords("mayor-arm", 5), heading: "V · Sol Si Re", highlights: [at(5, "green", "mayor")],
  narration: "El quinto sigue siendo Sol, Si y Re: mayor.", duration: 4 });
add({ id: "arm-6", ...chords("mayor-arm", 6), heading: "VI+ · La♭ Do Mi", caption: "Tercera mayor y quinta aumentada", highlights: [at(6, "violet", "aumentado")],
  narration: "Mira lo que sucede en el sexto: La bemol, Do y Mi. Desde La bemol hasta Do tenemos una tercera mayor, y desde La bemol hasta Mi tenemos una quinta aumentada. Aquí aparece el cuarto tipo de acorde: el aumentado.", duration: 13 });
add({ id: "arm-7", ...chords("mayor-arm", 7), heading: "vii° · Si Re Fa", highlights: [at(7, "green", "disminuido")],
  narration: "El séptimo sigue siendo Si, Re y Fa: disminuido.", duration: 4 });
add({ id: "arm-escuchar", ...chords("mayor-arm", 8), showCiphers: true, heading: "Acordes de Do mayor armónica", cursor: { measure: 1, beat: 1 },
  narration: "Vamos a escuchar los acordes de la escala mayor armónica.", duration: 10, audio: true });
add({ id: "arm-cambios", ...chords("mayor-arm", 8), showCiphers: true, heading: "Cambió una nota, cambiaron tres acordes",
  highlights: [at(2, "rose"), at(4, "rose"), at(6, "rose")],
  narration: "Al cambiar una nota de la escala cambiaron tres acordes: los que contienen esa nota.", duration: 6 });

// --- Do menor natural ---
add({ id: "escala-menor-nat", project: "escala-menor-nat", heading: "Do menor natural", caption: "Do · Re · Mi♭ · Fa · Sol · La♭ · Si♭ · Do",
  marks: [{ measure: 1, beat: 3, color: "violet" }, { measure: 2, beat: 2, color: "violet" }, { measure: 2, beat: 3, color: "violet" }],
  narration: "Continuemos con la escala de Do menor natural: Do, Re, Mi bemol, Fa, Sol, La bemol, Si bemol y Do. Voy a construir los acordes de la misma manera.", duration: 11 });
for (const [k, heading, color, label, narration] of [
  [1, "i · Do Mi♭ Sol", "cyan", "menor", "Sobre Do tenemos Mi bemol y Sol. El primero es menor."],
  [2, "ii° · Re Fa La♭", "rose", "disminuido", "Sobre Re tenemos Fa y La bemol. El segundo es disminuido."],
  [3, "III · Mi♭ Sol Si♭", "amber", "mayor", "Sobre Mi bemol tenemos Sol y Si bemol. El tercero es mayor."],
  [4, "iv · Fa La♭ Do", "cyan", "menor", "Sobre Fa tenemos La bemol y Do. El cuarto es menor."],
  [5, "v · Sol Si♭ Re", "cyan", "menor", "Sobre Sol tenemos Si bemol y Re. El quinto es menor."],
  [6, "VI · La♭ Do Mi♭", "amber", "mayor", "Sobre La bemol tenemos Do y Mi bemol. El sexto es mayor."],
  [7, "VII · Si♭ Re Fa", "amber", "mayor", "Y sobre Si bemol tenemos Re y Fa. El séptimo es mayor."],
]) add({ id: `nat-${k}`, ...chords("menor-nat", k), heading, highlights: [at(k, color, label)], narration, duration: 5 });
add({ id: "nat-escuchar", ...chords("menor-nat", 8), showCiphers: true, heading: "Acordes de Do menor natural", cursor: { measure: 1, beat: 1 },
  narration: "Vamos a escucharlos.", duration: 10, audio: true });

// --- Do menor armónica ---
add({ id: "escala-menor-arm", project: "escala-menor-arm", heading: "Do menor armónica", caption: "El séptimo grado sube: Si♭ → Si",
  marks: [{ measure: 2, beat: 3, color: "rose", label: "Si♮" }],
  narration: "Para construir la escala menor armónica, vamos a elevar el séptimo grado. Si bemol se convierte en Si natural. Ahora tenemos Do, Re, Mi bemol, Fa, Sol, La bemol, Si y Do. Voy a hacer ese cambio también en los acordes que contienen esa nota.", duration: 15 });
add({ id: "marm-3", ...chords("menor-arm", 8), heading: "III+ · Mi♭ Sol Si", highlights: [at(3, "violet", "aumentado")],
  narration: "El tercero era Mi bemol, Sol y Si bemol. Ahora es Mi bemol, Sol y Si natural. Su quinta se vuelve aumentada, así que el acorde es aumentado.", duration: 9 });
add({ id: "marm-5", ...chords("menor-arm", 8), heading: "V · Sol Si Re", highlights: [at(5, "amber", "mayor")],
  narration: "El quinto era Sol, Si bemol y Re. Ahora es Sol, Si natural y Re. Su tercera se vuelve mayor: tenemos un acorde mayor.", duration: 8 });
add({ id: "marm-7", ...chords("menor-arm", 8), heading: "vii° · Si Re Fa", highlights: [at(7, "rose", "disminuido")],
  narration: "Y el séptimo ahora es Si natural, Re y Fa: un acorde disminuido. Los demás acordes conservan las mismas notas.", duration: 7 });
add({ id: "marm-resumen", ...chords("menor-arm", 8), showCiphers: true, heading: "Do menor armónica", caption: "i · ii° · III+ · iv · V · VI · vii°", cursor: { measure: 1, beat: 1 },
  narration: "Entonces tenemos: primero menor, segundo disminuido, tercero aumentado, cuarto menor, quinto mayor, sexto mayor y séptimo disminuido. Escuchemos.", duration: 18, audio: true });

// --- Do menor melódica ---
add({ id: "escala-menor-mel", project: "escala-menor-mel", heading: "Do menor melódica ascendente", caption: "También sube el sexto grado: La♭ → La",
  marks: [{ measure: 2, beat: 2, color: "rose", label: "La♮" }, { measure: 2, beat: 3, color: "rose", label: "Si♮" }],
  narration: "Por último vamos a elevar también el sexto grado para construir la menor melódica ascendente. La bemol se convierte en La natural. La escala queda Do, Re, Mi bemol, Fa, Sol, La, Si y Do.", duration: 13 });
add({ id: "mel-2", ...chords("menor-mel", 8), heading: "ii · Re Fa La", highlights: [at(2, "cyan", "menor")],
  narration: "Vamos a revisar los acordes que cambian. El segundo ahora es Re, Fa y La. Su quinta vuelve a ser justa y el acorde es menor.", duration: 8 });
add({ id: "mel-4", ...chords("menor-mel", 8), heading: "IV · Fa La Do", highlights: [at(4, "amber", "mayor")],
  narration: "El cuarto es Fa, La y Do. Ahora es mayor.", duration: 4 });
add({ id: "mel-6", ...chords("menor-mel", 8), heading: "vi° · La Do Mi♭", highlights: [at(6, "rose", "disminuido")],
  narration: "Y el sexto es La, Do y Mi bemol. Tenemos tercera menor y quinta disminuida: es un acorde disminuido.", duration: 7 });
add({ id: "mel-resumen", ...chords("menor-mel", 8), showCiphers: true, heading: "Do menor melódica ascendente", caption: "i · ii · III+ · IV · V · vi° · vii°", cursor: { measure: 1, beat: 1 },
  narration: "El primero sigue siendo menor; el tercero, aumentado; el quinto, mayor; y el séptimo, disminuido. Vamos a escucharlos.", duration: 16, audio: true });
add({ id: "mel-descenso", project: "menor-mel-desc", measures: [1, 2], showCiphers: true, heading: "Al descender: menor natural", caption: "Recuperamos Si♭ y La♭",
  highlights: [at(2, "violet", "Si♭"), at(3, "violet", "La♭")],
  narration: "Cuando la escala menor melódica desciende, recuperamos las notas de la menor natural: Si bemol y La bemol. Voy a escribir el descenso y construir los acordes con esas notas. Por eso, al bajar, recuperamos también los acordes que ya encontramos en Do menor natural.", duration: 16, audio: true });

// --- Recapitulación y tarea ---
add({ id: "cuatro-tipos", project: "cuatro-tipos", heading: "Los cuatro tipos de acordes de quinta", showCiphers: true,
  highlights: [
    { measure: 1, beat: 1, endBeat: 5, color: "amber", label: "3M + 5J" }, { measure: 2, beat: 1, endBeat: 5, color: "cyan", label: "3m + 5J" },
    { measure: 3, beat: 1, endBeat: 5, color: "rose", label: "3m + 5dis" }, { measure: 4, beat: 1, endBeat: 5, color: "violet", label: "3M + 5aum" },
  ],
  narration: "Ahora podemos ver de dónde salen los cuatro tipos de acordes de quinta. El mayor tiene tercera mayor y quinta justa. El menor tiene tercera menor y quinta justa. El disminuido tiene tercera menor y quinta disminuida. Y el aumentado tiene tercera mayor y quinta aumentada.", duration: 17, audio: true });
add({ id: "regla", kind: "title", heading: "Cada grado, una fundamental", caption: "Superponemos terceras respetando las notas de la escala",
  narration: "Para construirlos sobre una escala, tomamos cada grado como fundamental y superponemos terceras respetando las notas de esa escala. Por eso es tan importante escribir correctamente las alteraciones. Si cambiamos una nota, podemos cambiar la estructura y el tipo de acorde.", duration: 16 });
add({ id: "tarea", kind: "title", heading: "Tu tarea", caption: "Construye los acordes de cada escala básica y súbelos al Maestro Virtual",
  narration: "Conserva estos ejemplos sobre Do como referencia. Utiliza tu tarea en la que ya construiste todas las escalas básicas y construye todos los acordes de cada escala. Esa es tu tarea para esta lección 4. Cuando la tengas lista la puedes subir al maestro virtual para su revisión.", duration: 17 });
add({ id: "despedida", kind: "title", heading: "¡Suerte!", caption: "Te veo en la próxima lección",
  narration: "Espero que hayas disfrutado tu primera lección con acordes. Te veo en la próxima. ¡Suerte!", duration: 6 });

const storyboard = {
  version: 1, lesson: "05-leccion-4", locale: "es", title: "Lección 4 — Acordes de quinta",
  source: "H:\\Website Clases\\04 Lección 4\\Guión lección 4 Astra para elevenlabs.docx",
  format: { aspect: "16:9", width: 1920, theme: "storm" }, projects, stills,
};
for (const s of stills) if (s.reveal === undefined) delete s.reveal;
writeFileSync(process.argv[2], JSON.stringify(storyboard, null, 2) + "\n");
console.log(stills.length, "stills");
