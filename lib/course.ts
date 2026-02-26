/**
 * lib/course.ts
 *
 * Utilidades del servidor para cargar lecciones, calcular navegación
 * y exponer la configuración del curso. Todo corre en el servidor
 * (Next.js Server Components / generateStaticParams).
 */

import type { LessonConfig } from "@/types/course";
import { COURSE_CONFIG } from "@/data/course/course-config";

// ─── Importaciones de lecciones ───────────────────────────────────────────────
// Se importan estáticamente para que Next.js pueda hacer tree-shaking
// y generateStaticParams funcione en build time.

import { lesson as l00 } from "@/data/course/lessons/00-introduccion";
import { lesson as l01 } from "@/data/course/lessons/01-propedeutico";
import { lesson as l02 } from "@/data/course/lessons/02-leccion-1";
import { lesson as l03 } from "@/data/course/lessons/03-leccion-2";
import { lesson as l04 } from "@/data/course/lessons/04-leccion-3";
import { lesson as l05 } from "@/data/course/lessons/05-leccion-4";
import { lesson as l06 } from "@/data/course/lessons/06-leccion-5";

// ─── Registro maestro ─────────────────────────────────────────────────────────

/**
 * Todas las lecciones publicadas, ordenadas por `order`.
 * Para agregar una lección nueva: importarla arriba y añadirla aquí.
 */
const ALL_LESSONS: LessonConfig[] = [
  l00, l01, l02, l03, l04, l05, l06,
].sort((a, b) => a.order - b.order);

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Retorna todas las lecciones publicadas.
 */
export function getAllLessons(): LessonConfig[] {
  return ALL_LESSONS;
}

/**
 * Retorna todos los slugs (usado en generateStaticParams).
 */
export function getAllLessonSlugs(): string[] {
  return ALL_LESSONS.map((l) => l.slug);
}

/**
 * Busca una lección por slug. Retorna `undefined` si no existe.
 */
export function getLessonBySlug(slug: string): LessonConfig | undefined {
  return ALL_LESSONS.find((l) => l.slug === slug);
}

/**
 * Retorna la lección anterior y la siguiente para navegación.
 */
export function getLessonNav(
  slug: string
): { prev: LessonConfig | null; next: LessonConfig | null } {
  const idx = ALL_LESSONS.findIndex((l) => l.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? ALL_LESSONS[idx - 1] : null,
    next: idx < ALL_LESSONS.length - 1 ? ALL_LESSONS[idx + 1] : null,
  };
}

/**
 * Retorna las lecciones de un módulo dado.
 */
export function getLessonsByModule(moduleId: string): LessonConfig[] {
  return ALL_LESSONS.filter((l) => l.module === moduleId);
}

/**
 * Retorna la configuración global del curso.
 */
export function getCourseConfig() {
  return COURSE_CONFIG;
}

/**
 * Calcula el progreso del módulo (para ProgressTracker).
 * Recibe los slugs de lecciones completadas desde localStorage.
 */
export function getModuleProgress(
  moduleId: string,
  completedSlugs: string[]
): { total: number; completed: number; percentage: number } {
  const lessons = getLessonsByModule(moduleId);
  const completed = lessons.filter((l) =>
    completedSlugs.includes(l.slug)
  ).length;
  return {
    total: lessons.length,
    completed,
    percentage: lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0,
  };
}
