[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$frontRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path (Split-Path -Parent $frontRoot) "dnj-game-api"
$stateDir = Join-Path $frontRoot ".local"
$stateFile = Join-Path $stateDir "dev-stack.json"
$logsDir = Join-Path $stateDir "logs"
$minioPort = if ($env:DNJ_LOCAL_MINIO_PORT) { [int]$env:DNJ_LOCAL_MINIO_PORT } else { 59000 }
$minioConsolePort = if ($env:DNJ_LOCAL_MINIO_CONSOLE_PORT) { [int]$env:DNJ_LOCAL_MINIO_CONSOLE_PORT } else { 59001 }
$startedPids = @()

function Require-Command([string]$name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "'$name' não está disponível no PATH. Instale-o e execute novamente."
  }
}

function Test-ProcessAlive([int]$id) {
  return $null -ne (Get-Process -Id $id -ErrorAction SilentlyContinue)
}

function Stop-ProcessTree([int]$processId) {
  Get-CimInstance Win32_Process -Filter "ParentProcessId=$processId" |
    ForEach-Object { Stop-ProcessTree $_.ProcessId }
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

trap {
  foreach ($id in $startedPids) { Stop-ProcessTree $id }
  if ($startedPids.Count -gt 0) {
    Push-Location $apiRoot
    try { & docker compose down } finally { Pop-Location }
  }
  throw $_
}

function Wait-Http([string]$url, [string]$name) {
  $deadline = (Get-Date).AddSeconds(90)
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 | Out-Null
      return
    } catch { Start-Sleep -Seconds 1 }
  }
  throw "$name não respondeu em $url. Consulte os logs em $logsDir."
}

function Start-LoggedProcess([string]$name, [string]$workingDirectory, [string[]]$arguments) {
  $stdout = Join-Path $logsDir "$name.out.log"
  $stderr = Join-Path $logsDir "$name.err.log"
  Remove-Item -Force $stdout, $stderr -ErrorAction SilentlyContinue
  return Start-Process -FilePath "cmd.exe" -WorkingDirectory $workingDirectory -ArgumentList $arguments -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
}

function Wait-TryCloudflareUrl([string]$logPrefix, [string]$name) {
  $deadline = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $deadline) {
    foreach ($logFile in @("$logPrefix.out.log", "$logPrefix.err.log")) {
      if (-not (Test-Path $logFile)) { continue }
      $contents = Get-Content -Raw $logFile
      if ([string]::IsNullOrEmpty($contents)) { continue }
      $match = [regex]::Match($contents, "https://[a-z0-9-]+\.trycloudflare\.com")
      if ($match.Success) { return $match.Value }
    }
    Start-Sleep -Seconds 1
  }
  throw "O túnel $name não informou uma URL trycloudflare. Consulte $logFile."
}

foreach ($command in "docker", "go", "npm", "cloudflared") { Require-Command $command }
if (-not (Test-Path (Join-Path $apiRoot "docker-compose.yml"))) { throw "Backend não encontrado em $apiRoot." }
if (Test-Path $stateFile) {
  $oldState = Get-Content -Raw $stateFile | ConvertFrom-Json
  if (@($oldState.pids | Where-Object { Test-ProcessAlive $_ }).Count -gt 0) {
    throw "O ambiente local já está em execução. Use 'npm run dev:local:stop' antes de iniciá-lo novamente."
  }
}

New-Item -ItemType Directory -Force $logsDir | Out-Null
if (-not (Test-Path (Join-Path $apiRoot ".env"))) {
  Copy-Item (Join-Path $apiRoot ".env.example") (Join-Path $apiRoot ".env")
}

