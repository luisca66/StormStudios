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
    "out/**",
    "build/**",
    // Apps construidas/vendored: bundles y fuentes copiadas, no las linteamos.
    "public/apps/**",
    // Sub-proyecto Vite de Desglose: tiene su propio toolchain/tsconfig.
    "apps-src/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Cosmética: apóstrofos/comillas en texto JSX se renderizan bien sin escapar.
      // Desactivar evita ruido en todo el contenido bilingüe del sitio.
      "react/no-unescaped-entities": "off",
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
    },
  },
]);

export default eslintConfig;
