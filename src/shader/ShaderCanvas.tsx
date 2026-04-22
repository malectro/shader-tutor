import { useEffect, useRef, useState } from "react";
import { createProgram } from "./glsl";

interface Props {
  fragSrc: string;
  /**
   * If set, freezes u_time at this value instead of animating.
   * Used for static goal images.
   */
  frozenTime?: number;
  onError?: (error: string | null) => void;
  className?: string;
}

/**
 * Live-renders a user-supplied fragment shader into a canvas.
 * Recompiles whenever `fragSrc` changes; reports compile/link errors
 * through `onError` (null when the shader is healthy).
 */
export function ShaderCanvas({ fragSrc, frozenTime, onError, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const result = createProgram(canvas, fragSrc);
    if (!result.ok) {
      setError(result.error);
      onErrorRef.current?.(result.error);
      return;
    }
    setError(null);
    onErrorRef.current?.(null);

    const program = result.program;
    let raf = 0;
    const start = performance.now();

    const tick = () => {
      const t = frozenTime ?? (performance.now() - start) / 1000;
      program.render(t);
      if (frozenTime === undefined) raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      program.dispose();
    };
  }, [fragSrc, frozenTime]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      {error && <div className="shader-error">{error}</div>}
    </div>
  );
}
