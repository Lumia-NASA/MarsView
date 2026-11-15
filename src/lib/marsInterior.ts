import type { BufferGeometry, MeshStandardMaterial } from "three";

type Three = typeof import("./three");

// Interior materials are illustrative. Surface imagery uses the Solar System Scope Mars map (CC BY 4.0).
const mineralNoise = `
  varying vec3 rockPosition;
  float mineralHash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float mineralNoise(vec3 p) {
    vec3 cell = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(mineralHash(cell), mineralHash(cell + vec3(1, 0, 0)), f.x),
          mix(mineralHash(cell + vec3(0, 1, 0)), mineralHash(cell + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(mineralHash(cell + vec3(0, 0, 1)), mineralHash(cell + vec3(1, 0, 1)), f.x),
          mix(mineralHash(cell + vec3(0, 1, 1)), mineralHash(cell + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float mineralFbm(vec3 p) {
    return mineralNoise(p) * 0.55 + mineralNoise(p * 2.07 + 4.3) * 0.3
      + mineralNoise(p * 4.13 + 9.2) * 0.15;
  }
`;

/** Closed hemispherical shells separate along their shared axis, then reassemble exactly. */
export function createMarsInterior(
  THREE: Three,
  surface: MeshStandardMaterial,
) {
  const group = new THREE.Group();
  const crustSection = new THREE.Group();
  const mantle = new THREE.Group();
  const outerCore = new THREE.Group();
  const geometries: BufferGeometry[] = [];
  const materials: MeshStandardMaterial[] = [];
  const halfStart = Math.PI / 2;

  function mineral(kind: "crust" | "mantle" | "core" | "inner") {
    const hot = kind === "core" || kind === "inner";
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: hot ? 0xffb43c : 0x000000,
      emissiveIntensity: hot ? 0.7 : 0,
      roughness: hot ? 0.7 : 0.98,
      metalness: hot ? 0.12 : 0,
      side: THREE.DoubleSide,
    });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 rockPosition;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nrockPosition = position;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${mineralNoise}`)
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          float structure = mineralFbm(rockPosition * ${hot ? "19.0" : "32.0"});
          float detail = mineralNoise(rockPosition * 185.0);
          float relief = structure * 0.8 + detail * 0.2;
          ${
            hot
              ? `
            float veins = smoothstep(0.15, 0.85, structure);
            diffuseColor.rgb *= mix(vec3(0.55, 0.21, 0.018), vec3(1.0, 0.8, 0.34), veins);
            diffuseColor.rgb *= 0.85 + detail * 0.25;
          `
              : `
            diffuseColor.rgb *= mix(vec3(0.12, 0.082, 0.041), vec3(0.28, 0.20, 0.10), structure);
            diffuseColor.rgb *= 0.82 + detail * 0.32;
          `
          }
        `,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
          vec3 dx = dFdx(-vViewPosition);
          vec3 dy = dFdy(-vViewPosition);
          vec3 r1 = cross(dy, normal);
          vec3 r2 = cross(normal, dx);
          float det = dot(dx, r1);
          vec3 gradient = sign(det) * (dFdx(relief) * r1 + dFdy(relief) * r2);
          normal = normalize(max(abs(det), 0.0000001) * normal - 0.002 * gradient);
        `,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          ${
            hot
              ? `
            totalEmissiveRadiance *= mix(vec3(0.6, 0.24, 0.02), vec3(1.0, 0.92, 0.44), veins);
            totalEmissiveRadiance *= 0.88 + detail * 0.24;
          `
              : kind === "mantle"
                ? `
            float boundary = 1.0 - smoothstep(0.49, 0.67, length(rockPosition));
            totalEmissiveRadiance += vec3(2.8, 1.1, 0.02) * boundary * boundary * (0.8 + structure);
          `
                : ""
          }
        `,
        );
    };
    material.customProgramCacheKey = () => `mars-interior-${kind}`;
    materials.push(material);
    return material;
  }

  const crustEdge = mineral("crust");
  const mantleRock = mineral("mantle");
  const coreMetal = mineral("core");

  function sphere(
    radius: number,
    start: number,
    length: number,
    material: MeshStandardMaterial,
  ) {
    const geometry = new THREE.SphereGeometry(radius, 96, 64, start, length);
    const uv = geometry.getAttribute("uv");
    for (let index = 0; index < uv.count; index++) {
      uv.setX(index, (start + uv.getX(index) * length) / (Math.PI * 2));
    }
    geometries.push(geometry);
    return new THREE.Mesh(geometry, material);
  }

  function crossSection(
    outer: number,
    inner: number,
    material: MeshStandardMaterial,
  ) {
    const geometry = new THREE.RingGeometry(inner, outer, 128, 8);
    geometry.rotateY(Math.PI / 2);
    geometries.push(geometry);
    return new THREE.Mesh(geometry, material);
  }

  group.add(
    sphere(1, halfStart, Math.PI, surface),
    crossSection(1, 0.95, crustEdge),
  );
  crustSection.add(
    sphere(1, halfStart + Math.PI, Math.PI, surface),
    sphere(0.95, halfStart + Math.PI, Math.PI, crustEdge),
    crossSection(1, 0.95, crustEdge),
  );
  mantle.add(
    sphere(0.949, halfStart, Math.PI, mantleRock),
    crossSection(0.949, 0.5, mantleRock),
  );
  const coreCavity = mineral("core");
  coreCavity.emissiveIntensity = 0.16;
  coreCavity.color.setHex(0x9b6629);
  outerCore.add(
    sphere(0.195, halfStart, Math.PI, coreCavity),
    sphere(0.498, halfStart, Math.PI, coreMetal),
    crossSection(0.498, 0.195, coreMetal),
  );
  const innerMetal = mineral("inner");
  innerMetal.emissive.setHex(0xffe280);
  const core = sphere(0.19, 0, Math.PI * 2, innerMetal);
  group.add(mantle, outerCore, core, crustSection);

  return {
    group,
    setReveal(progress: number) {
      const mantleReveal = THREE.MathUtils.smoothstep(progress, 0.15, 0.65);
      const coreReveal = THREE.MathUtils.smoothstep(progress, 0.3, 0.9);
      crustSection.position.x = -progress * 1.9;
      mantle.position.x = -mantleReveal * 0.12;
      outerCore.position.x = -coreReveal * 0.55;
      core.position.x = -coreReveal * 1.0;
      group.position.x = progress * 1.0;
    },
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}
