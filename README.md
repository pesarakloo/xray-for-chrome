# Xray for Chrome

**Manage Xray connections in Google Chrome with an English and Persian interface, for Windows and macOS**

Extension and package version: **0.7.4** — neon-blue interface

[Releases](https://github.com/pesarakloo/xray-for-chrome/releases) · [Report an issue](https://github.com/pesarakloo/xray-for-chrome/issues) · [Anisoft website](https://anisoft.ir) · [Telegram channel](https://t.me/xray_chrome)

## What's new in 0.7.4

All five tabs were redesigned based on the reference screens: a navy background, blue glow, a 3D shield, a globe, profile cards and the local Vazirmatn font. The English and Persian interface, RTL/LTR direction and the Chrome popup window size are preserved.

![New interface preview](docs/screenshots/ui-overview.jpg)

This package is the **full GitHub version**; a new Chrome Web Store package has not been prepared at this stage. The companion application files are the same 0.7.4-compatible version, and this redesign does not require reinstalling them.

## Overview

Xray for Chrome lets you add profile links, fetch server lists from a subscription, measure response time and manage the connection, all from inside the browser.

The project has two parts: the **Chrome extension**, which manages profiles and configures the browser's proxy, and a **companion application**, which runs the Xray core on the device. The two communicate through Native Messaging.

To use it, you need the extension, the companion application, and a valid profile or subscription link. This project does not provide a server or a subscription.

The proxy is applied to the regular Chrome profile. It does not change operating-system proxy settings, and other applications and Incognito mode are not covered by this version.

## Features

- English by default, with an instant switch to Persian; your language choice is saved
- A bilingual interface with "Connect", "Add", "Manage", "Setup guide" and "About" tabs
- Add one or more profile links, one per line
- Add, manually refresh and delete subscriptions
- Select a profile and connect or disconnect from inside the extension
- Response time shown on the Connect screen, the selection menu and the profile list
- Single and group HTTPS latency tests over the profile's own route, with at most two tests running at once and the ability to cancel the queue
- Testing uses a temporary Xray instance on a separate local port, without changing the active connection
- Profile cards with a readable latency reading, server selection and a three-dot menu for testing and deletion; a single continuous page scroll
- Profiles, subscriptions and test results are stored on the device
- Core status display and error diagnostics
- Windows and macOS setup and connection guide with copy-command buttons
- Runs a local SOCKS5 proxy on `127.0.0.1:10808`
- Restricts non-proxied WebRTC UDP while connected, when Chrome settings allow it
- Installs the companion app under the user account, without normally requiring Administrator or `sudo` access

## Protocols and input formats

| Protocol | Link format | Status in 0.7.4 |
| --- | --- | --- |
| VLESS | `vless://` | Link import and connection-configuration generation |
| VMess AEAD | `vmess://` | Base64 link from JSON; `alterId = 0` only |
| Shadowsocks | `ss://` | Link import and connection-configuration generation; the encryption method must be supported by the installed core |
| Trojan | `trojan://` | Link import is implemented; connection compatibility with this package's core has not yet been confirmed |

**Recognizing a link does not mean every combination of protocol, transport and encryption is confirmed to work.** The settings must be compatible with the server and the Xray core version. In this release, the VLESS, VMess and Shadowsocks output structures have been fixed; the Trojan output structure needs a separate review.

### Transport methods

| Transport | Names recognized in the link |
| --- | --- |
| RAW / TCP | `raw`, `tcp` |
| WebSocket | `ws`, `websocket` |
| gRPC | `grpc`, `gun` |
| HTTPUpgrade | `httpupgrade`, `http-upgrade` |
| XHTTP | `xhttp`, `splithttp` |
| mKCP | `kcp`, `mkcp` |

The legacy values `http` and `h2` are mapped to XHTTP on input; this does not mean independent support for the legacy HTTP/2 transport.

TLS and REALITY parameters, SNI, ALPN and fingerprint values, and settings such as path, host, serviceName and XHTTP extra are handled by the parser. Compatibility of all advanced features — including REALITY, FinalMask and mKCP — with every core version has not been confirmed.

Of the Shadowsocks plugins, only `obfs-local;obfs=http` is converted into RAW HTTP settings. `v2ray-plugin` is not supported.

### Subscriptions

Subscription content must be one of the following:

- A plain-text list of links, one profile per line
- A Base64-encoded version of that same list

Clash YAML and sing-box JSON files cannot be imported. The initial fetch happens when you add the subscription; use the refresh button in the "Manage" tab to pick up later changes.

## Requirements

| Item | Windows | macOS |
| --- | --- | --- |
| Target OS | Windows 10 or 11 | macOS 12 or newer |
| Browser | Google Chrome 116 or newer | Google Chrome 116 or newer |
| Required tools | Windows PowerShell 5.1 and .NET Framework 4.8 | Built-in system tools |
| Companion app | `native-hosts/windows` folder | `native-hosts/macos` folder |

Internet access and access to GitHub are required for a normal installation. Installing from a local core file is also possible. macOS installation does not require Xcode, Swift, Python or Command Line Tools. This package does not include an installer for Linux, Android or iOS.

## 1. Download the files

**Quickest route:** you only need the small companion package for your system, not the whole project. The extension's Setup guide has a **Download companion** button that links straight to it, or take it from the [`downloads/`](downloads/) folder of this repository:

- Windows: [`downloads/xray-companion-windows.zip`](downloads/xray-companion-windows.zip)
- macOS: [`downloads/xray-companion-macos.zip`](downloads/xray-companion-macos.zip)

Extract it and follow section 2 (Windows) or section 3 (macOS). The full project ZIP below is only needed to load the extension unpacked or to build from source.

1. Open the [Releases](https://github.com/pesarakloo/xray-for-chrome/releases) page and download the full package for the version you want. If a release package isn't available, use **Code → Download ZIP** from the repository page instead.
2. Fully extract the ZIP file.
3. Open the folder that contains `extension` and `native-hosts`. This is referred to below as the "project root folder".
4. Keep each installer's files together; downloading only `install.ps1`, or only the `extension` folder, is not enough to install the companion app.

## 2. Install the companion app on Windows

If you're currently connected, click "Disconnect" first, then fully close Chrome.

Open the project root folder in File Explorer. Type `powershell` in the address bar and press Enter. Then run:

```powershell
.\install-windows.cmd
```

With the small Windows companion package you can simply double-click `install-windows.cmd` instead of opening PowerShell. Use the command above when you installed the extension from the Chrome Web Store, because it carries your extension ID.

The installer builds the companion application, prepares the Xray core, and registers the Native Messaging connection for the current user account. Once you see `Installation completed successfully`, reopen Chrome.

For the manual (unpacked) version, you can also just double-click `install-windows.cmd`. This launcher only unblocks this package's own `install.ps1` with `Unblock-File`; it does not change the permanent ExecutionPolicy setting or any antivirus configuration. On a device with an organizational policy or a valid-signature requirement, you'll need help from your system administrator or a signed installer they trust. The current package does not have a valid Authenticode signature, and clearing every Windows warning is not guaranteed.

**Chrome Web Store version:** install the extension first and open its setup-guide tab; copy the Windows command from there. That command includes `-ExtensionId` with the real ID for that version. The command without this option is for the manual version's fixed ID.

### Core version and reinstalling

The automatic Windows download in this package is set to **Xray v25.8.3**. On a normal reinstall, if a core is already installed and it isn't replaced by a local file or one bundled with the package, the existing core is kept.

To force re-downloading the pinned version:

```powershell
.\install-windows.cmd -ForceDownload
```

To install the companion app using the existing core, without downloading:

```powershell
.\install-windows.cmd -SkipDownload
```

If no existing core or bundled file can be found, `-SkipDownload` fails with an error. This option is not sufficient for a fresh install with no core.

### Installing with a local file or on a slow connection

Download and extract the official Xray build matching your Windows architecture from the [Xray-core releases](https://github.com/XTLS/Xray-core/releases). Replace the example path with the actual file path:

```powershell
.\install-windows.cmd -XrayExe "C:\Path\To\xray.exe"
```

The default timeout is 30 seconds for fetching release metadata and 180 seconds for the download. You can increase these for a slow connection:

```powershell
.\install-windows.cmd -MetadataTimeoutSec 60 -DownloadTimeoutSec 600
```

Do not use `-ForceDownload` together with `-SkipDownload` or `-XrayExe`.

## 3. Install the companion app on macOS

If you're currently connected, disconnect first, then quit Chrome with **⌘ Q**.

For the store version, copy the ready-made command from that same extension's setup-guide tab; it includes `--extension-id`. For the manual version, open Terminal, `cd` into the project root folder, and run:

```bash
/bin/zsh ./native-hosts/macos/install.command
```

With the small macOS companion package, the scripts sit at the top level of the extracted folder: right-click `install.command`, choose **Open**, then **Open** again (macOS asks once for downloaded files), or run `/bin/zsh ./install.command`. For the store version, add `--extension-id` as shown in the Setup guide.

Running the script directly with `/bin/zsh` does not require changing the downloaded file's execute permission. The installer automatically detects your Mac's architecture:

- **Apple Silicon:** the `Xray-macos-arm64-v8a.zip` package
- **Intel:** the `Xray-macos-64.zip` package

Once you see the installation-complete message, reopen Chrome.

### Choosing a version or a local file

The macOS installer picks the newest release with a matching asset from the official Xray release list, and by default it may also pick a pre-release. To restrict the selection to stable releases only:

```bash
/bin/zsh ./native-hosts/macos/install.command --stable-only
```

To use an official file you've already downloaded and extracted yourself:

```bash
/bin/zsh ./native-hosts/macos/install.command --xray "/path/to/xray"
```

On macOS, rerunning the installer without `--xray` re-downloads the core; its version-selection behavior is not the same as the Windows installer's.

## 4. Add the extension to Chrome

These steps apply to loading the GitHub version manually on either operating system:

1. Enter `chrome://extensions` in Chrome's address bar.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select only the **`extension`** folder; the `manifest.json` file must sit directly inside it.
5. Pin Xray for Chrome to the toolbar from the extensions menu.
6. Open the extension and check the "Core" status.

Do not delete or move the extension folder after loading it.

The fixed ID for this package's loaded (unpacked) version is:

```text
kcefgbldpcaoicjpdcmilahhlcbcflpj
```

The ID above is for the manual version. Do not change the `key` value if you want to keep this version's data. The store version may have a different ID; the extension's setup-guide command passes the real ID to the installer via `-ExtensionId` on Windows and `--extension-id` on macOS. Data for the two IDs is not migrated automatically; re-import your links and subscriptions on the store version, and don't remove the previous version before migrating.

Installing the extension from the Chrome Web Store does not require Developer mode, but the companion app is still installed separately. The store install link should come from the project's official page.

## 5. Add a profile and connect

### Manual entry

1. Open the "Add" tab.
2. Paste one or more links into the "Add profile" section, one link per line.
3. Click "Import links".
4. In the "Connect" tab, select the profile.
5. Run "Test latency" if you want, then click "Connect".

### Using a subscription

1. In the "Add" tab, go to the "Add subscription" section.
2. Enter a name of your choice and the direct **HTTPS URL, with no redirect**. HTTP links are not accepted in this version; get an HTTPS link from your provider.
3. Click "Fetch and add" and approve access to that subscription's domain.
4. Once the list is fetched, select the profile you want in the "Connect" tab.

You can manage profiles and subscriptions from the "Manage" tab. A subscription URL may contain an access token; don't post it in a public bug report.

To finish using the extension, click "Disconnect". The extension clears the proxy setting and the WebRTC restriction it applied, and stops the core for that connection.

## How is latency measured?

In **0.7.4**, the HTTPS method from 0.4.1 is retained: response time is measured for an **HTTPS request over the profile's own route** to `https://www.gstatic.com/generate_204`. A valid `204` response counts as success. This is not a TCP or ICMP test.

- For each profile, a temporary Xray instance runs with that profile's settings on a separate loopback port; the active connection and the browser's proxy are not changed.
- As before, at most **two tests run at once**, so that running many Xray cores doesn't overload the device.
- The number shown is the HTTPS request time; core startup is not included in the latency figure. The request timeout is **8 seconds**, and core startup has its own separate timing.
- Profiles are tested individually even when they share the same address and port, since credentials, TLS and the transport method can differ.
- "Cancel test" cancels the queue; tests already in progress finish within their own timeout, and completed results are kept.
- Results that are missing or older than **5 minutes** are retested automatically when you open the extension or add a profile.
- TCP figures stored from version 0.4.0 are not shown in this version and will be replaced by HTTPS results.
- Each row's status shows whether a profile is waiting to be tested, being tested, has a response, has no response, or has an error.

A successful test shows that an HTTPS request to the test endpoint got a response over that profile's route; it does not guarantee access to every site. "No response" can also result from a network restriction or from the test endpoint itself.

The 0.4.0 companion app also supports HTTPS. This package's 0.7.4 companion app uses the same latency logic; run the new installer from the setup-guide command to register the store version's ID.

## Updating

1. Disconnect.
2. Fully download and extract the new version.
3. Replace the extension files at the same path as before.
4. Run this package's companion installer from the setup-guide command; the real ID must be registered, especially for the store version. The existing Windows core is kept on a normal install.
5. Reopen Chrome and click **Reload** in `chrome://extensions`.

You don't need to remove the extension to update it. Keeping the same path, ID and Chrome profile helps preserve your stored data. Removing the extension may delete local profiles and subscriptions.

Changes for each version are recorded in [CHANGELOG.md](CHANGELOG.md).

## Troubleshooting

| Problem | Suggested action |
| --- | --- |
| `manifest.json` not found | Extract the ZIP and select only the `extension` folder in Load unpacked. |
| Companion app not found | Run the installer under the same user account, fully close and reopen Chrome, and check the extension ID too. |
| Windows install hangs while fetching Xray | Check GitHub access. The new installer has metadata and download timeouts; use `-XrayExe` if needed. |
| `XrayChromeHost.cs` not found | Fully extract the package; this file must sit next to `install.ps1`. |
| .NET compiler not found | Check that .NET Framework 4.8 and its build tools are present. |
| Core rejects the configuration | Open "Diagnostics" and check the protocol, transport type, server details and Xray version. |
| Proxy is controlled by another extension | Temporarily disable other proxy-controlling extensions and reconnect. |
| VMess won't connect | Set the system clock and date correctly, and make sure the profile is AEAD with `alterId = 0`. |
| Subscription won't import | Check the subscription URL and validity; the content must be a link list or its Base64 encoding. |
| Latency test stops working after an upgrade | Reinstall the companion app for the new package and reload the extension. |
| Latency succeeds but a site won't open | A successful latency test shows access to the test endpoint; check the server's access to the site in question and the diagnostics. |

## Privacy and permissions

Profiles, subscription links and test results are kept in `chrome.storage.local`. The active profile is also written to the companion app's runtime folder so the core can run. This data can include a password or connection credential and should not be assumed to be stored in an encrypted file.

This package's code has no mechanism for sending usage statistics to the developer. That said, fetching a subscription contacts the provider's server, HTTPS latency tests over a profile's route contact gstatic, and downloading the core contacts GitHub. For an HTTPS test, that profile's settings are sent to the companion app, and a temporary core uses them to connect to your server. Proxied traffic likewise passes through your selected server.

| Permission | Purpose |
| --- | --- |
| `nativeMessaging` | Communicating with the companion app on the device |
| `proxy` | Setting and clearing the Chrome proxy |
| `storage` | Storing profiles, subscriptions and local state |
| `privacy` | Requesting a restriction on non-proxied WebRTC while connected |
| Optional HTTPS access | Fetching a subscription, only after you approve it for that link's domain |

The core listens on `127.0.0.1`. Loopback addresses and locally excluded names bypass the proxy. This version has no global kill switch and does not cover all device traffic.

## Install and uninstall locations

| OS | Companion app folder |
| --- | --- |
| Windows | `%LOCALAPPDATA%\XrayChrome` |
| macOS | `~/Library/Application Support/XrayChrome` |

The `runtime` folder holds runtime state and configuration, and the `logs` folder holds core logs. The Native Host name is `com.anicloud.xray_chrome`.

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
| `extension/` | The shared Manifest V3 Chrome extension |
| `extension/popup/` | UI and the connection guide |
| `extension/modules/` | Link parsing, configuration generation, storage and latency testing |
| `native-hosts/windows/` | Companion app and Windows scripts |
| `native-hosts/macos/` | Companion app and macOS scripts |
| `tests/` | The project's existing tests |
| `CHANGELOG.md` | Change history |

## Running the tests

The JavaScript tests need Node.js; no dependency installation is required to run them:

```bash
npm test
npm run check
```

These tests cover the parser, configuration generation, storage, group HTTPS test management, dropping stale TCP results, cancellation, and Native Messaging errors. The optional leftover TCP-capability test for the macOS companion app (kept for compatibility with 0.4.0) needs Python 3 and zsh via `npm run test:mac-helper`; these tools are for developer testing only and are not required to install the extension. That test uses a real local connection and test doubles for `nc` and `osascript`, and is not a substitute for testing on actual macOS.

The automated tests are not a confirmation that every protocol connects for real, nor confirmation of Chrome Web Store approval. The final install and connection should be verified on Windows and macOS with a valid profile.

## Contact and issue reporting

- Website: [anisoft.ir](https://anisoft.ir)
- Project repository: [pesarakloo/xray-for-chrome](https://github.com/pesarakloo/xray-for-chrome)
- Telegram channel: [t.me/xray_chrome](https://t.me/xray_chrome)
- File an issue: [GitHub Issues](https://github.com/pesarakloo/xray-for-chrome/issues)

When reporting an issue, include the extension and core version, operating system, protocol type and the error text. Remove passwords, UUIDs, subscription tokens and any other private profile details before posting a report.

This project uses [XTLS/Xray-core](https://github.com/XTLS/Xray-core) to run the connection. A guide to loading the extension manually is also available in the [official Chrome documentation](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

## Chrome Web Store publishing

This delivery is for GitHub and does not include a new store package. The notes under `store/` belong to the 0.7.4 draft; before the next submission, the description, real interface screenshots, permissions and data disclosures need a separate review. The old package previously generated from this output has been removed so it isn't uploaded by mistake. The `npm run release` tool remains available for the separate store-preparation step.

## Building the companion packages

The small per-platform downloads live in the repository's `downloads/` folder and are linked directly from the extension (`raw/main/downloads/<name>`). After changing anything under `native-hosts/` or the launcher scripts, rebuild and commit them:

```sh
npm run companion
```

This rewrites `downloads/xray-companion-windows.zip`, `downloads/xray-companion-macos.zip` and `downloads/SHA256SUMS.txt` (executable bits on the macOS scripts are set explicitly). The download buttons point at the `main` branch, so the new ZIPs go live as soon as they are pushed there.

## Development UI preview

With Node.js 22 or newer and no dependency installation:

```sh
npm run dev
```

A local page on port 4173 opens the extension's real interface with sample data. The connection and latency in this preview are simulated, and no proxy actually runs. The `tools/preview/` files live outside the extension folder and are not loaded in the real extension or the store package.

```sh
npm test
npm run check
```

Flags are shown only from a country code or flag present in a profile's name; no network request is made to locate a server. Interface asset licenses are listed in `THIRD-PARTY-NOTICES.md`.
