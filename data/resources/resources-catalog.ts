import type { Locale } from "@/i18n/routing";
import type { BilingualText } from "@/types/course";

type ResourceSection = {
  title: BilingualText;
  paragraphs: BilingualText[];
  bullets?: BilingualText[];
};

type ResourceLink = {
  href: "/curso-armonia" | "/apps" | "/mi-metodo" | "/blog" | "/contacto" | "/resources";
  label: BilingualText;
  description: BilingualText;
};

export type ResourceEntry = {
  key: string;
  slugs: Record<Locale, string>;
  title: BilingualText;
  metaTitle: BilingualText;
  metaDescription: BilingualText;
  intro: BilingualText;
  sections: ResourceSection[];
  cta: {
    href: ResourceLink["href"];
    title: BilingualText;
    description: BilingualText;
    label: BilingualText;
  };
  relatedLinks: ResourceLink[];
};

export const RESOURCES: ResourceEntry[] = [
  {
    key: "traditional-harmony-course",
    slugs: {
      en: "traditional-harmony-course",
      es: "curso-de-armonia-tradicional",
    },
    title: {
      en: "Traditional Harmony Course",
      es: "Curso de Armonía Tradicional",
    },
    metaTitle: {
      en: "Traditional Harmony Course | Shostakovich, Medrano and Cardenas",
      es: "Curso de Armonía Tradicional | Shostakovich, Medrano y Cárdenas",
    },
    metaDescription: {
      en: "Study a traditional harmony course rooted in the Shostakovich-Medrano-Cardenas lineage, with free lessons, ear training and MIDI feedback.",
      es: "Estudia un curso de armonía tradicional basado en el linaje Shostakovich-Medrano-Cárdenas, con lecciones gratis, entrenamiento auditivo y retroalimentación MIDI.",
    },
    intro: {
      en: "This page explains what makes the Storm Studios Learning traditional harmony course different: rigorous voice-leading, practical analysis, ear training and a free path into tonal writing.",
      es: "Esta página explica qué hace distinto al curso de armonía tradicional de Storm Studios Learning: conducción de voces rigurosa, análisis práctico, entrenamiento auditivo y una ruta gratuita hacia la escritura tonal.",
    },
    sections: [
      {
        title: {
          en: "A harmony course built on lineage, not shortcuts",
          es: "Un curso de armonia construido sobre linaje, no sobre atajos",
        },
        paragraphs: [
          {
            en: "The course is rooted in the pedagogical lineage that runs from the Russian conservatory tradition through Dmitri Shostakovich, Humberto Hernandez Medrano and Luis Cardenas. That lineage matters because it treats harmony as a way of hearing and thinking, not only as a set of labels.",
            es: "El curso esta basado en el linaje pedagogico que va de la tradicion del conservatorio ruso a Dmitri Shostakovich, Humberto Hernandez Medrano y Luis Cardenas. Ese linaje importa porque trata la armonia como una forma de escuchar y pensar, no solo como un conjunto de etiquetas.",
          },
          {
            en: "Instead of jumping straight to chord recipes, students work with intervals, voice ranges, SATB writing and harmonic analysis so that traditional harmony becomes usable in real music.",
            es: "En lugar de saltar directo a recetas de acordes, los estudiantes trabajan con intervalos, registros de voz, escritura SATB y analisis armonico para que la armonia tradicional se vuelva util en musica real.",
          },
        ],
      },
      {
        title: {
          en: "What you study inside the free lessons",
          es: "Que estudias dentro de las lecciones gratis",
        },
        paragraphs: [
          {
            en: "The free harmony lessons begin with preparatory material and move toward four-part writing, voice leading, harmonic function and analytical listening. The goal is to develop musicians who can write, hear and evaluate harmony with control.",
            es: "Las lecciones gratis de armonia comienzan con material propedeutico y avanzan hacia la escritura a cuatro voces, la conduccion de voces, la funcion armonica y la escucha analitica. La meta es formar musicos que puedan escribir, escuchar y evaluar armonia con control.",
          },
        ],
        bullets: [
          {
            en: "Traditional harmony and tonal analysis",
            es: "Armonia tradicional y analisis tonal",
          },
          {
            en: "SATB voice leading and harmonic grammar",
            es: "Conduccion de voces SATB y gramatica armonica",
          },
          {
            en: "Ear training that supports written harmony",
            es: "Entrenamiento auditivo que sostiene la armonia escrita",
          },
        ],
      },
      {
        title: {
          en: "Why ear training is part of the course",
          es: "Por que el entrenamiento auditivo es parte del curso",
        },
        paragraphs: [
          {
            en: "A traditional harmony course only works when the ear develops alongside the written work. That is why Storm Studios connects the course with apps, interval work and the Virtual Teacher instead of treating harmony and ear training as separate subjects.",
            es: "Un curso de armonia tradicional solo funciona cuando el oido se desarrolla junto con el trabajo escrito. Por eso Storm Studios conecta el curso con apps, trabajo de intervalos y el Maestro Virtual en lugar de tratar armonia y entrenamiento auditivo como materias separadas.",
          },
        ],
      },
    ],
    cta: {
      href: "/curso-armonia",
      title: {
        en: "Start the free harmony course",
        es: "Empieza el curso de armonia gratis",
      },
      description: {
        en: "Go from the overview to the actual lessons, exercises and sequencer workflow.",
        es: "Pasa de la vision general a las lecciones, ejercicios y flujo de trabajo con secuenciador.",
      },
      label: {
        en: "Open the course",
        es: "Abrir el curso",
      },
    },
    relatedLinks: [
      {
        href: "/apps",
        label: {
          en: "Ear training apps",
          es: "Apps de entrenamiento auditivo",
        },
        description: {
          en: "Use the apps that reinforce intervals, memory and listening.",
          es: "Usa las apps que refuerzan intervalos, memoria y escucha.",
        },
      },
      {
        href: "/mi-metodo",
        label: {
          en: "Read about the method",
          es: "Leer sobre el metodo",
        },
        description: {
          en: "See the wider philosophy behind the course.",
          es: "Conoce la filosofia mas amplia detras del curso.",
        },
      },
      {
        href: "/blog",
        label: {
          en: "Explore harmony articles",
          es: "Explorar articulos de armonia",
        },
        description: {
          en: "Read analysis and pedagogical essays that support the course.",
          es: "Lee analisis y ensayos pedagogicos que complementan el curso.",
        },
      },
    ],
  },
  {
    key: "ear-training-exercises",
    slugs: {
      en: "ear-training-exercises",
      es: "ejercicios-de-entrenamiento-auditivo",
    },
    title: {
      en: "Ear Training Exercises",
      es: "Ejercicios de Entrenamiento Auditivo",
    },
    metaTitle: {
      en: "Ear Training Exercises | Listening, Singing and Harmonic Awareness",
      es: "Ejercicios de Entrenamiento Auditivo | Escucha, Canto y Conciencia Armónica",
    },
    metaDescription: {
      en: "Discover ear training exercises that connect interval recognition, harmonic hearing, memory and practical musicianship through Storm Studios Learning.",
      es: "Descubre ejercicios de entrenamiento auditivo que conectan reconocimiento de intervalos, escucha armónica, memoria y práctica musical en Storm Studios Learning.",
    },
    intro: {
      en: "Ear training exercises are most useful when they move beyond guessing isolated sounds and begin to shape the way you hear melody, harmony and musical structure.",
      es: "Los ejercicios de entrenamiento auditivo son más útiles cuando van más allá de adivinar sonidos aislados y empiezan a moldear la forma en que escuchas melodía, armonía y estructura musical.",
    },
    sections: [
      {
        title: {
          en: "From isolated drills to musical listening",
          es: "De los ejercicios aislados a la escucha musical",
        },
        paragraphs: [
          {
            en: "Storm Studios uses ear training exercises that support real musicianship: hearing intervals in context, recognizing tonal function, separating voices and checking what you write against what you actually hear.",
            es: "Storm Studios usa ejercicios de entrenamiento auditivo que apoyan una musicalidad real: escuchar intervalos en contexto, reconocer funcion tonal, separar voces y comprobar lo que escribes contra lo que realmente oyes.",
          },
        ],
        bullets: [
          {
            en: "Interval recognition and interval singing",
            es: "Reconocimiento de intervalos y canto de intervalos",
          },
          {
            en: "Chord and scale-degree hearing",
            es: "Escucha de acordes y grados de escala",
          },
          {
            en: "Memory and multi-timbral listening",
            es: "Memoria y escucha multi timbrica",
          },
        ],
      },
      {
        title: {
          en: "Why ear training belongs with harmony and theory",
          es: "Por qué el entrenamiento auditivo pertenece junto a armonía y teoría",
        },
        paragraphs: [
          {
            en: "Ear training, music theory and harmony lessons work best together. When students analyze a progression, sing intervals and write voices in parallel, they build inner hearing instead of disconnected skills.",
            es: "El entrenamiento auditivo, la teoria musical y las lecciones de armonia funcionan mejor juntos. Cuando los estudiantes analizan una progresion, cantan intervalos y escriben voces en paralelo, construyen oido interno en lugar de habilidades desconectadas.",
          },
        ],
      },
      {
        title: {
          en: "How to practice without turning it into noise",
          es: "Cómo practicar sin volverlo ruido",
        },
        paragraphs: [
          {
            en: "Short, focused sessions are more valuable than random repetition. Choose one listening target, work slowly, sing back what you hear and connect each exercise with a practical goal inside the course or your instrument.",
            es: "Sesiones cortas y enfocadas valen mas que la repeticion aleatoria. Elige un objetivo auditivo, trabaja lento, canta lo que oyes y conecta cada ejercicio con una meta practica dentro del curso o de tu instrumento.",
          },
        ],
      },
    ],
    cta: {
      href: "/apps",
      title: {
        en: "Practice with the listening apps",
        es: "Practica con las apps de escucha",
      },
      description: {
        en: "Open the apps library and choose exercises for intervals, memory and tonal hearing.",
        es: "Abre la biblioteca de apps y elige ejercicios para intervalos, memoria y escucha tonal.",
      },
      label: {
        en: "See the apps",
        es: "Ver las apps",
      },
    },
    relatedLinks: [
      {
        href: "/curso-armonia",
        label: {
          en: "Harmony course",
          es: "Curso de armonia",
        },
        description: {
          en: "Use ear training in direct connection with written harmony.",
          es: "Usa el entrenamiento auditivo en conexion directa con la armonia escrita.",
        },
      },
      {
        href: "/blog",
        label: {
          en: "Theory and analysis blog",
          es: "Blog de teoría y análisis",
        },
        description: {
          en: "Read essays that explain what to listen for and why.",
          es: "Lee textos que explican que escuchar y por que.",
        },
      },
      {
        href: "/resources",
        label: {
          en: "More study guides",
          es: "Más guías de estudio",
        },
        description: {
          en: "Browse more topic pages for music theory and interval work.",
          es: "Consulta mas paginas tematicas sobre teoria musical e intervalos.",
        },
      },
    ],
  },
  {
    key: "interval-recognition",
    slugs: {
      en: "interval-recognition",
      es: "reconocimiento-de-intervalos",
    },
    title: {
      en: "Interval Recognition",
      es: "Reconocimiento de Intervalos",
    },
    metaTitle: {
      en: "Interval Recognition | Learn to Hear and Sing Musical Intervals",
      es: "Reconocimiento de Intervalos | Aprende a Escuchar y Cantar Intervalos Musicales",
    },
    metaDescription: {
      en: "Build interval recognition through listening, singing and context-based practice, with interval tools and ear training resources from Storm Studios Learning.",
      es: "Desarrolla el reconocimiento de intervalos mediante escucha, canto y práctica contextual, con herramientas y recursos de Storm Studios Learning.",
    },
    intro: {
      en: "Interval recognition is one of the foundations of ear training because it helps you hear distance, direction and function before you ever label a chord.",
      es: "El reconocimiento de intervalos es uno de los fundamentos del entrenamiento auditivo porque te ayuda a escuchar distancia, dirección y función antes de etiquetar un acorde.",
    },
    sections: [
      {
        title: {
          en: "What interval recognition actually develops",
          es: "Qué desarrolla realmente el reconocimiento de intervalos",
        },
        paragraphs: [
          {
            en: "Learning intervals is not just memorizing a list of names. It improves melodic hearing, harmonic awareness and the ability to anticipate how voices move inside tonal music.",
            es: "Aprender intervalos no es solo memorizar una lista de nombres. Mejora la escucha melodica, la conciencia armonica y la capacidad de anticipar como se mueven las voces dentro de la musica tonal.",
          },
        ],
      },
      {
        title: {
          en: "A better way to practice intervals",
          es: "Una mejor forma de practicar intervalos",
        },
        paragraphs: [
          {
            en: "Work both melodically and harmonically. Hear the interval, sing it back, then place it inside scales, chords and real lines. That is how interval recognition becomes useful in music theory and harmony lessons.",
            es: "Trabaja de forma melodica y armonica. Escucha el intervalo, cantalo de regreso y luego colocalo dentro de escalas, acordes y lineas reales. Asi es como el reconocimiento de intervalos se vuelve util en teoria musical y en las lecciones de armonia.",
          },
        ],
        bullets: [
          {
            en: "Recognize ascending and descending motion",
            es: "Reconoce movimiento ascendente y descendente",
          },
          {
            en: "Practice with multiple timbres and registers",
            es: "Practica con multiples timbres y registros",
          },
          {
            en: "Relate each interval to tonal context",
            es: "Relaciona cada intervalo con el contexto tonal",
          },
        ],
      },
      {
        title: {
          en: "How it connects to the Storm method",
          es: "Cómo se conecta con el método Storm",
        },
        paragraphs: [
          {
            en: "Interval work supports the broader method by strengthening the ear before and during harmonic writing. It prepares students for more advanced listening tasks such as chord recognition, voice separation and harmonic analysis.",
            es: "El trabajo de intervalos apoya el metodo mas amplio al fortalecer el oido antes y durante la escritura armonica. Prepara a los estudiantes para tareas auditivas mas avanzadas como reconocimiento de acordes, separacion de voces y analisis armonico.",
          },
        ],
      },
    ],
    cta: {
      href: "/apps",
      title: {
        en: "Use the interval tools",
        es: "Usa las herramientas de intervalos",
      },
      description: {
        en: "Practice interval recognition with the listening and singing apps.",
        es: "Practica reconocimiento de intervalos con las apps de escucha y canto.",
      },
      label: {
        en: "Practice intervals",
        es: "Practicar intervalos",
      },
    },
    relatedLinks: [
      {
        href: "/curso-armonia",
        label: {
          en: "Why intervals matter in harmony",
          es: "Por que importan los intervalos en armonia",
        },
        description: {
          en: "Connect interval practice with four-part writing and analysis.",
          es: "Conecta la practica de intervalos con la escritura a cuatro voces y el analisis.",
        },
      },
      {
        href: "/mi-metodo",
        label: {
          en: "Read the method",
          es: "Leer el metodo",
        },
        description: {
          en: "See how listening, body and memory are integrated.",
          es: "Ve como se integran escucha, cuerpo y memoria.",
        },
      },
      {
        href: "/blog",
        label: {
          en: "Read interval-related articles",
          es: "Leer articulos relacionados",
        },
        description: {
          en: "Go deeper with analysis and explanatory writing.",
          es: "Profundiza con analisis y textos explicativos.",
        },
      },
    ],
  },
  {
    key: "music-theory-basics",
    slugs: {
      en: "music-theory-basics",
      es: "fundamentos-de-teoria-musical",
    },
    title: {
      en: "Music Theory Basics",
      es: "Fundamentos de Teoría Musical",
    },
    metaTitle: {
      en: "Music Theory Basics | A Practical Path into Harmony and Ear Training",
      es: "Fundamentos de Teoría Musical | Una Ruta Práctica hacia Armonía y Entrenamiento Auditivo",
    },
    metaDescription: {
      en: "Review practical music theory basics such as notation, intervals, scales, function and voice leading inside the Storm Studios Learning approach.",
      es: "Repasa fundamentos prácticos de teoría musical como notación, intervalos, escalas, función y conducción de voces dentro del enfoque de Storm Studios Learning.",
    },
    intro: {
      en: "Music theory basics matter when they help you read, hear, write and analyze better. The goal is not to memorize disconnected terms, but to understand how music behaves.",
      es: "Los fundamentos de teoría musical importan cuando te ayudan a leer, escuchar, escribir y analizar mejor. La meta no es memorizar términos desconectados, sino entender cómo se comporta la música.",
    },
    sections: [
      {
        title: {
          en: "What belongs in a real theory foundation",
          es: "Qué pertenece a una base real de teoría",
        },
        paragraphs: [
          {
            en: "A strong beginner foundation includes notation, clefs, intervals, scales, tonal function and the beginnings of voice leading. Those topics support every later step in harmony lessons and ear training.",
            es: "Una base solida para principiantes incluye notacion, claves, intervalos, escalas, funcion tonal y los inicios de la conduccion de voces. Esos temas sostienen cada paso posterior en las lecciones de armonia y en el entrenamiento auditivo.",
          },
        ],
        bullets: [
          {
            en: "Reading notation and understanding register",
            es: "Leer notacion y entender el registro",
          },
          {
            en: "Hearing intervals, scales and tonal gravity",
            es: "Escuchar intervalos, escalas y gravedad tonal",
          },
          {
            en: "Applying theory in writing and analysis",
            es: "Aplicar teoria en escritura y analisis",
          },
        ],
      },
      {
        title: {
          en: "Theory without listening is incomplete",
          es: "La teoría sin escucha es incompleta",
        },
        paragraphs: [
          {
            en: "Storm Studios treats music theory as something you hear and test, not only something you name. That makes the basics more durable and prepares students for practical harmony work.",
            es: "Storm Studios trata la teoria musical como algo que se escucha y se pone a prueba, no solo como algo que se nombra. Eso vuelve mas duraderos los fundamentos y prepara a los estudiantes para el trabajo armonico practico.",
          },
        ],
      },
      {
        title: {
          en: "Where to go after the basics",
          es: "A dónde ir después de los fundamentos",
        },
        paragraphs: [
          {
            en: "Once the basics are stable, students can move into traditional harmony, voice leading, interval work and analytical listening. That progression is exactly how the course is structured.",
            es: "Una vez que los fundamentos estan estables, los estudiantes pueden pasar a armonia tradicional, conduccion de voces, trabajo de intervalos y escucha analitica. Esa progresion es exactamente como esta estructurado el curso.",
          },
        ],
      },
    ],
    cta: {
      href: "/curso-armonia",
      title: {
        en: "Continue with the harmony lessons",
        es: "Continúa con las lecciones de armonía",
      },
      description: {
        en: "Use the course as the next step after your music theory basics.",
        es: "Usa el curso como el siguiente paso después de tus fundamentos de teoría musical.",
      },
      label: {
        en: "Start learning",
        es: "Empezar a aprender",
      },
    },
    relatedLinks: [
      {
        href: "/apps",
        label: {
          en: "Practice theory with apps",
          es: "Practicar teoría con apps",
        },
        description: {
          en: "Reinforce the basics through ear and memory tools.",
          es: "Refuerza los fundamentos con herramientas de oido y memoria.",
        },
      },
      {
        href: "/blog",
        label: {
          en: "Read explanatory articles",
          es: "Leer artículos explicativos",
        },
        description: {
          en: "Add context with essays on method and analysis.",
          es: "Agrega contexto con textos sobre metodo y analisis.",
        },
      },
      {
        href: "/resources",
        label: {
          en: "Browse all study guides",
          es: "Ver todas las guías",
        },
        description: {
          en: "Move from theory basics into harmony and interval topics.",
          es: "Pasa de los fundamentos de teoria a temas de armonia e intervalos.",
        },
      },
    ],
  },
];

export function getAllResources() {
  return RESOURCES;
}

export function getResourceBySlug(locale: Locale, slug: string) {
  return RESOURCES.find((resource) => resource.slugs[locale] === slug);
}

export function getResourceUrls(resource: ResourceEntry) {
  return {
    es: `/es/recursos/${resource.slugs.es}`,
    en: `/en/resources/${resource.slugs.en}`,
  };
}
