import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

const GLYPHS = "0123456789ABCDEF_#%$+*=-/<>:;ΔΩ";

interface ScrambleTextProps {
  text: string;
  className?: string;
  triggerOnHover?: boolean;
}

export function ScrambleText({
  text,
  className = "",
  triggerOnHover = true,
}: ScrambleTextProps) {
  const [display, setDisplay] = useState(text);
  const [animating, setAnimating] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  const scramble = () => {
    if (reduced || animating) return;
    setAnimating(true);
    let iteration = 0;
    const totalFrames = text.length * 3;

    const interval = setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iteration / 3) {
              return text[index];
            }
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("")
      );

      iteration++;
      if (iteration > totalFrames) {
        clearInterval(interval);
        setDisplay(text);
        setAnimating(false);
      }
    }, 28);
  };

  useEffect(() => {
    setDisplay(text);
  }, [text]);

  return (
    <span
      ref={elementRef}
      onMouseEnter={triggerOnHover ? scramble : undefined}
      className={`inline-block font-mono ${className}`}
    >
      {display}
    </span>
  );
}
