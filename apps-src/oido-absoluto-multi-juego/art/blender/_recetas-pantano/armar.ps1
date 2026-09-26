param(
  [string]$Name, [int]$Seed, [int]$Parts, [int]$MaxTris, [string]$Ao = "None", [string]$Note,
  [double]$Spacing = 3.0, [string]$Cam = "(0, -14, 5)", [string]$Look = "(0, 0, 1)", [string]$Bg = "2b4a44",
  [string]$Sun = "dff5e8", [switch]$Ground
)
# Arma y ejecuta una receta de Gemini: plantilla (cabecera y funciones) + modelo-<Name>.txt + limpieza/exportación/render.
$sp = $PSScriptRoot
$tpl = Get-Content "$sp\prueba-asteroides-cosmos\modelar-asteroides-cosmos.py" -Raw
$head = $tpl.Substring(0, $tpl.IndexOf('# --- funciones extra')).Replace('SEED = 42', "SEED = $Seed")
$tail = $tpl.Substring($tpl.IndexOf('# ------------------------------------------------------------------ LIMPIEZA'))
$tail = $tail.Replace('meta = dict(forward="+Z", note="kit instanciado; pivote en el centro; el juego escala 0.3-1.2")', "meta = dict(forward=`"+Z`", note=`"$Note`")")
$tail = $tail.Replace('"asteroides-cosmos-juego.glb"', "`"$Name-juego.glb`"").Replace('"asteroides-cosmos.json"', "`"$Name.json`"")
$tail = $tail.Replace('ao={"distance": 0.3, "strength": 0.6}', "ao=$Ao").Replace('assert parts == 3, parts', "assert parts == $Parts, parts").Replace('assert tris <= 2400, tris', "assert tris <= $MaxTris, tris")
$tail = $tail.Replace('* 2.5', "* $Spacing").Replace('cam.location = (0, -6, 1.5)', "cam.location = $Cam").Replace('Vector((0, 0, 0)) - cam.location', "Vector($Look) - cam.location")
$tail = $tail.Replace('"0b1438"', "`"$Bg`"").Replace('kit.lin("fff1d0")', "kit.lin(`"$Sun`")")
if ($Ground) {
  $tail = $tail.Replace('scene = bpy.context.scene', "bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))`ngm = bpy.data.materials.new(`"Barro`"); gm.use_nodes = True`ngm.node_tree.nodes[`"Principled BSDF`"].inputs[`"Base Color`"].default_value = (*kit.lin(`"4a4a2c`"), 1)`nbpy.context.object.data.materials.append(gm)`nscene = bpy.context.scene")
}
$dir = "$sp\prueba-$Name"
New-Item -ItemType Directory -Force $dir | Out-Null
Set-Content "$dir\modelar-$Name.py" ($head + (Get-Content "$sp\modelo-$Name.txt" -Raw) + $tail) -NoNewline -Encoding utf8NoBOM
Push-Location $dir
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 "modelar-$Name.py" 2>&1 | Select-String "EXPORT|Error|Traceback|line \d" | Select-Object -Last 8
Pop-Location
