import { preloadBlenderJellyfish } from "./3d/creatures/blender-jellyfish";
import { preloadBlenderSchool } from "./3d/creatures/blender-school";
import { preloadBlenderSquid } from "./3d/creatures/blender-squid";
import { preloadBlenderAngler } from "./3d/creatures/blender-angler";
import { preloadBlenderDumbo } from "./3d/creatures/blender-dumbo";
import { preloadBlenderSiphonophore } from "./3d/creatures/blender-siphonophore";
import { preloadBlenderLeviathan } from "./3d/creatures/blender-leviathan";
import { preloadCockpit } from "./3d/cockpit";
import { preloadBlenderShipwreck } from "./3d/blender-shipwreck";
import { preloadBlenderArches } from "./3d/blender-arches";

const start = document.querySelector<HTMLButtonElement>("#start-btn")!;
const label = start.textContent;
start.disabled = true;
start.textContent = "Cargando criaturas…";

async function boot(): Promise<void> {
  try {
    await Promise.all([preloadBlenderJellyfish(), preloadBlenderSchool(), preloadBlenderSquid(), preloadBlenderAngler(), preloadBlenderDumbo(), preloadBlenderSiphonophore(), preloadBlenderLeviathan(), preloadCockpit(), preloadBlenderShipwreck(), preloadBlenderArches()]);
    start.textContent = label;
    await import("./main");
    start.disabled = false;
  } catch (error) {
    console.error("No se pudo iniciar Batisfera", error);
    start.disabled = false;
    start.textContent = "Reintentar carga";
    start.addEventListener("click", () => {
      start.disabled = true;
      start.textContent = "Cargando criaturas…";
      void boot();
    }, { once: true });
  }
}

void boot();
