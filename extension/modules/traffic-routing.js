// Use Chrome's fixed-server bypass list: an exact host plus its subdomains.
// Never accept arbitrary Chrome bypass expressions or broad wildcard rules.
export const DEFAULT_ROUTING = { enabled: false, domains: [] };
export const LOCAL_BYPASS = ["<local>", "localhost", "127.0.0.1", "[::1]"];
const MAX_DOMAINS = 200;

export function normalizeDomain(input) {
  if (typeof input !== "string") throw new Error("Invalid domain");
  let text = input.trim();
  if (text.startsWith("*.")) text = text.slice(2);
  if (!text || /[\s\\*<>]/u.test(text)) throw new Error("Invalid domain");
  const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid domain");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[") && host.endsWith("]")) return host; // URL validates IPv6.
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) return host; // URL validates IPv4.
  const labels = host.split(".");
  if (host.length > 253 || labels.length < 2 || !labels.every(label => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label))) {
    throw new Error("Invalid domain");
  }
  return host;
}

export function parseBypassDomains(text) {
  if (typeof text !== "string" || text.length > 60000) throw new Error("فهرست سایت‌ها بیش از حد طولانی است.");
  const domains = new Set();
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try { domains.add(normalizeDomain(line)); }
    catch { throw new Error(`نشانی سایت در خط ${index + 1} معتبر نیست.`); }
    if (domains.size > MAX_DOMAINS) throw new Error("حداکثر ۲۰۰ سایت وارد کنید.");
  }
  return [...domains];
}

export function readRouting(value) {
  try {
    if (!value || !Array.isArray(value.domains) || !value.domains.every(item => typeof item === "string")) return { ...DEFAULT_ROUTING, domains: [] };
    return { enabled: value.enabled === true, domains: parseBypassDomains(value.domains.join("\n")) };
  } catch { return { ...DEFAULT_ROUTING, domains: [] }; }
}

export function chromeProxyConfig(port, routing = DEFAULT_ROUTING) {
  const settings = readRouting(routing);
  const rules = settings.enabled ? settings.domains.flatMap(host =>
    host.startsWith("[") || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) ? [host] : [host, `*.${host}`]
  ) : [];
  return {
    mode: "fixed_servers",
    rules: {
      singleProxy: { scheme: "socks5", host: "127.0.0.1", port },
      bypassList: [...new Set([...LOCAL_BYPASS, ...rules])]
    }
  };
}
