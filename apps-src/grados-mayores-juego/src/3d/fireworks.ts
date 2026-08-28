// fireworks.ts — Los fuegos artificiales de la gala (PLAN §12), a la manera de
// Sea of Thieves: no una nube de puntos que parpadea, sino COHETES de verdad.
//
// El ciclo completo, que es lo que vende la ilusión:
//   1. Sube un cometa con estela de brasas, frenándose (arrastre + gravedad).
//   2. En el ápice ESTALLA: fogonazo blanco al centro y una CÁSCARA hueca de
//      chispas que se abre de golpe y se frena enseguida.
//   3. Las chispas nacen BLANCAS (metal al rojo) y se tiñen del color de la bomba
//      en dos décimas; luego cuelgan, caen despacio y TITILAN al morir.
//   4. Tres bombas distintas: peonía (la esfera clásica), crisantemo (más ancha y
//      toda con purpurina) y sauce (pocas chispas, pesadas, cortina que se descuelga).
//
// Todo son GL_POINTS de un solo buffer: 1 draw call para el cielo entero. El material
// es propio y no `PointsMaterial` porque hacen falta tamaño y opacidad POR PARTÍCULA
// —una brasa moribunda no puede medir lo mismo que un fogonazo— y eso `PointsMaterial`
// no lo da.
//
// Quién dispara: manda el AUDIO (`cue`, desde `FireworksSound`), igual que el relámpago
// del apartadero lo dispara su trueno. Las salvas propias son solo la red de seguridad
// para que el cielo no se quede vacío en los tramos flojos de la grabación.

import * as THREE from "three";

/** Techo del pool. Una salva de tres bombas grandes gasta ~700; el resto es aire. */
const POOL = 2200;

const GRAVITY = 9.2;

/** Paleta de bombas: saturadas y de un solo tono, como las de la isla. */
const SHELLS: ReadonlyArray<readonly [number, number, number]> = [
  [1.0, 0.32, 0.22], // rojo brasa
  [1.0, 0.74, 0.24], // oro
  [0.36, 1.0, 0.46], // verde
  [0.35, 0.62, 1.0], // azul
  [0.78, 0.42, 1.0], // violeta
  [1.0, 0.45, 0.78], // rosa
  [0.55, 0.95, 1.0], // cian pálido
];

type ShellKind = "peonia" | "crisantemo" | "sauce";

