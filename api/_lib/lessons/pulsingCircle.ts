import type { Lesson } from "./types.js";

const STARTER = `precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

void main() {
  // Your code goes here. Start by changing the gl_FragColor from
  // black to green.
  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

const STEP_0_REF = `precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
void main() {
  gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
}
`;

const STEP_1_REF = `precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  gl_FragColor = vec4(uv, 0.0, 1.0);
}
`;

const STEP_2_REF = `precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  float d = length(uv);
  gl_FragColor = vec4(vec3(d), 1.0);
}
`;

const STEP_3_REF = `precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  float d = length(uv);
  float c = smoothstep(0.251, 0.249, d);
  gl_FragColor = vec4(vec3(c), 1.0);
}
`;

const STEP_4_REF = `precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  float r = 0.22 + 0.06 * sin(u_time * 2.0);
  float d = length(uv);
  float c = smoothstep(r + 0.005, r - 0.005, d);
  gl_FragColor = vec4(vec3(c), 1.0);
}
`;

const STEP_5_REF = `precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  float r = 0.22 + 0.06 * sin(u_time * 2.0);
  float d = length(uv);
  float c = smoothstep(r + 0.005, r - 0.005, d);
  vec3 col = 0.5 + 0.5 * cos(u_time + vec3(0.0, 2.0, 4.0));
  gl_FragColor = vec4(col * c, 1.0);
}
`;

export const pulsingCircle: Lesson = {
  id: "pulsing-circle",
  title: "Pulsing circle",
  summary:
    "Build a soft white circle in the center of the canvas that gently pulses in size. You'll meet the three fundamentals of shader work: normalizing coordinates, signed distance fields, and animating with u_time.",
  starterGlsl: STARTER,
  steps: [
    {
      id: "color",
      title: "Paint the canvas",
      goal: "Set the entire canvas to green using the gl_FragColor as the shader output. gl_FragColor is a 4-dimensional vector that holds rgb and alpha color values. Color components are floating point numbers from 0 to 1.",
      referenceGlsl: STEP_0_REF,
      goalTime: 0,
      concepts: [
        "gl_FragColor can be set to any color using a 4-dimensional vector",
        "setting it to vec4(0.0, 1.0, 0.0, 1.0) sets the entire canvas to green",
      ],
    },
    {
      id: "normalize",
      title: "Normalize the coordinates",
      goal: `gl_FragCoord gives us the coordinate in fragment space of the current fragment. To make a gradient, we can map the fragment position using u_resolution onto a 0..1 value so that 0 is one side of the canvas and 1 is the other. If we map both xy, we can set x = red and y = green.

Tip: Vectors support multidimensional operations. e.g. uv1.xy * uv2.xy, uv1.xy * 2.0
      `,
      referenceGlsl: STEP_1_REF,
      goalTime: 0,
      concepts: [
        "gl_FragCoord is in pixels, u_resolution gives canvas size",
        "dividing yields a 0..1 coordinate per fragment",
        "writing coords as color is the classic sanity check",
      ],
    },
    {
      id: "center",
      title: "Center the origin",
      goal: "Shift UV so (0,0) is the middle of the canvas, correct for aspect ratio, and show the distance from center as grayscale.",
      referenceGlsl: STEP_2_REF,
      goalTime: 0,
      concepts: [
        "subtracting 0.5 * u_resolution centers the origin",
        "dividing by a dimension of u_resolution (commonly .y) keeps unit length consistent across aspect ratios",
        "length(uv) is the distance from (0,0)",
      ],
    },
    {
      id: "circle",
      title: "Draw a distance-field circle",
      goal: "Use the distance from center to fill pixels inside a radius of ~0.25 with white and the outside with black.",
      referenceGlsl: STEP_3_REF,
      goalTime: 0,
      concepts: [
        "step(edge, x) gives a hard 0/1 cutoff",
        "smoothstep(a, b, x) with a > b gives an anti-aliased inside-the-circle mask",
        "the classic SDF idea: d < r means 'inside'",
      ],
    },
    {
      id: "animate",
      title: "Pulse with time",
      goal: "Modulate the radius so the circle grows and shrinks smoothly using u_time.",
      referenceGlsl: STEP_4_REF,
      goalTime: 0.75,
      concepts: [
        "sin(u_time * k) oscillates between -1 and 1",
        "base + amplitude * sin(...) gives a smooth pulse",
        "keep the amplitude small (~0.05) so the edge doesn't clip",
      ],
    },
    {
      id: "colorize",
      title: "Bonus: cycle the color",
      goal: "Tint the circle with a color that cycles over time (try 0.5 + 0.5 * cos(u_time + vec3(0, 2, 4))).",
      referenceGlsl: STEP_5_REF,
      goalTime: 0.75,
      concepts: [
        "offsetting cos by vec3(0, 2, 4) phase-shifts R/G/B for a rainbow",
        "multiplying mask * color keeps the background black",
      ],
    },
  ],
};
