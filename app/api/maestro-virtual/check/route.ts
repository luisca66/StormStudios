import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { parseMidiBuffer } from '@/lib/maestro-virtual/midi-parser';
import { validateLesson1Scales } from '@/lib/maestro-virtual/scale-validator';
import { validateMinorScales } from '@/lib/maestro-virtual/minor-scale-validator';
import { validateLesson2Modes } from '@/lib/maestro-virtual/modes-validator';
import { getLessonConfig } from '@/data/course/lessons/lesson-configs';
import type { FeedbackItem } from '@/types/course';

const MAX_MIDI_FILE_BYTES = 2 * 1024 * 1024;
// Un multipart añade límites, nombres de campos y separadores al archivo.
const MAX_MULTIPART_BODY_BYTES = MAX_MIDI_FILE_BYTES + 64 * 1024;
const MAX_LESSON_ID_LENGTH = 80;
const MAX_REPORTED_VIOLATIONS = 100;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_RATE_LIMIT_ENTRIES = 10_000;
const RATE_LIMIT_SALT = randomBytes(16).toString('hex');

// Protección local por instancia. Complementar con rate limiting/WAF distribuido
// antes de producción, porque las instancias serverless no comparten memoria.
const ipRequestLog = new Map<string, number[]>();
let lastRateLimitCleanupAt = 0;

export const runtime = 'nodejs';
export const maxDuration = 10;

function invalidRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-vercel-forwarded-for')
    ?? request.headers.get('x-forwarded-for');
  const candidates = [
    forwardedFor?.split(',')[0]?.trim(),
    request.headers.get('x-real-ip')?.trim(),
  ];

  for (const candidate of candidates) {
    if (candidate && isIP(candidate)) {
      return candidate;
    }
  }

  return 'unknown';
}

function rateLimitKey(ip: string): string {
  return createHash('sha256')
    .update(`${RATE_LIMIT_SALT}:${ip}`)
    .digest('base64url');
}

function pruneRateLimitLog(now: number) {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  for (const [key, timestamps] of ipRequestLog) {
    const recent = timestamps.filter((timestamp) => timestamp > windowStart);
    if (recent.length === 0) {
      ipRequestLog.delete(key);
    } else if (recent.length !== timestamps.length) {
      ipRequestLog.set(key, recent);
    }
  }

  while (ipRequestLog.size > MAX_RATE_LIMIT_ENTRIES) {
    const oldestKey = ipRequestLog.keys().next().value;
    if (!oldestKey) {
      break;
    }
    ipRequestLog.delete(oldestKey);
  }

  lastRateLimitCleanupAt = now;
}

function getRateLimitResult(ip: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const key = rateLimitKey(ip);

  if (
    now - lastRateLimitCleanupAt >= RATE_LIMIT_WINDOW_MS
    || ipRequestLog.size >= MAX_RATE_LIMIT_ENTRIES
  ) {
    pruneRateLimitLog(now);
  }

  const recent = (ipRequestLog.get(key) ?? []).filter(
    (timestamp) => timestamp > windowStart
  );
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestLog.set(key, recent);
    return {
      limited: true,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((recent[0] + RATE_LIMIT_WINDOW_MS - now) / 1000)
      ),
    };
  }

  recent.push(now);
  ipRequestLog.set(key, recent);
  return { limited: false };
}

function rateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Demasiadas revisiones. Intenta de nuevo más tarde.' },
    {
      status: 429,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

type BoundedBodyResult =
  | { kind: 'ok'; bytes: ArrayBuffer }
  | { kind: 'too_large' }
  | { kind: 'invalid' };

type RateLimitResult =
  | { limited: true; retryAfterSeconds: number }
  | { limited: false };

async function readBoundedBody(request: NextRequest): Promise<BoundedBodyResult> {
  const reader = request.body?.getReader();
  if (!reader) {
    return { kind: 'invalid' };
  }

  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      byteLength += value.byteLength;
      if (byteLength > MAX_MULTIPART_BODY_BYTES) {
        await reader.cancel();
        return { kind: 'too_large' };
      }

      chunks.push(value);
    }

    const bytes = new Uint8Array(new ArrayBuffer(byteLength));
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return { kind: 'ok', bytes: bytes.buffer };
  } catch {
    return { kind: 'invalid' };
  } finally {
    reader.releaseLock();
  }
}