$previousS3Port = $env:S3_PORT
$previousS3ConsolePort = $env:S3_CONSOLE_PORT
$env:S3_PORT = "$minioPort"
$env:S3_CONSOLE_PORT = "$minioConsolePort"
Push-Location $apiRoot
try { & docker compose up -d --wait db s3 s3-init } finally {
  Pop-Location
  if ($null -eq $previousS3Port) { Remove-Item Env:S3_PORT -ErrorAction SilentlyContinue } else { $env:S3_PORT = $previousS3Port }
  if ($null -eq $previousS3ConsolePort) { Remove-Item Env:S3_CONSOLE_PORT -ErrorAction SilentlyContinue } else { $env:S3_CONSOLE_PORT = $previousS3ConsolePort }
}

$previousUpstream = $env:DNJ_V2_UPSTREAM_URL
$env:DNJ_V2_UPSTREAM_URL = "http://localhost:8081/v2"
$frontCommand = if ($env:DNJ_FRONT_COMMAND) { $env:DNJ_FRONT_COMMAND } else { "npm run dev" }
$front = Start-LoggedProcess "front" $frontRoot @("/c", $frontCommand)
$startedPids += $front.Id
if ($null -eq $previousUpstream) { Remove-Item Env:DNJ_V2_UPSTREAM_URL -ErrorAction SilentlyContinue } else { $env:DNJ_V2_UPSTREAM_URL = $previousUpstream }
Wait-Http "http://localhost:3000" "Frontend"

$frontTunnel = Start-LoggedProcess "front-tunnel" $frontRoot @("/c", "cloudflared tunnel --url http://localhost:3000 --no-autoupdate")
$startedPids += $frontTunnel.Id
$frontUrl = Wait-TryCloudflareUrl (Join-Path $logsDir "front-tunnel") "do frontend"

$minioTunnel = Start-LoggedProcess "minio-tunnel" $frontRoot @("/c", "cloudflared tunnel --url http://localhost:$minioPort --no-autoupdate")
$startedPids += $minioTunnel.Id
$minioUrl = Wait-TryCloudflareUrl (Join-Path $logsDir "minio-tunnel") "do MinIO"

$savedEnvironment = @{}
$apiEnvironment = @{
  "SERVER_PORT" = "8081"
  "SERVER_ENVIRONMENT" = "localhost"
  "S3_ENDPOINT" = "http://localhost:$minioPort"
  "CORS_ALLOWED_ORIGINS" = "http://localhost:3000,$frontUrl"
  "FRONTEND_URL" = $frontUrl
  "S3_PUBLIC_ENDPOINT" = $minioUrl
}
foreach ($entry in $apiEnvironment.GetEnumerator()) {
  $savedEnvironment[$entry.Key] = [Environment]::GetEnvironmentVariable($entry.Key, "Process")
  Set-Item -Path "Env:$($entry.Key)" -Value $entry.Value
}
$api = Start-LoggedProcess "api" $apiRoot @("/c", "go run cmd/api/main.go")
$startedPids += $api.Id
foreach ($entry in $savedEnvironment.GetEnumerator()) {
  if ($null -eq $entry.Value) { Remove-Item "Env:$($entry.Key)" -ErrorAction SilentlyContinue } else { Set-Item "Env:$($entry.Key)" -Value $entry.Value }
}
Wait-Http "http://localhost:8081/v2/healthcheck" "API"

@{
  pids = @($front.Id, $frontTunnel.Id, $minioTunnel.Id, $api.Id)
  frontend = $frontUrl
  minio = $minioUrl
  minioPort = $minioPort
  minioConsolePort = $minioConsolePort
  api = "http://localhost:8081/v2"
  startedAt = (Get-Date).ToString("o")
} | ConvertTo-Json | Set-Content -Encoding utf8 $stateFile

Write-Host "\nAmbiente local pronto:"
Write-Host "  Frontend: $frontUrl"
Write-Host "  API:      $frontUrl/api/v2 (proxy para http://localhost:8081/v2)"
Write-Host "  MinIO:    $minioUrl"
Write-Host "  Console:  http://localhost:$minioConsolePort"
Write-Host "\nLogs: $logsDir"
Write-Host "Para parar: npm run dev:local:stop"
