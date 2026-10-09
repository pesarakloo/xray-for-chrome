#!/usr/bin/env python3
"""Build the small companion packages that are attached to a GitHub release.

The ZIPs are written to downloads/ and committed to the repository. The file
names are fixed (no version) so that the extension can link to
https://github.com/pesarakloo/xray-for-chrome/raw/main/downloads/<name>
and users download only what they need instead of the whole repository.
Uses the Python standard library only.
"""
from pathlib import Path
import hashlib
import json
import stat
import zipfile

root = Path(__file__).resolve().parents[1]
package = json.loads((root / 'package.json').read_text(encoding='utf-8'))
version = package['version']
release = root / 'downloads'
release.mkdir(exist_ok=True)

WINDOWS_README = f"""Xray for Chrome - Windows companion (package v{version})

1. Open the installed extension > Setup guide > Chrome Web Store > Windows.
2. Download and fully extract this ZIP. Open the folder containing install-windows.cmd.
3. Type powershell in File Explorer's address bar and press Enter.
4. Copy the Windows install command from that extension's guide and run it here.
   It includes -ExtensionId with the actual installed extension ID.
5. Wait for success, fully close and reopen Chrome, then check the core in Connect.

A fresh install downloads Xray 26.6.27. Normal reinstalls keep an existing core.
For VLESS Encryption, disconnect, then run the guide's install command with -ForceDownload.
It installs Xray 26.6.27 (upstream pre-release); restarting Chrome is required.
Keep -ExtensionId in the command and keep the profile's encryption value unchanged.
Administrator access is not normally required. For a local binary, use -XrayExe.
To remove the companion, disconnect and run .\\uninstall-windows.cmd from this folder.
For the full GitHub project instead of this small ZIP, choose GitHub installation
in the guide. Persian instructions: README.fa.txt
"""

MACOS_README = f"""Xray for Chrome - macOS companion (package v{version})

1. Open the installed extension > Setup guide > Chrome Web Store > macOS.
2. Extract this ZIP. Open the folder containing install.command.
3. Open Terminal, type cd and a space, drag this folder into Terminal, then press Enter.
4. Copy the Mac install command from that extension's guide and run it here.
   It starts with /bin/zsh ./install.command and includes --extension-id.
5. Wait for success, quit Chrome with Cmd+Q and reopen it. Check the core in Connect.

Automatic downloads use Xray 25.8.3 for Intel or Apple Silicon, not the latest release.
For VLESS Encryption, add --xray-version v26.6.27 to the guide's install command.
This explicitly replaces the core with 26.6.27 (upstream pre-release).
Do not combine --xray-version with --xray. A normal reinstall restores 25.8.3.
Disconnect first and restart Chrome after installation.
No sudo or Xcode is needed. For a local binary, add --xray "/path/to/xray".
To remove the companion, disconnect and run /bin/zsh ./uninstall.command here.
For the full GitHub project, choose GitHub installation in the guide; its Mac
scripts are under native-hosts/macos/ instead. Persian instructions: README.fa.txt
"""

WINDOWS_README_FA = f"""برنامه مکمل ویندوز Xray for Chrome — نسخه بسته {version}

۱. در افزونه نصب‌شده، آموزش اتصال ← نصب از کروم استور ← ویندوز را انتخاب کنید.
۲. ZIP را کامل استخراج کنید و پوشه دارای install-windows.cmd را باز کنید.
۳. در نوار آدرس File Explorer عبارت powershell بنویسید و Enter بزنید.
۴. دستور نصب را از آموزش همان افزونه کپی و اینجا اجرا کنید؛ دستور شناسه واقعی افزونه را دارد.
۵. پس از پیام موفقیت، Chrome را کامل ببندید و باز کنید و وضعیت هسته را در اتصال ببینید.

نصب تازه Xray 26.6.27 را می‌گیرد؛ نصب مجدد عادی هسته قبلی را حفظ می‌کند.
برای VLESS Encryption، اتصال را قطع کنید و -ForceDownload را به دستور نصب راهنما اضافه کنید.
این دستور Xray 26.6.27 (با برچسب Pre-release در پروژه اصلی) را نصب می‌کند؛ Chrome را دوباره باز کنید.
شناسه -ExtensionId را در دستور نگه دارید و مقدار encryption کانفیگ را تغییر ندهید.
معمولاً Administrator لازم نیست. برای فایل محلی از -XrayExe استفاده کنید.
برای حذف، ابتدا اتصال را قطع و .\\uninstall-windows.cmd را از این پوشه اجرا کنید.
اگر به‌جای این ZIP کوچک پروژه کامل را دارید، مسیر نصب از گیت‌هاب را در راهنما انتخاب کنید.
نسخه انگلیسی: README.txt
"""

