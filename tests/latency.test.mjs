import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate as tick } from "node:timers/promises";
import { LatencyRunner, buildProbeConfig, isFreshLatency, LATENCY_TTL_MS } from "../extension/modules/latency.js";
import { parseProfileLink, profileFingerprint } from "../extension/modules/parser.js";
import { readState, writeLatency, removeLatencies } from "../extension/modules/storage.js";

function profiles(count) {
  return Array.from({ length: count }, (_, i) => parseProfileLink(`vless://00000000-0000-4000-8000-000000000001@test${i}.example:443?security=tls&type=ws&path=%2Ftest#Test${i}`));
}

function harness(items, probe = async () => ({ status: "ok", latencyMs: 123 })) {
  const state = { profiles: items, latencies: {}, connection: { connected: true, profileId: "active", port: 10808 } };
  const calls = [];
  const runner = new LatencyRunner({
    readState: async () => structuredClone(state),
    nativeSend: async (message) => {
      calls.push(message);
      return message.action === "ping" ? { probeVersion: 1 } : probe(message);
    },
    writeResult: async (id, result) => { state.latencies[id] = result; }
  });
  return { runner, state, calls };
}

test("probe config preserves transport/auth and has no direct fallback or active inbound", () => {
  const [profile] = profiles(1);
  const config = buildProbeConfig(profile);
  assert.deepEqual(config.inbounds, []);
  assert.equal(config.outbounds.length, 1);
  assert.equal(config.outbounds[0].settings.id, profile.idValue);
  assert.equal(config.outbounds[0].streamSettings.wsSettings.path, "/test");
  assert.equal(config.outbounds[0].streamSettings.security, "tls");
});

test("all profiles get independent saved results; concurrency is bounded and active connection untouched", async () => {
  let active = 0;
  let peak = 0;
  const { runner, state, calls } = harness(profiles(6), async ({ config }) => {
    active++;
    peak = Math.max(peak, active);
    await tick();
    active--;
    return { status: "ok", latencyMs: 100 + Number(config.outbounds[0].settings.address.match(/\d+/)[0]) };
  });
  const before = structuredClone(state.connection);
  await runner.start();
  await runner.done;
  assert.equal(peak, 2);
  assert.equal(Object.keys(state.latencies).length, 6);
  assert.deepEqual(Object.values(state.latencies).map((r) => r.latencyMs).sort(), [100, 101, 102, 103, 104, 105]);
  assert.deepEqual(state.connection, before);
  assert.ok(calls.every((call) => ["ping", "probe"].includes(call.action)));
  assert.equal(runner.status().completed, 6);
  assert.equal(runner.status().running, false);
});

test("timeout/error results remain distinct and never become a zero-ms success", async () => {
  let index = 0;
  const responses = [{ status: "timeout", error: "timed out" }, { status: "error", error: "invalid config" }];
  const { runner, state } = harness(profiles(2), async () => responses[index++]);
  await runner.start();
  await runner.done;
  assert.deepEqual(Object.values(state.latencies).map((r) => r.status).sort(), ["error", "timeout"]);
  assert.ok(Object.values(state.latencies).every((r) => r.latencyMs === null));
});

test("fresh results skip auto-tests, manual refresh reruns, and changed configs invalidate cache", async () => {
  const { runner, state, calls } = harness(profiles(1));
  await runner.start();
  await runner.done;
  await runner.start({ missingOnly: true });
  assert.equal(calls.filter((c) => c.action === "probe").length, 1);
  await runner.start({ profileId: state.profiles[0].id });
  await runner.done;
  assert.equal(calls.filter((c) => c.action === "probe").length, 2);
  const [profile] = state.profiles;
  const result = state.latencies[profile.id];
  assert.equal(isFreshLatency(profile, result), true);
  assert.equal(isFreshLatency({ ...profile, port: 8443 }, result), false);
  assert.equal(isFreshLatency(profile, result, Date.parse(result.checkedAt) + LATENCY_TTL_MS), false);
  assert.equal(isFreshLatency(profile, result, Date.parse(result.checkedAt) - 1000), false);
});

