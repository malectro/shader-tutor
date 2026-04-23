import { json } from "./_lib/http.js";
import Anthropic from "@anthropic-ai/sdk";

export default {
  fetch(_req: Request): Response {
    new Anthropic();
    return json({ sdkLoaded: true });
  },
};
