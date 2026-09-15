// La canastilla (PLAN §6), modelada en Blender (art/blender/canasta/modelar-canasta.py).
// Hija de la cámara y enmarcando la vista: borde de mimbre con altímetro abajo, postes de
// cuero a los lados y, arriba, el quemador con su llama y el faldón del globo. Los módulos
// se anclan a los bordes de la pantalla y se recolocan al cambiar la proporción; el centro
// queda libre. El QUEMADOR que ruge (llama + serpentines al rojo) es el "efecto firma".

import * as THREE from "three";
import dataUrl from "./assets/canasta/canasta.json?url";

interface PartData {
  name: string;
  part: string;
  position: number[];
  normal: number[];
  index: number[];
  vertexColor?: number[];
  color: number[];
  metalness: number;
  roughness: number;
}

interface ModuleSpec {
  parts: string[];
  anchor: [number, number];
  depth: number;
  /** Postes: en pantallas estrechas adelgazan, pero conservan el alto. */
  keepHeight?: boolean;
}

interface BasketData {
  layout: { H: number; refHalfWidth: number; minScale: number };
  modules: Record<string, ModuleSpec>;
  flameOrigins: number[][];
  meshes: PartData[];
}

export class Basket {
  private readonly root = new THREE.Group();
  private readonly modules: { spec: ModuleSpec; group: THREE.Group }[] = [];
  private readonly flames: THREE.Sprite[] = [];
  private coilMat: THREE.MeshStandardMaterial | null = null;
  private layout: BasketData["layout"] | null = null;
  private aspect = 0;
  private burn = 0; // 0..1 intensidad actual (suavizada)
  private burstT = 0; // rugido puntual (cuerda completada)

  constructor(private camera: THREE.PerspectiveCamera) {
    camera.add(this.root);
    // Descarga en segundo plano: hasta que llegue, el vuelo sigue sin marco.
    fetch(dataUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Canastilla: HTTP ${response.status}`);
        this.build((await response.json()) as BasketData);
      })
      .catch((error: unknown) => console.warn(error));
  }

  /** Rugido puntual (cuerda completada §7.1). */
  burst(): void {
    this.burstT = 1;
  }

  /** intensity 0..1 (ascenso actual). Anima llama: escala + brillo + flicker. */
  update(dt: number, elapsed: number, intensity: number): void {
    if (this.camera.aspect !== this.aspect) this.place();
    this.burstT = Math.max(0, this.burstT - dt * 1.4);
    const target = Math.max(intensity, this.burstT);
    this.burn += (target - this.burn) * Math.min(1, 6 * dt);
    for (let i = 0; i < this.flames.length; i++) {
      const flicker = 0.9 + Math.sin(elapsed * 31 + i * 1.7) * 0.06 + Math.sin(elapsed * 47 + i) * 0.05;
      const k = (0.25 + this.burn * 0.95) * flicker;
      const flame = this.flames[i];
      flame.scale.set(0.09 * k, 0.26 * k, 1);
      // El sprite crece hacia arriba desde la boquilla: solo asoma su base.
      flame.position.y = flame.userData.baseY + flame.scale.y * 0.42;
      (flame.material as THREE.SpriteMaterial).opacity = 0.25 + this.burn * 0.7;
    }
    if (this.coilMat) this.coilMat.emissiveIntensity = 0.05 + this.burn * 1.6;
  }

  private build(data: BasketData): void {
    this.layout = data.layout;
    const byPart = new Map(data.meshes.map((m) => [m.part, m]));
    const flameTexture = makeFlameTexture();

    for (const [name, spec] of Object.entries(data.modules)) {
      const group = new THREE.Group();
      group.name = `Canastilla · ${name}`;
      for (const partName of spec.parts) {
        const part = byPart.get(partName);
        if (!part) throw new Error(`Canastilla: falta la parte ${partName}`);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
        geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
        if (part.vertexColor) {
          geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
        }
        geometry.setIndex(part.index);
        const isCoil = part.part === "coil";
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
          vertexColors: Boolean(part.vertexColor),
          metalness: part.metalness,
          roughness: part.roughness,
          // Las superficies abiertas (mimbre, faldón) se ven por ambas caras.
          side: THREE.DoubleSide,
          fog: false,
          emissive: isCoil ? 0xff6a14 : 0x000000,
          emissiveIntensity: isCoil ? 0.05 : 0,
        });
        if (isCoil) this.coilMat = material;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = part.name;
        // Viaja con la cámara: la esfera de encuadre no aplica.
        mesh.frustumCulled = false;
        group.add(mesh);
      }
      if (name === "burner") {
        for (const [x, y, z] of data.flameOrigins) {
          const flame = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: flameTexture,
              color: 0xffc46a,
              transparent: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              fog: false,
            }),
          );
          flame.position.set(x, y, z + 0.01);
          flame.userData.baseY = y;
          flame.frustumCulled = false;
          this.flames.push(flame);
          group.add(flame);
        }
      }
      this.modules.push({ spec, group });
      this.root.add(group);
    }
    this.place();
  }

  /** Coloca cada módulo en su borde de pantalla para la proporción actual de la cámara. */
  private place(): void {
    this.aspect = this.camera.aspect;
    if (!this.layout) return;
    const { H, refHalfWidth, minScale } = this.layout;
    const halfW = H * this.aspect;
    // Piezas completas en panorámico; más finas en teléfono vertical.
    const k = THREE.MathUtils.clamp(halfW / refHalfWidth, minScale, 1);
    for (const { spec, group } of this.modules) {
      const [ax, ay] = spec.anchor;
      const d = spec.depth;
      group.position.set(ax * halfW * d, ay * H * d, -d);
      group.scale.set(k, spec.keepHeight ? 1 : k, k);
      // En pantallas estrechas los postes se arriman al borde para no comerse el ancho.
      if (spec.keepHeight) group.position.x += ax * (1 - k) * 0.05 * d;
    }
  }
}

function makeFlameTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 78, 2, 32, 60, 52);
  g.addColorStop(0, "rgba(255,255,235,1)");
  g.addColorStop(0.22, "rgba(170,205,255,0.95)");
  g.addColorStop(0.4, "rgba(255,210,110,0.85)");
  g.addColorStop(0.7, "rgba(255,130,40,0.4)");
  g.addColorStop(1, "rgba(255,90,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 96);
  return new THREE.CanvasTexture(canvas);
}
