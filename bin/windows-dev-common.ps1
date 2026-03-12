Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Import-DotEnv {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        throw "Env file not found: $Path"
    }

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) {
            return
        }

        $pair = $line -split '=', 2
        if ($pair.Length -ne 2) {
            return
        }

        $name = $pair[0].Trim()
        $value = $pair[1].Trim()
        if (($value.StartsWith("'") -and $value.EndsWith("'")) -or ($value.StartsWith('"') -and $value.EndsWith('"'))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

function Get-Jdk21Home {
    if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
        $leaf = Split-Path $env:JAVA_HOME -Leaf
        if ($leaf -match '(^|[-._])21([-.].*)?' -or $leaf -like 'jdk-21*') {
            return $env:JAVA_HOME
        }
    }

    $candidates = @(
        'C:\Program Files\Eclipse Adoptium',
        'C:\Program Files\Microsoft',
        'C:\Program Files\Java',
        (Join-Path $env:USERPROFILE '.jdks')
    ) | Where-Object { Test-Path $_ }

    foreach ($base in $candidates) {
        $match = Get-ChildItem $base -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '(^|[-._])21([-.].*)?' -or $_.Name -like 'jdk-21*' } |
            Where-Object { Test-Path (Join-Path $_.FullName 'bin\java.exe') } |
            Select-Object -First 1
        if ($match) {
            return $match.FullName
        }
    }

    throw 'JDK 21 not found. Install one first, for example Eclipse Temurin 21.'
}

function Use-Jdk21 {
    $jdkHome = Get-Jdk21Home
    $env:JAVA_HOME = $jdkHome
    $env:Path = (Join-Path $jdkHome 'bin') + ';' + $env:Path
    return $jdkHome
}

function Ensure-PortFree {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($listener) {
        $owner = $listener | Select-Object -First 1 -ExpandProperty OwningProcess
        throw "Port $Port is already in use by PID $owner."
    }
}

function Wait-HttpOk {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [int]$TimeoutSeconds = 120
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
            if ($resp.StatusCode -eq 200) {
                return $true
            }
        } catch {
        }

        Start-Sleep -Seconds 2
    }

    return $false
}

function Get-RunStateDir {
    $repo = Get-RepoRoot
    $dir = Join-Path $repo '.local\run'
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    return $dir
}

function Get-LogDir {
    $repo = Get-RepoRoot
    $dir = Join-Path $repo 'logs'
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    return $dir
}

function Write-PidFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [int]$ProcessId
    )

    $runDir = Get-RunStateDir
    Set-Content -Path (Join-Path $runDir "$Name.pid") -Value $ProcessId -Encoding ascii
}

function Read-PidFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $path = Join-Path (Get-RunStateDir) "$Name.pid"
    if (-not (Test-Path $path)) {
        return $null
    }

    $raw = (Get-Content $path -ErrorAction SilentlyContinue | Select-Object -First 1)
    if (-not $raw) {
        return $null
    }

    return [int]$raw
}

function Remove-PidFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $path = Join-Path (Get-RunStateDir) "$Name.pid"
    if (Test-Path $path) {
        Remove-Item $path -Force
    }
}
