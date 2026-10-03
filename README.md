# Xray for Chrome

**Manage Xray connections in Google Chrome with an English and Persian interface, for Windows and macOS**

Extension and package version: **0.7.5** — neon-blue interface

🛒 [Chrome Web Store](https://chromewebstore.google.com/detail/lifddnekhjaikimaajejkdbhfnifpcoo?utm_source=item-share-cb) · 🚀 [Releases](https://github.com/pesarakloo/xray-for-chrome/releases) · 🐞 [Report an issue](https://github.com/pesarakloo/xray-for-chrome/issues) · 🌐 [Anisoft website](https://anisoft.ir) · 📢 [Telegram channel](https://t.me/xray_chrome) ·  [Persian](https://github.com/pesarakloo/xray-for-chrome/blob/main/README.fa.md)

## What's new in 0.7.5

- Setup guide split into **Chrome Web Store** and **GitHub installation**, each with separate Windows and macOS steps and the correct command paths.
- **Split tunneling** in its own top-menu tab: save up to 200 domains that should bypass this extension's proxy, including their subdomains.
- macOS automatic Xray downloads pinned to **25.8.3** for Intel and Apple Silicon; rebuilt companion ZIPs.
- Matching English and Persian instructions, updated privacy information and version labels.

Two separate files are supplied: `xray-for-chrome-v0.7.5-github.zip` for the full project and `xray-for-chrome-v0.7.5-chrome-web-store.zip` for updating the existing store item. The store ZIP is not included in the GitHub ZIP. This prepared update has not been published by this workflow. The companion protocol remains **0.5.0**; existing companions can use the new browser-side routing feature. Rerun the updated Mac installer if you want its pinned 25.8.3 download.

## Overview

Xray for Chrome lets you add profile links, fetch server lists from a subscription, measure response time and manage the connection, all from inside the browser.

The project has two parts: the **Chrome extension**, which manages profiles and configures the browser's proxy, and a **companion application**, which runs the Xray core on the device. The two communicate through Native Messaging.

To use it, you need the extension, the companion application, and a valid profile or subscription link. This project does not provide a server or a subscription.

The proxy is applied to the regular Chrome profile. It does not change operating-system proxy settings, and other applications and Incognito mode are not covered by this version.

## Features

- English by default, with an instant switch to Persian; your language choice is saved
- A bilingual interface with "Connect", "Add", "Manage", "Split tunneling", "Setup guide" and "About" tabs
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
- Domain-based split tunneling with locally saved direct-site rules
- Runs a local SOCKS5 proxy on `127.0.0.1:10808`
- Restricts non-proxied WebRTC UDP while connected, when Chrome settings allow it
- Installs the companion app under the user account, without normally requiring Administrator or `sudo` access

## Protocols and input formats

| Protocol | Link format | Status in 0.7.5 |
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

## Installation: choose one method

The extension's **Setup guide** now asks for the installation method first, then Windows or macOS. It displays one complete route at a time and inserts the ID of the running extension into its commands. English is the first-run language; Persian is available from the header.

### A. Chrome Web Store

1. Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/lifddnekhjaikimaajejkdbhfnifpcoo) using **Add to Chrome → Add extension**.
2. Open Xray for Chrome → **Setup guide → Chrome Web Store** and choose your operating system.

#### Windows

1. Download [the Windows companion](downloads/xray-companion-windows.zip) and extract the entire ZIP.
2. Open the extracted folder containing `install-windows.cmd`. Type `powershell` in File Explorer's address bar and press Enter.
3. Copy the install command from **this extension's Setup guide** and run it there. It includes `-ExtensionId` with the actual installed extension ID.
4. Wait for success, fully close and reopen Chrome, then check the core status in **Connect**.

Administrator access is not normally required. A fresh install downloads Xray **25.8.3**; a normal reinstall keeps an existing core unless an explicit replacement is supplied.

#### macOS

1. Download [the macOS companion](downloads/xray-companion-macos.zip) and extract the ZIP. Open the folder containing `install.command`.
2. Open Terminal. Type `cd` followed by a space, drag that folder into Terminal and press Enter.
3. Copy the install command from **this extension's Setup guide** and run it there. It starts with `/bin/zsh ./install.command` and includes `--extension-id`.
4. Wait for success, quit Chrome with **⌘Q**, reopen it and check the core status in **Connect**.

The installer downloads Xray **25.8.3** for Apple Silicon (`Xray-macos-arm64-v8a.zip`) or Intel (`Xray-macos-64.zip`). It does not select the latest release. No `sudo`, Xcode or Command Line Tools are needed.

### B. GitHub / manual installation

