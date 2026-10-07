import type { LessonConfig } from '@/types/course';

// Medrano pp. 15–17. Validator ready; lesson content remains in construction.
export const lesson: LessonConfig = {
  id: '09-leccion-8', slug: '09-leccion-8', order: 9, lessonNumber: 8,
  module: 'triadas-satb', status: 'construction',
  title: { es: 'Lección 8 — Material armónico y enlaces', en: 'Lesson 8 — Harmonic Material and Chord Links' },
  description: {
    es: 'Enlaces de dos acordes en una tonalidad mayor, escritos para soprano, contralto, tenor y bajo.',
    en: 'Two-chord links in a major key, written for soprano, alto, tenor and bass.',
  },
  prerequisites: ['08-leccion-7'], videos: [], activeRules: [],
  tags: ['SATB', 'material armónico', 'enlaces'],
};
