import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { english, getLanguage, setLanguage, locale, t, localizeError } from '../extension/modules/i18n.js';
import { subscriptionOrigin, requireSubscriptionAccess } from '../extension/modules/subscription-access.js';

test('first-run English default, Persian toggle, interpolation and error details', () => {
  assert.equal(getLanguage(), 'en');
  assert.equal(locale(), 'en-US');
  assert.equal(t('اتصال'), 'Connect');
  assert.equal(t('کانفیگ «{name}» حذف شود؟', { name: 'کاربر <script>' }), 'Delete profile “کاربر <script>”?');
  assert.equal(localizeError('خطای دریافت سابسکریپشن: HTTP 403'), 'Subscription request failed: HTTP 403');
  assert.equal(localizeError('کانفیگ توسط Xray رد شد: TLS handshake failed'), 'Xray rejected the configuration: TLS handshake failed');
  assert.equal(localizeError('هسته Xray نصب نیست؛ نصب‌کننده را دوباره اجرا کنید.'), 'Xray is missing. Run the companion installer again.');
  assert.equal(localizeError('external diagnostic 0x123'), 'external diagnostic 0x123');
  setLanguage('fa');
  assert.equal(locale(), 'fa-IR');
  assert.equal(t('اتصال'), 'اتصال');
  assert.equal(localizeError('خطای دریافت سابسکریپشن: HTTP 403'), 'خطای دریافت سابسکریپشن: HTTP 403');
  setLanguage('invalid');
  assert.equal(getLanguage(), 'fa');
  setLanguage('en');
  assert.equal(getLanguage(), 'en');
});

test('every static translatable label and attribute has an English message', async () => {
  const html = await readFile(new URL('../extension/popup/popup.html', import.meta.url), 'utf8');
  const keys = [...html.matchAll(/data-i18n(?:-placeholder|-aria-label|-title)?="([^"]+)"/g)];
  assert.ok(keys.length > 70);
  for (const [, encoded] of keys) {
    const key = encoded.replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
    assert.ok(english[key], key);
  }
  for (const lang of ['fa', 'en']) {
    const file = JSON.parse(await readFile(new URL(`../extension/_locales/${lang}/messages.json`, import.meta.url), 'utf8'));
    assert.ok(file.appDescription.message.length <= 132);
  }
});

test('subscription grants cover the requested HTTPS host without credentials', async () => {
  assert.equal(subscriptionOrigin('https://sub.example:8443/private?token=secret'), 'https://sub.example/*');
  assert.equal(subscriptionOrigin('https://[::1]:8443/sub'), 'https://[::1]/*');
  for (const url of ['http://sub.example', 'file:///tmp/sub', 'javascript:alert(1)', 'https://user:pass@sub.example', 'broken']) {
    assert.throws(() => subscriptionOrigin(url));
  }
  const previous = globalThis.chrome;
  let request;
  try {
    globalThis.chrome = { permissions: { contains: async input => { request = input; return false; } } };
    await assert.rejects(requireSubscriptionAccess('https://sub.example/sub'), /مجوز/);
    assert.deepEqual(request, { origins: ['https://sub.example/*'] });
    globalThis.chrome.permissions.contains = async () => true;
    await requireSubscriptionAccess('https://sub.example/sub');
  } finally { globalThis.chrome = previous; }
});

test('release manifest keeps optional site access, local code and no Incognito', async () => {
  const manifest = JSON.parse(await readFile(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.default_locale, 'en');
  assert.equal(manifest.incognito, 'not_allowed');
  assert.equal(manifest.host_permissions, undefined);
  assert.deepEqual(manifest.optional_host_permissions, ['https://*/*']);
  assert.equal(manifest.content_security_policy.extension_pages, "script-src 'self'; object-src 'none'; base-uri 'none'");
});
