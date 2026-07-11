import type { BilingualText } from "@/types/course";

export type AppEntry = {
  slug: string;
  name: BilingualText;
  category: "ear-training" | "cognitive" | "theory" | "sequencer" | "other";
  description: BilingualText;
  longDescription?: BilingualText;
  playStoreUrl?: string;
  apkUrl?: string;
  apkUrls?: BilingualText;
  kindleManualUrl?: string;
  webUrl?: string;
  // Modo juego (variante gamificada de la misma app); abre una segunda experiencia.
  gameUrl?: string;
  gameLabel?: BilingualText;
  icon?: string;
  screenshots?: string[];
  features?: BilingualText[];
  // Herramienta de apoyo (sección "Herramientas Web"); las demás van en "Web Apps".
  isTool?: boolean;
};

export const APPS: AppEntry[] = [
  {
    slug: "lectura-ritmica",
    name: { es: "Lectura Rítmica", en: "Rhythm Reading" },
    category: "theory",
    description: {
      es: "Practica patrones rítmicos generados con metrónomo, tap interactivo y evaluación de precisión.",
      en: "Practice generated rhythm patterns with a metronome, interactive tapping, and timing evaluation.",
    },
    longDescription: {
      es: "Este juego acompaña la lección P02 del propedéutico. Genera patrones rítmicos por nivel, reproduce un metrónomo, captura tus taps y evalúa si mantienes la precisión necesaria por rondas consecutivas.",
      en: "This game supports lesson P02 of the preparatory module. It generates level-based rhythm patterns, plays a metronome, captures your taps, and evaluates whether you maintain the required accuracy across consecutive rounds.",
    },
    webUrl: "/herramientas/lectura-ritmica",
    isTool: true,
    features: [
      { es: "5 niveles progresivos", en: "5 progressive levels" },
      { es: "Metrónomo y tempo ajustable", en: "Metronome with adjustable tempo" },
      { es: "Evaluación de precisión por ventana móvil", en: "Rolling-window timing evaluation" },
      { es: "Timbres de percusión para el tap", en: "Percussion sounds for tap feedback" },
    ],
    icon: "/images/emoji-music.svg",
  },
  {
    slug: "lectura-musical",
    name: { es: "Lectura Musical", en: "Music Reading" },
    category: "theory",
    description: {
      es: "Practica la lectura de notas naturales en clave de sol y clave de fa con niveles progresivos.",
      en: "Practice reading natural notes in treble clef and bass clef with progressive levels.",
    },
    longDescription: {
      es: "Este juego acompaña el módulo propedéutico del curso de armonía. Presenta notas en el pentagrama, reproduce el sonido y guarda tu progreso local para avanzar por niveles.",
      en: "This game supports the preparatory harmony-course module. It shows notes on the staff, plays their sound, and saves local progress as you move through levels.",
    },
    webUrl: "/herramientas/lectura-musical",
    isTool: true,
    features: [
      { es: "12 niveles progresivos", en: "12 progressive levels" },
      { es: "Clave de sol y clave de fa", en: "Treble clef and bass clef" },
      { es: "Nombres Do-Re-Mi o C-D-E", en: "Do-Re-Mi or C-D-E note names" },
      { es: "Progreso guardado en el navegador", en: "Progress saved in the browser" },
    ],
    icon: "/images/emoji-score.svg",
  },
  {
    slug: "matematicas-mentales",
    name: { es: "Elefantito Matemático", en: "Little Elephant Math" },
    category: "cognitive",
    description: {
      es: "Entrenamiento de cálculo mental para músicos: 20 niveles progresivos con tutor, juego cronometrado y técnicas reales de aritmética mental.",
      en: "Mental math training for musicians: 20 progressive levels with tutoring, timed play, and real mental arithmetic techniques.",
    },
    longDescription: {
      es: "Elefantito Matemático es una app de entrenamiento cognitivo diseñada para acompañar el estudio musical. Combina la idea de activación mental rápida del Dr. Kawashima con técnicas de cálculo mental de Arthur Benjamin: resolver de izquierda a derecha, descomponer números, usar complementos, factorizar y reconocer patrones. Cada nivel tiene un tutor breve que explica la técnica y un juego cronometrado donde el elefantito llena la repisa lanzando barriles por cada respuesta correcta. La meta no es convertirte en matemático, sino fortalecer memoria de trabajo, atención, velocidad de procesamiento y flexibilidad mental: habilidades que también usas al leer, tocar, improvisar y pensar música.",
      en: "Little Elephant Math is a cognitive training app designed to support musical study. It combines Dr. Kawashima's idea of quick mental activation with Arthur Benjamin's mental math techniques: solving left to right, decomposing numbers, using complements, factoring, and recognizing patterns. Each level includes a short tutor that explains the technique and a timed game where the elephant fills the shelf by launching barrels for each correct answer. The goal is not to turn you into a mathematician, but to strengthen working memory, attention, processing speed, and mental flexibility: the same abilities you use when reading, playing, improvising, and thinking in music.",
    },
    apkUrls: {
      es: "https://pub-2de970e8bf224791a9ab6d06fa62ce19.r2.dev/APKs/elefantito-matematico.apk",
      en: "https://pub-2de970e8bf224791a9ab6d06fa62ce19.r2.dev/APKs/little-elephant-math.apk",
    },
    webUrl: "/apps/matematicas-mentales/jugar",
    features: [
      { es: "20 niveles progresivos, desde operaciones básicas hasta fracciones decimales cíclicas", en: "20 progressive levels, from basic operations to repeating decimal fractions" },
      { es: "Tutor bilingüe por nivel con explicación, ejemplos y práctica guiada", en: "Bilingual tutor for each level with explanation, examples, and guided practice" },
      { es: "Técnicas basadas en cálculo mental real: complementos, distributiva, factorización y división izquierda a derecha", en: "Techniques based on real mental math: complements, distributive thinking, factoring, and left-to-right division" },
      { es: "Juego cronometrado con progreso bloqueado: supera un nivel para abrir el siguiente", en: "Timed game with locked progression: clear a level to unlock the next one" },
      { es: "Disponible en navegador y como APK para Android", en: "Available in the browser and as an Android APK" },
    ],
    icon: "/images/app-matematicas-mentales.png",
  },
  {
    slug: "memoria",
    name: { es: "App Memoria – Nemotecnia", en: "Memory App – Mnemonics" },
    category: "cognitive",
    description: {
      es: "Aprende y usa el código nemotécnico para convertir números en palabras memorables, con juego de parejas, práctica cronometrada y retos de recuperación.",
      en: "Learn and use the mnemonic code to turn numbers into memorable words, with matching games, timed practice, and recall challenges.",
    },
    longDescription: {
      es: "La memoria sostiene casi todo lo que hacemos como músicos: recordar motivos, progresiones, digitaciones, estructuras, letras, sonidos internos y decisiones expresivas mientras tocamos en tiempo real. También es una capacidad central para la vida diaria: organiza nuestra identidad, nuestra atención y nuestra autonomía. Entrenarla con constancia mantiene la mente activa, favorece la concentración y puede formar parte de una rutina saludable de cuidado cognitivo a lo largo de los años.\n\nApp Memoria - Nemotecnia entrena el código que convierte dígitos en consonantes y números en palabras fáciles de imaginar. Primero aprendes las asociaciones en un juego de parejas por rangos; después practicas en ambas direcciones, de número a palabra y de palabra a número, con tiempo opcional, aciertos y racha; finalmente usas el código en un reto donde memorizas una secuencia, pasas por un juego distractor y recuperas los números. Puedes editar tus propias palabras por rango y guardarlas en la nube. La misma experiencia está disponible en navegador y como APK para Android.",
      en: "Memory supports almost everything we do as musicians: remembering motives, progressions, fingerings, structures, lyrics, inner sounds, and expressive decisions while performing in real time. It is also central to everyday life: it helps organize identity, attention, and autonomy. Training it consistently keeps the mind active, supports concentration, and can be part of a healthy cognitive-care routine across the later years of life.\n\nMemory App - Mnemonics trains the code that turns digits into consonants and numbers into easy-to-picture words. First you learn the associations in a range-based matching game; then you practice both directions, number to word and word to number, with optional timing, correct-answer counts, and streaks; finally you use the code in a challenge where you memorize a sequence, go through a distractor game, and recall the numbers. You can edit your own words by range and save them to the cloud. The same experience is available in the browser and as an Android APK.",
    },
    apkUrls: {
      es: "https://pub-2de970e8bf224791a9ab6d06fa62ce19.r2.dev/APKs/memoria-codigo.apk",
      en: "https://pub-2de970e8bf224791a9ab6d06fa62ce19.r2.dev/APKs/memory-code.apk",
    },
    webUrl: "/memoria",
    features: [
      { es: "Aprende el código de dígitos y consonantes antes de pasar a las palabras", en: "Learn the digit-and-consonant code before moving into words" },
      { es: "Juego de parejas por rangos: encuentra cada número con su palabra clave", en: "Range-based matching game: pair each number with its keyword" },
      { es: "Modo práctica en ambas direcciones: número→palabra y palabra→número", en: "Practice mode in both directions: number→word and word→number" },
      { es: "Tiempo de respuesta ajustable de 5 a 15 segundos, o práctica libre", en: "Adjustable response time from 5 to 15 seconds, or untimed practice" },
      { es: "Reto de memoria con secuencias numéricas, juego distractor y recuperación", en: "Memory challenge with number sequences, a distractor game, and recall" },
      { es: "Contador de aciertos, racha y retroalimentación inmediata", en: "Correct-answer count, streak tracking, and immediate feedback" },
      { es: "Edita tus propias palabras por rango y guárdalas en la nube", en: "Edit your own words by range and save them to the cloud" },
      { es: "Disponible en navegador y como APK para Android", en: "Available in the browser and as an Android APK" },
    ],
    icon: "/images/app-memoria.png",
  },
  {
    slug: "desglose-auditivo",
    name: { es: "Desglose", en: "Unlocking" },
    category: "ear-training",
    description: {
      es: "Entrena tu oído para aislar e identificar notas individuales dentro de acordes o texturas densas. La app reproduce de 2 a 6 notas simultáneas — tu objetivo es cantar cada una.",
      en: "Train your ear to isolate and identify individual notes within chords or dense textures. The app plays 2 to 6 simultaneous notes — your goal is to sing each one.",
    },
    webUrl: "/apps/desglose/jugar",
    gameUrl: "/apps/cosmic-ear/jugar",
    features: [
      { es: "Modo juego: Cosmic Ear, pilotea una nave 3D y resuelve planetas cantando", en: "Game mode: Cosmic Ear, pilot a 3D ship and clear planets by singing" },
      { es: "Dificultad ajustable (2 a 6 notas)", en: "Adjustable difficulty (2 to 6 notes)" },
      { es: "Rango seleccionable C2–C7", en: "Selectable range C2–C7" },
      { es: "Detección de afinación por micrófono (algoritmo YIN)", en: "Microphone pitch detection (YIN algorithm)" },
      { es: "5 timbres: piano, cello, corno, fagot y coro, más modo mixto", en: "5 timbres: piano, cello, horn, bassoon, and choir, plus a mixed mode" },
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
    webUrl: "/apps/intervalos-reconocimiento/jugar",
    gameUrl: "/apps/intervalos-reconocimiento/juego",
    gameLabel: { es: "Videojuego", en: "Video game" },
    features: [
      { es: "Videojuego retro: Synth-Kong, cruza sectores rumbo al planeta respondiendo intervalos", en: "Retro video game: Synth-Kong, cross sectors toward the planet by answering intervals" },
      { es: "Multi-tímbrica (5 timbres)", en: "Multi-timbral (5 timbres)" },
      { es: "Modos clásico, contrarreloj y supervivencia", en: "Classic, time attack, and survival modes" },
      { es: "Intervalos armónicos, melódicos y mixtos", en: "Harmonic, melodic, and mixed intervals" },
      { es: "Estadísticas locales por intervalo", en: "Local statistics by interval" },
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
    longDescription: {
      es: "Intervalos Cantados entrena la relación entre teoría, oído interno y voz. La app reproduce una nota inicial con diferentes timbres, te pide completar un intervalo ascendente o descendente, y evalúa tanto el nombre de la nota como la afinación cuando usas el modo híbrido. Incluye práctica libre, contrarreloj, supervivencia y estadísticas locales por intervalo.",
      en: "Sung Intervals trains the connection between theory, inner hearing, and voice. The app plays a starting note with different timbres, asks you to complete an ascending or descending interval, and evaluates both the note name and the sung pitch in hybrid mode. It includes free practice, time attack, survival, and local statistics by interval.",
    },
    webUrl: "/apps/intervalos-cantados/jugar",
    gameUrl: "/apps/intervalos-cantados/juego",
    features: [
      { es: "Modo híbrido: nomenclatura y afinación con micrófono", en: "Hybrid mode: note naming and microphone pitch checking" },
      { es: "Modo solo nomenclatura para practicar sin micrófono", en: "Nomenclature-only mode for practice without the microphone" },
      { es: "Intervalos ascendentes y descendentes: segundas, terceras, cuartas, quintas, sextas, séptimas y tritono", en: "Ascending and descending intervals: seconds, thirds, fourths, fifths, sixths, sevenths, and tritone" },
      { es: "Modos clásico, contrarreloj y supervivencia", en: "Classic, time attack, and survival modes" },
      { es: "5 timbres: piano, cello, corno, fagot y coro", en: "5 timbres: piano, cello, horn, bassoon, and choir" },
      { es: "Estadísticas locales por intervalo y dirección", en: "Local statistics by interval and direction" },
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
    longDescription: {
      es: "Reconocimiento de Acordes reproduce acordes con distintos timbres para entrenar la identificación auditiva de sus cualidades. Puedes elegir el rango, seleccionar familias de acordes, practicar en modo clásico, contrarreloj o supervivencia, y revisar estadísticas locales por tipo de acorde.",
      en: "Chord Recognition plays chords with different timbres so you can train the ear to identify harmonic qualities. You can choose the range, select chord families, practice in classic, time attack, or survival mode, and review local statistics by chord type.",
    },
    webUrl: "/apps/acordes/jugar",
    gameUrl: "/apps/acordes/juego",
    gameLabel: { es: "Modo juego 3D", en: "3D game mode" },
    features: [
      { es: "Modo juego 3D: Batisfera, desciende a la fosa y captura criaturas reconociendo acordes", en: "3D game mode: Bathysphere, descend into the trench and capture creatures by recognizing chords" },
      { es: "Multi-tímbrica (5 timbres)", en: "Multi-timbral (5 timbres)" },
      { es: "Rango seleccionable", en: "Selectable range" },
      { es: "Modos clásico, contrarreloj y supervivencia", en: "Classic, time attack, and survival modes" },
      { es: "Estadísticas locales por tipo de acorde", en: "Local statistics by chord type" },
      { es: "Dificultad progresiva hasta acordes con 13ª", en: "Progressive difficulty up to 13th chords" },
    ],
    icon: "/images/app-acordes.jpeg",
  },
  {
    slug: "acordes-cantar",
    name: { es: "Cantar Acordes", en: "Sing Chords" },
    category: "ear-training",
    description: {
      es: "Entrena la afinación cantando las notas de acordes de dificultad progresiva. La app escucha tu voz con el micrófono y evalúa tu precisión en tiempo real.",
      en: "Train your pitch by singing the notes of progressively challenging chords. The app listens to your voice through the microphone and evaluates your accuracy in real time.",
    },
    webUrl: "/apps/acordes-cantar/jugar",
    features: [
      { es: "Detección de afinación por micrófono", en: "Microphone pitch detection" },
      { es: "Rangos vocales: varón F2–G4, dama G3–A5", en: "Vocal ranges: male F2–G4, female G3–A5" },
      { es: "Multi-tímbrica (5 timbres)", en: "Multi-timbral (5 timbres)" },
      { es: "Dificultad progresiva hasta acordes con 13ª", en: "Progressive difficulty up to 13th chords" },
    ],
    icon: "/images/app-acordes-cantar.jpeg",
  },
  {
    slug: "grados-mayores",
    name: { es: "Grados Escala Mayor", en: "Major Scale Degrees" },
    category: "ear-training",
    description: {
      es: "Desarrolla la percepción de la función tonal de cada nota en tonalidades mayores. Reconoce grados diatónicos y cromáticos en contexto.",
      en: "Develop perception of the tonal function of each note in major keys. Recognize diatonic and chromatic degrees in context.",
    },
    webUrl: "/apps/grados-mayores/jugar",
    features: [
      { es: "15 tonalidades mayores y 5 timbres", en: "15 major keys and 5 timbres" },
      { es: "Modos clásico, contrarreloj y supervivencia", en: "Classic, time attack, and survival modes" },
      { es: "Grados diatónicos y cromáticos", en: "Diatonic and chromatic degrees" },
      { es: "Centro tonal y estadísticas por grado", en: "Tonal center and per-degree statistics" },
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
    longDescription: {
      es: "Practica el reconocimiento de grados en escalas menores con centro tonal, timbres múltiples, modos clásico, contrarreloj y supervivencia, además de estadísticas locales por grado.",
      en: "Practice recognizing minor-scale degrees with a tonal center, multiple timbres, classic, time attack, and survival modes, plus local per-degree statistics.",
    },
    webUrl: "/apps/grados-menores/jugar",
    features: [
      { es: "15 tonalidades menores y 5 timbres", en: "15 minor keys and 5 timbres" },
      { es: "Modos clásico, contrarreloj y supervivencia", en: "Classic, time attack, and survival modes" },
      { es: "Grados diatónicos y cromáticos del modo menor", en: "Minor-mode diatonic and chromatic degrees" },
      { es: "Centro tonal menor y estadísticas por grado", en: "Minor tonal center and per-degree statistics" },
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
    longDescription: {
      es: "Oído Absoluto Multi-tímbrico entrena el reconocimiento de notas absolutas con piano, cello, corno, coro y fagot. Puedes seleccionar exactamente qué notas estudiar entre C2 y C7, activar loop para escuchar con calma, ajustar el volumen y practicar en modo clásico, contrarreloj o supervivencia. La app guarda estadísticas locales por nota para ayudarte a detectar qué alturas conviene reforzar.",
      en: "Perfect Pitch Multi-timbral trains absolute-note recognition with piano, cello, horn, choir, and bassoon. You can choose exactly which notes to study from C2 to C7, enable looping for focused listening, adjust volume, and practice in classic, time attack, or survival mode. The app saves local per-note statistics so you can see which pitches need more work.",
    },
    webUrl: "/apps/oido-absoluto-multi/jugar",
    gameUrl: "/apps/oido-absoluto-multi/juego",
    gameLabel: { es: "Modo juego 3D", en: "3D game mode" },
    features: [
      { es: "Modo juego 3D: Walking AP Multi, explora cinco mundos y abre compuertas reconociendo notas", en: "3D game mode: Walking AP Multi, explore five worlds and unlock gates by recognizing notes" },
      { es: "5 timbres: piano, cello, corno, fagot y coro", en: "5 timbres: piano, cello, horn, bassoon, and choir" },
      { es: "Selección precisa de notas entre C2 y C7", en: "Precise note selection from C2 to C7" },
      { es: "Modos clásico, contrarreloj y supervivencia", en: "Classic, time attack, and survival modes" },
      { es: "Audio en loop, control de volumen y retroalimentación inmediata", en: "Looping audio, volume control, and immediate feedback" },
      { es: "Estadísticas locales por nota", en: "Local statistics by note" },
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
    longDescription: {
      es: "Entrena el reconocimiento de notas absolutas con samples reales de guitarra clásica por cuerda. Puedes seleccionar exactamente qué notas estudiar, activar loop para escuchar con calma y practicar en modo clásico, contrarreloj o supervivencia. La app guarda estadísticas locales para ayudarte a detectar qué notas conviene reforzar.",
      en: "Train absolute-note recognition with real classical-guitar samples by string. You can choose exactly which notes to study, enable looping for focused listening, and practice in classic, time attack, or survival mode. The app saves local statistics so you can see which notes need more work.",
    },
    webUrl: "/apps/oido-absoluto-guitarra/jugar",
    features: [
      { es: "Samples reales de guitarra clásica organizados por cuerda", en: "Real classical-guitar samples organized by string" },
      { es: "Selección precisa de notas para sesiones enfocadas", en: "Precise note selection for focused sessions" },
      { es: "Modos clásico, contrarreloj y supervivencia", en: "Classic, time attack, and survival modes" },
      { es: "Audio en loop, control de volumen y retroalimentación inmediata", en: "Looping audio, volume control, and immediate feedback" },
      { es: "Estadísticas locales por nota", en: "Local statistics by note" },
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
    isTool: true,
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
