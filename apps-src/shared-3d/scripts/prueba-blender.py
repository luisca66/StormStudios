"""Prueba de la fase B en la PC de Luis: kit.export_glb con y sin oclusión ambiental.

No toca ningún archivo del repo: abre cangrejo.blend, exporta a apps-src/shared-3d/.cache/prueba-blender/
y comprueba que export_parts siga dando el mismo JSON que el publicado.

    powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\Luis\\blender-bpy\\bpy-run.ps1 apps-src\\shared-3d\\scripts\\prueba-blender.py

Requiere Node en el PATH y `npm install` en apps-src/shared-3d.
"""
import json
import sys
import time
from pathlib import Path

import bpy

SHARED = Path(__file__).resolve().parents[1]
APPS = SHARED.parent
sys.path.insert(0, str(APPS / "grados-mayores-juego" / "art" / "blender"))
import kit  # noqa: E402

OUT = SHARED / ".cache" / "prueba-blender"
OUT.mkdir(parents=True, exist_ok=True)
CRAB = APPS / "oido-absoluto-multi-juego" / "art" / "blender" / "cangrejo"

bpy.ops.wm.open_mainfile(filepath=str(CRAB / "cangrejo.blend"))
published = json.loads((APPS / "oido-absoluto-multi-juego" / "src" / "3d" / "assets" / "cangrejo.json").read_text(encoding="utf-8"))
meta = {k: v for k, v in published.items() if k not in ("meshes", "generator", "axis", "triangles")}
order = [m["name"] for m in published["meshes"]]
objects = sorted([o for o in bpy.context.scene.objects if o.type == "MESH" and "part" in o], key=lambda o: order.index(o.name))
names_before = [o.name for o in objects]
count_before = len(bpy.data.objects)
render_before = {o.name: o.hide_render for o in bpy.data.objects}

ok = True
def check(label, condition, detail=""):
    global ok
    ok &= bool(condition)
    print(("OK    " if condition else "FALLA ") + label + (f"  ({detail})" if detail else ""))

kit.export_parts(OUT / "cangrejo.json", objects=objects, meta=meta)
again = json.loads((OUT / "cangrejo.json").read_text(encoding="utf-8"))
check("export_parts reproduce el JSON publicado",
      all(a["position"] == b["position"] and a["index"] == b["index"] and a.get("vertexColor") == b.get("vertexColor")
          for a, b in zip(published["meshes"], again["meshes"])))

for pack in ("none", "meshopt", "meshopt-q"):
    parts, tris, size = kit.export_glb(OUT / f"cangrejo.{pack}.glb", objects=objects, meta=meta, pack=pack)
    check(f"export_glb {pack}", size > 0 and parts == 14 and tris == published["triangles"], f"{size / 1024:.0f} KB, {tris} tri")

start = time.time()
parts, tris, size = kit.export_glb(OUT / "cangrejo-ao.glb", objects=objects, meta=meta,
                                   ao={"distance": 0.6, "strength": 0.85, "samples": 64},
                                   json_path=OUT / "cangrejo-ao.json")
check("export_glb con AO horneada", size > 0 and tris == published["triangles"], f"{size / 1024:.0f} KB, {time.time() - start:.1f} s")
check("la escena queda intacta", [o.name for o in objects] == names_before and len(bpy.data.objects) == count_before
      and {o.name: o.hide_render for o in bpy.data.objects} == render_before)

print("\nTODO BIEN" if ok else "\nHAY FALLAS: mándale a Claude la salida completa")
print(f"Archivos en {OUT}. Para verlos: npm run dev en apps-src/shared-3d y arrastra el .glb a la ventana.")
