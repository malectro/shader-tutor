import { json } from "./_lib/http.js";
import { getLesson } from "./_lib/lessons/index.js";

export default {
  fetch(_req: Request): Response {
    return json({ found: !!getLesson("pulsing-circle") });
  },
};
