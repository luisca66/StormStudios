// Emisión por vértice para MeshStandardMaterial (Three no la trae de fábrica).
// Misma técnica que `acordes-juego/src/3d/vertex-emission.ts`, con el atributo del formato común
// (`_emission`): el cuerpo es frío y solo se encienden los vértices con emisión.
//
// El latido va en el shader: `aPhase` es un atributo por instancia opcional, para que un manchón
// instanciado no respire a la vez. Sin `aPhase` la fase es 0.

import * as THREE from "three";
import { EMISSION_ATTRIBUTE } from "./model";

export interface VertexEmissionOptions {
  /** Factor por el que se multiplica la emisión de cada vértice (el `emission` del modelo). */
  emission: number;
  /** Uniforme compartido con el reloj del juego. Sin él no hay latido. */
  time?: { value: number };
  hz?: number;
  amount?: number;
  /** Clave de caché del programa: distinta por familia de piezas. */
  cacheKey: string;
}

export function applyVertexEmission(material: THREE.MeshStandardMaterial, options: VertexEmissionOptions): void {
  const time = options.time ?? { value: 0 };
  const hz = options.hz ?? 0;
  const amount = options.amount ?? 0;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uEmission = { value: options.emission };
    shader.vertexShader = `attribute vec3 ${EMISSION_ATTRIBUTE};
attribute float aPhase;
uniform float uTime;
varying vec3 vVertexEmission;
${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
  vVertexEmission = ${EMISSION_ATTRIBUTE} * (1.0 + ${amount.toFixed(3)} * sin(uTime * ${(Math.PI * 2 * hz).toFixed(4)} + aPhase));`,
    );
    shader.fragmentShader = `uniform float uEmission;
varying vec3 vVertexEmission;
${shader.fragmentShader}`.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
  totalEmissiveRadiance += vVertexEmission * uEmission;`,
    );
  };
  // Sin esto, Three reutiliza el programa del material estándar sin el parche.
  material.customProgramCacheKey = () => options.cacheKey;
}
