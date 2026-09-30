# Notas de Generación de Storyboards (Gemini)

## Resumen por archivo

- `apps-src/_storyboards/es/02-leccion-1.json`: 13 stills (construcción de escala mayor, semitonos Mi-Fa y Si-Do, círculo de quintas ascendente y descendente, enarmonía Fa♯ vs Sol♭).
- `apps-src/_storyboards/es/03-leccion-2.json`: 13 stills (presentación de los 7 modos paralelos sobre tónica Do, notas características y orden de brillo).
- `apps-src/_storyboards/es/04-leccion-3.json`: 12 stills (relativa menor, falta de sensible en natural, 2ª aumentada en armónica, melódica ascendente y descendente, enarmonía Sol♯ vs La♭).
- `apps-src/_storyboards/es/06-leccion-5.json`: 12 stills (segunda inversión coral a 4 voces SATB: duplicación obligada de quinta/bajo, cadencia I⁶₄ → V → I, ⁶₄ de paso, ⁶₄ de bordadura y coral completo de 4 compases).

## Dudas y precisiones armónicas observadas

1. **Lección 5 — Intervalos y resolución en la cadencia I⁶₄**:
   En el texto original de `content/course/es/06-leccion-5.mdx` (línea 17) se lee:
   > *"La sexta (Do) y la cuarta (Mi) resuelven por grado descendente a la quinta (Si) y la tercera (Sol) del acorde de dominante"*
   - **Precisión armónica**: Sobre el bajo Sol en Do Mayor (acorde de tónica Do-Mi-Sol), **Do es la cuarta** y **Mi es la sexta** (o 11ª / 13ª en octava superior). Al resolver al acorde de dominante (Sol-Si-Re):
     - La 6ª (Mi) desciende por grado conjunto a la 5ª de dominante (**Re**).
     - La 4ª (Do) desciende por grado conjunto a la 3ª sensible de dominante (**Si**).
   - En el storyboard `06-leccion-5.json` se implementó la conducción de voces canónica exacta (Mi → Re y Do → Si sobre pedal Sol, duplicando el Sol en el tenor).

2. **Lección 5 — Cifrados de paso y bordadura**:
   En `content/course/es/06-leccion-5.mdx` (líneas 26 y 32) se escribe esquemáticamente `I → I⁶₄ (de paso) → I⁶` y `I → I⁶₄ (bordadura) → I`.
   - **Precisión armónica**: En la armonía clásica, el acorde de paso entre `I` (bajo Do) e `I⁶` (bajo Mi) sobre el bajo Re es un **`V⁶₄`** (acorde de dominante en 2ª inversión: Re en bajo, Sol, Si, Re); y el acorde de bordadura sobre pedal Do es un **`IV⁶₄`** (subdominante en 2ª inversión: Do en bajo, Fa, La, Do). En el storyboard se etiquetaron con sus cifrados funcionales exactos (`V⁶₄` y `IV⁶₄`), explicando en la narración el concepto general de acorde de sexta y cuarta.
