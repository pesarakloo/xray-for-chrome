// Help UI only. Does not read or change profiles, proxy settings or native hosts.
const guide = document.querySelector("#tab-guide");
const platformButtons = guide.querySelectorAll("[data-guide-platform]");
const platformPanels = guide.querySelectorAll(".guide-platform-panel");
const copyStatus = guide.querySelector("#guide-copy-status");

for (const button of platformButtons) {
  button.addEventListener("click", () => {
    for (const item of platformButtons) item.setAttribute("aria-pressed", String(item === button));
    for (const panel of platformPanels) panel.hidden = panel.id !== `guide-${button.dataset.guidePlatform}`;
    copyStatus.textContent = "";
  });
}

for (const button of guide.querySelectorAll("[data-guide-copy]")) {
  button.addEventListener("click", async () => {
    const command = guide.querySelector(`#${button.dataset.guideCopy}`);
    if (!command) return;
    try {
      // A direct user click supplies clipboard access; no additional permission.
      await navigator.clipboard.writeText(command.textContent);
      button.textContent = "کپی شد ✓";
      setTimeout(() => { button.textContent = "کپی دستور"; }, 2000);
      copyStatus.textContent = "دستور کپی شد؛ آن را در پنجره فرمان سیستم‌عامل خود وارد کنید.";
    } catch {
      // Keep the command usable when the browser denies clipboard access.
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(command);
      selection.removeAllRanges();
      selection.addRange(range);
      copyStatus.textContent = "دسترسی به کلیپ‌بورد فراهم نشد؛ متن انتخاب‌شده را با Ctrl+C یا ⌘C کپی کنید.";
    }
  });
}
