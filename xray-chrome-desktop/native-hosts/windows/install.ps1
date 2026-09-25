#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$XrayExe = "",
    [switch]$SkipDownload,
    [switch]$StableOnly,
    [switch]$ForceDownload,
    [ValidateRange(10, 600)]
    [int]$MetadataTimeoutSec = 30,
    [ValidateRange(30, 3600)]
    [int]$DownloadTimeoutSec = 180
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if ($ForceDownload -and ($SkipDownload -or $XrayExe)) {
    throw "-ForceDownload cannot be combined with -SkipDownload or -XrayExe."
}

$ExtensionId = "kcefgbldpcaoicjpdcmilahhlcbcflpj"
$HostName = "com.anicloud.xray_chrome"
$InstallDir = Join-Path $env:LOCALAPPDATA "XrayChrome"
$HostDir = Join-Path $InstallDir "host"
$XrayDir = Join-Path $InstallDir "xray"
$InstalledXrayPath = Join-Path $XrayDir "xray.exe"
$RuntimeDir = Join-Path $InstallDir "runtime"
$LogsDir = Join-Path $InstallDir "logs"
$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$HostSource = Join-Path $SourceDir "XrayChromeHost.cs"
$HostExe = Join-Path $HostDir "XrayChromeHost.exe"
$ManifestPath = Join-Path $HostDir "$HostName.json"
$RegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"

function Find-CSharpCompiler {
    $Candidates = @(
        (Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"),
        (Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe")
    )
    foreach ($Candidate in $Candidates) {
        if (Test-Path $Candidate) { return $Candidate }
    }
    throw ".NET Framework compiler was not found. Install .NET Framework 4.8 first."
}

function Stop-InstalledXray {
    $StatePath = Join-Path $RuntimeDir "state.json"
    if (-not (Test-Path $StatePath)) { return }
    try {
        $State = Get-Content -Raw -LiteralPath $StatePath | ConvertFrom-Json
        $Process = Get-Process -Id ([int]$State.pid) -ErrorAction Stop
        if ($Process.ProcessName -eq "xray") {
            Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
            $Process.WaitForExit(3000)
        }
    } catch { }
    Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
}

function Install-XrayFromPath([string]$Path) {
    $Resolved = (Resolve-Path -LiteralPath $Path).Path
    if ((Split-Path -Leaf $Resolved) -ne "xray.exe") { throw "The selected file must be named xray.exe." }
    if (-not (Test-Path -LiteralPath $Resolved -PathType Leaf) -or (Get-Item -LiteralPath $Resolved).Length -eq 0) {
        throw "The selected xray.exe is missing or empty."
    }
    if ($Resolved -eq $InstalledXrayPath) {
        Write-Host "Using the selected Xray that is already installed." -ForegroundColor Green
        return
    }
    Copy-Item -LiteralPath $Resolved -Destination $InstalledXrayPath -Force
    foreach ($DataName in @("geoip.dat", "geosite.dat")) {
        $DataPath = Join-Path (Split-Path -Parent $Resolved) $DataName
        if (Test-Path $DataPath) { Copy-Item -LiteralPath $DataPath -Destination $XrayDir -Force }
    }
}

function Download-OfficialXray {
    Write-Host "Fetching Xray v25.8.3 metadata from api.github.com (timeout: $MetadataTimeoutSec seconds)..." -ForegroundColor Cyan
    $Headers = @{ "User-Agent" = "XrayChromeInstaller/0.3.0"; "Accept" = "application/vnd.github+json" }
    try {
        $Releases = @(Invoke-RestMethod -UseBasicParsing -Uri "https://api.github.com/repos/XTLS/Xray-core/releases/tags/v25.8.3" -Headers $Headers -TimeoutSec $MetadataTimeoutSec -ErrorAction Stop)
    }
    catch {
        throw ("Could not read the official Xray release from GitHub. Check access to api.github.com, or install offline with -XrayExe and the path to an official xray.exe. Details: " + $_.Exception.Message)
    }
    $Candidates = @($Releases | Where-Object { -not $_.draft })
    if ($StableOnly) { $Candidates = @($Candidates | Where-Object { -not $_.prerelease }) }
    if ($Candidates.Count -eq 0) { throw "No suitable Xray release was found on GitHub." }

    $Architecture = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64-v8a" } else { "64" }
    $AssetName = "Xray-windows-$Architecture.zip"
    $Release = $null
    $Asset = $null
    foreach ($Candidate in $Candidates) {
        $Match = @($Candidate.assets | Where-Object { $_.name -eq $AssetName } | Select-Object -First 1)
        if ($Match.Count -gt 0) { $Release = $Candidate; $Asset = $Match[0]; break }
    }
    if ($null -eq $Asset) { throw "$AssetName was not found in recent official releases." }

    $TempDir = Join-Path ([IO.Path]::GetTempPath()) ("xray-chrome-" + [Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
    try {
        $Archive = Join-Path $TempDir $AssetName
        Write-Host "Downloading $AssetName from GitHub (timeout: $DownloadTimeoutSec seconds)..." -ForegroundColor Cyan
        try {
            Invoke-WebRequest -UseBasicParsing -Uri $Asset.browser_download_url -Headers $Headers -OutFile $Archive -TimeoutSec $DownloadTimeoutSec -ErrorAction Stop
        }
        catch {
            throw ("Xray download failed. Check access to GitHub, increase -DownloadTimeoutSec for a slow connection, or install offline with -XrayExe. Details: " + $_.Exception.Message)
        }
        Write-Host "Checking and extracting the downloaded archive..." -ForegroundColor Cyan
        if ($Asset.digest -and $Asset.digest.StartsWith("sha256:")) {
            $Expected = $Asset.digest.Substring(7).ToLowerInvariant()
            $Actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $Archive).Hash.ToLowerInvariant()
            if ($Expected -ne $Actual) { throw "The Xray SHA-256 digest does not match the published digest." }
        }
        $Extracted = Join-Path $TempDir "unzipped"
        Expand-Archive -LiteralPath $Archive -DestinationPath $Extracted -Force
        $DownloadedExe = Get-ChildItem -Path $Extracted -Filter "xray.exe" -Recurse | Select-Object -First 1
        if ($null -eq $DownloadedExe) { throw "xray.exe was not found in the downloaded archive." }
        Install-XrayFromPath $DownloadedExe.FullName
        Write-Host ("Xray " + $Release.tag_name + " installed.") -ForegroundColor Green
    }
    finally {
        if (Test-Path $TempDir) { Remove-Item -LiteralPath $TempDir -Recurse -Force -ErrorAction SilentlyContinue }
    }
}

Write-Host "Installing Xray for Chrome for the current user" -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $HostSource -PathType Leaf)) {
    throw "XrayChromeHost.cs is missing. Extract the complete package and keep it beside install.ps1."
}
Write-Host "[1/3] Preparing the companion app..." -ForegroundColor Cyan
foreach ($Directory in @($InstallDir, $HostDir, $XrayDir, $RuntimeDir, $LogsDir)) {
    New-Item -ItemType Directory -Path $Directory -Force | Out-Null
}
Stop-InstalledXray

$Compiler = Find-CSharpCompiler
Copy-Item -LiteralPath $HostSource -Destination (Join-Path $HostDir "XrayChromeHost.cs") -Force
& $Compiler /nologo /target:exe /optimize+ /codepage:65001 /out:$HostExe /reference:System.Web.Extensions.dll /reference:System.Management.dll $HostSource
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $HostExe)) { throw "Building the companion app failed." }

