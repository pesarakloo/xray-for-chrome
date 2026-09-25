function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => {
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }));
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneObject(value) {
  if (!isObject(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

function splitComma(value, fallback = []) {
  const values = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length ? values : fallback;
}

function buildRawSettings(profile) {
  if (profile.headerType !== "http") return { header: { type: "none" } };
  return {
    header: {
      type: "http",
      request: {
        version: "1.1",
        method: "GET",
        path: splitComma(profile.path, ["/"]),
        headers: { Host: splitComma(profile.host) }
      }
    }
  };
}

function buildFinalMask(profile) {
  const finalmask = cloneObject(profile.finalMask);
  if (profile.transport !== "mkcp") return finalmask;

  const udp = Array.isArray(finalmask.udp) ? [...finalmask.udp] : [];
  if (udp.some((mask) => isObject(mask) && mask.type === "mkcp-legacy")) return finalmask;

  const headerMap = {
    dns: "dns",
    dtls: "dtls",
    srtp: "srtp",
    utp: "utp",
    "wechat-video": "wechat",
    wireguard: "wireguard"
  };
  if (profile.seed) {
    udp.push({ type: "mkcp-legacy", settings: { header: "", value: profile.seed } });
  }
  const header = headerMap[String(profile.headerType || "").toLowerCase()];
  if (header) {
    udp.push({ type: "mkcp-legacy", settings: { header, value: "" } });
  }
  if (udp.length) finalmask.udp = udp;
  return finalmask;
}

function buildXhttpSettings(profile) {
  const advanced = cloneObject(profile.xhttpSettings);
  if (advanced.sessionIDPlacement === undefined && advanced.sessionPlacement !== undefined) {
    advanced.sessionIDPlacement = advanced.sessionPlacement;
  }
  if (advanced.sessionIDKey === undefined && advanced.sessionKey !== undefined) {
    advanced.sessionIDKey = advanced.sessionKey;
  }
  delete advanced.sessionPlacement;
  delete advanced.sessionKey;

  if (isObject(advanced.headers)) {
    for (const key of Object.keys(advanced.headers)) {
      if (key.toLowerCase() === "host") {
        const headerHost = advanced.headers[key];
        if (!profile.host) profile = {
          ...profile,
          host: Array.isArray(headerHost) ? headerHost.join(",") : String(headerHost || "")
        };
        delete advanced.headers[key];
      }
    }
  }
  if (isObject(advanced.xmux)) {
    const hasConcurrency = ![undefined, null, "", 0, "0"].includes(advanced.xmux.maxConcurrency);
    const hasConnections = ![undefined, null, "", 0, "0"].includes(advanced.xmux.maxConnections);
    if (hasConcurrency && hasConnections) delete advanced.xmux.maxConnections;
  }
  if (advanced.mode && !["auto", "packet-up", "stream-up", "stream-one"].includes(advanced.mode)) {
    throw new Error("حالت XHTTP داخل پارامتر extra معتبر نیست.");
  }
  return compact({
    path: profile.path || "/",
    host: profile.host,
    mode: profile.mode || advanced.mode || "auto",
    headers: profile.transportHeaders || {},
    xPaddingBytes: profile.xPaddingBytes || "100-1000",
    ...advanced
  });
}

function buildStreamSettings(profile) {
  const stream = {
    network: profile.transport || "raw",
    security: profile.security || "none"
  };
  if (profile.transport === "websocket") {
    stream.wsSettings = compact({
      path: profile.path || "/",
      host: profile.host,
      headers: profile.transportHeaders,
      heartbeatPeriod: profile.heartbeatPeriod
    });
  } else if (profile.transport === "grpc") {
    stream.grpcSettings = compact({
      serviceName: profile.serviceName || profile.path,
      authority: profile.authority,
      multiMode: profile.mode === "multi"
    });
  } else if (profile.transport === "httpupgrade") {
    stream.httpupgradeSettings = compact({
      path: profile.path || "/",
      host: profile.host || profile.address,
      headers: profile.transportHeaders || {}
    });
  } else if (profile.transport === "xhttp") {
    stream.xhttpSettings = buildXhttpSettings(profile);
  } else if (profile.transport === "mkcp") {
    stream.kcpSettings = compact({
      mtu: profile.mtu || 1350,
      tti: profile.tti || 20,
      uplinkCapacity: 5,
      downlinkCapacity: 20,
      cwndMultiplier: 1,
      maxSendingWindow: 2097152
    });
  } else {
    stream.rawSettings = buildRawSettings(profile);
  }

  if (profile.security === "tls") {
    stream.tlsSettings = compact({
      serverName: profile.serverName,
      verifyPeerCertByName: profile.verifyPeerCertByName,
      allowInsecure: Boolean(profile.allowInsecure),
      fingerprint: profile.fingerprint,
      alpn: profile.alpn,
      minVersion: profile.minVersion,
      maxVersion: profile.maxVersion,
      cipherSuites: profile.cipherSuites,
      disableSystemRoot: Boolean(profile.disableSystemRoot),
      enableSessionResumption: Boolean(profile.enableSessionResumption),
      pinnedPeerCertSha256: profile.pinnedPeerCertSha256,
      curvePreferences: profile.curvePreferences,
      echConfigList: profile.echConfigList
    });
  } else if (profile.security === "reality") {
    stream.realitySettings = compact({
      serverName: profile.serverName,
      fingerprint: profile.fingerprint || "chrome",
      password: profile.realityPassword,
      shortId: profile.shortId,
      spiderX: profile.spiderX,
      mldsa65Verify: profile.mldsa65Verify
    });
  }
  const finalmask = buildFinalMask(profile);
  if (Object.keys(finalmask).length) stream.finalmask = finalmask;
  return stream;
}

export function buildOutbound(profile) {
  let settings;
  if (profile.protocol === "vless") {
    // Xray VLESS outbound requires settings.vnext.
    // Building a flat address/id object makes vnext empty and Xray rejects it.
    settings = {
      vnext: [{
        address: profile.address,
        port: Number(profile.port),
        users: [{
          id: profile.idValue,
          encryption: profile.encryption || "none",
          flow: profile.flow
        }]
      }]
    };
  } else if (profile.protocol === "vmess") {
    // Xray VMess outbound requires vnext/users, not a flat address/id object.
    settings = {
      vnext: [{
        address: profile.address,
        port: Number(profile.port),
        users: [{
          id: profile.idValue,
          alterId: 0,
          security: profile.cipher || "auto",
          experiments: profile.experiments
        }]
      }]
    };
  } else if (profile.protocol === "trojan") {
    settings = compact({ address: profile.address, port: profile.port, password: profile.password });
  } else if (profile.protocol === "shadowsocks") {
    settings = {
      servers: [{
        address: profile.address,
        port: profile.port,
        method: profile.method,
        password: profile.password
      }]
    };
  } else {
    throw new Error("پروتکل انتخاب‌شده پشتیبانی نمی‌شود.");
  }
  const outbound = { protocol: profile.protocol, tag: "proxy", settings };
  outbound.streamSettings = buildStreamSettings(profile);
  return outbound;
}

export function buildXrayConfig(profile, port = 10808) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("پورت محلی باید بین 1024 و 65535 باشد.");
  }
  return {
    log: { loglevel: "warning" },
    inbounds: [{
      tag: "chrome-socks",
      listen: "127.0.0.1",
      port,
      protocol: "socks",
      settings: { auth: "noauth", udp: true }
    }],
    outbounds: [
      buildOutbound(profile),
      { protocol: "freedom", tag: "direct" },
      { protocol: "blackhole", tag: "block" }
    ]
  };
}
