<#
.SYNOPSIS
    Run every test suite for the Ontario CSC sample app: xUnit (unit + integration) and Playwright (UI).

.DESCRIPTION
    1. Builds the solution once.
    2. Runs the xUnit test project with TRX results and Cobertura code coverage (TestResults/).
    3. Installs Playwright npm packages and the Chromium browser when needed, then runs the
       Playwright UI tests. Playwright starts the web app itself (see playwright-tests/playwright.config.ts)
       unless -BaseUrl points at an already-running or deployed instance.
    4. Prints a summary and exits non-zero if any suite failed.

.PARAMETER Configuration
    Build configuration. Default: Debug.

.PARAMETER SkipUnit
    Skip the xUnit tests.

.PARAMETER SkipE2E
    Skip the Playwright UI tests.

.PARAMETER NoBuild
    Skip the solution build (use the output of a previous build).

.PARAMETER BaseUrl
    Run the Playwright tests against this URL instead of starting the app locally.

.PARAMETER Port
    Port used when Playwright starts the app locally. Default: 5158.

.PARAMETER Project
    Playwright project(s) to run (chromium, mobile-chromium). Default: all.

.PARAMETER Grep
    Only run Playwright tests whose title matches this pattern.

.PARAMETER Headed
    Run Playwright with a visible browser window.

.PARAMETER OpenReport
    Open the Playwright HTML report after the run.

.EXAMPLE
    ./scripts/run-tests.ps1
    Build, run all xUnit tests, then all Playwright tests.

.EXAMPLE
    ./scripts/run-tests.ps1 -SkipUnit -Project chromium -Grep "validation" -Headed
    Run only the Playwright validation tests in desktop Chromium with a visible browser.

.EXAMPLE
    ./scripts/run-tests.ps1 -SkipUnit -BaseUrl https://app-ontario-csc-dev-cac.azurewebsites.net
    Run the Playwright tests against a deployed instance.
#>
[CmdletBinding()]
param(
    [string]   $Configuration = 'Debug',
    [switch]   $SkipUnit,
    [switch]   $SkipE2E,
    [switch]   $NoBuild,
    [string]   $BaseUrl,
    [int]      $Port = 5158,
    [string[]] $Project,
    [string]   $Grep,
    [switch]   $Headed,
    [switch]   $OpenReport
)

$ErrorActionPreference = 'Stop'

$repoRoot       = Split-Path -Parent $PSScriptRoot
$solution       = Join-Path $repoRoot 'OntarioCsc.slnx'
$testProject    = Join-Path $repoRoot 'tests/OntarioCsc.Web.Tests/OntarioCsc.Web.Tests.csproj'
$testResultsDir = Join-Path $repoRoot 'TestResults'
$e2eDir         = Join-Path $repoRoot 'playwright-tests'

$results = [ordered]@{}

function Write-Step {
    param([string] $Message)
    Write-Host ''
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Native {
    param([Parameter(Mandatory)] [string] $Command, [string[]] $Arguments = @())
    Write-Host "    > $Command $($Arguments -join ' ')" -ForegroundColor DarkGray
    & $Command @Arguments | Out-Host
    return $LASTEXITCODE
}

if (-not $NoBuild) {
    Write-Step "Building solution ($Configuration)"
    if ((Invoke-Native dotnet @('build', $solution, '--configuration', $Configuration)) -ne 0) {
        throw 'dotnet build failed.'
    }
}

if (-not $SkipUnit) {
    Write-Step 'Running xUnit tests (unit + integration) with coverage'
    if (Test-Path $testResultsDir) { Remove-Item $testResultsDir -Recurse -Force }

    $exit = Invoke-Native dotnet @(
        'test', $testProject,
        '--configuration', $Configuration,
        '--no-build',
        '--logger', 'trx;LogFileName=test-results.trx',
        '--logger', 'console;verbosity=normal',
        '--results-directory', $testResultsDir,
        '--collect', 'XPlat Code Coverage'
    )
    $results['xUnit'] = $exit
    Write-Host "    Results : $testResultsDir"
}

if (-not $SkipE2E) {
    Write-Step 'Running Playwright UI tests'
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw 'Node.js / npm is required for the Playwright tests. Install Node.js 20+ or rerun with -SkipE2E.'
    }

    $savedEnv = @{}
    foreach ($name in 'E2E_BASE_URL', 'E2E_PORT', 'E2E_CONFIGURATION', 'E2E_NO_BUILD') {
        $savedEnv[$name] = [Environment]::GetEnvironmentVariable($name)
    }

    Push-Location $e2eDir
    try {
        if (-not (Test-Path (Join-Path $e2eDir 'node_modules/@playwright/test'))) {
            Write-Host '    Installing npm packages' -ForegroundColor DarkGray
            if ((Invoke-Native npm @('ci')) -ne 0) { throw 'npm ci failed.' }
        }

        if ((Invoke-Native npx @('playwright', 'install', 'chromium')) -ne 0) {
            throw 'Playwright browser install failed.'
        }

        $env:E2E_CONFIGURATION = $Configuration
        $env:E2E_PORT          = "$Port"
        $env:E2E_NO_BUILD      = 'true'
        if ($BaseUrl) { $env:E2E_BASE_URL = $BaseUrl } else { Remove-Item Env:E2E_BASE_URL -ErrorAction SilentlyContinue }

        $pwArgs = @('playwright', 'test')
        foreach ($p in $Project) { $pwArgs += "--project=$p" }
        if ($Grep)   { $pwArgs += @('--grep', $Grep) }
        if ($Headed) { $pwArgs += '--headed' }

        $results['Playwright'] = Invoke-Native npx $pwArgs
        Write-Host "    Report  : $(Join-Path $e2eDir 'playwright-report/index.html')"

        if ($OpenReport) { Invoke-Native npx @('playwright', 'show-report') | Out-Null }
    }
    finally {
        Pop-Location
        foreach ($name in $savedEnv.Keys) {
            if ($null -eq $savedEnv[$name]) {
                Remove-Item "Env:$name" -ErrorAction SilentlyContinue
            }
            else {
                Set-Item "Env:$name" $savedEnv[$name]
            }
        }
    }
}

Write-Step 'Summary'
$failed = $false
foreach ($suite in $results.Keys) {
    $ok = $results[$suite] -eq 0
    if (-not $ok) { $failed = $true }
    $status = if ($ok) { 'PASSED' } else { "FAILED (exit $($results[$suite]))" }
    Write-Host ("    {0,-12} {1}" -f $suite, $status) -ForegroundColor ($(if ($ok) { 'Green' } else { 'Red' }))
}

exit ([int]$failed)