Write-Host "[2/3] Preparing Xray..." -ForegroundColor Cyan
$ExistingXrayAvailable = Test-Path -LiteralPath $InstalledXrayPath -PathType Leaf
if ($ExistingXrayAvailable) {
    $ExistingXrayAvailable = (Get-Item -LiteralPath $InstalledXrayPath).Length -gt 0
}

if ($XrayExe) {
    Install-XrayFromPath $XrayExe
} elseif ($ForceDownload) {
    Download-OfficialXray
} elseif (Test-Path -LiteralPath (Join-Path $SourceDir "runtime\xray.exe") -PathType Leaf) {
    Install-XrayFromPath (Join-Path $SourceDir "runtime\xray.exe")
} elseif ($ExistingXrayAvailable) {
    Write-Host "Keeping the installed Xray unchanged. No download is needed." -ForegroundColor Green
    Write-Host "To download v25.8.3 again explicitly, run with -ForceDownload."
} elseif ($SkipDownload) {
    throw "No installed xray.exe was found. Run without -SkipDownload, or provide a local file with -XrayExe."
} else {
    Download-OfficialXray
}

Write-Host "[3/3] Registering the companion app with Chrome..." -ForegroundColor Cyan
$Manifest = [ordered]@{
    name = $HostName
    description = "Native host for Xray for Chrome"
    path = $HostExe
    type = "stdio"
    allowed_origins = @("chrome-extension://$ExtensionId/")
}
$Utf8NoBom = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($ManifestPath, ($Manifest | ConvertTo-Json -Depth 5), $Utf8NoBom)
New-Item -Path $RegistryPath -Force | Out-Null
Set-Item -Path $RegistryPath -Value $ManifestPath

Write-Host "`nInstallation completed successfully." -ForegroundColor Green
Write-Host "Close Chrome completely, reopen it, then load the extension folder."
Write-Host "In chrome://extensions, use Developer mode > Load unpacked and select ONLY:"
Write-Host ([IO.Path]::GetFullPath((Join-Path $SourceDir "..\..\extension"))) -ForegroundColor Yellow
Write-Host "Extension ID: $ExtensionId"
