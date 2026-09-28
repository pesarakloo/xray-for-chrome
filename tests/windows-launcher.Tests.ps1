#Requires -Version 5.1
# Run on Windows: powershell -NoProfile -File tests\windows-launcher.Tests.ps1
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Temporary = Join-Path ([IO.Path]::GetTempPath()) ('xray setup & test!-' + [Guid]::NewGuid().ToString('N'))
$PreviousNoPause = $env:XRAY_SETUP_NO_PAUSE
$PreviousOutput = $env:XRAY_LAUNCHER_TEST_OUTPUT
$PreviousFailure = $env:XRAY_LAUNCHER_TEST_FAIL
try {
    foreach ($Script in @('install.ps1', 'uninstall.ps1')) {
        $Tokens = $null; $ParseErrors = $null
        [Management.Automation.Language.Parser]::ParseFile((Join-Path $Root "native-hosts\windows\$Script"), [ref]$Tokens, [ref]$ParseErrors) | Out-Null
        if ($ParseErrors.Count) { throw ($ParseErrors | Out-String) }
    }
    $TargetDir = Join-Path $Temporary 'native-hosts\windows'
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    $env:XRAY_SETUP_NO_PAUSE = '1'
    $env:XRAY_LAUNCHER_TEST_OUTPUT = Join-Path $Temporary 'received.json'
    $Fixture = @'
param([string]$ExtensionId, [string]$XrayExe)
@{ id=$ExtensionId; path=$XrayExe } | ConvertTo-Json | Set-Content -LiteralPath $env:XRAY_LAUNCHER_TEST_OUTPUT
if ($env:XRAY_LAUNCHER_TEST_FAIL -eq '1') { exit 7 }
'@
    foreach ($Action in @('install', 'uninstall')) {
        $Launcher = Join-Path $Temporary "$Action-windows.cmd"
        Copy-Item -LiteralPath (Join-Path $Root "$Action-windows.cmd") -Destination $Launcher
        $Target = Join-Path $TargetDir "$Action.ps1"
        Set-Content -LiteralPath $Target -Value $Fixture -Encoding ASCII
        Set-Content -LiteralPath $Target -Stream Zone.Identifier -Value "[ZoneTransfer]`r`nZoneId=3"
        & $Launcher -ExtensionId 'abcdefghijklmnopabcdefghijklmnop' -XrayExe 'C:\Example path\xray.exe'
        if ($LASTEXITCODE -ne 0) { throw "$Action launcher failed: $LASTEXITCODE" }
        $Received = Get-Content -Raw -LiteralPath $env:XRAY_LAUNCHER_TEST_OUTPUT | ConvertFrom-Json
        if ($Received.id -ne 'abcdefghijklmnopabcdefghijklmnop' -or $Received.path -ne 'C:\Example path\xray.exe') { throw 'Arguments were not preserved.' }
        if (Get-Item -LiteralPath $Target -Stream Zone.Identifier -ErrorAction SilentlyContinue) { throw 'Download marker remains.' }
        $env:XRAY_LAUNCHER_TEST_FAIL = '1'
        & $Launcher
        if ($LASTEXITCODE -ne 7) { throw 'The launcher hid the script exit code.' }
        Remove-Item Env:\XRAY_LAUNCHER_TEST_FAIL
        Remove-Item -LiteralPath $Target
        & $Launcher
        if ($LASTEXITCODE -eq 0) { throw 'A missing installer must fail.' }
    }
    $Compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
    $OutputExe = Join-Path $Temporary 'XrayChromeHost.exe'
    & $Compiler /nologo /target:exe /codepage:65001 "/out:$OutputExe" /reference:System.Web.Extensions.dll /reference:System.Management.dll (Join-Path $Root 'native-hosts\windows\XrayChromeHost.cs')
    if ($LASTEXITCODE -ne 0) { throw 'Companion compilation failed.' }
    Write-Host 'PASS: installer syntax, downloaded-script launch, argument quoting, exit codes and companion compilation.'
} finally {
    $env:XRAY_SETUP_NO_PAUSE = $PreviousNoPause
    $env:XRAY_LAUNCHER_TEST_OUTPUT = $PreviousOutput
    $env:XRAY_LAUNCHER_TEST_FAIL = $PreviousFailure
    if (Test-Path -LiteralPath $Temporary) { Remove-Item -LiteralPath $Temporary -Recurse -Force }
}
