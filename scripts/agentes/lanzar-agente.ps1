<#
.SYNOPSIS
  Lanza a Astra (Codex) o a Gemini sin intervención de Luis, con el PROMPT.txt de la carpeta del modelo.

.DESCRIPTION
  Modo automático de plantillas-blender/REPARTO-AGENTES.md §5. Claude lo ejecuta en segundo plano y
  recibe aviso cuando el agente termina. El registro y la última respuesta del agente quedan fuera del
  repositorio, en %LOCALAPPDATA%\StormStudios\agentes\.

.EXAMPLE
  .\scripts\agentes\lanzar-agente.ps1 -Agente gemini -Carpeta apps-src\oido-absoluto-multi-juego\art\blender\rocas-pradera
#>
param(
  [Parameter(Mandatory)] [ValidateSet("astra", "gemini")] [string] $Agente,
  [Parameter(Mandatory)] [string] $Carpeta
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)   # acentos intactos al pasar el prompt por stdin
$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$dir = Join-Path $repo $Carpeta
$promptFile = Join-Path $dir "PROMPT.txt"
if (-not (Test-Path $promptFile)) { throw "Falta $promptFile (lo escribe Claude)." }

$modelo = Split-Path $dir -Leaf
$logDir = Join-Path $env:LOCALAPPDATA "StormStudios\agentes"
New-Item -ItemType Directory -Force $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$log = Join-Path $logDir "$modelo-$Agente-$stamp.log"
$last = Join-Path $logDir "$modelo-$Agente-$stamp-final.txt"
$prompt = Get-Content $promptFile -Raw -Encoding UTF8

Set-Location $repo
"[$(Get-Date -Format s)] $Agente empieza $modelo" | Tee-Object -FilePath $log

if ($Agente -eq "astra") {
  $codex = Join-Path (Get-AppxPackage OpenAI.Codex).InstallLocation "app\resources\codex.exe"
  # workspace-write: escribe en el repo; Blender y el temporal de Windows quedan accesibles.
  $prompt | & $codex exec -C $repo -s workspace-write `
      --add-dir "C:\Users\Luis\blender-bpy" --add-dir $env:TEMP `
      -o $last - *>> $log
} else {
  # Gemini CLI con cuenta personal quedó sin soporte (2026-09-26: "migrate to Antigravity").
  # Antigravity abre su chat en modo agente con el prompt y vuelve enseguida, así que aquí se
  # espera a que ENTREGA.md diga "Lista para" (máximo $horas horas).
  $agy = Join-Path $env:LOCALAPPDATA "Programs\Antigravity IDE\bin\antigravity-ide.cmd"
  $prompt | & $agy chat -m agent "Sigue las instrucciones de arriba." - *>> $log
}
$code = $LASTEXITCODE

$entrega = Join-Path $dir "ENTREGA.md"
$listaFn = { (Test-Path $entrega) -and (Select-String -Path $entrega -Pattern "Lista para: revisi" -Quiet) }
if ($Agente -eq "gemini") {
  $horas = 3
  $limite = (Get-Date).AddHours($horas)
  while (-not (& $listaFn) -and (Get-Date) -lt $limite) { Start-Sleep -Seconds 30 }
  $code = if (& $listaFn) { 0 } else { 2 }   # 2 = se acabó el tiempo sin entrega
  "Gemini trabaja en la ventana de Antigravity; su resumen está en ENTREGA.md." | Set-Content $last -Encoding UTF8
}
$lista = & $listaFn
"[$(Get-Date -Format s)] $Agente terminó $modelo · salida $code · ENTREGA.md: $(if ($lista) { 'sí' } else { 'no' })" | Tee-Object -FilePath $log -Append
"LOG=$log"
"FINAL=$last"
exit $code
