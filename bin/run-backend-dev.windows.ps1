param(
    [string]$EnvFile = 'deploy/.env.dev',
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'windows-dev-common.ps1')

$repo = Get-RepoRoot
$jdkHome = Use-Jdk21
$mavenCmd = Resolve-MavenCommand
$envPath = Join-Path $repo $EnvFile

Import-DotEnv -Path $envPath

$port = if ($env:SERVER_PORT) { [int]$env:SERVER_PORT } else { 28080 }
$profile = if ($env:SPRING_PROFILES_ACTIVE) { $env:SPRING_PROFILES_ACTIVE } else { 'druid,docker' }
$defaultLocalProfiles = @('./.local/uploadPath', '.\.local\uploadPath', '.local/uploadPath', '.local\uploadPath')
$uploadPath = if (-not $env:RUOYI_PROFILE -or $defaultLocalProfiles -contains $env:RUOYI_PROFILE) {
    Join-Path (Get-UserLocalDevRoot) 'uploadPath'
} elseif ([System.IO.Path]::IsPathRooted($env:RUOYI_PROFILE)) {
    $env:RUOYI_PROFILE
} else {
    Join-Path $repo $env:RUOYI_PROFILE
}
$jarPath = Join-Path $repo 'ruoyi-admin\target\ruoyi-admin.jar'
$logDir = Get-LogDir
$stdoutLog = Join-Path $logDir 'backend-dev.windows.out.log'
$stderrLog = Join-Path $logDir 'backend-dev.windows.err.log'

New-Item -ItemType Directory -Force -Path $uploadPath | Out-Null
Ensure-PortFree -Port $port

if (-not $SkipBuild) {
    Push-Location $repo
    try {
        & $mavenCmd -f pom.xml -pl ruoyi-admin -am -DskipTests package
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path $jarPath)) {
    throw "Backend jar not found: $jarPath"
}

if (Test-Path $stdoutLog) { Remove-Item $stdoutLog -Force }
if (Test-Path $stderrLog) { Remove-Item $stderrLog -Force }

$args = @(
    "-Dserver.port=$port"
    "-Druoyi.profile=$uploadPath"
    "-DLOG_PATH=$logDir"
    '-jar'
    $jarPath
    "--spring.profiles.active=$profile"
)

$proc = Start-Process -FilePath (Join-Path $jdkHome 'bin\java.exe') `
    -ArgumentList $args `
    -WorkingDirectory $repo `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -WindowStyle Hidden `
    -PassThru

$healthUrl = "http://127.0.0.1:$port/actuator/health"
if (-not (Wait-HttpOk -Url $healthUrl -TimeoutSeconds 120)) {
    if ($proc.HasExited) {
        throw "Backend exited early with code $($proc.ExitCode). See $stdoutLog and $stderrLog"
    }

    throw "Backend did not become healthy in time. See $stdoutLog and $stderrLog"
}

$owner = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty OwningProcess
if ($owner) {
    Write-PidFile -Name 'backend-dev.windows' -ProcessId $owner
} else {
    Write-PidFile -Name 'backend-dev.windows' -ProcessId $proc.Id
}

Write-Host "Windows backend dev is ready."
Write-Host "PID: $(Get-Content (Join-Path (Get-RunStateDir) 'backend-dev.windows.pid'))"
Write-Host "URL: http://127.0.0.1:$port"
Write-Host "Health: $healthUrl"
Write-Host "Logs: $stdoutLog"
