// metal-env.ts — Reflejo compartido para los metales modelados en Blender.
//
// La escena no tiene envMap y un latón con metalness alto sin entorno se ve negro. Este
// equirect de canvas (cielo · ventanal · madera) les da un brillo cálido; Three lo
// pre-filtra solo al usarlo en MeshStandardMaterial. Una sola textura para todo el juego.

import * as THREE from "three";

let texture: THREE.Texture | null = null;

export function metalEnvironment(): THREE.Texture {
  if (texture) return texture;
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 128);
  sky.addColorStop(0, "#cfe2ee");
  sky.addColorStop(0.42, "#f4efe0");
  sky.addColorStop(0.55, "#7a5a3e");
  sky.addColorStop(1, "#2a1a12");
  g.fillStyle = sky;
  g.fillRect(0, 0, 256, 128);
  // Una banda luminosa al frente (-Z queda en el centro del equirect).
  g.fillStyle = "rgba(255, 250, 235, 0.85)";
  g.fillRect(88, 30, 80, 30);
  texture = new THREE.CanvasTexture(c);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
