import { useEffect, useRef, type RefObject } from "react";

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
export function segment(progress: number, start: number, end: number) {
  const value = clamp((progress - start) / (end - start));
  return value * value * (3 - 2 * value);
}

/** Scrubs a sticky scene in either direction, without intercepting wheel or touch input. */
export function useScrollScene(
  element: RefObject<HTMLElement | null>,
  enabled: boolean,
  onFrame: (progress: number) => void,
) {
  const update = useRef(onFrame);
  update.current = onFrame;

  useEffect(() => {
    const scene = element.current;
    if (!scene) return;
    if (!enabled || !window.requestAnimationFrame) {
      update.current(0);
      return;
    }
    let frame = 0;
    let current = 0;
    let target = 0;
    let lastTime = 0;
    let initialized = false;

    function render(time: number) {
      frame = 0;
      // Exponential interpolation stays stable across slow frames and rapid scroll reversals.
      const delta = Math.max(0, (time - lastTime) / 1000);
      lastTime = time;
      current += (target - current) * (1 - Math.exp(-delta * 18));
      if (Math.abs(target - current) < 0.0002) current = target;
      update.current(current);
      if (current !== target && !document.hidden)
        frame = requestAnimationFrame(render);
    }
    function measure() {
      const rect = scene!.getBoundingClientRect();
      target = clamp(-rect.top / Math.max(1, rect.height - window.innerHeight));
      if (!initialized) {
        current = target;
        initialized = true;
      }
      if (!frame && !document.hidden) {
        lastTime = performance.now();
        frame = requestAnimationFrame(render);
      }
    }
    function visibility() {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else measure();
    }
    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    resize?.observe(scene);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [element, enabled]);
}
