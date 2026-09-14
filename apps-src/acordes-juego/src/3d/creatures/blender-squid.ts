import * as THREE from "three";
import dataUrl from "./assets/calamar-vela.json?url";
import type { CreatureVisual } from "./base";

// Calamar Vela modelado por Astra en Blender (art/blender/calamar-vela/, kit.export_parts).
// Punta del manto hacia −Z, brazos hacia +Z; cada parte llega con su pivote.

interface PartData {
  name: string;
  part: "mantle" | "fin" | "head" | "arm" | "tentacle" | "glow";
  segment?: number;
  pivot: number[];
  position: number[];
  normal: number[];
  index: number[];
  vertexColor?: number[];
  color: number[];
  metalness: number;
  roughness: number;
  emission: number;
}

let parts: PartData[] | undefined;
let pending: Promise<void> | undefined;

/** Se descarga una vez antes de la inmersión; la geometría queda fuera del bundle JS. */
export function preloadBlenderSquid(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Calamar Vela: HTTP ${response.status}`);
    parts = (await response.json() as { meshes: PartData[] }).meshes;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

export function buildBlenderSquid(color: number): CreatureVisual {
  if (!parts) throw new Error("Calamar Vela must be preloaded before starting the dive.");
  const group = new THREE.Group();
  group.name = "Calamar Vela · Blender";
  // Manto y fotóforos comparten pivote y pulso de propulsión.
  const mantle = new THREE.Group();
  group.add(mantle);

  const fins: { mesh: THREE.Mesh; pivot: THREE.Vector3; side: number }[] = [];
  const limbs: { mesh: THREE.Mesh; phase: number; slow: boolean }[] = [];
  const armMats: THREE.MeshStandardMaterial[] = [];
  const glowMaterials: THREE.MeshStandardMaterial[] = [];

  for (const part of parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    const glows = part.part === "glow" || part.part === "arm";
    const material = new THREE.MeshStandardMaterial({
      // Los fotóforos toman el color de la familia; la piel conserva su pigmento.
      color: part.part === "glow" ? color : new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor) && part.part !== "glow",
      metalness: part.metalness,
      roughness: part.roughness,
      emissive: glows ? color : 0x000000,
      emissiveIntensity: glows ? part.emission : 0,
      side: part.part === "fin" ? THREE.DoubleSide : THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);

    if (glows) glowMaterials.push(material);
    if (part.part === "arm") armMats[part.segment ?? armMats.length] = material;

    if (part.part === "mantle" || part.part === "glow") {
      mantle.add(mesh);
    } else if (part.part === "fin") {
      fins.push({ mesh, pivot: mesh.position.clone(), side: Math.sign(part.pivot[0]) || 1 });
      group.add(mesh);
    } else {
      group.add(mesh);
      if (part.part === "arm") limbs.push({ mesh, phase: (part.segment ?? 0) * 1.1, slow: false });
      if (part.part === "tentacle") limbs.push({ mesh, phase: part.pivot[0] > 0 ? 0.6 : 0, slow: true });
    }
  }

  return {
    group,
    glowMaterials,
    glowSprites: [],
    bodyRadius: 2.0,
    animate(_dt, elapsed) {
      // Propulsión: el manto se estrecha y alarga ±9 %; las velas lo acompañan.
      const squeeze = 1 + Math.sin(elapsed * 3.2) * 0.09;
      const width = 1 / Math.sqrt(squeeze);
      mantle.scale.set(width, width, squeeze);
      for (const { mesh, pivot, side } of fins) {
        mesh.position.set(pivot.x * width, pivot.y * width, pivot.z * squeeze);
        mesh.rotation.z = side * Math.sin(elapsed * 2.0) * 0.12;
        mesh.rotation.x = Math.sin(elapsed * 2.0 + 0.8) * 0.05;
      }
      for (const { mesh, phase, slow } of limbs) {
        const t = slow ? elapsed * 1.3 - 0.6 : elapsed * 2.6;
        mesh.rotation.x = Math.sin(t + phase) * (slow ? 0.09 : 0.07);
        mesh.rotation.y = Math.cos(t * 0.8 + phase) * (slow ? 0.07 : 0.05);
      }
      group.rotation.y = Math.sin(elapsed * 0.4) * 0.5;
    },
    flashSegment(index, intensity) {
      const material = armMats[index % armMats.length];
      if (material) material.emissiveIntensity += intensity * 3;
    },
  };
}
