// Emisión por vértice para MeshStandardMaterial (Three no la trae de fábrica).
// La usan el jardín de corales (zona 3) y la osamenta de ballena con sus anémonas (zona 4):
// el cuerpo es frío y solo se encienden puntas, bocas, coronas y parches de bacterias.
//
// El JSON trae `vertexEmission` (una terna RGB por vértice, cero exacto donde no brilla) y un
// factor `emission`. El latido va en el mismo shader: `aPhase` es un atributo por instancia, así
// que un manchón entero no respira a la vez. Sin `aPhase` (mallas sueltas) la fase es 0.

import * as THREE from "three";

export interface VertexEmissionOptions {
  /** Factor del JSON por el que se multiplica la emisión de cada vértice. */
  emission: number;
  /** Uniforme compartido con el reloj del juego. */
  time: { value: number };
  hz: number;
  amount: number;
  /** Clave de caché del programa: distinta por familia de piezas. */
  cacheKey: string;
}

export function applyVertexEmission(material: THREE.MeshStandardMaterial, options: VertexEmissionOptions): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = options.time;
    shader.uniforms.uEmission = { value: options.emission };
    shader.vertexShader = `attribute vec3 aEmission;
attribute float aPhase;
uniform float uTime;
varying vec3 vVertexEmission;
${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
  vVertexEmission = aEmission * (1.0 + ${options.amount.toFixed(3)} * sin(uTime * ${(Math.PI * 2 * options.hz).toFixed(4)} + aPhase));`,
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
