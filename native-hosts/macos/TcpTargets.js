// JXA: validate the request once and pass only safe TSV fields to the shell.
function run(argv) {
  ObjC.import("Foundation");
  var error = Ref();
  var text = $.NSString.stringWithContentsOfFileEncodingError(argv[0], $.NSUTF8StringEncoding, error);
  if (!text) throw new Error("TCP request could not be read.");
  var request = JSON.parse(ObjC.unwrap(text));
  if (!Array.isArray(request.targets) || request.targets.length > 10000) throw new Error("Invalid TCP target list.");
  var timeout = Number(request.timeoutMs || 4000);
  if (!Number.isInteger(timeout) || timeout < 500 || timeout > 10000) throw new Error("Invalid TCP timeout.");
  var ids = Object.create(null);
  var lines = request.targets.map(function (target) {
    if (!target || typeof target.id !== "string" || !/^[0-9]{1,10}$/.test(target.id) || ids[target.id] ||
        typeof target.address !== "string" || target.address.length > 253 ||
        !/^[a-zA-Z0-9:][a-zA-Z0-9.:%_-]*$/.test(target.address) ||
        !Number.isInteger(target.port) || target.port < 1 || target.port > 65535) throw new Error("Invalid TCP target.");
    ids[target.id] = true;
    return [target.id, target.address, target.port].join("\t");
  });
  return [String(timeout)].concat(lines).join("\n");
}
