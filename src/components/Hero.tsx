import {
  ArrowDown,
  ArrowUpRight,
  Crosshair,
  MoveUpRight,
  Pause,
  Play,
  Scan,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import MarsGlobe from "./MarsGlobe";
import { links } from "../lib/config";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { KineticTitle } from "./KineticTitle";
import { ScrambleText } from "./ScrambleText";

export function Hero() {
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[850px] flex-col overflow-hidden pt-32 sm:min-h-[100svh] lg:h-svh lg:min-h-[760px] lg:pt-28 [@media(min-width:1024px)_and_(max-height:800px)]:pt-24"
    >
      {/* Background gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_52%,#5b2a172c_0%,transparent_62%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-52 top-[24%] -z-10 size-[480px] rounded-full bg-amber-900/[.08] blur-3xl animate-[pulse_6s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 top-[38%] -z-10 size-[420px] rounded-full bg-copper/[.05] blur-3xl"
      />

      {/* Main Title Section */}
      <div
        className="page-width relative text-center"
        data-enter
      >
        <KineticTitle
          id="hero-title"
          className="pl-[.18em] text-[clamp(2rem,9.4vw,9rem)] leading-[1.08] [@media(min-width:1024px)_and_(max-height:800px)]:text-[5.25rem]"
        />
        <p className="mx-auto mt-5 max-w-[320px] text-[9px] leading-5 tracking-[.24em] text-muted uppercase sm:max-w-none sm:text-[10px] sm:tracking-[.36em]">
          <ScrambleText text="Next-generation Martian cartography & exploration" />
        </p>
      </div>

      {/* 3D Globe & Orbital Framing */}
      <div className="page-width relative mt-8 flex min-h-[340px] flex-1 items-center justify-center sm:mt-3 sm:min-h-[400px] [@media(min-width:1024px)_and_(max-height:800px)]:min-h-[310px]">
        {/* Horizontal Laser Line */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-copper/25 to-transparent"
        />

        {/* Floating Orbital Ellipse */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-[260px] w-[min(90vw,780px)] -translate-x-1/2 -translate-y-1/2 -rotate-[18deg] rounded-[50%] border border-copper/[.16] shadow-[0_0_20px_rgba(233,156,114,0.06)] animate-[float_10s_ease-in-out_infinite] sm:h-[330px]"
        />

        {/* Outer Dashed Orbit Circle */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 size-[310px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/[.08] sm:size-[450px]"
        />

        {/* Reticle Boundary Box */}
        <div className="pointer-events-none absolute inset-x-0 inset-y-6 rounded-2xl border border-white/[.05] bg-white/[.006]">
          <span className="absolute -top-1 -left-1 text-copper/60">
            <Crosshair size={12} />
          </span>
          <span className="absolute -top-1 -right-1 text-copper/60">
            <Crosshair size={12} />
          </span>
          <span className="absolute -right-1 -bottom-1 text-copper/60">
            <Crosshair size={12} />
          </span>
          <span className="absolute -bottom-1 -left-1 text-copper/60">
            <Crosshair size={12} />
          </span>
        </div>

        {/* 3D Mars Interactive Globe */}
        <div
          data-cursor="drag"
          className="relative aspect-square w-[350px] shrink-0 transition-transform duration-500 sm:w-[470px] [@media(min-width:1024px)_and_(max-height:800px)]:w-[370px]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[12%] rounded-full bg-copper/[.12] blur-[55px]"
          />
          <MarsGlobe paused={paused} className="h-full w-full" />
        </div>

        {/* Left Telemetry Card */}
        <div className="pointer-events-none absolute left-6 top-[35%] hidden backdrop-blur-xs lg:block">
          <p className="technical text-copper/90">
            <ScrambleText text="Planetary survey" />
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-paper/85">
            The fourth world.
            <br />
            <span className="text-muted">A closer perspective.</span>
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="h-px w-9 bg-copper/50" />
            <span className="technical text-muted">
              <ScrambleText text="MARS / SOL SYSTEM" />
            </span>
          </div>
        </div>

        {/* Right Telemetry Card */}
        <div className="pointer-events-none absolute top-[33%] right-6 hidden w-[175px] backdrop-blur-xs lg:block">
          <div className="mb-3 flex items-center gap-2">
            <Scan size={14} className="text-copper animate-pulse" />
            <span className="technical text-copper/90">
              <ScrambleText text="Orbital perspective" />
            </span>
          </div>
          <dl className="space-y-2 font-mono text-[10px]">
            <div className="flex justify-between">
              <dt className="text-muted">MEAN RADIUS</dt>
              <dd className="text-paper">
                3,389.5 <span className="text-muted">KM</span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">GRAVITY</dt>
              <dd className="text-paper">
                3.71 <span className="text-muted">M/S²</span>
              </dd>
            </div>
          </dl>
          <div className="mt-5 h-px bg-gradient-to-r from-copper/45 to-transparent" />
        </div>

        {/* Rotation Pause / Play Control */}
        <div className="absolute right-4 bottom-8 flex items-center gap-3">
          <span className="technical hidden text-muted sm:inline">
            {paused || reduced ? "Rotation paused" : "Drag to rotate"}
          </span>
          <button
            onClick={() => setPaused(!paused)}
            disabled={reduced}
            className="icon-button size-11"
            aria-label={
              paused || reduced
                ? "Resume globe rotation"
                : "Pause globe rotation"
            }
            aria-pressed={paused || reduced}
          >
            {paused || reduced ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </div>

        <span className="technical absolute bottom-11 left-5 hidden text-muted sm:block">
          3D SURFACE VIEW{" "}
          <span aria-hidden="true" className="mx-2 text-copper">
            /
          </span>{" "}
          V.02 LUSION GL
        </span>
      </div>

      {/* Hero Bottom CTA Actions */}
      <div className="page-width relative pb-7 text-center sm:pb-3">
        <p className="mb-4 text-[13px] leading-6 text-muted">
          An entire planet. A new point of view.
        </p>
        <div className="mx-auto flex max-w-[550px] flex-col justify-center gap-3 sm:flex-row">
          <a
            href="#explorer"
            data-cursor="explore"
            className="button-primary group"
          >
            <Sparkles size={15} strokeWidth={1.5} className="animate-spin" style={{ animationDuration: "6s" }} />
            Launch Interactive Map
            <MoveUpRight
              size={15}
              className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </a>
          <a
            href={links.data}
            target="_blank"
            rel="noreferrer"
            data-cursor="view"
            className="button-secondary"
          >
            Explore NASA Data
            <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/[.06] pt-2">
          <span className="technical text-muted">
            <ScrambleText text="Built for the curious." />
          </span>
          <a
            href="#capabilities"
            aria-label="Scroll to MarsView capabilities"
            data-cursor="view"
            className="inline-flex min-h-11 items-center gap-3 text-[9px] tracking-[.18em] text-muted uppercase transition-colors hover:text-copper"
          >
            Discover MarsView
            <ArrowDown size={13} className="text-copper animate-bounce" />
          </a>
          <span className="technical hidden text-muted sm:block">
            NASA Space Apps / 2026
          </span>
        </div>
      </div>
    </section>
  );
}
