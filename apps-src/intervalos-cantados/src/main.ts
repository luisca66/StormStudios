import "./styles.css";
import { AudioEngine } from "@/audio/engine";
import { MicPitchDetector } from "@/audio/pitch";
import { GameController } from "@/game/controller";
import { detectLang } from "@/i18n";
import { mountUI } from "@/ui/render";

const lang = detectLang();
document.documentElement.lang = lang;

const root = document.getElementById("app");
if (!root) throw new Error("No se encontro el contenedor #app");

const audio = new AudioEngine();
const mic = new MicPitchDetector(audio.context());
const controller = new GameController(lang, audio, mic);
mountUI(root, controller);
