// El cielo de Aerostato (PLAN §5.1): domo con gradiente, fog acoplado, sol con
// glow, estrellas, partículas de viento y esclusas de capa. Espejo del entorno
// de Batisfera (misma estructura de keyframes y partículas recicladas).

import * as THREE from "three";
import { PHYSICS, SKY_KEYFRAMES, WORLD, layerAtY } from "@/config";

const WIND_COUNT = 800;
const WIND_BOX = 120; // cubo reciclado alrededor del jugador

// RNG sembrado (LCG) — copiado de Batisfera: mundo idéntico entre sesiones.
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface SkyState {
  zenith: THREE.Color;
  horizon: THREE.Color;
  fogDensity: number;
  ambient: number;
  sun: number;
  sunColor: THREE.Color;
}

export class Environment {
  private ambient: THREE.AmbientLight;
  private sun: THREE.DirectionalLight;
  private sunSprite: THREE.Sprite;
  private dome: THREE.Mesh;
  private domeUniforms: {
    zenithColor: { value: THREE.Color };
    horizonColor: { value: THREE.Color };
    bandStrength: { value: number };
  };
  private stars: THREE.Points;
  private starsMat: THREE.PointsMaterial;
  private skyGroup = new THREE.Group(); // domo + estrellas: siguen al jugador
  private godRays: THREE.Group;
  private wind: THREE.Points;
  private windPositions: THREE.BufferAttribute;
  /** Vector de viento por capa (índice 0..4), dirección fija vía RNG sembrado. */
  readonly windVectors: THREE.Vector3[] = [];
  private locks = new Map<number, { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; open: boolean }>();
  private tmpA = new THREE.Color();
  private tmpB = new THREE.Color();

  readonly current: SkyState = {
    zenith: new THREE.Color(SKY_KEYFRAMES[0].zenith),
    horizon: new THREE.Color(SKY_KEYFRAMES[0].horizon),
    fogDensity: SKY_KEYFRAMES[0].fogDensity,
    ambient: SKY_KEYFRAMES[0].ambient,
    sun: SKY_KEYFRAMES[0].sun,
    sunColor: new THREE.Color(SKY_KEYFRAMES[0].sunColor),
  };

