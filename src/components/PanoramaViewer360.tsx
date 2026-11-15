import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ChevronRight,
  Crosshair,
  Layers3,
  Move,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { sound } from "../lib/sound";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface PanoramaViewer360Props {
  className?: string;
  onZoomChange?: (zoom: number) => void;
}

type LodTier = "preview" | "mid" | "high";

interface LodConfig {
  name: LodTier;
  label: string;
  url: string;
  width: number;
  height: number;
}

const LOD_TIERS: Record<LodTier, LodConfig> = {
  preview: {
    name: "preview",
    label: "2K (ECO)",
    url: "/images/panorama/jezero-360-preview.jpg",
    width: 2048,
    height: 641,
  },
  mid: {
    name: "mid",
    label: "4K (BALANCED)",
    url: "/images/panorama/jezero-360-mid.jpg",
    width: 4096,
    height: 1282,
  },
  high: {
    name: "high",
    label: "8K (ULTRA)",
    url: "/images/panorama/jezero-360-high.jpg",
    width: 8192,
    height: 2565,
  },
};

const COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function PanoramaViewer360({
  className = "",
  onZoomChange,
}: PanoramaViewer360Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sliderTrackRef = useRef<HTMLDivElement>(null);

  // Zoom state: 1.0 (minimum, displays 100% full height) to 4.0 (maximum, deep zoom)
  const [zoom, setZoom] = useState(1.0);
  const [activeLod, setActiveLod] = useState<LodTier>("preview");
  const [loaded, setLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [azimuth, setAzimuth] = useState(0);
  const [pitch, setPitch] = useState(0);

  const reduced = useReducedMotion();

  // Internal animation & physics refs
  const stateRef = useRef({
    zoom: 1.0,
    panX: 0,
    panY: 0,
    velX: 0,
    velY: 0,
    isPointerDown: false,
    lastPointerX: 0,
    lastPointerY: 0,
    aspectRatio: 36952 / 11570,
    activeImage: null as HTMLImageElement | null,
    images: {} as Partial<Record<LodTier, HTMLImageElement>>,
    activeLod: "preview" as LodTier,
    targetLod: "preview" as LodTier,
  });

  // Keep stateRef.current.zoom in sync with state
  stateRef.current.zoom = zoom;

  // Determine required LOD tier based on zoom level
  const determineLod = useCallback((zoomLevel: number): LodTier => {
    if (zoomLevel >= 2.6) return "high";
    if (zoomLevel >= 1.5) return "mid";
    return "preview";
  }, []);

  // Preload and switch LOD image adaptively
  const loadLodImage = useCallback((tier: LodTier) => {
    const config = LOD_TIERS[tier];
    if (stateRef.current.images[tier]) {
      stateRef.current.activeImage = stateRef.current.images[tier]!;
      stateRef.current.activeLod = tier;
      setActiveLod(tier);
      return;
    }

    const img = new Image();
    img.src = config.url;
    img.onload = () => {
      stateRef.current.images[tier] = img;
      stateRef.current.aspectRatio = img.naturalWidth / img.naturalHeight;
      // If this is still the active or higher target, switch to it
      stateRef.current.activeImage = img;
      stateRef.current.activeLod = tier;
      setActiveLod(tier);
      setLoaded(true);
    };
  }, []);

  // Set zoom with boundary clamping
  const updateZoom = useCallback(
    (newZoom: number) => {
      const clamped = Math.min(4.0, Math.max(1.0, +newZoom.toFixed(2)));
      setZoom(clamped);
      onZoomChange?.(clamped);

      const targetTier = determineLod(clamped);
      if (targetTier !== stateRef.current.activeLod) {
        loadLodImage(targetTier);
      }
    },
    [determineLod, loadLodImage, onZoomChange],
  );

  // Initial load
  useEffect(() => {
    loadLodImage("preview");
  }, [loadLodImage]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId = 0;

    const render = () => {
      const rect = container.getBoundingClientRect();
      const viewW = rect.width;
      const viewH = rect.height;

      if (viewW <= 0 || viewH <= 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Dynamic adaptive resolution buffer scaling
      const currentZoom = stateRef.current.zoom;
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        currentZoom > 2.0 ? 1.75 : 1.25,
      );

      const bufferW = Math.round(viewW * dpr);
      const bufferH = Math.round(viewH * dpr);

      if (canvas.width !== bufferW || canvas.height !== bufferH) {
        canvas.width = bufferW;
        canvas.height = bufferH;
      }

      // Physics coasting / inertia when not dragging (respects reduced motion)
      if (!stateRef.current.isPointerDown && !reduced) {
        stateRef.current.panX += stateRef.current.velX;
        stateRef.current.panY += stateRef.current.velY;
        stateRef.current.velX *= 0.92;
        stateRef.current.velY *= 0.92;
      }

      // Display dimensions
      // When zoom = 1.0 (minimum): displayHeight matches viewH exactly (fit height!)
      const displayH = viewH * currentZoom;
      const displayW = displayH * stateRef.current.aspectRatio;

      // Vertical clamping:
      // When zoom = 1.0, maxPanY is 0, so panY stays 0 (no vertical overshoot)
      // When zoom > 1.0, maxPanY allows free vertical panning up and down
      const maxPanY = Math.max(0, (displayH - viewH) / 2);

      // Smooth lerp panY back to 0 if zoom is near 1
      if (currentZoom <= 1.02) {
        stateRef.current.panY *= 0.85;
      } else {
        stateRef.current.panY = Math.max(
          -maxPanY,
          Math.min(maxPanY, stateRef.current.panY),
        );
      }

      // Horizontal seamless wrap around 360°
      const normalizedPanX =
        ((stateRef.current.panX % displayW) + displayW) % displayW;

      // Calculate Azimuth & Pitch readouts
      const currentAzimuth = Math.round((normalizedPanX / displayW) * 360) % 360;
      const currentPitch =
        maxPanY > 0 ? Math.round((stateRef.current.panY / maxPanY) * 22) : 0;

      setAzimuth(currentAzimuth);
      setPitch(currentPitch);

      // Draw to canvas with high quality
      ctx.save();
      ctx.scale(dpr, dpr);

      // Background fill
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, viewW, viewH);

      const activeImg = stateRef.current.activeImage;
      if (activeImg && activeImg.complete && activeImg.naturalWidth > 0) {
        // Vertical destination: centered when panY is 0
        const destY = (viewH - displayH) / 2 + stateRef.current.panY;

        // Draw primary instance
        const destX1 = -normalizedPanX;
        ctx.drawImage(activeImg, destX1, destY, displayW, displayH);

        // Draw wrap-around instance to the right if there is visible space
        if (destX1 + displayW < viewW) {
          ctx.drawImage(
            activeImg,
            destX1 + displayW,
            destY,
            displayW,
            displayH,
          );
        }

        // Draw wrap-around instance to the left if needed
        if (destX1 > 0) {
          ctx.drawImage(
            activeImg,
            destX1 - displayW,
            destY,
            displayW,
            displayH,
          );
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [reduced]);

  // Pointer drag event handlers for mouse & touch
  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    stateRef.current.isPointerDown = true;
    stateRef.current.lastPointerX = e.clientX;
    stateRef.current.lastPointerY = e.clientY;
    stateRef.current.velX = 0;
    stateRef.current.velY = 0;
    setIsDragging(true);

    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!stateRef.current.isPointerDown) return;

    const dx = e.clientX - stateRef.current.lastPointerX;
    const dy = e.clientY - stateRef.current.lastPointerY;

    stateRef.current.lastPointerX = e.clientX;
    stateRef.current.lastPointerY = e.clientY;

    // Pan horizontally (always active in 360°)
    stateRef.current.panX -= dx;
    stateRef.current.velX = -dx;

    // Pan vertically only when zoom > 1.0 (when full height is exceeded)
    if (stateRef.current.zoom > 1.01) {
      stateRef.current.panY += dy;
      stateRef.current.velY = dy;
    }
  };

  const handlePointerUp = () => {
    stateRef.current.isPointerDown = false;
    setIsDragging(false);
  };

  // Mouse wheel zoom support
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.2 : 0.2;
    updateZoom(stateRef.current.zoom + zoomDelta);
  };

  // Draggable slider knob / lever interaction
  const handleSliderTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = sliderTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newZoom = 1.0 + ratio * 3.0; // 1.0x to 4.0x
    updateZoom(newZoom);
    sound.playClick();
  };

  // Quick Surface Toggle button (preserves "Inspect the surface" / "Return to panorama" for automated tests)
  const isZoomedIn = zoom > 1.2;
  const toggleQuickZoom = () => {
    if (isZoomedIn) {
      updateZoom(1.0);
    } else {
      updateZoom(2.8);
    }
    sound.playClick();
  };

  // Compass direction label
  const compassIndex = Math.round(azimuth / 45) % 8;
  const compassPoint = COMPASS_POINTS[compassIndex];

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={`relative flex h-full w-full select-none overflow-hidden bg-void ${className}`}
    >
      {/* 360 Canvas Surface */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        data-cursor="drag"
        className={`h-full w-full touch-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      />

      {/* Atmospheric Vignette Gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0e0d0c]/70 via-transparent to-[#0e0d0c]/80"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-void/40 via-transparent to-void/40"
      />

      {/* Loading shimmer when initial preview is loading */}
      {!loaded && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-void/80 backdrop-blur-sm transition-opacity duration-500"
        >
          <div className="flex flex-col items-center gap-2 font-mono text-[10px] text-copper">
            <span className="size-2 animate-ping rounded-full bg-copper" />
            <span>CALIBRATING 360° MOSAIC…</span>
          </div>
        </div>
      )}

      {/* Center Reticle Crosshair */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center opacity-70 transition-opacity duration-300"
      >
        <div className="relative flex size-28 items-center justify-center rounded-full border border-white/20">
          <div className="size-20 rounded-full border border-dashed border-white/25 animate-[spin_45s_linear_infinite]" />
          <Crosshair className="absolute size-5 text-copper" strokeWidth={1.2} />
        </div>
      </div>

      {/* Top Left Scientific HUD Readout */}
      <div className="pointer-events-none absolute top-4 left-6 z-10 font-mono text-[10px] leading-relaxed tracking-wider text-paper/85">
        <div className="flex items-center gap-2 font-semibold text-copper">
          <span className="size-1.5 animate-pulse rounded-full bg-copper" />
          <span>JEZERO CRATER / SOL 3</span>
        </div>
        <div className="text-muted">
          MASTCAM-Z 360° HIGH-RESOLUTION MOSAIC
        </div>
        <div className="mt-1 flex items-center gap-2 text-[9px] text-paper/70">
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-copper font-medium">
            AZ: {azimuth}° {compassPoint}
          </span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-muted">
            PITCH: {pitch >= 0 ? `+${pitch}°` : `${pitch}°`}
          </span>
          <span className="rounded bg-copper/15 px-1.5 py-0.5 text-copper font-medium">
            LOD: {LOD_TIERS[activeLod].label}
          </span>
        </div>
      </div>

      {/* Top Right Drag Gesture Indicator */}
      <div className="pointer-events-none absolute top-4 right-5 z-10 hidden items-center gap-2 rounded-full border border-white/10 bg-void/60 px-3 py-1 font-mono text-[9px] text-muted backdrop-blur-md sm:flex">
        <Move size={11} className="text-copper animate-pulse" />
        <span>DRAG TO PAN 360°</span>
      </div>

      {/* Bottom Interactive HUD Bar (Adaptive Zoom Lever & Slider Control) */}
      <div className="absolute inset-x-4 bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-void/80 p-3 backdrop-blur-xl sm:px-5 sm:py-3.5">
        {/* Left: Quick Inspection Toggle Button */}
        <button
          onClick={toggleQuickZoom}
          aria-pressed={isZoomedIn}
          data-cursor="hover"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 bg-white/[.04] px-4 text-[11px] font-medium text-paper transition duration-200 hover:border-copper/60 hover:bg-white/[.08] hover:text-copper"
        >
          <Layers3 size={13} className="text-copper" />
          <span>{isZoomedIn ? "Return to panorama" : "Inspect the surface"}</span>
          <ChevronRight size={13} className="text-muted" />
        </button>

        {/* Center & Right: Draggable Zoom Lever / Slider ("Bolinha / Alavanca") */}
        <div className="flex flex-1 items-center justify-end gap-3 min-w-[240px] max-w-[360px]">
          <button
            onClick={() => updateZoom(1.0)}
            disabled={zoom <= 1.0}
            data-cursor="hover"
            aria-label="Minimum zoom / Full height"
            className="text-muted transition-colors hover:text-paper disabled:opacity-30"
          >
            <ZoomOut size={14} />
          </button>

          {/* Draggable Slider Track */}
          <div
            ref={sliderTrackRef}
            onClick={handleSliderTrackClick}
            className="group relative flex h-6 w-full cursor-pointer items-center"
          >
            {/* Background Track Line */}
            <div className="h-1.5 w-full rounded-full bg-white/10 transition-colors group-hover:bg-white/20">
              {/* Active Fill Track */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-copper/60 via-copper to-[#f5ba98]"
                style={{
                  width: `${((zoom - 1.0) / 3.0) * 100}%`,
                }}
              />
            </div>

            {/* Draggable Knob ("Bolinha / Alavanca") */}
            <div
              style={{
                left: `${((zoom - 1.0) / 3.0) * 100}%`,
              }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="flex size-5 items-center justify-center rounded-full border-2 border-copper bg-void shadow-[0_0_12px_rgba(233,156,114,0.7)] transition-transform duration-150 group-hover:scale-125">
                <span className="size-1.5 rounded-full bg-copper" />
              </div>
            </div>
          </div>

          <button
            onClick={() => updateZoom(4.0)}
            disabled={zoom >= 4.0}
            data-cursor="hover"
            aria-label="Maximum zoom"
            className="text-muted transition-colors hover:text-paper disabled:opacity-30"
          >
            <ZoomIn size={14} />
          </button>

          {/* Zoom Level Number Badge */}
          <span className="min-w-[48px] text-right font-mono text-[11px] font-semibold text-copper">
            {zoom.toFixed(1)}×
          </span>
        </div>
      </div>
    </div>
  );
}
