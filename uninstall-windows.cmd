@echo off
setlocal DisableDelayedExpansion
set "XRAY_SETUP_SCRIPT=%~dp0native-hosts\windows\uninstall.ps1"
set "XRAY_SETUP_POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "XRAY_SETUP_EXIT=1"
if not exist "%XRAY_SETUP_SCRIPT%" goto missing
if not exist "%XRAY_SETUP_POWERSHELL%" goto no_powershell
echo Xray for Chrome - uninstall companion for the current user
echo This launcher unblocks only the included uninstall.ps1 script.
echo It does not change your saved PowerShell execution policy.
"%XRAY_SETUP_POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy RemoteSigned -Command "$ErrorActionPreference='Stop'; try { $p=Get-ExecutionPolicy; if ($p -eq 'AllSigned' -or $p -eq 'Restricted') { throw 'Device policy requires administrator assistance or a trusted signed installer.' }; Unblock-File -LiteralPath $env:XRAY_SETUP_SCRIPT } catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }"
if errorlevel 1 goto blocked
"%XRAY_SETUP_POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy RemoteSigned -File "%XRAY_SETUP_SCRIPT%" %*
set "XRAY_SETUP_EXIT=%ERRORLEVEL%"
if not "%XRAY_SETUP_EXIT%"=="0" echo Setup did not complete. Read the error above.
goto finish
:missing
echo The companion script is missing. Extract the complete ZIP before running this file.
goto finish
:no_powershell
echo Windows PowerShell 5.1 was not found. This launcher is for Windows only.
goto finish
:blocked
echo Windows could not prepare the script. Read the error above.
echo For a managed device, contact your administrator. No policy was changed.
:finish
if not defined XRAY_SETUP_NO_PAUSE pause
exit /b %XRAY_SETUP_EXIT%
