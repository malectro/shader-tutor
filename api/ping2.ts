import { json } from "./_lib/http.js";
import Anthropic from "@anthropic-ai/sdk";
import { getLesson } from "./_lib/lessons/index.js";

export default {
  fetch(_req: Request): Response {
    let sdkOk = false;
    let sdkError: string | null = null;
    try {
      // Instantiate without making a call.
      new Anthropic();
      sdkOk = true;
    } catch (err) {
      sdkError = err instanceof Error ? err.message : String(err);
    }

    let lessonOk = false;
    let lessonError: string | null = null;
    try {
      lessonOk = !!getLesson("pulsing-circle");
    } catch (err) {
      lessonError = err instanceof Error ? err.message : String(err);
    }

    return json({ sdkOk, sdkError, lessonOk, lessonError });
  },
};