test("old companion requires upgrade; no network probes are attempted", async () => {
  const items = profiles(1);
  const runner = new LatencyRunner({
    readState: async () => ({ profiles: items, latencies: {} }),
    nativeSend: async (message) => { assert.equal(message.action, "ping"); return { hostVersion: "0.3.0" }; },
    writeResult: async () => assert.fail("must not save fabricated results")
  });
  await assert.rejects(runner.start(), /نصب‌کننده/);
  assert.equal(runner.status().running, false);
});

test("deleting/changing profiles during a probe cannot resurrect or attach stale results", async () => {
  const { runner, state } = harness(profiles(2), async ({ config }) => {
    if (config.outbounds[0].settings.address === "test0.example") state.profiles.shift();
    else state.profiles[0].port = 8443;
    await tick();
    return { status: "ok", latencyMs: 50 };
  });
  await runner.start();
  await runner.done;
  assert.equal(state.profiles.length, 1);
  assert.deepEqual(state.latencies, {});
});

test("cancel finishes in-flight probes, clears the queue and permits a new run", async () => {
  const gates = [];
  const { runner, state } = harness(profiles(5), () => new Promise((resolve) => gates.push(resolve)));
  await runner.start();
  await tick();
  assert.equal(gates.length, 2);
  runner.cancel();
  for (const resolve of gates) resolve({ status: "ok", latencyMs: 85 });
  await runner.done;
  assert.equal(Object.keys(state.latencies).length, 2);
  assert.deepEqual(runner.status().pendingIds, []);
  assert.equal(runner.status().running, false);
  runner.nativeSend = async (message) => message.action === "ping" ? { probeVersion: 1 } : { status: "ok", latencyMs: 90 };
  await runner.start({ missingOnly: true });
  await runner.done;
  assert.equal(Object.keys(state.latencies).length, 5);
});

test("overlapping start requests do not duplicate a batch", async () => {
  const { runner, calls } = harness(profiles(3));
  await Promise.all([runner.start(), runner.start(), runner.start()]);
  await runner.done;
  assert.equal(calls.filter((c) => c.action === "ping").length, 1);
  assert.equal(calls.filter((c) => c.action === "probe").length, 3);
});

test("companion/invalid-response failures stop the queue instead of inventing per-server failures", async () => {
  for (const response of [null, { status: "ok", latencyMs: NaN }, { status: "ok", latencyMs: -1 }]) {
    const { runner, state, calls } = harness(profiles(5), async () => response);
    await runner.start();
    await runner.done;
    assert.ok(runner.status().error);
    assert.deepEqual(state.latencies, {});
    assert.ok(calls.filter((c) => c.action === "probe").length <= 2);
  }
});

test("latency storage preserves profile/connection data and discards mismatched cache", async () => {
  const items = profiles(2);
  const data = { profiles: structuredClone(items), connection: { connected: true, port: 10808 } };
  globalThis.chrome = { storage: { local: {
    get: async () => structuredClone(data),
    set: async (partial) => { Object.assign(data, structuredClone(partial)); },
    remove: async (keys) => { keys.forEach((key) => delete data[key]); }
  } } };
  try {
    await Promise.all(items.map((profile) => writeLatency(profile.id, {
      fingerprint: profileFingerprint(profile), checkedAt: new Date().toISOString(), status: "ok", latencyMs: 100
    })));
    assert.equal(Object.keys((await readState()).latencies).length, 2);
    assert.deepEqual(data.profiles, items);
    assert.equal(data.connection.connected, true);
    data.profiles[0].port = 8443;
    assert.equal(Object.keys((await readState()).latencies).length, 1);
    await removeLatencies(items.map((item) => item.id));
    assert.deepEqual((await readState()).latencies, {});
  } finally { delete globalThis.chrome; }
});
