import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, access, stat } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url);

test("manifest references existing local files and a stable extension id", async () => {
  const manifest = JSON.parse(await readFile(new URL("../extension/manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.permissions.includes("proxy"));
  assert.ok(manifest.permissions.includes("nativeMessaging"));
  await access(new URL("../extension/service-worker.js", import.meta.url));
  await access(new URL("../extension/popup/popup.html", import.meta.url));
  for (const path of Object.values(manifest.icons)) await access(new URL(`../extension/${path}`, import.meta.url));

  const publicDer = Buffer.from(manifest.key, "base64");
  const digest = createHash("sha256").update(publicDer).digest().subarray(0, 16);
  const extensionId = [...digest].map((byte) =>
    String.fromCharCode(97 + (byte >> 4)) + String.fromCharCode(97 + (byte & 15))
  ).join("");
  assert.equal(extensionId, "kcefgbldpcaoicjpdcmilahhlcbcflpj");
  const windowsInstaller = await readFile(new URL("../native-hosts/windows/install.ps1", import.meta.url), "utf8");
  const macInstaller = await readFile(new URL("../native-hosts/macos/install.command", import.meta.url), "utf8");
  assert.match(windowsInstaller, new RegExp(extensionId));
  assert.match(macInstaller, new RegExp(extensionId));
});

test("popup has no inline script or remote code", async () => {
  const html = await readFile(new URL("../extension/popup/popup.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.doesNotMatch(html, /<(?:script|link|img)[^>]+(?:src|href)=["']https?:\/\//i);
});

test("native hosts are separated and use the same host name", async () => {
  const windowsHost = await readFile(new URL("../native-hosts/windows/XrayChromeHost.cs", import.meta.url), "utf8");
  const macHost = await readFile(new URL("../native-hosts/macos/XrayChromeHost.command", import.meta.url), "utf8");
  const nativeModule = await readFile(new URL("../extension/modules/native.js", import.meta.url), "utf8");
  assert.match(nativeModule, /com\.anicloud\.xray_chrome/);
  assert.match(windowsHost, /127\.0\.0\.1/);
  // Since 0.3.1 the supplied host starts Xray directly, without WMI.
  assert.match(windowsHost, /Process\.Start\(info\)/);
  assert.match(macHost, /127\.0\.0\.1/);
  assert.match(macHost, /plutil/);
  assert.match(macHost, /od -An -tu4 -N4/);
});

test("Windows PowerShell installers are safe for legacy code-page parsing", async () => {
  const installer = await readFile(new URL("../native-hosts/windows/install.ps1", import.meta.url), "utf8");
  const uninstaller = await readFile(new URL("../native-hosts/windows/uninstall.ps1", import.meta.url), "utf8");
  assert.doesNotMatch(installer, /[^\x00-\x7F]/);
  assert.doesNotMatch(uninstaller, /[^\x00-\x7F]/);
  assert.match(installer, /\/codepage:65001/);
  assert.match(installer, /System\.Management\.dll/);
});

test("macOS installer supports Apple Silicon and Intel assets", async () => {
  const installer = await readFile(new URL("../native-hosts/macos/install.command", import.meta.url), "utf8");
  assert.match(installer, /Xray-macos-arm64-v8a\.zip/);
  assert.match(installer, /Xray-macos-64\.zip/);
  assert.match(installer, /Google\/Chrome\/NativeMessagingHosts/);
  assert.match(installer, /shasum -a 256/);
  assert.match(installer, /codesign --force --sign -/);
  assert.match(installer, /ResolveRelease\.js/);
  assert.doesNotMatch(installer, /xcrun|swiftc|xcode-select/);
  const installerStat = await stat(new URL("../native-hosts/macos/install.command", import.meta.url));
  const uninstallerStat = await stat(new URL("../native-hosts/macos/uninstall.command", import.meta.url));
  const hostStat = await stat(new URL("../native-hosts/macos/XrayChromeHost.command", import.meta.url));
  assert.notEqual(installerStat.mode & 0o111, 0);
  assert.notEqual(uninstallerStat.mode & 0o111, 0);
  assert.notEqual(hostStat.mode & 0o111, 0);
});
