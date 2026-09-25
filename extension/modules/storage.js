import { profileFingerprint } from "./parser.js";

export const DEFAULT_STATE = {
  profiles: [],
  subscriptions: [],
  connection: { connected: false, profileId: null, port: 10808, since: null }
};

export async function readState() {
  const stored = await chrome.storage.local.get(null);
  const profiles = Array.isArray(stored.profiles) ? stored.profiles : [];
  const latencies = Object.fromEntries(profiles.flatMap((profile) => {
    const result = stored[`latency:${profile.id}`];
    return result?.fingerprint === profileFingerprint(profile) ? [[profile.id, result]] : [];
  }));
  return {
    profiles,
    latencies,
    subscriptions: Array.isArray(stored.subscriptions) ? stored.subscriptions : [],
    connection: { ...DEFAULT_STATE.connection, ...(stored.connection || {}) }
  };
}

export async function writeLatency(id, result) {
  // Separate keys prevent concurrent probes from overwriting each other or profiles.
  await chrome.storage.local.set({ [`latency:${id}`]: result });
}

export async function removeLatencies(ids) {
  if (ids.length) await chrome.storage.local.remove(ids.map((id) => `latency:${id}`));
}

export async function writeState(partial) {
  await chrome.storage.local.set(partial);
}
