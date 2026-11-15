import { useRef } from "react";
import { ArrowDown } from "lucide-react";
import { segment, useScrollScene } from "../hooks/useScrollScene";

const images = [
  { src: "/images/olympus-mons.jpg", alt: "Orbital mosaic of Olympus Mons" },
  { src: "/images/jezero-panorama.jpg", alt: "Rocks and distant hills in Jezero Crater" },
  { src: "/images/valles-marineris.jpg", alt: "The canyon system of Valles Marineris from orbit" },
];

export function SurfaceStory({ immersive = true }: { immersive?: boolean }) {
  const scene = useRef<HTMLElement>(null);
  useScrollScene(scene, immersive, (progress) => {
    const root = scene.current;
    if (!root) return;
    root.style.setProperty("--column-travel", `${progress * 48}vh`);
    root.style.setProperty("--story-scale", String(1.12 - progress * .12));
    root.style.setProperty("--story-title-y", `${-progress * 100}px`);
    root.style.setProperty("--story-title-opacity", String(1 - segment(progress, .4, .7)));
    root.style.setProperty("--story-end-visibility", progress > .7 ? "visible" : "hidden");
    root.style.setProperty("--story-end-opacity", String(segment(progress, .62, .86)));
  });

  return (
    <section ref={scene} className="surface-story" data-immersive={immersive} aria-labelledby="surface-story-title">
      <div className="surface-story-stage">
        <div className="landscape-columns" aria-hidden="true">
          {[0, 1, 2].map(column => (
            <div className={`landscape-column landscape-column-${column}`} key={column}>
              {[0, 1, 2].map(row => {
                const photo = images[(column + row) % images.length];
                return <img key={row} src={photo.src} alt="" loading="lazy" decoding="async" />;
              })}
            </div>
          ))}
        </div>
        <div className="landscape-shade" aria-hidden="true" />
        <div className="page-width landscape-story-copy">
          <h2 id="surface-story-title">Every terrain.<br />A different story.</h2>
          <p>Volcanic peaks. Ancient lake beds. Equatorial canyons.</p>
        </div>
        <div className="page-width landscape-story-end">
          <p>Follow the landscape.</p>
          <a href="#regions" className="button-primary">Discover the regions <ArrowDown size={16} /></a>
        </div>
      </div>
    </section>
  );
}
