@echo off
setlocal

set "ROOT=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\start-dev.ps1"

if errorlevel 1 (
	echo.
	echo Failed to start the project.
	pause
)

endlocal
