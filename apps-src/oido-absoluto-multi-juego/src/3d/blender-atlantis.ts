import * as THREE from "three";
import dataUrl from "./assets/atlantida.json?url";
import type { FishPartData } from "./blender-fish";

// Atlántida hundida, modelada en Blender por Astra (art/blender/atlantida/).
// Base apoyada en y = 0, fachada con el arco hacia −Z. 94 u de diámetro, 41 u de alto.
// Partes: base, palace, tower ×4, colonnade, crystal (gira), glow (late), gold, glass.

interface AtlantisPartData extends FishPartData {
  alpha: number;
  emission: number;
  emissionColor: [number, number, number];
}

/** Cilindro de colisión en coordenadas del modelo (`base` = altura del pie). */
export interface AtlantisCollider {
  x: number;
  z: number;
  radius: number;
  base: number;
  height: number;
}

export interface BlenderAtlantis {
  root: THREE.Group;
  crystal: THREE.Mesh;
  colliders: AtlantisCollider[];
  /** Latido lento de ventanas y vetas luminosas. */
  update(time: number): void;
}

let parts: AtlantisPartData[] | undefined;
let colliders: AtlantisCollider[] = [];
let pending: Promise<void> | undefined;

export function preloadBlenderAtlantis(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Atlántida: HTTP ${response.status}`);
    const data = await response.json() as { meshes: AtlantisPartData[]; colliders?: AtlantisCollider[] };
    parts = data.meshes;
    colliders = data.colliders ?? [];
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

preloadBlenderAtlantis().catch((error: unknown) => console.error("Atlántida de Blender:", error));

export function buildBlenderAtlantis(): BlenderAtlantis {
  if (!parts) throw new Error("Atlántida debe precargarse antes de armarla.");
  const root = new THREE.Group();
  root.name = "Atlántida · Blender";

  let crystal: THREE.Mesh | undefined;
  let glowMaterial: THREE.MeshStandardMaterial | undefined;

  for (const part of parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    const translucent = part.alpha < 0.999; // vidrio de la cúpula y corazón de cristal
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor),
      metalness: part.metalness,
      roughness: part.roughness,
      emissive: part.emission > 0
        ? new THREE.Color().setRGB(part.emissionColor[0], part.emissionColor[1], part.emissionColor[2])
        : 0x000000,
      emissiveIntensity: part.emission,
      transparent: translucent,
      opacity: part.alpha,
      depthWrite: !translucent,
      side: translucent ? THREE.DoubleSide : THREE.FrontSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    mesh.castShadow = !translucent;
    mesh.receiveShadow = true;
    if (translucent) mesh.renderOrder = 3; // después de la piedra, para que se vea lo de dentro
    root.add(mesh);

    if (part.part === "crystal") crystal = mesh;
    if (part.part === "glow") glowMaterial = material;
  }

  if (!crystal) throw new Error("Atlántida: el JSON no trae la parte `crystal`.");

  return {
    root,
    crystal,
    colliders,
    update(time) {
      // Valores de ENTREGA.md: 1.3 ± 0.3 a 0.5 rad/s.
      if (glowMaterial) glowMaterial.emissiveIntensity = 1.3 + Math.sin(time * 0.5) * 0.3;
    },
  };
}
