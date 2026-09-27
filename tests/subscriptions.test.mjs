import test from 'node:test';
import assert from 'node:assert/strict';

test('worker enforces host permission, HTTPS, bounded failures and no cookie forwarding', async () => {
  const previousChrome = globalThis.chrome, previousFetch = globalThis.fetch;
  let handler, granted = false, fetched = [], responseMode = 'ok';
  const stored = { uiLanguage: 'en' };
  globalThis.chrome = {
    runtime: { onMessage: { addListener: fn => { handler = fn; } }, onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
    storage: { local: { get: async () => structuredClone(stored), set: async data => Object.assign(stored, data), remove: async keys => keys.forEach(k => delete stored[k]) } },
    permissions: { contains: async ({ origins }) => { assert.deepEqual(origins, ['https://sub.example/*']); return granted; } }
  };
  globalThis.fetch = async (url, options) => {
    fetched.push({ url, options });
    if (responseMode === 'redirect') throw new TypeError('Failed to fetch');
    if (responseMode === 'timeout') throw new DOMException('Timeout', 'AbortError');
    return new Response('vless://11111111-1111-4111-8111-111111111111@server.example:443?security=tls#Test', { status: 200 });
  };
  try {
    await import('../extension/service-worker.js?subscriptions-test');
    const send = message => new Promise(resolve => handler(message, { id: 'test' }, resolve));
    let result = await send({ action: 'addSubscription', url: 'https://sub.example/token', name: 'Test' });
    assert.equal(result.ok, false); assert.match(result.error, /مجوز/);
    assert.equal(fetched.length, 0); assert.equal(stored.subscriptions.length, 0);
    granted = true;
    result = await send({ action: 'addSubscription', url: 'http://sub.example/token' });
    assert.equal(result.ok, false); assert.match(result.error, /https/); assert.equal(fetched.length, 0);
    result = await send({ action: 'addSubscription', url: 'https://sub.example/token', name: 'Test' });
    assert.equal(result.ok, true); assert.equal(stored.profiles.length, 1); assert.equal(stored.uiLanguage, 'en');
    assert.equal(fetched[0].options.credentials, 'omit');
    assert.equal(fetched[0].options.redirect, 'error');
    assert.equal(fetched[0].options.referrerPolicy, 'no-referrer');
    const id = stored.subscriptions[0].id;
    responseMode = 'redirect';
    result = await send({ action: 'refreshSubscription', id });
    assert.equal(result.ok, false); assert.match(result.error, /HTTPS/); assert.equal(stored.profiles.length, 1);
    responseMode = 'timeout';
    result = await send({ action: 'refreshSubscription', id });
    assert.equal(result.ok, false); assert.match(result.error, /زمان/); assert.equal(stored.profiles.length, 1);
  } finally { globalThis.chrome = previousChrome; globalThis.fetch = previousFetch; }
});
