## Imported Claude Cowork project instructions

Ayúdame a priorizar y organizar qué hacemos para avanzar en orden

## Videos de lecciones

Para producir el video de una lección (español e inglés), sigue `.claude/skills/video-leccion/SKILL.md`: guion y audio de ElevenLabs → storyboard → stills → mapa de audio → video → revisión → entrega. Al terminar un video, añade lo aprendido en su sección «Lecciones aprendidas».

## Redes sociales (lote semanal)

Para preparar el lote semanal, sigue `.claude/skills/lote-redes/SKILL.md`.
La automatización y su configuración están en `docs/automatizacion-redes.md`.
Nunca publiques ni ejecutes `publicar-lote --confirmar` sin el «sí» explícito de Luis para ese lote.
Las credenciales viven fuera del repo en `C:\Users\Luis\.storm-redes\credenciales.json` (variable de usuario `REDES_CREDENTIALS_FILE`); jamás se copian, imprimen ni suben.
Los lotes, la estrategia y la bitácora están en `apps-src/plan-lanzamiento/redes/` (ignorado por git; solo existe en la PC de Luis).

<!-- BEGIN:nextjs-agent-rules -->

## Sequencer v5

Para continuar el Storm Sequencer v5 (`/sequencer/v5`), lee primero `docs/secuenciador-v5.md`: estado, arquitectura, pendientes y reparto.
Tres reglas de Luis que no se reabren: tiene que servir para hacer el curso; el secuenciador no corrige al alumno mientras escribe; generar voces y armonizar son solo del modo autor (`NEXT_PUBLIC_SEQUENCER_AUTHOR`, nunca en producción ni importado desde código público).
La v3 y la v4 no se modifican.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
