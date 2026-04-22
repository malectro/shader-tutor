import type { Lesson } from "./types";
import { pulsingCircle } from "./pulsingCircle";

export const lessons: Lesson[] = [pulsingCircle];

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}

export type { Lesson, LessonStep } from "./types";
