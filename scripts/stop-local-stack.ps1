[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$frontRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path (Split-Path -Parent $frontRoot) "dnj-game-api"
$stateFile = Join-Path $frontRoot ".local\dev-stack.json"

function Stop-ProcessTree([int]$processId) {
  Get-CimInstance Win32_Process -Filter "ParentProcessId=$processId" |
    ForEach-Object { Stop-ProcessTree $_.ProcessId }
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

if (Test-Path $stateFile) {
  $state = Get-Content -Raw $stateFile | ConvertFrom-Json
  foreach ($id in $state.pids) {
    Stop-ProcessTree $id
  }
  Remove-Item -Force $stateFile
}

Push-Location $apiRoot
try { & docker compose down } finally { Pop-Location }
Write-Host "Ambiente local encerrado. Os volumes PostgreSQL e MinIO foram preservados."
