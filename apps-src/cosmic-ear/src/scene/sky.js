// Cielo: campo de estrellas y nebulosa.
// Extraído de main.jsx en la fase 1b (PLAN-COSMIC-EAR.md); el código no cambió.

import * as THREE from "three";
import { t } from "../i18n.js";

export const createStarfield = (n = 2000) => {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        const r = 500 + Math.random() * 1000, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
        pos[i*3] = r * Math.sin(p) * Math.cos(t); pos[i*3+1] = r * Math.sin(p) * Math.sin(t); pos[i*3+2] = r * Math.cos(p);
        // Estrellas cálidas: blancas, doradas y rosadas (PLAN-COSMIC-EAR.md §3)
        const k = 0.55 + Math.random() * 0.45, tint = Math.random();
        col[i*3] = k; col[i*3+1] = k * (tint < 0.2 ? 0.8 : tint < 0.35 ? 0.72 : 0.97); col[i*3+2] = k * (tint < 0.2 ? 0.45 : tint < 0.35 ? 0.85 : 1.0);
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
        vec3 c = mix(vec3(0.07, 0.04, 0.18), vec3(0.16, 0.08, 0.3), n1 * 0.55); c = mix(c, vec3(0.3, 0.08, 0.24), n2 * 0.22); c += vec3(0.12, 0.08, 0.0) * smoothstep(0.2, 1.0, d.y) * 0.5; gl_FragColor = vec4(c, 1.0); }`
}));
