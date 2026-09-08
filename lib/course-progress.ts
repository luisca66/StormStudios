export const PROGRESS_KEY = "stormstudios_course_progress";
export const PROGRESS_EVENT = "stormstudios-course-progress-change";
export type CourseProgress = { completed: Record<string, boolean> };

/** Accept old exports and current storage, but never trust arbitrary JSON shapes. */
export function parseCourseProgress(raw: string): CourseProgress {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || !("completed" in value) ||
    !value.completed || typeof value.completed !== "object" || Array.isArray(value.completed)) {
    throw new Error("Invalid course progress");
  }
  const completed: Record<string, boolean> = {};
  const entries = Object.entries(value.completed);
  if (entries.length > 1000) throw new Error("Too many lessons");
  for (const [slug, done] of entries) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100 || typeof done !== "boolean") {
      throw new Error("Invalid lesson entry");
    }
    Object.defineProperty(completed, slug, { value: done, enumerable: true, writable: true, configurable: true });
  }
  return { completed };
}

export function readCourseProgress(): CourseProgress {
  try {
    return parseCourseProgress(localStorage.getItem(PROGRESS_KEY) || '{"completed":{}}');
  } catch {
    return { completed: {} };
  }
}

export function writeCourseProgress(progress: CourseProgress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}
