// Autómata luthier modelado en Blender (art/blender/robot/modelar-robot.py): mochila con forma de
// caja de guitarra, clavijas de afinación como orejas y articulaciones de hombro, codo, cadera y
// rodilla. Cada parte llega con su pivote; aquí se arma la jerarquía y se anima el paso.
import * as THREE from "three";
import robotUrl from "./assets/robot.json?url";

type PartData = {
  name: string;
  part: string;
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
  emissionColor: number[];
};

type RobotData = {
  parents: Record<string, string | null>;
  meshes: PartData[];
};

type RobotParts = {
  hips: THREE.Group;
  head: THREE.Group;
  pack: THREE.Group;
  upperArms: THREE.Group[];
  forearms: THREE.Group[];
  thighs: THREE.Group[];
  shins: THREE.Group[];
  haloRings: THREE.Group[];
  coreMaterial: THREE.MeshStandardMaterial;
  eyeMaterial: THREE.MeshStandardMaterial;
};

export type RobotRig = {
  root: THREE.Group;
  parts: RobotParts | null;
  walkPhase: number;
  reaction: number;
};

const HIP_Y = 0.83;
let dataPromise: Promise<RobotData> | null = null;

function loadRobot(): Promise<RobotData> {
  return (dataPromise ??= fetch(robotUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Robot: HTTP ${response.status}`);
    return (await response.json()) as RobotData;
  }).catch((error: unknown) => {
    dataPromise = null;
    throw error;
  }));
}

export function createRobot(): RobotRig {
  const root = new THREE.Group();
  root.name = "Autómata luthier";
  const rig: RobotRig = { root, parts: null, walkPhase: 0, reaction: 0 };
  // Descarga en segundo plano: el robot solo se muestra al entrar al diapasón.
  loadRobot().then((data) => buildRig(rig, data)).catch((error: unknown) => console.warn(error));
  return rig;
}

function buildRig(rig: RobotRig, data: RobotData) {
  const nodes = new Map<string, { group: THREE.Group; pivot: THREE.Vector3; part: PartData }>();
  const key = (part: string, segment?: number) => (segment === undefined ? part : `${part}:${segment}`);
  let coreMaterial: THREE.MeshStandardMaterial | null = null;
  let eyeMaterial: THREE.MeshStandardMaterial | null = null;

  for (const part of data.meshes) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();
    const glowing = part.emission > 0;
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor),
      metalness: part.metalness,
      roughness: part.roughness,
      emissive: glowing
        ? new THREE.Color().setRGB(part.emissionColor[0], part.emissionColor[1], part.emissionColor[2])
        : new THREE.Color(0),
      emissiveIntensity: part.emission,
    });
    if (part.part === "core") coreMaterial = material;
    if (part.part === "eyes") eyeMaterial = material;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.castShadow = !glowing;
    mesh.receiveShadow = !glowing;
    const group = new THREE.Group();
    group.name = part.name;
    group.add(mesh);
    nodes.set(key(part.part, part.segment), { group, pivot: new THREE.Vector3().fromArray(part.pivot), part });
  }

  // Jerarquía: cada pivote cuelga de su padre; brazo→antebrazo y muslo→espinilla comparten lado.
  for (const { group, pivot, part } of nodes.values()) {
    const parentName = data.parents[part.part];
    const parent = parentName
      ? nodes.get(key(parentName, part.segment)) ?? nodes.get(parentName)
      : undefined;
    if (parent) {
      group.position.copy(pivot).sub(parent.pivot);
      parent.group.add(group);
    } else {
      group.position.copy(pivot);
      rig.root.add(group);
    }
  }

  const get = (part: string, segment?: number) => {
    const node = nodes.get(key(part, segment));
    if (!node) throw new Error(`Robot: falta la parte ${key(part, segment)}`);
    return node.group;
  };
  const hips = get("torso");
  const head = get("head");
  if (!coreMaterial || !eyeMaterial) throw new Error("Robot: faltan los materiales luminosos");

  // Luz propia de la boca de la guitarra (hacia la cámara) y de los ojos (hacia delante).
  // Separada de la tapa para bañar el suelo sin quemar la madera.
  const coreLight = new THREE.PointLight(0x58e8ff, 2.2, 4, 2);
  coreLight.position.set(0, 0.2, 1.7);
  hips.add(coreLight);
  const eyeLight = new THREE.PointLight(0x6defff, 3.5, 2.2, 2);
  eyeLight.position.set(0, 0.36, -0.75);
  head.add(eyeLight);

  rig.parts = {
    hips,
    head,
    pack: get("pack"),
    upperArms: [get("upperArm", 0), get("upperArm", 1)],
    forearms: [get("forearm", 0), get("forearm", 1)],
    thighs: [get("thigh", 0), get("thigh", 1)],
    shins: [get("shin", 0), get("shin", 1)],
    haloRings: [get("halo", 0), get("halo", 1), get("halo", 2)],
    coreMaterial,
    eyeMaterial,
  };
}

/** Anima el paso. Devuelve true en el instante en que una bota toca el suelo (para el sonido). */
export function animateRobot(rig: RobotRig, time: number, speed: number, delta: number): boolean {
  const parts = rig.parts;
  if (!parts) return false;
  const moving = Math.abs(speed) > 0.35;
  const previousPhase = rig.walkPhase;
  rig.walkPhase += delta * (moving ? 7.5 + Math.abs(speed) * 0.25 : 2);
  rig.reaction = THREE.MathUtils.damp(rig.reaction, 0, 3.2, delta);
  const phase = rig.walkPhase;
  const amplitude = moving ? 0.52 : 0.04;
  const { hips, head, pack, upperArms, forearms, thighs, shins, haloRings, coreMaterial, eyeMaterial } = parts;

  for (let side = 0; side < 2; side += 1) {
    const swing = Math.sin(phase + side * Math.PI);
    // Pierna: el muslo oscila y la rodilla se dobla mientras el pie va hacia delante.
    thighs[side].rotation.x = swing * amplitude * 0.62;
    shins[side].rotation.x = -Math.max(0, Math.cos(phase + side * Math.PI)) * amplitude * 1.05;
    // Brazo contrario a la pierna, con el codo algo doblado.
    upperArms[side].rotation.x = -swing * amplitude * 0.8;
    upperArms[side].rotation.z = (side === 0 ? 1 : -1) * 0.06;
    forearms[side].rotation.x = 0.22 + Math.max(0, -swing) * amplitude * 0.6;
  }

  hips.position.y = HIP_Y + (moving ? Math.abs(Math.cos(phase)) * 0.05 - 0.025 : Math.sin(time * 2.2) * 0.018);
  hips.rotation.y = moving ? Math.sin(phase) * 0.06 : 0;
  pack.rotation.x = moving ? Math.sin(phase * 2) * 0.025 : 0;
  head.rotation.y = moving ? -Math.sin(phase) * 0.05 : Math.sin(time * 0.85) * 0.1;
  head.rotation.z = (moving ? 0 : Math.sin(time * 1.1) * 0.025) - Math.max(0, -rig.reaction) * 0.13;
  haloRings[0].rotation.y = time * 1.35;
  haloRings[1].rotation.y = -time * 0.9;
  haloRings[2].rotation.y = time * 1.7;
  const haloScale = 1 + Math.max(0, rig.reaction) * 0.18;
  haloRings.forEach((ring) => ring.scale.setScalar(haloScale));
  coreMaterial.emissiveIntensity = 5.3 + Math.sin(time * 4.2) + Math.abs(rig.reaction) * 5;
  eyeMaterial.emissiveIntensity = 5 + Math.max(0, rig.reaction) * 3;

  // Pisada: cada medio ciclo, cuando el pie que baja termina su arco.
  return moving && Math.floor(previousPhase / Math.PI) !== Math.floor(phase / Math.PI);
}

export function reactRobot(rig: RobotRig, correct: boolean) {
  rig.reaction = correct ? 1 : -1;
}
