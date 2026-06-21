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
		Headers = $Headers
		TimeoutSec = $TimeoutSec
	}

	if ($null -ne $Body) {
		$params.ContentType = "application/json"
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

		if (-not $register.verificationCode) {
			Add-Check -Name "API /agendamentos authenticated" -Passed $false -Details "missing verificationCode"
			return
		}

		Invoke-ApiJson `
			-Method "POST" `
			-Url "$apiBaseUrl/auth/verify-code" `
			-Body @{ email = $email; code = $register.verificationCode } | Out-Null

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
			-Name "API /profile authenticated" `
			-Url "$apiBaseUrl/profile" `
			-Headers $headers

		Test-HttpJson `
			-Name "API /services authenticated" `
			-Url "$apiBaseUrl/services" `
			-Headers $headers

		Test-HttpJson `
			-Name "API /products authenticated" `
			-Url "$apiBaseUrl/products" `
			-Headers $headers

		Test-HttpJson `
			-Name "API /expenses authenticated" `
			-Url "$apiBaseUrl/expenses" `
			-Headers $headers

		try {
			$profile = Invoke-ApiJson `
				-Method "PUT" `
				-Url "$apiBaseUrl/profile" `
				-Headers $headers `
				-Body @{ shopName = "Barbearia Check"; barberName = "Barbeiro Check" }

			$profileOk = $profile.shopName -eq "Barbearia Check" -and $profile.barberName -eq "Barbeiro Check"
			$profileDetails = if ($profileOk) { "ok" } else { "unexpected response" }
			Add-Check -Name "API /profile update authenticated" -Passed $profileOk -Details $profileDetails
		} catch {
			$message = if ($_.Exception.Response) {
				"HTTP $([int]$_.Exception.Response.StatusCode)"
			} else {
				$_.Exception.Message
			}
			Add-Check -Name "API /profile update authenticated" -Passed $false -Details $message
		}

		$serviceId = $null
		$appointmentId = $null
		try {
			$serviceName = "Servico Check $([guid]::NewGuid().ToString("N").Substring(0, 8))"
			$service = Invoke-ApiJson `
				-Method "POST" `
				-Url "$apiBaseUrl/services" `
				-Headers $headers `
				-Body @{ name = $serviceName; price = 25 }

			$serviceOk = $service.name -eq $serviceName -and $service.id
			$serviceDetails = if ($serviceOk) { "created $($service.id)" } else { "unexpected response" }
			Add-Check -Name "API /services create authenticated" -Passed $serviceOk -Details $serviceDetails
			if ($service.id) { $serviceId = $service.id }
		} catch {
			$message = if ($_.Exception.Response) {
				"HTTP $([int]$_.Exception.Response.StatusCode)"
			} else {
				$_.Exception.Message
			}
			Add-Check -Name "API /services create authenticated" -Passed $false -Details $message
		}

		if ($serviceId) {
			try {
				$paymentMethods = Invoke-ApiJson `
					-Method "GET" `
					-Url "$apiBaseUrl/payment-methods" `
					-Headers $headers
				$pixMethod = $paymentMethods |
					Where-Object { $_.code -eq "pix" } |
					Select-Object -First 1
				$pixId = [string]$pixMethod.id

				if (-not $pixId) {
					throw "Pix payment method is missing"
				}

				$today = Get-Date -Format "yyyy-MM-dd"
				$appointment = Invoke-ApiJson `
					-Method "POST" `
					-Url "$apiBaseUrl/agendamentos" `
					-Headers $headers `
					-Body @{
						client_name = "Cliente Check"
						day_key = $today
						time_slot = "16:37"
						status = "paid"
						payment_method_id = $pixId
						services = @(@{
							id = $serviceId
							name = "Nome adulterado"
							price = 1
							quantity = 1
						})
						products = @()
					}

				$appointmentId = [string]$appointment.id
				$appointmentOk =
					$appointmentId -and
					[decimal]$appointment.value -eq 25 -and
					$appointment.service_name -eq $serviceName -and
					$appointment.payment_method_code -eq "pix"
				$appointmentDetails = if ($appointmentOk) {
					"created $appointmentId with canonical catalog value"
				} else {
					"unexpected response"
				}
				Add-Check -Name "API atomic paid appointment" -Passed $appointmentOk -Details $appointmentDetails

				$summary = Invoke-ApiJson `
					-Method "GET" `
					-Url "$apiBaseUrl/financial/summary?start_date=$today&end_date=$today" `
					-Headers $headers
				$financialOk = [decimal]$summary.total_pago_geral -eq 25
				Add-Check `
					-Name "API atomic appointment financial summary" `
					-Passed $financialOk `
					-Details "gross $($summary.total_pago_geral)"
			} catch {
				$message = if ($_.ErrorDetails.Message) {
					$_.ErrorDetails.Message
				} elseif ($_.Exception.Response) {
					"HTTP $([int]$_.Exception.Response.StatusCode)"
				} else {
					$_.Exception.Message
				}
				Add-Check -Name "API atomic paid appointment" -Passed $false -Details $message
			} finally {
				if ($appointmentId) {
					try {
						Invoke-ApiJson `
							-Method "DELETE" `
							-Url "$apiBaseUrl/agendamentos/$appointmentId" `
							-Headers $headers | Out-Null
						Add-Check -Name "API atomic appointment cleanup" -Passed $true -Details "removed $appointmentId"
					} catch {
						Add-Check -Name "API atomic appointment cleanup" -Passed $false -Details $_.Exception.Message
					}
				}
			}

			try {
				Invoke-ApiJson `
					-Method "DELETE" `
					-Url "$apiBaseUrl/services/$serviceId" `
					-Headers $headers | Out-Null
				Add-Check -Name "API /services cleanup authenticated" -Passed $true -Details "removed $serviceId"
			} catch {
				$message = if ($_.Exception.Response) {
					"HTTP $([int]$_.Exception.Response.StatusCode)"
				} else {
					$_.Exception.Message
				}
				Add-Check -Name "API /services cleanup authenticated" -Passed $false -Details $message
			}
		}

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
