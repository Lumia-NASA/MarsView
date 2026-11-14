import { useReducedMotion } from "../hooks/useReducedMotion";

export function FilmGrain() {
  const reduced = useReducedMotion();

  if (reduced) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed -inset-[100%] z-40 h-[300%] w-[300%] opacity-[0.038] mix-blend-screen select-none animate-[grain_7s_steps(8)_infinite]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}
