import { useRef, useState, type ReactNode, type HTMLAttributes } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface TiltCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  maxTilt?: number;
  className?: string;
  glareColor?: string;
  cursorMode?: "explore" | "view" | "drag";
}

export function TiltCard({
  children,
  maxTilt = 7,
  className = "",
  glareColor = "rgba(233, 156, 114, 0.16)",
  cursorMode,
  ...props
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");
  const [glare, setGlare] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const reduced = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = (x / rect.width) * 2 - 1;
    const py = (y / rect.height) * 2 - 1;

    const rotX = -py * maxTilt;
    const rotY = px * maxTilt;

    setTransform(
      `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(6px)`
    );
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 1,
    });
  };

  const handleMouseLeave = () => {
    if (reduced) return;
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)");
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-cursor={cursorMode}
      style={{
        transform: reduced ? undefined : transform,
        transformStyle: "preserve-3d",
        transition: transform ? "transform 0.1s ease-out" : "transform 0.5s ease-out",
      }}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Specular glare sheen */}
      {!reduced && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-500 ease-out"
          style={{
            opacity: glare.opacity,
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, ${glareColor} 0%, transparent 65%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}
