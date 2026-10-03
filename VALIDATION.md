# Validation — 0.7.5

[فارسی](VALIDATION.fa.md)

Date: 2026-10-03. Base: the supplied published 0.7.4 `xray-for-chrome-main.zip`.

## Completed

- **60 assertions/tests passed** by running each `tests/*.test.mjs` file directly with Node. Full output is in `docs/qa/tests-v075.txt`. The normal `npm test` command remains available for development; direct execution was used here to retain individual test results.
- `npm run check` passed for the extension modules, popup, guide and Mac JavaScript helpers. Output is in `docs/qa/syntax-v075.txt`. `zsh -n native-hosts/macos/install.command` passed.
- Routing tests cover URL/domain normalization, Unicode domains, IPv4/IPv6 literals, duplicates, invalid input, the 200-domain limit, exact-domain/subdomain bypass rules, disabled settings, local storage migration, application during an active connection, no native-core restart, proxy-control errors, storage failure rollback, serialized save/disconnect and startup restoration. Chrome and Native Messaging calls are mocked in these tests.
- Guide tests cover all four installation routes, the actual runtime extension ID, local-binary commands and correct small-package versus full-project paths.
- Mac release-selection tests use metadata fixtures for Intel and Apple Silicon. They check the exact v25.8.3 tag, refusal of a different release or unexpected asset URL, SHA-256 digest format and stable parsing when the digest is absent. The automatic installer requests `/releases/tags/v25.8.3`.
- UI checked in Chrome using the project's isolated preview: English/Persian switching, all route selectors, copy feedback and command text, routing save/error messages, list retention while disabled and after reopening, About version 0.7.5, and the Persian guide at 360px width without horizontal overflow. Preview profiles and connections are simulated.
- Rebuilt both companion ZIPs and the extension-only store ZIP. ZIP integrity, source correspondence, checksum files, Mac executable permissions, bilingual companion READMEs and the store manifest were checked. The store ZIP has its manifest at the root and omits the development key. The source key, existing permissions and CSP are preserved.
- Final navigation revision: split tunneling has its own top-menu tab and is absent from Connect. The 9 language/structure tests and `npm run check` were rerun successfully. Preview checks covered tab switching, saving and restoring the domain list, and all six labels in English/Persian at 360px without horizontal overflow.
- Delivery is two independent ZIPs: `xray-for-chrome-v0.7.5-chrome-web-store.zip` and `xray-for-chrome-v0.7.5-github.zip`. The GitHub ZIP contains neither a store ZIP nor a `release/` folder. Both manifests and package metadata remain 0.7.5.
- Screenshot: [six-tab navigation and dedicated routing page](docs/screenshots/v075-tabs-review.jpg). The earlier `v075-review.jpg` predates the navigation revision; other earlier screenshots and design notes are historical 0.7.4 records.

## Limits and release status

Windows/macOS installation, live Xray connections, real network bypass, and live downloads of the official 25.8.3 binaries were not performed in this environment. The shell syntax check and metadata fixtures do not replace device testing. The native-host protocol stays at 0.5.0; the extension/package version is 0.7.5.

The full project, small companion packages and store upload package are prepared. Nothing has been pushed to GitHub or submitted/published in the Chrome Web Store. Publish the new `downloads/` ZIPs before the store update, then complete device checks described in `store/PUBLISH.md`.
