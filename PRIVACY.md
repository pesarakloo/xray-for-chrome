# Privacy policy — Xray for Chrome

[فارسی](PRIVACY.fa.md)

Version 0.7.5 · Updated: 2026-10-03

## Purpose and scope

Xray for Chrome, by Anisoft, manages profiles and subscriptions and configures a proxy for the regular Chrome profile on Windows and macOS. A separate companion app runs locally. This project does not supply a VPN service, servers or subscriptions.

## Local data

Profile links and names, server addresses and ports, credentials such as UUIDs and passwords, TLS and transport settings, subscription URLs and tokens, quota metadata returned by providers, latency results and timestamps, connection state and language are stored in chrome.storage.local. Chrome Sync is not used. The companion receives configuration and credentials through Native Messaging and stores its runtime configuration and error logs on the device. These records do not have application-level encryption; people with access to the operating-system account may access them.

The split tunneling switch and direct-site domain list are also stored locally. When enabled, matching domains and their subdomains connect directly instead of through the extension proxy, exposing the normal connection IP to those sites. Other domains, including third-party resources on the same page, keep their own routing rules. You can clear the list or disable the switch in the Split tunneling tab; disabling it keeps the list.

## Network connections

Subscriptions are fetched only when you add or refresh them and grant access to the requested domain, using the direct HTTPS URL you provide. The provider receives the network address and request, including any token in the URL. While connected, browser traffic goes through the local core to your selected proxy server. Its operator may see connection metadata and destinations and, for unencrypted traffic, content. Protection depends on your configuration, protocol and provider. The extension does not read page content, cookies or Chrome history through browser APIs and does not record browsing history for the developer.

## Automatic tests and core downloads

Opening the popup or importing/refreshing profiles automatically tests missing latency results or results older than five minutes. Manual tests and queue cancellation are also available. Each test requests https://www.gstatic.com/generate_204 through that profile. The endpoint sees the proxy exit address and ordinary request metadata; it does not receive your profile password or subscription URL. The separate installer downloads Xray from GitHub's XTLS/Xray-core project; GitHub receives normal download-request metadata. Website, GitHub and Telegram links open only when selected and are governed by those services' policies.

## Use and sharing

This version contains no advertising, behavioral analytics or automatic upload of profiles or diagnostics to Anisoft. Data is used for connection management, subscription retrieval and connection testing, and is not used or transferred for advertising, data sales or credit assessment. Use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements, and is limited to the disclosed features. The developer sees support material only when you choose to send it. Remove credentials, tokens and personal information before sharing.

## Permissions

proxy applies and clears Chrome proxy settings; nativeMessaging communicates with the companion; storage holds local data and language; privacy requests a restriction on non-proxied WebRTC while connected. Optional HTTPS access is requested for the subscription domain when adding or refreshing it. Subscription content is parsed as configuration data; downloaded JavaScript is not executed.

## Retention and deletion

Records stay locally until deleted or the extension is removed. Manage lets you delete profiles or subscriptions and their related results. Deleting a profile does not necessarily erase an old runtime configuration or log on the companion's disk. For full local removal, disconnect, uninstall the companion with uninstall-windows.cmd or uninstall.command, then remove the extension in chrome://extensions. Removing the extension alone does not remove the companion. Revoke subscription-domain access in Chrome's extension site-access settings. Proxy providers, subscription providers, Google and GitHub have separate retention policies.

## Contact and changes

Website: https://anisoft.ir — Repository and support: https://github.com/pesarakloo/xray-for-chrome/issues — Channel: https://t.me/xray_chrome. Changes to data handling must be accompanied by an updated policy and release information.
