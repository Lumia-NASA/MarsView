import { useEffect, useRef, useState, type RefObject } from "react";
import { createMarsInterior } from "../lib/marsInterior";
import { useReducedMotion } from "../hooks/useReducedMotion";
import type { Region } from "../lib/config";

export interface GlobeMotion {
  zoom: number;
  explosion: number;
  orientation?: number;
  hold?: boolean;
  requestRender?: () => void;
}

export interface MarsGlobeProps {
  paused?: boolean;
  allowMotion?: boolean;
  zoom?: number;
  grid?: boolean;
  region?: Region;
  className?: string;
  onReady?: () => void;
  motion?: RefObject<GlobeMotion>;
}

export default function MarsGlobe({
  paused = false,
  allowMotion = false,
  zoom = 1,
  grid = false,
  region,
  className = "",
  onReady,
  motion,
}: MarsGlobeProps) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    focus: (region: Region) => void;
    start: () => void;
  } | null>(null);
  const reduced = useReducedMotion();
  const settings = useRef({ paused, zoom, grid, reduced, allowMotion });
  settings.current = { paused, zoom, grid, reduced, allowMotion };
  const selectedRegion = useRef(region);
  selectedRegion.current = region;
  const readyCallback = useRef(onReady);
  readyCallback.current = onReady;
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    let disposed = false;
    let cleanup = () => {};

    import("../lib/three")
      .then((THREE) => {
        if (disposed) return;
        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "default",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = motion
          ? new THREE.OrthographicCamera(-1.15, 1.15, 1.15, -1.15, 0.1, 100)
          : new THREE.PerspectiveCamera(36, 1, 0.1, 100);
        camera.position.z = motion ? 8 : 3.65;
        scene.add(new THREE.AmbientLight(0xdfe5f2, 1.2));
        const sun = new THREE.DirectionalLight(0xffeee0, 2.5);
        sun.position.set(-3, 2, 3);
        scene.add(sun);
        const rim = new THREE.DirectionalLight(0xc8d4e5, 1.1);
        rim.position.set(3, -1, -2);
        scene.add(rim);

        const globe = new THREE.Group();
        scene.add(globe);
        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.96,
          metalness: 0,
          side: THREE.DoubleSide,
        });
        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#include <map_fragment>
            float terrainLight = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            vec3 mineralShadows = vec3(0.055, 0.062, 0.082) * (0.6 + terrainLight * 3.0);
            vec3 dustySurface = diffuseColor.rgb * vec3(0.85, 1.12, 1.32);
            diffuseColor.rgb = mix(mineralShadows, dustySurface, smoothstep(0.035, 0.22, terrainLight));
          `,
          );
        };
        const interior = motion ? createMarsInterior(THREE, material) : null;
        const surfaceGeometry = new THREE.SphereGeometry(1, 128, 96);
        const intactSurface = new THREE.Mesh(surfaceGeometry, material);
        globe.add(intactSurface);
        if (interior) globe.add(interior.group);
        const atmosphereGeometry = new THREE.SphereGeometry(1.025, 48, 32);
        const atmosphereMaterial = new THREE.ShaderMaterial({
          vertexShader: `varying vec3 vNormal; varying vec3 vPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * vec4(vPosition, 1.0);
          }`,
          fragmentShader: `varying vec3 vNormal; varying vec3 vPosition;
          void main() {
            float edge = pow(1.0 - abs(dot(normalize(vNormal), normalize(-vPosition))), 4.0);
            gl_FragColor = vec4(0.88, 0.48, 0.27, edge * 0.24);
          }`,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          transparent: true,
          depthWrite: false,
        });
        const atmosphere = new THREE.Mesh(
          atmosphereGeometry,
          atmosphereMaterial,
        );
        scene.add(atmosphere);
        const gridGeometry = new THREE.SphereGeometry(1.004, 24, 12);
        const wire = new THREE.WireframeGeometry(gridGeometry);
        const gridMaterial = new THREE.LineBasicMaterial({
          color: 0xf7ca9d,
          transparent: true,
          opacity: 0.2,
        });
        const graticule = new THREE.LineSegments(wire, gridMaterial);
        globe.add(graticule);
        const pinGeometry = new THREE.SphereGeometry(0.018, 12, 8);
        const pinMaterial = new THREE.MeshBasicMaterial({ color: 0xffd4a3 });
        const pin = new THREE.Mesh(pinGeometry, pinMaterial);
        pin.visible = false;
        globe.add(pin);

        let texture: InstanceType<typeof THREE.Texture> | undefined;
        let frame = 0;
        let last = 0;
        let inView = true;
        let failed = false;
        let targetX = 0.12;
        let targetY = 3.6;
        let velocity = 0;
        let pointer: { x: number; y: number; id: number; time: number } | null =
          null;
        globe.rotation.set(targetX, targetY, -0.1);

        let renderWidth = 0;
        let renderHeight = 0;
        function fitRenderer() {
          const { width, height } = mount!.getBoundingClientRect();
          if (!width || !height) return;
          // Match the displayed size, including the cutaway transform. Bucket allocations
          // so the framebuffer is not recreated for every small scroll movement.
          const nextWidth = Math.min(1200, Math.ceil(width / 64) * 64);
          const nextHeight = Math.round((nextWidth * height) / width);
          if (nextWidth !== renderWidth || nextHeight !== renderHeight) {
            renderWidth = nextWidth;
            renderHeight = nextHeight;
            renderer.setSize(renderWidth, renderHeight, false);
          }
          const aspect = width / height;
          if (camera instanceof THREE.OrthographicCamera) {
            const opening = motion?.current.orientation ?? 0;
            const halfWidth = 1.12 + opening * 0.82;
            const halfHeight = Math.max(1.12, halfWidth / aspect);
            camera.left = -halfHeight * aspect;
            camera.right = halfHeight * aspect;
            camera.top = halfHeight;
            camera.bottom = -halfHeight;
          } else camera.aspect = aspect;
          camera.updateProjectionMatrix();
        }

        function draw() {
          if (disposed || failed || renderer.getContext().isContextLost())
            return;
          fitRenderer();
          graticule.visible = settings.current.grid;
          const separation = motion?.current.explosion ?? 0;
          interior?.setReveal(separation);
          if (interior) {
            interior.group.visible = separation > 0.0001;
            intactSurface.visible = !interior.group.visible;
          }
          if (interior) {
            // Settle into a readable cutaway, then return continuously to the orbital view.
            const orientation = motion?.current.orientation ?? separation;
            const turn = Math.atan2(
              Math.sin(0.55 - targetY),
              Math.cos(0.55 - targetY),
            );
            globe.rotation.set(
              targetX + (0.08 - targetX) * orientation,
              targetY + turn * orientation,
              -0.1 * (1 - orientation),
            );
          }
          atmosphere.visible = separation < 0.02;
          if (camera instanceof THREE.PerspectiveCamera) {
            camera.position.z = 3.65 / settings.current.zoom;
          }
          renderer.render(scene, camera);
        }

        function tick(time: number) {
          frame = 0;
          if (disposed || !inView || document.hidden || failed) return;
          const delta = Math.min((time - last) / 1000, 0.05);
          last = time;
          const {
            paused: stopped,
            reduced: reduce,
            allowMotion: manual,
          } = settings.current;
          const rotating = !stopped && (!reduce || manual);
          const inspecting =
            motion?.current.hold || (motion?.current.explosion ?? 0) > 0.001;
          if (!pointer && rotating && !inspecting) targetY += delta * 0.16;
          if (!pointer && !reduce && !stopped && !inspecting) {
            targetY += velocity * delta;
            velocity *= Math.exp(-delta * 5);
          } else velocity = 0;
          const blend = reduce ? 1 : 1 - Math.exp(-delta * 12);
          globe.rotation.x += (targetX - globe.rotation.x) * blend;
          globe.rotation.y += (targetY - globe.rotation.y) * blend;
          draw();
          const settling =
            Math.abs(targetX - globe.rotation.x) +
              Math.abs(targetY - globe.rotation.y) >
            0.0001;
          if (
            (rotating && !inspecting) ||
            (!interior && settling) ||
            pointer ||
            Math.abs(velocity) > 0.001
          )
            frame = requestAnimationFrame(tick);
        }

        function start() {
          if (!frame && inView && !document.hidden && !disposed && !failed) {
            last = performance.now();
            frame = requestAnimationFrame(tick);
          }
        }

        function focus(destination: Region) {
          const lat = (destination.latitude * Math.PI) / 180;
          const lon = (destination.longitude * Math.PI) / 180;
          targetX = lat;
          const orientation = -Math.PI / 2 - lon;
          targetY =
            globe.rotation.y +
            Math.atan2(
              Math.sin(orientation - globe.rotation.y),
              Math.cos(orientation - globe.rotation.y),
            );
          globe.rotation.z = 0;
          velocity = 0;
          pin.position
            .set(
              Math.cos(lat) * Math.cos(lon),
              Math.sin(lat),
              -Math.cos(lat) * Math.sin(lon),
            )
            .multiplyScalar(1.02);
          pin.visible = true;
          start();
        }
        api.current = { focus, start };
        if (motion) motion.current.requestRender = start;

        const resize = new ResizeObserver(draw);
        resize.observe(mount);
        const observer = new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          setVisible(inView && !document.hidden);
          if (inView) start();
          else {
            cancelAnimationFrame(frame);
            frame = 0;
          }
        });
        observer.observe(mount);
        const visibility = () => {
          setVisible(inView && !document.hidden);
          if (document.hidden) {
            cancelAnimationFrame(frame);
            frame = 0;
          } else start();
        };
        const down = (event: PointerEvent) => {
          if (
            !event.isPrimary ||
            event.button !== 0 ||
            motion?.current.hold ||
            (motion?.current.explosion ?? 0) > 0.001
          )
            return;
          pointer = {
            x: event.clientX,
            y: event.clientY,
            id: event.pointerId,
            time: event.timeStamp,
          };
          velocity = 0;
          mount.setPointerCapture(event.pointerId);
          start();
        };
        const move = (event: PointerEvent) => {
          if (!pointer || pointer.id !== event.pointerId) return;
          const dx = (event.clientX - pointer.x) * 0.007;
          const dy = (event.clientY - pointer.y) * 0.005;
          const elapsed = Math.max(
            (event.timeStamp - pointer.time) / 1000,
            0.008,
          );
          velocity = THREE.MathUtils.clamp(dx / elapsed, -2, 2);
          targetY += dx;
          targetX = THREE.MathUtils.clamp(targetX + dy, -1.2, 1.2);
          pointer = {
            x: event.clientX,
            y: event.clientY,
            id: event.pointerId,
            time: event.timeStamp,
          };
          start();
        };
        const up = (event: PointerEvent) => {
          if (pointer?.id !== event.pointerId) return;
          if (event.timeStamp - pointer.time > 100) velocity = 0;
          pointer = null;
          start();
        };
        const key = (event: KeyboardEvent) => {
          if (
            !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key,
            )
          )
            return;
          event.preventDefault();
          if (event.key === "ArrowLeft") targetY -= 0.16;
          if (event.key === "ArrowRight") targetY += 0.16;
          if (event.key === "ArrowUp") targetX = Math.max(-1.2, targetX - 0.12);
          if (event.key === "ArrowDown")
            targetX = Math.min(1.2, targetX + 0.12);
          start();
        };
        const lost = (event: Event) => {
          event.preventDefault();
          cancelAnimationFrame(frame);
          frame = 0;
          setStatus("fallback");
        };
        const restored = () => {
          if (!texture || failed) return;
          setStatus("ready");
          draw();
          start();
        };
        document.addEventListener("visibilitychange", visibility);
        mount.addEventListener("pointerdown", down);
        mount.addEventListener("pointermove", move);
        mount.addEventListener("pointerup", up);
        mount.addEventListener("pointercancel", up);
        mount.addEventListener("lostpointercapture", up);
        mount.addEventListener("keydown", key);
        renderer.domElement.addEventListener("webglcontextlost", lost);
        renderer.domElement.addEventListener("webglcontextrestored", restored);

        cleanup = () => {
          cancelAnimationFrame(frame);
          resize.disconnect();
          observer.disconnect();
          document.removeEventListener("visibilitychange", visibility);
          mount.removeEventListener("pointerdown", down);
          mount.removeEventListener("pointermove", move);
          mount.removeEventListener("pointerup", up);
          mount.removeEventListener("pointercancel", up);
          mount.removeEventListener("lostpointercapture", up);
          mount.removeEventListener("keydown", key);
          renderer.domElement.removeEventListener("webglcontextlost", lost);
          renderer.domElement.removeEventListener(
            "webglcontextrestored",
            restored,
          );
          interior?.dispose();
          surfaceGeometry?.dispose();
          [
            material,
            atmosphereGeometry,
            atmosphereMaterial,
            gridGeometry,
            wire,
            gridMaterial,
            pinGeometry,
            pinMaterial,
          ].forEach((resource) => resource.dispose());
          texture?.dispose();
          renderer.dispose();
          renderer.domElement.remove();
          api.current = null;
          if (motion) motion.current.requestRender = undefined;
        };
        new THREE.TextureLoader().load(
          "/images/mars-8k.jpg",
          (loaded) => {
            if (disposed) {
              loaded.dispose();
              return;
            }
            texture = loaded;
            loaded.colorSpace = THREE.SRGBColorSpace;
            loaded.wrapS = THREE.RepeatWrapping;
            loaded.anisotropy = Math.min(
              4,
              renderer.capabilities.getMaxAnisotropy(),
            );
            material.map = loaded;
            material.needsUpdate = true;
            setStatus("ready");
            readyCallback.current?.();
            draw();
            start();
          },
          undefined,
          () => {
            if (disposed) return;
            failed = true;
            cancelAnimationFrame(frame);
            frame = 0;
            setStatus("fallback");
            readyCallback.current?.();
          },
        );
        if (selectedRegion.current) focus(selectedRegion.current);
        start();
      })
      .catch(() => {
        if (!disposed) {
          cleanup();
          setStatus("fallback");
          readyCallback.current?.();
        }
      });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (region) api.current?.focus(region);
  }, [region]);
  useEffect(() => {
    api.current?.start();
  }, [paused, zoom, grid, reduced, allowMotion]);

  const fallbackMoving =
    status !== "ready" && visible && !paused && (!reduced || allowMotion);
  return (
    <div
      className={`globe-view relative ${className}`}
      data-renderer={status}
      data-motion-enabled={allowMotion}
    >
      <div
        aria-hidden="true"
        className={`globe-poster ${status === "ready" ? "globe-poster-hidden" : ""}`}
      >
        <div
          className="globe-poster-sphere"
          style={{ animationPlayState: fallbackMoving ? "running" : "paused" }}
        />
      </div>
      <div
        ref={host}
        role="group"
        data-cursor="drag"
        aria-roledescription="interactive globe"
        aria-label="3D Mars globe. Drag or use the arrow keys to rotate."
        tabIndex={status === "ready" ? 0 : -1}
        className={`absolute inset-0 touch-pan-y rounded-full cursor-grab active:cursor-grabbing outline-offset-[-16px] ${status === "ready" ? "" : "opacity-0"}`}
      />
      {status === "fallback" && (
        <p
          className="absolute inset-x-0 bottom-0 text-center text-xs text-muted"
          role="status"
        >
          Surface preview · 3D is unavailable on this device
        </p>
      )}
    </div>
  );
}
