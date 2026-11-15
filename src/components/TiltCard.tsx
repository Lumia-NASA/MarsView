import type { ReactNode, HTMLAttributes } from "react";

interface TiltCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  maxTilt?: number;
  glareColor?: string;
  cursorMode?: "explore" | "view" | "drag";
}

// Preserve the component API while giving content a stable reading surface.
export function TiltCard({ children, maxTilt: _maxTilt, glareColor: _glareColor,
  cursorMode, className = "", ...props }: TiltCardProps) {
  return <div data-cursor={cursorMode} className={`surface-panel relative overflow-hidden ${className}`} {...props}>{children}</div>;
}
