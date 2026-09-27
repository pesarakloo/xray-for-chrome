# Xray for Chrome

**Manage Xray connections in Google Chrome with a Persian/English interface, for Windows and macOS**

Extension and package version: **0.7.3** — Neon Blue interface

[Download releases](https://github.com/pesarakloo/xray-for-chrome/releases) · [Report an issue](https://github.com/pesarakloo/xray-for-chrome/issues) · [AniSoft website](https://anisoft.ir) · [Telegram channel](https://t.me/xray_chrome)

## New look in version 0.7.3

All five tabs have been redesigned based on reference screens: a navy background, blue glow, 3D shield, globe, config cards, and the local Vazirmatn font. The Persian/English interface, RTL/LTR direction, and Chrome window sizing are preserved.

![New interface preview](docs/screenshots/ui-overview.jpg)

This package is the **full GitHub build**; a new Chrome Web Store package is not yet ready at this stage. The companion app files are the same compatible 0.7.0 version, and this redesign does not require reinstalling them.

## Introduction

Xray for Chrome lets you add config links, fetch a server list from a subscription, measure response time, and manage the connection — all from within the browser.

The project consists of two parts: a **Chrome extension** for managing configs and setting the browser proxy, and a **companion app** for running the Xray core on the device. The two parts communicate via Native Messaging.

To use it, you need the extension, the companion app, and either a valid config or a subscription link. No server or subscription is provided with the project.

The proxy is applied to Chrome's normal profile. The operating system's proxy settings are not changed, and other applications and Incognito mode are not covered by this version.

## Features

- Persian by default with an instant switch to English; the chosen language is saved
- Bilingual interface with "Connect," "Add," "Manage," "Connection Guide," and "About" tabs
- Add one or more config links, each on its own line
- Add, manually refresh, and remove subscriptions
- Select a config and connect or disconnect from within the extension
- Response time shown on the connection page, the selection menu, and the config list
- Single and group HTTPS ping through the config's own path, with up to two simultaneous tests and the ability to stop the queue
- Testing via a temporary Xray instance on a separate local port, without changing the active connection
- Config cards with readable ping, server selection, and a three-dot menu for testing and removal; unified page scrolling
- Configs, subscriptions, and test results are stored on the device
- Core status and error reporting displayed
- Windows and macOS installation and connection guide with command copy buttons
- Local SOCKS5 running on `127.0.0.1:10808`
- Restricting non-proxied WebRTC UDP while connected, if allowed by Chrome settings
- Companion app installs to the user account, with no usual need for Administrator or `sudo` access

## Protocols and input formats

| Protocol | Link format | Status in 0.7.0 |
| --- | --- | --- |
| VLESS | `vless://` | Link entry and connection config generation |
| VMess AEAD | `vmess://` | Base64 link from JSON; `alterId = 0` only |
| Shadowsocks | `ss://` | Link entry and connection config generation; the encryption method must be supported by the installed core |
| Trojan | `trojan://` | Link entry is implemented; connection compatibility with this package's core has not yet been verified |

**Recognizing a link does not mean every combination of protocol, transport, and encryption is verified.** Settings must be compatible with the server and the Xray core version. In this version, the output structure for VLESS, VMess, and Shadowsocks has been fixed; the Trojan output structure needs separate review.

### Transport methods

| Transport method | Recognized names in the link |
| --- | --- |
| RAW / TCP | `raw`, `tcp` |
| WebSocket | `ws`, `websocket` |
| gRPC | `grpc`, `gun` |
| HTTPUpgrade | `httpupgrade`, `http-upgrade` |
| XHTTP | `xhttp`, `splithttp` |
| mKCP | `kcp`, `mkcp` |

The legacy `http` and `h2` values in input are mapped to XHTTP; this behavior does not mean independent support for the legacy HTTP/2 transport.

TLS and REALITY parameters, SNI, ALPN, and fingerprint values, and settings such as path, host, serviceName, and XHTTP extra are processed in the Parser. Compatibility of all advanced features, including REALITY, FinalMask, and mKCP, with every core version has not been verified.

Among Shadowsocks plugins, only `obfs-local;obfs=http` is converted into a RAW HTTP configuration. `v2ray-plugin` is not supported.

### Subscription

Subscription content must be in one of these two forms:

- A plain-text list of links, one config per line
- A Base64-encoded version of the same list

Clash YAML and sing-box JSON files cannot be imported. The initial fetch happens when the subscription is added; use the update button in the "Manage" tab to fetch later changes.

## Prerequisites

| Item | Windows | macOS |
| --- | --- | --- |
| Target OS | Windows 10 or 11 | macOS 12 or later |
| Browser | Google Chrome 116 or later | Google Chrome 116 or later |
| Required tools | Windows PowerShell 5.1 and .NET Framework 4.8 | Built-in system tools |
| Companion app | `native-hosts/windows` folder | `native-hosts/macos` folder |

Internet access and access to GitHub are needed for a normal install. Installation is also possible with a local core file. macOS installation does not require Xcode, Swift, Python, or Command Line Tools. No installer is included in this package for Linux, Android, or iOS.

## 1. Getting the files

1. Open the [Releases](https://github.com/pesarakloo/xray-for-chrome/releases) page and download the full package for the version you want. If a release package is not available, choose **Code → Download ZIP** from the repository page.
2. Fully extract the ZIP file.
3. Go into the folder that contains `extension` and `native-hosts`. This folder is referred to below as the "project root folder."
4. Keep each installer's files together; downloading only `install.ps1` or only the `extension` folder is not enough to install the companion app.

## 2. Installing the companion app on Windows

If you're currently connected, click "Disconnect" first, then fully close Chrome.

Open the project root folder in File Explorer. Type `powershell` in the address bar and press Enter. Then run:

```powershell
.\install-windows.cmd
```

The installer builds the companion app, prepares the Xray core, and registers the Native Messaging connection for the current user account. Once you see the message `Installation completed successfully`, reopen Chrome.

For the manual version, you can also double-click `install-windows.cmd`. This launcher only unblocks this package's own `install.ps1` from the download block using `Unblock-File`. It does not change the permanent ExecutionPolicy setting or your antivirus. On a device with an organizational policy or a valid-signature requirement, you'll need help from a system administrator or a trust-signed installer. The current package does not have a valid Authenticode signature, and clearing all Windows warnings is not guaranteed.

**Chrome Web Store version:** First install the extension and open the guide tab; copy the Windows command from there. The command includes `-ExtensionId` with that version's real ID. The command without this option is for the manual version's fixed ID.

### Core version and reinstalling

The automatic Windows download in this package is set to **Xray v25.8.3**. On a normal reinstall, if a core is already installed and no local or bundled file replaces it, the existing core is kept.

To re-download the specified version:

```powershell
.\install-windows.cmd -ForceDownload
```

To install the companion app using the existing core, without downloading:

```powershell
.\install-windows.cmd -SkipDownload
```

If no existing core or bundled file is found, `-SkipDownload` will fail. This option is not enough for a fresh install with no core.

### Installing with a local file or a slow internet connection

Download and extract the official Xray file matching your Windows version and device architecture from [Xray-core releases](https://github.com/XTLS/Xray-core/releases). Replace the sample with the actual file path:

```powershell
.\install-windows.cmd -XrayExe "C:\Path\To\xray.exe"
```

The default timeout is 30 seconds for fetching release info and 180 seconds for downloading. For a slow connection you can increase them:

```powershell
.\install-windows.cmd -MetadataTimeoutSec 60 -DownloadTimeoutSec 600
```

Don't use the `-ForceDownload` option together with `-SkipDownload` or `-XrayExe`.

## 3. Installing the companion app on macOS

If you're currently connected, disconnect first and quit Chrome with **⌘ Q**.

For the store version, copy the ready-made command from that extension's guide tab; this command includes `--extension-id`. For the manual version, open Terminal, `cd` into the project root folder, and run:

```bash
/bin/zsh ./native-hosts/macos/install.command
```

Running the script directly with `/bin/zsh` doesn't require changing the execute permission on the downloaded file. The installer automatically detects the Mac architecture:

- **Apple Silicon:** the `Xray-macos-arm64-v8a.zip` package
- **Intel:** the `Xray-macos-64.zip` package

Once you see the installation-complete message, reopen Chrome.

### Choosing a version or a local file

The macOS installer picks the latest entry with a suitable file from the list of official Xray releases, and by default may also pick a pre-release. To restrict the choice to stable releases:

```bash
/bin/zsh ./native-hosts/macos/install.command --stable-only
```

To use an official file you've already downloaded and extracted:

```bash
/bin/zsh ./native-hosts/macos/install.command --xray "/path/to/xray"
```

On macOS, rerunning the installer without `--xray` fetches the core again. Its version-selection behavior is not the same as the Windows installer's.

## 4. Adding the extension to Chrome

These steps apply to manually loading the GitHub version on both operating systems:

1. Enter `chrome://extensions` in Chrome's address bar.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select only the **`extension`** folder; the `manifest.json` file must be directly inside this folder.
5. Pin Xray for Chrome to the toolbar from the extensions menu.
6. Open the extension and check the "engine" status.

Don't delete or move the extension folder after loading it.

Fixed ID for a version loaded from this package:

```text
kcefgbldpcaoicjpdcmilahhlcbcflpj
```

The ID above is for the manual version. Don't change the `key` value if you want to keep this version's data. The store version may have a different ID; the extension's guide command passes the real ID to the installer via `-ExtensionId` on Windows and `--extension-id` on macOS. Data from the two IDs is not transferred automatically; re-import your links and subscriptions in the store version, and don't remove the previous version before migrating.

Installing the extension from the Chrome Web Store doesn't require Developer mode, but the companion app is still installed separately. The store install link should be obtained from the project's official page.

## 5. Adding a config and connecting

### Manual entry

1. Open the "Add" tab.
2. Place one or more links in the "Add config" section; one link per line.
3. Click "Add links."
4. In the "Connect" tab, select the config.
5. Run "Ping test" if needed, then click "Connect."

### Using a subscription

1. In the "Add" tab, go to the "Add subscription" section.
2. Enter a name of your choice and a direct **HTTPS link without redirects**. HTTP links are not accepted in this version; get an HTTPS link from your provider.
3. Click "Fetch and add" and confirm access to that subscription's domain.
4. Once the list is fetched, select the config you want in the "Connect" tab.

You can manage configs and subscriptions in the "Manage" tab. The subscription address may contain an access token; don't publish it in a public report.

To end your session, click "Disconnect." The extension clears the proxy setting and the WebRTC restriction it applied itself, and stops the core associated with the connection.

## How is the ping calculated?

In version **0.7.0**, the HTTPS method from version 0.4.1 is retained: the response time of an **HTTPS request through the config's own path** to `https://www.gstatic.com/generate_204` is measured. A valid `204` response counts as success. This is not a TCP or ICMP test.

- For each config, a temporary Xray instance runs with that config's settings on a separate loopback port; the active connection and browser proxy are not changed.
- As with the previous method, at most **two simultaneous tests** run, so that running many Xray cores at once doesn't strain the device.
- The time shown is the HTTPS request time; core startup is not included in the ping number. The request timeout is **8 seconds**, and core startup has its own separate time.
- Configs are tested separately even with the same address and port, since login info, TLS, and transport method can differ.
- "Stop test" cancels the queue; tests already in progress finish within their own timeout, and completed results are kept.
- Unrecorded results, or ones older than **5 minutes**, are retested when the extension is opened or a config is re-added.
- TCP numbers stored in version 0.4.0 are not shown in this version and will be replaced by HTTPS results.
- Each row's status shows whether a config is waiting to be tested, being tested, has a response, has no response, or has an error.

Success in this test shows that an HTTPS request to the test destination got a response via the config's path; it does not guarantee access to all sites. "No response" may also result from a network restriction or from the test destination itself.

Companion app 0.4.0 also supports HTTPS. This package's 0.7.0 companion app uses the same ping logic; to register the store version's ID, run the new installer from the guide tab's command.

## Updating

1. Disconnect.
2. Fully download and extract the new version.
3. Replace the extension files in the same previous path.
4. Run this package's companion-app installer from the guide tab's command; the real ID must be registered, especially for the store version. The existing Windows core is kept during a normal install.
5. Reopen Chrome and click **Reload** in `chrome://extensions`.

You don't need to remove the extension to update it. Keeping the same path, ID, and Chrome profile helps preserve stored data. Removing the extension may erase local configs and subscriptions.

Each version's changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## Common troubleshooting

| Issue | Suggested action |
| --- | --- |
| `manifest.json` not found | Extract the ZIP and select only the `extension` folder in Load unpacked. |
| Companion app not found | Run the installer for the same user account, fully close and reopen Chrome, and also check the extension ID. |
| Windows install hangs on fetching Xray | Check GitHub access. The new installer has fetch and download timeouts; use `-XrayExe` if needed. |
| `XrayChromeHost.cs` file not found | Fully extract the package; this file must be next to `install.ps1`. |
| .NET compiler not found | Check that .NET Framework 4.8 and its build tools are present. |
| Core rejects the config | Open "Error report" and check the protocol, transport type, server info, and Xray version. |
| Proxy is controlled by another extension | Temporarily disable other proxy-controlling extensions and reconnect. |
| VMess won't connect | Set the system date and time correctly, and make sure the AEAD config has `alterId = 0`. |
| Subscription won't import | Check the subscription address and validity; the content must be a link list or its Base64 form. |
| Ping test doesn't work after upgrading | Reinstall the new package's companion app and reload the extension. |
| Ping succeeds but a site won't open | A successful ping shows access to the test destination; check the server's access to the site in question and the error report. |

## Privacy and permissions

Configs, subscription links, and test results are kept in `chrome.storage.local`. The active config is also written to the companion app's runtime folder to run the core. This data may include passwords or connection IDs and should not be assumed to be an encrypted file.

There is no mechanism in this package's code for sending usage statistics to the developer. However, fetching a subscription contacts the provider's server, the HTTPS ping through the config's path contacts gstatic, and downloading the core contacts GitHub over the network. For the HTTPS test, that config's settings are sent to the companion app, and the temporary core uses them to connect to your server. Proxied traffic also passes through your selected server.

| Permission | Use |
| --- | --- |
| `nativeMessaging` | Communicating with the companion app on the device |
| `proxy` | Setting and clearing the Chrome proxy |
| `storage` | Storing configs, subscriptions, and local state |
| `privacy` | Requesting to restrict non-proxied WebRTC while connected |
| Optional HTTPS access | Fetching subscriptions, only after user confirmation for that link's domain |

The core listens on `127.0.0.1`. Loopback addresses and excluded local names do not pass through the proxy. This version has no global Kill Switch feature and does not cover all device traffic.

## Install and uninstall paths

| OS | Companion app folder |
| --- | --- |
| Windows | `%LOCALAPPDATA%\XrayChrome` |
| macOS | `~/Library/Application Support/XrayChrome` |

The `runtime` folder contains runtime state and config, and the `logs` folder contains core logs. The Native Host name is `com.anicloud.xray_chrome`.

To uninstall, first disconnect and close Chrome. Run the appropriate command from the project root folder.

**Windows:**

```powershell
.\uninstall-windows.cmd
```

The uninstall launcher only unblocks this package's own `uninstall.ps1`; don't run the uninstall script directly unless you've reviewed it and unblocked it separately.

**macOS:**

```bash
/bin/zsh ./native-hosts/macos/uninstall.command
```

Then remove the extension from `chrome://extensions`. Removing the companion app and removing the extension are two separate steps.

## Project structure

| Path | Contents |
| --- | --- |
| `extension/` | The shared Chrome extension, Manifest V3 |
| `extension/popup/` | User interface and connection guide |
| `extension/modules/` | Link processing, config generation, storage, and response-time testing |
| `native-hosts/windows/` | Companion app and Windows scripts |
| `native-hosts/macos/` | Companion app and macOS scripts |
| `tests/` | The project's existing tests |
| `CHANGELOG.md` | Change history |

## Code checks

The JavaScript tests require Node.js; no dependency installation is needed to run them:

```bash
npm test
npm run check
```

These tests cover the Parser, config building, storage, group HTTPS test management, separation of legacy TCP results, stopping, and Native Messaging errors. The optional test for the remaining TCP capability in the Mac companion app (for compatibility with version 0.4.0), run with `npm run test:mac-helper`, requires Python 3 and zsh; these tools are only for developer testing and are not required for installing the extension. This test uses a real local connection and test substitutes for `nc` and `osascript`, and does not replace testing on macOS.

The automated tests are not a verification of real connectivity for all protocols, nor a confirmation of Chrome Web Store publication. The final install and connection should be checked on Windows and macOS with a valid config.

## Contact and issue reporting

- Website: [anisoft.ir](https://anisoft.ir)
- Project repository: [pesarakloo/xray-for-chrome](https://github.com/pesarakloo/xray-for-chrome)
- Telegram channel: [t.me/xray_chrome](https://t.me/xray_chrome)
- Report an issue: [GitHub Issues](https://github.com/pesarakloo/xray-for-chrome/issues)

When reporting an issue, include the extension and core version, OS, protocol type, and the error text. Before publishing a report, remove passwords, UUIDs, subscription tokens, and other private config info.

This project uses [XTLS/Xray-core](https://github.com/XTLS/Xray-core) to run the connection. A guide for manually loading the extension is also available in the [official Chrome documentation](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).


## Chrome Web Store release

This delivery is for GitHub, and there is no new store package. The write-ups in `store/` belong to the 0.7.0 draft; for the next submission, the description, real interface screenshots, permissions, and data disclosures need to be reviewed separately. The old package built from this output has been removed so it isn't accidentally uploaded by mistake. The `npm run release` tool remains for the store-preparation stage.

## Interface preview for development

With Node.js 22 or later and no dependency installation:

```sh
npm run dev
```

A local page on port 4173 opens the extension's real interface with sample data. Connection and ping are simulated in this preview, and no proxy actually runs. The `tools/preview/` files are outside the extension folder and are not loaded in the real build or the store package.

```sh
npm test
npm run check
```

Flags are shown only from the country code or a flag present in the config's name; no network request is made for server geolocation. The license for interface resources is in `THIRD-PARTY-NOTICES.md`.
