import type { BilingualText } from "@/types/course";

export type AppEntry = {
  slug: string;
  name: BilingualText;
  category: "ear-training" | "cognitive" | "theory" | "sequencer" | "other";
  description: BilingualText;
  longDescription?: BilingualText;
  playStoreUrl?: string;
  kindleManualUrl?: string;
  webUrl?: string; // si tiene versión web
  icon?: string; // ruta en /public/images/apps/
  screenshots?: string[];
  features?: BilingualText[];
  isWeb?: boolean; // true si es app web (no Android)
};

/**
 * Catálogo de las 10 apps educativas de Storm Studios Learning.
 *
 * TODO: Completar URLs de Google Play, manuales Kindle, iconos e
 * imágenes de capturas de pantalla para cada app.
 */
export const APPS: AppEntry[] = [
  {
    slug: "desglose-auditivo",
    name: {
      es: "Desglose Auditivo",
      en: "Auditory Breakdown",
    },
    category: "ear-training",
    description: {
      es: "Entrena tu oído para reconocer e identificar los componentes del sonido musical.",
      en: "Train your ear to recognize and identify the components of musical sound.",
    },
    playStoreUrl: undefined, // TODO: agregar URL de Google Play
    kindleManualUrl: undefined, // TODO: agregar URL de manual Kindle
    icon: "/images/apps/desglose-auditivo.png",
    features: [
      {
        es: "Entrenamiento multi-tímbrico (Cello, Corno Francés, Coro, Cuerdas, Piano)",
        en: "Multi-timbral training (Cello, French Horn, Choir, Strings, Piano)",
      },
    ],
  },
  {
    slug: "matematicas-mentales",
    name: {
      es: "Matemáticas Mentales",
      en: "Mental Math",
    },
    category: "cognitive",
    description: {
      es: "Ejercicios de cálculo mental inspirados en el método Dr. Kawashima para potenciar el cerebro.",
      en: "Mental calculation exercises inspired by the Dr. Kawashima method to boost brain power.",
    },
    playStoreUrl: undefined, // TODO
    kindleManualUrl: undefined, // TODO
    icon: "/images/apps/matematicas-mentales.png",
    features: [
      { es: "Niveles progresivos", en: "Progressive levels" },
      { es: "Estadísticas de mejora", en: "Improvement statistics" },
    ],
  },
  {
    slug: "dictado-ritmico",
    name: {
      es: "Dictado Rítmico",
      en: "Rhythmic Dictation",
    },
    category: "ear-training",
    description: {
      es: "Desarrolla tu sentido rítmico transcribiendo patrones que escuchas.",
      en: "Develop your rhythmic sense by transcribing patterns you hear.",
    },
    playStoreUrl: undefined, // TODO
    kindleManualUrl: undefined, // TODO
    icon: "/images/apps/dictado-ritmico.png",
    features: [],
  },
  {
    slug: "intervalos",
    name: {
      es: "Intervalos",
      en: "Intervals",
    },
    category: "ear-training",
    description: {
      es: "Aprende a identificar y cantar todos los intervalos musicales.",
      en: "Learn to identify and sing all musical intervals.",
    },
    playStoreUrl: undefined, // TODO
    kindleManualUrl: undefined, // TODO
    icon: "/images/apps/intervalos.png",
    features: [],
  },
  {
    slug: "acordes",
    name: {
      es: "Acordes",
      en: "Chords",
    },
    category: "ear-training",
    description: {
      es: "Identifica tríadas y acordes de séptima al oído.",
      en: "Identify triads and seventh chords by ear.",
    },
    playStoreUrl: undefined, // TODO
    kindleManualUrl: undefined, // TODO
    icon: "/images/apps/acordes.png",
    features: [],
  },
  {
    slug: "escalas",
    name: {
      es: "Escalas",
      en: "Scales",
    },
    category: "theory",
    description: {
      es: "Estudia y practica escalas mayores, menores y modales.",
      en: "Study and practice major, minor and modal scales.",
    },
    playStoreUrl: undefined, // TODO
    kindleManualUrl: undefined, // TODO
    icon: "/images/apps/escalas.png",
    features: [],
  },
  {
    slug: "solfeo",
    name: {
      es: "Solfeo",
      en: "Solfège",
    },
    category: "ear-training",
    description: {
      es: "Practica la lectura musical a primera vista con solfeo melódico.",
      en: "Practice sight-reading with melodic solfège.",
    },
    playStoreUrl: undefined, // TODO
    kindleManualUrl: undefined, // TODO
    icon: "/images/apps/solfeo.png",
    features: [],
  },
  {
    slug: "progresiones",
    name: {
      es: "Progresiones",
      en: "Progressions",
    },
    category: "theory",
    description: {
      es: "Comprende y escucha progresiones armónicas en contexto musical.",
      en: "Understand and hear harmonic progressions in musical context.",
    },
    playStoreUrl: undefined, // TODO
    kindleManualUrl: undefined, // TODO
    icon: "/images/apps/progresiones.png",
    features: [],
  },
  {
    slug: "ritmo-corporal",
    name: {
      es: "Ritmo Corporal",
      en: "Body Rhythm",
    },
    category: "ear-training",
    description: {
      es: "Internaliza el ritmo a través del movimiento corporal consciente.",
      en: "Internalize rhythm through conscious body movement.",
    },
    playStoreUrl: undefined, // TODO
    kindleManualUrl: undefined, // TODO
    icon: "/images/apps/ritmo-corporal.png",
    features: [],
  },
  {
    slug: "storm-sequencer",
    name: {
      es: "Storm Sequencer v3.0",
      en: "Storm Sequencer v3.0",
    },
    category: "sequencer",
    description: {
      es: "Secuenciador musical online para componer y experimentar con armonía.",
      en: "Online music sequencer for composing and experimenting with harmony.",
    },
    webUrl: "/sequencer", // es una app web
    isWeb: true,
    icon: "/images/apps/storm-sequencer.png",
    features: [
      { es: "Disponible en el navegador, sin descarga", en: "Available in browser, no download needed" },
    ],
  },
];

/**
 * Obtiene una app por su slug
 */
export function getAppBySlug(slug: string): AppEntry | undefined {
  return APPS.find((app) => app.slug === slug);
}

/**
 * Obtiene todas las apps por categoría
 */
export function getAppsByCategory(category: AppEntry["category"]): AppEntry[] {
  return APPS.filter((app) => app.category === category);
}
