import test from "node:test";
import assert from "node:assert/strict";
import { parseProfileLink } from "../extension/modules/parser.js";
import { buildOutbound, buildXrayConfig } from "../extension/modules/xray-config.js";

test("builds current flattened VLESS outbound", () => {
  const profile = parseProfileLink(
    "vless://11111111-1111-4111-8111-111111111111@example.com:443?type=ws&security=tls&sni=edge.example.com&host=edge.example.com&path=%2Fws#Edge"
  );
  const outbound = buildOutbound(profile);
  assert.equal(outbound.settings.address, "example.com");
  assert.equal(outbound.settings.id, "11111111-1111-4111-8111-111111111111");
  assert.equal(outbound.streamSettings.method, "websocket");
  assert.equal(outbound.streamSettings.wsSettings.path, "/ws");
  assert.equal(outbound.streamSettings.tlsSettings.serverName, "edge.example.com");
  assert.equal("vnext" in outbound.settings, false);
});

test("builds REALITY settings with the current password field", () => {
  const profile = parseProfileLink(
    "vless://id@reality.example:443?security=reality&pbk=abc123&sid=00&type=tcp&sni=www.cloudflare.com"
  );
  const outbound = buildOutbound(profile);
  assert.equal(outbound.streamSettings.method, "raw");
  assert.equal(outbound.streamSettings.realitySettings.password, "abc123");
  assert.equal(outbound.streamSettings.realitySettings.shortId, "00");
});

test("builds current flattened VMess, Trojan, and Shadowsocks settings", () => {
  const vmessLink = "vmess://" + Buffer.from(JSON.stringify({
    v: "2", add: "vm.example", port: "443", id: "vm-id", aid: "0",
    scy: "chacha20-poly1305", net: "grpc", path: "svc", tls: "tls",
    experiments: "AuthenticatedLength"
  }), "utf8").toString("base64");
  const vmess = buildOutbound(parseProfileLink(vmessLink));
  assert.equal(vmess.settings.address, "vm.example");
  assert.equal(vmess.settings.security, "chacha20-poly1305");
  assert.equal(vmess.settings.experiments, "AuthenticatedLength");
  assert.equal(vmess.streamSettings.grpcSettings.serviceName, "svc");

  const trojan = buildOutbound(parseProfileLink("trojan://secret@tr.example:443?security=tls"));
  assert.deepEqual(trojan.settings, { address: "tr.example", port: 443, password: "secret" });

  const auth = Buffer.from("aes-256-gcm:pass", "utf8").toString("base64").replace(/=+$/, "");
  const shadowsocks = buildOutbound(parseProfileLink(`ss://${auth}@ss.example:8388`));
  assert.deepEqual(shadowsocks.settings, {
    address: "ss.example", port: 8388, method: "aes-256-gcm", password: "pass"
  });
});

test("preserves advanced XHTTP and TLS parameters", () => {
  const extra = encodeURIComponent(JSON.stringify({
    noGRPCHeader: true,
    scMaxEachPostBytes: "500000-1000000",
    sessionIDPlacement: "cookie",
    sessionIDKey: "sid",
    xmux: { maxConnections: "2-4" }
  }));
  const profile = parseProfileLink(
    `vless://id@edge.example:443?type=xhttp&security=tls&sni=sni.example&path=%2Fapi&host=cdn.example&mode=packet-up&extra=${extra}&vcn=verify.example&pcs=deadbeef&minVersion=1.2&maxVersion=1.3&enableSessionResumption=true`
  );
  const stream = buildOutbound(profile).streamSettings;
  assert.equal(stream.method, "xhttp");
  assert.equal(stream.xhttpSettings.mode, "packet-up");
  assert.equal(stream.xhttpSettings.noGRPCHeader, true);
  assert.equal(stream.xhttpSettings.sessionIDPlacement, "cookie");
  assert.deepEqual(stream.xhttpSettings.xmux, { maxConnections: "2-4" });
  assert.equal(stream.tlsSettings.verifyPeerCertByName, "verify.example");
  assert.equal(stream.tlsSettings.pinnedPeerCertSha256, "deadbeef");
  assert.equal(stream.tlsSettings.enableSessionResumption, true);
});

test("converts mKCP legacy seed and header into FinalMask", () => {
  const profile = parseProfileLink(
    "vless://id@kcp.example:8443?type=kcp&security=none&headerType=wechat-video&seed=shared-seed&mtu=1400&tti=30"
  );
  const stream = buildOutbound(profile).streamSettings;
  assert.equal(stream.method, "mkcp");
  assert.equal(stream.kcpSettings.mtu, 1400);
  assert.equal(stream.kcpSettings.tti, 30);
  assert.equal("seed" in stream.kcpSettings, false);
  assert.equal("header" in stream.kcpSettings, false);
  assert.deepEqual(stream.finalmask.udp, [
    { type: "mkcp-legacy", settings: { header: "", value: "shared-seed" } },
    { type: "mkcp-legacy", settings: { header: "wechat", value: "" } }
  ]);
});

test("builds RAW HTTP camouflage for compatible Shadowsocks links", () => {
  const auth = Buffer.from("aes-256-gcm:pass", "utf8").toString("base64").replace(/=+$/, "");
  const plugin = encodeURIComponent("obfs-local;obfs=http;obfs-host=front.example");
  const stream = buildOutbound(parseProfileLink(`ss://${auth}@ss.example:8388?plugin=${plugin}`)).streamSettings;
  assert.equal(stream.rawSettings.header.type, "http");
  assert.deepEqual(stream.rawSettings.header.request.headers.Host, ["front.example"]);
});

test("binds the local SOCKS inbound only to loopback", () => {
  const profile = parseProfileLink("trojan://secret@trojan.example:443?security=tls");
  const config = buildXrayConfig(profile, 10808);
  assert.equal(config.inbounds[0].listen, "127.0.0.1");
  assert.equal(config.inbounds[0].port, 10808);
  assert.equal(config.inbounds[0].protocol, "socks");
});

test("refuses privileged and invalid local ports", () => {
  const profile = parseProfileLink("trojan://secret@trojan.example:443?security=tls");
  assert.throws(() => buildXrayConfig(profile, 80), /1024/);
  assert.throws(() => buildXrayConfig(profile, 70000), /65535/);
});
