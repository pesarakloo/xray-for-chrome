const SUPPORTED_PROTOCOLS = new Set(["vless", "vmess", "ss", "trojan"]);

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeBase64(input) {
  const normalized = String(input).trim().replace(/-/g, "+").replace(/_/g, "/");
  return normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
}

export function decodeBase64Utf8(input) {
  const binary = atob(normalizeBase64(input));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value || "");
  } catch {
    return value || "";
  }
}

function toPort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("پورت کانفیگ معتبر نیست.");
  }
  return port;
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstValue(source, ...keys) {
  for (const key of keys) {
    const value = source.get(key);
    if (value !== null && value !== "") return value;
  }
  return "";
}

function toBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function toOptionalInteger(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) return undefined;
  return number;
}

function parseJsonObject(value) {
  if (!value) return {};
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonValue(value) {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

const XHTTP_STRING_FIELDS = [
  "xPaddingBytes", "scMaxEachPostBytes", "scMinPostsIntervalMs", "uplinkChunkSize",
  "scStreamUpServerSecs", "uplinkHTTPMethod", "xPaddingKey", "xPaddingHeader",
  "xPaddingPlacement", "xPaddingMethod", "sessionIDPlacement", "sessionIDKey",
  "sessionIDTable", "sessionIDLength", "seqPlacement", "seqKey",
  "uplinkDataPlacement", "uplinkDataKey"
];

const XHTTP_INTEGER_FIELDS = ["scMaxBufferedPosts", "serverMaxHeaderBytes"];
const XHTTP_BOOLEAN_FIELDS = ["xPaddingObfsMode", "noGRPCHeader", "noSSEHeader"];

function xhttpSettingsFrom(source) {
  const settings = parseJsonObject(source.get("extra"));
  if (settings.sessionIDPlacement === undefined && settings.sessionPlacement !== undefined) {
    settings.sessionIDPlacement = settings.sessionPlacement;
  }
  if (settings.sessionIDKey === undefined && settings.sessionKey !== undefined) {
    settings.sessionIDKey = settings.sessionKey;
  }
  delete settings.sessionPlacement;
  delete settings.sessionKey;
  const legacyPadding = source.get("x_padding_bytes");
  if (legacyPadding) settings.xPaddingBytes = legacyPadding;
  for (const key of XHTTP_STRING_FIELDS) {
    const value = source.get(key);
    if (value !== null && value !== "") settings[key] = value;
  }
  for (const key of XHTTP_INTEGER_FIELDS) {
    const value = toOptionalInteger(source.get(key), 0, 2147483647);
    if (value !== undefined) settings[key] = value;
  }
  for (const key of XHTTP_BOOLEAN_FIELDS) {
    if (source.has(key)) settings[key] = toBoolean(source.get(key));
  }
  const headers = parseJsonObject(source.get("headers"));
  if (Object.keys(headers).length) settings.headers = headers;
  const xmux = parseJsonObject(source.get("xmux"));
  if (Object.keys(xmux).length) settings.xmux = xmux;
  return settings;
}

function mapTransport(value) {
  const transport = String(value || "raw").toLowerCase();
  const aliases = {
    tcp: "raw",
    raw: "raw",
    ws: "websocket",
    websocket: "websocket",
    grpc: "grpc",
    gun: "grpc",
    httpupgrade: "httpupgrade",
    "http-upgrade": "httpupgrade",
    xhttp: "xhttp",
    splithttp: "xhttp",
    http: "xhttp",
    h2: "xhttp",
    kcp: "mkcp",
    mkcp: "mkcp"
  };
  if (!aliases[transport]) {
    throw new Error(`ترنسپورت «${transport}» فعلاً پشتیبانی نمی‌شود.`);
  }
  return aliases[transport];
}

function commonFromParams(q, address, port, defaultSecurity = "none") {
  const securityValue = (q.get("security") || defaultSecurity).toLowerCase();
  const security = securityValue === "xtls" ? "tls" : securityValue;
  const transport = mapTransport(q.get("type") || q.get("network") || "raw");
  return {
    address,
    port: toPort(port || 443),
    transport,
    security,
    flow: q.get("flow") || "",
    serverName: firstValue(q, "sni", "serverName"),
    fingerprint: firstValue(q, "fp", "fingerprint"),
    alpn: splitList(q.get("alpn")),
    allowInsecure: toBoolean(firstValue(q, "allowInsecure", "insecure")),
    echConfigList: firstValue(q, "ech", "echConfigList"),
    verifyPeerCertByName: firstValue(q, "vcn", "verifyPeerCertByName"),
    pinnedPeerCertSha256: firstValue(q, "pcs", "pinSHA256", "pinnedPeerCertSha256"),
    minVersion: q.get("minVersion") || "",
    maxVersion: q.get("maxVersion") || "",
    cipherSuites: q.get("cipherSuites") || "",
    disableSystemRoot: toBoolean(q.get("disableSystemRoot")),
    enableSessionResumption: toBoolean(q.get("enableSessionResumption")),
    curvePreferences: splitList(q.get("curvePreferences")),
    path: q.get("path") || "/",
    host: q.get("host") || "",
    serviceName: q.get("serviceName") || q.get("service") || "",
    authority: q.get("authority") || "",
    mode: (q.get("mode") || "").toLowerCase(),
    headerType: (q.get("headerType") || q.get("header") || "none").toLowerCase(),
    seed: q.get("seed") || "",
    mtu: toOptionalInteger(q.get("mtu"), 21, 2147483647),
    tti: toOptionalInteger(q.get("tti"), 10, 1000),
    heartbeatPeriod: toOptionalInteger(q.get("heartbeatPeriod"), 0, 2147483647),
    transportHeaders: parseJsonObject(q.get("headers")),
    xhttpSettings: xhttpSettingsFrom(q),
    finalMask: parseJsonValue(q.get("fm")),
    realityPassword: q.get("pbk") || q.get("publicKey") || "",
    shortId: q.get("sid") || q.get("shortId") || "",
    spiderX: q.get("spx") || q.get("spiderX") || "",
    mldsa65Verify: q.get("pqv") || q.get("mldsa65Verify") || "",
    uot: toBoolean(q.get("uot")),
    uotVersion: toOptionalInteger(firstValue(q, "UoTVersion", "uotVersion"), 1, 2)
  };
}

function commonFromUrl(url, defaultSecurity = "none") {
  return commonFromParams(url.searchParams, url.hostname, url.port, defaultSecurity);
}

function finalizeProfile(profile, name, raw, sourceId) {
  if (!profile.address) throw new Error("آدرس سرور خالی است.");
  if (["vless", "vmess"].includes(profile.protocol) && !profile.idValue) {
    throw new Error("شناسه کاربر در کانفیگ وجود ندارد.");
  }
  if (["trojan", "shadowsocks"].includes(profile.protocol) && !profile.password) {
    throw new Error("رمز عبور در کانفیگ وجود ندارد.");
  }
  if (!["none", "tls", "reality"].includes(profile.security)) {
    throw new Error(`امنیت «${profile.security}» پشتیبانی نمی‌شود.`);
  }
  if (profile.security === "reality" && !profile.realityPassword) {
    throw new Error("کلید عمومی REALITY در لینک وجود ندارد.");
  }
  if (profile.security === "reality" && !["vless", "trojan"].includes(profile.protocol)) {
    throw new Error("REALITY برای این پروتکل پشتیبانی نمی‌شود.");
  }
  if (profile.security === "reality" && !["raw", "xhttp", "grpc"].includes(profile.transport)) {
    throw new Error("REALITY فقط با RAW، XHTTP یا gRPC قابل استفاده است.");
  }
  if (profile.transport === "xhttp" && profile.mode && !["auto", "packet-up", "stream-up", "stream-one"].includes(profile.mode)) {
    throw new Error("حالت XHTTP معتبر نیست.");
  }
  return {
    id: makeId(),
    name: (name || `${profile.protocol.toUpperCase()} - ${profile.address}`).slice(0, 120),
    ...profile,
    raw,
    sourceId: sourceId || null,
    updatedAt: new Date().toISOString()
  };
}

function parseStandardUrl(raw, sourceId) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("ساختار لینک معتبر نیست.");
  }
  const protocol = url.protocol.replace(":", "").toLowerCase();
  const common = commonFromUrl(url, protocol === "trojan" ? "tls" : "none");
  const name = safeDecode(url.hash.slice(1));
  if (protocol === "vless") {
    return finalizeProfile({
      protocol,
      ...common,
      idValue: safeDecode(url.username),
      encryption: url.searchParams.get("encryption") || "none"
    }, name, raw, sourceId);
  }
  if (protocol === "trojan") {
    return finalizeProfile({
      protocol,
      ...common,
      password: safeDecode(url.username)
    }, name, raw, sourceId);
  }
  throw new Error("پروتکل لینک پشتیبانی نمی‌شود.");
}

