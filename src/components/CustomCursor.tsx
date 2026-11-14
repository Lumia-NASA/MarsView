import { useEffect, useRef, useState } from "react";
import { sound } from "../lib/sound";
import { useReducedMotion } from "../hooks/useReducedMotion";

type CursorMode = "default" | "hover" | "drag";

export function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<CursorMode>("default");
  const [isDown, setIsDown] = useState(false);
  const reduced = useReducedMotion();

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Disable custom cursor on mobile or if reduced motion is requested
    if (reduced || window.matchMedia("(pointer: coarse)").matches) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let animId = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) setVisible(true);

      // Check hover target
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const cursorAttr = target.closest("[data-cursor]")?.getAttribute("data-cursor");
      if (cursorAttr === "drag") {
        setMode("drag");
      } else if (target.closest("button, a, summary, [role='button'], input, label, [data-cursor='hover']")) {
        setMode("hover");
      } else {
        setMode("default");
      }
    };

    const onMouseDown = () => {
      setIsDown(true);
      sound.playClick();
    };

    const onMouseUp = () => {
      setIsDown(false);
    };

    const onMouseLeave = () => {
      setVisible(false);
    };

    // Play subtle acoustic hover sound when entering buttons or links
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, summary, [role='button'], [data-cursor]")) {
        sound.playHover();
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });
    window.addEventListener("mouseover", onMouseOver, { passive: true });
    document.documentElement.addEventListener("mouseleave", onMouseLeave, { passive: true });

    const loop = () => {
      // Spring lerp for outer ring (responsivo e ágil com metade da latência anterior)
      const ease = 0.36;
      ringX += (mouseX - ringX) * ease;
      ringY += (mouseY - ringY) * ease;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mouseover", onMouseOver);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [reduced, visible]);

  if (reduced || !visible) return null;

  return (
    <aside
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none"
    >
      {/* Inner sharp dot (bolinha) */}
      <div
        ref={dotRef}
        className={`absolute top-0 left-0 rounded-full transition-all duration-200 ${
          mode === "drag"
            ? "size-1.5 bg-void opacity-0"
            : isDown
              ? "size-3 bg-copper opacity-90"
              : mode === "hover"
                ? "size-2.5 bg-copper opacity-100 shadow-[0_0_12px_#e99c72]"
                : "size-2 bg-copper opacity-100 shadow-[0_0_8px_#e99c72]"
        }`}
      />

      {/* Outer fluid trailing ring */}
      <div
        ref={ringRef}
        className={`absolute top-0 left-0 flex items-center justify-center rounded-full transition-all duration-300 ease-out ${
          mode === "drag"
            ? "h-12 w-20 border border-copper/60 bg-copper/90 font-mono text-[9px] font-bold tracking-[.18em] text-void shadow-[0_0_24px_rgba(233,156,114,0.4)] backdrop-blur-md"
            : mode === "hover"
              ? "size-12 border border-copper/60 bg-copper/[.08] shadow-[0_0_20px_rgba(233,156,114,0.25)]"
              : isDown
                ? "size-6 border border-copper/70 bg-copper/20"
                : "size-8 border border-white/25 bg-white/[.02]"
        }`}
      >
        {mode === "drag" && (
          <span className="flex items-center gap-1 uppercase">
            <span>‹</span> DRAG <span>›</span>
          </span>
        )}
      </div>
    </aside>
  );
}
