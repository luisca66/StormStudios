<#
.SYNOPSIS
  Espera a que Gemini (en Antigravity) entregue un encargo de plantillas-blender/COLA-GEMINI.md.

.DESCRIPTION
  Modo semiautomático: Luis pega en Antigravity el prompt fijo de PROMPTS-GEMINI.md §C y Gemini trabaja
  la cola. Claude corre este script en segundo plano; termina (y lo despierta) en cuanto un encargo que
  estaba pendiente tiene ENTREGA.md con "Lista para: revisión", o cuando se acaba el tiempo.
  Imprime ENTREGADO=<carpeta> por cada entrega nueva y PENDIENTES=<n>.
#>
param([int] $Horas = 4, [int] $Segundos = 30)

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$cola = Join-Path $repo "plantillas-blender\COLA-GEMINI.md"

function Get-Encargos {
  Select-String -Path $cola -Pattern '^\|\s*\d+\s*\|\s*`([^`]+)`' | ForEach-Object { $_.Matches[0].Groups[1].Value.TrimEnd('/', '\') }
}
function Test-Entregado([string] $carpeta) {
  $entrega = Join-Path (Join-Path $repo $carpeta) "ENTREGA.md"
  (Test-Path $entrega) -and (Select-String -Path $entrega -Pattern "Lista para: revisi" -Quiet)
}

$yaEstaban = @(Get-Encargos | Where-Object { Test-Entregado $_ })
$limite = (Get-Date).AddHours($Horas)
while ((Get-Date) -lt $limite) {
  $nuevos = @(Get-Encargos | Where-Object { (Test-Entregado $_) -and ($yaEstaban -notcontains $_) })
  if ($nuevos.Count) {
    $nuevos | ForEach-Object { "ENTREGADO=$_" }
    "PENDIENTES=$(@(Get-Encargos | Where-Object { -not (Test-Entregado $_) }).Count)"
    exit 0
  }
  Start-Sleep -Seconds $Segundos
}
"SIN_ENTREGAS en $Horas h"
exit 2
