import { useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface KineticTitleProps {
  text?: string;
  className?: string;
  id?: string;
}

export function KineticTitle({
  text = "MARSVIEW",
  className = "",
  id,
}: KineticTitleProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const reduced = useReducedMotion();

  const letters = text.split("");

  return (
    <h1
      id={id}
      className={`relative inline-flex items-center justify-center font-light tracking-[.18em] select-none ${className}`}
      style={{ perspective: "1000px" }}
    >
      {letters.map((char, index) => {
        const isHovered = hoveredIdx === index;
        return (
          <span
            key={index}
            onMouseEnter={() => !reduced && setHoveredIdx(index)}
            onMouseLeave={() => !reduced && setHoveredIdx(null)}
            style={{
              animationDelay: reduced ? "0ms" : `${index * 60 + 100}ms`,
              transform: isHovered
                ? "translateY(-8px) scale(1.08) translateZ(20px)"
                : undefined,
              transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            className={`inline-block bg-gradient-to-b from-[#ffffff] via-[#f2ede7] to-[#e99c72] bg-clip-text text-transparent transition-all duration-300 motion-safe:animate-arrive ${
              isHovered
                ? "drop-shadow-[0_0_25px_rgba(233,156,114,0.65)] filter"
                : "drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            }`}
          >
            {char}
          </span>
        );
      })}
    </h1>
  );
}
