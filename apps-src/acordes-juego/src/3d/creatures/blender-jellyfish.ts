import * as THREE from "three";
import dataUrl from "./assets/medusa-luna.json?url";
import type { CreatureVisual } from "./base";

type ModelData = typeof import("./assets/medusa-luna.json");
let data: ModelData | undefined;
let pending: Promise<void> | undefined;

/** Load once before the game starts; the mesh data stays outside the JS bundle. */
export function preloadBlenderJellyfish(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Medusa Luna: HTTP ${response.status}`);
    data = await response.json() as ModelData;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

/** Geometry and normals evaluated by Blender; this module only assembles and animates. */
export function buildBlenderJellyfish(_color: number): CreatureVisual {
  if (!data) throw new Error("Medusa Luna must be preloaded before starting the dive.");
  const group = new THREE.Group();
  group.name = "Medusa Luna · Blender 4.5";
  const bell = new THREE.Group();
  group.add(bell);
  const moving: { mesh: THREE.Mesh; pivot: THREE.Vector3; phase: number }[] = [];
  const glowMaterials: THREE.MeshStandardMaterial[] = [];
  const segments: THREE.MeshStandardMaterial[] = [];

  for (const [i, part] of data.meshes.entries()) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      // Keep the reference pigmentation for every chord family; only intensity pulses.
      emissive: new THREE.Color().setRGB(...part.emissionColor as [number, number, number]),
      emissiveIntensity: part.emission,
      roughness: 0.28,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: part.alpha < 1,
      opacity: part.alpha,
      depthWrite: part.alpha >= 1,
    });
    // One pass is sufficient for the translucent bell, avoiding duplicate blending.
    material.forceSinglePass = true;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    if (part.emission > 0) glowMaterials.push(material);
    if (part.part === "bell") {
      bell.add(mesh);
    } else {
      group.add(mesh);
      moving.push({ mesh, pivot: mesh.position.clone(), phase: i * 0.79 });
      if (part.part === "tentacle") segments.push(material);
    }
  }

  return {
    group,
    glowMaterials,
    glowSprites: [],
    bodyRadius: 1.6,
    animate(_dt, elapsed) {
      const pulse = 1 + Math.sin(elapsed * 1.7) * 0.065;
      const width = 1 / Math.sqrt(pulse);
      bell.scale.set(width, pulse, width);
      for (const { mesh, pivot, phase } of moving) {
        // Attachment points follow the bell: tentacles never detach during the pulse.
        mesh.position.set(pivot.x * width, pivot.y * pulse, pivot.z * width);
        mesh.rotation.x = Math.sin(elapsed * 1.45 + phase) * 0.075;
        mesh.rotation.z = Math.cos(elapsed * 1.25 + phase) * 0.065;
      }
    },
    flashSegment(index, intensity) {
      segments[index % segments.length].emissiveIntensity += intensity * 3;
    },
  };
}