/**
 * POST /api/maestro-virtual/check
 *
 * Recibe un archivo MIDI vía FormData, lo parsea y ejecuta el validador
 * indicado por `lessonConfig.validator`:
 *   - 'major-scales' → validateLesson1Scales  (escalas mayores)
 *   - 'modes'        → validateLesson2Modes    (modos paralelos)
 *   - 'minor-scales' → validateMinorScales     (escalas menores)
 *   - 'satb'         → 501 hasta que su motor de reglas esté listo
 *
 * Devuelve MaestroFeedback compatible con ExerciseUpload.tsx.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimit = getRateLimitResult(getClientIp(request));
    if (rateLimit.limited) {
      return rateLimitedResponse(rateLimit.retryAfterSeconds);
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const bodyBytes = Number(contentLength);
      if (!Number.isSafeInteger(bodyBytes) || bodyBytes < 0) {
        return invalidRequest('Content-Length inválido');
      }
      if (bodyBytes > MAX_MULTIPART_BODY_BYTES) {
        return invalidRequest('Solicitud demasiado grande', 413);
      }
    }

    const contentType = request.headers.get('content-type');
    const mediaType = contentType?.split(';', 1)[0]?.trim().toLowerCase();
    if (!contentType || mediaType !== 'multipart/form-data') {
      return invalidRequest('La solicitud debe usar multipart/form-data');
    }

    const body = await readBoundedBody(request);
    if (body.kind === 'too_large') {
      return invalidRequest('Solicitud demasiado grande', 413);
    }
    if (body.kind !== 'ok') {
      return invalidRequest('No se pudo leer el archivo MIDI');
    }

    let formData: FormData;
    try {
      formData = await new Request(request.url, {
        method: 'POST',
        headers: { 'content-type': contentType },
        body: body.bytes,
      }).formData();
    } catch {
      return invalidRequest('No se pudo leer el archivo MIDI');
    }

    const midiEntry = formData.get('midi');
    const lessonEntry = formData.get('lessonId');
    const localeEntry = formData.get('locale');
    const file = midiEntry instanceof File ? midiEntry : null;
    const lessonId =
      typeof lessonEntry === 'string' && lessonEntry.length <= MAX_LESSON_ID_LENGTH
        ? lessonEntry
        : null;
    const locale = localeEntry === 'en' ? 'en' : 'es';

    if (!file || !lessonId) {
      return invalidRequest('Faltan parámetros: midi y lessonId');
    }
    if (!file.name.match(/\.(mid|midi)$/i)) {
      return invalidRequest('El archivo debe ser .mid o .midi');
    }
    if (file.size > MAX_MIDI_FILE_BYTES) {
      return invalidRequest('Archivo demasiado grande (máx 2 MB)', 413);
    }

    const lessonConfig = getLessonConfig(lessonId);
    if (!lessonConfig) {
      return invalidRequest('Lección desconocida', 404);
    }
    if (lessonConfig.validator === 'satb') {
      return invalidRequest(
        locale === 'en'
          ? 'SATB feedback is not available yet.'
          : 'La retroalimentación SATB todavía no está disponible.',
        501
      );
    }

    const buffer = await file.arrayBuffer();
    let voiceData;
    try {
      voiceData = parseMidiBuffer(buffer);
    } catch {
      console.warn('[Maestro Virtual] MIDI inválido');
      return invalidRequest('Archivo MIDI inválido o corrupto');
    }

    // ── Enrutar al validador correcto (explícito, según lesson-configs) ─────
    let rawErrors;
    switch (lessonConfig.validator) {
      case 'major-scales': rawErrors = validateLesson1Scales(voiceData); break;
      case 'modes':        rawErrors = validateLesson2Modes(voiceData);  break;
      case 'minor-scales': rawErrors = validateMinorScales(voiceData); break;
      default:
        return invalidRequest('El validador de esta lección no está disponible', 501);
    }

    // ── Traducir al formato MaestroFeedback ────────────────────────────────
    const violations: FeedbackItem[] = [];
    let errorCount = 0;
    for (const error of rawErrors) {
      if (error.severity !== 'error') {
        continue;
      }

      errorCount++;
      if (violations.length >= MAX_REPORTED_VIOLATIONS) {
        continue;
      }

      violations.push({
        ruleId: error.rule,
        ruleName: { es: error.titleEs, en: error.titleEn },
        severity: 'error',
        measure: error.position,
        message: { es: error.detailEs, en: error.detailEn },
      });
    }

    const suggestions: FeedbackItem[] = errorCount > violations.length
      ? [{
          ruleId: 'FEEDBACK_TRUNCATED',
          ruleName: {
            es: 'Lista de errores resumida',
            en: 'Error list summarized',
          },
          severity: 'warning',
          measure: 0,
          message: {
            es: `Se muestran los primeros ${MAX_REPORTED_VIOLATIONS} errores de ${errorCount}.`,
            en: `Showing the first ${MAX_REPORTED_VIOLATIONS} errors out of ${errorCount}.`,
          },
        }]
      : [];

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
      suggestions,
      summary,
    });

  } catch {
    console.error('[Maestro Virtual] Unexpected exercise review failure');
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
