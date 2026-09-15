// Escenografía por capa (PLAN §5.2) — 100 % procedural, cero assets.
// Presupuestos: terreno 1 dc · mar de nubes 1 dc · cúmulos 3 dc (instanciados
// por textura, billboard en vertex shader — los Sprite sueltos serían ~300 dc) ·
// aves 6 dc · auroras 5 dc · globos lejanos ~7 dc. La ballena llega en F10.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PHYSICS, WORLD } from "@/config";
import { makeRng } from "./environment";

const CLOUD_TEX_COUNT = 3;
const CLOUD_COUNT = 300; // ~35 racimos × 5–12 sprites
const CLOUD_WRAP = 340; // caja horizontal de reciclado (mundo, no jugador)

export class Scenery {
  private cloudMeshes: THREE.InstancedMesh[] = [];
  private cloudData: { layer: number; drift: THREE.Vector3 }[][] = [];
  private cloudTimeUniforms: { value: number }[] = [];
  private heroClouds: { group: THREE.Group; drift: THREE.Vector3 }[] = [];
  private faroRotator: THREE.Object3D | null = null;
  private seaUniforms = { uTime: { value: 0 } };
  private auroraUniforms = { uTime: { value: 0 } };
  private birds: BirdFlock[] = [];
  private balloons: { group: THREE.Group; drift: THREE.Vector3 }[] = [];
  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene, windVectors: THREE.Vector3[]) {
    const rng = makeRng(WORLD.seed ^ 0x51e2e);

    scene.add(this.buildTerrain(rng));
    scene.add(this.buildSeaOfClouds());
    this.buildCumulus(scene, rng, windVectors);
    this.buildHeroClouds(scene, windVectors);
    this.buildLighthouse(scene);
    this.buildLenticulars(scene, rng);
    this.buildBirds(scene, rng);
    this.buildAuroras(scene, rng);
    this.buildBalloons(scene, rng);
    this.activateWhale(scene);
  }

  // ── Terreno del valle (capas 1–2): plano desplazado con ruido + vertex colors.
  // Campos verdes/dorados, colinas al borde y un río serpenteante brillante. 1 dc.
  private buildTerrain(rng: () => number): THREE.Mesh {
    const SIZE = 900;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, 140, 140);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cGrass = new THREE.Color(0x4d7a3a);
    const cField = new THREE.Color(0xb9a24e);
    const cDark = new THREE.Color(0x2f5a30);
    const cRock = new THREE.Color(0x6b6154);
    const cRiver = new THREE.Color(0xcfeaff);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // plano XY; rotado luego a XZ (y → −z mundo)
      const r = Math.hypot(x, y);
      // Valle en el centro, colinas crecientes hacia el borde.
      let h =
        Math.sin(x * 0.020) * Math.cos(y * 0.024) * 3 +
        Math.sin(x * 0.061 + y * 0.043) * 1.6 +
        Math.sin(x * 0.013 - y * 0.017) * 2.4;
      const rim = Math.max(0, (r - 180) / 120);
      h += rim * rim * 26 + Math.sin(x * 0.05 + y * 0.09) * rim * 6;

      // Río: franja serpenteante (sinuosa en x según y). Cauce hundido y claro.
      const riverX = Math.sin(y * 0.011) * 60 + Math.sin(y * 0.031) * 18;
      const dRiver = Math.abs(x - riverX);
      const inRiver = dRiver < 7;
      if (inRiver) h = Math.min(h, -1.6);

      pos.setZ(i, h);

      // Color por parcelas: hash grueso de celdas (campos), oscurecido en laderas.
      const cell = Math.floor(x / 34) * 57 + Math.floor(y / 34) * 131;
      const fieldMix = (Math.abs(Math.sin(cell * 12.9898)) * 43758.5453) % 1;
      tmp.copy(fieldMix > 0.62 ? cField : fieldMix > 0.28 ? cGrass : cDark);
      if (rim > 0.4) tmp.lerp(cRock, Math.min(1, (rim - 0.4) * 1.4));
      if (inRiver) tmp.copy(cRiver); // franja "especular": clara, casi emisiva
      const v = 0.9 + rng() * 0.1;
      colors[i * 3] = tmp.r * v;
      colors[i * 3 + 1] = tmp.g * v;
      colors[i * 3 + 2] = tmp.b * v;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -2;
    return mesh;
  }

  // ── Mar de nubes (suelo de la capa 2, visible 2–3): shader de ruido 2 octavas
  // scrolleando, alpha suave en bordes. 1 dc.
  private buildSeaOfClouds(): THREE.Mesh {
    const mat = new THREE.ShaderMaterial({
      uniforms: this.seaUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
                     mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
        }
        void main() {
          vec2 p = vUv * 26.0;
          float n = vnoise(p + vec2(uTime * 0.06, 0.0)) * 0.65
                  + vnoise(p * 2.3 - vec2(0.0, uTime * 0.04)) * 0.35;
          float body = smoothstep(0.38, 0.75, n);
          float edge = smoothstep(0.5, 0.18, distance(vUv, vec2(0.5))); // borde suave
          vec3 col = mix(vec3(0.72, 0.78, 0.88), vec3(1.0, 0.99, 0.96), body);
          gl_FragColor = vec4(col, body * 0.92 * edge);
          #include <colorspace_fragment>
        }
      `,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 140;
    mesh.renderOrder = 1;
    return mesh;
  }

  // ── Cúmulos (capas 1–4): 300 billboards instanciados en 3 mallas (una por
  // textura de canvas compartida). Racimos de 5–12, tamaño 10–40 u, deriva lenta.
  private buildCumulus(scene: THREE.Scene, rng: () => number, wind: THREE.Vector3[]): void {
    const textures = Array.from({ length: CLOUD_TEX_COUNT }, (_, k) => makeCloudTexture(rng, k));
    const perMesh = CLOUD_COUNT / CLOUD_TEX_COUNT;

    // Racimos: centro por capa 1–4 (banda Y), 5–12 nubes alrededor.
    const clusters: { x: number; y: number; z: number; layer: number; n: number }[] = [];
    for (let layer = 1; layer <= 4; layer++) {
      for (let c = 0; c < 9; c++) {
        clusters.push({
          x: (rng() - 0.5) * CLOUD_WRAP * 2,
          y: 150 * (layer - 1) + 25 + rng() * 105,
          z: (rng() - 0.5) * CLOUD_WRAP * 2,
          layer,
          n: 5 + Math.floor(rng() * 8),
        });
      }
    }
    // Reparte las nubes de todos los racimos en 3 mallas round-robin.
    const placements: { x: number; y: number; z: number; s: number; layer: number }[] = [];
    for (const cl of clusters) {
      for (let i = 0; i < cl.n; i++) {
        placements.push({
          x: cl.x + (rng() - 0.5) * 42,
          y: cl.y + (rng() - 0.5) * 12,
          z: cl.z + (rng() - 0.5) * 42,
          s: 10 + rng() * 30,
          layer: cl.layer,
        });
      }
    }

    for (let k = 0; k < CLOUD_TEX_COUNT; k++) {
      const mine = placements.filter((_, idx) => idx % CLOUD_TEX_COUNT === k).slice(0, perMesh + 40);
      const uTime = { value: 0 };
      this.cloudTimeUniforms.push(uTime);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: textures[k] }, uTime },
        transparent: true,
        depthWrite: false,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            // Billboard: posición de la instancia + offset del quad en espacio vista.
            vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            float s = length(vec3(instanceMatrix[0].xyz));
            mv.xy += position.xy * s;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform sampler2D uMap;
          varying vec2 vUv;
          void main() {
            vec4 tex = texture2D(uMap, vUv);
            if (tex.a < 0.01) discard;
            gl_FragColor = vec4(tex.rgb, tex.a * 0.85);
            #include <colorspace_fragment>
          }
        `,
      });
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.62), mat, mine.length);
      mesh.frustumCulled = false; // el billboard mueve vértices en vista
      mesh.renderOrder = 2;
      const data: { layer: number; drift: THREE.Vector3 }[] = [];
      for (let i = 0; i < mine.length; i++) {
        const p = mine[i];
        this.dummy.position.set(p.x, p.y, p.z);
        this.dummy.scale.setScalar(p.s);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
        data.push({ layer: p.layer, drift: wind[p.layer - 1] });
      }
      scene.add(mesh);
      this.cloudMeshes.push(mesh);
      this.cloudData.push(data);
    }
  }

  // ── Nubes Cúmulo 3D Hero (Blender bpy): Formaciones volumétricas navegables
  private buildHeroClouds(scene: THREE.Scene, wind: THREE.Vector3[]): void {
    const glbUrl = new URL("../../art/blender/nube-cumulo.glb", import.meta.url).href;
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        const template = gltf.scene;
        // Posiciones panorámicas en Capas 1 y 2
        const placements = [
          // Capa 1 (Amanecer sobre el valle): frente al despegue
          { x: 42, y: 28, z: -62, scale: 2.2, rotY: 0.4, layer: 1 },
          { x: -70, y: 55, z: -88, scale: 2.6, rotY: -1.1, layer: 1 },
          { x: 85, y: 48, z: 65, scale: 2.4, rotY: 2.2, layer: 1 },
          // Capa 2 (Mar de nubes): emergiendo como cordillera flotante
          { x: -28, y: 165, z: -52, scale: 3.0, rotY: 0.8, layer: 2 },
          { x: 62, y: 230, z: -78, scale: 3.4, rotY: -0.5, layer: 2 },
        ];

        for (const p of placements) {
          const cloud = template.clone(true);
          cloud.position.set(p.x, p.y, p.z);
          cloud.scale.setScalar(p.scale);
          cloud.rotation.y = p.rotY;

          cloud.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = child as THREE.Mesh;
              m.castShadow = false;
              m.receiveShadow = false;
              if (m.material) {
                const mat = (m.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
                mat.roughness = 0.85;
                mat.metalness = 0.0;
                mat.transparent = true;
                mat.opacity = 0.82;
                mat.depthWrite = false;
                mat.side = THREE.DoubleSide;

                // Suavizado de cámara (Camera Near-Fade): las caras se desvanecen suavemente al acercarse
                // permitiendo atravesar y penetrar la nube como vapor real, sin recortes geométricos duros.
                mat.onBeforeCompile = (shader) => {
                  shader.vertexShader = `
                    varying float vViewDist;
                    ${shader.vertexShader}
                  `.replace(
                    `#include <fog_vertex>`,
                    `#include <fog_vertex>
                    vViewDist = -mvPosition.z;`
                  );

                  shader.fragmentShader = `
                    varying float vViewDist;
                    ${shader.fragmentShader}
                  `.replace(
                    `#include <dithering_fragment>`,
                    `#include <dithering_fragment>
                    float nearFade = smoothstep(1.2, 8.5, vViewDist);
                    gl_FragColor.a *= nearFade;`
                  );
                };

                m.material = mat;
                m.renderOrder = 3;
              }
            }
          });

          scene.add(cloud);
          this.heroClouds.push({
            group: cloud,
            drift: wind[p.layer - 1] ?? new THREE.Vector3(0.5, 0, 0),
          });
        }
      },
      undefined,
      (err) => console.warn("No se pudo cargar la nube 3D hero en Scenery:", err)
    );
  }

  // ── Faro Atmosférico y Aguja Alpina (Blender bpy): Hito monumental de roca y luz
  private buildLighthouse(scene: THREE.Scene): void {
    const glbUrl = new URL("../../art/blender/faro-atmosferico.glb", import.meta.url).href;
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        const lighthouse = gltf.scene;
        // Escala monumental: la aguja de montaña se eleva ~135 m en el flanco del valle
        lighthouse.scale.setScalar(3.8);
        lighthouse.position.set(-115, 6, -135);
        lighthouse.rotation.y = 0.55;

        lighthouse.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = false;
            m.receiveShadow = false;
            if (m.material) {
              const mat = (m.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
              if (m.name.toLowerCase().includes("haz") || mat.name.toLowerCase().includes("haz")) {
                mat.transparent = true;
                mat.opacity = 0.28;
                mat.depthWrite = false;
                mat.blending = THREE.AdditiveBlending;
              }
              m.material = mat;
            }
          }
          if (child.name === "Faro_Linterna_Giratoria") {
            this.faroRotator = child;
          }
        });

        scene.add(lighthouse);
      },
      undefined,
      (err) => console.warn("No se pudo cargar el faro atmosférico en Scenery:", err)
    );
  }

  // ── Lenticulares (capa 3): pilas de discos aplanados. Trivial.
  private buildLenticulars(scene: THREE.Scene, rng: () => number): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xe8f2fc,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    for (let s = 0; s < 3; s++) {
      const cx = (rng() - 0.5) * 300;
      const cz = (rng() - 0.5) * 300;
      const cy = 330 + rng() * 90;
      const stack = new THREE.Group();
      const n = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const disc = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 8), mat);
        const w = (26 - i * 5) * (0.8 + rng() * 0.4);
        disc.scale.set(w, 2.2, w * 0.8);
        disc.position.set((rng() - 0.5) * 6, i * 4.4, (rng() - 0.5) * 6);
        stack.add(disc);
      }
      stack.position.set(cx, cy, cz);
      scene.add(stack);
    }
  }

  // ── Aves: golondrinas/gansos en V (capas 1–2, 40) y halcones (capa 3, 6).
  // Cuerpo + 2 alas instanciados (3 dc por bandada), aleteo por fase en CPU.
  private buildBirds(scene: THREE.Scene, rng: () => number): void {
    this.birds.push(
      new BirdFlock(scene, rng, {
        count: 40, color: 0x2b2f36, size: 0.85, layerY: [18, 240],
        orbitR: [45, 85], speed: 0.045, flapHz: 2.4, vFormation: true,
      }),
      new BirdFlock(scene, rng, {
        count: 6, color: 0x3d2f22, size: 1.7, layerY: [315, 430],
        orbitR: [25, 55], speed: 0.06, flapHz: 0.7, vFormation: false,
      }),
    );
  }

  // ── Auroras (capa 4): cintas largas con ondas seno en vertex shader y
  // gradiente verde→magenta aditivo. 4 dc.
  private buildAuroras(scene: THREE.Scene, rng: () => number): void {
    const mat = new THREE.ShaderMaterial({
      uniforms: this.auroraUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z += sin(p.x * 0.045 + uTime * 0.35) * 7.0
               + sin(p.x * 0.11 - uTime * 0.22) * 3.0;
          p.y += sin(p.x * 0.06 + uTime * 0.18) * 4.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec3 green = vec3(0.15, 0.95, 0.55);
          vec3 magenta = vec3(0.85, 0.25, 0.85);
          vec3 col = mix(green, magenta, vUv.y);
          float cortina = 0.62 + 0.38 * sin(vUv.x * 40.0 + uTime * 0.7 + vUv.y * 4.0);
          float a = (1.0 - abs(vUv.y - 0.45) * 1.8) * 0.55 * cortina;
          gl_FragColor = vec4(col, max(a, 0.0));
          #include <colorspace_fragment>
        }
      `,
    });
    for (let i = 0; i < 4; i++) {
      const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(240, 34, 72, 1), mat);
      const a = rng() * Math.PI * 2;
      const r = 150 + rng() * 130;
      ribbon.position.set(Math.cos(a) * r, 505 + rng() * 75, Math.sin(a) * r);
      ribbon.rotation.y = a + Math.PI / 2 + (rng() - 0.5) * 0.6;
      ribbon.renderOrder = 3;
      scene.add(ribbon);
    }
  }

  // ── Globos sonda / dirigibles lejanos (todas las capas): 3 modelos, deriva.
  private buildBalloons(scene: THREE.Scene, rng: () => number): void {
    const place = (g: THREE.Group, y: number) => {
      const a = rng() * Math.PI * 2;
      const r = 200 + rng() * 240;
      g.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      scene.add(g);
      this.balloons.push({
        group: g,
        drift: new THREE.Vector3(Math.cos(a + 1.4), 0, Math.sin(a + 1.4)).multiplyScalar(
          PHYSICS.windSpeed * (0.5 + rng()),
        ),
      });
    };
    place(makeSondeBalloon(0xd8b46a), 120 + rng() * 80);
    place(makeSondeBalloon(0xa8c4e0), 380 + rng() * 60);
    place(makeDirigible(), 240 + rng() * 60);
    place(makeBoxKite(), 60 + rng() * 50);
  }

  // ── Gran Ballena Celeste (Blender bpy): El Leviatán del Éter (capa 5, +675m)
  // Cetáceo rorcual de 26m con alas de manta marina, cresta bioluminiscente y arnés de latón.
  private whale: THREE.Group | null = null;
  private whaleWingLeft: THREE.Object3D | null = null;
  private whaleWingRight: THREE.Object3D | null = null;
  private whaleTailFin: THREE.Object3D | null = null;
  private whalePulseMaterials: THREE.MeshStandardMaterial[] = [];
  private whaleAngle = 0;
  private readonly whaleOrbitR = 50;
  private readonly whaleY = 675;
  private readonly whaleSpeed = 0.016; // rad/s — cruza sereno el campo visual
  readonly whaleVelocity = new THREE.Vector3();

  activateWhale(scene: THREE.Scene): void {
    if (this.whale) return;
    const g = new THREE.Group();
    g.position.set(this.whaleOrbitR, this.whaleY, 0);
    scene.add(g);
    this.whale = g;
    this.whaleAngle = 0;

    const glbUrl = new URL(
      "../../art/blender/ballena-celeste/ballena-celeste.glb",
      import.meta.url,
    ).href;
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        const whaleModel = gltf.scene;
        whaleModel.scale.setScalar(1.0);

        whaleModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = false;
            m.receiveShadow = false;
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            for (const mat of mats) {
              const name = (mat.name || "").toLowerCase();
              const isPulseMaterial = name.includes("cresta") || name.includes("núcleo") || name.includes("nucleo");
              if (
                isPulseMaterial &&
                (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial &&
                !this.whalePulseMaterials.includes(mat as THREE.MeshStandardMaterial)
              ) {
                this.whalePulseMaterials.push(mat as THREE.MeshStandardMaterial);
              }
            }
          }
          if (child.name === "Aleta_Pectoral_Izq") {
            this.whaleWingLeft = child;
          } else if (child.name === "Aleta_Pectoral_Der") {
            this.whaleWingRight = child;
          } else if (child.name === "Aleta_Cola") {
            this.whaleTailFin = child;
          }
        });

        g.add(whaleModel);
      },
      undefined,
      (err) => console.warn("No se pudo cargar la Ballena Celeste en Scenery:", err)
    );
  }

  get whaleActive(): boolean {
    return this.whale !== null;
  }

  /** Punto del lomo donde cuelga la cuerda de linternas del acorde 13 (§7.5). */
  whaleBack(target: THREE.Vector3): THREE.Vector3 {
    if (!this.whale) return target.set(0, this.whaleY, 0);
    // Anillo de latón victoriano en el lomo (0, 4.2, 0 en espacio local de la ballena)
    return target.set(0, 4.2, 0).applyMatrix4(this.whale.matrixWorld);
  }

  update(dt: number, playerPos: THREE.Vector3, elapsed: number): void {
    this.seaUniforms.uTime.value = elapsed;
    this.auroraUniforms.uTime.value = elapsed;

    if (this.whale) {
      this.whaleAngle += this.whaleSpeed * dt;
      const a = this.whaleAngle;
      const prev = this.whale.position.clone();
      this.whale.position.set(
        Math.cos(a) * this.whaleOrbitR,
        this.whaleY + Math.sin(elapsed * 0.18) * 4,
        Math.sin(a) * this.whaleOrbitR,
      );
      this.whaleVelocity.copy(this.whale.position).sub(prev).divideScalar(Math.max(dt, 1e-4));

      // Orientación hacia el rumbo de avance con Three.js lookAt
      const forward = this.whale.position.clone().add(this.whaleVelocity);
      this.whale.lookAt(forward);
      // Alabeo suave en las curvas
      this.whale.rotateZ(Math.sin(elapsed * 0.35) * 0.05);
      this.whale.updateMatrixWorld();

      // Animación viva de nado (contrato de ENTREGA.md): aleteo Z en espejo ±0.16 rad
      // a 0.10 ciclos/s (izq fase 0, der fase π); cola X ±0.16 rad a 0.12 ciclos/s,
      // desfasada π/2. Límite comprobado por Astra: ±0.2 rad.
      if (this.whaleWingLeft && this.whaleWingRight) {
        const wingFlap = 0.16 * Math.sin(elapsed * Math.PI * 2 * 0.1);
        this.whaleWingLeft.rotation.z = wingFlap;
        this.whaleWingRight.rotation.z = -wingFlap;
      }
      if (this.whaleTailFin) {
        this.whaleTailFin.rotation.x = 0.16 * Math.sin(elapsed * Math.PI * 2 * 0.12 + Math.PI / 2);
      }
      // Pulso de crestas bioluminiscentes y núcleo: intensidad 2.5 ±0.5 a 0.08 ciclos/s.
      if (this.whalePulseMaterials.length) {
        const pulse = 2.5 + 0.5 * Math.sin(elapsed * Math.PI * 2 * 0.08);
        for (const mat of this.whalePulseMaterials) mat.emissiveIntensity = pulse;
      }
    }

    // Cúmulos: deriva por capa + wrap horizontal en la caja del mundo.
    for (let k = 0; k < this.cloudMeshes.length; k++) {
      const mesh = this.cloudMeshes[k];
      const data = this.cloudData[k];
      for (let i = 0; i < data.length; i++) {
        mesh.getMatrixAt(i, this.dummy.matrix);
        this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);
        this.dummy.position.addScaledVector(data[i].drift, dt * 0.6);
        if (this.dummy.position.x > CLOUD_WRAP) this.dummy.position.x -= CLOUD_WRAP * 2;
        if (this.dummy.position.x < -CLOUD_WRAP) this.dummy.position.x += CLOUD_WRAP * 2;
        if (this.dummy.position.z > CLOUD_WRAP) this.dummy.position.z -= CLOUD_WRAP * 2;
        if (this.dummy.position.z < -CLOUD_WRAP) this.dummy.position.z += CLOUD_WRAP * 2;
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    for (const hc of this.heroClouds) {
      hc.group.position.addScaledVector(hc.drift, dt * 0.4);
      if (hc.group.position.x > CLOUD_WRAP) hc.group.position.x -= CLOUD_WRAP * 2;
      if (hc.group.position.x < -CLOUD_WRAP) hc.group.position.x += CLOUD_WRAP * 2;
      if (hc.group.position.z > CLOUD_WRAP) hc.group.position.z -= CLOUD_WRAP * 2;
      if (hc.group.position.z < -CLOUD_WRAP) hc.group.position.z += CLOUD_WRAP * 2;
    }

    if (this.faroRotator) {
      this.faroRotator.rotation.z += dt * 0.85;
    }

    for (const flock of this.birds) flock.update(dt, elapsed);

    for (const b of this.balloons) {
      b.group.position.addScaledVector(b.drift, dt);
      b.group.rotation.y += dt * 0.02;
      const r = Math.hypot(b.group.position.x, b.group.position.z);
      if (r > 480) b.group.position.multiplyScalar(-0.9); // reaparece al otro lado
    }
    void playerPos;
  }
}

// Bandada instanciada: cuerpo (cono) + 2 alas (triángulo) = 3 dc, aleteo CPU.
interface FlockOpts {
  count: number;
  color: number;
  size: number;
  layerY: [number, number];
  orbitR: [number, number];
  speed: number;
  flapHz: number;
  vFormation: boolean;
}

class BirdFlock {
  private body: THREE.InstancedMesh;
  private wingL: THREE.InstancedMesh;
  private wingR: THREE.InstancedMesh;
  private states: { cx: number; cz: number; y: number; r: number; a0: number; phase: number }[] = [];
  private dummy = new THREE.Object3D();
  private wing = new THREE.Object3D();

  constructor(scene: THREE.Scene, rng: () => number, private opts: FlockOpts) {
    const mat = new THREE.MeshStandardMaterial({ color: opts.color, roughness: 0.9 });
    const bodyGeo = new THREE.ConeGeometry(0.16, 1.1, 5);
    bodyGeo.rotateX(Math.PI / 2); // punta hacia −z... hacia el frente de vuelo
    const wingGeo = makeWingGeometry();

    this.body = new THREE.InstancedMesh(bodyGeo, mat, opts.count);
    this.wingL = new THREE.InstancedMesh(wingGeo, mat, opts.count);
    this.wingR = new THREE.InstancedMesh(wingGeo, mat, opts.count);
    scene.add(this.body, this.wingL, this.wingR);

    // Escuadrones: en V (skeins) o solitarios en órbita.
    const squads = opts.vFormation ? 2 : opts.count;
    for (let i = 0; i < opts.count; i++) {
      const squad = opts.vFormation ? i % squads : i;
      const sr = makeRng((WORLD.seed ^ 0xb12d) + squad * 97);
      const cx = (sr() - 0.5) * 120;
      const cz = (sr() - 0.5) * 120;
      const y = opts.layerY[0] + sr() * (opts.layerY[1] - opts.layerY[0]);
      const r = opts.orbitR[0] + sr() * (opts.orbitR[1] - opts.orbitR[0]);
      // En V: offset angular escalonado dentro del skein.
      const rank = opts.vFormation ? Math.floor(i / squads) : 0;
      const side = i % 2 === 0 ? 1 : -1;
      const a0 = sr() * Math.PI * 2 - (opts.vFormation ? rank * 0.045 * side : 0);
      this.states.push({
        cx, cz,
        y: y + (opts.vFormation ? rank * 0.5 * side * 0.3 : 0),
        r: r + (opts.vFormation ? rank * 1.6 : 0),
        a0,
        phase: rng() * Math.PI * 2,
      });
    }
  }

  update(dt: number, elapsed: number): void {
    void dt;
    const { speed, flapHz, size } = this.opts;
    for (let i = 0; i < this.states.length; i++) {
      const s = this.states[i];
      const a = s.a0 + elapsed * speed * Math.PI * 2;
      const x = s.cx + Math.cos(a) * s.r;
      const z = s.cz + Math.sin(a) * s.r;
      // Rumbo tangente a la órbita.
      this.dummy.position.set(x, s.y, z);
      this.dummy.rotation.set(0, -a - Math.PI / 2, 0);
      this.dummy.scale.setScalar(size);
      this.dummy.updateMatrix();
      this.body.setMatrixAt(i, this.dummy.matrix);

      const flap = Math.sin(elapsed * flapHz * Math.PI * 2 + s.phase) * 0.85;
      for (const [mesh, side] of [
        [this.wingL, 1],
        [this.wingR, -1],
      ] as const) {
        this.wing.position.set(0, 0, 0);
        this.wing.rotation.set(0, 0, side * flap);
        this.wing.scale.set(side, 1, 1); // espejo del ala
        this.wing.updateMatrix();
        this.wing.matrix.premultiply(this.dummy.matrix);
        mesh.setMatrixAt(i, this.wing.matrix);
      }
    }
    this.body.instanceMatrix.needsUpdate = true;
    this.wingL.instanceMatrix.needsUpdate = true;
    this.wingR.instanceMatrix.needsUpdate = true;
  }
}

// Ala: triángulo saliendo del hombro (+x), plano XZ.
function makeWingGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const verts = new Float32Array([
    0, 0, -0.25,
    0, 0, 0.25,
    1.05, 0, 0.05,
  ]);
  geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

// Textura de nube: gradiente radial + agujeros de ruido. 3 variantes compartidas.
function makeCloudTexture(rng: () => number, variant: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;
  const blobs = 10 + variant * 4;
  for (let i = 0; i < blobs; i++) {
    const x = 20 + rng() * 88;
    const y = 26 + rng() * 34 + Math.sin(i) * 6;
    const r = 12 + rng() * 20;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.16 + rng() * 0.2;
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.7, `rgba(246,248,252,${a * 0.5})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return new THREE.CanvasTexture(canvas);
}

// Globo sonda: esfera + canastilla + cable.
function makeSondeBalloon(color: number): THREE.Group {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(6, 14, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
  );
  g.add(ball);
  const line = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 7, 4),
    new THREE.MeshBasicMaterial({ color: 0x2a2a2a }),
  );
  line.position.y = -9;
  g.add(line);
  const basket = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.2, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 1 }),
  );
  basket.position.y = -13;
  g.add(basket);
  g.scale.setScalar(2.2);
  return g;
}

// Dirigible: elipsoide + góndola + aletas.
function makeDirigible(): THREE.Group {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, roughness: 0.55 });
  const hull = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 10), hullMat);
  hull.scale.set(2.6, 1, 1);
  g.add(hull);
  const gondola = new THREE.Mesh(
    new THREE.BoxGeometry(5, 1.4, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x40342a, roughness: 1 }),
  );
  gondola.position.y = -6.2;
  g.add(gondola);
  const finMat = new THREE.MeshStandardMaterial({ color: 0x9a3c30, roughness: 0.8 });
  for (const [ry, rz] of [[0, 0], [0, Math.PI / 2]] as const) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 0.3), finMat);
    fin.position.x = -13.5;
    fin.rotation.set(rz, ry, 0);
    g.add(fin);
  }
  g.scale.setScalar(2.4);
  return g;
}

// Cometa caja: dos prismas abiertos.
function makeBoxKite(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xd8683c,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  for (const dz of [-2.4, 2.4]) {
    const cell = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.2, 4, 1, true), mat);
    cell.rotation.x = Math.PI / 2;
    cell.position.z = dz;
    g.add(cell);
  }
  g.scale.setScalar(2.0);
  return g;
}