function parseVmess(raw, sourceId) {
  let data;
  try {
    data = JSON.parse(decodeBase64Utf8(raw.slice("vmess://".length)));
  } catch {
    throw new Error("داده‌ی لینک VMess قابل خواندن نیست.");
  }
  if (Number(data.aid || 0) !== 0) {
    throw new Error("VMess قدیمی با alterId غیرصفر در Xray جدید پشتیبانی نمی‌شود.");
  }
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (["string", "number", "boolean"].includes(typeof value)) parameters.set(key, String(value));
  }
  const legacyType = String(data.type || "").toLowerCase();
  const network = String(data.net || data.network || "raw").toLowerCase();
  parameters.set("type", network);
  parameters.set("security", data.tls || data.security || "none");
  if (data.headerType || (network === "tcp" && legacyType)) {
    parameters.set("headerType", data.headerType || legacyType);
  }
  if (network === "grpc" && legacyType === "multi" && !data.mode) parameters.set("mode", "multi");
  if (data.serviceName || (network === "grpc" && data.path)) {
    parameters.set("serviceName", data.serviceName || data.path);
  }
  for (const key of ["headers", "xmux", "fm"]) {
    if (data[key] && typeof data[key] === "object") parameters.set(key, JSON.stringify(data[key]));
  }
  const common = commonFromParams(parameters, data.add || data.address || "", data.port, "none");
  if (data.extra && typeof data.extra === "object" && !Array.isArray(data.extra)) {
    common.xhttpSettings = { ...common.xhttpSettings, ...data.extra };
  }
  return finalizeProfile({
    protocol: "vmess",
    ...common,
    idValue: data.id || "",
    cipher: data.scy || "auto",
    experiments: data.experiments || ""
  }, data.ps || "", raw, sourceId);
}

