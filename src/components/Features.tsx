import {
  ArrowUpRight,
  Focus,
  Radio,
  Route,
} from "lucide-react";
import { dashboardPath, links } from "../lib/config";
import { TiltCard } from "./TiltCard";
import { ScrambleText } from "./ScrambleText";
import { PanoramaViewer360 } from "./PanoramaViewer360";

export function Features() {
  return (
    <section
      id="capabilities"
      aria-labelledby="capabilities-title"
      className="page-width py-24 sm:py-28 lg:flex lg:min-h-[900px] lg:flex-col lg:justify-center"
    >
      <div data-scroll-heading className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <h2
          id="capabilities-title"
          className="max-w-[600px] text-[32px] leading-[1.2] font-light tracking-[-.035em] sm:text-5xl"
        >
          Less distance.
          <br />
          <span className="text-muted">More discovery.</span>
        </h2>
        <p className="max-w-[300px] text-sm leading-7 text-muted">
          From the quiet of orbit to the texture of the terrain. Explore Mars at
          every scale.
        </p>
      </div>

      <div data-scroll-surface className="grid gap-5 lg:grid-cols-[1.35fr_1fr] lg:grid-rows-[290px_290px]">
        {/* Large Feature Card with 360° Interactive Panorama & Adaptive Zoom Lever */}
        <TiltCard
          maxTilt={4}
          className="glass-panel group relative flex min-h-[580px] flex-col overflow-hidden transition duration-300 hover:border-copper/40 lg:row-span-2"
        >
          <div className="relative z-10 flex items-center justify-between px-7 pt-7 pb-4">
            <Focus className="text-copper" size={23} strokeWidth={1.3} />
            <span className="technical text-muted">
              <ScrambleText text="Scale without limits" />
            </span>
          </div>

          {/* Interactive 360° Mastcam-Z Panorama with Adaptive Zoom */}
          <div className="relative flex min-h-[340px] flex-1 overflow-hidden border-y border-white/10 bg-void">
            <PanoramaViewer360 className="h-full w-full" />
          </div>

          <div className="relative z-10 px-7 pt-5 pb-7">
            <div className="flex items-center gap-2">
              <span className="technical text-copper font-medium">
                MASTCAM-Z 360° MOSAIC
              </span>
            </div>
            <h3 className="mt-2 text-2xl font-medium tracking-[-.025em]">
              Atmospheric Zoom
            </h3>
            <p className="mt-2.5 max-w-[420px] text-[13px] leading-relaxed text-muted">
              A closer look, from orbital context to the rocks of Jezero.
              Drag sideways to rotate 360°, move the lever to zoom, and pan vertically to examine terrain details.
            </p>
            <a
              href={dashboardPath}
              data-cursor="hover"
              className="quiet-link mt-3.5 text-copper font-medium"
            >
              Open dashboard
              <ArrowUpRight size={14} />
            </a>
          </div>
        </TiltCard>

        {/* Rover Routing Feature Card */}
        <TiltCard
          className="glass-panel group relative min-h-[290px] overflow-hidden transition duration-300 hover:border-copper/40 lg:min-h-0"
        >
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[58%] bg-[url('/images/mars-color.jpg')] bg-[length:800px] bg-[position:30%_60%] opacity-20 [mask-image:linear-gradient(to_right,transparent,black)] transition-transform duration-700 group-hover:scale-[1.025]" />
          <svg
            aria-hidden="true"
            className="absolute top-6 right-2 h-[210px] w-[230px] text-copper opacity-35 transition-opacity duration-500 group-hover:opacity-75 sm:opacity-60"
            viewBox="0 0 230 210"
            fill="none"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <path
                key={i}
                d={`M ${80 + i * 14} -10 C ${30 + i * 8} 60, ${200 - i * 8} 55, ${145 + i * 12} 110 S ${65 + i * 11} 175, ${170 + i * 10} 230`}
                stroke="currentColor"
                strokeWidth=".5"
                opacity=".35"
              />
            ))}
            <path
              d="M55 176 81 156 79 131 112 107 143 108 159 77 189 51"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 5"
            />
            <circle cx="55" cy="176" r="4" fill="currentColor" />
            <circle cx="189" cy="51" r="5" fill="currentColor" />
            <circle
              cx="189"
              cy="51"
              r="12"
              stroke="currentColor"
              opacity=".3"
            />
          </svg>
          <div className="relative z-10 flex h-full flex-col items-start p-7">
            <Route size={22} className="text-copper" strokeWidth={1.3} />
            <h3 className="mt-6 max-w-56 text-[22px] leading-snug font-medium tracking-[-.025em]">
              Rover Routing
              <br />
              Engine
            </h3>
            <p className="mt-3 max-w-[245px] text-xs leading-6 text-muted">
              A terrain-aware navigation concept.
              <br />
              See the path beyond the obstacles.
            </p>
            <span className="technical mt-3 text-copper/80">
              <ScrambleText text="Route concept / preview" />
            </span>
          </div>
        </TiltCard>

        {/* Published NASA observations */}
        <TiltCard
          className="glass-panel group relative min-h-[275px] overflow-hidden transition duration-300 hover:border-copper/40 lg:min-h-0"
        >
          <div
            aria-hidden="true"
            className="absolute -top-16 -right-12 size-72 rounded-full bg-copper/[.07] blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute top-7 right-7 flex h-10 w-24 items-end justify-between gap-1 opacity-55 sm:h-24 sm:w-32"
          >
            {[
              15, 28, 21, 42, 65, 39, 77, 54, 91, 66, 48, 74, 45, 60, 34, 52,
            ].map((height, index) => (
              <span
                key={index}
                className="w-1.5 rounded-t-sm bg-gradient-to-t from-copper/10 to-copper transition-all duration-300 group-hover:scale-y-110"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="relative p-7">
            <Radio size={22} className="text-copper" strokeWidth={1.3} />
            <h3 className="mt-6 max-w-64 text-[22px] leading-snug font-medium tracking-[-.025em]">
              NASA mission
              <br />
              observations
            </h3>
            <p className="mt-3 max-w-[300px] text-xs leading-6 text-muted">
              Real Curiosity weather observations, with their measurement date
              and original source. Published summaries, not a live feed.
            </p>
            <a
              href={links.images}
              target="_blank"
              rel="noreferrer"
              className="quiet-link mt-1 text-copper"
            >
              Browse rover images
              <ArrowUpRight size={13} />
            </a>
          </div>
        </TiltCard>
      </div>
    </section>
  );
}