  constructor(private scene: THREE.Scene) {
    const rng = makeRng(WORLD.seed);

    // Viento por capa: dirección horizontal fija, magnitud PHYSICS.windSpeed.
    for (let i = 0; i < 5; i++) {
      const a = rng() * Math.PI * 2;
      this.windVectors.push(
        new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(PHYSICS.windSpeed),
      );
    }

    // Fog: mismo color que el horizonte del domo (§16). NO scene.background.
    scene.fog = new THREE.FogExp2(SKY_KEYFRAMES[0].horizon, SKY_KEYFRAMES[0].fogDensity);

    this.ambient = new THREE.AmbientLight(0xfff4e0, SKY_KEYFRAMES[0].ambient);
    scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(SKY_KEYFRAMES[0].sunColor, SKY_KEYFRAMES[0].sun);
    scene.add(this.sun);
    scene.add(this.sun.target);

    // Domo de cielo: gradiente vertical de 2 paradas + banda de atmósfera (capa 5).
    this.domeUniforms = {
      zenithColor: { value: new THREE.Color(SKY_KEYFRAMES[0].zenith) },
      horizonColor: { value: new THREE.Color(SKY_KEYFRAMES[0].horizon) },
      bandStrength: { value: 0 },
    };
    const domeMat = new THREE.ShaderMaterial({
      uniforms: this.domeUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false, // el domo NO recibe fog (§16)
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 zenithColor;
        uniform vec3 horizonColor;
        uniform float bandStrength;
        varying vec3 vDir;
        void main() {
          float h = normalize(vDir).y;
          vec3 col = mix(horizonColor, zenithColor, smoothstep(0.0, 0.55, h));
          // Banda azul de atmósfera en el horizonte (curvatura, solo muy arriba).
          float band = bandStrength * exp(-pow((h - 0.02) * 22.0, 2.0));
          col += vec3(0.30, 0.50, 1.00) * band;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 24), domeMat);
    this.dome.renderOrder = -2;
    this.skyGroup.add(this.dome);

    // Estrellas: puntos en el casquete del domo; opacidad 0 hasta Y=450 → 1 en 750.
    const starPos = new Float32Array(1200 * 3);
    for (let i = 0; i < 1200; i++) {
      // Distribución uniforme en esfera, sesgada al hemisferio superior.
      const u = rng() * 2 - 1;
      const a = rng() * Math.PI * 2;
      const yy = Math.abs(u) * 0.94 + 0.05;
      const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
      starPos[i * 3] = Math.cos(a) * rr * 760;
      starPos[i * 3 + 1] = yy * 760;
      starPos[i * 3 + 2] = Math.sin(a) * rr * 760;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    this.starsMat = new THREE.PointsMaterial({
      color: 0xeef4ff,
      size: 2.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    this.stars = new THREE.Points(starGeo, this.starsMat);
    this.stars.renderOrder = -1;
    this.skyGroup.add(this.stars);
    scene.add(this.skyGroup);

    // Sol: sprite de glow aditivo en la dirección de la luz.
    this.sunSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        color: SKY_KEYFRAMES[0].sunColor,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        fog: false,
      }),
    );
    this.sunSprite.scale.set(220, 220, 1);
    this.sunSprite.renderOrder = 0;
    scene.add(this.sunSprite);

    // God rays SOLO en capa 1: haces de amanecer (planos aditivos rotados).
    this.godRays = this.buildGodRays(rng);
    scene.add(this.godRays);

    const { points, attr } = this.buildWind(rng);
    this.wind = points;
    this.windPositions = attr;
    scene.add(this.wind);

    this.buildLocks();
  }

  // Esclusas de viento (§5.1): disco de nubes turbulentas en cada frontera de capa.
  // F3: visibles pero NO bloqueantes (el clamp llega en F7 vía player.altitudeLimit).
  private buildLocks(): void {
    const tex = makeTurbulenceTexture();
    for (const boundary of [1, 2, 3, 4]) {
      const y = 150 * boundary;
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: 0xdcecff,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(120, 40), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = y;
      this.scene.add(mesh);
      this.locks.set(boundary, { mesh, mat, open: false });
    }
  }

  /** Abre/cierra la esclusa de la frontera dada (1..4). Abierta = se disuelve. */
  setLockOpen(boundary: number, open: boolean): void {
    const lock = this.locks.get(boundary);
    if (lock) lock.open = open;
  }

  private buildGodRays(rng: () => number): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({
      color: 0xffe0b0,
      transparent: true,
      opacity: 0.10,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    for (let i = 0; i < 8; i++) {
      const width = 4 + rng() * 6;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, 140), material);
      const angle = (i / 8) * Math.PI * 2 + rng() * 0.5;
      const radius = 25 + rng() * 55;
      plane.position.set(Math.cos(angle) * radius, 60, Math.sin(angle) * radius);
      plane.rotation.y = rng() * Math.PI;
      plane.rotation.z = 0.35 + (rng() - 0.5) * 0.15; // rasantes de amanecer
      group.add(plane);
    }
    return group;
  }

