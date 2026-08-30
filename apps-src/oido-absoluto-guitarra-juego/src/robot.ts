import * as THREE from "three";

type RobotParts = {
  body: THREE.Group;
  head: THREE.Group;
  arms: THREE.Group[];
  legs: THREE.Group[];
  halo: THREE.Group;
  haloRings: THREE.Mesh[];
  coreMaterial: THREE.MeshStandardMaterial;
};

export type RobotRig = {
  root: THREE.Group;
  parts: RobotParts;
  walkPhase: number;
  reaction: number;
};

const makeMesh = (
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  parent: THREE.Object3D,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};

function cylinderBetween(
  parent: THREE.Object3D,
  a: [number, number, number],
  b: [number, number, number],
  radius: number,
  material: THREE.Material,
) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const cylinder = makeMesh(
    new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 12),
    material,
    parent,
    [midpoint.x, midpoint.y, midpoint.z],
  );
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
  return cylinder;
}

export function createRobot(): RobotRig {
  const root = new THREE.Group();
  root.name = "Autómata luthier";
  const model = new THREE.Group();
  model.rotation.y = Math.PI;
  model.scale.setScalar(1.08);
  root.add(model);

  const copper = new THREE.MeshStandardMaterial({ color: 0x9d5e35, metalness: 0.78, roughness: 0.34 });
  const copperDark = new THREE.MeshStandardMaterial({ color: 0x5d321f, metalness: 0.85, roughness: 0.38 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xba8050, metalness: 0.82, roughness: 0.28 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1e2728, metalness: 0.72, roughness: 0.28 });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xbff8ff,
    emissive: 0x59dff8,
    emissiveIntensity: 5,
    metalness: 0.05,
    roughness: 0.15,
  });
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x92f4ff,
    emissive: 0x39cfe8,
    emissiveIntensity: 6,
    metalness: 0.15,
    roughness: 0.12,
  });

  const body = new THREE.Group();
  body.position.y = 1.55;
  model.add(body);

  makeMesh(new THREE.CylinderGeometry(0.48, 0.54, 0.74, 20), copper, body, [0, 0.05, 0]);
  makeMesh(new THREE.SphereGeometry(0.5, 20, 14), copper, body, [0, 0.39, 0], [0, 0, 0], [1, 0.5, 1]);
  makeMesh(new THREE.SphereGeometry(0.54, 20, 14), copperDark, body, [0, -0.34, 0], [0, 0, 0], [1, 0.38, 1]);

  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    makeMesh(new THREE.SphereGeometry(0.035, 8, 6), brass, body, [Math.sin(angle) * 0.49, 0.05, Math.cos(angle) * 0.49]);
  }

  makeMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.055, 24), dark, body, [0, 0.08, -0.505], [Math.PI / 2, 0, 0]);
  makeMesh(new THREE.CylinderGeometry(0.105, 0.105, 0.07, 24), coreMaterial, body, [0, 0.08, -0.54], [Math.PI / 2, 0, 0]);
  const coreLight = new THREE.PointLight(0x58e8ff, 4.5, 3, 2);
  coreLight.position.set(0, 0.08, -0.72);
  body.add(coreLight);

  makeMesh(new THREE.CylinderGeometry(0.18, 0.18, 0.15, 16), dark, body, [0, 0.62, 0]);
  const head = new THREE.Group();
  head.position.set(0, 0.93, 0);
  body.add(head);
  makeMesh(new THREE.SphereGeometry(0.47, 22, 18), copper, head);
  makeMesh(new THREE.SphereGeometry(0.43, 18, 14), copperDark, head, [0, -0.14, 0], [0, 0, 0], [1, 0.48, 1]);
  makeMesh(new THREE.SphereGeometry(0.48, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), brass, head, [0, 0.02, 0]);
  makeMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), dark, head, [-0.5, -0.03, 0], [0, 0, Math.PI / 2]);
  makeMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), dark, head, [0.5, -0.03, 0], [0, 0, Math.PI / 2]);
  makeMesh(new THREE.SphereGeometry(0.085, 16, 12), eyeMaterial, head, [-0.17, -0.03, 0.423], [0, 0, 0], [1, 0.82, 0.42]);
  makeMesh(new THREE.SphereGeometry(0.085, 16, 12), eyeMaterial, head, [0.17, -0.03, 0.423], [0, 0, 0], [1, 0.82, 0.42]);
  makeMesh(new THREE.BoxGeometry(0.22, 0.035, 0.035), dark, head, [0, -0.24, 0.435]);
  const eyeLight = new THREE.PointLight(0x6defff, 3.5, 2.2, 2);
  eyeLight.position.set(0, -0.02, 0.65);
  head.add(eyeLight);
  cylinderBetween(head, [0, 0.43, 0], [0, 0.68, 0], 0.025, brass);
  makeMesh(new THREE.SphereGeometry(0.07, 12, 10), brass, head, [0, 0.72, 0]);

  const halo = new THREE.Group();
  halo.position.set(0, 0.77, 0);
  head.add(halo);
  const haloRings = [
    makeMesh(new THREE.TorusGeometry(0.56, 0.012, 8, 64), coreMaterial, halo, [0, 0, 0], [Math.PI / 2.2, 0, 0.2]),
    makeMesh(new THREE.TorusGeometry(0.69, 0.01, 8, 64), brass, halo, [0, 0.06, 0], [Math.PI / 2.7, 0.55, -0.35]),
    makeMesh(new THREE.TorusGeometry(0.43, 0.009, 8, 64), eyeMaterial, halo, [0, -0.04, 0], [Math.PI / 2, -0.45, 0.3]),
  ];

  const arms: THREE.Group[] = [];
  ([-1, 1] as const).forEach((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.58, 0.37, 0);
    body.add(arm);
    arms.push(arm);
    makeMesh(new THREE.SphereGeometry(0.16, 14, 10), brass, arm);
    cylinderBetween(arm, [side * 0.02, -0.08, 0], [side * 0.1, -0.39, 0], 0.09, copperDark);
    makeMesh(new THREE.SphereGeometry(0.115, 12, 9), dark, arm, [side * 0.11, -0.47, 0]);
    cylinderBetween(arm, [side * 0.11, -0.52, 0], [side * 0.1, -0.79, 0.03], 0.08, copper);
    makeMesh(new THREE.SphereGeometry(0.1, 12, 9), brass, arm, [side * 0.1, -0.88, 0.04], [0, 0, 0], [0.85, 1.05, 0.75]);
  });

  makeMesh(new THREE.CylinderGeometry(0.34, 0.38, 0.18, 16), dark, body, [0, -0.78, 0]);
  const legs: THREE.Group[] = [];
  ([-1, 1] as const).forEach((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.23, -0.86, 0);
    body.add(leg);
    legs.push(leg);
    makeMesh(new THREE.SphereGeometry(0.13, 12, 10), brass, leg);
    cylinderBetween(leg, [0, -0.08, 0], [side * 0.01, -0.44, 0], 0.095, copperDark);
    makeMesh(new THREE.SphereGeometry(0.12, 12, 9), dark, leg, [side * 0.01, -0.52, 0]);
    cylinderBetween(leg, [side * 0.01, -0.59, 0], [side * 0.005, -0.86, 0], 0.09, copper);
    makeMesh(new THREE.BoxGeometry(0.3, 0.15, 0.43), brass, leg, [0, -0.99, 0.06]);
    makeMesh(new THREE.BoxGeometry(0.27, 0.05, 0.32), dark, leg, [0, -1.08, 0.1]);
  });

  return {
    root,
    parts: { body, head, arms, legs, halo, haloRings, coreMaterial },
    walkPhase: 0,
    reaction: 0,
  };
}

