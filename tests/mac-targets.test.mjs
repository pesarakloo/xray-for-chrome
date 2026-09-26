import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../native-hosts/macos/TcpTargets.js", import.meta.url), "utf8");
// Exercise validation with a Foundation read shim; this does not emulate JXA itself.
function parse(request) {
  const context = vm.createContext({
    Ref: () => ({}), ObjC: { import() {}, unwrap: (value) => value },
    $: { NSUTF8StringEncoding: 4, NSString: { stringWithContentsOfFileEncodingError: () => JSON.stringify(request) } }
  });
  vm.runInContext(source, context);
  return context.run(["request.json"]);
}

test("macOS validator accepts safe IPv4, IPv6 and domain targets", () => {
  assert.equal(parse({ targets: [
    { id: "0", address: "127.0.0.1", port: 80 },
    { id: "1", address: "2001:db8::1", port: 443 },
    { id: "2", address: "example.test", port: 8443 }
  ], timeoutMs: 4000 }), "4000\n0\t127.0.0.1\t80\n1\t2001:db8::1\t443\n2\texample.test\t8443");
});

test("macOS validator rejects shell syntax, TSV injection and invalid ports", () => {
  for (const address of ["-x", "a\nb", "a\tb", "$(command)", "a b", "host;command", "a/../b", ""]) {
    assert.throws(() => parse({ targets: [{ id: "0", address, port: 443 }] }));
  }
  for (const port of [0, 65536, 1.5, "443", null]) {
    assert.throws(() => parse({ targets: [{ id: "0", address: "example.test", port }] }));
  }
});

test("macOS validator rejects duplicate ids, unsafe ids and invalid deadlines", () => {
  const target = { id: "0", address: "example.test", port: 443 };
  assert.throws(() => parse({ targets: [target, target] }));
  assert.throws(() => parse({ targets: [{ ...target, id: "../file" }] }));
  for (const timeoutMs of [499, 10001, 2.5]) assert.throws(() => parse({ targets: [target], timeoutMs }));
  assert.throws(() => parse({ targets: {} }));
});
