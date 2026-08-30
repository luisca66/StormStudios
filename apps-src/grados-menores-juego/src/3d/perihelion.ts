// perihelion.ts — La maravilla del juego (PLAN §12). Es la recompensa por 20 decisiones
// y la resolución tonal hecha astro: la estrella natal, su planeta con el observatorio
// del que partiste, el rosetón de las 12 clases y la espiral de 15 anillos que sube
// melódica y baja natural.
//
// Todo procedural, texturas solo de canvas. Se planta en un PUNTO FIJO de la ruta y a
// partir de ahí solo crece porque el cometa se acerca, que es lo que se espera de un
// astro (misma lección que la Terminal del Expreso).

import * as THREE from "three";
import { newTrackFrame, type TrackFrame, type TrackManager } from "./track";

/** Hasta dónde se adentra el cometa tras el último anillo, ya en órbita. */
export const ORBIT_DEPTH = 120;

/** Granulación del sol: manchas claras y oscuras que hierven lentamente. */
function starSurfaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#ffb457";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    const r = 2 + Math.random() * 9;
    const warm = Math.random();
    g.fillStyle = warm > 0.5
      ? `rgba(255,238,190,${0.05 + Math.random() * 0.22})`
      : `rgba(198,96,30,${0.05 + Math.random() * 0.20})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * El planeta natal visto de NOCHE: mar oscuro, continentes apenas insinuados y las
 * lucecitas de las ciudades. Es la cara que mira a quien vuelve.
 */
function planetNightTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#0a1626";
  g.fillRect(0, 0, 512, 256);
  // Continentes: manchas apenas más claras que el mar.
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 512, y = 40 + Math.random() * 176;
    const r = 18 + Math.random() * 55;
    g.fillStyle = `rgba(26,42,58,${0.5 + Math.random() * 0.4})`;
    g.beginPath();
    g.ellipse(x, y, r, r * (0.5 + Math.random() * 0.6), Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  // Ciudades: racimos de puntos cálidos, no repartidos al azar por todo el globo.
  for (let c = 0; c < 22; c++) {
    const cx = Math.random() * 512, cy = 50 + Math.random() * 156;
    const n = 6 + Math.floor(Math.random() * 22);
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgba(255,214,140,${0.35 + Math.random() * 0.6})`;
      g.beginPath();
      g.arc(cx + (Math.random() - 0.5) * 34, cy + (Math.random() - 0.5) * 26, 0.8 + Math.random() * 1.2, 0, Math.PI * 2);
      g.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const BRASS = new THREE.MeshStandardMaterial({
  color: "#c9a227", roughness: 0.35, metalness: 0.85,
  emissive: new THREE.Color("#3a2c08"), emissiveIntensity: 0.6,
});
const BRASS_LIT = new THREE.MeshStandardMaterial({
  color: "#f0d98a", roughness: 0.3, metalness: 0.8,
  emissive: new THREE.Color("#c9a227"), emissiveIntensity: 2.2,
});
const RING_GEO = new THREE.TorusGeometry(8.5, 0.26, 8, 44);
const MEDALLION_GEO = new THREE.CylinderGeometry(0.9, 0.9, 0.16, 14);

function glowTexture(inner: string, outer: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.45, outer);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

interface Meteor {
  sprite: THREE.Sprite;
  vx: number; vy: number; vz: number;
  life: number;
}

export class Perihelion {
  private group: THREE.Group | null = null;
  private starMap: THREE.CanvasTexture | null = null;
  private planet: THREE.Mesh | null = null;
  private observatoryBeam: THREE.Mesh | null = null;
  private auroras: THREE.Mesh | null = null;
  private rings: THREE.Group[] = [];
  private meteors: Meteor[] = [];
  private meteorGroup: THREE.Group | null = null;

  private readonly frame: TrackFrame = newTrackFrame();
  private readonly basis = new THREE.Matrix4();
  private built = false;
  private starDist = 0;
  private elapsed = 0;
  private gala = false;
  private meteorRate = 0;

  constructor(private readonly scene: THREE.Scene, private readonly track: TrackManager) {}

  isBuilt(): boolean {
    return this.built;
  }

  /** Distancia de la ruta donde vive el astro: los anillos se colocan hacia atrás. */
  starDistance(): number {
    return this.starDist;
  }

