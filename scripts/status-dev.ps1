$ErrorActionPreference = "Stop"

$ports = @(3000, 5173)
$foundAny = $false

foreach ($port in $ports) {
	$lines = netstat -ano | Select-String ":$port\s"
	$listening = $lines | Where-Object { $_.Line -match "\sLISTENING\s+(\d+)$" }

	if (-not $listening) {
		Write-Host "Port ${port}: closed" -ForegroundColor Red
		continue
	}

	$foundAny = $true
	foreach ($line in $listening) {
		$pidValue = [regex]::Match($line.Line, "\sLISTENING\s+(\d+)$").Groups[1].Value
		$process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
		$name = if ($process) { $process.ProcessName } else { "unknown" }
		Write-Host "Port ${port}: open - PID ${pidValue} (${name})" -ForegroundColor Green
	}
}

if (-not $foundAny) {
	Write-Host ""
	Write-Host "No dev server ports are open. Run .\rodar-tudo.cmd from the project root." -ForegroundColor Yellow
}
