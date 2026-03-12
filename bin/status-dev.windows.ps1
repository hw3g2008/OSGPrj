Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'windows-dev-common.ps1')

$items = @(
    [pscustomobject]@{
        Name = 'backend-dev.windows'
        Port = 28080
        Url = 'http://127.0.0.1:28080/actuator/health'
    }
    [pscustomobject]@{
        Name = 'admin-dev.windows'
        Port = 3005
        Url = 'http://127.0.0.1:3005/login'
    }
)

$rows = foreach ($item in $items) {
    $pidValue = Read-PidFile -Name $item.Name
    $proc = $null
    if ($pidValue) {
        $proc = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    }

    $listener = Get-NetTCPConnection -State Listen -LocalPort $item.Port -ErrorAction SilentlyContinue |
        Select-Object -First 1

    $httpOk = $false
    try {
        $resp = Invoke-WebRequest -UseBasicParsing -Uri $item.Url -TimeoutSec 5
        $httpOk = $resp.StatusCode -eq 200
    } catch {
    }

    [pscustomobject]@{
        name = $item.Name
        pid = if ($pidValue) { $pidValue } else { $null }
        process_running = [bool]$proc
        listening_port = if ($listener) { $listener.LocalPort } else { $null }
        listener_pid = if ($listener) { $listener.OwningProcess } else { $null }
        http_ok = $httpOk
        url = $item.Url
    }
}

$rows | Format-Table -AutoSize
