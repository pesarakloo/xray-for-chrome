#Requires -Version 5.1
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$HostName = "com.anicloud.xray_chrome"
$InstallDir = Join-Path $env:LOCALAPPDATA "XrayChrome"
$StatePath = Join-Path $InstallDir "runtime\state.json"
$RegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"

if (Test-Path $StatePath) {
    try {
        $State = Get-Content -Raw -LiteralPath $StatePath | ConvertFrom-Json
        $Process = Get-Process -Id ([int]$State.pid) -ErrorAction Stop
        if ($Process.ProcessName -eq "xray") { Stop-Process -Id $Process.Id -Force }
    } catch { }
}

if (Test-Path $RegistryPath) { Remove-Item -LiteralPath $RegistryPath -Recurse -Force }
if (Test-Path $InstallDir) { Remove-Item -LiteralPath $InstallDir -Recurse -Force }

Write-Host "The companion app and Xray were removed. Remove the extension from chrome://extensions too." -ForegroundColor Green
