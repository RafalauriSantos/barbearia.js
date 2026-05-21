$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"

function Test-LocalPort {
	param(
		[Parameter(Mandatory = $true)]
		[int] $Port
	)

	$client = [System.Net.Sockets.TcpClient]::new()
	try {
		$async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
		if (-not $async.AsyncWaitHandle.WaitOne(300)) {
			return $false
		}
		$client.EndConnect($async)
		return $true
	} catch {
		return $false
	} finally {
		$client.Close()
	}
}

function Get-Shell {
	$pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
	if ($pwsh) {
		return $pwsh.Source
	}

	$powershell = Get-Command powershell -ErrorAction Stop
	return $powershell.Source
}

function Start-DevWindow {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Title,
		[Parameter(Mandatory = $true)]
		[string] $WorkingDirectory,
		[Parameter(Mandatory = $true)]
		[string] $Command
	)

	$shell = Get-Shell
	$fullCommand = @"
`$Host.UI.RawUI.WindowTitle = '$Title'
Set-Location -LiteralPath '$WorkingDirectory'
$Command
"@

	Start-Process -FilePath $shell -ArgumentList @("-NoExit", "-Command", $fullCommand)
}

if (-not (Test-Path $BackendDir)) {
	throw "Backend folder not found: $BackendDir"
}

if (-not (Test-Path $FrontendDir)) {
	throw "Frontend folder not found: $FrontendDir"
}

if (-not (Test-Path (Join-Path $BackendDir "node_modules"))) {
	throw "Backend dependencies are missing. Run: cd backend ; npm install"
}

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
	throw "Frontend dependencies are missing. Run: cd frontend ; npm install"
}

Write-Host ""
Write-Host "Starting TCC dev environment..." -ForegroundColor Cyan

if (Test-LocalPort -Port 3000) {
	Write-Host "Backend already running at http://localhost:3000" -ForegroundColor Yellow
} else {
	Start-DevWindow `
		-Title "TCC Backend - localhost:3000" `
		-WorkingDirectory $BackendDir `
		-Command "node src/server.js"
	Write-Host "Backend starting at http://localhost:3000" -ForegroundColor Green
}

if (Test-LocalPort -Port 5173) {
	Write-Host "Frontend already running at http://localhost:5173" -ForegroundColor Yellow
} else {
	Start-DevWindow `
		-Title "TCC Frontend - localhost:5173" `
		-WorkingDirectory $FrontendDir `
		-Command "node node_modules\vite\bin\vite.js --host 0.0.0.0 --port 5173"
	Write-Host "Frontend starting at http://localhost:5173" -ForegroundColor Green
}

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Open this URL:" -ForegroundColor Cyan
Write-Host "http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Current listening ports:" -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "status-dev.ps1")
Write-Host ""
Write-Host "To stop later, run .\fechar-portas.cmd from the project root." -ForegroundColor Gray

Start-Process "http://localhost:5173"
