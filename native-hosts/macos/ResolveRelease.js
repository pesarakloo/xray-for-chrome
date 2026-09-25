ObjC.import("Foundation");

function run(argv) {
  if (argv.length < 2) throw new Error("usage: ResolveRelease.js <releases.json> <asset-name> [stable-only]");
  var error = Ref();
  var text = $.NSString.stringWithContentsOfFileEncodingError(
    argv[0],
    $.NSUTF8StringEncoding,
    error
  );
  if (!text) throw new Error("release metadata could not be read");
  var releases = JSON.parse(ObjC.unwrap(text));
  var stableOnly = argv.length > 2 && argv[2] === "stable-only";
  for (var i = 0; i < releases.length; i += 1) {
    var release = releases[i];
    if (release.draft || (stableOnly && release.prerelease)) continue;
    for (var j = 0; j < release.assets.length; j += 1) {
      var asset = release.assets[j];
      if (asset.name === argv[1]) {
        return [asset.browser_download_url, asset.digest || "", release.tag_name].join("\t");
      }
    }
  }
  throw new Error("matching Xray asset was not found");
}
