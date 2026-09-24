// Convierte el JSON de `kit.export_parts` a GLB con el contrato de `src/glb.ts`, y opcionalmente lo
// comprime con gltfpack. Sirve para probar el formato con modelos ya publicados sin abrir Blender;
// los modelos nuevos saldrán en GLB directo de `kit.py`.
//
//   node scripts/json-to-glb.mjs <entrada.json> <salida.glb> [--pack=none|meshopt|meshopt-q]
//
//   none       GLB sin comprimir (Float32, idéntico al JSON)
//   meshopt    compresión meshopt sin cuantizar posiciones ni normales, color en 16 bits (exacto)
//   meshopt-q  compresión meshopt con cuantización (el más ligero; redondea posiciones)

import { readFile, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// GLTFExporter usa FileReader para armar el binario; Node no lo trae.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => { this.result = buffer; this.onloadend?.(); });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onloadend?.();
    });
  }
};

export function sceneFromJson(json) {
  const { meshes, ...meta } = json;
  const scene = new THREE.Scene();
  scene.userData = meta;
  for (const part of meshes) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    // Hay colores por vértice mayores que 1 (faroles que brillan de más). gltfpack los recorta a 1:
    // se guardan divididos entre `colorScale` y el cargador los vuelve a multiplicar.
    let colorScale = 1;
    if (part.vertexColor?.length) {
      for (const value of part.vertexColor) colorScale = Math.max(colorScale, value);
      const colors = colorScale > 1 ? part.vertexColor.map((value) => value / colorScale) : part.vertexColor;
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    }
    // La emisión por vértice va en COLOR_1: gltfpack descarta los atributos propios (`_EMISSION`).
    if (part.vertexEmission?.length) geometry.setAttribute("color_1", new THREE.Float32BufferAttribute(part.vertexEmission, 3));
    geometry.setIndex(part.index);

    const color = part.color ?? [1, 1, 1];
    const emissionColor = part.emissionColor ?? [0, 0, 0];
    const emission = part.emission ?? 0;
    const alpha = part.alpha ?? 1;
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(color[0], color[1], color[2]),
      metalness: part.metalness ?? 0,
      roughness: part.roughness ?? 1,
      vertexColors: Boolean(part.vertexColor?.length),
      transparent: alpha < 1,
      opacity: alpha,
      emissive: new THREE.Color().setRGB(emissionColor[0], emissionColor[1], emissionColor[2]),
      emissiveIntensity: emission,
    });
    // glTF guarda emissive × intensidad; el valor original viaja en extras.
    material.userData = { emission, emissionColor, ...(colorScale > 1 && { colorScale }) };

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    mesh.userData = {
      // GLTFLoader sanea los nombres de nodo («Cola 3» -> «Cola_3»); el original viaja en extras.
      name: part.name,
      part: part.part,
      ...(part.segment !== undefined && { segment: part.segment }),
      ...(part.variant !== undefined && { variant: part.variant }),
    };
    scene.add(mesh);
  }
  return scene;
}

export async function jsonToGlb(json) {
  const glb = await new GLTFExporter().parseAsync(sceneFromJson(json), { binary: true });
  return Buffer.from(glb);
}

/** Pasa un GLB por gltfpack conservando nodos, materiales y extras. */
export function packGlb(input, output, mode) {
  const require = createRequire(import.meta.url);
  const cli = path.join(path.dirname(require.resolve("gltfpack/package.json")), "cli.js");
  // -kv conserva COLOR_1 (emisión por vértice) aunque ningún material lo use.
  const args = ["-i", input, "-o", output, "-kn", "-km", "-ke", "-kv", "-c"];
  // En modo exacto el color también va a 16 bits: en 8 bits lineales los tonos muy oscuros se escalonan.
  if (mode === "meshopt") args.push("-noq", "-vc", "16");
  execFileSync(process.execPath, [cli, ...args], { stdio: "pipe" });
}

async function main() {
  const [input, output, ...flags] = process.argv.slice(2);
  if (!input || !output) {
    console.error("Uso: node scripts/json-to-glb.mjs <entrada.json> <salida.glb> [--pack=none|meshopt|meshopt-q]");
    process.exit(1);
  }
  const mode = (flags.find((f) => f.startsWith("--pack=")) ?? "--pack=none").slice(7);
  const glb = await jsonToGlb(JSON.parse(await readFile(input, "utf8")));
  if (mode === "none") {
    await writeFile(output, glb);
  } else {
    const raw = `${output}.raw.glb`;
    await writeFile(raw, glb);
    packGlb(raw, output, mode);
    await rm(raw);
  }
  console.log(`${path.basename(input)} -> ${path.basename(output)} (${mode})`);
}

// Ejecutado directo (no importado). Se compara como URL real: en Windows y con enlaces la ruta
// de argv no coincide letra por letra con import.meta.url.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) await main();
