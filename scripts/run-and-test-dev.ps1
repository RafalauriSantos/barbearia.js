[CmdletBinding()]
param(
	[switch] $NoBrowser
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$LogDir = Join-Path $Root "logs"

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

function Wait-Http {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Name,
		[Parameter(Mandatory = $true)]
		[string] $Url,
		[int] $TimeoutSec = 60
	)

	$deadline = (Get-Date).AddSeconds($TimeoutSec)
	$lastError = ""

	do {
		try {
			$response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
			if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
				Write-Host "$Name respondeu em $Url" -ForegroundColor Green
				return $true
			}
			$lastError = "HTTP $($response.StatusCode)"
		} catch {
			$lastError = $_.Exception.Message
		}

		Start-Sleep -Seconds 1
	} while ((Get-Date) -lt $deadline)

	Write-Host "$Name nao respondeu em $Url - $lastError" -ForegroundColor Red
	return $false
}

function Start-NodeProcess {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Name,
		[Parameter(Mandatory = $true)]
		[string] $WorkingDirectory,
		[Parameter(Mandatory = $true)]
		[string[]] $Arguments,
		[Parameter(Mandatory = $true)]
		[string] $OutLog,
		[Parameter(Mandatory = $true)]
		[string] $ErrLog
	)

	$node = (Get-Command node -ErrorAction Stop).Source
	$process = Start-Process `
		-FilePath $node `
		-ArgumentList $Arguments `
		-WorkingDirectory $WorkingDirectory `
		-WindowStyle Hidden `
		-RedirectStandardOutput $OutLog `
		-RedirectStandardError $ErrLog `
		-PassThru

	Write-Host "$Name iniciado - PID $($process.Id)" -ForegroundColor Green
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

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backendOutLog = Join-Path $LogDir "backend-dev-$stamp.out.log"
$backendErrLog = Join-Path $LogDir "backend-dev-$stamp.err.log"
$frontendOutLog = Join-Path $LogDir "frontend-dev-$stamp.out.log"
$frontendErrLog = Join-Path $LogDir "frontend-dev-$stamp.err.log"

Write-Host ""
Write-Host "iniciando e testando o tcc ..." -ForegroundColor Cyan
Write-Host ""

if (Test-LocalPort -Port 3000) {
	Write-Host "Backend ja esta rodando em http://localhost:3000" -ForegroundColor Yellow
} else {
	Start-NodeProcess `
		-Name "Backend" `
		-WorkingDirectory $BackendDir `
		-Arguments @("src/server.js") `
		-OutLog $backendOutLog `
		-ErrLog $backendErrLog
}

if (Test-LocalPort -Port 5173) {
	Write-Host "Frontend ja esta rodando em http://localhost:5173" -ForegroundColor Yellow
} else {
	Start-NodeProcess `
		-Name "Frontend" `
		-WorkingDirectory $FrontendDir `
		-Arguments @("node_modules\vite\bin\vite.js", "--host", "0.0.0.0", "--port", "5173") `
		-OutLog $frontendOutLog `
		-ErrLog $frontendErrLog
}

Write-Host ""
Write-Host "Aguardando os servidores responderem..." -ForegroundColor Cyan
$backendReady = Wait-Http -Name "Backend" -Url "http://127.0.0.1:3000/health" -TimeoutSec 60
$frontendReady = Wait-Http -Name "Frontend" -Url "http://127.0.0.1:5173/" -TimeoutSec 60

if (-not ($backendReady -and $frontendReady)) {
	Write-Host ""
	Write-Host "Nao foi possivel validar porque um servidor nao respondeu." -ForegroundColor Red
	Write-Host "Logs gerados em: $LogDir" -ForegroundColor Yellow
	Write-Host "Para limpar as portas, rode .\fechar-portas.cmd" -ForegroundColor Yellow
	exit 1
}

Write-Host ""
& (Join-Path $PSScriptRoot "test-dev.ps1")
$testExitCode = $LASTEXITCODE

if ($testExitCode -eq 0) {
	Write-Host ""
	Write-Host "TCC rodando e validado." -ForegroundColor Green
	Write-Host "URL: http://localhost:5173/app" -ForegroundColor White
	Write-Host "Para parar depois, rode .\fechar-portas.cmd" -ForegroundColor Gray

	if (-not $NoBrowser) {
		Start-Process "http://localhost:5173/app"
	}
}

exit $testExitCode
