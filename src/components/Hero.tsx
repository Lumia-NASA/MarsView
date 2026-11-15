import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useRef } from "react";
import MarsGlobe, { type GlobeMotion } from "./MarsGlobe";
import { segment, useScrollScene } from "../hooks/useScrollScene";
import { dashboardPath, links } from "../lib/config";

export function Hero({ immersive = true }: { immersive?: boolean }) {
  const story = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const globeMotion = useRef<GlobeMotion>({ zoom: 1, explosion: 0 });
  useScrollScene(story, immersive, (progress) => {
    const root = story.current;
    if (!root) return;
    const intro = segment(progress, 0, 0.14);
    const opening = segment(progress, 0.12, 0.36);
    const closing = segment(progress, 0.6, 0.82);
    const explosion = opening * (1 - closing);
    const labels =
      segment(progress, 0.28, 0.38) * (1 - segment(progress, 0.62, 0.76));
    root.style.setProperty("--cutaway-progress", String(opening));
    const stageHeight = stage.current?.clientHeight ?? 0;
    const sceneHeight =
      stageHeight + (window.innerHeight * 0.68 - stageHeight) * opening;
    root.style.setProperty("--scene-height", `${sceneHeight}px`);
    root.style.setProperty(
      "--scene-lift",
      `${-opening * window.innerHeight * 0.09}px`,
    );
    root.style.setProperty("--intro-opacity", String(1 - intro));
    root.style.setProperty("--intro-y", `${-intro * 60}px`);
    root.style.setProperty(
      "--intro-visibility",
      progress > 0.18 ? "hidden" : "visible",
    );
    root.style.setProperty("--layers-opacity", String(labels));
    root.style.setProperty(
      "--layers-visibility",
      labels > 0.01 ? "visible" : "hidden",
    );
    root.style.setProperty("--layers-y", `${(1 - opening) * 16}px`);
    globeMotion.current.zoom = 1;
    globeMotion.current.explosion = explosion;
    globeMotion.current.orientation = opening;
    globeMotion.current.hold = progress >= 0.12;
    globeMotion.current.requestRender?.();
  });
  return (
    <>
      <section
        ref={story}
        id="home"
        aria-labelledby="hero-title"
        className="hero-story"
        data-immersive={immersive}
      >
        <div className="orbital-hero">
          <div className="page-width hero-heading" data-enter>
            <div className="hero-eyebrow">
              <span>Martian cartography & exploration</span>
              <span>NASA Space Apps / 2026</span>
            </div>
            <h1 id="hero-title">MARSVIEW</h1>
          </div>
          <div ref={stage} className="page-width orbital-stage">
            <div className="hero-side-note">
              <span className="technical text-copper">Planetary survey</span>
              <p>
                The fourth world.
                <br />
                <span className="text-muted">A closer perspective.</span>
              </p>
            </div>
            <div className="hero-planet" data-enter>
              <div className="hero-planet-depth">
                <MarsGlobe
                  allowMotion
                  motion={globeMotion}
                  className="h-full w-full"
                />
              </div>
            </div>
            <div className="hero-side-note hero-side-note-right">
              <span className="technical text-copper">Mean radius</span>
              <p className="hero-measure">
                3,389.5 <span>km</span>
              </p>
              <span className="technical text-muted">Mars / Solar system</span>
            </div>
            <span className="hero-drag-hint technical">
              Drag to explore the surface
            </span>
          </div>
          <div className="page-width hero-bottom" data-enter>
            <p className="hero-statement">
              An entire planet.
              <br />
              <span>A new point of view.</span>
            </p>
            <div className="hero-actions">
              <a href={dashboardPath} className="button-primary group">
                Open dashboard{" "}
                <ArrowUpRight size={18} className="action-arrow" />
              </a>
              <a
                href={links.data}
                target="_blank"
                rel="noreferrer"
                className="button-secondary"
              >
                Explore NASA Data <ArrowUpRight size={16} />
              </a>
            </div>
            <a
              href="#capabilities"
              className="hero-scroll"
              aria-label="Scroll to MarsView capabilities"
            >
              <ArrowDown size={18} />
              <span>Scroll to discover</span>
            </a>
          </div>
          <div className="planet-layers" aria-label="Mars interior layers">
            <dl>
              <div className="planet-layer planet-layer-crust">
                <dt>Crust</dt>
                <dd>The rocky outer shell</dd>
              </div>
              <div className="planet-layer planet-layer-mantle">
                <dt>Mantle</dt>
                <dd>A deep layer of silicate rock</dd>
              </div>
              <div className="planet-layer planet-layer-core">
                <dt>Core</dt>
                <dd>The iron-rich center</dd>
              </div>
            </dl>
            <a
              href="https://science.nasa.gov/mars/facts/#structure"
              target="_blank"
              rel="noreferrer"
            >
              Interior schematic &middot; NASA <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </section>
      <section className="journey-surface" aria-labelledby="journey-title">
        <div className="page-width journey-introduction">
          <h2 id="journey-title">
            Beneath
            <br />
            the surface.
          </h2>
          <p>A journey through the layers of Mars.</p>
        </div>
        <div className="journey-landscape">
          <img
            src="/images/jezero-delta.jpg"
            width={1648}
            height={1200}
            alt="The ancient delta and rocky terrain in Jezero Crater, photographed by Perseverance."
            loading="lazy"
          />
          <div className="page-width journey-caption">
            <h3>
              From orbit.
              <br />
              To the ground.
            </h3>
            <a href="#capabilities" className="button-secondary">
              Explore Jezero <ArrowDown size={16} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
