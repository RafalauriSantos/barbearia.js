$ErrorActionPreference = "Stop"

$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Name,
		[Parameter(Mandatory = $true)]
		[bool] $Passed,
		[string] $Details = ""
	)

	$checks.Add([pscustomobject]@{
		Name = $Name
		Passed = $Passed
		Details = $Details
	})
}

function Test-HttpJson {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Name,
		[Parameter(Mandatory = $true)]
		[string] $Url,
		[hashtable] $Headers = @{},
		[int] $TimeoutSec = 20
	)

	try {
		$response = Invoke-RestMethod -Uri $Url -Headers $Headers -TimeoutSec $TimeoutSec
		$summary = if ($null -eq $response) {
			"empty response"
		} elseif ($response -is [array]) {
			"$($response.Count) item(s)"
		} else {
			"ok"
		}
		Add-Check -Name $Name -Passed $true -Details $summary
	} catch {
		$message = if ($_.Exception.Response) {
			"HTTP $([int]$_.Exception.Response.StatusCode)"
		} else {
			$_.Exception.Message
		}
		Add-Check -Name $Name -Passed $false -Details $message
	}
}

function Invoke-ApiJson {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Method,
		[Parameter(Mandatory = $true)]
		[string] $Url,
		[object] $Body = $null,
		[hashtable] $Headers = @{},
		[int] $TimeoutSec = 20
	)

	$params = @{
		Method = $Method
		Uri = $Url
		ContentType = "application/json"
		Headers = $Headers
		TimeoutSec = $TimeoutSec
	}

	if ($null -ne $Body) {
		$params.Body = $Body | ConvertTo-Json -Depth 8
	}

	Invoke-RestMethod @params
}

function Remove-TemporaryAuthUser {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Email
	)

	$backendDir = Join-Path (Split-Path -Parent $PSScriptRoot) "backend"
	$cleanupScript = Join-Path $backendDir "scripts\cleanup-test-auth-user.js"

	$previousValue = $env:TEST_AUTH_EMAIL_TO_DELETE
	$env:TEST_AUTH_EMAIL_TO_DELETE = $Email
	try {
		Push-Location $backendDir
		& node $cleanupScript | Out-Null
		return $LASTEXITCODE -eq 0
	} finally {
		Pop-Location
		if ($null -eq $previousValue) {
			Remove-Item Env:\TEST_AUTH_EMAIL_TO_DELETE -ErrorAction SilentlyContinue
		} else {
			$env:TEST_AUTH_EMAIL_TO_DELETE = $previousValue
		}
	}
}

function Test-AuthenticatedAppointments {
	$apiBaseUrl = "http://127.0.0.1:3000"
	$email = "local-check-$([guid]::NewGuid().ToString("N"))@example.com"
	$password = "LocalCheck123!"

	try {
		$register = Invoke-ApiJson `
			-Method "POST" `
			-Url "$apiBaseUrl/auth/register" `
			-Body @{ email = $email; password = $password }

		if (-not $register.verificationUrl) {
			Add-Check -Name "API /agendamentos authenticated" -Passed $false -Details "missing verificationUrl"
			return
		}

		$tokenMatch = [regex]::Match($register.verificationUrl, "token=([^&]+)")
		if (-not $tokenMatch.Success) {
			Add-Check -Name "API /agendamentos authenticated" -Passed $false -Details "missing verification token"
			return
		}

		$verifyToken = [uri]::UnescapeDataString($tokenMatch.Groups[1].Value)
		Invoke-ApiJson `
			-Method "POST" `
			-Url "$apiBaseUrl/auth/verify-email" `
			-Body @{ token = $verifyToken } | Out-Null

		$session = Invoke-ApiJson `
			-Method "POST" `
			-Url "$apiBaseUrl/auth/login" `
			-Body @{ email = $email; password = $password }

		if (-not $session.accessToken) {
			Add-Check -Name "API /agendamentos authenticated" -Passed $false -Details "missing accessToken"
			return
		}

		$headers = @{ Authorization = "Bearer $($session.accessToken)" }
		Test-HttpJson `
			-Name "API /agendamentos authenticated" `
			-Url "$apiBaseUrl/agendamentos" `
			-Headers $headers
	} catch {
		$message = if ($_.Exception.Response) {
			"HTTP $([int]$_.Exception.Response.StatusCode)"
		} else {
			$_.Exception.Message
		}
		Add-Check -Name "API /agendamentos authenticated" -Passed $false -Details $message
	} finally {
		$removed = Remove-TemporaryAuthUser -Email $email
		Add-Check -Name "Cleanup temp auth user" -Passed $removed -Details $email
	}
}

function Test-HttpPage {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Name,
		[Parameter(Mandatory = $true)]
		[string] $Url
	)

	try {
		$response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
		Add-Check -Name $Name -Passed ($response.StatusCode -eq 200) -Details "HTTP $($response.StatusCode)"
	} catch {
		$message = if ($_.Exception.Response) {
			"HTTP $([int]$_.Exception.Response.StatusCode)"
		} else {
			$_.Exception.Message
		}
		Add-Check -Name $Name -Passed $false -Details $message
	}
}

Write-Host ""
Write-Host "testando o tcc ..." -ForegroundColor Cyan
Write-Host ""

Test-HttpPage -Name "Frontend /" -Url "http://127.0.0.1:5173/"
Test-HttpPage -Name "Frontend /app" -Url "http://127.0.0.1:5173/app"
Test-HttpJson -Name "Backend /health" -Url "http://127.0.0.1:3000/health" -TimeoutSec 10
Test-HttpJson -Name "Backend /health/db" -Url "http://127.0.0.1:3000/health/db" -TimeoutSec 25
Test-HttpJson -Name "API /profile" -Url "http://127.0.0.1:3000/profile"
Test-HttpJson -Name "API /services" -Url "http://127.0.0.1:3000/services"
Test-HttpJson -Name "API /products" -Url "http://127.0.0.1:3000/products"
Test-HttpJson -Name "API /expenses" -Url "http://127.0.0.1:3000/expenses"
Test-AuthenticatedAppointments

$failed = 0
foreach ($check in $checks) {
	if ($check.Passed) {
		Write-Host ("PASS  {0} - {1}" -f $check.Name, $check.Details) -ForegroundColor Green
	} else {
		$failed += 1
		Write-Host ("FAIL  {0} - {1}" -f $check.Name, $check.Details) -ForegroundColor Red
	}
}

Write-Host ""
if ($failed -eq 0) {
	Write-Host "Everything responded successfully." -ForegroundColor Green
	Write-Host "Open http://localhost:5173/app and test creating an appointment from the + button." -ForegroundColor White
	exit 0
}

Write-Host "$failed check(s) failed." -ForegroundColor Red
Write-Host "Use .\validar-tudo.cmd to start and test automatically, or run .\rodar-tudo.cmd before .\testar-tudo.cmd." -ForegroundColor Yellow
exit 1