interface Rocket {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  /** Segundos que le quedan de mecha: el estallido lo manda ESTO, no la altura. */
  fuse: number;
  /** Cuenta atrás para la siguiente brasa de la estela. */
  emit: number;
  kind: ShellKind;
  strength: number;
  color: readonly [number, number, number];
}

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aOpacity;
  attribute vec3 aColor;
  uniform float uScale;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vColor = aColor;
    vOpacity = aOpacity;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Misma atenuación que PointsMaterial (tamaño · media altura del buffer /
    // profundidad), con tope para que una brasa cercana no llene la pantalla.
    gl_PointSize = clamp(aSize * uScale / max(1.0, -mv.z), 1.0, 96.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (d > 1.0) discard;
    // Halo suave más núcleo blanco: la brasa quema de más en el centro.
    float glow = pow(1.0 - d, 2.6);
    float core = pow(1.0 - d, 14.0);
    // El ACES de la escena DESATURA todo lo que pasa de 1, y como las chispas se
    // suman unas sobre otras, pasarse de brillo volvía las siete bombas la misma
    // mancha blanca. El pico se queda rozando 1 y el núcleo se refuerza con el PROPIO
    // color: así el verde es verde y el rojo, rojo.
    gl_FragColor = vec4((vColor * glow * 1.15 + vColor * core * 0.8 + vec3(core * 0.22)) * vOpacity, 1.0);
    // Sin estos dos chunks el material crudo se salta el tone mapping y la conversión
    // a sRGB del renderer, y los fuegos quedan planos y apagados junto al resto.
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class Fireworks {
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material: THREE.ShaderMaterial;
  private readonly points: THREE.Points;

  // Estado en arrays paralelos. El `position` del buffer ES el almacén de posiciones:
  // no hay copia que mantener sincronizada.
  private readonly pos = new Float32Array(POOL * 3);
  private readonly col = new Float32Array(POOL * 3);
  private readonly size = new Float32Array(POOL);
  private readonly alpha = new Float32Array(POOL);
  private readonly vel = new Float32Array(POOL * 3);
  private readonly base = new Float32Array(POOL * 3); // color ya frío de la chispa
  private readonly age = new Float32Array(POOL);
  private readonly life = new Float32Array(POOL);
  private readonly seed = new Float32Array(POOL);     // tamaño nominal
  private readonly drag = new Float32Array(POOL);
  private readonly grav = new Float32Array(POOL);
  private readonly hot = new Float32Array(POOL);      // segundos de blanco caliente
  private readonly twk = new Float32Array(POOL);      // frecuencia de titileo (0 = fijo)
  private readonly phase = new Float32Array(POOL);
  /** Ranuras libres. Pila en vez de barrido: reciclar es O(1) aunque el pool esté lleno. */
  private readonly free: number[] = [];

  private readonly rockets: Rocket[] = [];
  private sinceLastBurst = 99;
  private elapsed = 0;

  /**
   * @param parent grupo de la Terminal: todo se define en su espacio local
   *               (x lateral, y altura, −z hacia el fondo de la nave).
   */
  constructor(private readonly parent: THREE.Object3D) {
    for (let i = POOL - 1; i >= 0; i--) this.free.push(i);

    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.geometry.setAttribute("aColor", new THREE.BufferAttribute(this.col, 3));
    this.geometry.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1));
    this.geometry.setAttribute("aOpacity", new THREE.BufferAttribute(this.alpha, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 500 } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    // El pool nace disperso y medio vacío: su bounding box no significa nada.
    this.points.frustumCulled = false;
    // Antes que el cristal de la bóveda, que es transparente y se pinta encima: así
    // los fuegos se ven TRAS los paños, tal cual pide §12.
    this.points.renderOrder = -1;
    parent.add(this.points);

    this.launch(1.9, 0.7);
    this.launch(2.4, 0.9);
  }

  // -----------------------------------------------------------------------------------
  // Disparo
  // -----------------------------------------------------------------------------------

  /**
   * Encarga una bomba que ESTALLE dentro de `delay` segundos. Lo llama el audio con la
   * anticipación justa para que el fogonazo caiga sobre su trueno.
   *
   * @param strength 0–1: manda altura, número de chispas y apertura.
   */
  cue(delay: number, strength: number): void {
    if (this.rockets.length >= 7) return; // el cielo ya está lleno; esta se pierde
    this.launch(THREE.MathUtils.clamp(delay, 0.9, 3.4), THREE.MathUtils.clamp(strength, 0, 1));
  }

  /** Planta un cohete en los morteros repartidos tras la nave. */
  private launch(fuse: number, strength: number): void {
    const kind: ShellKind =
      Math.random() < 0.2 ? "sauce" : Math.random() < 0.34 ? "crisantemo" : "peonia";
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (20 + Math.random() * 70);
    const z = -45 - Math.random() * 145;
    // Altura de estallido por encima de la bóveda (62 u) pero sin pasarse: más arriba
    // se salían del parabrisas de la cabina en el tramo final, que es justo donde hay
    // que verlas. Se abren sobre el tejado de cristal y encuadradas por la ventana.
    const apex = 76 + strength * 66;
    // Velocidad de salida para llegar arriba justo al acabarse la mecha. El arrastre
    // del cohete es flojo (0.25) para que la cuenta salga con el tiro parabólico.
    const rise = apex / fuse + (GRAVITY * fuse) / 2;
    this.rockets.push({
      x, y: 2, z,
      vx: -side * (1 + Math.random() * 3), vy: rise, vz: (Math.random() - 0.5) * 4,
      fuse,
      emit: 0,
      kind,
      strength,
      color: SHELLS[(Math.random() * SHELLS.length) | 0],
    });
  }

  /** El estallido: fogonazo, cáscara y —si toca— la cortina del sauce. */
  private burst(r: Rocket): void {
    const [cr, cg, cb] = r.color;
    const scale = 0.55 + 0.45 * r.strength;
    this.sinceLastBurst = 0;

    // Fogonazo: cuatro brasas enormes que mueren en dos parpadeos. Es lo que hace que
    // el estallido se lea como una explosión y no como una flor que se abre.
    for (let i = 0; i < 4; i++) {
      const s = (46 - i * 8) * scale;
      // Quieto y sin peso: el fogonazo no vuela, solo ciega y se va.
      this.spawn(r.x, r.y, r.z, 0, 0, 0, 0.15 + i * 0.05, s, 0, 0, 1, 1, 1, 0.16, 0, 0);
    }

    if (r.kind === "sauce") {
      // Sauce: pocas chispas, lentas, PESADAS y de vida larga. Cuelgan del cielo y se
      // descuelgan en cortina; es la bomba que más dura de las tres.
      const n = Math.round(100 * scale);
      for (let i = 0; i < n; i++) {
        const [dx, dy, dz] = sphere();
        const s = (9 + Math.random() * 5) * scale;
        this.spawn(
          r.x, r.y, r.z, dx * s, dy * s * 0.8 + 3, dz * s,
          2.9 + Math.random() * 1.4, 4 + Math.random() * 1.4,
          0.75, 5.5, cr, cg, cb, 0.22, 0, Math.random() * 6.283,
        );
      }
      return;
    }

    // Peonía y crisantemo: CÁSCARA. Dirección uniforme sobre la esfera y rapidez casi
    // constante (±12 %) — por eso se lee como una bola que se abre y no como una nube.
    // El crisantemo abre más ancho y lleva purpurina en todas sus chispas.
    const wide = r.kind === "crisantemo";
    const speed = (wide ? 30 : 24) * (0.78 + 0.32 * r.strength);
    const n = Math.round((wide ? 190 : 150) * scale);
    for (let i = 0; i < n; i++) {
      const [dx, dy, dz] = sphere();
      const s = speed * (0.88 + Math.random() * 0.24);
      const glitter = wide || Math.random() < 0.55 ? 22 + Math.random() * 16 : 0;
      this.spawn(
        r.x, r.y, r.z, dx * s, dy * s, dz * s,
        2.1 + Math.random() * 1.3, 3 + Math.random() * 1.6,
        1.25, 7.0, cr, cg, cb, 0.2, glitter, Math.random() * 6.283,
      );
    }
  }

  // -----------------------------------------------------------------------------------
  // Simulación
  // -----------------------------------------------------------------------------------

  update(dt: number): void {
    this.elapsed += dt;
    this.sinceLastBurst += dt;
    // El canvas ocupa la ventana y el dpr va topado a 2 (ver `resize` del renderer).
    this.material.uniforms.uScale.value =
      window.innerHeight * Math.min(window.devicePixelRatio || 1, 2) * 0.5;

    // Red de seguridad: si la grabación lleva tres segundos sin una detonación, el
    // cielo se rellena solo. Nunca hay un cielo vacío durante la gala.
    if (this.sinceLastBurst > 3 && this.rockets.length === 0) {
      this.launch(1.6 + Math.random() * 1.2, 0.45 + Math.random() * 0.3);
    }

    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.fuse -= dt;
      r.vy -= GRAVITY * dt;
      const damp = Math.max(0, 1 - 0.25 * dt);
      r.vx *= damp; r.vy *= damp; r.vz *= damp;
      r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;

      // Estela del cometa: brasas que se quedan donde pasó y se apagan enseguida.
      r.emit -= dt;
      while (r.emit <= 0) {
        r.emit += 0.022;
        this.spawn(
          r.x + (Math.random() - 0.5) * 0.8, r.y, r.z + (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 2.2, -1 - Math.random() * 2, (Math.random() - 0.5) * 2.2,
          0.42 + Math.random() * 0.3, 2.2, 2.2, 2,
          1, 0.72, 0.3, 0.1, 0, 0,
        );
      }
      // Cabeza incandescente, siempre recién nacida para que el cometa vaya en punta.
      this.spawn(r.x, r.y, r.z, 0, 0, 0, 0.07, 6, 0, 0, 1, 0.9, 0.62, 0.07, 0, 0);

      if (r.fuse <= 0) {
        this.burst(r);
        this.rockets.splice(i, 1);
      }
    }

    this.step(dt);
  }

  /** Integra el pool y vuelca posición, color, tamaño y opacidad de cada chispa. */
  private step(dt: number): void {
    for (let i = 0; i < POOL; i++) {
      if (this.life[i] <= 0) continue;
      const age = (this.age[i] += dt);
      if (age >= this.life[i]) {
        this.life[i] = 0;
        this.alpha[i] = 0;
        this.size[i] = 0;
        this.free.push(i);
        continue;
      }
      const t = age / this.life[i];
      const v = i * 3;
      // Arrastre lineal (dt ≤ 0.05, no hace falta la exponencial) más gravedad: juntos
      // dan la velocidad terminal g/drag con la que las brasas se dejan caer.
      const damp = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[v + 1] -= this.grav[i] * dt;
      this.vel[v] *= damp; this.vel[v + 1] *= damp; this.vel[v + 2] *= damp;
      this.pos[v] += this.vel[v] * dt;
      this.pos[v + 1] += this.vel[v + 1] * dt;
      this.pos[v + 2] += this.vel[v + 2] * dt;

      // Blanco caliente que se enfría hacia el color de la bomba.
      const k = this.hot[i] > 0 ? Math.min(1, age / this.hot[i]) : 1;
      this.col[v] = 1 + (this.base[v] - 1) * k;
      this.col[v + 1] = 1 + (this.base[v + 1] - 1) * k;
      this.col[v + 2] = 1 + (this.base[v + 2] - 1) * k;

      let fade = (1 - t) * (1 - t * 0.55);
      if (this.twk[i] > 0 && t > 0.3) {
        // Purpurina: la chispa no se apaga, PESTAÑEA. Solo en la segunda mitad.
        const flicker = Math.sin(this.elapsed * this.twk[i] + this.phase[i]);
        fade *= 0.45 + 0.55 * flicker * flicker;
      }
      this.alpha[i] = fade;
      this.size[i] = this.seed[i] * (0.6 + 0.4 * (1 - t));
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aOpacity.needsUpdate = true;
  }

  /** Enciende una chispa en la primera ranura libre; con el pool lleno, se descarta. */
  private spawn(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    life: number, size: number, drag: number, grav: number,
    r: number, g: number, b: number,
    hot: number, twinkle: number, phase: number,
  ): void {
    const i = this.free.pop();
    if (i === undefined) return;

    const v = i * 3;
    this.pos[v] = x; this.pos[v + 1] = y; this.pos[v + 2] = z;
    this.vel[v] = vx; this.vel[v + 1] = vy; this.vel[v + 2] = vz;
    this.base[v] = r; this.base[v + 1] = g; this.base[v + 2] = b;
    this.col[v] = 1; this.col[v + 1] = 1; this.col[v + 2] = 1;
    this.age[i] = 0;
    this.life[i] = life;
    this.seed[i] = size;
    this.drag[i] = drag;
    this.grav[i] = grav;
    this.hot[i] = hot;
    this.twk[i] = twinkle;
    this.phase[i] = phase;
    this.alpha[i] = 1;
    this.size[i] = size;
  }

  dispose(): void {
    this.parent.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}

/** Dirección uniforme sobre la esfera (método de Arquímedes: la altura es uniforme). */
function sphere(): [number, number, number] {
  const u = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return [Math.cos(a) * s, u, Math.sin(a) * s];
}
