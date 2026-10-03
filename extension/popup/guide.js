import { t } from "../modules/i18n.js";
import { setupCommand, STORE_EXTENSION_ID } from "../modules/setup-guide.js";

const guide = document.querySelector("#tab-guide");
const methodButtons = [...guide.querySelectorAll("[data-guide-method]")];
const platformButtons = [...guide.querySelectorAll("[data-guide-platform]")];
const copyStatus = guide.querySelector("#guide-copy-status");
let method = chrome.runtime.id === STORE_EXTENSION_ID ? "store" : "github";
let platform = /Macintosh|Mac OS X|macOS/i.test(navigator.userAgent) ? "macos" : "windows";

function showRoute() {
  for (const button of methodButtons) button.setAttribute("aria-pressed", String(button.dataset.guideMethod === method));
  for (const panel of guide.querySelectorAll(".guide-method-panel")) panel.hidden = panel.id !== `guide-method-${method}`;
  for (const button of platformButtons) button.setAttribute("aria-pressed", String(button.dataset.guidePlatform === platform));
  for (const panel of guide.querySelectorAll(".guide-platform-panel")) panel.hidden = panel.id !== `guide-${method}-${platform}`;
  copyStatus.textContent = "";
}
for (const button of methodButtons) button.addEventListener("click", () => { method = button.dataset.guideMethod; showRoute(); });
for (const button of platformButtons) button.addEventListener("click", () => { platform = button.dataset.guidePlatform; showRoute(); });
showRoute();

const extensionId = chrome.runtime.id;
document.querySelector("#extensionId").textContent = extensionId || "—";
for (const code of guide.querySelectorAll("[data-guide-command]")) {
  try {
    code.textContent = setupCommand(code.dataset.method, code.dataset.os, code.dataset.guideCommand, extensionId);
  } catch {
    code.dataset.i18n = "شناسه افزونه در دسترس نیست؛ راهنما را از داخل افزونه نصب‌شده باز کنید.";
    code.textContent = t(code.dataset.i18n);
    guide.querySelector(`[data-guide-copy="${code.id}"]`).disabled = true;
  }
}

for (const button of guide.querySelectorAll("[data-guide-copy]")) {
  button.addEventListener("click", async () => {
    const command = document.getElementById(button.dataset.guideCopy);
    if (!command) return;
    const label = button.querySelector("[data-i18n]");
    try {
      await navigator.clipboard.writeText(command.textContent);
      label.textContent = t("کپی شد ✓");
      setTimeout(() => { label.textContent = t("کپی دستور"); }, 2000);
      copyStatus.textContent = t("دستور کپی شد؛ آن را در پنجره فرمان سیستم‌عامل خود وارد کنید.");
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(command);
      selection.removeAllRanges();
      selection.addRange(range);
      copyStatus.textContent = t("دسترسی به کلیپ‌بورد فراهم نشد؛ متن انتخاب‌شده را با Ctrl+C یا ⌘C کپی کنید.");
    }
  });
}
