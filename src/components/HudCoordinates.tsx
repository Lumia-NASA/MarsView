import { useEffect, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

export function HudCoordinates() {
  const [coords, setCoords] = useState({ lat: "18.38° N", lon: "77.58° E", elev: "-2,480 M" });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let throttle = false;

    const onMouseMove = (e: MouseEvent) => {
      if (throttle) return;
      throttle = true;
      setTimeout(() => {
        throttle = false;
      }, 80);

      const xNorm = (e.clientX / window.innerWidth) * 2 - 1;
      const yNorm = (e.clientY / window.innerHeight) * 2 - 1;

      const latDeg = (yNorm * -45 + 18.38).toFixed(2);
      const lonDeg = (xNorm * 90 + 77.58).toFixed(2);
      const elev = Math.round(yNorm * -3200 - 2480);

      setCoords({
        lat: `${Math.abs(Number(latDeg))}° ${Number(latDeg) >= 0 ? "N" : "S"}`,
        lon: `${Math.abs(Number(lonDeg))}° ${Number(lonDeg) >= 0 ? "E" : "W"}`,
        elev: `${elev >= 0 ? "+" : ""}${elev.toLocaleString()} M`,
      });
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [reduced]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-6 bottom-6 z-30 hidden font-mono text-[9px] tracking-[.18em] text-muted/70 uppercase select-none lg:flex lg:flex-col lg:items-end lg:gap-1 backdrop-blur-xs"
    >
      <div className="flex items-center gap-2">
        <span className="size-1.5 animate-pulse rounded-full bg-copper" />
        <span className="text-copper">ORBITAL RETICLE</span>
      </div>
      <div>
        LAT <span className="text-paper/90">{coords.lat}</span> / LON{" "}
        <span className="text-paper/90">{coords.lon}</span>
      </div>
      <div>
        ELEV <span className="text-paper/90">{coords.elev}</span> / SYSTEM{" "}
        <span className="text-copper">SOL-IV</span>
      </div>
    </div>
  );
}
