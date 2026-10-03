# Chrome Web Store — 0.7.5

[فارسی](README.fa.md)

The extension-only upload is `xray-for-chrome-v0.7.5-chrome-web-store.zip`. Update the existing store item. Publish the regenerated companion ZIPs to GitHub before the store update so the setup-guide links return the correct installers.

See [publishing instructions](PUBLISH.md), [listing copy](LISTING.md) and [validation](../VALIDATION.md). This update is prepared locally; no publication has been performed.

`npm run release` builds the store ZIP next to the project folder, outside it. To choose a different destination, use `npm run release -- --output /path/to/store.zip`. The GitHub source archive does not contain the store ZIP or a `release/` folder.
