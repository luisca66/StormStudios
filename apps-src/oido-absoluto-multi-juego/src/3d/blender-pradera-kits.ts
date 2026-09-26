import rocksUrl from "./assets/rocas-pradera.glb?url";
import hedgesUrl from "./assets/setos.glb?url";
import wallUrl from "./assets/muralla.glb?url";
import gateUrl from "./assets/porton.glb?url";
import noteCubeUrl from "./assets/cubo-nota.glb?url";
import treesUrl from "./assets/arboles.glb?url";
import flowersUrl from "./assets/flores.glb?url";
import { loadKit } from "./blender-kit-field";

// Kits de La Pradera (art/blender/<kit>/). Rocas: Gemini, kit.export_glb; partes rock_a, rock_b, rock_c.
export const rocksKit = loadKit(rocksUrl, "Rocas");
export const ROCK_PARTS = ["rock_a", "rock_b", "rock_c"];

// Setos: Gemini; hedge_long (4 m), hedge_short (2 m) a lo largo de X, y topiary en maceta.
export const hedgesKit = loadKit(hedgesUrl, "Setos");

// Muralla: Gemini; wall_segment (tramo de 8 m a lo largo de X) y wall_tower.
export const wallKit = loadKit(wallUrl, "Muralla");

// Portón: Gemini; frame (estático) y door 0/1 con el pivote en su bisagra (x = ∓3, y = 2).
export const gateKit = loadKit(gateUrl, "Portón");

// Cubo de nota: Gemini; glow (gema que el juego tiñe) y frame (marco dorado), pivote en el centro.
export const noteCubeKit = loadKit(noteCubeUrl, "Cubo de nota");

// Árboles: Gemini; tree_round, tree_tall, tree_wide y bush, pivote en la base del tronco.
export const treesKit = loadKit(treesUrl, "Árboles");
export const TREE_PARTS = ["tree_round", "tree_round", "tree_tall", "tree_wide", "bush"];

// Flores y pasto: Gemini; cuatro matitas de flores por color y una mata de pasto.
export const flowersKit = loadKit(flowersUrl, "Flores");
export const FLOWER_PARTS = ["flower_yellow", "flower_pink", "flower_white", "flower_purple"];
