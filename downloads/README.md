# Companion downloads — package 0.7.5

[فارسی](README.fa.md)

Small Windows and macOS installers linked from the extension's Setup guide. The Chrome Web Store route uses these ZIPs; the GitHub route uses scripts in the full project.

| System | Package |
| --- | --- |
| Windows 10/11 | [Windows companion](xray-companion-windows.zip) |
| macOS 12+ | [macOS companion](xray-companion-macos.zip) |

Extract the whole ZIP. In the installed extension, choose Setup guide → Chrome Web Store → your system and copy its command. Run it from the extracted folder. This registers the correct extension ID. Each ZIP contains README.txt and README.fa.txt. Checksums are in SHA256SUMS.txt.

The Mac installer downloads Xray 25.8.3 for Intel or Apple Silicon. Windows fresh installs also download 25.8.3; normal reinstalls keep an existing core. Rebuild these packages using `npm run companion`, then publish both ZIPs and checksums with the updated source.
