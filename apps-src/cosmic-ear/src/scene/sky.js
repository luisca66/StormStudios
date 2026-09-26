// Cielo: campo de estrellas y nebulosa.
// Extraído de main.jsx en la fase 1b (PLAN-COSMIC-EAR.md); el código no cambió.

import * as THREE from "three";
import { t } from "../i18n.js";

export const createStarfield = (n = 2000) => {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        const r = 500 + Math.random() * 1000, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
        pos[i*3] = r * Math.sin(p) * Math.cos(t); pos[i*3+1] = r * Math.sin(p) * Math.sin(t); pos[i*3+2] = r * Math.cos(p);
        col[i*3] = col[i*3+1] = col[i*3+2] = 0.5 + Math.random() * 0.5;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ size: 2, vertexColors: true, transparent: true, opacity: 0.8 }));
};

export const createNebula = () => new THREE.Mesh(new THREE.SphereGeometry(800, 32, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; varying vec3 vP; float n(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453); }
        void main() { vec3 d = normalize(vP); float n1 = n(d * 3.0 + uTime * 0.01), n2 = n(d * 5.0 - uTime * 0.02);
        vec3 c = mix(vec3(0.0, 0.03, 0.1), vec3(0.08, 0.0, 0.15), n1 * 0.5); c = mix(c, vec3(0.0, 0.08, 0.08), n2 * 0.3); gl_FragColor = vec4(c, 1.0); }`
}));
