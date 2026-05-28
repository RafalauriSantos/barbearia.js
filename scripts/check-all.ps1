[CmdletBinding()]
param(
	[switch] $SkipBuild,
	[switch] $SkipLint,
	[switch] $Live
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$Results = New-Object System.Collections.Generic.List[object]

function Add-Result {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Name,
		[Parameter(Mandatory = $true)]
		[bool] $Passed,
		[string] $Details = ""
	)

	$Results.Add([pscustomobject]@{
		Name = $Name
		Passed = $Passed
		Details = $Details
	})
}

function Assert-PathExists {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Name,
		[Parameter(Mandatory = $true)]
		[string] $Path,
		[Parameter(Mandatory = $true)]
		[string] $Fix
	)

	if (Test-Path $Path) {
		return $true
	}

	Add-Result -Name $Name -Passed $false -Details $Fix
	return $false
}

function Invoke-Check {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Name,
		[Parameter(Mandatory = $true)]
		[string] $WorkingDirectory,
		[Parameter(Mandatory = $true)]
		[string] $FilePath,
		[string[]] $Arguments = @()
	)

	$timer = [System.Diagnostics.Stopwatch]::StartNew()
	$command = "$FilePath $($Arguments -join ' ')".Trim()

	Write-Host ""
	Write-Host "==> $Name" -ForegroundColor Cyan
	Write-Host "$WorkingDirectory> $command" -ForegroundColor DarkGray

	Push-Location $WorkingDirectory
	try {
		& $FilePath @Arguments
		$exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } elseif ($?) { 0 } else { 1 }
	} catch {
		$exitCode = 1
		Write-Host $_.Exception.Message -ForegroundColor Red
	} finally {
		Pop-Location
		$timer.Stop()
	}

	$seconds = [math]::Round($timer.Elapsed.TotalSeconds, 1)
	if ($exitCode -eq 0) {
		Add-Result -Name $Name -Passed $true -Details "$seconds s"
		return
	}

	Add-Result -Name $Name -Passed $false -Details "exit code $exitCode after $seconds s"
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
	$npmCommand = Get-Command npm -ErrorAction Stop
}

$powershellCommand = Get-Command powershell.exe -ErrorAction SilentlyContinue
if (-not $powershellCommand) {
	$powershellCommand = Get-Command powershell -ErrorAction Stop
}

$pathsOk = $true
$pathsOk = (Assert-PathExists -Name "Backend dependencies" -Path (Join-Path $BackendDir "node_modules") -Fix "Run: cd backend ; npm install") -and $pathsOk
$pathsOk = (Assert-PathExists -Name "Frontend dependencies" -Path (Join-Path $FrontendDir "node_modules") -Fix "Run: cd frontend ; npm install") -and $pathsOk

if ($pathsOk) {
	Invoke-Check -Name "Backend unit/API tests" -WorkingDirectory $BackendDir -FilePath $npmCommand.Source -Arguments @("test")

	if (-not $SkipLint) {
		Invoke-Check -Name "Frontend lint" -WorkingDirectory $FrontendDir -FilePath $npmCommand.Source -Arguments @("run", "lint", "--", "--max-warnings=0")
	}

	Invoke-Check -Name "Frontend tests" -WorkingDirectory $FrontendDir -FilePath $npmCommand.Source -Arguments @("test")

	if (-not $SkipBuild) {
		Invoke-Check -Name "Frontend production build" -WorkingDirectory $FrontendDir -FilePath $npmCommand.Source -Arguments @("run", "build")
	}

	if ($Live) {
		$smokeScript = Join-Path $PSScriptRoot "test-dev.ps1"
		Invoke-Check `
			-Name "Live smoke checks" `
			-WorkingDirectory $Root `
			-FilePath $powershellCommand.Source `
			-Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $smokeScript)
	}
}

$failed = 0
Write-Host ""
Write-Host "Resumo da validacao" -ForegroundColor Cyan
foreach ($result in $Results) {
	if ($result.Passed) {
		Write-Host ("PASS  {0} - {1}" -f $result.Name, $result.Details) -ForegroundColor Green
	} else {
		$failed += 1
		Write-Host ("FAIL  {0} - {1}" -f $result.Name, $result.Details) -ForegroundColor Red
	}
}

Write-Host ""
if ($failed -eq 0) {
	Write-Host "Tudo passou." -ForegroundColor Green
	exit 0
}

Write-Host "$failed etapa(s) falharam." -ForegroundColor Red
exit 1
