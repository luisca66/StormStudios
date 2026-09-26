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
  [string] $Mensaje          # archivo con el mensaje (por defecto PROMPT.txt de la carpeta).
                             # Para la cola de Gemini: -Carpeta plantillas-blender -Mensaje plantillas-blender\PROMPT-COLA-GEMINI.txt
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
  # Gemini = Antigravity CLI (agy), con la cuenta de Google de Luis (plan Google AI Pro): usa la
  # cuota del plan, NO cobra por token. Nunca con clave de API (2026-09-26 la clave de AI Studio
  # resultó de pago): se quita del entorno por si sigue definida en Windows.
  # Permisos en ~/.gemini/antigravity-cli/settings.json: el proyecto es de confianza y el único
  # comando de terminal permitido es el lanzador de Blender; lo demás se niega en modo headless.
  Remove-Item Env:GEMINI_API_KEY -ErrorAction SilentlyContinue
  $agy = Join-Path $env:LOCALAPPDATA "agy\bin\agy.exe"
  & $agy -p $prompt --print-timeout 60m *>> $log
  $code = $LASTEXITCODE
  Get-Content $log -Tail 40 | Set-Content $last -Encoding UTF8
}

"[$(Get-Date -Format s)] $Agente terminó $modelo · salida $code" | Tee-Object -FilePath $log -Append
"LOG=$log"
"FINAL=$last"
exit $code
