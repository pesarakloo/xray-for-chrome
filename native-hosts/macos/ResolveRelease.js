ObjC.import("Foundation");

function run(argv) {
  if (argv.length < 2) throw new Error("usage: ResolveRelease.js <release.json> <asset-name> [v25.8.3]");
  var error = Ref();
  var text = $.NSString.stringWithContentsOfFileEncodingError(
    argv[0],
    $.NSUTF8StringEncoding,
    error
  );
  if (!text) throw new Error("release metadata could not be read");
  var metadata = JSON.parse(ObjC.unwrap(text));
  var releases = Array.isArray(metadata) ? metadata : [metadata];
  var expectedTag = argv[2] || "v25.8.3";
  if (expectedTag !== "v25.8.3") throw new Error("only Xray v25.8.3 is supported by this installer");
  for (var i = 0; i < releases.length; i += 1) {
    var release = releases[i];
    if (!release || release.draft || release.tag_name !== expectedTag || !Array.isArray(release.assets)) continue;
    for (var j = 0; j < release.assets.length; j += 1) {
      var asset = release.assets[j];
      if (asset.name === argv[1]) {
        var expectedUrl = "https://github.com/XTLS/Xray-core/releases/download/" + expectedTag + "/" + argv[1];
        if (asset.browser_download_url !== expectedUrl) throw new Error("unexpected Xray asset URL");
        if (asset.digest && !/^sha256:[a-f0-9]{64}$/i.test(asset.digest)) throw new Error("invalid Xray SHA-256 digest");
        // A non-empty placeholder preserves the three fields when zsh reads TSV.
        return [expectedUrl, asset.digest || "-", expectedTag].join("\t");
      }
    }
  }
  throw new Error("matching Xray asset was not found");
}
