# ap-core

Dominio compartido del método AP Super para las versiones web (sin DOM ni three.js):

- `levels.json`: los 147 niveles por secuencia (Hombre y Mujer), copiados de la app AP Super
  (`apsuperapp/ios/APSuper/Resources/levels.json`). La app es la fuente de verdad.
- `progression.ts`: alturas, niveles, generador de preguntas, rachas y progreso.
- `stats.ts`: registro de respuestas, métricas y CSV.

Lo usan `oido-absoluto-multi-juego` (3D) y `ap-multi` (2D). Solo imports relativos.
