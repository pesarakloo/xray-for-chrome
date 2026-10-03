import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  decodeSubscriptionPayload,
  parseLinkList,
  parseProfileLink,
  profileFingerprint
} from "../extension/modules/parser.js";

function b64(value) {
  return Buffer.from(value, "utf8").toString("base64").replace(/=+$/, "");
}

test("parses VLESS REALITY links", () => {
  const profile = parseProfileLink(
    "vless://11111111-1111-4111-8111-111111111111@example.com:443?type=tcp&security=reality&sni=www.example.com&fp=chrome&pbk=public-key&sid=abcd&flow=xtls-rprx-vision#Reality"
  );
  assert.equal(profile.protocol, "vless");
  assert.equal(profile.transport, "raw");
  assert.equal(profile.security, "reality");
  assert.equal(profile.realityPassword, "public-key");
  assert.equal(profile.name, "Reality");
});

test("parses VMess AEAD links", () => {
  const link = "vmess://" + b64(JSON.stringify({
    v: "2", ps: "VMess WS", add: "vm.example.com", port: "443",
    id: "22222222-2222-4222-8222-222222222222", aid: "0", scy: "auto",
    net: "ws", host: "cdn.example.com", path: "/edge", tls: "tls", sni: "cdn.example.com"
  }));
  const profile = parseProfileLink(link);
  assert.equal(profile.protocol, "vmess");
  assert.equal(profile.transport, "websocket");
  assert.equal(profile.path, "/edge");
  assert.equal(profile.security, "tls");
});

test("maps VMess gRPC legacy type and path fields", () => {
  const link = "vmess://" + b64(JSON.stringify({
    v: "2", ps: "VMess gRPC", add: "grpc.example.com", port: "443",
    id: "22222222-2222-4222-8222-222222222222", aid: "0", scy: "auto",
    net: "grpc", type: "multi", path: "edge-service", tls: "tls",
    sni: "grpc.example.com", authority: "cdn.example.com"
  }));
  const profile = parseProfileLink(link);
  assert.equal(profile.transport, "grpc");
  assert.equal(profile.mode, "multi");
  assert.equal(profile.serviceName, "edge-service");
  assert.equal(profile.authority, "cdn.example.com");
});

test("rejects obsolete VMess alterId", () => {
  const link = "vmess://" + b64(JSON.stringify({ add: "old.example", port: 443, id: "x", aid: 64 }));
  assert.throws(() => parseProfileLink(link), /alterId/);
});

test("parses SIP002 and legacy Shadowsocks links", () => {
  const sip = parseProfileLink(`ss://${b64("aes-256-gcm:secret")}@ss.example.com:8388#Primary`);
  assert.equal(sip.protocol, "shadowsocks");
  assert.equal(sip.method, "aes-256-gcm");
  assert.equal(sip.password, "secret");
  const legacy = parseProfileLink(`ss://${b64("chacha20-ietf-poly1305:pass@legacy.example:1443")}#Legacy`);
  assert.equal(legacy.address, "legacy.example");
  assert.equal(legacy.port, 1443);
  const sip022 = parseProfileLink(
    "ss://2022-blake3-aes-128-gcm%3Ac2hhcmVkLWtleQ@modern.example:443#Modern"
  );
  assert.equal(sip022.method, "2022-blake3-aes-128-gcm");
  assert.equal(sip022.password, "c2hhcmVkLWtleQ");
});

test("converts the 3x-ui compatible Shadowsocks HTTP obfs plugin", () => {
  const plugin = encodeURIComponent("obfs-local;obfs=http;obfs-host=front.example.com");
  const profile = parseProfileLink(
    `ss://${b64("aes-256-gcm:secret")}@ss.example.com:8388?plugin=${plugin}#Obfs`
  );
  assert.equal(profile.transport, "raw");
  assert.equal(profile.headerType, "http");
  assert.equal(profile.host, "front.example.com");
});

test("parses advanced XHTTP, TLS, and FinalMask parameters", () => {
  const extra = encodeURIComponent(JSON.stringify({
    noGRPCHeader: true,
    sessionIDPlacement: "query",
    xmux: { maxConcurrency: "8-16" }
  }));
  const headers = encodeURIComponent(JSON.stringify({ Referer: "https://example.com/" }));
  const finalmask = encodeURIComponent(JSON.stringify({ tcp: [{ type: "fragment", settings: {} }] }));
  const profile = parseProfileLink(
    `vless://id@xhttp.example:443?type=xhttp&security=tls&sni=sni.example&fp=chrome&alpn=h2,http%2F1.1&path=%2Fapi&host=cdn.example&mode=stream-up&extra=${extra}&headers=${headers}&ech=ech-value&vcn=verify.example&pcs=abc123&fm=${finalmask}`
  );
  assert.equal(profile.transport, "xhttp");
  assert.equal(profile.xhttpSettings.noGRPCHeader, true);
  assert.equal(profile.xhttpSettings.sessionIDPlacement, "query");
  assert.deepEqual(profile.xhttpSettings.xmux, { maxConcurrency: "8-16" });
  assert.deepEqual(profile.xhttpSettings.headers, { Referer: "https://example.com/" });
  assert.equal(profile.echConfigList, "ech-value");
  assert.equal(profile.verifyPeerCertByName, "verify.example");
  assert.equal(profile.pinnedPeerCertSha256, "abc123");
  assert.equal(profile.finalMask.tcp[0].type, "fragment");
});

test("Trojan defaults to TLS", () => {
  const profile = parseProfileLink("trojan://password@trojan.example:443?type=grpc&serviceName=edge#Trojan");
  assert.equal(profile.security, "tls");
  assert.equal(profile.transport, "grpc");
  assert.equal(profile.serviceName, "edge");
});

test("decodes base64 subscriptions and reports bad rows", () => {
  const links = [
    "vless://11111111-1111-4111-8111-111111111111@one.example:443?security=tls#One",
    "bad://not-supported"
  ].join("\n");
  const decoded = decodeSubscriptionPayload(b64(links));
  const result = parseLinkList(decoded, "sub-1");
  assert.equal(result.profiles.length, 1);
  assert.equal(result.errors.length, 1);
  assert.equal(result.profiles[0].sourceId, "sub-1");
});

test("accepts literal escaped newlines in subscriptions", () => {
  const result = parseLinkList(
    "vless://id@one.example:443?security=tls\\ntrojan://secret@two.example:443?security=tls"
  );
  assert.equal(result.profiles.length, 2);
});

test("fingerprints equivalent profiles consistently", () => {
  const a = parseProfileLink("vless://id@same.example:443?security=tls#A");
  const b = parseProfileLink("vless://id@same.example:443?security=tls#B");
  assert.equal(profileFingerprint(a), profileFingerprint(b));
});

test("fingerprints include transport-security variables", () => {
  const a = parseProfileLink("vless://id@same.example:443?security=tls&sni=one.example");
  const b = parseProfileLink("vless://id@same.example:443?security=tls&sni=two.example");
  assert.notEqual(profileFingerprint(a), profileFingerprint(b));
});

test("rejects REALITY on transports unsupported by current Xray", () => {
  assert.throws(
    () => parseProfileLink("vless://id@example.com:443?type=ws&security=reality&pbk=key"),
    /RAW.*XHTTP.*gRPC/
  );
});
