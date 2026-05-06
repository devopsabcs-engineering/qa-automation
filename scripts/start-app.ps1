<#
.SYNOPSIS
    Start the Ontario CSC sample web app locally for debugging and testing.

.DESCRIPTION
    - Stops anything currently bound to the dev port (default 5158) so the
      port is always free before launch.
    - Stops any lingering `OntarioCsc.Web` dotnet host from a previous run.
    - Restores, builds, then runs the web project with the `http` launch
      profile from Properties/launchSettings.json.
    - Runs in the foreground by default (Ctrl+C to stop). Use -Background
      to launch detached and return the PID.

.PARAMETER Port
    TCP port the app listens on. Default: 5158 (matches launchSettings.json).

.PARAMETER Configuration
    Build configuration. Default: Debug (so debugger symbols are loaded).

.PARAMETER NoBuild
    Skip restore + build; useful when rerunning after a recent build.

.PARAMETER NoLaunch
    Do not open the default browser when the app starts.

.PARAMETER Background
    Start the app in a detached process and return immediately. Logs go to
    `.run/ontariocsc.log` and the PID is written to `.run/ontariocsc.pid`.

.EXAMPLE
    ./scripts/start-app.ps1
    Build and run the app on http://localhost:5158 in the foreground.

.EXAMPLE
    ./scripts/start-app.ps1 -Background
    Start the app detached so the terminal stays free for tests.

.EXAMPLE
    ./scripts/start-app.ps1 -NoBuild -Port 5200
    Re-run a previously built app on a different port.
#>
[CmdletBinding()]
param(
    [int]    $Port          = 5158,
    [string] $Configuration = 'Debug',
    [switch] $NoBuild,
    [switch] $NoLaunch,
    [switch] $Background
)

$ErrorActionPreference = 'Stop'

# Resolve repo root (this script lives in <repo>/scripts).
$repoRoot   = Split-Path -Parent $PSScriptRoot
$webProject = Join-Path $repoRoot 'src/OntarioCsc.Web/OntarioCsc.Web.csproj'
$runDir     = Join-Path $repoRoot '.run'
$logPath    = Join-Path $runDir   'ontariocsc.log'
$errPath    = Join-Path $runDir   'ontariocsc.err.log'
$pidPath    = Join-Path $runDir   'ontariocsc.pid'

if (-not (Test-Path $webProject)) {
    throw "Could not find web project at '$webProject'. Run this script from the repo or its scripts/ folder."
}

function Write-Step {
    param([string] $Message)
    Write-Host ''
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Stop-ProcessTree {
    param(
        [Parameter(Mandatory)] [int]    $ProcessId,
        [Parameter(Mandatory)] [string] $Reason
    )
    try {
        $proc = Get-Process -Id $ProcessId -ErrorAction Stop
    }
    catch {
        return
    }

    Write-Host "    Stopping PID $ProcessId ($($proc.ProcessName)) - $Reason" -ForegroundColor Yellow
    try {
        Stop-Process -Id $ProcessId -Force -ErrorAction Stop
    }
    catch {
        Write-Host "    Warning: failed to stop PID $ProcessId : $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
}

function Stop-PortListeners {
    param([Parameter(Mandatory)] [int] $TcpPort)

    $owners = @()
    try {
        $owners = Get-NetTCPConnection -LocalPort $TcpPort -State Listen -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess -Unique
    }
    catch {
        # No listeners on that port - nothing to do.
        return
    }

    foreach ($ownerPid in $owners) {
        Stop-ProcessTree -ProcessId $ownerPid -Reason "listening on port $TcpPort"
    }
}

function Stop-OntarioCscHosts {
    # Find dotnet hosts that are running our web app's DLL or `dotnet run` for the project.
    $needles = @('OntarioCsc.Web.dll', 'OntarioCsc.Web.csproj')

    $candidates = Get-CimInstance Win32_Process -Filter "Name = 'dotnet.exe'" -ErrorAction SilentlyContinue
    foreach ($proc in $candidates) {
        $cmd = $proc.CommandLine
        if (-not $cmd) { continue }
        foreach ($needle in $needles) {
            if ($cmd -like "*$needle*") {
                Stop-ProcessTree -ProcessId $proc.ProcessId -Reason 'previous OntarioCsc.Web host'
                break
            }
        }
    }
}

function Stop-PreviousBackgroundRun {
    if (-not (Test-Path $pidPath)) { return }
    $previous = Get-Content $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($previous -as [int]) {
        Stop-ProcessTree -ProcessId ([int]$previous) -Reason 'previous background launch'
    }
    Remove-Item $pidPath -ErrorAction SilentlyContinue
}

Write-Step "Preparing to start OntarioCsc.Web on http://localhost:$Port"
Write-Host "    Repo root  : $repoRoot"
Write-Host "    Project    : $webProject"
Write-Host "    Config     : $Configuration"
Write-Host "    Background : $($Background.IsPresent)"

Write-Step 'Killing any existing instances'
Stop-PreviousBackgroundRun
Stop-PortListeners       -TcpPort $Port
Stop-OntarioCscHosts

if (-not $NoBuild) {
    Write-Step "Restoring + building ($Configuration)"
    & dotnet build $webProject --configuration $Configuration | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet build failed with exit code $LASTEXITCODE"
    }
}
else {
    Write-Host '    Skipping build (-NoBuild)' -ForegroundColor DarkGray
}

# Build the dotnet run argument list. Args after `--` are forwarded to the
# app, where ASP.NET Core picks up `--urls` to override applicationUrl.
$runArgs = @(
    'run'
    '--project',       $webProject
    '--configuration', $Configuration
    '--launch-profile','http'
)
if ($NoLaunch -or $Background) {
    $runArgs += '--no-launch-profile-arguments'  # no-op on older SDKs; harmless
}
$runArgs += @('--', "--urls=http://localhost:$Port")

$env:ASPNETCORE_ENVIRONMENT = 'Development'

if ($Background) {
    if (-not (Test-Path $runDir)) {
        New-Item -ItemType Directory -Path $runDir | Out-Null
    }
    if (Test-Path $logPath) { Remove-Item $logPath -Force }
    if (Test-Path $errPath) { Remove-Item $errPath -Force }

    Write-Step 'Starting app in background'
    $proc = Start-Process -FilePath 'dotnet' `
                          -ArgumentList $runArgs `
                          -WorkingDirectory $repoRoot `
                          -RedirectStandardOutput $logPath `
                          -RedirectStandardError  $errPath `
                          -WindowStyle Hidden `
                          -PassThru
    $proc.Id | Set-Content -Path $pidPath -Encoding ascii

    Write-Host "    PID     : $($proc.Id)"
    Write-Host "    URL     : http://localhost:$Port"
    Write-Host "    Stdout  : $logPath"
    Write-Host "    Stderr  : $errPath"
    Write-Host "    Stop    : Stop-Process -Id $($proc.Id) -Force"
}
else {
    Write-Step "Starting app (foreground - Ctrl+C to stop)"
    Write-Host "    URL     : http://localhost:$Port"
    & dotnet @runArgs
    exit $LASTEXITCODE
}
