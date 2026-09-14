import * as THREE from "three";
import dataUrl from "./assets/sifonoforo.json?url";
import type { CreatureVisual } from "./base";
import type { PartData } from "./blender-squid";

// Sifonóforo modelado por Astra en Blender (art/blender/sifonoforo/, kit.export_parts).
// Llegan 4 piezas (head, node, lantern, tail); aquí se encadenan en una curva que ondula.
// node y lantern se dibujan con instancias: 4 llamadas de dibujo por colonia.

const TAU = Math.PI * 2;
const NODES = 14;
const SPACING = 0.42; // pivote → pivote, fijado en el brief
const TOP = 3.2; // altura del pivote de head: la colonia queda centrada en el origen
const DOWN = new THREE.Vector3(0, -1, 0);

let parts: Map<string, PartData> | undefined;
let pending: Promise<void> | undefined;

/** Se descarga una vez antes de la inmersión; la geometría queda fuera del bundle JS. */
export function preloadBlenderSiphonophore(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Sifonóforo: HTTP ${response.status}`);
    const meshes = (await response.json() as { meshes: PartData[] }).meshes;
    parts = new Map(meshes.map((m) => [m.part, m]));
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

function tissue(part: PartData): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
    vertexColors: Boolean(part.vertexColor),
    metalness: part.metalness,
    roughness: part.roughness,
  });
}

export function buildBlenderSiphonophore(color: number): CreatureVisual {
  if (!parts) throw new Error("Sifonóforo must be preloaded before starting the dive.");
  const [headData, nodeData, lanternData, tailData] = ["head", "node", "lantern", "tail"].map((name) => {
    const part = parts!.get(name);
    if (!part) throw new Error(`Sifonóforo: falta la pieza ${name}`);
    return part;
  });

  const group = new THREE.Group();
  group.name = "Sifonóforo · Blender";

  const head = new THREE.Mesh(geometryOf(headData), tissue(headData));
  const tail = new THREE.Mesh(geometryOf(tailData), tissue(tailData));
  const nodes = new THREE.InstancedMesh(geometryOf(nodeData), tissue(nodeData), NODES);

  // Faroles: la emisión se multiplica por el color de instancia → cada farol brilla por separado.
  const lanternMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: lanternData.emission,
    roughness: lanternData.roughness,
    metalness: 0,
  });
  lanternMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n\ttotalEmissiveRadiance *= vColor;\n#endif",
    );
  };
  const lanterns = new THREE.InstancedMesh(geometryOf(lanternData), lanternMat, NODES);
  for (const mesh of [nodes, lanterns]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // La colonia ondula: la esfera de instancias quedaría desfasada.
    mesh.frustumCulled = false;
  }
  group.add(head, nodes, lanterns, tail);

  // Variación fija por instancia: giro en espiral alrededor del tallo y ±10 % de escala.
  const twist = Array.from({ length: NODES }, (_, i) => i * 2.4);
  const size = Array.from({ length: NODES }, (_, i) => 0.9 + 0.2 * ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1);
  const boost = new Float32Array(NODES);
  const white = new THREE.Color(1, 1, 1);
  for (let i = 0; i < NODES; i++) lanterns.setColorAt(i, white);

  const points = Array.from({ length: NODES + 2 }, () => new THREE.Vector3());
  const dir = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const spin = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const tint = new THREE.Color();

  return {
    group,
    glowMaterials: [lanternMat],
    glowSprites: [],
    bodyRadius: 3.4,
    // Onda de ENTREGA.md: X ±0.32 u, Z ±0.10 u, 0.18 ciclos/s, fase 0.40 rad por nodo.
    animate(_dt, elapsed) {
      const w = elapsed * TAU * 0.18;
      points[0].set(0, TOP, 0);
      for (let i = 1; i < points.length; i++) {
        const k = i / (points.length - 1);
        const x = Math.sin(w - i * 0.4) * 0.32 * (0.3 + 0.7 * k);
        const z = Math.cos(w * 0.8 - i * 0.4) * 0.1 * k;
        // Separación exacta de 0.42 u a lo largo de la curva; ángulos pequeños entre vecinos.
        dir.set(x - points[i - 1].x, -SPACING, z - points[i - 1].z).normalize();
        points[i].copy(points[i - 1]).addScaledVector(dir, SPACING);
      }

      head.position.copy(points[0]);
      head.rotation.set(Math.sin(elapsed * TAU * 0.12) * 0.04, 0, Math.sin(elapsed * TAU * 0.16) * 0.08);

      for (let i = 0; i < NODES; i++) {
        dir.subVectors(points[i + 1], points[i]).normalize();
        quat.setFromUnitVectors(DOWN, dir).multiply(spin.setFromAxisAngle(DOWN, twist[i]));
        matrix.compose(points[i], quat, scale.setScalar(size[i]));
        nodes.setMatrixAt(i, matrix);
        lanterns.setMatrixAt(i, matrix);
        lanterns.setColorAt(i, tint.setScalar(1 + boost[i]));
        boost[i] = 0;
      }
      nodes.instanceMatrix.needsUpdate = true;
      lanterns.instanceMatrix.needsUpdate = true;
      if (lanterns.instanceColor) lanterns.instanceColor.needsUpdate = true;

      dir.subVectors(points[NODES + 1], points[NODES]).normalize();
      tail.position.copy(points[NODES]);
      tail.quaternion.setFromUnitVectors(DOWN, dir);
      tail.rotateX(Math.sin(elapsed * TAU * 0.23) * 0.06);
      tail.rotateZ(Math.sin(elapsed * TAU * 0.19) * 0.08);
    },
    // Un tramo de faroles por nota; se aplica en animate(), que corre después.
    flashSegment(index, intensity, noteCount) {
      const span = Math.ceil(NODES / noteCount);
      for (let j = index * span; j < Math.min(NODES, (index + 1) * span); j++) boost[j] += intensity * 2.5;
    },
  };
}
