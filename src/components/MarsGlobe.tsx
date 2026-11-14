import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import type { Region } from "../lib/config";
import { sound } from "../lib/sound";

export interface MarsGlobeProps {
  paused?: boolean;
  zoom?: number;
  grid?: boolean;
  region?: Region;
  className?: string;
}

/** Lusion-grade 3D Interactive Mars Globe with Atmosphere Shaders, Cosmic Particle Swarm, and Inertia Physics */
export default function MarsGlobe({
  paused = false,
  zoom = 1,
  grid = false,
  region,
  className = "",
}: MarsGlobeProps) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    focus: (region: Region) => void;
    start: () => void;
  } | null>(null);
  const reduced = useReducedMotion();
  const settings = useRef({ paused, zoom, grid, reduced });
  settings.current = { paused, zoom, grid, reduced };
  const initialRegion = useRef(region);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    let disposed = false;
    let cleanup = () => {};

    import("../lib/three")
      .then((THREE) => {
        if (disposed) return;
        let renderer: InstanceType<typeof THREE.WebGLRenderer>;
        try {
          renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
          });
        } catch {
          setStatus("fallback");
          return;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        mount.appendChild(renderer.domElement);
        renderer.domElement.setAttribute("aria-hidden", "true");

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
        camera.position.z = 4.5;

        // Dynamic Lighting
        const ambient = new THREE.AmbientLight(0xe3b9a5, 1.3);
        scene.add(ambient);

        const sunlight = new THREE.DirectionalLight(0xffe2c4, 3.4);
        sunlight.position.set(-3, 2.2, 3);
        scene.add(sunlight);

        const rim = new THREE.DirectionalLight(0xb85837, 1.8);
        rim.position.set(4, -1, -2);
        scene.add(rim);

        // Sub-light for bottom reflection
        const bounce = new THREE.DirectionalLight(0xe99c72, 0.6);
        bounce.position.set(0, -3, 1);
        scene.add(bounce);

        // Root container for parallax tilt
        const rootGroup = new THREE.Group();
        scene.add(rootGroup);

        const globe = new THREE.Group();
        rootGroup.add(globe);

        // Core Mars Sphere
        const geometry = new THREE.SphereGeometry(1, 96, 64);
        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.95,
          metalness: 0.05,
        });
        const sphere = new THREE.Mesh(geometry, material);
        globe.add(sphere);

        // Texture Loading
        let texture: InstanceType<typeof THREE.Texture> | undefined;
        new THREE.TextureLoader().load(
          "/images/mars-color.jpg",
          (loaded) => {
            if (disposed) {
              loaded.dispose();
              return;
            }
            texture = loaded;
            loaded.colorSpace = THREE.SRGBColorSpace;
            loaded.anisotropy = Math.min(
              4,
              renderer.capabilities.getMaxAnisotropy(),
            );
            material.map = loaded;
            material.needsUpdate = true;
            setStatus("ready");
            draw();
          },
          undefined,
          () => {
            if (!disposed) setStatus("fallback");
          },
        );

        // Volumetric Atmospheric Glow Shader (Fresnel Corona)
        const atmosphereGeo = new THREE.SphereGeometry(1.18, 64, 48);
        const atmosphereMat = new THREE.ShaderMaterial({
          vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            uniform vec3 uColor;
            uniform float uTime;
            void main() {
              vec3 normal = normalize(vNormal);
              vec3 viewDir = normalize(-vPosition);
              float dotNV = dot(normal, viewDir);
              float fresnel = pow(1.0 - abs(dotNV), 3.2);
              float pulse = 0.88 + 0.12 * sin(uTime * 1.8);
              gl_FragColor = vec4(uColor, fresnel * 0.72 * pulse);
            }
          `,
          uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(0xe99c72) },
          },
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          transparent: true,
          depthWrite: false,
        });
        const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
        rootGroup.add(atmosphere);

        // Inner soft atmospheric rim for lit edge
        const innerAtmoGeo = new THREE.SphereGeometry(1.02, 64, 48);
        const innerAtmoMat = new THREE.ShaderMaterial({
          vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            uniform vec3 uColor;
            void main() {
              vec3 normal = normalize(vNormal);
              vec3 viewDir = normalize(-vPosition);
              float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.5);
              gl_FragColor = vec4(uColor, fresnel * 0.45);
            }
          `,
          uniforms: {
            uColor: { value: new THREE.Color(0xffcca3) },
          },
          blending: THREE.AdditiveBlending,
          side: THREE.FrontSide,
          transparent: true,
          depthWrite: false,
        });
        const innerAtmo = new THREE.Mesh(innerAtmoGeo, innerAtmoMat);
        globe.add(innerAtmo);

        // Interactive 3D Cosmic Particle Swarm / Stardust Halo
        const particleCount = 1100;
        const particlePositions = new Float32Array(particleCount * 3);
        const particleOriginals = new Float32Array(particleCount * 3);
        const particlePhases = new Float32Array(particleCount);
        const particleSpeeds = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);
          // Disc flattening with inclined angle
          const dist = 1.18 + Math.random() * 0.72;
          const x = dist * Math.sin(phi) * Math.cos(theta);
          const y = dist * Math.sin(phi) * Math.sin(theta) * 0.65; // flattened slightly
          const z = dist * Math.cos(phi);

          particlePositions[i * 3] = x;
          particlePositions[i * 3 + 1] = y;
          particlePositions[i * 3 + 2] = z;

          particleOriginals[i * 3] = x;
          particleOriginals[i * 3 + 1] = y;
          particleOriginals[i * 3 + 2] = z;

          particlePhases[i] = Math.random() * Math.PI * 2;
          particleSpeeds[i] = 0.001 + Math.random() * 0.002;
        }

        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(particlePositions, 3),
        );
        const particleMat = new THREE.PointsMaterial({
          size: 0.019,
          color: 0xf3b38d,
          transparent: true,
          opacity: 0.68,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        rootGroup.add(particles);

        // Coordinate Graticule (Grid)
        const gridGeometry = new THREE.SphereGeometry(1.006, 24, 12);
        const gridMaterial = new THREE.LineBasicMaterial({
          color: 0xf7ca9d,
          transparent: true,
          opacity: 0.22,
        });
        const wire = new THREE.WireframeGeometry(gridGeometry);
        const graticule = new THREE.LineSegments(wire, gridMaterial);
        globe.add(graticule);

        // Region Location Pin
        const pinGeometry = new THREE.SphereGeometry(0.018, 12, 8);
        const pinMaterial = new THREE.MeshBasicMaterial({ color: 0xffd4a3 });
        const pin = new THREE.Mesh(pinGeometry, pinMaterial);
        pin.visible = false;
        globe.add(pin);

        // Interactive Radar Ping Ring on Click
        const radarGeo = new THREE.RingGeometry(1.01, 1.025, 48);
        const radarMat = new THREE.MeshBasicMaterial({
          color: 0xe99c72,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
        });
        const radarPing = new THREE.Mesh(radarGeo, radarMat);
        radarPing.rotation.x = Math.PI / 2;
        rootGroup.add(radarPing);

        let radarScale = 1;
        let radarOpacity = 0;

        const triggerRadarPing = () => {
          radarScale = 1.01;
          radarOpacity = 0.85;
          sound.playGlobePing();
        };

        // Navigation state & Inertia variables
        let targetX = 0.15,
          targetY = 3.6,
          frame = 0,
          last = 0,
          inView = true,
          pointer: { x: number; y: number; id: number } | null = null,
          velX = 0,
          velY = 0,
          mouseNormX = 0,
          mouseNormY = 0,
          tiltTargetX = 0,
          tiltTargetY = 0;

        globe.rotation.set(targetX, targetY, -0.12);

        const focus = (destination: Region) => {
          const lat = (destination.latitude * Math.PI) / 180;
          const lon = (destination.longitude * Math.PI) / 180;
          targetX = lat;
          targetY = -Math.PI / 2 - lon;
          globe.rotation.z = 0;
          pin.position
            .set(
              Math.cos(lat) * Math.cos(lon),
              Math.sin(lat),
              -Math.cos(lat) * Math.sin(lon),
            )
            .multiplyScalar(1.02);
          pin.visible = true;
          triggerRadarPing();
          if (settings.current.reduced) globe.rotation.set(targetX, targetY, 0);
          start();
        };

        api.current = { focus, start };

        function draw() {
          if (disposed || renderer.getContext().isContextLost()) return;
          graticule.visible = settings.current.grid;
          camera.position.z = 4.5 / settings.current.zoom;
          renderer.render(scene, camera);
        }

        function tick(time: number) {
          frame = 0;
          if (disposed || !inView || document.hidden) return;
          const delta = Math.min((time - last) / 1000, 0.05);
          if (time - last < 25) {
            frame = requestAnimationFrame(tick);
            return;
          }
          last = time;

          // Update atmosphere breathing
          atmosphereMat.uniforms.uTime.value = time * 0.001;

          // Auto-rotation if not paused/reduced/dragging
          if (!settings.current.paused && !settings.current.reduced && !pointer) {
            targetY += delta * 0.085;
          }

          // Inertia coasting after drag release
          if (!pointer && (Math.abs(velX) > 0.0001 || Math.abs(velY) > 0.0001)) {
            targetY += velX;
            targetX = THREE.MathUtils.clamp(targetX + velY, -1.2, 1.2);
            velX *= 0.91;
            velY *= 0.91;
          }

          // Smooth interpolation for rotation
          const smoothFactor = settings.current.reduced ? 1 : 0.12;
          globe.rotation.x += (targetX - globe.rotation.x) * smoothFactor;
          globe.rotation.y += (targetY - globe.rotation.y) * smoothFactor;

          // Spatial parallax tilt from mouse movement
          tiltTargetX = mouseNormY * 0.22;
          tiltTargetY = mouseNormX * 0.22;
          rootGroup.rotation.x += (tiltTargetX - rootGroup.rotation.x) * 0.08;
          rootGroup.rotation.y += (tiltTargetY - rootGroup.rotation.y) * 0.08;

          // Rotate and swirl cosmic particles
          if (!settings.current.reduced) {
            particles.rotation.y += 0.0008;
            particles.rotation.z += 0.0003;

            // Radar pulse ring expansion
            if (radarOpacity > 0.01) {
              radarScale += delta * 0.95;
              radarOpacity -= delta * 1.2;
              radarPing.scale.set(radarScale, radarScale, radarScale);
              radarMat.opacity = Math.max(0, radarOpacity);
            }
          }

          draw();

          const moving =
            Math.abs(targetX - globe.rotation.x) +
              Math.abs(targetY - globe.rotation.y) +
              Math.abs(velX) +
              Math.abs(velY) >
            0.0001;

          if (
            (!settings.current.paused && !settings.current.reduced) ||
            pointer ||
            moving ||
            radarOpacity > 0.01
          ) {
            frame = requestAnimationFrame(tick);
          }
        }

        function start() {
          if (!frame && inView && !document.hidden && !disposed) {
            last = performance.now();
            frame = requestAnimationFrame(tick);
          }
        }

        const resize = new ResizeObserver(() => {
          const { width, height } = mount.getBoundingClientRect();
          if (!width || !height) return;
          renderer.setSize(width, height);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          draw();
        });
        resize.observe(mount);

        const observer = new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          if (inView) start();
          else {
            cancelAnimationFrame(frame);
            frame = 0;
          }
        });
        observer.observe(mount);

        const visibility = () => {
          if (document.hidden) {
            cancelAnimationFrame(frame);
            frame = 0;
          } else start();
        };

        const down = (event: PointerEvent) => {
          if (!event.isPrimary) return;
          pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
          velX = 0;
          velY = 0;
          mount.setPointerCapture(event.pointerId);
          triggerRadarPing();
          start();
        };

        const move = (event: PointerEvent) => {
          const rect = mount.getBoundingClientRect();
          mouseNormX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouseNormY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

          if (!pointer || event.pointerId !== pointer.id) return;
          const deltaX = (event.clientX - pointer.x) * 0.008;
          const deltaY = (event.clientY - pointer.y) * 0.005;

          velX = deltaX;
          velY = deltaY;

          targetY += deltaX;
          targetX = THREE.MathUtils.clamp(targetX + deltaY, -1.2, 1.2);
          pointer.x = event.clientX;
          pointer.y = event.clientY;
        };

        const up = () => {
          pointer = null;
        };

        const key = (event: KeyboardEvent) => {
          if (
            !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key,
            )
          )
            return;
          event.preventDefault();
          if (event.key === "ArrowLeft") targetY -= 0.12;
          if (event.key === "ArrowRight") targetY += 0.12;
          if (event.key === "ArrowUp") targetX = Math.max(-1.2, targetX - 0.12);
          if (event.key === "ArrowDown")
            targetX = Math.min(1.2, targetX + 0.12);
          triggerRadarPing();
          start();
        };

        const lost = (event: Event) => {
          event.preventDefault();
          cancelAnimationFrame(frame);
          frame = 0;
          setStatus("fallback");
        };

        const restored = () => {
          setStatus("ready");
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

        if (initialRegion.current) focus(initialRegion.current);
        start();

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

          geometry.dispose();
          material.dispose();
          texture?.dispose();
          atmosphereGeo.dispose();
          atmosphereMat.dispose();
          innerAtmoGeo.dispose();
          innerAtmoMat.dispose();
          particleGeo.dispose();
          particleMat.dispose();
          gridGeometry.dispose();
          wire.dispose();
          gridMaterial.dispose();
          pinGeometry.dispose();
          pinMaterial.dispose();
          radarGeo.dispose();
          radarMat.dispose();
          renderer.dispose();
          renderer.domElement.remove();
          api.current = null;
        };
      })
      .catch(() => {
        if (!disposed) setStatus("fallback");
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
  }, [paused, zoom, grid, reduced]);

  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${status === "ready" ? "opacity-0" : "opacity-100"}`}
      >
        <div className="aspect-square h-[72%] max-w-[85%] rounded-full bg-[url('/images/mars-color.jpg')] bg-cover bg-center shadow-[inset_-50px_-20px_70px_25px_#050505,inset_8px_4px_24px_#e99c7250]" />
      </div>
      <div
        ref={host}
        role="group"
        data-cursor="drag"
        aria-roledescription="interactive globe"
        aria-label="3D Mars globe. Drag or use the arrow keys to rotate."
        tabIndex={status === "ready" ? 0 : -1}
        className={`absolute inset-0 touch-pan-y rounded-full outline-offset-[-16px] cursor-none ${status === "ready" ? "" : "opacity-0"}`}
      />
      {status === "fallback" && (
        <p
          className="absolute inset-x-0 bottom-2 text-center text-[10px] text-muted"
          role="status"
        >
          Static view · 3D is unavailable on this device
        </p>
      )}
    </div>
  );
}
