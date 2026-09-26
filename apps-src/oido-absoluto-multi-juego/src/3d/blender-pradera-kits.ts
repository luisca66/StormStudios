import rocksUrl from "./assets/rocas-pradera.glb?url";
import hedgesUrl from "./assets/setos.glb?url";
import wallUrl from "./assets/muralla.glb?url";
import { loadKit } from "./blender-kit-field";

// Kits de La Pradera (art/blender/<kit>/). Rocas: Gemini, kit.export_glb; partes rock_a, rock_b, rock_c.
export const rocksKit = loadKit(rocksUrl, "Rocas");
export const ROCK_PARTS = ["rock_a", "rock_b", "rock_c"];

// Setos: Gemini; hedge_long (4 m), hedge_short (2 m) a lo largo de X, y topiary en maceta.
export const hedgesKit = loadKit(hedgesUrl, "Setos");

// Muralla: Gemini; wall_segment (tramo de 8 m a lo largo de X) y wall_tower.
export const wallKit = loadKit(wallUrl, "Muralla");
