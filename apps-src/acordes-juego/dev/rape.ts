import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildBlenderAngler, preloadBlenderAngler } from "../src/3d/creatures/blender-angler";
import { Creature } from "../src/3d/creatures/base";
import { CHORD_BY_ID } from "../src/music/chords";
import { FAMILY_GLOW } from "../src/config";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $<HTMLOutputElement>("status");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x061a27);
const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
camera.position.set(5, 2, 6);
const renderer = new THREE.WebGLRenderer({canvas:document.querySelector("canvas")!,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,0);controls.minDistance=3;controls.maxDistance=30;controls.enableDamping=true;controls.update();
const ambient = new THREE.AmbientLight(0xcfe8ff, .8);scene.add(ambient);
const sun = new THREE.DirectionalLight(0xdaedff, 2.1);sun.position.set(3,5,4);scene.add(sun);
const fill = new THREE.DirectionalLight(0x80dfc9, .9);fill.position.set(-3,1,-2);scene.add(fill);
const viewport = $("viewport");
new ResizeObserver(() => {const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(viewport);
let creature: Creature;
let paused=matchMedia("(prefers-reduced-motion: reduce)").matches;
let elapsed=0;
let ending=false;
const clock = new THREE.Clock();

function reset() {
  if(creature){scene.remove(creature.group);creature.dispose();}
  const ninth=$<HTMLSelectElement>("palette").value==="EXT_9";
  creature=new Creature(buildBlenderAngler(FAMILY_GLOW[ninth?"EXT_9":"SIXTHS"]),"angler",CHORD_BY_ID[ninth?"MAJOR_9":"MAJOR_6"],"C4");
  creature.setHome(new THREE.Vector3());scene.add(creature.group);ending=false;
  status.value="Modelo de Blender listo · reposo";
}

try {
  await preloadBlenderAngler();reset();
  $("pulse").onclick=()=>{creature.pulse(creature.chord.intervals.length);status.value="Destello por nota";};
  $("capture").onclick=()=>{creature.capture();ending=true;status.value="Captura en curso";};
  $("flee").onclick=()=>{creature.flee(camera.position);ending=true;status.value="Huida en curso";};
  $("reset").onclick=reset;$("palette").onchange=reset;
  const pause=$("pause");
  const syncPause=()=>{pause.textContent=paused?"Reanudar animación":"Pausar animación";pause.setAttribute("aria-pressed",String(paused));};
  syncPause();pause.onclick=()=>{paused=!paused;syncPause();};
  $("lighting").onchange=()=>{
    const light=$<HTMLSelectElement>("lighting").value;
    scene.background=new THREE.Color(light==="shallow"?0x2e86c1:light==="deep"?0x050d18:0x061a27);
    ambient.intensity=light==="shallow"?1:light==="deep"?.3:.8;
    sun.intensity=light==="shallow"?1.2:light==="deep"?0:2.1;
    fill.intensity=light==="studio"?.9:0;
  };
  let frames=0,total=0;
  renderer.setAnimationLoop(()=>{
    const realDt=clock.getDelta(),dt=Math.min(realDt,.05);
    controls.update();
    if(!paused){elapsed+=dt;
      if(!creature.update(dt,elapsed,camera.position))reset();
      // The specimen stays centered while idle; capture/flee use the game's real behavior.
      if(!ending)creature.group.position.set(0,0,0);
    }
    renderer.render(scene,camera);frames++;total+=realDt;
    if(total>1){$("stats").textContent=`${Math.round(frames/total)} FPS · ${renderer.info.render.triangles.toLocaleString("es-MX")} triángulos · ${renderer.info.render.calls} llamadas de dibujo`;frames=0;total=0;}
  });
} catch(error){status.value="No se pudo cargar el modelo. Recarga la página para reintentar.";console.error(error);}
