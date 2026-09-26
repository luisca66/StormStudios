<#
.SYNOPSIS
  Lanza a Astra (Codex) o a Gemini (Gemini CLI) sin intervención de Luis.

.DESCRIPTION
  Modo automático de plantillas-blender/REPARTO-AGENTES.md §5. Claude lo ejecuta en segundo plano y
  recibe aviso cuando el agente termina. Registros, sesiones y últimos mensajes quedan fuera del
  repositorio, en %LOCALAPPDATA%\StormStudios\agentes\.

  Modelos fijos (decididos por Luis el 2026-09-26):
    Astra  = gpt-6-astra con razonamiento "low" (Astra Light).
    Gemini = Gemini 3.8 Flash por Gemini CLI con la clave de AI Studio de Luis (GEMINI_API_KEY).

  Astra trabaja aislada (opción b): escribe el script pero no puede cargar Blender. Claude lo ejecuta
  y la reanuda con -Reanudar, adjuntando los renders de su carpeta para que se revise.

.EXAMPLE
  .\scripts\agentes\lanzar-agente.ps1 -Agente astra -Carpeta apps-src\...\castillo
  .\scripts\agentes\lanzar-agente.ps1 -Agente astra -Carpeta apps-src\...\castillo -Reanudar -Mensaje ronda1.txt
  .\scripts\agentes\lanzar-agente.ps1 -Agente gemini -Carpeta apps-src\...\rocas-pradera
#>
param(
  [Parameter(Mandatory)] [ValidateSet("astra", "gemini")] [string] $Agente,
  [Parameter(Mandatory)] [string] $Carpeta,
  [switch] $Reanudar,        # solo Astra: sigue su última sesión de este modelo
  [string] $Mensaje,         # archivo con el mensaje de la ronda (por defecto PROMPT.txt de la carpeta)
  [string] $GeminiModel = "gemini-3.8-flash"   # se confirma contra la lista de modelos de la clave
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)   # acentos intactos por stdin
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$dir = Join-Path $repo $Carpeta
$modelo = Split-Path $dir -Leaf
$promptFile = if ($Mensaje) { $Mensaje } else { Join-Path $dir "PROMPT.txt" }
if (-not (Test-Path $promptFile)) { throw "Falta $promptFile (lo escribe Claude)." }

$logDir = Join-Path $env:LOCALAPPDATA "StormStudios\agentes"
New-Item -ItemType Directory -Force $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$log = Join-Path $logDir "$modelo-$Agente-$stamp.log"
$last = Join-Path $logDir "$modelo-$Agente-$stamp-final.txt"
$sessionFile = Join-Path $logDir "$modelo-$Agente.session"
$prompt = Get-Content $promptFile -Raw -Encoding UTF8

Set-Location $repo
"[$(Get-Date -Format s)] $Agente empieza $modelo$(if ($Reanudar) { ' (reanuda)' })" | Tee-Object -FilePath $log

if ($Agente -eq "astra") {
  $codex = Join-Path (Get-AppxPackage OpenAI.Codex).InstallLocation "app\resources\codex.exe"
  $common = @("-m", "gpt-6-astra", "-c", 'model_reasoning_effort="low"', "-o", $last)
  if ($Reanudar) {
    if (-not (Test-Path $sessionFile)) { throw "No hay sesión guardada de Astra para $modelo." }
    $session = (Get-Content $sessionFile -Raw).Trim()
    $images = Get-ChildItem $dir -Filter "render-*.png" | ForEach-Object { "-i"; $_.FullName }
    $prompt | & $codex exec resume @common @images $session - *>> $log
  } else {
    $prompt | & $codex exec -C $repo -s workspace-write @common - *>> $log
    $m = Select-String -Path $log -Pattern "session id: (\S+)" | Select-Object -First 1
    if ($m) { $m.Matches[0].Groups[1].Value | Set-Content $sessionFile -Encoding ascii }
  }
  $code = $LASTEXITCODE
} else {
  # Gemini CLI con la clave de Google AI Studio de Luis (la cuenta personal sin clave ya no tiene
  # soporte). La clave vive en la variable de usuario GEMINI_API_KEY, que Luis configuró; se pasa al
  # proceso sin escribirla en ningún registro.
  if (-not $env:GEMINI_API_KEY) {
    $env:GEMINI_API_KEY = [Environment]::GetEnvironmentVariable("GEMINI_API_KEY", "User")
  }
  if (-not $env:GEMINI_API_KEY) { throw "Falta la variable de usuario GEMINI_API_KEY." }
  $gemini = Join-Path $env:APPDATA "npm\gemini.cmd"
  # El prompt va por stdin (un .cmd rompe los argumentos con saltos de línea).
  # auto_edit: aprueba solo ediciones de archivos; la política permite únicamente el lanzador de
  # Blender como comando de terminal (lo demás se niega: nadie está mirando para aprobarlo).
  $policy = Join-Path $PSScriptRoot "gemini-politica.toml"
  $prompt | & $gemini -m $GeminiModel -p "Sigue las instrucciones de arriba." `
      --approval-mode auto_edit --policy $policy -o text *>> $log
  # Gemini CLI a veces sale con un "Assertion failed" de libuv al cerrar (código 9) aunque terminó
  # bien: cuenta la entrega, no el código de salida.
  $entrega = Join-Path $dir "ENTREGA.md"
  $lista = (Test-Path $entrega) -and (Select-String -Path $entrega -Pattern "Lista para: revisi" -Quiet)
  $code = if ($lista) { 0 } else { $LASTEXITCODE }
  Get-Content $log -Tail 40 | Set-Content $last -Encoding UTF8
}

"[$(Get-Date -Format s)] $Agente terminó $modelo · salida $code" | Tee-Object -FilePath $log -Append
"LOG=$log"
"FINAL=$last"
exit $code
