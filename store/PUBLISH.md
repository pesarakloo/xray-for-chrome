# Publish the 0.7.5 update

[فارسی](PUBLISH.fa.md)

This update targets the existing Chrome Web Store item `lifddnekhjaikimaajejkdbhfnifpcoo`. The build does not submit or publish anything.

| Destination | File or folder |
| --- | --- |
| GitHub source | Contents of the project root |
| Companion download links | Both ZIPs in `downloads/` and their SHA256SUMS.txt |
| Existing Chrome Web Store item | `xray-for-chrome-v0.7.5-chrome-web-store.zip` |
| Manual Chrome installation | `extension/` |

1. Run `npm run companion` and `npm run release` after any source change. The delivered ZIPs are already rebuilt.
2. Publish the full source and the regenerated `downloads/` files to GitHub first. Verify both companion download links return the new packages; the in-extension store guide links to these fixed paths.
3. Open the existing extension in the Chrome Web Store developer dashboard and upload `xray-for-chrome-v0.7.5-chrome-web-store.zip` as its new package. Do not create a new item or upload the full project ZIP.
4. Review the English-first listing and Persian translation. Include domain-based split tunneling, the need for the companion, and a user-provided profile or subscription. Permissions are unchanged.
5. Update the public privacy policy with the direct-site list and direct-connection behavior described in PRIVACY.md / PRIVACY.fa.md. Use new-version screenshots for the changed guide and routing UI.
6. Verify installation on Windows and both supported Mac architectures, using commands copied from the actual store extension. Verify a real connection, direct-site bypass, an unlisted site through the proxy, rule removal and disconnect. See VALIDATION.md for what was tested in this environment.
7. Submit the existing item for review when your release checks are complete. Publishing the GitHub source alone does not update installed store extensions.

The extension-only ZIP omits the manual development key. The source extension keeps it to preserve its manual-installation ID. No signing key or publishing credential is included.

`npm run release` builds the store ZIP next to the project folder, outside it. To choose a different destination, use `npm run release -- --output /path/to/store.zip`. The GitHub source archive does not contain the store ZIP or a `release/` folder.
