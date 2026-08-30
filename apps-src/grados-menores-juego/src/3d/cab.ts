// cab.ts — La carlinga (PLAN §6), versión F2: marco de ventana de latón engastado en
// hielo, la proa del cometa por delante, portillas laterales y la ESTELA propia.
// Los instrumentos (orrery, sextante, llave del radiofaro) llegan en F5.
//
// Todo cuelga del `cabAnchor` del cometa, no de la cámara: la carlinga es del vehículo,
// así que la mirada se pasea por ella en vez de arrastrarla. Texturas SOLO de canvas.

import * as THREE from "three";
import { TRAIL_SPRITE_MAX } from "@/config";

const BRASS = "#c9a227";

/** Veta de hielo: ruido de líneas claras sobre azul, para el engaste del marco. */
function iceTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#20415a";
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(190,233,245,${0.05 + Math.random() * 0.22})`;
    g.lineWidth = Math.random() * 1.6;
    g.beginPath();
    const x = Math.random() * 128, y = Math.random() * 128;
    g.moveTo(x, y);
    g.lineTo(x + (Math.random() - 0.5) * 46, y + (Math.random() - 0.5) * 46);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Mota de hielo con halo suave: la partícula de la estela. */
function moteTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(232,246,252,0.95)");
  grad.addColorStop(0.4, "rgba(159,216,232,0.45)");
  grad.addColorStop(1, "rgba(159,216,232,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

interface Mote {
  alive: boolean;
  life: number;
  maxLife: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
}

export interface CabReadings {
  /** 0–1 respecto a la velocidad máxima posible: mueve la aguja del empuje de cola. */
  speed: number;
  /** 0–1: cuánto queda del slingshot; la estela se enciende con él. */
  slingshot: number;
  /** 0–1: la llave del radiofaro baja al usarlo y vuelve sola. */
  beaconPull?: number;
}

export class Cab {
  private readonly group = new THREE.Group();
  private readonly motes: Mote[] = [];
  private readonly trailPositions: Float32Array;
  private readonly trailColors: Float32Array;
  private readonly trailGeo = new THREE.BufferGeometry();
  private spawnAccumulator = 0;

  // Instrumentos vivos del tablero (§6).
  private readonly orreryArms: Array<{ arm: THREE.Group; speed: number }> = [];
  private needle: THREE.Mesh | null = null;
  private needlePivot: THREE.Group | null = null;
  private beaconLever: THREE.Mesh | null = null;
  private elapsed = 0;

  constructor(anchor: THREE.Object3D) {
    const ice = iceTexture();

    // --- Proa de hielo: el cuerpo del cometa que va por delante (análogo de la caldera).
    // Escala calibrada mirando por la ventana: tiene que ASOMAR por el borde inferior,
    // no comerse el encuadre — el juego ocurre al frente, no en la proa.
    const noseGeo = new THREE.ConeGeometry(0.95, 5.4, 7);
    const noseMat = new THREE.MeshStandardMaterial({
      map: ice, color: "#6fa8c4", roughness: 0.35, metalness: 0.05,
      emissive: new THREE.Color("#12303f"), emissiveIntensity: 0.6,
      flatShading: true,
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = -Math.PI / 2; // la punta mira hacia −Z (adelante)
    nose.position.set(0, -2.3, -6.2);
    this.group.add(nose);

    // Bloques de hielo irregulares alrededor de la proa: el núcleo no es liso.
    const shardGeo = new THREE.DodecahedronGeometry(0.42, 0);
    for (let i = 0; i < 7; i++) {
      const shard = new THREE.Mesh(shardGeo, noseMat);
      const a = (i / 7) * Math.PI * 2;
      shard.position.set(Math.cos(a) * 0.9, -2.3 + Math.sin(a) * 0.4, -4.1 - (i % 3) * 0.8);
      shard.rotation.set(a, a * 1.7, a * 0.5);
      shard.scale.setScalar(0.7 + (i % 3) * 0.25);
      this.group.add(shard);
    }

    // --- Marco de la ventana frontal: montantes de latón engastados en hielo.
    const brassMat = new THREE.MeshStandardMaterial({
      color: BRASS, roughness: 0.35, metalness: 0.85,
      emissive: new THREE.Color(BRASS), emissiveIntensity: 0.12,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      map: ice, color: "#4a7d96", roughness: 0.55, metalness: 0.2,
    });

    const bar = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      this.group.add(m);
      return m;
    };

    // Dintel, alféizar y jambas. Las jambas se meten hacia dentro para que se VEAN por
    // los bordes: a 1.8 u de la cámara con FOV 60 solo entran ~2.8 u de ancho.
    bar(3.4, 0.3, 0.3, 0, 1.28, -1.5, frameMat);
    bar(3.4, 0.46, 0.42, 0, -0.98, -1.5, frameMat);
    bar(0.3, 2.4, 0.3, -1.55, 0.15, -1.5, frameMat);
    bar(0.3, 2.4, 0.3, 1.55, 0.15, -1.5, frameMat);
    // Sin montante central: un poste en mitad del encuadre parte el juego en dos. El
    // carácter de época lo dan el alféizar remachado y las jambas.
    // Remaches del alféizar.
    const rivetGeo = new THREE.SphereGeometry(0.05, 6, 5);
    for (let i = -3; i <= 3; i++) {
      const r = new THREE.Mesh(rivetGeo, brassMat);
      r.position.set(i * 0.44, -0.8, -1.32);
      this.group.add(r);
    }
    // Filo de latón del alféizar: da un remate cálido al borde inferior de la vista.
    bar(3.4, 0.07, 0.1, 0, -0.74, -1.36, brassMat);

    // --- Portillas laterales de bronce: venden la periferia y la velocidad al girar
    // la vista (yaw ±100°), así que viven fuera del encuadre de reposo.
    const ringGeo = new THREE.TorusGeometry(0.62, 0.075, 8, 20);
    for (const side of [-1, 1]) {
      const ring = new THREE.Mesh(ringGeo, brassMat);
      ring.position.set(side * 2.3, 0.15, -0.2);
      ring.rotation.y = side * Math.PI * 0.42;
      this.group.add(ring);
    }

    // --- Estela propia: motas de hielo que salen hacia atrás desde la proa (§5.6).
    // Van en UN solo THREE.Points (1 draw call) en vez de un sprite por mota: con
    // sprites, además, el material se comparte y la opacidad de uno sería la de todos.
    // El desvanecido se hace por COLOR: con blending aditivo, negro = invisible.
    this.trailPositions = new Float32Array(TRAIL_SPRITE_MAX * 3);
    this.trailColors = new Float32Array(TRAIL_SPRITE_MAX * 3);
    this.trailGeo.setAttribute("position", new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeo.setAttribute("color", new THREE.BufferAttribute(this.trailColors, 3));
    // Las motas muertas se aparcan lejísimos en vez de borrarse del buffer: con color
    // negro no pintan nada, y así el atributo nunca cambia de tamaño.
    for (let i = 0; i < TRAIL_SPRITE_MAX; i++) {
      this.trailPositions[i * 3 + 1] = 1e6;
      this.motes.push({ alive: false, life: 0, maxLife: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
    }
    const trail = new THREE.Points(this.trailGeo, new THREE.PointsMaterial({
      map: moteTexture(), size: 0.42, sizeAttenuation: true, vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    trail.frustumCulled = false; // vive pegado a la cámara; el culling solo daría tirones
    this.group.add(trail);

    this.buildInstruments(brassMat, ice);

    anchor.add(this.group);
  }

  /**
   * El tablero de bronce (PLAN §6): un ORRERY en miniatura girando, un sextante y el
   * manómetro de empuje de cola, más la llave del radiofaro. Van bajo el alféizar, en
   * la periferia inferior: se ven al bajar la vista, no tapan el juego.
   */
  private buildInstruments(brass: THREE.Material, ice: THREE.Texture): void {
    const board = new THREE.Group();
    board.position.set(0, -1.16, -0.72);
    board.rotation.x = -0.55; // inclinado hacia el piloto, como una mesa de cartas
    this.group.add(board);

    // Tablero de madera helada.
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.09, 0.85),
      new THREE.MeshStandardMaterial({ map: ice, color: "#3d5f74", roughness: 0.7 }),
    );
    board.add(top);

    // --- Orrery: un sol y tres planetitas de latón en anillos concéntricos.
    const orrery = new THREE.Group();
    orrery.position.set(-0.95, 0.1, 0);
    board.add(orrery);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), brass);
    orrery.add(sun);
    const planetGeo = new THREE.SphereGeometry(0.036, 8, 6);
    for (let i = 0; i < 3; i++) {
      const radius = 0.17 + i * 0.11;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.005, 5, 28), brass);
      ring.rotation.x = Math.PI / 2;
      orrery.add(ring);
      const arm = new THREE.Group();
      const planet = new THREE.Mesh(planetGeo, brass);
      planet.position.x = radius;
      arm.add(planet);
      orrery.add(arm);
      // Más lejos, más lento: es un sistema solar, no un ventilador.
      this.orreryArms.push({ arm, speed: 0.9 / (i + 1.4) });
    }

    // --- Sextante: arco graduado con su brazo.
    const sextant = new THREE.Group();
    sextant.position.set(0, 0.09, 0);
    board.add(sextant);
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.012, 6, 24, Math.PI * 0.6), brass,
    );
    arc.rotation.x = Math.PI / 2;
    arc.rotation.z = Math.PI * 0.7;
    sextant.add(arc);
    const armBar = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.3), brass);
    armBar.position.z = -0.13;
    sextant.add(armBar);

    // --- Manómetro de empuje de cola: esfera con aguja que sigue la velocidad.
    const gauge = new THREE.Group();
    gauge.position.set(0.95, 0.1, 0);
    board.add(gauge);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 20), brass);
    gauge.add(dial);
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 20),
      new THREE.MeshStandardMaterial({ color: "#0d1424", roughness: 0.6 }),
    );
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.017;
    gauge.add(face);
    this.needle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.14), brass);
    this.needle.position.set(0, 0.026, -0.06);
    const needlePivot = new THREE.Group();
    needlePivot.position.y = 0.001;
    needlePivot.add(this.needle);
    gauge.add(needlePivot);
    this.needlePivot = needlePivot;

    // --- Llave del radiofaro: palanca de telégrafo que baja al transmitir.
    const key = new THREE.Group();
    key.position.set(0.5, 0.09, 0.22);
    board.add(key);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.1), brass);
    key.add(base);
    this.beaconLever = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.22), brass);
    this.beaconLever.position.set(0, 0.06, -0.05);
    key.add(this.beaconLever);
  }

  /**
   * La estela se emite en el espacio LOCAL de la carlinga y viaja hacia +Z (atrás): como
   * la carlinga viaja con el cometa, el resultado que se ve por las portillas es polvo
   * quedándose atrás. Más velocidad = más caudal y más brillo.
   */
  update(dt: number, readings: CabReadings): void {
    this.elapsed += dt;
    this.updateInstruments(dt, readings);

    const rate = 14 + readings.speed * 46 + readings.slingshot * 40;
    this.spawnAccumulator += rate * dt;
    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;
      this.spawnMote(readings);
    }

    // Con el slingshot la cola se enciende (§7.1): más caudal y más brillo.
    const glow = 1 + readings.slingshot * 1.6;
    for (let i = 0; i < this.motes.length; i++) {
      const mote = this.motes[i];
      if (!mote.alive) continue;
      mote.life += dt;
      if (mote.life >= mote.maxLife) {
        mote.alive = false;
        this.trailPositions[i * 3 + 1] = 1e6;
        this.trailColors[i * 3] = this.trailColors[i * 3 + 1] = this.trailColors[i * 3 + 2] = 0;
        continue;
      }
      const t = mote.life / mote.maxLife;
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      mote.z += mote.vz * dt;
      this.trailPositions[i * 3] = mote.x;
      this.trailPositions[i * 3 + 1] = mote.y;
      this.trailPositions[i * 3 + 2] = mote.z;
      // Desvanecido por color (aditivo): de hielo brillante a negro.
      const fade = (1 - t) * 0.85 * glow;
      this.trailColors[i * 3] = 0.62 * fade;
      this.trailColors[i * 3 + 1] = 0.85 * fade;
      this.trailColors[i * 3 + 2] = fade;
    }
    this.trailGeo.attributes.position.needsUpdate = true;
    this.trailGeo.attributes.color.needsUpdate = true;
  }

  /** Los instrumentos viven: el orrery gira, la aguja sigue la velocidad y la llave baja. */
  private updateInstruments(dt: number, readings: CabReadings): void {
    for (const { arm, speed } of this.orreryArms) arm.rotation.y += speed * dt;

    if (this.needlePivot) {
      // La aguja barre 240° de esfera y persigue la lectura, no salta a ella: un
      // instrumento de bronce tiene inercia.
      const target = (-120 + readings.speed * 240) * (Math.PI / 180);
      this.needlePivot.rotation.y += (target - this.needlePivot.rotation.y) * Math.min(1, dt * 6);
    }

    if (this.beaconLever) {
      // La llave del telégrafo baja al transmitir y vuelve sola.
      const pull = readings.beaconPull ?? 0;
      this.beaconLever.rotation.x = pull * 0.42;
    }
  }

  private spawnMote(readings: CabReadings): void {
    const index = this.motes.findIndex((m) => !m.alive);
    if (index === -1) return;
    const mote = this.motes[index];
    const a = Math.random() * Math.PI * 2;
    const r = 0.5 + Math.random() * 1.3;
    mote.x = Math.cos(a) * r;
    mote.y = -1.4 + Math.sin(a) * r * 0.6;
    mote.z = -4.2;
    // Hacia atrás (+Z local), con dispersión lateral: la cola se abre al alejarse.
    mote.vz = 16 + readings.speed * 30 + readings.slingshot * 22;
    mote.vx = Math.cos(a) * (0.7 + Math.random());
    mote.vy = Math.sin(a) * (0.7 + Math.random());
    mote.life = 0;
    mote.maxLife = 0.55 + Math.random() * 0.5;
    mote.alive = true;
  }
}