function parseHostPort(value) {
  const input = value.trim();
  if (input.startsWith("[")) {
    const end = input.indexOf("]");
    if (end < 0 || input[end + 1] !== ":") throw new Error("آدرس IPv6 معتبر نیست.");
    return { address: input.slice(1, end), port: toPort(input.slice(end + 2)) };
  }
  const separator = input.lastIndexOf(":");
  if (separator < 1) throw new Error("آدرس Shadowsocks کامل نیست.");
  return { address: input.slice(0, separator), port: toPort(input.slice(separator + 1)) };
}

function parseSs(raw, sourceId) {
  const body = raw.slice("ss://".length);
  const hashAt = body.indexOf("#");
  const name = hashAt >= 0 ? safeDecode(body.slice(hashAt + 1)) : "";
  const noHash = hashAt >= 0 ? body.slice(0, hashAt) : body;
  const queryAt = noHash.indexOf("?");
  const query = queryAt >= 0 ? new URLSearchParams(noHash.slice(queryAt + 1)) : new URLSearchParams();
  let core = queryAt >= 0 ? noHash.slice(0, queryAt) : noHash;

  if (!core.includes("@")) {
    try {
      core = decodeBase64Utf8(core);
    } catch {
      throw new Error("لینک Shadowsocks قابل رمزگشایی نیست.");
    }
  }
  const at = core.lastIndexOf("@");
  if (at < 1) throw new Error("لینک Shadowsocks ناقص است.");
  let auth = core.slice(0, at);
  const target = core.slice(at + 1);
  if (!auth.includes(":")) {
    try {
      const decoded = decodeBase64Utf8(auth);
      auth = decoded.includes(":") ? decoded : safeDecode(auth);
    } catch {
      auth = safeDecode(auth);
    }
  }
  const colon = auth.indexOf(":");
  if (colon < 1) throw new Error("روش رمزنگاری Shadowsocks مشخص نیست.");
  const { address, port } = parseHostPort(target);
  const common = commonFromParams(query, address, port, "none");
  const plugin = safeDecode(query.get("plugin") || "");
  if (plugin) {
    const parts = plugin.split(";");
    const options = Object.fromEntries(parts.slice(1).map((part) => {
      const separator = part.indexOf("=");
      return separator > 0 ? [part.slice(0, separator), part.slice(separator + 1)] : [part, ""];
    }));
    if (parts[0] !== "obfs-local" || options.obfs !== "http") {
      throw new Error("فقط پلاگین obfs-local با حالت http در Xray قابل تبدیل است.");
    }
    common.transport = "raw";
    common.headerType = "http";
    if (options["obfs-host"]) common.host = options["obfs-host"];
  }
  return finalizeProfile({
    protocol: "shadowsocks",
    ...common,
    method: safeDecode(auth.slice(0, colon)),
    password: safeDecode(auth.slice(colon + 1))
  }, name, raw, sourceId);
}

