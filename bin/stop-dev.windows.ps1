Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'windows-dev-common.ps1')

$names = @(
    'admin-dev.windows'
    'backend-dev.windows'
)

foreach ($name in $names) {
    $targetPid = Read-PidFile -Name $name
    if (-not $targetPid) {
        continue
    }

    $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
    if ($proc) {
        Stop-Process -Id $targetPid -Force
        Write-Host "Stopped $name (PID $targetPid)."
    } else {
        Write-Host "$name pid file exists, but PID $targetPid is not running."
    }

    Remove-PidFile -Name $name
}
