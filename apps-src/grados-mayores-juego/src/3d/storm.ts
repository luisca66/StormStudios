// storm.ts — Tormenta eléctrica del apartadero.
//
// Acompaña al castigo del desvío: lluvia inclinada, fogonazo de cielo y un rayo
// dibujado. Los relámpagos NO se disparan solos — se los manda `StormSound` cuando el
// audio cruza uno de sus truenos, así que imagen y sonido caen juntos por construcción.
//
// La intensidad la manda el gris del apartadero (`Detour.greyAmount()`): la tormenta
// entra de golpe con el desvío y se va con el color, en los mismos 2 s.

import * as THREE from "three";

const RAIN_COUNT = 1400;
const RAIN_RADIUS = 46;      // burbuja alrededor del tren
const RAIN_TOP = 34;
const RAIN_FALL = 58;        // u/s: la lluvia de tormenta cae rápido
const RAIN_SLANT = 14;       // arrastre lateral, para que no caiga a plomo

/**
 * PointsMaterial dibuja SPRITES CUADRADOS, así que una textura alta y estrecha se
 * deforma. La raya se pinta fina dentro de un lienzo cuadrado y el sprite se mantiene
 * pequeño: con `size` grande las gotas cercanas salían como manchones de nieve.
 */
function rainTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const g = canvas.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 32);
  grad.addColorStop(0, "rgba(200,220,240,0)");
  grad.addColorStop(0.35, "rgba(215,232,248,.9)");
  grad.addColorStop(0.75, "rgba(215,232,248,.9)");
  grad.addColorStop(1, "rgba(200,220,240,0)");
  g.fillStyle = grad;
  g.fillRect(15, 1, 2, 30);
  return new THREE.CanvasTexture(canvas);
}

/** Rayo quebrado: baja del cielo desviándose a cada tramo. */
function boltPoints(rng: () => number, forwardAngle: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  // Sesgado al frente (±75°): con azimut libre el rayo caía a la espalda y no se veía.
  const azimuth = forwardAngle + (rng() - 0.5) * 2.6;
  const dist = 150 + rng() * 110;
  let x = Math.cos(azimuth) * dist;
  let z = Math.sin(azimuth) * dist;
  // Altura acotada al campo del parabrisas: a 210 u el rayo nacía POR ENCIMA de la
  // ventana y no se veía nunca desde la cabina.
  const top = 74 + rng() * 34;
  let y = top;
  const steps = 9 + Math.floor(rng() * 5);
  for (let i = 0; i <= steps; i++) {
    points.push(new THREE.Vector3(x, y, z));
    y -= (top / steps) * (0.75 + rng() * 0.5);
    x += (rng() - 0.5) * 16;
    z += (rng() - 0.5) * 16;
  }
  return points;
}

export class Storm {
  private readonly rain: THREE.Points;
  private readonly rainMaterial: THREE.PointsMaterial;
  private readonly flashLight = new THREE.AmbientLight("#cfe0ff", 0);
  private readonly bolt: THREE.Mesh;
  private readonly boltMaterial: THREE.MeshBasicMaterial;

  private intensity = 0;   // 0–1, la manda el apartadero
  private flash = 0;       // envolvente del fogonazo actual
  private flashPeak = 0;
  private elapsed = 0;
  private rng: () => number = Math.random;

  constructor(private readonly scene: THREE.Scene) {
    const positions = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * RAIN_RADIUS * 2;
      positions[i * 3 + 1] = Math.random() * RAIN_TOP;
      positions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_RADIUS * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.rainMaterial = new THREE.PointsMaterial({
      map: rainTexture(), color: "#c6d8ec", size: 0.5, transparent: true,
      opacity: 0, depthWrite: false, sizeAttenuation: true,
    });
    this.rain = new THREE.Points(geometry, this.rainMaterial);
    this.rain.frustumCulled = false;
    this.rain.visible = false;

    // Tubo y no `Line`: en WebGL el grosor de línea SIEMPRE es 1 px, así que el rayo
    // era invisible a 200 u de distancia.
    this.boltMaterial = new THREE.MeshBasicMaterial({
      color: "#eaf2ff", transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    this.bolt = new THREE.Mesh(new THREE.BufferGeometry(), this.boltMaterial);
    this.bolt.frustumCulled = false;
    this.bolt.visible = false;

    this.scene.add(this.rain, this.flashLight, this.bolt);
  }

  /** 0 = despejado, 1 = tormenta encima. */
  setIntensity(value: number): void {
    this.intensity = THREE.MathUtils.clamp(value, 0, 1);
  }

  /** Lo llama el renderer cuando el AUDIO cruza un trueno. `strength` 0–1. */
  strike(strength: number, near: THREE.Vector3, forward: THREE.Vector3): void {
    if (this.intensity <= 0.05) return;
    this.flashPeak = 0.35 + strength * 0.65;
    this.flash = 1;
    // Rayo nuevo en cada trueno, colocado alrededor del tren.
    const forwardAngle = Math.atan2(forward.x, forward.z);
    const points = boltPoints(this.rng, forwardAngle).map((p) => p.add(near));
    // Tensión 0 mantiene el quiebro del rayo; una Catmull-Rom normal lo redondearía.
    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0);
    this.bolt.geometry.dispose();
    this.bolt.geometry = new THREE.TubeGeometry(curve, points.length * 2, 1.7, 5, false);
    this.bolt.visible = true;
  }

  update(dt: number, trainPosition: THREE.Vector3): void {
    this.elapsed += dt;
    const on = this.intensity > 0.02;
    this.rain.visible = on;
    if (!on) {
      this.flashLight.intensity = 0;
      this.bolt.visible = false;
      return;
    }

    // --- Lluvia: cae y se recicla dentro de la burbuja que sigue al tren ---
    this.rain.position.copy(trainPosition);
    const positions = this.rain.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      let y = positions.getY(i) - RAIN_FALL * dt;
      let x = positions.getX(i) + RAIN_SLANT * dt;
      if (y < -6) {
        y += RAIN_TOP + 6;
        x = (this.rng() - 0.5) * RAIN_RADIUS * 2;
        positions.setZ(i, (this.rng() - 0.5) * RAIN_RADIUS * 2);
      }
      if (x > RAIN_RADIUS) x -= RAIN_RADIUS * 2;
      positions.setY(i, y);
      positions.setX(i, x);
    }
    positions.needsUpdate = true;
    this.rainMaterial.opacity = 0.8 * this.intensity;

    // --- Fogonazo: caída rápida con un rebrote, que es como parpadea un rayo ---
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 2.6);
      const flicker = this.flash > 0.62 ? 1 : 0.45 + 0.55 * Math.abs(Math.sin(this.flash * 26));
      const level = this.flash * this.flash * this.flashPeak * flicker * this.intensity;
      // 5.5 quemaba la cabina entera a blanco; 2.4 ilumina sin borrar el dibujo.
      this.flashLight.intensity = level * 2.4;
      this.boltMaterial.opacity = Math.min(1, level * 2.4);
      this.bolt.visible = this.boltMaterial.opacity > 0.02;
    } else {
      this.flashLight.intensity = 0;
      this.bolt.visible = false;
    }
  }

  dispose(): void {
    this.scene.remove(this.rain, this.flashLight, this.bolt);
    this.rain.geometry.dispose();
    this.rainMaterial.map?.dispose();
    this.rainMaterial.dispose();
    this.bolt.geometry.dispose();
    this.boltMaterial.dispose();
    this.intensity = 0;
    this.flash = 0;
  }
}
