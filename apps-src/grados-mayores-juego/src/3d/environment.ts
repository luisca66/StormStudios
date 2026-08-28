// environment.ts — cielo/luz/fog compartidos de F3. El horizonte y la niebla usan
// exactamente el mismo color para que el domo no revele costuras.

import * as THREE from "three";
import type { BiomeId, RouteSpec, TimeOfDay } from "@/config";

interface Palette {
  top: string;
  horizon: string;
  sun: string;
  groundLight: string;
  fogDensity: number;
}

const BIOME_PALETTES: Record<BiomeId, Palette> = {
  VALLE: { top: "#4c91c2", horizon: "#d9e8c2", sun: "#fff3bd", groundLight: "#697748", fogDensity: 0.0018 },
  SIERRA: { top: "#506777", horizon: "#c7d1c7", sun: "#ffd6a1", groundLight: "#35443d", fogDensity: 0.0065 },
  DESIERTO: { top: "#5c94bc", horizon: "#f0c79d", sun: "#fff1bd", groundLight: "#81583f", fogDensity: 0.0022 },
  COSTA: { top: "#4b9ab2", horizon: "#d6eeee", sun: "#fff1c9", groundLight: "#557d73", fogDensity: 0.0025 },
  PARAMO: { top: "#241d54", horizon: "#8d78ad", sun: "#d9e5ff", groundLight: "#3c3857", fogDensity: 0.0035 },
};

const SUN_ARC: Record<TimeOfDay, [number, number]> = {
  AMANECER: [10, 42],
  MEDIODIA: [62, 40],
  ATARDECER: [36, 7],
  NOCHE: [18, 28],
  CREPUSCULO: [12, 3],
  AURORA: [8, 25],
};

function sunTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const gradient = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, "rgba(255,255,235,1)");
  gradient.addColorStop(0.16, "rgba(255,225,154,.95)");
  gradient.addColorStop(0.5, "rgba(255,196,91,.28)");
  gradient.addColorStop(1, "rgba(255,190,70,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Estrellas: Points sobre la media esfera alta, solo en las variantes oscuras. */
function starField(seed: number): THREE.Points {
  const count = 900;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  let s = seed;
  const rnd = (): number => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    // Distribución uniforme en la cúpula (evita el apelmazamiento del polo).
    const u = rnd(), v = rnd() * 0.82 + 0.08;
    const theta = u * Math.PI * 2;
    const phi = Math.acos(v);
    const r = 640;
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    positions[i * 3 + 1] = Math.cos(phi) * r;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    sizes[i] = rnd() < 0.08 ? 5.5 : 1.6 + rnd() * 2.2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { uOpacity: { value: 1 } },
    vertexShader: `
      attribute float aSize;
      varying float vSize;
      void main() {
        vSize = aSize;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vSize;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float a = smoothstep(0.5, 0.06, d) * uOpacity;
        gl_FragColor = vec4(vec3(0.92, 0.95, 1.0), a);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

/**
 * Auroras: dos cintas verticales de shader (patrón Aerostato). El ruido son senos
 * desfasados —barato— y el alfa se apaga arriba y abajo para que no se vea el borde
 * del plano. Aditivas y sin fog, como el sol.
 */
function auroraCurtains(): THREE.Mesh {
  // Cilindro COMPLETO: con un arco parcial la cortina quedaba fuera del rumbo del tren
  // según la ruta. Los huecos entre cortinas los abre el propio shader, no la geometría.
  const geometry = new THREE.CylinderGeometry(430, 430, 320, 96, 1, true);
  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;
      void main() {
        float x = vUv.x * 22.0;
        // Tres senos desfasados = cortina que ondula sin repetir a simple vista.
        float band = sin(x + uTime * 0.55)
                   + sin(x * 0.47 - uTime * 0.31) * 0.8
                   + sin(x * 1.9 + uTime * 0.17) * 0.4;
        band = smoothstep(0.25, 1.55, band);
        // Se desvanece hacia arriba y hacia abajo.
        float vertical = smoothstep(0.02, 0.30, vUv.y) * (1.0 - smoothstep(0.50, 0.96, vUv.y));
        float a = band * vertical * uIntensity;
        // Verde abajo, violeta arriba. Con ACES + mezcla aditiva sobre cielo violeta hay
        // que empujar saturación y alfa o la cortina se lava hasta desaparecer.
        vec3 color = mix(vec3(0.22, 1.0, 0.52), vec3(0.62, 0.30, 1.0),
                         smoothstep(0.28, 0.62, vUv.y));
        gl_FragColor = vec4(color, a * 1.25);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

export class Environment {
  private readonly topColor = new THREE.Color("#4c91c2");
  private readonly horizonColor = new THREE.Color("#d9e8c2");
  private readonly dome: THREE.Mesh;
  private readonly sunLight = new THREE.DirectionalLight("#fff3bd", 2.35);
  private readonly hemi = new THREE.HemisphereLight("#dbe8e4", "#697748", 1.75);
  private readonly sun: THREE.Sprite;
  private route: RouteSpec | null = null;
  private baseFogDensity = 0.0018;
  private stars: THREE.Points | null = null;
  private auroras: THREE.Mesh | null = null;
  private elapsed = 0;
  private detourGrey = 0;
  private readonly liveHorizon = new THREE.Color();
  private static readonly DETOUR_GREY = new THREE.Color("#7a7d82");

  constructor(private readonly scene: THREE.Scene) {
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: this.topColor },
        // El domo lee el color VIVO, no el de la paleta: así el gris del apartadero
        // afecta a domo y niebla a la vez y la costura del horizonte sigue invisible.
        uHorizon: { value: this.liveHorizon },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        varying vec3 vWorld;
        void main() {
          float h = smoothstep(-0.08, 0.72, normalize(vWorld - cameraPosition).y);
          gl_FragColor = vec4(mix(uHorizon, uTop, h), 1.0);
        }
      `,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 18), material);
    this.dome.frustumCulled = false;
    this.scene.add(this.dome, this.sunLight, this.sunLight.target, this.hemi);

    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunTexture(), transparent: true, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending,
    }));
    this.sun.scale.set(46, 46, 1);
    this.scene.add(this.sun);
  }

  setRoute(route: RouteSpec, seed = 1): void {
    this.route = route;
    this.elapsed = 0;
    this.clearSky();
    // Estrellas y auroras son exclusivas del Páramo (PLAN §5.3/§5.4): es la recompensa
    // visual de las tonalidades difíciles, no un adorno repartido por todas las rutas.
    if (route.biome === "PARAMO") {
      this.stars = starField(seed);
      this.auroras = auroraCurtains();
      // La variante AURORA la lleva al frente; NOCHE y CREPÚSCULO la insinúan.
      (this.auroras.material as THREE.ShaderMaterial).uniforms.uIntensity.value =
        route.time === "AURORA" ? 1 : route.time === "CREPUSCULO" ? 0.45 : 0.7;
      (this.stars.material as THREE.ShaderMaterial).uniforms.uOpacity.value =
        route.time === "NOCHE" ? 1 : 0.6;
      this.scene.add(this.stars, this.auroras);
    }
    const palette = BIOME_PALETTES[route.biome];
    this.topColor.set(palette.top);
    this.horizonColor.set(palette.horizon);
    this.baseFogDensity = palette.fogDensity;
    this.sunLight.color.set(palette.sun);
    this.hemi.groundColor.set(palette.groundLight);
    this.detourGrey = 0;
    this.liveHorizon.copy(this.horizonColor);
    this.scene.background = this.liveHorizon;
    this.scene.fog = new THREE.FogExp2(this.liveHorizon, this.baseFogDensity);
  }

  /**
   * Desaturación del apartadero (§5.5): el fog tira a gris y la luz baja un 40 %.
   * Entra de golpe y sale en 2 s — el contraste gris→color es el castigo y el alivio.
   */
  setDetourGrey(amount: number): void {
    this.detourGrey = THREE.MathUtils.clamp(amount, 0, 1);
  }

  update(trainPosition: THREE.Vector3, progress: number, tunnel: number, dt = 0): void {
    if (!this.route) return;
    this.elapsed += dt;
    this.dome.position.copy(trainPosition);
    if (this.stars) this.stars.position.copy(trainPosition);
    if (this.auroras) {
      this.auroras.position.copy(trainPosition);
      this.auroras.position.y += 130;
      (this.auroras.material as THREE.ShaderMaterial).uniforms.uTime.value = this.elapsed;
    }

    const [startDeg, endDeg] = SUN_ARC[this.route.time];
    const elevation = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(startDeg, endDeg, progress));
    const azimuth = THREE.MathUtils.lerp(-0.72, 0.58, progress);
    const radius = 280;
    const sunOffset = new THREE.Vector3(
      Math.sin(azimuth) * Math.cos(elevation) * radius,
      Math.sin(elevation) * radius,
      -Math.cos(azimuth) * Math.cos(elevation) * radius,
    );
    this.sun.position.copy(trainPosition).add(sunOffset);
    this.sunLight.position.copy(this.sun.position);
    this.sunLight.target.position.copy(trainPosition);

    const fog = this.scene.fog as THREE.FogExp2;
    fog.density = THREE.MathUtils.lerp(this.baseFogDensity, 0.045, tunnel);
    this.hemi.intensity = THREE.MathUtils.lerp(1.75, 0.22, tunnel);
    this.sunLight.intensity = THREE.MathUtils.lerp(2.35, 0.12, tunnel);
    this.sun.material.opacity = 1 - tunnel;

    // Apartadero: el fog (que ES el color del horizonte del domo) tira a gris y la luz
    // cae un 40 %. Se toca el color VIVO, no el de la paleta, para no perderla.
    const grey = this.detourGrey;
    this.liveHorizon.copy(this.horizonColor).lerp(Environment.DETOUR_GREY, grey);
    fog.color.copy(this.liveHorizon);
    this.scene.background = this.liveHorizon;
    this.hemi.intensity *= 1 - 0.4 * grey;
    this.sunLight.intensity *= 1 - 0.4 * grey;
    this.sun.material.opacity *= 1 - grey;
  }

  private clearSky(): void {
    for (const object of [this.stars, this.auroras]) {
      if (!object) continue;
      this.scene.remove(object);
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
    this.stars = null;
    this.auroras = null;
  }

  dispose(): void {
    this.clearSky();
  }
}
