Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Get-WorkspaceLocalRoot {
    return (Join-Path (Get-RepoRoot) '.local')
}

function Get-UserLocalDevRoot {
    $root = if ($env:LOCALAPPDATA) {
        Join-Path $env:LOCALAPPDATA 'OSGPrj'
    } else {
        Get-WorkspaceLocalRoot
    }

    New-Item -ItemType Directory -Force -Path $root | Out-Null
    return $root
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

function Resolve-CommandPath {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Names
    )

    foreach ($name in $Names) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($cmd) {
            return $cmd.Source
        }
    }

    return $null
}

function Get-JavaMajorVersion {
    param(
        [Parameter(Mandatory = $true)]
        [string]$JavaExe
    )

    if (-not (Test-Path $JavaExe)) {
        return $null
    }

    try {
        $output = & $JavaExe --version | Out-String
    } catch {
        return $null
    }

    $match = [regex]::Match($output, '(?m)^(?:openjdk|java)\s+(?<major>\d+)')
    if (-not $match.Success) {
        return $null
    }

    return [int]$match.Groups['major'].Value
}

function Get-Jdk21Home {
    $userToolsRoot = Join-Path (Get-UserLocalDevRoot) 'tools'
    $workspaceToolsRoot = Join-Path (Get-WorkspaceLocalRoot) 'tools'

    if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
        $javaMajor = Get-JavaMajorVersion -JavaExe (Join-Path $env:JAVA_HOME 'bin\java.exe')
        if ($javaMajor -eq 21) {
            return (Resolve-Path $env:JAVA_HOME).Path
        }
    }

    $javaHomeParent = if ($env:JAVA_HOME) { Split-Path -Parent $env:JAVA_HOME } else { $null }
    $candidateRoots = @(
        $javaHomeParent,
        'C:\Program Files\Eclipse Adoptium',
        'D:\Program Files\Eclipse Adoptium',
        'C:\Program Files\Microsoft',
        'D:\Program Files\Microsoft',
        'C:\Program Files\java',
        'D:\Program Files\java',
        'C:\Program Files\Java',
        'D:\Program Files\Java',
        $userToolsRoot,
        $workspaceToolsRoot,
        (Join-Path $env:USERPROFILE '.jdks')
    ) | Where-Object { Test-Path $_ }

    foreach ($base in $candidateRoots) {
        $matches = Get-ChildItem $base -Directory -ErrorAction SilentlyContinue |
            Where-Object { Test-Path (Join-Path $_.FullName 'bin\java.exe') }
        foreach ($match in $matches) {
            $javaMajor = Get-JavaMajorVersion -JavaExe (Join-Path $match.FullName 'bin\java.exe')
            if ($javaMajor -eq 21) {
                return $match.FullName
            }
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
    $dir = Join-Path (Get-UserLocalDevRoot) 'run'
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

function Resolve-MavenCommand {
    $pathCommand = Resolve-CommandPath -Names @('mvn.cmd', 'mvn')
    if ($pathCommand) {
        return $pathCommand
    }

    $repo = Get-RepoRoot
    $wrapper = Join-Path $repo 'mvnw.cmd'
    if (Test-Path $wrapper) {
        return $wrapper
    }

    $envCandidates = @(
        $env:MAVEN_HOME,
        $env:M2_HOME
    ) | Where-Object { $_ }
    foreach ($home in $envCandidates) {
        $candidate = Join-Path $home 'bin\mvn.cmd'
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    $searchRoots = @(
        (Join-Path (Get-UserLocalDevRoot) 'tools'),
        (Join-Path (Get-WorkspaceLocalRoot) 'tools'),
        'C:\Program Files',
        'D:\Program Files',
        'C:\Program Files\JetBrains',
        (Join-Path $env:USERPROFILE 'AppData\Local\Programs')
    ) | Where-Object { Test-Path $_ }

    foreach ($root in $searchRoots) {
        $dirs = Get-ChildItem $root -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match 'maven|apache-maven|IntelliJ|IDEA' }
        foreach ($dir in $dirs) {
            $direct = Join-Path $dir.FullName 'bin\mvn.cmd'
            if (Test-Path $direct) {
                return $direct
            }

            $jetbrainsBundled = Join-Path $dir.FullName 'plugins\maven\lib\maven3\bin\mvn.cmd'
            if (Test-Path $jetbrainsBundled) {
                return $jetbrainsBundled
            }
        }
    }

    throw 'Maven not found. Install Apache Maven 3.9+ or add mvnw.cmd to the repo.'
}

function Resolve-PnpmLaunchSpec {
    $pnpmCommand = Resolve-CommandPath -Names @('pnpm.cmd', 'pnpm')
    if ($pnpmCommand) {
        return [pscustomobject]@{
            FilePath        = $pnpmCommand
            ArgumentsPrefix = @()
        }
    }

    $corepackCommand = Resolve-CommandPath -Names @('corepack.cmd', 'corepack')
    if ($corepackCommand) {
        $corepackHome = Join-Path (Get-UserLocalDevRoot) 'corepack'
        New-Item -ItemType Directory -Force -Path $corepackHome | Out-Null
        $env:COREPACK_HOME = $corepackHome

        return [pscustomobject]@{
            FilePath        = $corepackCommand
            ArgumentsPrefix = @('pnpm@9.15.9')
        }
    }

    throw 'pnpm not found. Install pnpm or enable Corepack with a writable COREPACK_HOME.'
}
