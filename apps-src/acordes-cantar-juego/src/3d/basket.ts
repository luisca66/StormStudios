// La canastilla (PLAN §6): hijos de la cámara — borde de mimbre al mirar abajo,
// 4 cuerdas subiendo, y al mirar arriba la boca del globo con el QUEMADOR que
// ruge (escala + brillo de llama). Es el "efecto firma" del juego.

import * as THREE from "three";

export class Basket {
  private flame: THREE.Sprite;
  private flameBase = 0.9;
  private burn = 0; // 0..1 intensidad actual (suavizada)
  private burstT = 0; // rugido puntual (cuerda completada)

  constructor(camera: THREE.PerspectiveCamera) {
    const group = new THREE.Group();

    // Borde de la canastilla: toro + pared baja con textura de mimbre.
    const wicker = makeWickerTexture();
    const rimMat = new THREE.MeshStandardMaterial({ map: wicker, color: 0xa9834f, roughness: 0.9 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.09, 8, 24), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -1.05;
    group.add(rim);
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(1.18, 1.1, 0.85, 20, 1, true),
      new THREE.MeshStandardMaterial({
        map: wicker,
        color: 0x8d6b3e,
        roughness: 1,
        side: THREE.BackSide,
      }),
    );
    wall.position.y = -1.5;
    group.add(wall);

    // 4 cuerdas hacia el globo, fuera del encuadre.
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 0.9 });
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 5.4, 5), ropeMat);
      rope.position.set(x * 1.02, 1.4, z * 1.02);
      rope.rotation.z = -x * 0.16;
      rope.rotation.x = z * 0.16;
      group.add(rope);
    }

    // Boca del globo al mirar arriba: disco interior con gradiente cálido.
    const mouth = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 28),
      new THREE.MeshBasicMaterial({ map: makeMouthTexture(), side: THREE.DoubleSide, fog: false }),
    );
    mouth.rotation.x = Math.PI / 2;
    mouth.position.y = 4.6;
    group.add(mouth);

    // Quemador: cono de latón + llama (sprite aditivo).
    const burner = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x8c6f2f, metalness: 0.6, roughness: 0.4 }),
    );
    burner.position.y = 1.9;
    group.add(burner);

    this.flame = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeFlameTexture(),
        color: 0xffc46a,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.55,
      }),
    );
    this.flame.position.y = 2.35;
    this.flame.scale.set(0.5, 0.9, 1);
    group.add(this.flame);

    camera.add(group);
  }

  /** Rugido puntual (cuerda completada §7.1). */
  burst(): void {
    this.burstT = 1;
  }

  /** intensity 0..1 (ascenso actual). Anima llama: escala + brillo + flicker. */
  update(dt: number, elapsed: number, intensity: number): void {
    this.burstT = Math.max(0, this.burstT - dt * 1.4);
    const target = Math.max(intensity, this.burstT);
    this.burn += (target - this.burn) * Math.min(1, 6 * dt);
    const flicker = 0.9 + Math.sin(elapsed * 31) * 0.06 + Math.sin(elapsed * 47) * 0.05;
    const k = this.flameBase * (0.45 + this.burn * 1.5) * flicker;
    this.flame.scale.set(0.45 * k, 1.0 * k, 1);
    const mat = this.flame.material as THREE.SpriteMaterial;
    mat.opacity = 0.35 + this.burn * 0.6;
  }
}

function makeWickerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#7a5a33";
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = "rgba(60,40,18,0.7)";
  ctx.lineWidth = 3;
  for (let x = -8; x < 140; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, -4);
    ctx.lineTo(x + 20, 68);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 20, -4);
    ctx.lineTo(x, 68);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(210,175,120,0.35)";
  ctx.lineWidth = 1.4;
  for (let y = 4; y < 64; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  return tex;
}

function makeMouthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "#ffdba0");
  g.addColorStop(0.3, "#c86a2e");
  g.addColorStop(0.75, "#5a2c14");
  g.addColorStop(1, "#2a140a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  // Gajos de la tela.
  ctx.strokeStyle = "rgba(30,12,6,0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.lineTo(64 + Math.cos(a) * 64, 64 + Math.sin(a) * 64);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

function makeFlameTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 60, 2, 32, 52, 46);
  g.addColorStop(0, "rgba(255,255,235,1)");
  g.addColorStop(0.25, "rgba(255,210,110,0.9)");
  g.addColorStop(0.6, "rgba(255,130,40,0.45)");
  g.addColorStop(1, "rgba(255,90,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 96);
  return new THREE.CanvasTexture(canvas);
}
