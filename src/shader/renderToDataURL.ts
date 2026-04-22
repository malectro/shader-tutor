import { createProgram } from "./glsl";

/**
 * Render a fragment shader once into an offscreen canvas and return a PNG
 * data URL. Used to pre-render goal images for lesson steps.
 */
export function renderToDataURL(
  fragSrc: string,
  width: number,
  height: number,
  time = 0
): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  // clientWidth/Height drive the glsl harness resize check; mirror the
  // requested pixel size there so it doesn't try to upscale with DPR.
  Object.defineProperty(canvas, "clientWidth", { value: width });
  Object.defineProperty(canvas, "clientHeight", { value: height });

  const result = createProgram(canvas, fragSrc);
  if (!result.ok) return null;
  result.program.render(time);
  const url = canvas.toDataURL("image/png");
  result.program.dispose();
  return url;
}
