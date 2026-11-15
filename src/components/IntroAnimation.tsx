import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface IntroAnimationProps {
  onComplete: () => void;
}

/**
 * Cinematic opening animation (≈3.2 s total):
 *  Phase 0 — holds a black overlay + oversized Mars globe (scale 5)
 *  Phase 1 — Mars shrinks to natural size, overlay fades out
 *  Phase 2 — overlay fully gone → hero elements fly in via CSS classes
 */
export function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Respect reduced-motion: skip the whole intro immediately
    if (reduced) {
      onComplete();
      return;
    }

    // Phase 0 → 1: start shrink + fade after a brief moment for browser paint
    const t1 = setTimeout(() => setPhase(1), 100);

    // Phase 1 → 2: overlay finishes fading, reveal the site
    const t2 = setTimeout(() => {
      setPhase(2);
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduced, onComplete]);

  if (phase === 2) return null;

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="intro-overlay"
      style={{
        opacity: phase === 1 ? 0 : 1,
        transition: phase === 1 ? "opacity 1.4s cubic-bezier(0.4, 0, 0.2, 1) 1.2s" : "none",
        pointerEvents: phase === 1 ? "none" : "all",
      }}
    >
      {/* Radial glow behind Mars */}
      <div className="intro-glow" />

      {/* Oversized Mars globe that shrinks to 1× */}
      <div
        className="intro-mars-wrap"
        style={{
          transform: phase === 1 ? "scale(1) translateY(0px)" : "scale(5) translateY(-6vh)",
          transition:
            phase === 1
              ? "transform 2.0s cubic-bezier(0.16, 1, 0.3, 1)"
              : "none",
        }}
      >
        {/* Static Mars texture sphere */}
        <div className="intro-mars-sphere">
          <div className="intro-mars-shine" />
          <div className="intro-mars-atmosphere" />
        </div>
      </div>

      {/* MARSVIEW wordmark that grows and descends */}
      <div
        className="intro-wordmark"
        style={{
          transform:
            phase === 1
              ? "scale(1) translateY(0px)"
              : "scale(0.3) translateY(-120px)",
          opacity: phase === 1 ? 1 : 0,
          transition:
            phase === 1
              ? "transform 1.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s, opacity 0.6s ease 0.1s"
              : "none",
        }}
      >
        MARSVIEW
      </div>

      {/* Scan line decorations */}
      <div className="intro-scanlines" />
    </div>
  );
}
