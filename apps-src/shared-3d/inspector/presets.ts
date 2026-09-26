// Luz de cada nivel, copiada del código del juego, para aprobar modelos como se ven en el juego y
// no con el render de Cycles. Si un juego cambia su luz, hay que actualizarla aquí (la fuente se cita
// en cada preset).

import * as THREE from "three";

export interface LightingPreset {
  id: string;
  label: string;
  /** Archivo y función del juego de donde salen los valores. */
  source: string;
  background: THREE.ColorRepresentation;
  fog?: { color: THREE.ColorRepresentation; density: number };
  toneMapping: THREE.ToneMapping;
  /** Reflejos de estudio (RoomEnvironment). Los juegos no usan environment map: apagado en los niveles. */
  studio: boolean;
  hemisphere?: { sky: THREE.ColorRepresentation; ground: THREE.ColorRepresentation; intensity: number };
  directional: { color: THREE.ColorRepresentation; intensity: number; position: [number, number, number] }[];
  /** Suelo opcional para leer el contacto (arena, pasto). */
  ground?: THREE.ColorRepresentation;
}

const rgb = (r: number, g: number, b: number) => new THREE.Color(r, g, b);
const MULTI = "oido-absoluto-multi-juego/src/3d/environment.ts";

export const PRESETS: LightingPreset[] = [
  {
    id: "neutro",
    label: "Neutro (estudio)",
    source: "inspector",
    background: 0x1d2430,
    toneMapping: THREE.ACESFilmicToneMapping,
    studio: true,
    hemisphere: { sky: 0xbfd8ff, ground: 0x3a3226, intensity: 0.6 },
    directional: [{ color: 0xffffff, intensity: 1.6, position: [3, 5, 4] }],
  },
  {
    id: "multi-1-pradera",
    label: "AP Multi · 1 La Pradera",
    source: `${MULTI} buildPrairie`,
    background: 0xa8d8f0,
    fog: { color: 0xa8d8f0, density: 0.007 },
    toneMapping: THREE.NoToneMapping,
    studio: false,
    hemisphere: { sky: 0xb8e4fa, ground: 0x4f7a3a, intensity: 1.2 },
    directional: [
      { color: 0xfff1d0, intensity: 1.5, position: [-40, 80, 50] },
      { color: 0xdbe6f5, intensity: 0.5, position: [50, 80, -30] },
      { color: 0xd9ecf5, intensity: 0.35, position: [50, 40, 50] },
    ],
    ground: 0x5d8a4a,
  },
  {
    id: "multi-2-oceano",
    label: "AP Multi · 2 El Océano",
    source: `${MULTI} buildOcean`,
    background: 0x2c86a3,
    fog: { color: 0x2c86a3, density: 0.0065 },
    toneMapping: THREE.NoToneMapping,
    studio: false,
    hemisphere: { sky: 0x59c8e0, ground: 0xbfa678, intensity: 1.15 },
    directional: [
      { color: 0xfff3d6, intensity: 1.5, position: [20, 90, 10] },
      { color: 0x8fd8ef, intensity: 0.45, position: [-40, 60, 30] },
    ],
    ground: 0xd9c28f,
  },
  {
    id: "multi-3-cosmos",
    label: "AP Multi · 3 El Cosmos",
    source: `${MULTI} buildCosmos`,
    background: 0x0b1438,
    toneMapping: THREE.NoToneMapping,
    studio: false,
    hemisphere: { sky: 0x9cc4ff, ground: 0x2a1f5c, intensity: 1.3 },
    directional: [
      { color: 0xeaf4ff, intensity: 1.8, position: [100, 100, -100] },
      { color: 0xff9e7a, intensity: 0.6, position: [-120, -40, 120] },
    ],
  },
  {
    id: "multi-4-pantano",
    label: "AP Multi · 4 El Pantano",
    source: `${MULTI} buildSwamp`,
    background: rgb(0.025, 0.05, 0.02),
    fog: { color: rgb(0.07, 0.14, 0.05), density: 0.013 },
    toneMapping: THREE.NoToneMapping,
    studio: false,
    hemisphere: { sky: rgb(0.1, 0.22, 0.08), ground: rgb(0.03, 0.05, 0.02), intensity: 0.22 },
    directional: [{ color: rgb(0.45, 0.72, 0.38), intensity: 0.38, position: [-40, 60, 40] }],
    ground: rgb(0.06, 0.09, 0.04),
  },
  {
    id: "multi-5-nubes",
    label: "AP Multi · 5 Las Nubes",
    source: `${MULTI} buildClouds`,
    background: rgb(0.72, 0.85, 0.96),
    fog: { color: rgb(0.84, 0.88, 0.96), density: 0.0018 },
    toneMapping: THREE.NoToneMapping,
    studio: false,
    hemisphere: { sky: rgb(0.92, 0.88, 0.98), ground: rgb(0.84, 0.88, 0.96), intensity: 1.0 },
    directional: [{ color: rgb(1.0, 0.93, 0.88), intensity: 1.3, position: [60, 110, 90] }],
  },
];

/** Monta la luz del preset en un grupo nuevo (el anterior se retira con `dispose`). */
export function applyPreset(
  preset: LightingPreset,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  studio: THREE.Texture,
  modelBox: THREE.Box3,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Luz · ${preset.id}`;
  scene.background = new THREE.Color(preset.background);
  scene.fog = preset.fog ? new THREE.FogExp2(new THREE.Color(preset.fog.color).getHex(), preset.fog.density) : null;
  scene.environment = preset.studio ? studio : null;
  renderer.toneMapping = preset.toneMapping;
  if (preset.hemisphere) {
    group.add(new THREE.HemisphereLight(preset.hemisphere.sky, preset.hemisphere.ground, preset.hemisphere.intensity));
  }
  for (const light of preset.directional) {
    const directional = new THREE.DirectionalLight(light.color, light.intensity);
    directional.position.fromArray(light.position);
    group.add(directional);
  }
  if (preset.ground !== undefined) {
    const size = modelBox.getSize(new THREE.Vector3());
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(Math.max(size.x, size.z) * 4 + 10, 48),
      new THREE.MeshStandardMaterial({ color: preset.ground, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = modelBox.min.y - 0.001;
    ground.name = "Suelo del preset";
    group.add(ground);
  }
  scene.add(group);
  return group;
}
