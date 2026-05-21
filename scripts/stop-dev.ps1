[CmdletBinding(SupportsShouldProcess = $true)]
param(
	[int[]] $Ports = @(3000, 5173)
)

$ErrorActionPreference = "Stop"

function Get-ListeningPortProcess {
	param(
		[Parameter(Mandatory = $true)]
		[int] $Port
	)

	$lines = netstat -ano | Select-String ":$Port\s"
	$listening = $lines | Where-Object { $_.Line -match "\sLISTENING\s+(\d+)$" }

	foreach ($line in $listening) {
		$match = [regex]::Match($line.Line, "\sLISTENING\s+(\d+)$")
		if (-not $match.Success) {
			continue
		}

		$pidValue = [int] $match.Groups[1].Value
		$process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue

		[pscustomobject]@{
			Port = $Port
			Pid = $pidValue
			ProcessName = if ($process) { $process.ProcessName } else { "unknown" }
			Process = $process
		}
	}
}

$targets = foreach ($port in $Ports) {
	Get-ListeningPortProcess -Port $port
}

$targets = @($targets | Sort-Object Pid, Port -Unique)

if (-not $targets -or $targets.Count -eq 0) {
	Write-Host ""
	Write-Host "No dev server ports are open." -ForegroundColor Yellow
	exit 0
}

Write-Host ""
Write-Host "Closing dev server ports..." -ForegroundColor Cyan

foreach ($target in $targets) {
	$description = "PID $($target.Pid) ($($target.ProcessName)) on port $($target.Port)"

	if (-not $target.Process) {
		Write-Host "Skipping ${description}: process not found" -ForegroundColor Yellow
		continue
	}

	if ($PSCmdlet.ShouldProcess($description, "Stop-Process")) {
		Stop-Process -Id $target.Pid -Force -ErrorAction Stop
		Write-Host "Closed ${description}" -ForegroundColor Green
	}
}

Start-Sleep -Milliseconds 400

Write-Host ""
Write-Host "Current listening ports:" -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "status-dev.ps1")

