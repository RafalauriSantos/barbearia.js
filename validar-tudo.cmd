@echo off
setlocal

set "ROOT=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\check-all.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"

if "%EXIT_CODE%"=="0" (
	echo.
	echo Tudo passou. Iniciando o app local...
	powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\run-and-test-dev.ps1"
	set "EXIT_CODE=%ERRORLEVEL%"
)

echo.
pause

endlocal & exit /b %EXIT_CODE%
