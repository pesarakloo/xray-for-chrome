import { decodeSubscriptionPayload, parseLinkList, profileFingerprint } from "./modules/parser.js";
import { buildXrayConfig } from "./modules/xray-config.js";
import { nativeSend } from "./modules/native.js";
import { DEFAULT_STATE, readState, writeState, writeLatency, removeLatencies } from "./modules/storage.js";
import { LatencyRunner } from "./modules/latency.js";

const latencyRunner = new LatencyRunner({ readState, nativeSend, writeResult: writeLatency });

async function updateBadge(connected) {
  await chrome.action.setBadgeText({ text: connected ? "ON" : "" });
  await chrome.action.setBadgeBackgroundColor({ color: connected ? "#11b981" : "#64748b" });
}

async function ensureProxyControl() {
  const current = await chrome.proxy.settings.get({ incognito: false });
  if (!["controllable_by_this_extension", "controlled_by_this_extension"].includes(current.levelOfControl)) {
    throw new Error("تنظیم پراکسی Chrome توسط Policy یا افزونه‌ی دیگری کنترل می‌شود.");
  }
}

async function enableChromeProxy(port) {
  await ensureProxyControl();
  await chrome.proxy.settings.set({
    scope: "regular",
    value: {
      mode: "fixed_servers",
      rules: {
        singleProxy: { scheme: "socks5", host: "127.0.0.1", port },
        bypassList: ["<local>", "localhost", "127.0.0.1", "[::1]"]
      }
    }
  });
  try {
    await chrome.privacy.network.webRTCIPHandlingPolicy.set({
      scope: "regular",
      value: "disable_non_proxied_udp"
    });
  } catch {
    // Some managed Chrome installations do not expose this setting.
  }
}

async function disableChromeProxy() {
  await chrome.proxy.settings.clear({ scope: "regular" });
  try {
    await chrome.privacy.network.webRTCIPHandlingPolicy.clear({ scope: "regular" });
  } catch {
    // Nothing to restore.
  }
}

async function connect(profileId) {
  const state = await readState();
  const profile = state.profiles.find((item) => item.id === profileId);
  if (!profile) throw new Error("کانفیگ انتخاب‌شده پیدا نشد.");
  const port = state.connection.port || 10808;
  const config = buildXrayConfig(profile, port);
  await nativeSend({ action: "start", config, port });
  try {
    await enableChromeProxy(port);
  } catch (error) {
    await nativeSend({ action: "stop" }).catch(() => {});
    throw error;
  }
  const connection = { connected: true, profileId, port, since: new Date().toISOString() };
  await writeState({ connection });
  await updateBadge(true);
  return connection;
}

async function disconnect() {
  let proxyError = null;
  try { await disableChromeProxy(); }
  catch (error) { proxyError = error; }
  await nativeSend({ action: "stop" }).catch(() => {});
  const connection = { ...DEFAULT_STATE.connection };
  await writeState({ connection });
  await updateBadge(false);
  if (proxyError) throw proxyError;
  return connection;
}

function mergeProfiles(existing, incoming) {
  const seen = new Map(existing.map((profile) => [profileFingerprint(profile), profile]));
  for (const profile of incoming) {
    const fingerprint = profileFingerprint(profile);
    const old = seen.get(fingerprint);
    seen.set(fingerprint, old ? { ...profile, id: old.id, sourceId: old.sourceId || profile.sourceId } : profile);
  }
  return Array.from(seen.values());
}

async function importManual(text) {
  const { profiles: incoming, errors } = parseLinkList(text);
  const state = await readState();
  const profiles = mergeProfiles(state.profiles, incoming);
  await writeState({ profiles });
  return { added: incoming.length, skipped: errors.length };
}