  /**
   * Planta el astro en un punto fijo de la ruta.
   * @param litClasses índices 0–11 de las clases de altura del viaje: encienden su
   *   medallón en el rosetón. Cada tonalidad tiene el suyo (§12).
   */
  build(distance: number, litClasses: ReadonlySet<number>): void {
    this.clear();
    this.starDist = distance;
    const group = new THREE.Group();
    this.track.frameAt(distance, this.frame);
    const centre = this.frame.pos.clone();

    // --- La estrella natal: cálida, no agresiva. Es CASA.
    this.starMap = starSurfaceTexture();
    const star = new THREE.Mesh(
      new THREE.SphereGeometry(46, 40, 28),
      new THREE.MeshBasicMaterial({ map: this.starMap, fog: false }),
    );
    // POR DELANTE del punto de parada, no detrás: el cometa se ACERCA a casa y entra en
    // órbita a su lado. Con el signo invertido volaba directo hacia dentro del sol.
    star.position.copy(centre).addScaledVector(this.frame.tan, 250).addScaledVector(this.frame.up, 62);
    group.add(star);

    // Corona: dos halos de sprite, uno apretado y otro enorme y tenue.
    for (const [scale, colors] of [
      [150, ["rgba(255,244,214,0.85)", "rgba(255,190,110,0.30)"]],
      [420, ["rgba(255,206,140,0.30)", "rgba(255,150,70,0.10)"]],
    ] as Array<[number, [string, string]]>) {
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture(colors[0], colors[1]), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false,
      }));
      halo.scale.set(scale, scale, 1);
      halo.position.copy(star.position);
      group.add(halo);
    }

    // --- El planeta natal, en primer término orbital y de noche.
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(30, 36, 24),
      new THREE.MeshStandardMaterial({
        map: planetNightTexture(), roughness: 1, metalness: 0,
        emissive: new THREE.Color("#0a1626"), emissiveIntensity: 0.9,
      }),
    );
    // Bien apartado del eje: el cometa pasa A SU LADO y lo ve girar, no lo atraviesa.
    planet.position.copy(centre).addScaledVector(this.frame.tan, 40)
      .addScaledVector(this.frame.right, 96).addScaledVector(this.frame.up, -26);
    group.add(planet);
    this.planet = planet;

    // El observatorio en su montaña, con la cúpula abierta: el lugar EXACTO del menú,
    // visto desde el cielo. Cierra el círculo sin una palabra (§12).
    const mount = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 3.2, 7),
      new THREE.MeshStandardMaterial({ color: "#243447", roughness: 1, flatShading: true }),
    );
    const surface = planet.position.clone().addScaledVector(this.frame.up, 30);
    mount.position.copy(surface);
    group.add(mount);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      BRASS_LIT,
    );
    dome.position.copy(surface).addScaledVector(this.frame.up, 1.7);
    group.add(dome);

    // El haz vertical del observatorio: solo en la gala, saludando al que vuelve.
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 1.6, 46, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffe6a8, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      }),
    );
    beam.position.copy(surface).addScaledVector(this.frame.up, 23);
    group.add(beam);
    this.observatoryBeam = beam;

    // --- Auroras en el limbo nocturno del planeta (cintas shader, patrón Aerostato).
    const auroras = new THREE.Mesh(
      new THREE.CylinderGeometry(33, 33, 22, 48, 1, true),
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide, transparent: true, depthWrite: false, fog: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 } },
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
            // El "ruido" son senos desfasados: barato y suficiente para una cortina.
            float w = sin(vUv.x * 26.0 + uTime * 0.7) * 0.5
                    + sin(vUv.x * 11.0 - uTime * 0.4) * 0.5;
            float band = smoothstep(0.35, 0.95, w * 0.5 + 0.5);
            // Se apaga arriba y abajo para que no se vea el borde del cilindro.
            float fade = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.65, 1.0, vUv.y));
            vec3 tint = mix(vec3(0.35, 0.95, 0.72), vec3(0.55, 0.45, 1.0), vUv.y);
            gl_FragColor = vec4(tint, band * fade * uIntensity);
          }
        `,
      }),
    );
    auroras.position.copy(planet.position);
    group.add(auroras);
    this.auroras = auroras;

    // --- El rosetón celeste: 12 medallones de latón, uno por clase de altura. Los del
    // viaje van encendidos, así que cada tonalidad tiene su rosetón (§12).
    const rose = new THREE.Group();
    // Centrado en la ruta: se cruza por dentro, como un pórtico de medallones.
    rose.position.copy(centre).addScaledVector(this.frame.tan, 55);
    this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
    rose.quaternion.setFromRotationMatrix(this.basis);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const medallion = new THREE.Mesh(MEDALLION_GEO, litClasses.has(i) ? BRASS_LIT : BRASS);
      medallion.position.set(Math.cos(a) * 15, Math.sin(a) * 15, 0);
      medallion.rotation.x = Math.PI / 2;
      rose.add(medallion);
    }
    group.add(rose);

    // --- Lluvia de meteoros: se enciende al cruzar el último anillo.
    const meteorGroup = new THREE.Group();
    const meteorMap = glowTexture("rgba(255,255,240,0.95)", "rgba(255,210,150,0.35)");
    for (let i = 0; i < 60; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: meteorMap, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false,
      }));
      sprite.visible = false;
      meteorGroup.add(sprite);
      this.meteors.push({ sprite, vx: 0, vy: 0, vz: 0, life: 0 });
    }
    group.add(meteorGroup);
    this.meteorGroup = meteorGroup;

    this.scene.add(group);
    this.group = group;
    this.built = true;
  }

  /**
   * Los 15 anillos de la espiral de entrada. Las distancias las calcula el renderer
   * integrando el perfil de velocidad, para que cada uno se cruce EXACTAMENTE a un
   * pulso del anterior: el ritardando es del cometa, pero la escala no se descuadra.
   */
  buildRings(distances: number[]): void {
    if (!this.group) return;
    for (let i = 0; i < distances.length; i++) {
      this.track.frameAt(distances[i], this.frame);
      const ring = new THREE.Group();
      this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
      ring.quaternion.setFromRotationMatrix(this.basis);
      // La espiral: cada anillo gira un poco más alrededor del eje de la ruta, así que
      // cruzarlos todos se siente como enroscarse hacia la órbita (§12).
      const turn = (i / (distances.length - 1)) * Math.PI * 1.6;
      ring.position.copy(this.frame.pos)
        .addScaledVector(this.frame.right, Math.sin(turn) * 5.5)
        .addScaledVector(this.frame.up, (1 - Math.cos(turn)) * 3.2);
      const torus = new THREE.Mesh(RING_GEO, BRASS);
      ring.add(torus);
      this.group.add(ring);
      this.rings.push(ring);
    }
  }

  /** Se cruza el anillo `index`: su latón se enciende. */
  lightRing(index: number): void {
    const ring = this.rings[index];
    if (!ring) return;
    for (const child of ring.children) {
      if (child instanceof THREE.Mesh) child.material = BRASS_LIT;
    }
  }

  /** Llegada de gala (§7.6): el observatorio saluda y el cielo se llena. */
  startGala(): void {
    this.gala = true;
  }

  /** Al cruzar el último anillo: auroras y lluvia de meteoros. */
  celebrate(): void {
    this.meteorRate = this.gala ? 16 : 6;
  }

  update(dt: number, cometPosition: THREE.Vector3): void {
    if (!this.built) return;
    this.elapsed += dt;

    // La estrella hierve: la textura se desplaza muy despacio.
    if (this.starMap) {
      this.starMap.offset.x = this.elapsed * 0.004;
      this.starMap.offset.y = Math.sin(this.elapsed * 0.11) * 0.012;
    }
    if (this.planet) this.planet.rotation.y += dt * 0.02;

    if (this.auroras) {
      const material = this.auroras.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = this.elapsed;
      const target = this.meteorRate > 0 ? (this.gala ? 1 : 0.7) : 0;
      material.uniforms.uIntensity.value +=
        (target - material.uniforms.uIntensity.value) * Math.min(1, dt * 0.8);
    }

    if (this.observatoryBeam) {
      const material = this.observatoryBeam.material as THREE.MeshBasicMaterial;
      const target = this.gala && this.meteorRate > 0 ? 0.32 : 0;
      material.opacity += (target - material.opacity) * Math.min(1, dt * 1.2);
    }

    this.updateMeteors(dt, cometPosition);
  }

  private updateMeteors(dt: number, cometPosition: THREE.Vector3): void {
    if (!this.meteorGroup) return;
    for (const m of this.meteors) {
      if (!m.sprite.visible) continue;
      m.life -= dt;
      if (m.life <= 0) { m.sprite.visible = false; continue; }
      m.sprite.position.x += m.vx * dt;
      m.sprite.position.y += m.vy * dt;
      m.sprite.position.z += m.vz * dt;
      // Se estiran al viajar: una bola redonda no parece un meteoro.
      m.sprite.scale.set(1.6, 5.5, 1);
      m.sprite.material.opacity = Math.min(1, m.life * 1.4);
    }
    if (this.meteorRate <= 0) return;
    if (Math.random() > this.meteorRate * dt) return;
    const free = this.meteors.find((m) => !m.sprite.visible);
    if (!free) return;
    free.sprite.position.copy(cometPosition)
      .add(new THREE.Vector3((Math.random() - 0.5) * 190, 40 + Math.random() * 60, -60 - Math.random() * 160));
    free.vx = (Math.random() - 0.5) * 26;
    free.vy = -34 - Math.random() * 30;
    free.vz = (Math.random() - 0.5) * 26;
    free.life = 1.1 + Math.random() * 0.9;
    free.sprite.visible = true;
  }

  clear(): void {
    if (this.group) {
      this.scene.remove(this.group);
      const geometries = new Set<THREE.BufferGeometry>();
      this.group.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) geometries.add(o.geometry);
      });
      // Las geometrías compartidas del módulo (anillos, medallones) NO se liberan.
      for (const geometry of geometries) {
        if (geometry !== RING_GEO && geometry !== MEDALLION_GEO) geometry.dispose();
      }
    }
    this.starMap?.dispose();
    this.group = null;
    this.starMap = null;
    this.planet = null;
    this.observatoryBeam = null;
    this.auroras = null;
    this.rings = [];
    this.meteors = [];
    this.meteorGroup = null;
    this.built = false;
    this.gala = false;
    this.meteorRate = 0;
    this.elapsed = 0;
  }
}