1. Download and extract the **full project** from [Releases](https://github.com/pesarakloo/xray-for-chrome/releases), or choose **Code → Download ZIP** in the repository. The root contains `extension`, `native-hosts` and `install-windows.cmd`.
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and choose only the `extension` folder. Keep the extracted project in place.
3. Open that newly loaded extension → **Setup guide → GitHub installation** and choose Windows or macOS. Copy commands from that extension so its own ID is registered.

#### Windows

Open the project root folder, type `powershell` in File Explorer's address bar and press Enter. Run the Windows command copied from the guide. For the supplied manual extension ID, the base command is:

```powershell
.\install-windows.cmd
```

The launcher registers the current user's companion and downloads Xray **25.8.3** on a fresh install. A normal reinstall preserves an existing core. Wait for success and fully restart Chrome. Administrator access is not normally required.

#### macOS

In Terminal, type `cd` followed by a space, drag the **project root folder** into Terminal and press Enter. Run the Mac command copied from the guide. For the supplied manual extension ID, the base command is:

```bash
/bin/zsh ./native-hosts/macos/install.command
```

The installer downloads Xray **25.8.3** for Intel or Apple Silicon. Wait for success and restart Chrome with **⌘Q**. No `sudo` or Xcode is needed. The full project's path includes `native-hosts/macos/`; the small store companion's scripts are at its root.

### If the core download fails

Download and extract the appropriate official build from [Xray 25.8.3](https://github.com/XTLS/Xray-core/releases/tag/v25.8.3). In the selected route's guide, expand **Download failed or use a local file** and replace the sample path with the actual binary path. Run it from the same folder used for installation; the generated command still includes the current extension ID.

| Platform | Option for a local binary |
| --- | --- |
| Windows | `-XrayExe "C:\Path\To\xray.exe"` |
| macOS | `--xray "/path/to/xray"` |

On Windows, `-ForceDownload` downloads 25.8.3 again and must not be combined with `-SkipDownload` or `-XrayExe`. On macOS, rerunning without `--xray` downloads 25.8.3 again. The legacy `--stable-only` option is accepted for compatibility; it does not change the pinned version. A local binary explicitly supplied by the user may be another compatible version.

The manual extension retains its original key and ID (`kcefgbldpcaoicjpdcmilahhlcbcflpj`). The published store item's ID is `lifddnekhjaikimaajejkdbhfnifpcoo`. Data belonging to different IDs does not migrate automatically. Do not remove an existing extension before exporting or copying the profiles you need.

## Add a profile and connect

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

## Split tunneling: direct websites

1. Open the **Split tunneling** tab in the top menu.
2. Enable **Bypass the VPN for the sites below**.
3. Enter one domain or HTTP/HTTPS address per line, for example `example.com` or `https://example.org/account`.
4. Click **Save settings**. If connected, rules apply to new requests immediately without restarting Xray; otherwise they apply on the next connection. Reload the site. Existing connections can keep their previous route until closed.

A domain and its subdomains bypass the extension's proxy; for example, `example.com` and `www.example.com` go directly, while `notexample.com` does not match. A pasted URL is reduced to its hostname: paths, ports and query strings are ignored. IP literals and internationalized domains are accepted. Duplicates are removed. Invalid entries are rejected with their line number, without partially saving the list. The maximum is 200 sites.

Sites outside the list still use the selected proxy. Resources loaded from other domains need their own entries. Turning the option off keeps the saved list. The setting is stored only in `chrome.storage.local`; it does not change operating-system routing or bypass a separate system-wide VPN. Direct sites use your normal connection and can see its public IP. HTTPS profile latency tests keep using that profile, independently of this list.

## How is latency measured?

In **0.7.5**, the HTTPS method from 0.4.1 is retained: response time is measured for an **HTTPS request over the profile's own route** to `https://www.gstatic.com/generate_204`. A valid `204` response counts as success. This is not a TCP or ICMP test.

- For each profile, a temporary Xray instance runs with that profile's settings on a separate loopback port; the active connection and the browser's proxy are not changed.
- As before, at most **two tests run at once**, so that running many Xray cores doesn't overload the device.
- The number shown is the HTTPS request time; core startup is not included in the latency figure. The request timeout is **8 seconds**, and core startup has its own separate timing.
- Profiles are tested individually even when they share the same address and port, since credentials, TLS and the transport method can differ.
- "Cancel test" cancels the queue; tests already in progress finish within their own timeout, and completed results are kept.
- Results that are missing or older than **5 minutes** are retested automatically when you open the extension or add a profile.
- TCP figures stored from version 0.4.0 are not shown in this version and will be replaced by HTTPS results.
- Each row's status shows whether a profile is waiting to be tested, being tested, has a response, has no response, or has an error.

A successful test shows that an HTTPS request to the test endpoint got a response over that profile's route; it does not guarantee access to every site. "No response" can also result from a network restriction or from the test endpoint itself.

The 0.4.0 companion app also supports HTTPS. The companion in this 0.7.5 package retains host protocol 0.5.0 and the same latency logic; run the new installer from the setup-guide command to register the store version's ID.

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

Upload `xray-for-chrome-v0.7.5-chrome-web-store.zip` as a new package for the existing store item, not as a new item. Publish the updated `downloads/` companion ZIPs to GitHub first so the guide links serve this version. The full project ZIP is for GitHub; the store ZIP contains only extension files. See [publishing notes](store/PUBLISH.md).

`npm run release` builds the store ZIP next to the project folder, outside it. To choose a different destination, use `npm run release -- --output /path/to/store.zip`. The GitHub source archive does not contain the store ZIP or a `release/` folder.

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

