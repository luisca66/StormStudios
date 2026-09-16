// Cúpula de cristal de la Batisfera: el mundo se dibuja en un render target y se mira a
// través de una esfera. Deformación de barril (más campo en los bordes, como una burbuja),
// aberración cromática leve hacia la orilla, reflejos en arco y un halo frío de borde.
// La cabina de Blender se dibuja después, sin deformar: el cristal está detrás del marco.

import * as THREE from "three";

/** Curvatura del cristal: 0 = ventana plana. */
export const DOME_CURVATURE = 0.24;

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D tWorld;
  uniform float uAspect;
  uniform float uCurvature;
  uniform float uNorm;
  uniform float uTime;
  varying vec2 vUv;

  // Pantalla → punto del mundo renderizado (misma fórmula que Dome.worldNdc).
  vec2 warp(vec2 uv, float k) {
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
    p *= (1.0 + k * dot(p, p)) / uNorm;
    return p / vec2(uAspect, 1.0) + 0.5;
  }

  // Banda luminosa sobre un arco: centro c, radio r, ancho w, recortada a [a0, a1] rad.
  float arc(vec2 p, vec2 c, float r, float w, float a0, float a1) {
    vec2 d = p - c;
    float band = 1.0 - smoothstep(0.0, w, abs(length(d) - r));
    float a = atan(d.y, d.x);
    float mid = 0.5 * (a0 + a1);
    float half_ = 0.5 * (a1 - a0);
    float fade = 1.0 - smoothstep(half_ * 0.55, half_, abs(a - mid));
    return band * fade;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float r2 = dot(p, p);

    // Aberración: el rojo se curva un poco menos que el azul, solo cerca del borde.
    float spread = 0.018 * r2;
    vec3 color = vec3(
      texture2D(tWorld, warp(vUv, uCurvature - spread)).r,
      texture2D(tWorld, warp(vUv, uCurvature)).g,
      texture2D(tWorld, warp(vUv, uCurvature + spread)).b
    );

    // Halo de borde (fresnel fingido): el cristal se vuelve visible en ángulo rasante.
    float rim = smoothstep(0.45, 1.25, r2);
    color = mix(color, color * vec3(0.78, 0.92, 1.0) + vec3(0.02, 0.07, 0.1), rim * 0.55);

    // Reflejos de las luces de cabina sobre la esfera: dos arcos largos y uno corto.
    float shimmer = 0.85 + 0.15 * sin(uTime * 0.6);
    float glint =
        arc(p, vec2(0.35, -0.55), 1.22, 0.010, 1.95, 2.75) * 0.55
      + arc(p, vec2(0.30, -0.50), 1.12, 0.022, 2.05, 2.55) * 0.18
      + arc(p, vec2(-0.40, 0.30), 1.05, 0.008, -0.55, -0.15) * 0.30;
    color += vec3(0.62, 0.86, 1.0) * glint * shimmer;

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export class DomeGlass {
  private target: THREE.WebGLRenderTarget;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: THREE.ShaderMaterial;
  private aspect = 1;
  private norm = 1;

  constructor(private worldCamera: THREE.PerspectiveCamera, private baseFov: number) {
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        tWorld: { value: this.target.texture },
        uAspect: { value: 1 },
        uCurvature: { value: DOME_CURVATURE },
        uNorm: { value: 1 },
        uTime: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  /** Tamaño en píxeles de dibujo; ajusta el FOV del mundo para que el centro no cambie de escala. */
  resize(width: number, height: number, pixelRatio: number): void {
    this.target.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
    this.aspect = width / height;
    // Esquina más lejana = r² máximo; normalizar ahí mantiene el borde dentro del render.
    const rMax2 = (this.aspect / 2) ** 2 + 0.25;
    this.norm = 1 + DOME_CURVATURE * rMax2;
    this.material.uniforms.uAspect.value = this.aspect;
    this.material.uniforms.uNorm.value = this.norm;
    // El centro se amplía 1/escala; se abre el FOV en esa proporción para compensar.
    const halfTan = Math.tan(THREE.MathUtils.degToRad(this.baseFov / 2)) * this.norm;
    this.worldCamera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfTan));
    this.worldCamera.aspect = this.aspect;
    this.worldCamera.updateProjectionMatrix();
  }

  /** NDC de pantalla → NDC del mundo renderizado (para raycast de criaturas). */
  worldNdc(ndc: THREE.Vector2): THREE.Vector2 {
    const px = ndc.x * 0.5 * this.aspect;
    const py = ndc.y * 0.5;
    const s = (1 + DOME_CURVATURE * (px * px + py * py)) / this.norm;
    return ndc.set(ndc.x * s, ndc.y * s);
  }

  render(renderer: THREE.WebGLRenderer, world: THREE.Scene, elapsed: number): void {
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(world, this.worldCamera);
    renderer.setRenderTarget(null);
    this.material.uniforms.uTime.value = elapsed;
    renderer.clear();
    renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.target.dispose();
    this.material.dispose();
  }
}
