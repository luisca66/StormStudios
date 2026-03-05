import { NextRequest, NextResponse } from 'next/server';
import { parseMidiBuffer } from '@/lib/maestro-virtual/midi-parser';
import { validateLesson1Scales } from '@/lib/maestro-virtual/scale-validator';
import { validateLesson2Scales } from '@/lib/maestro-virtual/minor-scale-validator';
import { runRuleEngine } from '@/lib/maestro-virtual/rule-engine';
import { getLessonConfig } from '@/data/course/lessons/lesson-configs';

/**
 * POST /api/maestro-virtual/check
 *
 * Recibe un archivo MIDI vía FormData, lo parsea y ejecuta
 * el validador correcto según la lección:
 *   - leccion-1 (voiceCount 1) → validateLesson1Scales (escalas mayores)
 *   - leccion-2 (voiceCount 1) → validateLesson2Scales (escalas menores)
 *   - voiceCount === 4         → runRuleEngine (SATB)
 *
 * Devuelve MaestroFeedback compatible con ExerciseUpload.tsx.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file     = formData.get('midi') as File | null;
    const lessonId = formData.get('lessonId') as string | null;
    const locale   = (formData.get('locale') as string) ?? 'es';

    if (!file || !lessonId) {
      return NextResponse.json(
        { error: 'Faltan parámetros: midi y lessonId' },
        { status: 400 }
      );
    }
    if (!file.name.match(/\.(mid|midi)$/i)) {
      return NextResponse.json(
        { error: 'El archivo debe ser .mid o .midi' },
        { status: 400 }
      );
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande (máx 2 MB)' },
        { status: 400 }
      );
    }

    const lessonConfig = getLessonConfig(lessonId);
    if (!lessonConfig) {
      return NextResponse.json(
        { error: `Lección desconocida: ${lessonId}` },
        { status: 404 }
      );
    }

    const buffer    = await file.arrayBuffer();
    const voiceData = parseMidiBuffer(buffer);

    // ── Enrutar al validador correcto ──────────────────────────────────────
    let rawErrors;
    if (lessonConfig.voiceCount === 1 && lessonId.includes('leccion-2')) {
      rawErrors = validateLesson2Scales(voiceData);
    } else if (lessonConfig.voiceCount === 1) {
      rawErrors = validateLesson1Scales(voiceData);
    } else {
      rawErrors = runRuleEngine(voiceData, lessonConfig.activeRules);
    }

    // ── Traducir al formato MaestroFeedback ────────────────────────────────
    const violations = rawErrors
      .filter(e => e.severity === 'error')
      .map(e => ({
        ruleId:   e.rule,
        ruleName: { es: e.titleEs, en: e.titleEn },
        severity: 'error' as const,
        measure:  e.position,
        message:  { es: e.detailEs, en: e.detailEn },
      }));

    const errorCount = violations.length;
    const score      = Math.max(0, Math.round(100 - errorCount * 15));
    const passed     = errorCount === 0;

    const summary = {
      es: passed
        ? `¡Excelente! Tu ejercicio está correcto (${score}/100).`
        : `Se encontraron ${errorCount} error${errorCount !== 1 ? 'es' : ''}. Puntuación: ${score}/100.`,
      en: passed
        ? `Excellent! Your exercise is correct (${score}/100).`
        : `Found ${errorCount} error${errorCount !== 1 ? 's' : ''}. Score: ${score}/100.`,
    };

    console.log(`[Maestro Virtual] lessonId=${lessonId} locale=${locale} errors=${errorCount} score=${score}`);

    return NextResponse.json({
      lessonId,
      score,
      passed,
      violations,
      suggestions: [],
      summary,
    });

  } catch (err) {
    console.error('[Maestro Virtual]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
