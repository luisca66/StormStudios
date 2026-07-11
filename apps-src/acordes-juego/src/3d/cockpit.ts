// Cabina batisfera (PLAN §8): esfera de cristal con fresnel sutil + arcos del marco.
// Todo cuelga de la cámara; la consola/viñeta son overlay HTML (ui/hud.ts).

import * as THREE from "three";

const fresnelVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fresnelFragment = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    // Brillo solo en el borde de la esfera (ángulo rasante).
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 3.0);
    vec3 tint = vec3(0.55, 0.8, 1.0);
    gl_FragColor = vec4(tint, fresnel * 0.22 + 0.015);
  }
`;

export class Cockpit {
  constructor(camera: THREE.PerspectiveCamera) {
    // Cristal: esfera alrededor de la cámara, vista desde dentro.
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 40, 28),
      new THREE.ShaderMaterial({
        vertexShader: fresnelVertex,
        fragmentShader: fresnelFragment,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    camera.add(glass);

    // El marco de la burbuja vive en el overlay CSS (.bubble-vignette): una elipse
    // se adapta a cualquier aspect ratio, cosa que un toro 3D fijo no puede.
    // Aquí solo queda el cristal. (Intento previo con toros: cruzaban el centro
    // de la vista o no abrazaban los bordes — ver bitácora F3.)
  }
}