  private buildWind(rng: () => number): { points: THREE.Points; attr: THREE.BufferAttribute } {
    const positions = new Float32Array(WIND_COUNT * 3);
    for (let i = 0; i < WIND_COUNT; i++) {
      positions[i * 3] = (rng() - 0.5) * WIND_BOX;
      positions[i * 3 + 1] = (rng() - 0.5) * WIND_BOX;
      positions[i * 3 + 2] = (rng() - 0.5) * WIND_BOX;
    }
    const geometry = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positions, 3);
    geometry.setAttribute("position", attr);
    const material = new THREE.PointsMaterial({
      color: 0xf0f6ff,
      size: 0.18,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    return { points: new THREE.Points(geometry, material), attr };
  }

  /** Vector de viento de la capa en la que está la Y dada. */
  windAt(y: number): THREE.Vector3 {
    return this.windVectors[layerAtY(y).num - 1];
  }

  // Interpola los keyframes §5.1 y aplica a domo, fog, luces y estrellas.
  applyAltitude(y: number): SkyState {
    const kfs = SKY_KEYFRAMES;
    const clamped = Math.max(kfs[0].y, Math.min(kfs[kfs.length - 1].y, y));
    let a = kfs[0];
    let b = kfs[kfs.length - 1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (clamped >= kfs[i].y && clamped <= kfs[i + 1].y) {
        a = kfs[i];
        b = kfs[i + 1];
        break;
      }
    }
    const t = a.y === b.y ? 0 : (clamped - a.y) / (b.y - a.y);

    this.tmpA.setHex(a.zenith);
    this.tmpB.setHex(b.zenith);
    this.current.zenith.lerpColors(this.tmpA, this.tmpB, t);
    this.tmpA.setHex(a.horizon);
    this.tmpB.setHex(b.horizon);
    this.current.horizon.lerpColors(this.tmpA, this.tmpB, t);
    this.tmpA.setHex(a.sunColor);
    this.tmpB.setHex(b.sunColor);
    this.current.sunColor.lerpColors(this.tmpA, this.tmpB, t);
    this.current.fogDensity = a.fogDensity + (b.fogDensity - a.fogDensity) * t;
    this.current.ambient = a.ambient + (b.ambient - a.ambient) * t;
    this.current.sun = a.sun + (b.sun - a.sun) * t;

    this.domeUniforms.zenithColor.value.copy(this.current.zenith);
    this.domeUniforms.horizonColor.value.copy(this.current.horizon);
    // Banda de atmósfera y estrellas: aparecen de Y=450 a Y=750.
    const high = THREE.MathUtils.clamp((y - 450) / 300, 0, 1);
    this.domeUniforms.bandStrength.value = high * 0.5;
    this.starsMat.opacity = high;

    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.copy(this.current.horizon);
    fog.density = this.current.fogDensity;
    this.ambient.intensity = this.current.ambient;
    this.sun.intensity = this.current.sun;
    this.sun.color.copy(this.current.sunColor);
    (this.sunSprite.material as THREE.SpriteMaterial).color.copy(this.current.sunColor);

    // God rays solo abajo: mueren hacia Y≈130.
    this.godRays.visible = y < 140;

    return this.current;
  }

  update(dt: number, playerPos: THREE.Vector3, elapsed: number): void {
    // El cielo (domo + estrellas) sigue al jugador: es el fondo infinito.
    this.skyGroup.position.copy(playerPos);
    this.stars.rotation.y = elapsed * 0.004;

    // Sol: elevación sube con la altitud (amanecer rasante → alto y duro §5.1).
    const elev = THREE.MathUtils.lerp(0.16, 1.05, THREE.MathUtils.clamp(playerPos.y / WORLD.topY, 0, 1));
    const az = 0.9; // acimut fijo del mundo
    const dir = new THREE.Vector3(
      Math.cos(elev) * Math.sin(az),
      Math.sin(elev),
      Math.cos(elev) * Math.cos(az),
    );
    this.sun.position.copy(playerPos).addScaledVector(dir, 120);
    this.sun.target.position.copy(playerPos);
    this.sunSprite.position.copy(playerPos).addScaledVector(dir, 680);

    // Rotación lentísima de los god rays.
    this.godRays.rotation.y = elapsed * 0.012;

    // Esclusas: shimmer + rotación; al abrirse se disuelven en jirones.
    for (const lock of this.locks.values()) {
      lock.mesh.rotation.z = elapsed * 0.01;
      const target = lock.open ? 0 : 0.26 + Math.sin(elapsed * 1.1 + lock.mesh.position.y) * 0.07;
      lock.mat.opacity += (target - lock.mat.opacity) * Math.min(1, 2.5 * dt);
      lock.mesh.visible = lock.mat.opacity > 0.01;
    }

    // Partículas de viento: derivan con el viento de la capa y se reciclan en un
    // cubo alrededor del jugador (patrón "nieve marina" de Batisfera).
    const windVec = this.windAt(playerPos.y);
    const arr = this.windPositions.array as Float32Array;
    const half = WIND_BOX / 2;
    for (let i = 0; i < WIND_COUNT; i++) {
      const ix = i * 3;
      arr[ix] += windVec.x * 3.2 * dt;
      arr[ix + 2] += windVec.z * 3.2 * dt;
      for (let axis = 0; axis < 3; axis++) {
        const center = axis === 0 ? playerPos.x : axis === 1 ? playerPos.y : playerPos.z;
        let v = arr[ix + axis];
        if (v < center - half) v += WIND_BOX;
        else if (v > center + half) v -= WIND_BOX;
        arr[ix + axis] = v;
      }
    }
    this.windPositions.needsUpdate = true;
  }
}

// Textura radial de glow (sol) — canvas compartido.
function makeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,244,214,0.8)");
  grad.addColorStop(0.6, "rgba(255,230,180,0.25)");
  grad.addColorStop(1, "rgba(255,230,180,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

// Textura de nubes turbulentas para las esclusas (ruido radial suave).
function makeTurbulenceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const rng = makeRng(WORLD.seed ^ 0x5eed);
  for (let i = 0; i < 260; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 120;
    const x = 128 + Math.cos(a) * r;
    const y = 128 + Math.sin(a) * r;
    const size = 6 + rng() * 22;
    const alpha = 0.05 + rng() * 0.12 * (1 - r / 130);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }
  return new THREE.CanvasTexture(canvas);
}
