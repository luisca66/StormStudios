import * as THREE from "three";
import dataUrl from "./assets/pulpo-dumbo.json?url";
import type { CreatureVisual } from "./base";
import type { PartData } from "./blender-squid";

// Pulpo Dumbo modelado por Astra en Blender (art/blender/pulpo-dumbo/, kit.export_parts).
// Manto arriba, brazos hacia −Y, ojos hacia −Z. Ocho brazos: uno por nota (hasta 13ª).

const TAU = Math.PI * 2;
let parts: PartData[] | undefined;
let pending: Promise<void> | undefined;

/** Se descarga una vez antes de la inmersión; la geometría queda fuera del bundle JS. */
export function preloadBlenderDumbo(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Pulpo Dumbo: HTTP ${response.status}`);
    parts = (await response.json() as { meshes: PartData[] }).meshes;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

export function buildBlenderDumbo(color: number): CreatureVisual {
  if (!parts) throw new Error("Pulpo Dumbo must be preloaded before starting the dive.");
  const group = new THREE.Group();
  group.name = "Pulpo Dumbo · Blender";

  let body!: THREE.Mesh;
  let web!: THREE.Mesh;
  const ears: { mesh: THREE.Mesh; side: number }[] = [];
  const arms: { mesh: THREE.Mesh; radialX: number; radialZ: number; phase: number }[] = [];
  const armMats: THREE.MeshStandardMaterial[] = [];

  for (const part of parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    const isArm = part.part === "arm";
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor),
      metalness: part.metalness,
      roughness: part.roughness,
      // Los brazos destellan con el color de la familia del acorde.
      emissive: isArm ? color : 0x000000,
      emissiveIntensity: isArm ? part.emission : 0,
      side: part.part === "ear" || part.part === "web" ? THREE.DoubleSide : THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    group.add(mesh);

    if (part.part === "body") body = mesh;
    if (part.part === "web") web = mesh;
    if (part.part === "ear") ears.push({ mesh, side: Math.sign(part.pivot[0]) || 1 });
    if (isArm) {
      // Giro radial (se abre hacia fuera de la corona), con fase según su ángulo.
      const [px, , pz] = part.pivot;
      const r = Math.hypot(px, pz) || 1;
      arms.push({ mesh, radialX: -pz / r, radialZ: px / r, phase: Math.atan2(px, -pz) });
      armMats[part.segment ?? armMats.length] = material;
    }
  }

  return {
    group,
    glowMaterials: armMats,
    glowSprites: [],
    bodyRadius: 1.5,
    // Amplitudes y frecuencias de ENTREGA.md (ciclos/s → rad/s con TAU).
    animate(_dt, elapsed) {
      group.rotation.y = Math.sin(elapsed * TAU * 0.08) * 0.1;
      body.scale.setScalar(1 + Math.sin(elapsed * TAU * 0.25) * 0.02);
      for (const { mesh, side } of ears) mesh.rotation.z = side * Math.sin(elapsed * TAU * 0.38) * 0.32;
      for (const { mesh, radialX, radialZ, phase } of arms) {
        const theta = Math.sin(elapsed * TAU * 0.3 + phase) * 0.1;
        mesh.rotation.x = radialX * theta;
        mesh.rotation.z = radialZ * theta;
      }
      const pulse = 1 + Math.sin(elapsed * TAU * 0.3) * 0.01;
      web.scale.set(pulse, 1, pulse);
    },
    flashSegment(index, intensity) {
      const material = armMats[index % armMats.length];
      if (material) material.emissiveIntensity += intensity * 3;
    },
  };
}
