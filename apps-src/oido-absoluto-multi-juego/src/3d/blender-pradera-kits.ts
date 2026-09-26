import rocksUrl from "./assets/rocas-pradera.glb?url";
import { loadKit } from "./blender-kit-field";

// Kits de La Pradera (art/blender/<kit>/). Rocas: Gemini, kit.export_glb; partes rock_a, rock_b, rock_c.
export const rocksKit = loadKit(rocksUrl, "Rocas");
export const ROCK_PARTS = ["rock_a", "rock_b", "rock_c"];
