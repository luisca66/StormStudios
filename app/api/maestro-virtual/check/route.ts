import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CheckSchema = z.object({
  lessonId: z.string().min(1),
  // El archivo MIDI llega como base64
  midiBase64: z.string().min(1),
});

/**
 * POST /api/maestro-virtual/check
 *
 * Recibe un archivo MIDI (base64) y el ID de la lección,
 * ejecuta el motor de reglas y devuelve el feedback al estudiante.
 *
 * TODO (Fase 5): Implementar el motor de reglas completo con:
 * - lib/maestro-virtual/midi-parser.ts
 * - lib/maestro-virtual/rule-engine.ts
 * - lib/maestro-virtual/feedback-generator.ts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CheckSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { lessonId, midiBase64 } = parsed.data;

    // STUB: respuesta simulada hasta que se implemente el motor real
    console.log(`[MAESTRO VIRTUAL] Checking lesson: ${lessonId}, MIDI size: ${midiBase64.length} chars`);

    const stubResponse = {
      lessonId,
      score: 85,
      passed: true,
      violations: [],
      suggestions: [
        {
          ruleId: "stub",
          ruleName: { es: "Revisión pendiente", en: "Pending review" },
          severity: "suggestion",
          measure: 1,
          message: {
            es: "El motor de corrección estará disponible pronto. ¡Sigue practicando!",
            en: "The correction engine will be available soon. Keep practicing!",
          },
        },
      ],
      summary: {
        es: "Tu ejercicio fue recibido. El Maestro Virtual estará operativo en la Fase 5 del desarrollo.",
        en: "Your exercise was received. The Virtual Teacher will be operational in Phase 5 of development.",
      },
    };

    return NextResponse.json(stubResponse);
  } catch (error) {
    console.error("[MAESTRO VIRTUAL ERROR]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
