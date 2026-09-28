#!/usr/bin/env python3
"""Build only the Chrome Web Store ZIP. Uses the Python standard library."""
from pathlib import Path
import hashlib
import json
import stat
import zipfile

root = Path(__file__).resolve().parents[1]
extension = root / 'extension'
manifest = json.loads((extension / 'manifest.json').read_text(encoding='utf-8'))
package = json.loads((root / 'package.json').read_text(encoding='utf-8'))
assert manifest['version'] == package['version'], 'Version mismatch'
assert manifest['default_locale'] == 'en'
assert not manifest.get('host_permissions'), 'Host access must remain optional'
assert manifest['optional_host_permissions'] == ['https://*/*']
for path in [manifest['background']['service_worker'], manifest['action']['default_popup'], *manifest['icons'].values(), 'privacy.html']:
    assert (extension / path).is_file(), f'Missing extension file: {path}'
for language in ['fa', 'en']:
    messages = json.loads((extension / '_locales' / language / 'messages.json').read_text(encoding='utf-8'))
    assert 0 < len(messages['appDescription']['message']) <= 132

# Keep the existing key for unpacked upgrades. The store assigns its own identity.
store_manifest = {k: v for k, v in manifest.items() if k != 'key'}
release = root / 'release'
release.mkdir(exist_ok=True)
target = release / f"chrome-web-store-v{manifest['version']}.zip"
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for source in sorted(extension.rglob('*')):
        if not source.is_file():
            continue
        relative = source.relative_to(extension).as_posix()
        assert not source.is_symlink(), f'Unexpected symlink: {relative}'
        data = source.read_bytes()
        if relative == 'manifest.json':
            data = (json.dumps(store_manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
        info = zipfile.ZipInfo(relative, (2026, 9, 27, 0, 0, 0))
        info.create_system = 3
        info.external_attr = (stat.S_IFREG | 0o644) << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, data)
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    assert 'manifest.json' in archive.namelist()
    assert 'key' not in json.loads(archive.read('manifest.json'))
digest = hashlib.sha256(target.read_bytes()).hexdigest()
(release / 'SHA256SUMS.txt').write_text(f'{digest}  {target.name}\n', encoding='ascii')
print(f'{target.name}: {target.stat().st_size} bytes; SHA-256 {digest}')
