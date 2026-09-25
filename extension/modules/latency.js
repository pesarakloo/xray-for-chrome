import { buildOutbound } from "./xray-config.js";
import { profileFingerprint } from "./parser.js";

export const LATENCY_TTL_MS = 5 * 60 * 1000;

export function buildProbeConfig(profile) {
  // The native host assigns an isolated loopback HTTP port. No direct fallback.
  return { log: { loglevel: "none" }, inbounds: [], outbounds: [buildOutbound(profile)] };
}

export function isFreshLatency(profile, result, now = Date.now()) {
  const age = now - Date.parse(result?.checkedAt);
  return result?.fingerprint === profileFingerprint(profile) && age >= 0 && age < LATENCY_TTL_MS;
}

export class LatencyRunner {
  constructor({ readState, nativeSend, writeResult }) {
    Object.assign(this, { readState, nativeSend, writeResult });
    this.running = false;
    this.starting = false;
    this.cancelled = false;
    this.completed = 0;
    this.total = 0;
    this.error = "";
    this.pending = new Set();
    this.active = new Set();
    this.done = Promise.resolve();
  }

  status() {
    return {
      running: this.running || this.starting, cancelled: this.cancelled,
      completed: this.completed, total: this.total, error: this.error,
      pendingIds: [...this.pending], activeIds: [...this.active]
    };
  }

  async start({ profileId, missingOnly = false } = {}) {
    if (this.running || this.starting) return this.status();
    this.starting = true;
    this.error = "";
    this.cancelled = false;
    try {
      const state = await this.readState();
      let profiles = state.profiles.filter((profile) => !profileId || profile.id === profileId);
      if (profileId && !profiles.length) throw new Error("کانفیگ انتخاب‌شده پیدا نشد.");
      if (missingOnly) profiles = profiles.filter((profile) => !isFreshLatency(profile, state.latencies[profile.id]));
      if (!profiles.length) return { ...this.status(), running: false };
      const host = await this.nativeSend({ action: "ping" });
      if (host.probeVersion !== 1) {
        throw new Error("برای فعال‌شدن پینگ، نصب‌کنندهٔ برنامه همراه این نسخه را دوباره اجرا کنید.");
      }
      this.running = true;
      this.completed = 0;
      this.total = profiles.length;
      this.pending = new Set(profiles.map((profile) => profile.id));
      this.done = this.run(profiles).catch((error) => {
        this.error = error.message || "اندازه‌گیری پینگ ناموفق بود.";
      }).finally(() => {
        this.running = false;
        this.pending.clear();
        this.active.clear();
      });
      return this.status();
    } catch (error) {
      this.error = error.message;
      throw error;
    } finally {
      this.starting = false;
    }
  }

  cancel() {
    this.cancelled = true;
    for (const id of this.pending) if (!this.active.has(id)) this.pending.delete(id);
    return this.status();
  }

  async run(profiles) {
    let next = 0;
    const worker = async () => {
      while (!this.cancelled && !this.error && next < profiles.length) {
        const profile = profiles[next++];
        this.active.add(profile.id);
        try {
          const current = (await this.readState()).profiles.find((item) => item.id === profile.id);
          if (!current || profileFingerprint(current) !== profileFingerprint(profile)) continue;
          let config;
          let response;
          try { config = buildProbeConfig(profile); }
          catch (error) { response = { status: "error", error: error.message }; }
          if (config) response = await this.nativeSend({ action: "probe", config });
          if (!["ok", "timeout", "error"].includes(response?.status) ||
              (response.status === "ok" && (!Number.isFinite(response.latencyMs) || response.latencyMs < 0))) {
            throw new Error("پاسخ پینگ برنامه همراه معتبر نیست؛ نصب‌کننده را دوباره اجرا کنید.");
          }
          const result = {
            status: response.status,
            latencyMs: response.status === "ok" ? Math.max(1, Math.round(response.latencyMs)) : null,
            error: String(response.error || "").slice(0, 240),
            checkedAt: new Date().toISOString(), fingerprint: profileFingerprint(profile)
          };
          const latest = (await this.readState()).profiles.find((item) => item.id === profile.id);
          if (latest && profileFingerprint(latest) === result.fingerprint) await this.writeResult(profile.id, result);
        } catch (error) {
          // Companion failures stop the queue instead of labelling every server offline.
          this.error = error.message || "اندازه‌گیری پینگ ناموفق بود.";
        } finally {
          this.completed++;
          this.pending.delete(profile.id);
          this.active.delete(profile.id);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, profiles.length) }, worker));
  }
}