MACOS_README_FA = f"""برنامه مکمل مک Xray for Chrome — نسخه بسته {version}

۱. در افزونه نصب‌شده، آموزش اتصال ← نصب از کروم استور ← مک را انتخاب کنید.
۲. ZIP را استخراج و پوشه دارای install.command را باز کنید.
۳. Terminal را باز کنید، cd و یک فاصله بنویسید، این پوشه را بکشید و Enter بزنید.
۴. دستور نصب را از آموزش همان افزونه کپی و اینجا اجرا کنید؛ دستور با /bin/zsh ./install.command شروع می‌شود و --extension-id دارد.
۵. پس از موفقیت، Chrome را با Cmd+Q ببندید و باز کنید و وضعیت هسته را در اتصال ببینید.

دانلود خودکار برای Intel و Apple Silicon روی Xray 25.8.3 تنظیم شده است.
برای VLESS Encryption، گزینه --xray-version v26.6.27 را به دستور نصب راهنما اضافه کنید.
این دستور هسته را با 26.6.27 (با برچسب Pre-release در پروژه اصلی) جایگزین می‌کند.
--xray-version را با --xray ترکیب نکنید؛ نصب مجدد عادی دوباره 25.8.3 را نصب می‌کند.
ابتدا اتصال را قطع کنید و پس از نصب Chrome را دوباره باز کنید.
به sudo یا Xcode نیاز نیست. برای فایل محلی، --xray "/path/to/xray" را اضافه کنید.
برای حذف، اتصال را قطع و /bin/zsh ./uninstall.command را اینجا اجرا کنید.
در پروژه کامل گیت‌هاب، مسیر نصب از گیت‌هاب را انتخاب کنید؛ اسکریپت‌های مک در native-hosts/macos/ قرار دارند.
نسخه انگلیسی: README.txt
"""

# (archive name, source path or None, text content or None, executable)
windows_files = [
    ('README.txt', None, WINDOWS_README, False),
    ('README.fa.txt', None, WINDOWS_README_FA, False),
    ('install-windows.cmd', root / 'install-windows.cmd', None, False),
    ('uninstall-windows.cmd', root / 'uninstall-windows.cmd', None, False),
    ('native-hosts/windows/install.ps1', root / 'native-hosts/windows/install.ps1', None, False),
    ('native-hosts/windows/uninstall.ps1', root / 'native-hosts/windows/uninstall.ps1', None, False),
    ('native-hosts/windows/XrayChromeHost.cs', root / 'native-hosts/windows/XrayChromeHost.cs', None, False),
]
mac_dir = root / 'native-hosts/macos'
macos_files = [
    ('README.txt', None, MACOS_README, False),
    ('README.fa.txt', None, MACOS_README_FA, False),
    ('install.command', mac_dir / 'install.command', None, True),
    ('uninstall.command', mac_dir / 'uninstall.command', None, True),
    ('XrayChromeHost.command', mac_dir / 'XrayChromeHost.command', None, True),
    ('TcpProbe.command', mac_dir / 'TcpProbe.command', None, True),
    ('ResolveRelease.js', mac_dir / 'ResolveRelease.js', None, False),
    ('TcpTargets.js', mac_dir / 'TcpTargets.js', None, False),
]


def build(name, files):
    target = release / name
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for arcname, source, text, executable in files:
            if source is not None:
                assert source.is_file() and not source.is_symlink(), f'Missing or unexpected file: {source}'
                data = source.read_bytes()
            else:
                data = text.encode('utf-8')
            info = zipfile.ZipInfo(arcname, (2026, 10, 9, 0, 0, 0))
            info.create_system = 3
            mode = 0o755 if executable else 0o644
            info.external_attr = (stat.S_IFREG | mode) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data)
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
        if 'macos' in name:
            for info in archive.infolist():
                if info.filename.endswith('.command'):
                    assert (info.external_attr >> 16) & 0o111, f'{info.filename} lost its executable bit'
    return target


lines = []
for name, files in [('xray-companion-windows.zip', windows_files), ('xray-companion-macos.zip', macos_files)]:
    target = build(name, files)
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    lines.append(f'{digest}  {target.name}')
    print(f'{target.name}: {target.stat().st_size} bytes; SHA-256 {digest}')
(release / 'SHA256SUMS.txt').write_text('\n'.join(lines) + '\n', encoding='ascii')
