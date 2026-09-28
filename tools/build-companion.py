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

WINDOWS_README = f"""Xray for Chrome - Windows companion (v{version})

1. Close Chrome and disconnect the extension if it is connected.
2. Extract this whole ZIP (right-click > Extract All).
3. Double-click install-windows.cmd and wait for "Installation completed successfully".
4. Reopen Chrome.

Installed from the Chrome Web Store? Open the extension's Setup guide, copy the
Windows command (it includes your extension ID) and run it in PowerShell from
this folder instead of double-clicking.

To remove the companion later, double-click uninstall-windows.cmd.
"""

MACOS_README = f"""Xray for Chrome - macOS companion (v{version})

1. Quit Chrome (Cmd+Q) and disconnect the extension if it is connected.
2. Double-click the ZIP to extract it.
3. Right-click "install.command" in the extracted folder, choose Open, then Open again.
   (macOS asks for this once because the file was downloaded from the internet.)
4. Wait for the installation-complete message and reopen Chrome.

Installed from the Chrome Web Store? Open the extension's Setup guide and copy the
macOS command (it includes your extension ID) and run it in Terminal instead.

To remove the companion later, right-click "uninstall.command" > Open.
"""

# (archive name, source path or None, text content or None, executable)
windows_files = [
    ('README.txt', None, WINDOWS_README, False),
    ('install-windows.cmd', root / 'install-windows.cmd', None, False),
    ('uninstall-windows.cmd', root / 'uninstall-windows.cmd', None, False),
    ('native-hosts/windows/install.ps1', root / 'native-hosts/windows/install.ps1', None, False),
    ('native-hosts/windows/uninstall.ps1', root / 'native-hosts/windows/uninstall.ps1', None, False),
    ('native-hosts/windows/XrayChromeHost.cs', root / 'native-hosts/windows/XrayChromeHost.cs', None, False),
]
mac_dir = root / 'native-hosts/macos'
macos_files = [
    ('README.txt', None, MACOS_README, False),
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
            info = zipfile.ZipInfo(arcname, (2026, 9, 28, 0, 0, 0))
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