async function fetchSubscription(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("آدرس سابسکریپشن معتبر نیست.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("سابسکریپشن باید با http یا https شروع شود.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(parsed.href, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "text/plain, application/octet-stream, */*" }
    });
    if (!response.ok) throw new Error(`خطای دریافت سابسکریپشن: HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > 5_000_000) throw new Error("حجم سابسکریپشن بیش از حد مجاز است.");
    return { text: decodeSubscriptionPayload(text), userInfo: response.headers.get("subscription-userinfo") || "" };
  } catch (error) {
    if (error.name === "AbortError") throw new Error("زمان دریافت سابسکریپشن تمام شد.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshSubscription(subscriptionId) {
  const state = await readState();
  const subscription = state.subscriptions.find((item) => item.id === subscriptionId);
  if (!subscription) throw new Error("سابسکریپشن پیدا نشد.");
  const result = await fetchSubscription(subscription.url);
  const { profiles: incoming, errors } = parseLinkList(result.text, subscription.id);
  const oldProfiles = state.profiles.filter((profile) => profile.sourceId === subscription.id);
  const oldByFingerprint = new Map(oldProfiles.map((profile) => [profileFingerprint(profile), profile]));
  const refreshed = incoming.map((profile) => {
    const old = oldByFingerprint.get(profileFingerprint(profile));
    return old ? { ...profile, id: old.id } : profile;
  });
  const refreshedIds = new Set(refreshed.map((profile) => profile.id));
  if (state.connection.connected && oldProfiles.some((profile) => profile.id === state.connection.profileId) && !refreshedIds.has(state.connection.profileId)) {
    await disconnect();
  }
  const withoutOld = state.profiles.filter((profile) => profile.sourceId !== subscription.id);
  const profiles = mergeProfiles(withoutOld, refreshed);
  const subscriptions = state.subscriptions.map((item) => item.id === subscription.id ? {
    ...item,
    updatedAt: new Date().toISOString(),
    count: incoming.length,
    userInfo: result.userInfo
  } : item);
  await writeState({ profiles, subscriptions });
  await removeLatencies(oldProfiles.filter((profile) => !profiles.some((item) => item.id === profile.id)).map((profile) => profile.id));
  return { added: incoming.length, skipped: errors.length };
}

async function addSubscription(name, url) {
  const id = globalThis.crypto.randomUUID();
  const state = await readState();
  if (state.subscriptions.some((item) => item.url === url)) {
    throw new Error("این سابسکریپشن قبلاً اضافه شده است.");
  }
  const subscription = { id, name: (name || "Subscription").slice(0, 80), url, updatedAt: null, count: 0 };
  await writeState({ subscriptions: [...state.subscriptions, subscription] });
  try {
    const result = await refreshSubscription(id);
    return { id, ...result };
  } catch (error) {
    await writeState({ subscriptions: state.subscriptions });
    throw error;
  }
}

async function deleteSubscription(id) {
  const state = await readState();
  const removedIds = new Set(state.profiles.filter((profile) => profile.sourceId === id).map((profile) => profile.id));
  if (state.connection.connected && removedIds.has(state.connection.profileId)) await disconnect();
  await writeState({
    subscriptions: state.subscriptions.filter((item) => item.id !== id),
    profiles: state.profiles.filter((profile) => profile.sourceId !== id)
  });
  await removeLatencies([...removedIds]);
}

async function deleteProfile(id) {
  const state = await readState();
  if (state.connection.connected && state.connection.profileId === id) await disconnect();
  await writeState({ profiles: state.profiles.filter((profile) => profile.id !== id) });
  await removeLatencies([id]);
}

async function reconcile() {
  const state = await readState();
  if (!state.connection.connected) return updateBadge(false);
  try {
    const status = await nativeSend({ action: "status" });
    if (!status.running) await disconnect();
    else await updateBadge(true);
  } catch {
    await disableChromeProxy().catch(() => {});
    await writeState({ connection: { ...DEFAULT_STATE.connection } });
    await updateBadge(false);
  }
}

async function handleMessage(message) {
  switch (message?.action) {
    case "state": return { ...await readState(), ping: latencyRunner.status() };
    case "pingState": return { latencies: (await readState()).latencies, ping: latencyRunner.status() };
    case "pingProfiles": return latencyRunner.start({ profileId: message.profileId, missingOnly: Boolean(message.missingOnly) });
    case "cancelPings": return latencyRunner.cancel();
    case "connect": return connect(message.profileId);
    case "disconnect": return disconnect();
    case "importManual": return importManual(message.text);
    case "addSubscription": return addSubscription(message.name, message.url);
    case "refreshSubscription": return refreshSubscription(message.id);
    case "deleteSubscription": await deleteSubscription(message.id); return { ok: true };
    case "deleteProfile": await deleteProfile(message.id); return { ok: true };
    case "nativeStatus": return nativeSend({ action: "status" });
    case "logs": return nativeSend({ action: "logs" });
    default: throw new Error("درخواست افزونه شناخته نشد.");
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
  return true;
});

chrome.runtime.onInstalled.addListener(() => reconcile());
chrome.runtime.onStartup.addListener(() => reconcile());
reconcile();
