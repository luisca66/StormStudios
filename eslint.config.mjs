import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    ".local-work/**",
    // Apps construidas/vendored: bundles y fuentes copiadas, no las linteamos.
    "public/apps/**",
    "public/vendor/**",
    // Sub-proyecto Vite de Desglose: tiene su propio toolchain/tsconfig.
    "apps-src/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Cosmética: apóstrofos/comillas en texto JSX se renderizan bien sin escapar.
      // Desactivar evita ruido en todo el contenido bilingüe del sitio.
      "react/no-unescaped-entities": "off",
      // Regla de Luis: los módulos de modo autor jamás se importan desde código público.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/sequencer/harmony/score-bridge",
                "@/lib/sequencer/harmony/realize",
                "@/lib/sequencer/harmony/harmonize",
                "@/lib/sequencer/harmony/voicing",
                "@/lib/sequencer/harmony/review",
                "@/lib/sequencer/harmony/transpose",
                "**/lib/sequencer/harmony/score-bridge*",
                "**/lib/sequencer/harmony/realize*",
                "**/lib/sequencer/harmony/harmonize*",
                "**/lib/sequencer/harmony/voicing*",
                "**/lib/sequencer/harmony/review*",
                "**/lib/sequencer/harmony/transpose*",
              ],
              message:
                "Los módulos de modo autor (generar voces, armonizar, revisar, transportar) solo pueden importarse desde AuthorPanel, lib/sequencer/harmony o pruebas.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "components/sequencer/v5/AuthorPanel.tsx",
      "lib/sequencer/harmony/**/*.ts",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // Usar `@/i18n/navigation` para enlaces internos localizados y evitar rutas /en/curso-armonia.
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: [
      "app/not-found.tsx",
      "components/blog/BlogCard.tsx",
      "components/blog/BlogLayout.tsx",
      "components/sequencer/v5/AuthorPanel.tsx",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message: "Usa `Link` de `@/i18n/navigation` para mantener las rutas localizadas.",
            },
          ],
          patterns: [
            {
              group: [
                "@/lib/sequencer/harmony/score-bridge",
                "@/lib/sequencer/harmony/realize",
                "@/lib/sequencer/harmony/harmonize",
                "@/lib/sequencer/harmony/voicing",
                "@/lib/sequencer/harmony/review",
                "@/lib/sequencer/harmony/transpose",
                "**/lib/sequencer/harmony/score-bridge*",
                "**/lib/sequencer/harmony/realize*",
                "**/lib/sequencer/harmony/harmonize*",
                "**/lib/sequencer/harmony/voicing*",
                "**/lib/sequencer/harmony/review*",
                "**/lib/sequencer/harmony/transpose*",
              ],
              message:
                "Los módulos de modo autor solo pueden importarse desde AuthorPanel, lib/sequencer/harmony o pruebas.",
            },
          ],
        },
      ],
    },
  },
  {
    // App "Elefantito" portada (juego interactivo, client-only y noIndex). Las
    // reglas del React Compiler de Next 16 marcan patrones correctos aquí:
    // efectos que inicializan estado desde localStorage, handlers mutuamente
    // recursivos del game loop, y aleatoriedad dentro de event handlers. Un
    // refactor para satisfacerlas tiene más riesgo de regresión que valor.
    files: ["components/apps/elefantito-nextjs/**/*.{js,jsx}"],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/exhaustive-deps": "off",
      // Sprites de pixel-art (varios animados / servidos desde CDN R2): next/image
      // no aporta y rompería el render del juego.
      "@next/next/no-img-element": "off",
      // El cambio de idioma del juego recarga la página a propósito para reiniciar su estado.
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
]);

export default eslintConfig;
