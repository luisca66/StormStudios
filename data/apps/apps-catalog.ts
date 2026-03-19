import type { BilingualText } from "@/types/course";

export type AppEntry = {
  slug: string;
  name: BilingualText;
  category: "ear-training" | "cognitive" | "theory" | "sequencer" | "other";
  description: BilingualText;
  longDescription?: BilingualText;
  playStoreUrl?: string;
  apkUrl?: string;
  kindleManualUrl?: string;
  webUrl?: string;
  icon?: string;
  screenshots?: string[];
  features?: BilingualText[];
  isWeb?: boolean;
};

export const APPS: AppEntry[] = [
  {
    slug: "matematicas-mentales",
    name: { es: "Elefantito Matemático", en: "Mental Math Elephant" },
    category: "cognitive",
    description: {
      es: "Entrena tu mente con aritmética cronometrada. Llena la repisa del elefantito resolviendo problemas antes de que se acabe el tiempo.",
      en: "Train your mind with timed arithmetic. Fill the elephant's shelf by solving problems before time runs out.",
    },
    longDescription: {
      es: "Inspirada en la investigación del Dr. Kawashima sobre activación del córtex prefrontal, esta app te desafía a resolver operaciones aritméticas contra el reloj. Con 8 niveles de dificultad —incluyendo el modo 💀 Imposible— y tiempo ajustable por pregunta, el Elefantito Matemático se adapta tanto a niños que aprenden las sumas básicas como a adultos que quieren llevar su mente al límite.",
      en: "Inspired by Dr. Kawashima's research on prefrontal cortex activation, this app challenges you to solve arithmetic operations against the clock. With 8 difficulty levels — including the 💀 Impossible mode — and adjustable time per question, the Math Elephant adapts to children learning basic addition as well as adults looking to push their minds to the limit.",
    },
    apkUrl: "https://stormstudios.com.mx/wp-content/APKs_Apps/elefantitomatematico.apk",
    webUrl: "/apps/matematicas-mentales/jugar",
    features: [
      { es: "8 niveles de dificultad, hasta el modo 💀 Imposible", en: "8 difficulty levels, up to 💀 Impossible mode" },
      { es: "Tiempo por pregunta ajustable (3–30 s)", en: "Adjustable time per question (3–30 s)" },
      { es: "Las cuatro operaciones: +, −, ×, ÷", en: "All four operations: +, −, ×, ÷" },
      { es: "Récord diario guardado localmente", en: "Daily record saved locally" },
      { es: "Juega en el navegador o descarga la app Android", en: "Play in browser or download the Android app" },
    ],
    icon: "/images/app-matematicas-mentales.png",
  },
  {
    slug: "memoria",
    name: { es: "App Memoria – Nemotecnia", en: "Memory App – Mnemonics" },
    category: "cognitive",
    description: {
      es: "Memoriza números del 0 al 99 con el sistema nemotécnico. Juego de parejas y modo de práctica con cronómetro.",
      en: "Memorize numbers from 0 to 99 with the mnemonic system. Matching card game and timed practice mode.",
    },
    longDescription: {
      es: "El sistema nemotécnico convierte cada dígito en una consonante y cada número en una palabra fácil de visualizar. Esta app tiene dos modos: el Juego de Memoria, donde encuentras pares de números y sus palabras clave en un tablero de tarjetas; y el Modo de Práctica, donde el sistema te pregunta al azar y puedes editar tus propias palabras y guardarlas en la nube.",
      en: "The mnemonic system converts each digit into a consonant and each number into an easy-to-visualize word. This app has two modes: the Memory Game, where you find pairs of numbers and their keyword cards on a board; and Practice Mode, where the system quizzes you at random and you can edit your own words and save them to the cloud.",
    },
    webUrl: "/memoria",
    features: [
      { es: "Juego de parejas: encuentra número + palabra en el tablero", en: "Matching game: find number + word pairs on the board" },
      { es: "Modo práctica con límite de tiempo ajustable (5–15 s o libre)", en: "Practice mode with adjustable time limit (5–15 s or unlimited)" },
      { es: "Pregunta en ambas direcciones: número→palabra y palabra→número", en: "Quizzes both ways: number→word and word→number" },
      { es: "Contador de aciertos, racha y marcador de progreso", en: "Correct count, streak tracker, and progress score" },
      { es: "Edita tus propias palabras y guárdalas en la nube", en: "Edit your own words and save them to the cloud" },
      { es: "Cubre del 0 al 99 en rangos de 10", en: "Covers 0 to 99 in ranges of 10" },
    ],
    icon: "/images/app-memoria.png",
  },
  {
    slug: "desglose-auditivo",
    name: { es: "Desglose", en: "Unlocking" },
    category: "ear-training",
    description: {
      es: "Entrena tu oído para aislar e identificar notas individuales dentro de acordes o texturas densas. La app reproduce de 2 a 5 notas simultáneas — tu objetivo es cantar cada una.",
      en: "Train your ear to isolate and identify individual notes within chords or dense textures. The app plays 2 to 5 simultaneous notes — your goal is to sing each one.",
    },
    features: [
      { es: "Dificultad ajustable (2 a 5 notas)", en: "Adjustable difficulty (2 to 5 notes)" },
      { es: "Rango seleccionable C2–C7", en: "Selectable range C2–C7" },
      { es: "Distintos timbres", en: "Multiple timbres" },
    ],
    icon: "/images/app-unlocking.jpeg",
  },
  {
    slug: "intervalos-reconocimiento",
    name: { es: "Intervalos – Reconocimiento", en: "Intervals – Recognition" },
    category: "ear-training",
    description: {
      es: "Entrena el reconocimiento de distancias relativas entre notas. Identifica los intervalos que reproduce la app.",
      en: "Train the recognition of relative distances between notes. Identify the intervals the app plays.",
    },
    features: [
      { es: "Multi-tímbrica (5 timbres)", en: "Multi-timbral (5 timbres)" },
      { es: "Niveles progresivos (quintas a séptimas mayores)", en: "Progressive levels (fifths to major sevenths)" },
    ],
    icon: "/images/app-intervals-listening.jpeg",
  },
  {
    slug: "intervalos-cantados",
    name: { es: "Intervalos – Cantados", en: "Intervals – Sung" },
    category: "ear-training",
    description: {
      es: "Refuerza la comprensión y producción vocal precisa de intervalos. Canta el intervalo que te solicita la app.",
      en: "Reinforce the understanding and precise vocal production of intervals. Sing the interval the app requests.",
    },
    features: [
      { es: "Niveles progresivos (quintas a séptimas mayores)", en: "Progressive levels (fifths to major sevenths)" },
    ],
    icon: "/images/app-intervalos-cantados.png",
  },
  {
    slug: "acordes",
    name: { es: "Reconocimiento de Acordes", en: "Chord Recognition" },
    category: "ear-training",
    description: {
      es: "Entrena la habilidad de identificar acordes y sus cualidades armónicas, desde tríadas hasta acordes complejos con 13ª.",
      en: "Train your ability to identify chords and their harmonic qualities, from triads to complex 13th chords.",
    },
    features: [
      { es: "Multi-tímbrica (5 timbres)", en: "Multi-timbral (5 timbres)" },
      { es: "Rango seleccionable", en: "Selectable range" },
      { es: "Dificultad progresiva hasta acordes con 13ª", en: "Progressive difficulty up to 13th chords" },
    ],
    icon: "/images/app-acordes.jpeg",
  },
  {
    slug: "grados-mayores",
    name: { es: "Grados Escala Mayor", en: "Major Scale Degrees" },
    category: "ear-training",
    description: {
      es: "Desarrolla la percepción de la función tonal de cada nota en tonalidades mayores. Reconoce grados diatónicos y cromáticos en contexto.",
      en: "Develop perception of the tonal function of each note in major keys. Recognize diatonic and chromatic degrees in context.",
    },
    features: [
      { es: "Grados diatónicos y cromáticos", en: "Diatonic and chromatic degrees" },
      { es: "Contexto tonal mayor", en: "Major tonal context" },
    ],
    icon: "/images/app-grados-mayores.jpg",
  },
  {
    slug: "grados-menores",
    name: { es: "Grados Escala Menor", en: "Minor Scale Degrees" },
    category: "ear-training",
    description: {
      es: "Desarrolla la percepción de la función tonal de cada nota en tonalidades menores. Reconoce grados diatónicos y cromáticos en contexto.",
      en: "Develop perception of the tonal function of each note in minor keys. Recognize diatonic and chromatic degrees in context.",
    },
    features: [
      { es: "Grados diatónicos y cromáticos", en: "Diatonic and chromatic degrees" },
      { es: "Contexto tonal menor", en: "Minor tonal context" },
    ],
    icon: "/images/app-grados-menores.jpeg",
  },
  {
    slug: "oido-absoluto-multi",
    name: { es: "Oído Absoluto Multi-tímbrico", en: "Perfect Pitch Multi-timbral" },
    category: "ear-training",
    description: {
      es: "Entrena la habilidad de reconocer notas específicas sin referencia previa, con 5 timbres distintos para un entrenamiento más completo.",
      en: "Train the ability to recognize specific notes without prior reference, using 5 different timbres for more complete training.",
    },
    features: [
      { es: "5 timbres disponibles", en: "5 available timbres" },
      { es: "Entrenamiento de pitch absoluto", en: "Absolute pitch training" },
    ],
    icon: "/images/app-ap-multi.png",
  },
  {
    slug: "oido-absoluto-guitarra",
    name: { es: "Oído Absoluto Guitarra Clásica", en: "Perfect Pitch Classical Guitar" },
    category: "ear-training",
    description: {
      es: "Versión especializada del entrenamiento de oído absoluto con timbre de Guitarra Clásica, ideal para guitarristas.",
      en: "Specialized version of absolute pitch training using Classical Guitar timbre, ideal for guitarists.",
    },
    features: [
      { es: "Timbre de Guitarra Clásica", en: "Classical Guitar timbre" },
      { es: "Entrenamiento de pitch absoluto", en: "Absolute pitch training" },
    ],
    icon: "/images/app-ap-guitar.jpeg",
  },
  {
    slug: "storm-sequencer",
    name: { es: "Storm Sequencer v3.0", en: "Storm Sequencer v3.0" },
    category: "sequencer",
    description: {
      es: "Secuenciador musical online para componer tus ejercicios y exportarlos como MIDI para el Maestro Virtual.",
      en: "Online music sequencer to compose your exercises and export them as MIDI for the Virtual Teacher.",
    },
    webUrl: "/sequencer",
    isWeb: true,
    features: [
      { es: "Disponible en el navegador, sin descarga", en: "Available in browser, no download needed" },
      { es: "Exporta a MIDI para el Maestro Virtual", en: "Export to MIDI for the Virtual Teacher" },
    ],
    icon: "/images/secuenciador.png",
  },
];

export function getAppBySlug(slug: string): AppEntry | undefined {
  return APPS.find((app) => app.slug === slug);
}

export function getAppsByCategory(category: AppEntry["category"]): AppEntry[] {
  return APPS.filter((app) => app.category === category);
}
