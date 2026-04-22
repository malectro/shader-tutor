export interface LessonStep {
  id: string;
  title: string;
  /** One-sentence description of what the user should accomplish. */
  goal: string;
  /**
   * GLSL the tutor will render to produce the goal image the user is trying
   * to match. Also given to the tutor privately so it knows the target.
   */
  referenceGlsl: string;
  /** Frozen time used when rendering the goal image, if animated. */
  goalTime?: number;
  /** Concept summary the tutor can use when explaining. */
  concepts: string[];
}

export interface Lesson {
  id: string;
  title: string;
  /** One-paragraph description shown in the panel header. */
  summary: string;
  /** Starting GLSL that appears in the editor when the lesson loads. */
  starterGlsl: string;
  steps: LessonStep[];
}
