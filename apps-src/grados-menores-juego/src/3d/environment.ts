// environment.ts — cielo, luz y niebla (PLAN §5.3). El fondo y la niebla comparten
// exactamente el mismo color para que el domo no revele costuras.
//
// Diferencias con el cielo del Expreso: aquí no hay horizonte ni suelo, así que el
// gradiente es sutil (negro azulado → índigo galáctico) y el peso visual lo llevan las
// NEBULOSAS, pintadas en canvas por región, y las estrellas con twinkle. La luz del
// mundo la da la ESTRELLA NATAL, que crece con el progreso: la distancia a la tónica
// se ve, no solo se cuenta (§5.2).

import * as THREE from "three";
import type { RegionId, RouteSpec, VarianteId } from "@/config";
import { makeRng } from "./track";

interface Palette {
  top: string;
  deep: string;
  star: string;
  nebula: [string, string, string];
  nebulaBlobs: number;
  /**
   * Cuánto ILUMINA la nebulosa el cielo (es aditiva). Alto en las regiones donde el gas
   * es el protagonista; bajo donde lo son los cuerpos, o el fondo se lava a un color
   * plano y se come la profundidad (le pasó a Faroles).
   */
  nebulaStrength: number;
  fogDensity: number;
  /** Solo El Vacío: la galaxia espiral vista de canto cruzando el cielo (§5.4). */
  galaxy?: boolean;
}

// Las 5 regiones (§5.4). F3 solo viste dos con escenografía (Lumbre y Rocas), pero el
// cielo de las cinco ya está: es solo data, y así F4 no toca este archivo.
const REGION_PALETTES: Record<RegionId, Palette> = {
  LUMBRE:  { top: "#0d0714", deep: "#1d0b16", star: "#ffd0a0", nebula: ["#d4553f", "#a82f5e", "#f09a5b"], nebulaBlobs: 26, nebulaStrength: 1.0, fogDensity: 0.0022 },
  ROCAS:   { top: "#080b16", deep: "#151208", star: "#ffe2b0", nebula: ["#8a7a63", "#5c5340", "#b09877"], nebulaBlobs: 14, nebulaStrength: 0.55, fogDensity: 0.0026 },
  HIELO:   { top: "#08121f", deep: "#123648", star: "#dff0ff", nebula: ["#4aa6c4", "#2b6f8e", "#9fd8e8"], nebulaBlobs: 18, nebulaStrength: 0.45, fogDensity: 0.0048 },
  FAROLES: { top: "#080a16", deep: "#16121f", star: "#fff3d0", nebula: ["#e0c064", "#c9a227", "#f2e2a8"], nebulaBlobs: 13, nebulaStrength: 0.30, fogDensity: 0.0020 },
  VACIO:   { top: "#05070f", deep: "#0b0d1c", star: "#e8e6ff", nebula: ["#6b5bb5", "#3d3470", "#9b8fd8"], nebulaBlobs: 8,  nebulaStrength: 0.85, fogDensity: 0.0022, galaxy: true },
};

// Tinte por variante: las 3 rutas de una región comparten geometría y difieren de color.
const VARIANT_TINT: Record<VarianteId, string> = {
  RESCOLDO: "#ff7a3c", MAGENTA: "#ff4fa3", DORADA: "#ffc75e",
  OCRE: "#c99a55", GRIS_AZUL: "#7f95b5", VIOLETA: "#9a6fd0",
  ZAFIRO: "#3f7fd6", TURQUESA: "#40d0c8", PERLA: "#dfe8f0",
  ORO_BLANCO: "#fff0c0", AZUL_ELECTRICO: "#5aa8ff", AMBAR: "#ffab40",
  NOCHE_ABSOLUTA: "#5a5f80", ALBA_GALACTICA: "#c9b0ff", VIOLETA_PROFUNDO: "#7b4fd0",
};

const DOME_RADIUS = 700;

