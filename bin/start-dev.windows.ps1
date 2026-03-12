param(
    [string]$EnvFile = 'deploy/.env.dev',
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $PSScriptRoot 'windows-dev-common.ps1')
$backendScript = Join-Path $PSScriptRoot 'run-backend-dev.windows.ps1'
$adminScript = Join-Path $PSScriptRoot 'run-admin-dev.windows.ps1'

if ($SkipBuild) {
    & $backendScript -EnvFile $EnvFile -SkipBuild
} else {
    & $backendScript -EnvFile $EnvFile
}

& $adminScript

if (-not (Wait-HttpOk -Url 'http://127.0.0.1:28080/actuator/health' -TimeoutSeconds 30)) {
    throw 'Backend health check failed after start-dev.windows.ps1'
}

if (-not (Wait-HttpOk -Url 'http://127.0.0.1:3005/login' -TimeoutSeconds 30)) {
    throw 'Admin login page failed after start-dev.windows.ps1'
}

Write-Host 'Windows dev stack is ready.'
Write-Host 'Backend: http://127.0.0.1:28080'
Write-Host 'Admin:   http://127.0.0.1:3005/login'
