import test from "node:test";
import assert from "node:assert/strict";
import { nativeProbeBatch, HOST_NAME } from "../extension/modules/native.js";

function fakePort() {
  const messages = [], disconnects = [];
  const port = {
    posted: [], closed: 0,
    onMessage: { addListener: (fn) => messages.push(fn) },
    onDisconnect: { addListener: (fn) => disconnects.push(fn) },
    postMessage(message) { this.posted.push(message); },
    disconnect() { this.closed++; disconnects.forEach((fn) => fn()); },
    receive(message) { messages.forEach((fn) => fn(message)); },
    lost() { disconnects.forEach((fn) => fn()); }
  };
  globalThis.chrome = { runtime: { connectNative(name) { assert.equal(name, HOST_NAME); return port; } } };
  return port;
}
const targets = [{ id: "0", address: "example.test", port: 443 }];

test("batch sends once, streams results, then disconnects on completion", async () => {
  const port = fakePort();
  const seen = [];
  const done = nativeProbeBatch(targets, { timeoutMs: 4000, onResult: (r) => seen.push(r) });
  assert.deepEqual(port.posted, [{ action: "probeTcpBatch", targets, timeoutMs: 4000 }]);
  port.receive({ ok: true, type: "result", id: "0", status: "ok", latencyMs: 14 });
  assert.equal(seen.length, 1);
  assert.equal(port.closed, 0);
  port.receive({ ok: true, type: "done" });
  await done;
  assert.equal(port.closed, 1);
  port.receive({ ok: true, type: "result", id: "1" });
  assert.equal(seen.length, 1);
});

test("abort closes the native port immediately and ignores late results", async () => {
  const port = fakePort();
  const controller = new AbortController();
  let received = 0;
  const done = nativeProbeBatch(targets, { signal: controller.signal, timeoutMs: 4000, onResult: () => received++ });
  controller.abort();
  await assert.rejects(done, { name: "AbortError" });
  assert.equal(port.closed, 1);
  port.receive({ ok: true, type: "result" });
  assert.equal(received, 0);
});

test("an already cancelled test does not open a native host", async () => {
  const port = fakePort();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(nativeProbeBatch(targets, { signal: controller.signal, timeoutMs: 4000, onResult() {} }), { name: "AbortError" });
  assert.equal(port.posted.length, 0);
  assert.equal(port.closed, 0);
});

test("native disconnection before done reports an error", async () => {
  const port = fakePort();
  const done = nativeProbeBatch(targets, { timeoutMs: 4000, onResult() {} });
  chrome.runtime.lastError = { message: "host unavailable" };
  port.lost();
  await assert.rejects(done, /host unavailable/);
});

test("malformed and rejected native responses close the batch", async () => {
  for (const message of [{ type: "unexpected" }, { ok: false, error: "bad request" }]) {
    const port = fakePort();
    const done = nativeProbeBatch(targets, { timeoutMs: 4000, onResult() {} });
    port.receive(message);
    await assert.rejects(done);
    assert.equal(port.closed, 1);
  }
});

test("result validation failure closes the port and rejects the batch", async () => {
  const port = fakePort();
  const done = nativeProbeBatch(targets, { timeoutMs: 4000, onResult() { throw new Error("invalid result"); } });
  port.receive({ ok: true, type: "result" });
  await assert.rejects(done, /invalid result/);
  assert.equal(port.closed, 1);
});
