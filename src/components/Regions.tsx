import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useRef, useState } from "react";
import { dashboardPath, regions } from "../lib/config";
import { clamp, useScrollScene } from "../hooks/useScrollScene";

const photographs = ["/images/jezero-panorama.jpg", "/images/olympus-mons.jpg", "/images/valles-marineris.jpg"];

export function Regions({ immersive = true }: { immersive?: boolean }) {
  const scene = useRef<HTMLElement>(null);
  const slides = useRef<(HTMLElement | null)[]>([]);
  const currentIndex = useRef(0);
  const [active, setActive] = useState(0);

  useScrollScene(scene, immersive, progress => {
    const position = progress * (regions.length - 1);
    slides.current.forEach((slide, index) => {
      if (!slide) return;
      const offset = index - position;
      slide.style.setProperty("--slide-x", `${offset * 88}%`);
      slide.style.setProperty("--slide-z", `${-Math.abs(offset) * 260}px`);
      slide.style.setProperty("--slide-rotate", `${-offset * 32}deg`);
      slide.style.setProperty("--slide-opacity", String(clamp(1 - Math.abs(offset) * .48, .12, 1)));
      slide.style.zIndex = String(10 - Math.round(Math.abs(offset) * 3));
    });
    const index = Math.round(position);
    if (index !== currentIndex.current) {
      currentIndex.current = index;
      setActive(index);
    }
  });

  function select(index: number) {
    const target = scene.current;
    if (!target) return;
    const progress = clamp(index, 0, regions.length - 1) / (regions.length - 1);
    window.scrollTo({
      top: window.scrollY + target.getBoundingClientRect().top + progress * Math.max(0, target.offsetHeight - window.innerHeight),
      behavior: "smooth",
    });
  }

  return (
    <section ref={scene} id="regions" className="region-story" data-immersive={immersive} aria-labelledby="regions-title">
      <div className="region-stage" onKeyDown={event => {
        if (!immersive || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        select(active + (event.key === "ArrowRight" ? 1 : -1));
      }}>
        <div className="page-width region-heading">
          <h2 id="regions-title">Three places.<br /><span>Three questions.</span></h2>
          <p>Move through the landscape.<br />Choose where your exploration begins.</p>
        </div>
        <div className="region-deck" role="group" aria-roledescription="carousel" aria-label="Regions of Mars">
          {regions.map((region, index) => (
            <article key={region.id} ref={element => { slides.current[index] = element; }}
              className="region-slide" inert={immersive && index !== active}
              aria-hidden={immersive && index !== active} aria-label={`${index + 1} of ${regions.length}: ${region.name}`}>
              <img src={photographs[index]} alt={`${region.name}, photographed on Mars`} loading="lazy" decoding="async" />
              <div className="region-slide-shade" />
              <div className="region-slide-copy">
                <p className="technical">{region.type}</p>
                <h3>{region.name}</h3>
                <p className="region-description">{region.description}</p>
                <div className="region-slide-links">
                  <a className="button-primary" href={dashboardPath}>Open dashboard <ArrowUpRight size={16} /></a>
                  <a className="region-source" href={region.source} target="_blank" rel="noreferrer" aria-label={`Read NASA sources about ${region.name}`}>
                    NASA field notes <ArrowUpRight size={15} />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
        {immersive && <nav className="page-width region-navigation" aria-label="Choose a Mars region">
          <button className="icon-button" onClick={() => select(active - 1)} disabled={active === 0} aria-label="Previous region"><ArrowLeft size={18} /></button>
          <div className="region-tabs">
            {regions.map((region, index) => <button key={region.id} onClick={() => select(index)} aria-current={index === active ? "true" : undefined}>{region.name}</button>)}
          </div>
          <button className="icon-button" onClick={() => select(active + 1)} disabled={active === regions.length - 1} aria-label="Next region"><ArrowRight size={18} /></button>
        </nav>}
      </div>
    </section>
  );
}