export function animateRobot(rig: RobotRig, time: number, speed: number, delta: number) {
  const moving = Math.abs(speed) > 0.35;
  rig.walkPhase += delta * (moving ? 7.5 + Math.abs(speed) * 0.25 : 2);
  rig.reaction = THREE.MathUtils.damp(rig.reaction, 0, 3.2, delta);
  const amplitude = moving ? 0.58 : 0.05;
  const { arms, legs, body, head, halo, haloRings, coreMaterial } = rig.parts;

  arms[0].rotation.x = Math.sin(rig.walkPhase) * amplitude;
  arms[1].rotation.x = -Math.sin(rig.walkPhase) * amplitude;
  legs[0].rotation.x = -Math.sin(rig.walkPhase) * amplitude * 0.58;
  legs[1].rotation.x = Math.sin(rig.walkPhase) * amplitude * 0.58;
  body.position.y = 1.55 + Math.sin(moving ? rig.walkPhase * 2 : time * 2.2) * (moving ? 0.035 : 0.018);
  head.rotation.y = moving ? 0 : Math.sin(time * 0.85) * 0.1;
  head.rotation.z = (moving ? 0 : Math.sin(time * 1.1) * 0.025) - Math.max(0, -rig.reaction) * 0.13;
  halo.rotation.y = time * 1.35;
  haloRings[0].rotation.z = time * 0.8;
  haloRings[1].rotation.z = -time * 0.55;
  haloRings[2].rotation.z = time * 1.1;
  halo.scale.setScalar(1 + Math.max(0, rig.reaction) * 0.18);
  coreMaterial.emissiveIntensity = 5.3 + Math.sin(time * 4.2) + Math.abs(rig.reaction) * 5;
}

export function reactRobot(rig: RobotRig, correct: boolean) {
  rig.reaction = correct ? 1 : -1;
}