export function parseProfileLink(input, sourceId = null) {
  const raw = String(input || "").trim();
  const protocol = raw.split(":", 1)[0].toLowerCase();
  if (!SUPPORTED_PROTOCOLS.has(protocol)) {
    throw new Error("فقط لینک‌های VLESS، VMess، Shadowsocks و Trojan پذیرفته می‌شوند.");
  }
  if (protocol === "vmess") return parseVmess(raw, sourceId);
  if (protocol === "ss") return parseSs(raw, sourceId);
  return parseStandardUrl(raw, sourceId);
}

function looksLikeLinks(text) {
  return /(^|\s)(vless|vmess|ss|trojan):\/\//i.test(text);
}

export function decodeSubscriptionPayload(payload) {
  const text = String(payload || "").replace(/^\uFEFF/, "").trim();
  if (!text) throw new Error("پاسخ سابسکریپشن خالی است.");
  if (looksLikeLinks(text)) return text;
  try {
    const decoded = decodeBase64Utf8(text.replace(/\s/g, ""));
    if (looksLikeLinks(decoded)) return decoded;
  } catch {
    // The final error below is clearer for the user.
  }
  throw new Error("فرمت سابسکریپشن شناخته نشد؛ خروجی باید فهرست لینک‌ها یا Base64 آن باشد.");
}

export function parseLinkList(payload, sourceId = null) {
  const errors = [];
  const profiles = [];
  const links = String(payload || "").replace(/\\n/g, "\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  for (const link of links) {
    try {
      profiles.push(parseProfileLink(link, sourceId));
    } catch (error) {
      errors.push({ link: link.slice(0, 32), message: error.message });
    }
  }
  if (!profiles.length) {
    throw new Error(errors[0]?.message || "هیچ کانفیگ معتبری پیدا نشد.");
  }
  return { profiles, errors };
}

export function profileFingerprint(profile) {
  const ignored = new Set(["id", "name", "raw", "sourceId", "updatedAt"]);
  const stable = (value) => {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.keys(value).filter((key) => !ignored.has(key)).sort().map((key) => [key, stable(value[key])]));
    }
    return value;
  };
  return JSON.stringify(stable(profile));
}
