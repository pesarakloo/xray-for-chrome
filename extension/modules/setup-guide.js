export const STORE_EXTENSION_ID = "lifddnekhjaikimaajejkdbhfnifpcoo";

export function setupCommand(method, platform, action, extensionId) {
  if (!["store", "github"].includes(method) || !["windows", "macos"].includes(platform) || !["install", "local", "remove"].includes(action)) throw new Error("Invalid setup route");
  if (action !== "remove" && !/^[a-p]{32}$/.test(extensionId)) throw new Error("Invalid extension ID");
  if (platform === "windows") {
    if (action === "remove") return ".\\uninstall-windows.cmd";
    const local = action === "local" ? ' -XrayExe "C:\\Path\\To\\xray.exe"' : "";
    return `.\\install-windows.cmd${local} -ExtensionId ${extensionId}`;
  }
  const folder = method === "store" ? "./" : "./native-hosts/macos/";
  if (action === "remove") return `/bin/zsh ${folder}uninstall.command`;
  const local = action === "local" ? ' --xray "/path/to/xray"' : "";
  return `/bin/zsh ${folder}install.command${local} --extension-id ${extensionId}`;
}
