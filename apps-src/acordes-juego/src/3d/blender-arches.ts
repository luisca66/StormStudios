// Arcos de roca de la zona 2, pegados a la pared del pozo (art/blender/arcos-roca/).
// Modelados por Astra. Dos variantes (A «Puente», B «Ojo»); el origen de cada una es la cara
// de la pared a media luz, a la altura del pie más bajo. −Z mira al centro del pozo.
// Partes por variante: rock y growth (fijas) y glow (colonias bioluminiscentes que respiran).

import * as THREE from "three";
import dataUrl from "./assets/arcos-roca.json?url";

export type ArchVariant = "A" | "B";

interface ArchPartData {
  name: string;
  part: string;
  variant: ArchVariant;
  pivot: [number, number, number];
  position: number[];
  normal: number[];
  index: number[];
  vertexColor?: number[];
  color: [number, number, number];
  metalness: number;
  roughness: number;
  emission: number;
  emissionColor: [number, number, number];
}

interface ArchData {
  meshes: ArchPartData[];
  variants: Record<ArchVariant, { passage: [number, number, number] }>;
}

export interface BlenderArches {
  /** Crea un arco; las copias comparten geometría y materiales de su variante. */
  create(variant: ArchVariant): THREE.Group;
  /** Centro del ojo del arco, en coordenadas del modelo. */
  passage(variant: ArchVariant): THREE.Vector3;
  update(elapsed: number): void;
}

let data: ArchData | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderArches(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Arcos de roca: HTTP ${response.status}`);
    data = await response.json() as ArchData;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

// ENTREGA.md: 1.3 + 0.25·sin(2π·0.055·t + fase), fase A = 0 y B = 1.7 rad.
const GLOW_PHASE: Record<ArchVariant, number> = { A: 0, B: 1.7 };

export function buildBlenderArches(): BlenderArches {
  if (!data) throw new Error("Los arcos de roca deben precargarse antes de armarlos.");
  const parts: Record<ArchVariant, { mesh: THREE.Mesh; pivot: [number, number, number] }[]> = { A: [], B: [] };
  const glowMaterials: { material: THREE.MeshStandardMaterial; variant: ArchVariant }[] = [];

  for (const part of data.meshes) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();
    const glow = part.part === "glow";
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor),
      metalness: part.metalness,
      roughness: part.roughness,
      emissive: part.emission > 0
        ? new THREE.Color().setRGB(part.emissionColor[0], part.emissionColor[1], part.emissionColor[2])
        : 0x000000,
      emissiveIntensity: part.emission,
      // Las colonias son láminas finas: deben verse desde los dos lados (ENTREGA.md).
      side: glow ? THREE.DoubleSide : THREE.FrontSide,
    });
    if (glow) glowMaterials.push({ material, variant: part.variant });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    parts[part.variant].push({ mesh, pivot: part.pivot });
  }

  const passages = {
    A: new THREE.Vector3().fromArray(data.variants.A.passage),
    B: new THREE.Vector3().fromArray(data.variants.B.passage),
  };

  return {
    create(variant) {
      const root = new THREE.Group();
      root.name = `Arco de roca ${variant} · Blender`;
      for (const { mesh, pivot } of parts[variant]) {
        const copy = new THREE.Mesh(mesh.geometry, mesh.material);
        copy.name = mesh.name;
        copy.position.fromArray(pivot);
        root.add(copy);
      }
      return root;
    },
    passage: (variant) => passages[variant].clone(),
    update(elapsed) {
      for (const { material, variant } of glowMaterials) {
        material.emissiveIntensity = 1.3 + 0.25 * Math.sin(elapsed * Math.PI * 2 * 0.055 + GLOW_PHASE[variant]);
      }
    },
  };
}
