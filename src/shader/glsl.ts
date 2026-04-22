/**
 * Minimal WebGL fragment-shader harness.
 *
 * Users only write the fragment shader. We pair it with a fixed fullscreen-quad
 * vertex shader and feed the uniforms every lesson can rely on:
 *   - uniform vec2  u_resolution  (pixels)
 *   - uniform float u_time        (seconds)
 */

const VERTEX_SRC = `attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export interface ShaderProgram {
  render(time: number): void;
  dispose(): void;
}

export type CompileResult =
  | { ok: true; program: ShaderProgram }
  | { ok: false; error: string };

export function createProgram(canvas: HTMLCanvasElement, fragSrc: string): CompileResult {
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: true });
  if (!gl) return { ok: false, error: "WebGL is not available in this browser." };

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
  if (!vs.ok) return vs;
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!fs.ok) {
    gl.deleteShader(vs.shader);
    return fs;
  }

  const program = gl.createProgram();
  if (!program) return { ok: false, error: "Failed to create WebGL program." };
  gl.attachShader(program, vs.shader);
  gl.attachShader(program, fs.shader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "link failed";
    gl.deleteProgram(program);
    gl.deleteShader(vs.shader);
    gl.deleteShader(fs.shader);
    return { ok: false, error: log };
  }

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  // Two triangles covering clip space.
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const aPos = gl.getAttribLocation(program, "a_pos");
  const uRes = gl.getUniformLocation(program, "u_resolution");
  const uTime = gl.getUniformLocation(program, "u_time");

  const shaderProgram: ShaderProgram = {
    render(time) {
      resizeToDisplay(gl, canvas);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      if (uRes) gl.uniform2f(uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
      if (uTime) gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    dispose() {
      gl.deleteBuffer(posBuf);
      gl.deleteProgram(program);
      gl.deleteShader(vs.shader);
      gl.deleteShader(fs.shader);
    },
  };

  return { ok: true, program: shaderProgram };
}

type ShaderCompile =
  | { ok: true; shader: WebGLShader }
  | { ok: false; error: string };

function compileShader(gl: WebGLRenderingContext, type: number, src: string): ShaderCompile {
  const shader = gl.createShader(type);
  if (!shader) return { ok: false, error: "Failed to create shader." };
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "compile failed";
    gl.deleteShader(shader);
    return { ok: false, error: log.trim() };
  }
  return { ok: true, shader };
}

function resizeToDisplay(gl: WebGLRenderingContext, canvas: HTMLCanvasElement): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  void gl; // resize uses canvas dims; gl viewport is set by caller.
}
