# Validation — 0.7.3 UI redesign

Date: 2026-09-27. Source checks ran on Linux. Browser checks used Chrome with an isolated development bridge for native/Chrome APIs.

## Completed

- **54 Node.js tests passed, 0 failed.** Coverage includes link parsing, Xray configuration generation, latency scheduling/storage/cancellation, native-message errors, language defaults and translations, subscription validation, and optional host permissions. Output: `docs/qa/tests.tap`.
- `npm run check` passed for extension JavaScript and the existing macOS helper.
- The package and extension manifest report **0.7.3**. The original extension key, permissions and content security policy are preserved.
- Service-worker, connection/configuration/storage/subscription logic and native-host source were compared with the supplied 0.7.3 archive and remain unchanged. The native companion retains version 0.7.3.
- Local image, font, CSS and script references were checked. Runtime assets are bundled locally. The extension does not load the development preview bridge or gallery.
- All five sections were rendered in Chrome in Persian and English. Screenshots and combined source/render comparisons are in `docs/screenshots/` and `docs/qa/`; see `design-qa.md`.
- The default 520 × 600 popup and a 360px narrow layout were inspected. Narrow and long-name fixtures had no horizontal document overflow. HTML-like profile-name text remained text.
- Preview interactions exercised: tabs and RTL arrow-key navigation; language switching; manual import and empty-input validation; profile selection; simulated connect/disconnect; individual/group latency tests and cancellation; subscription add/refresh; row menus and deletion confirmation; setup platform selection, installation details and command copying. Missing-companion guidance displayed the installation action and opened the guide.
- Recent browser console entries contained no errors attributed to the local application. Unrelated cloud-browser content-script metadata errors were present.
- The final source ZIP was checked for CRC integrity, required runtime files, matching version numbers, unchanged extension key and macOS executable metadata.

## Scope and remaining runtime checks

The browser preview uses the actual popup HTML, CSS, modules and artwork, with a development-only bridge under `tools/preview/`. Connection results, native status, subscription responses and latency values there are simulated. These screenshots are browser renders; they do not demonstrate a real tunnel or a loaded Chrome extension.

Windows/macOS installers, Native Messaging and real Xray connections were **not run on their target operating systems in this redesign task**. The Windows PowerShell launcher test, real macOS installation and protocol/core compatibility remain target-platform checks. No live server credentials were supplied.

This is the complete GitHub source delivery. No repository publication, Chrome Web Store submission or new store archive was performed. Older listing drafts under `store/` are retained for the separate store-preparation task.
