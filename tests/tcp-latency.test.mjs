// Regression coverage for upgrading from the short-lived TCP-based release.
import test from "node:test";
import assert from "node:assert/strict";
import { readState } from "../extension/modules/storage.js";
import { parseProfileLink, profileFingerprint } from "../extension/modules/parser.js";

test("storage hides TCP and untyped cached results after restoring HTTPS", async () => {
  const profile = parseProfileLink("vless://00000000-0000-4000-8000-000000000001@test.example:443?security=tls&type=ws#Test");
  const data = { profiles: [profile], connection: { connected: true, profileId: profile.id } };
  globalThis.chrome = { storage: { local: { get: async () => structuredClone(data) } } };
  try {
    for (const kind of ["tcp", undefined, "https"]) {
      data[`latency:${profile.id}`] = { kind, status: "ok", latencyMs: 100, checkedAt: new Date().toISOString(), fingerprint: profileFingerprint(profile) };
      const result = await readState();
      assert.equal(Object.keys(result.latencies).length, kind === "https" ? 1 : 0);
      assert.equal(result.connection.connected, true);
      assert.equal(result.profiles.length, 1);
    }
  } finally { delete globalThis.chrome; }
});
