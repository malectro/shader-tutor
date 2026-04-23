import type { Lesson } from "./types.js";
import { pulsingCircle } from "./pulsingCircle.js";

export const lessons: Lesson[] = [pulsingCircle];

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}

export type { Lesson, LessonStep } from "./types.js";
