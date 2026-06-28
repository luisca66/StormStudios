import * as THREE from "three";
import { GameStateManager } from "@/game/state";

export class SearchRadar {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private searchTime = 0;
  private isSearching = false;
  private noteCollisionThreshold = 3.2; // meters
  private radarRadius = 72; // pixels
  private worldRange = 150.0; // meters representing radar border
  private searchHintDelay = 60.0; // seconds before showing radar (pedagogical: see Godot SearchRadar.gd)

  // Colors corresponding to note index (C to B)
  private noteColors = [
    "#ff0000", "#ff4500", "#ffa500", "#ffd700", "#ffff00", "#9acd32",
    "#008000", "#00ced1", "#0000ff", "#8a2be2", "#ee82ee", "#c71585"
  ];

  constructor(private stateManager: GameStateManager) {
    // A search begins when a note SPAWNS (or is relocated after a miss), which the
    // renderer signals via resetSearch() — mirroring Godot's NoteSpawner.search_restarted.
    // Here we only tear the radar down when gameplay isn't active.
    this.stateManager.subscribe((state) => {
      if (!state.isPlaying || state.activeScreen !== "gameplay") {
        this.isSearching = false;
        const canvas = document.getElementById("radar-canvas") as HTMLCanvasElement | null;
        if (canvas) canvas.style.display = "none";
      }
    });
  }

  public resetSearch(): void {
    this.searchTime = 0;
    this.isSearching = true;
    const canvas = document.getElementById("radar-canvas") as HTMLCanvasElement | null;
    if (canvas) canvas.style.display = "none";
  }

  public update(delta: number, playerPos: THREE.Vector3 | null, notePos: THREE.Vector3 | null, camera: THREE.PerspectiveCamera): void {
    const canvas = document.getElementById("radar-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d")!;

    if (!this.isSearching || !playerPos || !notePos) {
      this.canvas.style.display = "none";
      return;
    }

    // Check if player reached the note
    const dist = playerPos.distanceTo(notePos);
    if (dist < this.noteCollisionThreshold) {
      this.canvas.style.display = "none";
      return;
    }

    // Increment time
    this.searchTime += delta;

    if (this.searchTime >= this.searchHintDelay) {
      this.canvas.style.display = "block";
      this.draw(playerPos, notePos, camera);
    } else {
      this.canvas.style.display = "none";
    }
  }

  private draw(playerPos: THREE.Vector3, notePos: THREE.Vector3, camera: THREE.PerspectiveCamera): void {
    const ctx = this.ctx;
    const center = this.radarRadius;

    // Clear Canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Background
    ctx.beginPath();
    ctx.arc(center, center, this.radarRadius - 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(7, 16, 24, 0.55)";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(103, 214, 255, 0.4)";
    ctx.stroke();

    // Cross lines
    ctx.beginPath();
    ctx.moveTo(center - this.radarRadius + 5, center);
    ctx.lineTo(center + this.radarRadius - 5, center);
    ctx.moveTo(center, center - this.radarRadius + 5);
    ctx.lineTo(center, center + this.radarRadius - 5);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw Player Triangle in Center (facing UP)
    ctx.fillStyle = "#8a2be2";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(center, center - 8);
    ctx.lineTo(center - 5, center + 6);
    ctx.lineTo(center + 5, center + 6);
    ctx.closePath();
    ctx.fill();

    // Calculate relative horizontal direction of the note
    const deltaW = notePos.clone().sub(playerPos);
    
    // Camera forward and right vectors
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const rgt = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    
    // Project vectors on horizontal plane (y=0)
    fwd.y = 0;
    rgt.y = 0;
    fwd.normalize();
    rgt.normalize();

    // Compute relative offsets
    const dx = deltaW.dot(rgt);
    const dz = -deltaW.dot(fwd); // Invert since -Z is forward

    // Map world distance (0 to 150m) to radar pixels (0 to radarRadius-6)
    const scale = (this.radarRadius - 6) / this.worldRange;
    let rx = dx * scale;
    let rz = dz * scale;

    // Clamp inside radar circle boundary
    const blipDist = Math.sqrt(rx*rx + rz*rz);
    const maxBlipDist = this.radarRadius - 8;
    if (blipDist > maxBlipDist) {
      rx = (rx / blipDist) * maxBlipDist;
      rz = (rz / blipDist) * maxBlipDist;
    }

    const blipX = center + rx;
    const blipY = center + rz; // mapped dz to canvas Y coordinate

    // Draw Blip Dot
    const challengeNote = this.stateManager.getState().currentChallenge;
    const noteIndex = challengeNote ? challengeNote.note_index : 0;
    const noteColor = this.noteColors[noteIndex] || "#ffffff";

    // Glow ring
    ctx.beginPath();
    ctx.arc(blipX, blipY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = noteColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Core dot
    ctx.beginPath();
    ctx.arc(blipX, blipY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = noteColor;
    ctx.shadowColor = noteColor;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Chevrons (Pitch altitude check)
    const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const dy = deltaW.dot(cameraUp);
    const vertThreshold = 4.0; // meters

    ctx.fillStyle = noteColor;
    if (dy > vertThreshold) {
      // Draw UP Chevron above the blip dot
      ctx.beginPath();
      ctx.moveTo(blipX, blipY - 14);
      ctx.lineTo(blipX - 4, blipY - 9);
      ctx.lineTo(blipX + 4, blipY - 9);
      ctx.closePath();
      ctx.fill();
    } else if (dy < -vertThreshold) {
      // Draw DOWN Chevron below the blip dot
      ctx.beginPath();
      ctx.moveTo(blipX, blipY + 14);
      ctx.lineTo(blipX - 4, blipY + 9);
      ctx.lineTo(blipX + 4, blipY + 9);
      ctx.closePath();
      ctx.fill();
    }
  }
}
