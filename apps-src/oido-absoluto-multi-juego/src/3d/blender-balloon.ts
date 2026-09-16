import * as THREE from "three";
import dataUrl from "./assets/globo.json?url";
import type { FishPartData } from "./blender-fish";

// Globo aerostático: el objetivo de nota de Las Nubes, modelado en Blender por Claude
// (art/blender/globo/). Origen en el centro del conjunto, 4.1 u de alto.
// Partes: envelope_color (se tiñe con la nota), envelope_trim, basket, flame (titila).

interface BalloonPartData extends FishPartData {
  emission: number;
  emissionColor: [number, number, number];
}

export interface BlenderBalloon {
  root: THREE.Group;
  update(elapsed: number): void;
}

let parts: BalloonPartData[] | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderBalloon(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Globo: HTTP ${response.status}`);
    parts = (await response.json() as { meshes: BalloonPartData[] }).meshes;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

preloadBlenderBalloon().catch((error: unknown) => console.error("Globo de Blender:", error));

export function isBalloonReady(): boolean {
  return parts !== undefined;
}

/** `color`: el color de la nota; tiñe los gajos de color y la luz del globo. */
export function buildBlenderBalloon(color: number): BlenderBalloon {
  if (!parts) throw new Error("El globo debe precargarse antes de armarlo.");
  const root = new THREE.Group();
  root.name = "Globo · Blender";
  let flame: THREE.Mesh | undefined;
  let flameMaterial: THREE.MeshStandardMaterial | undefined;

  for (const part of parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    const tinted = part.part === "envelope_color";
    const isFlame = part.part === "flame";
    const material = new THREE.MeshStandardMaterial({
      // Los gajos vienen casi blancos: el color de la nota se multiplica aquí.
      color: tinted ? new THREE.Color(color) : new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor),
      metalness: part.metalness,
      roughness: part.roughness,
      // Un poco de brillo propio en los gajos: la nota se reconoce de lejos entre nubes blancas.
      emissive: tinted ? new THREE.Color(color) : isFlame ? new THREE.Color(1.0, 0.7, 0.28) : 0x000000,
      emissiveIntensity: tinted ? 0.22 : isFlame ? 2.0 : 0,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    root.add(mesh);
    if (isFlame) {
      flame = mesh;
      flameMaterial = material;
    }
  }

  // Resplandor del quemador sobre la tela, del color de la nota.
  const glow = new THREE.PointLight(color, 6, 14);
  glow.position.set(0, -0.6, 0);
  root.add(glow);

  return {
    root,
    update(elapsed) {
      // Llama viva: dos senos desafinados, nunca un parpadeo regular.
      const flicker = 1 + Math.sin(elapsed * 17.3) * 0.12 + Math.sin(elapsed * 29.1 + 1.3) * 0.08;
      if (flame) flame.scale.set(1, flicker * (1 + Math.sin(elapsed * 3.1) * 0.15), 1);
      if (flameMaterial) flameMaterial.emissiveIntensity = 1.8 * flicker;
      glow.intensity = 5.5 * flicker;
      // Vaivén de la canasta: el globo cabecea un poco con la brisa.
      root.rotation.z = Math.sin(elapsed * 0.9) * 0.04;
      root.rotation.x = Math.sin(elapsed * 0.7 + 1.1) * 0.03;
    },
  };
}
