param(
    [int]$Port = 3005
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'windows-dev-common.ps1')

$repo = Get-RepoRoot
$stdoutLog = Join-Path (Get-LogDir) 'admin-dev.windows.out.log'
$stderrLog = Join-Path (Get-LogDir) 'admin-dev.windows.err.log'

Ensure-PortFree -Port $Port

if (Test-Path $stdoutLog) { Remove-Item $stdoutLog -Force }
if (Test-Path $stderrLog) { Remove-Item $stderrLog -Force }

$args = @(
    '--dir'
    'osg-frontend/packages/admin'
    'dev'
    '--host'
    '0.0.0.0'
    '--port'
    $Port
)

$proc = Start-Process -FilePath 'pnpm.cmd' `
    -ArgumentList $args `
    -WorkingDirectory $repo `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -WindowStyle Hidden `
    -PassThru

$loginUrl = "http://127.0.0.1:$Port/login"
if (-not (Wait-HttpOk -Url $loginUrl -TimeoutSeconds 60)) {
    if ($proc.HasExited) {
        throw "Admin frontend exited early with code $($proc.ExitCode). See $stdoutLog and $stderrLog"
    }

    throw "Admin frontend did not become ready in time. See $stdoutLog and $stderrLog"
}

$owner = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty OwningProcess
if ($owner) {
    Write-PidFile -Name 'admin-dev.windows' -ProcessId $owner
} else {
    Write-PidFile -Name 'admin-dev.windows' -ProcessId $proc.Id
}

Write-Host "Windows admin dev is ready."
Write-Host "PID: $(Get-Content (Join-Path (Get-RunStateDir) 'admin-dev.windows.pid'))"
Write-Host "URL: $loginUrl"
Write-Host "Logs: $stdoutLog"