function hexToRgba(hex: string, alpha: number): string {
  const c = new THREE.Color(hex);
  return "rgba(" + Math.round(c.r * 255) + "," + Math.round(c.g * 255) + "," + Math.round(c.b * 255) + "," + alpha + ")";
}

/**
 * Nebulosa de fondo: manchas suaves de color sobre transparente, pintadas con RNG
 * SEMBRADO — cada tonalidad tiene su cielo y lo tendrá siempre (§5.1). Se envuelve
 * sobre el domo por UV equirectangular.
 */
function nebulaTexture(palette: Palette, tint: string, seed: number): THREE.CanvasTexture {
  const W = 1024, H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d")!;
  g.clearRect(0, 0, W, H);
  const rng = makeRng(seed);
  const colors = [...palette.nebula, tint];

  for (let i = 0; i < palette.nebulaBlobs; i++) {
    const x = rng() * W;
    // Concentradas en la banda ecuatorial: es donde mira el jugador.
    const y = H * (0.28 + rng() * 0.5);
    const r = 60 + rng() * 190;
    const color = colors[Math.floor(rng() * colors.length)];
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const alpha = 0.14 + rng() * 0.26;
    grad.addColorStop(0, hexToRgba(color, alpha));
    grad.addColorStop(0.45, hexToRgba(color, alpha * 0.42));
    grad.addColorStop(1, hexToRgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // El Vacío tiene su lujo propio: la galaxia vista DE CANTO cruzando el cielo. Es una
  // banda brillante con un bulbo central y una veta de polvo oscuro por el ecuador —
  // exactamente lo que se ve de una espiral mirada por el borde (PLAN §5.4).
  if (palette.galaxy) {
    const cy = H * 0.46;
    for (let i = 0; i < 260; i++) {
      const x = rng() * W;
      // Más gruesa en el centro y afilada en las puntas: perfil de disco.
      const bulge = Math.exp(-Math.pow((x - W * 0.5) / (W * 0.26), 2));
      const spread = 4 + bulge * 26;
      const y = cy + (rng() - 0.5) * spread * 2;
      const r = 8 + rng() * 26 * (0.4 + bulge);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      const a = (0.10 + rng() * 0.16) * (0.35 + bulge);
      grad.addColorStop(0, hexToRgba(i % 7 === 0 ? tint : "#cfd6ff", a));
      grad.addColorStop(1, hexToRgba("#cfd6ff", 0));
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // La veta de polvo que parte el disco en dos. Va como una BANDA CONTINUA con
    // degradado vertical, no como círculos sueltos: con círculos —dos intentos— se leía
    // como una hilera de agujeros redondos, que es justo lo contrario de una veta.
    const laneHalf = 7;
    const lane = g.createLinearGradient(0, cy - laneHalf, 0, cy + laneHalf);
    lane.addColorStop(0, hexToRgba("#000000", 0));
    lane.addColorStop(0.5, hexToRgba("#000000", 0.6));
    lane.addColorStop(1, hexToRgba("#000000", 0));
    g.fillStyle = lane;
    g.fillRect(0, cy - laneHalf, W, laneHalf * 2);

    // Y unas irregularidades pequeñas para que la veta no sea una regla perfecta.
    for (let i = 0; i < 70; i++) {
      const x = rng() * W;
      const r = 1.5 + rng() * 4;
      g.fillStyle = hexToRgba("#000000", 0.12 + rng() * 0.16);
      g.beginPath();
      g.arc(x, cy + (rng() - 0.5) * 9, r, 0, Math.PI * 2);
      g.fill();
    }
  }

  // Motas de polvo oscuro: rompen el aspecto de acuarela uniforme.
  for (let i = 0; i < 260; i++) {
    const x = rng() * W, y = rng() * H;
    g.fillStyle = hexToRgba("#000000", 0.03 + rng() * 0.06);
    g.beginPath();
    g.arc(x, y, 1 + rng() * 5, 0, Math.PI * 2);
    g.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/** Glow radial para la estrella natal. */
function starTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, "rgba(255,255,248,1)");
  grad.addColorStop(0.14, "rgba(255,236,190,.95)");
  grad.addColorStop(0.42, "rgba(255,200,120,.30)");
  grad.addColorStop(1, "rgba(255,180,90,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Campo de estrellas con TWINKLE. El titileo es un seno por estrella con fase propia:
 * un cielo de puntos fijos se lee a calcomanía, y esto cuesta una multiplicación.
 */
function starField(seed: number): THREE.Points {
  const count = 1600;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const rng = makeRng(seed);

  for (let i = 0; i < count; i++) {
    // Distribución uniforme sobre la esfera COMPLETA (aquí no hay suelo que recorte).
    const z = rng() * 2 - 1;
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    const radius = 640;
    positions[i * 3] = Math.cos(a) * r * radius;
    positions[i * 3 + 1] = z * radius;
    positions[i * 3 + 2] = Math.sin(a) * r * radius;
    sizes[i] = rng() < 0.06 ? 5.0 : 1.4 + rng() * 2.4;
    phases[i] = rng() * Math.PI * 2;
    // Azuladas y cálidas mezcladas: un cielo monocromo se lee a plano.
    const warm = rng();
    const b = 0.55 + rng() * 0.45;
    colors[i * 3] = (warm > 0.72 ? 1.0 : 0.78) * b;
    colors[i * 3 + 1] = 0.84 * b;
    colors[i * 3 + 2] = (warm > 0.72 ? 0.76 : 1.0) * b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 aColor;
      uniform float uTime;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vColor = aColor;
        vTwinkle = 0.825 + 0.175 * sin(uTime * 1.7 + aPhase);
        gl_PointSize = aSize * vTwinkle;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float a = smoothstep(0.5, 0.05, d) * uOpacity * vTwinkle;
        gl_FragColor = vec4(vColor, a);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

export class Environment {
  private readonly dome: THREE.Mesh;
  private readonly domeMaterial: THREE.ShaderMaterial;
  private stars: THREE.Points | null = null;
  private nebulaMap: THREE.CanvasTexture | null = null;

  /** La estrella natal: glow + luz direccional. Crece con el progreso (§5.2). */
  private readonly natalStar: THREE.Sprite;
  private readonly starLight = new THREE.DirectionalLight(0xffd9a0, 1.4);
  private readonly ambient = new THREE.AmbientLight(0x4a6a8a, 0.9);

  private route: RouteSpec | null = null;
  private elapsed = 0;
  private baseFogDensity = 0.004;
  private nebulaStrength = 1;
  private driftGrey = 0;

  private readonly topColor = new THREE.Color("#0e1428");
  private readonly deepColor = new THREE.Color("#1a2340");
  private readonly liveDeep = new THREE.Color();
  private static readonly DRIFT_GREY = new THREE.Color("#5a5d66");

  constructor(private readonly scene: THREE.Scene) {
    this.domeMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: this.topColor },
        // El domo lee el color VIVO, no el de la paleta: así el gris de la deriva
        // afecta a domo y niebla a la vez y no aparece costura.
        uDeep: { value: this.liveDeep },
        uNebula: { value: null as THREE.Texture | null },
        uNebulaStrength: { value: 1 },
      },
      vertexShader: `
        varying vec3 vWorld;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uDeep;
        uniform sampler2D uNebula;
        uniform float uNebulaStrength;
        varying vec3 vWorld;
        varying vec2 vUv;
        void main() {
          float h = smoothstep(-0.55, 0.85, normalize(vWorld - cameraPosition).y);
          vec3 base = mix(uDeep, uTop, h);
          vec4 neb = texture2D(uNebula, vUv);
          // Aditiva: la nebulosa ILUMINA el cielo, no lo tapa.
          gl_FragColor = vec4(base + neb.rgb * neb.a * uNebulaStrength, 1.0);
        }
      `,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 48, 28), this.domeMaterial);
    this.dome.frustumCulled = false;

    this.natalStar = new THREE.Sprite(new THREE.SpriteMaterial({
      map: starTexture(), transparent: true, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending,
    }));
    this.natalStar.scale.set(20, 20, 1);

    this.scene.add(this.dome, this.natalStar, this.starLight, this.starLight.target, this.ambient);
  }

  setRoute(route: RouteSpec, seed: number): void {
    this.route = route;
    this.elapsed = 0;
    this.driftGrey = 0;

    const palette = REGION_PALETTES[route.region];
    this.topColor.set(palette.top);
    this.deepColor.set(palette.deep);
    this.liveDeep.copy(this.deepColor);
    this.baseFogDensity = palette.fogDensity;
    this.starLight.color.set(palette.star);

    // Nebulosa y estrellas se rehacen por ruta: son la identidad visual de la tonalidad.
    this.nebulaMap?.dispose();
    this.nebulaMap = nebulaTexture(palette, VARIANT_TINT[route.variante], seed);
    this.domeMaterial.uniforms.uNebula.value = this.nebulaMap;
    this.nebulaStrength = palette.nebulaStrength;

    this.clearStars();
    this.stars = starField(seed + 991);
    this.scene.add(this.stars);

    this.scene.background = this.liveDeep;
    this.scene.fog = new THREE.FogExp2(this.liveDeep, this.baseFogDensity);
  }

  /**
   * Desaturación de la deriva (§5.5): el cielo tira a gris, las estrellas se apagan y la
   * luz baja. Entra de golpe y sale en 2 s — el contraste es el castigo y el alivio.
   */
  setDriftGrey(amount: number): void {
    this.driftGrey = THREE.MathUtils.clamp(amount, 0, 1);
  }

  /** progress 0–1 del viaje: gobierna cuánto ha crecido la estrella natal. */
  update(cometPosition: THREE.Vector3, progress: number, dt = 0): void {
    if (!this.route) return;
    this.elapsed += dt;

    this.dome.position.copy(cometPosition);
    if (this.stars) {
      this.stars.position.copy(cometPosition);
      const material = this.stars.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = this.elapsed;
      material.uniforms.uOpacity.value = 1 - 0.8 * this.driftGrey;
    }

    // La estrella natal vive SIEMPRE hacia −Z global (el eje del corredor de la ruta),
    // así que NO persigue al jugador: se queda quieta en el cielo y se desplaza de lado
    // según curva el tramo, como haría una estrella de verdad.
    //
    // La altura es baja a propósito (+14, no +46): a +46 quedaba por encima del dintel
    // de la ventana y no se veía NUNCA, que es tanto como no tenerla — el sentido de
    // este astro es que la distancia a casa se VEA (§5.2).
    this.natalStar.position.set(
      cometPosition.x,
      cometPosition.y + 14,
      cometPosition.z - 520,
    );
    this.starLight.position.copy(this.natalStar.position);
    this.starLight.target.position.copy(cometPosition);

    // CRECE con el progreso: de punto identificable a sol que domina el cielo (§5.2).
    const grow = THREE.MathUtils.lerp(14, 132, progress * progress);
    this.natalStar.scale.set(grow, grow, 1);
    this.natalStar.material.opacity = 1 - this.driftGrey;
    this.starLight.intensity = THREE.MathUtils.lerp(0.9, 2.4, progress) * (1 - 0.4 * this.driftGrey);
    this.ambient.intensity = THREE.MathUtils.lerp(0.9, 1.15, progress) * (1 - 0.4 * this.driftGrey);

    // El gris de la deriva se aplica al color VIVO, para no perder la paleta.
    this.liveDeep.copy(this.deepColor).lerp(Environment.DRIFT_GREY, this.driftGrey);
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.copy(this.liveDeep);
    this.scene.background = this.liveDeep;
    this.domeMaterial.uniforms.uNebulaStrength.value =
      this.nebulaStrength * (1 - 0.85 * this.driftGrey);
  }

  private clearStars(): void {
    if (!this.stars) return;
    this.scene.remove(this.stars);
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.stars = null;
  }

  dispose(): void {
    this.clearStars();
    this.nebulaMap?.dispose();
  }
}
