import "./style.css";
import { AudioEngine } from "./audio/engine";
import { GameStateManager } from "./game/state";
import { Game3DRenderer } from "./3d/renderer";
import { mountUI } from "./ui/screens";

// 1. Initialize Audio Engine
const audio = new AudioEngine();

// 2. Initialize Game State Manager
const stateManager = new GameStateManager(audio);

// 3. Initialize 3D WebGL Renderer (pointing to the #game-canvas element)
const renderer = new Game3DRenderer("game-canvas", stateManager);

// 4. Mount the HTML Overlay screens (Menu, Setup, Warmup, HUD, Victory)
const uiRoot = document.getElementById("app");
if (!uiRoot) throw new Error("Could not find DOM element #app to mount the user interface");

mountUI(
  uiRoot, 
  stateManager,
  (isCorrect: boolean) => {
    // Note answered callback
    // If incorrect, the HUD will display error and trigger a player reset
  },
  () => {
    // Reset challenge callback (teleports player to start and moves note)
    renderer.resetChallengePosition();
  },
  () => {
    // Spawn next challenge callback
    renderer.spawnNextChallenge();
  }
);

// Unlock audio playback on first user click or touch
const unlockAudio = () => {
  // Set volume and start hidden checks
  audio.setVolume(stateManager.getState().volume);
  
  // Remove handlers once unlocked
  document.removeEventListener("click", unlockAudio);
  document.removeEventListener("keydown", unlockAudio);
  document.removeEventListener("touchstart", unlockAudio);
};
document.addEventListener("click", unlockAudio);
document.addEventListener("keydown", unlockAudio);
document.addEventListener("touchstart", unlockAudio);

console.log("Walking AP Multi initialized successfully.");
