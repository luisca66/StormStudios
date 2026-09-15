import * as THREE from "three";
import dataUrl from "./assets/leviatan.json?url";
import type { CreatureVisual } from "./base";
import type { PartData } from "./blender-squid";

// Leviatán modelado por Astra en Blender (art/blender/leviatan/, kit.export_parts).
// Llegan head, body 1–8, tail y plate 0–8; aquí se encadenan en P0…P8 (4.6 u) sobre una
// curva que ondula de lado a lado. Cada placa viaja con su pieza anfitriona y destella por nota.

const TAU = Math.PI * 2;
const BODIES = 8;
const SPACING = 4.6; // pivote → pivote, fijado en el brief
// Onda de ENTREGA.md: longitud 36.8 u, periodo 10 s, amplitud lateral ≈ 1.4 u.
const WAVE_K = TAU / 36.8;
const WAVE_W = TAU / 10;
const MAX_YAW = 1.4 * WAVE_K; // pendiente máxima de la onda (≈ 0.24 rad)
const MAX_PITCH = 0.2 * WAVE_K;
// Las uniones se comprobaron hasta ±0.2 rad de giro y ±0.08 de cabeceo entre vecinas.
const JOINT_YAW = 0.19;
const JOINT_PITCH = 0.07;
// La cadena mide de −7.6 (hocico) a 41.8 (aleta); se centra para que la esfera de click cubra el cuerpo.
const CENTER_Z = 17;
const FORWARD = new THREE.Vector3(0, 0, 1);

let parts: PartData[] | undefined;
let pending: Promise<void> | undefined;

/** Se descarga una vez antes de la inmersión; la geometría queda fuera del bundle JS. */
export function preloadBlenderLeviathan(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Leviatán: HTTP ${response.status}`);
    parts = (await response.json() as { meshes: PartData[] }).meshes;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

function geometryOf(part: PartData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
  if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
  geometry.setIndex(part.index);
  geometry.computeBoundingSphere();
  return geometry;
}

export function buildBlenderLeviathan(color: number): CreatureVisual {
  if (!parts) throw new Error("Leviatán must be preloaded before starting the dive.");
  const group = new THREE.Group();
  group.name = "Leviatán · Blender";

  // Cabeza, cuerpos y cola comparten una sola piel.
  const skinData = parts.find((p) => p.part === "head")!;
  const skin = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(skinData.color[0], skinData.color[1], skinData.color[2]),
    vertexColors: Boolean(skinData.vertexColor),
    metalness: skinData.metalness,
    roughness: skinData.roughness,
  });

  let head!: THREE.Mesh;
  let tail!: THREE.Mesh;
  const bodies: THREE.Mesh[] = [];
  const plateMats: THREE.MeshStandardMaterial[] = [];
  const plates: { mesh: THREE.Mesh; host: number }[] = [];

  for (const part of parts) {
    if (part.part === "plate") {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
        vertexColors: Boolean(part.vertexColor),
        metalness: part.metalness,
        roughness: part.roughness,
        emissive: color,
        emissiveIntensity: part.emission,
      });
      // El pigmento nacarado modula la emisión: nervaduras y raíz oscura siguen legibles.
      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\n#ifdef USE_COLOR\n\ttotalEmissiveRadiance *= vColor.rgb;\n#endif",
        );
      };
      const mesh = new THREE.Mesh(geometryOf(part), material);
      mesh.name = part.name;
      plateMats[part.segment!] = material;
      plates.push({ mesh, host: part.segment! });
      continue;
    }
    const mesh = new THREE.Mesh(geometryOf(part), skin);
    mesh.name = part.name;
    group.add(mesh);
    if (part.part === "head") head = mesh;
    else if (part.part === "tail") tail = mesh;
    else bodies[part.segment! - 1] = mesh;
  }
  if (!head || !tail || bodies.length !== BODIES || plateMats.length !== BODIES + 1) {
    throw new Error("Leviatán: faltan piezas en el JSON");
  }
  // plate 0 va con la cabeza; plate i con body i. Heredan su matriz: mismo pivote.
  for (const { mesh, host } of plates) (host === 0 ? head : bodies[host - 1]).add(mesh);

  const yaw = new Float32Array(BODIES);
  const pitch = new Float32Array(BODIES);
  const point = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const sway = new THREE.Euler();
  const swayQuat = new THREE.Quaternion();

  const orient = (mesh: THREE.Object3D, y: number, p: number) => {
    dir.set(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p));
    mesh.quaternion.setFromUnitVectors(FORWARD, dir);
  };

  return {
    group,
    glowMaterials: plateMats,
    glowSprites: [],
    bodyRadius: 11,
    animate(dt, elapsed) {
      const w = elapsed * WAVE_W;
      // Rumbo de cada tramo: la onda crece hacia la cola (natación anguiliforme).
      for (let i = 0; i < BODIES; i++) {
        const z = (i + 0.5) * SPACING;
        const grow = 0.6 + 0.4 * (i / (BODIES - 1));
        yaw[i] = MAX_YAW * grow * Math.cos(WAVE_K * z - w);
        pitch[i] = MAX_PITCH * Math.cos(WAVE_K * 0.7 * z - w * 0.7 + 1.3);
        if (i > 0) {
          yaw[i] = THREE.MathUtils.clamp(yaw[i], yaw[i - 1] - JOINT_YAW, yaw[i - 1] + JOINT_YAW);
          pitch[i] = THREE.MathUtils.clamp(pitch[i], pitch[i - 1] - JOINT_PITCH, pitch[i - 1] + JOINT_PITCH);
        }
      }

      // P0 en −CENTER_Z; cada pieza en su punto con +Z hacia el siguiente.
      point.set(0, 0, -CENTER_Z);
      head.position.copy(point);
      orient(head, yaw[0], pitch[0]);
      // Balanceo propio de la cabeza (ENTREGA.md: Y ±0.08, X ±0.03 rad).
      sway.set(Math.sin(elapsed * TAU * 0.08) * 0.03, Math.sin(elapsed * TAU * 0.1) * 0.08, 0);
      head.quaternion.multiply(swayQuat.setFromEuler(sway));

      for (let i = 0; i < BODIES; i++) {
        const body = bodies[i];
        body.position.copy(point);
        orient(body, yaw[i], pitch[i]);
        point.addScaledVector(dir, SPACING);
      }

      tail.position.copy(point);
      orient(tail, yaw[BODIES - 1], pitch[BODIES - 1]);
      sway.set(Math.sin(elapsed * TAU * 0.12) * 0.04, Math.sin(elapsed * TAU * 0.18) * 0.12, 0);
      tail.quaternion.multiply(swayQuat.setFromEuler(sway));

      group.rotation.y += dt * 0.06; // cruza lentamente el campo visual
    },
    // Cada nota enciende una placa; el bramido de aparición (pulse(9)) las recorre en ola.
    flashSegment(index, intensity) {
      plateMats[index % plateMats.length].emissiveIntensity += intensity * 3;
    },
  };
}
