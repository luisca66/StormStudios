import "./styles.css";
import { detectLang } from "./i18n";
import { GameController } from "./game/controller";
import { mountUI } from "./ui/render";

const lang = detectLang();
document.documentElement.lang = lang;

const root = document.getElementById("app");
if (!root) throw new Error("No se encontró el contenedor #app");

const controller = new GameController(lang);
mountUI(root, controller, lang);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) controller.releaseMicrophone();
});
window.addEventListener("pagehide", () => controller.releaseMicrophone());
window.addEventListener("beforeunload", () => controller.releaseMicrophone());
