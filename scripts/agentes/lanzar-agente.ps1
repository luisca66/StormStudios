<#
.SYNOPSIS
  Lanza a Astra (Codex) o a Gemini (Antigravity) sin intervención de Luis.

.DESCRIPTION
  Modo automático de plantillas-blender/REPARTO-AGENTES.md §5. Claude lo ejecuta en segundo plano y
  recibe aviso cuando el agente termina. Registros, sesiones y últimos mensajes quedan fuera del
  repositorio, en %LOCALAPPDATA%\StormStudios\agentes\.

  Modelos fijos (decididos por Luis el 2026-09-26):
    Astra  = gpt-6-astra con razonamiento "low" (Astra Light).
    Gemini = "flash" de Antigravity (Gemini 3.8 Flash; el nivel de razonamiento lo fija Antigravity).

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
  [string] $Mensaje          # archivo con el mensaje de la ronda (por defecto PROMPT.txt de la carpeta)
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
  # Gemini CLI con cuenta personal ya no tiene soporte ("migrate to Antigravity"). agentapi abre una
  # conversación del agente de Antigravity con el modelo elegido y vuelve enseguida, así que aquí se
  # espera a que ENTREGA.md diga "Lista para: revisión" (máximo 3 horas).
  $agentapi = Join-Path $env:USERPROFILE ".gemini\antigravity\bin\agentapi.bat"
  $orden = "Lee y sigue al pie de la letra las instrucciones del archivo $promptFile"
  & $agentapi new-conversation --model=flash --title="$modelo" "$orden" *>> $log
  $limite = (Get-Date).AddHours(3)
  $entrega = Join-Path $dir "ENTREGA.md"
  $lista = { (Test-Path $entrega) -and (Select-String -Path $entrega -Pattern "Lista para: revisi" -Quiet) }
  while (-not (& $lista) -and (Get-Date) -lt $limite) { Start-Sleep -Seconds 30 }
  $code = if (& $lista) { 0 } else { 2 }   # 2 = se acabó el tiempo sin entrega
  "Gemini trabaja en Antigravity; su resumen está en ENTREGA.md." | Set-Content $last -Encoding UTF8
}

"[$(Get-Date -Format s)] $Agente terminó $modelo · salida $code" | Tee-Object -FilePath $log -Append
"LOG=$log"
"FINAL=$last"
exit $code
