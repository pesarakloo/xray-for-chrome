import { t, localizeError, getLanguage, setLanguage, locale, applyTranslations } from "../modules/i18n.js";
import { subscriptionOrigin } from "../modules/subscription-access.js";
const $ = (selector) => document.querySelector(selector);
let state = { profiles: [], subscriptions: [], latencies: {}, ping: {}, connection: { connected: false } };
let toastTimer;
let pingTimer;
let pingStarting = false;
let pendingActions = 0;
let routingDirty = false;
const tabs = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".tab-panel")];

function faNumber(value) {
  return new Intl.NumberFormat(locale()).format(value || 0);
}

function send(action, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, ...data }, (response) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response?.ok) return reject(new Error(response?.error || t("خطای ناشناخته")));
      resolve(response.data);
    });
  });
}

function toast(message, isError = false) {
  const element = $("#toast");
  element.textContent = isError ? localizeError(message) : message;
  element.classList.toggle("error", isError);
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 3200);
}

async function busy(button, task) {
  const oldContent = [...button.childNodes].map((node) => node.cloneNode(true));
  pendingActions++;
  $("#languageButton").disabled = true;
  button.disabled = true;
  button.textContent = t("کمی صبر کنید…");
  try { return await task(); }
  finally { button.disabled = false; button.replaceChildren(...oldContent); pendingActions--; $("#languageButton").disabled = pendingActions > 0; }
}

function activateTab(name) {
  tabs.forEach((tab) => {
    const selected = tab.dataset.tab === name;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  panels.forEach((panel) => {
    const selected = panel.id === `tab-${name}`;
    panel.classList.toggle("active", selected);
    panel.hidden = !selected;
  });
  window.scrollTo?.(0, 0);
}

function showEmptyList(list, title, description) {
  const subscription = list.id === "subscriptionList";
  const illustration = document.createElement("img");
  illustration.className = "empty-art";
  illustration.src = `../assets/ui/${subscription ? "empty-subscriptions" : "empty-profiles"}.webp`;
  illustration.alt = "";
  illustration.width = 144;
  illustration.height = 108;
  const heading = document.createElement("strong");
  heading.textContent = title;
  const hint = document.createElement("p");
  hint.textContent = description;
  const button = createButton(t(subscription ? "افزودن سابسکریپشن" : "افزودن کانفیگ"), "empty-action", t("افزودن کانفیگ یا سابسکریپشن"), () => { activateTab("import"); $(subscription ? "#subscriptionUrl" : "#manualLinks").focus(); });
  button.prepend(createIcon(subscription ? "link" : "plus"));
  list.append(illustration, heading, hint, button);
}

function createIcon(name) {
  const icon = document.createElement("span");
  icon.className = `ui-icon icon-${name}`;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

// Decorative flags are taken only from an explicit country marker in the name.
// This never geolocates the server or infers a location from its address.
function profileFlag(name) {
  const text = String(name || "");
  const pair = text.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u)?.[0];
  let code = pair ? [...pair].map((c) => String.fromCharCode(c.codePointAt(0) - 0x1f1e6 + 97)).join("") : text.match(/^\s*(IR|DE|NL|US|SG|UK|GB|FR|TR|CA|FI|AE|RU|JP|AU|SE|CH|AT|NO)(?=[\s\-_|:])/i)?.[1]?.toLowerCase();
  if (code === "uk") code = "gb";
  if (!["ir","de","nl","us","sg","gb","fr","tr","ca","fi","ae","ru","jp","au","se","ch","at","no"].includes(code)) return null;
  const flag = document.createElement("img");
  flag.src = `../assets/flags/${code}.svg`;
  flag.alt = "";
  flag.className = "profile-flag";
  flag.width = 34; flag.height = 34;
  return flag;
}

function createButton(label, className, title, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = `icon-button ${className || ""}`;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.addEventListener("click", onClick);
  return button;
}

function renderProfiles() {
  const select = $("#profileSelect");
  const selected = state.connection.connected ? state.connection.profileId : select.value || state.connection.profileId;
  select.replaceChildren();
  if (!state.profiles.length) {
    const option = new Option(t("ابتدا یک کانفیگ اضافه کنید"), "");
    select.append(option);
    select.disabled = true;
  } else {
    for (const profile of state.profiles) {
      const option = new Option(profileLabel(profile), profile.id);
      select.append(option);
    }
    select.value = state.profiles.some((item) => item.id === selected) ? selected : state.profiles[0].id;
    select.disabled = state.connection.connected;
  }

  const list = $("#profileList");
  list.replaceChildren();
  list.classList.toggle("empty-list", !state.profiles.length);
  if (!state.profiles.length) showEmptyList(list, t("هنوز کانفیگی ندارید"), t("لینک کانفیگ یا سابسکریپشن را در بخش افزودن وارد کنید."));
  for (const profile of state.profiles) {
    const row = document.createElement("div");
    row.className = "list-item profile-item";
    row.dataset.profileId = profile.id;
    row.classList.toggle("is-connected", state.connection.connected && state.connection.profileId === profile.id);
    const main = document.createElement("div");
    main.className = "item-main";
    const name = document.createElement("strong");
    name.className = "item-name";
    name.textContent = profile.name;
    name.title = profile.name;
    name.dir = "auto";
    const meta = document.createElement("span");
    meta.className = "item-meta server-meta";
    const labels = { vless: "VLESS", vmess: "VMess", shadowsocks: "Shadowsocks", trojan: "Trojan", reality: "Reality", tls: "TLS", tcp: "TCP", raw: "TCP", ws: "WebSocket", websocket: "WebSocket", grpc: "gRPC", xhttp: "XHTTP", httpupgrade: "HTTPUpgrade" };
    const display = (value) => labels[String(value).toLowerCase()] || String(value).toUpperCase();
    meta.textContent = [display(profile.protocol || ""), profile.security && profile.security !== "none" ? display(profile.security) : "", display(profile.transport || "tcp")].filter(Boolean).join(" · ");
    meta.title = `${meta.textContent} · ${profile.address}:${profile.port}`;
    const heading = document.createElement("div");
    heading.className = "item-heading";
    const ping = document.createElement("span");
    ping.dataset.pingId = profile.id;
    heading.append(name);
    main.append(heading, meta);
    const actions = document.createElement("div");
    actions.className = "item-actions";
    const selectButton = createButton(t("انتخاب"), "row-button select-profile", t("انتخاب این کانفیگ برای اتصال"), () => {
      if (state.connection.connected && state.connection.profileId !== profile.id) {
        toast(t("برای تغییر کانفیگ، ابتدا اتصال فعلی را قطع کنید."));
        return;
      }
      select.value = profile.id;
      renderLatencies();
      renderConnection();
      activateTab("connect");
    });
    if (state.connection.connected && state.connection.profileId !== profile.id) {
      selectButton.title = t("برای تغییر کانفیگ، ابتدا اتصال فعلی را قطع کنید");
      selectButton.setAttribute("aria-label", selectButton.title);
    }
    selectButton.dataset.selectProfile = profile.id;
    actions.append(selectButton);
    const pingButton = createButton(t("تست پینگ"), "row-button", t("تست HTTPS از مسیر همین کانفیگ"), () => startPings({ profileId: profile.id }));
    pingButton.dataset.pingButton = "true";
    const menu = document.createElement("details");
    menu.className = "row-menu";
    const summary = document.createElement("summary");
    summary.setAttribute("aria-label", t("گزینه‌های کانفیگ"));
    summary.title = t("گزینه‌های کانفیگ");
    summary.append(createIcon("dots-vertical"));
    const menuItems = document.createElement("div");
    menuItems.className = "menu-items";
    pingButton.prepend(createIcon("activity"));
    menuItems.append(pingButton);
    const remove = createButton(t("حذف"), "row-button danger", t("حذف این کانفیگ"), async () => {
      if (!confirm(t("کانفیگ «{name}» حذف شود؟", { name: profile.name }))) return;
      try { await send("deleteProfile", { id: profile.id }); await loadState(); toast(t("کانفیگ حذف شد.")); }
      catch (error) { toast(error.message, true); }
    });
    remove.prepend(createIcon("trash"));
    menuItems.append(remove);
    menuItems.addEventListener("click", () => { menu.open = false; summary.focus(); });
    menu.append(summary, menuItems);
    actions.append(menu);
    const emblem = document.createElement("span");
    emblem.className = "profile-emblem";
    emblem.append(profileFlag(profile.name) || createIcon("world"));
    row.append(emblem, main, ping, actions);
    list.append(row);
  }
  $("#profileCount").textContent = faNumber(state.profiles.length);
}

function renderSubscriptions() {
  const list = $("#subscriptionList");
  list.replaceChildren();
  list.classList.toggle("empty-list", !state.subscriptions.length);
  if (!state.subscriptions.length) showEmptyList(list, t("سابسکریپشنی ثبت نشده"), t("با افزودن لینک اشتراک، فهرست سرورها را یک‌جا دریافت کنید."));
  for (const subscription of state.subscriptions) {
    const row = document.createElement("div");
    row.className = "list-item";
    const main = document.createElement("div");
    main.className = "item-main";
    const name = document.createElement("strong");
    name.className = "item-name";
    name.textContent = subscription.name;
    name.title = subscription.name;
    name.dir = "auto";
    const meta = document.createElement("span");
    meta.className = "item-meta";
    meta.textContent = t("{count} کانفیگ", { count: faNumber(subscription.count) }) + (subscription.updatedAt && Number.isFinite(Date.parse(subscription.updatedAt)) ? " · " + t("به‌روزرسانی: {date}", { date: new Date(subscription.updatedAt).toLocaleDateString(locale()) }) : "");
    main.append(name, meta);
    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.append(createButton(t("به‌روزرسانی"), "row-button", t("دریافت دوباره کانفیگ‌های این اشتراک"), async (event) => {
      try {
        await busy(event.currentTarget, async () => { await requestSubscriptionAccess(subscription.url); return send("refreshSubscription", { id: subscription.id }); });
        await loadState();
        startPings({ missingOnly: true });
        toast(t("سابسکریپشن به‌روزرسانی شد."));
      } catch (error) { toast(error.message, true); }
    }));
    actions.append(createButton(t("حذف"), "row-button danger", t("حذف سابسکریپشن و کانفیگ‌های آن"), async () => {
      if (!confirm(t("سابسکریپشن «{name}» و کانفیگ‌های آن حذف شوند؟", { name: subscription.name }))) return;
      try { await send("deleteSubscription", { id: subscription.id }); await loadState(); toast(t("سابسکریپشن حذف شد.")); }
      catch (error) { toast(error.message, true); }
    }));
    row.append(main, actions);
    list.append(row);
  }
  $("#subscriptionCount").textContent = faNumber(state.subscriptions.length);
}

function renderConnection() {
  const connected = Boolean(state.connection.connected);
  $("#statusPill").classList.toggle("online", connected);
  $("#statusPill").classList.toggle("offline", !connected);
  $("#statusText").textContent = connected ? t("متصل") : t("قطع");
  $(".shield").classList.toggle("connected", connected);
  $(".hero-card").classList.toggle("is-connected", connected);
  const hasProfiles = state.profiles.length > 0;
  $(".hero-card").classList.toggle("has-profiles", hasProfiles);
  $("#heroTitle").textContent = connected ? t("اتصال برقرار است") : hasProfiles ? t("آماده اتصال") : t("اولین کانفیگ را اضافه کنید");
  const profile = state.profiles.find((item) => item.id === (connected ? state.connection.profileId : $("#profileSelect").value));
  $("#heroSubtitle").textContent = profile?.name || t("با لینک کانفیگ یا سابسکریپشن شروع کنید.");
  $("#heroSubtitle").title = profile?.name || "";
  $("#emptyConnectButton").classList.toggle("hidden", hasProfiles || connected);
  for (const element of document.querySelectorAll('#profileSelect, label[for="profileSelect"], .selected-latency, .latency-note')) {
    element.classList.toggle("hidden", !hasProfiles);
  }
  const button = $("#connectButton");
  button.textContent = connected ? t("قطع اتصال") : t("اتصال");
  button.classList.toggle("disconnect", connected);
  button.disabled = !connected && !hasProfiles;
  button.classList.toggle("hidden", !connected && !hasProfiles);
}

async function checkEngine() {
  try {
    const status = await send("nativeStatus");
    const description = status.version || (status.running ? t("Xray در حال اجرا") : t("Xray آماده"));
    $("#engineStatus").textContent = description.split("\n")[0];
    $("#engineStatus").title = description;
    $("#engineHelpButton").classList.add("hidden");
  } catch (error) {
    $("#engineStatus").textContent = t("برنامه همراه در دسترس نیست");
    $("#engineStatus").title = localizeError(error.message);
    $("#engineHelpButton").classList.remove("hidden");
  }
}

async function loadState() {
  state = await send("state");
  renderProfiles();
  renderSubscriptions();
  renderConnection();
  renderRouting();
  renderLatencies();
  schedulePingPoll();
}

function latencyView(profileId) {
  if (state.ping?.activeIds?.includes(profileId)) {
    return { label: t("در حال تست"), className: "testing", title: t("اندازه‌گیری پاسخ HTTPS از مسیر کانفیگ") };
  }
  if (state.ping?.pendingIds?.includes(profileId)) {
    return { label: t("در انتظار"), className: "waiting", title: t("این کانفیگ در نوبت تست پینگ است") };
  }
  const result = state.latencies?.[profileId];
  if (!result) return { label: "—", className: "", title: t("هنوز تست نشده است") };
  const updated = new Date(result.checkedAt).toLocaleString(locale());
  if (result.status !== "ok") {
    return { label: result.status === "timeout" ? t("بی‌پاسخ") : t("خطا"), className: "failed", title: `${localizeError(result.error || "تست ناموفق")} · ${updated}` };
  }
  return {
    label: `${result.latencyMs} ms`,
    className: result.latencyMs < 200 ? "fast" : result.latencyMs < 600 ? "medium" : "slow",
    title: `${t("زمان پاسخ HTTPS از مسیر این کانفیگ")} · ${updated}`
  };
}

function profileLabel(profile) {
  return `${profile.name} · ${profile.protocol.toUpperCase()} · ${latencyView(profile.id).label}`;
}

function paintLatency(element, profileId) {
  const view = latencyView(profileId);
  element.textContent = view.label;
  element.className = `ping-badge ${view.className}`;
  element.title = view.title;
  element.setAttribute("aria-label", t("پینگ: {label}. {title}", { label: view.label, title: view.title }));
}

function renderLatencies() {
  document.querySelectorAll("[data-ping-id]").forEach((element) => paintLatency(element, element.dataset.pingId));
  const profilesById = new Map(state.profiles.map((profile) => [profile.id, profile]));
  for (const option of $("#profileSelect").options) {
    const profile = profilesById.get(option.value);
    if (profile) option.textContent = profileLabel(profile);
  }
  paintLatency($("#selectedPing"), $("#profileSelect").value);
  const running = Boolean(state.ping?.running);
  $("#pingSelectedButton").disabled = running || pingStarting || !$("#profileSelect").value;
  document.querySelectorAll("[data-ping-button]").forEach((button) => { button.disabled = running || pingStarting; });
  $("#pingAllButton").disabled = pingStarting || !state.profiles.length || (running && state.ping.cancelled);
  $("#pingAllButton").textContent = running ? (state.ping.cancelled ? t("در حال توقف…") : t("توقف تست")) : t("تست همه");
  const progress = $("#pingProgress");
  progress.classList.toggle("error", Boolean(state.ping?.error));
  const successes = Object.values(state.latencies || {}).filter((item) => item.status === "ok").length;
  progress.textContent = (state.ping?.error ? localizeError(state.ping.error) : "") || (running
    ? `${t(state.ping.cancelled ? "در حال توقف" : "در حال بررسی")} · ${t("{done} از {total}", { done: faNumber(state.ping.completed), total: faNumber(state.ping.total) })}`
    : state.ping?.cancelled ? t("تست متوقف شد · {count} کانفیگ بررسی شد", { count: faNumber(state.ping.completed) })
    : successes ? t("{count} کانفیگ با پاسخ موفق", { count: faNumber(successes) }) : "");
  progress.classList.toggle("hidden", !progress.textContent);
  paintSelection();
}

function schedulePingPoll() {
  clearTimeout(pingTimer);
  if (!state.ping?.running) return;
  pingTimer = setTimeout(async () => {
    try {
      const result = await send("pingState");
      state.latencies = result.latencies;
      state.ping = result.ping;
      renderLatencies();
      schedulePingPoll();
    } catch (error) { toast(error.message, true); }
  }, 700);
}

async function startPings(options = {}) {
  if (!state.profiles.length || pingStarting || state.ping?.running) return;
  pingStarting = true;
  renderLatencies();
  try {
    state.ping = await send("pingProfiles", options);
    schedulePingPoll();
  } catch (error) {
    state.ping = { running: false, error: error.message };
    toast(error.message, true);
  } finally {
    pingStarting = false;
    renderLatencies();
  }
}

function paintSelection() {
  const selectedId = $("#profileSelect").value;
  for (const row of document.querySelectorAll("[data-profile-id]")) {
    const isSelected = row.dataset.profileId === selectedId;
    const isConnected = state.connection.connected && row.dataset.profileId === state.connection.profileId;
    row.classList.toggle("is-selected", isSelected);
    const button = row.querySelector("[data-select-profile]");
    button.textContent = isConnected ? t("متصل") : isSelected ? t("انتخاب‌شده") : t("انتخاب");
    button.classList.toggle("is-current", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }
}

$("#profileSelect").addEventListener("change", () => { renderLatencies(); renderConnection(); });
$("#emptyConnectButton").addEventListener("click", () => { activateTab("import"); $("#manualLinks").focus(); });
$("#engineHelpButton").addEventListener("click", () => activateTab("guide"));

function renderRouting() {
  const routing = state.routing || { enabled: false, domains: [] };
  if (!routingDirty) {
    $("#routingEnabled").checked = routing.enabled;
    $("#routingDomains").value = routing.domains.join("\n");
  }
  $("#routingStatus").textContent = routingDirty ? t("تغییرات هنوز ذخیره نشده‌اند.") : routing.enabled
    ? t("{count} سایت برای عبور مستقیم ذخیره شده است.", { count: faNumber(routing.domains.length) })
    : t("تفکیک ترافیک خاموش است؛ فهرست سایت‌ها حفظ می‌شود.");
}
$("#routingForm").addEventListener("input", () => { routingDirty = true; renderRouting(); });
$("#routingForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#saveRoutingButton");
  if (button.disabled) return;
  const input = $("#routingDomains"), toggle = $("#routingEnabled");
  const data = { text: input.value, enabled: toggle.checked };
  input.disabled = toggle.disabled = true;
  try {
    state.routing = await busy(button, () => send("saveRouting", data));
    routingDirty = false;
    renderRouting();
    $("#routingStatus").textContent = t(state.connection.connected
      ? "تنظیمات ذخیره شد. صفحه سایت را دوباره بارگذاری کنید؛ ارتباط‌های باز ممکن است تا بسته‌شدن از مسیر قبلی استفاده کنند."
      : "تنظیمات ذخیره شد و در اتصال بعدی اعمال می‌شود.");
  } catch (error) {
    $("#routingStatus").textContent = localizeError(error.message);
    toast(error.message, true);
  } finally { input.disabled = toggle.disabled = false; }
});
document.querySelectorAll("[data-open-import]").forEach((button) => button.addEventListener("click", () => {
  activateTab("import");
  document.getElementById(button.dataset.openImport).focus();
}));
document.addEventListener("click", (event) => {
  document.querySelectorAll(".row-menu[open]").forEach((menu) => { if (!menu.contains(event.target)) menu.open = false; });
});
document.addEventListener("toggle", (event) => {
  if (!event.target.matches?.(".row-menu[open]")) return;
  document.querySelectorAll(".row-menu[open]").forEach((menu) => { if (menu !== event.target) menu.open = false; });
}, true);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".row-menu[open]").forEach((menu) => { menu.open = false; menu.querySelector("summary").focus(); });
});
$("#pingSelectedButton").addEventListener("click", () => startPings({ profileId: $("#profileSelect").value }));
$("#pingAllButton").addEventListener("click", async () => {
  if (!state.ping?.running) return startPings();
  try {
    state.ping = await send("cancelPings");
    renderLatencies();
    schedulePingPoll();
  } catch (error) { toast(error.message, true); }
});
$("#appVersion").textContent = `v${chrome.runtime.getManifest().version}`;

$(".tabs").setAttribute("role", "tablist");
tabs.forEach((tab, index) => {
  tab.id = `nav-${tab.dataset.tab}`;
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-controls", `tab-${tab.dataset.tab}`);
  const panel = $(`#tab-${tab.dataset.tab}`);
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", tab.id);
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  tab.addEventListener("keydown", (event) => {
    let next;
    const rtl = getLanguage() === "fa";
    if (event.key === "ArrowLeft") next = (index + (rtl ? 1 : tabs.length - 1)) % tabs.length;
    if (event.key === "ArrowRight") next = (index + (rtl ? tabs.length - 1 : 1)) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    activateTab(tabs[next].dataset.tab);
    tabs[next].focus();
  });
});
activateTab("connect");

$("#connectButton").addEventListener("click", async (event) => {
  try {
    if (state.connection.connected) {
      await busy(event.currentTarget, () => send("disconnect"));
      toast(t("اتصال قطع شد."));
    } else {
      const profileId = $("#profileSelect").value;
      if (!profileId) throw new Error(t("یک کانفیگ انتخاب کنید."));
      await busy(event.currentTarget, () => send("connect", { profileId }));
      toast(t("Chrome از Xray عبور می‌کند."));
    }
    await loadState();
    await checkEngine();
  } catch (error) { toast(error.message, true); }
});

$("#importButton").addEventListener("click", async (event) => {
  const text = $("#manualLinks").value.trim();
  if (!text) return toast(t("حداقل یک لینک وارد کنید."), true);
  try {
    const result = await busy(event.currentTarget, () => send("importManual", { text }));
    $("#manualLinks").value = "";
    await loadState();
    toast(t("{count} کانفیگ اضافه شد", { count: faNumber(result.added) }) + (result.skipped ? " · " + t("{count} مورد رد شد", { count: faNumber(result.skipped) }) : ""));
    activateTab("connect");
    startPings({ missingOnly: true });
  } catch (error) { toast(error.message, true); }
});

$("#addSubscriptionButton").addEventListener("click", async (event) => {
  const name = $("#subscriptionName").value.trim();
  const url = $("#subscriptionUrl").value.trim();
  if (!url) return toast(t("لینک سابسکریپشن را وارد کنید."), true);
  try {
    const result = await busy(event.currentTarget, async () => { await requestSubscriptionAccess(url); return send("addSubscription", { name, url }); });
    $("#subscriptionName").value = "";
    $("#subscriptionUrl").value = "";
    await loadState();
    toast(t("{count} کانفیگ از سابسکریپشن دریافت شد.", { count: faNumber(result.added) }));
    activateTab("connect");
    startPings({ missingOnly: true });
  } catch (error) { toast(error.message, true); }
});

$("#showLogsButton").addEventListener("click", async () => {
  const box = $("#logsBox");
  const button = $("#showLogsButton");
  if (!box.classList.contains("hidden")) {
    box.classList.add("hidden");
    button.textContent = t("گزارش خطا");
    button.setAttribute("aria-expanded", "false");
    return;
  }
  try {
    const response = await send("logs");
    box.textContent = response.logs || t("گزارشی ثبت نشده است.");
    box.classList.remove("hidden");
    button.textContent = t("بستن گزارش");
    button.setAttribute("aria-expanded", "true");
  } catch (error) { toast(error.message, true); }
});

initializeLanguage().then(() => Promise.all([loadState(), checkEngine()]))
  .then(() => startPings({ missingOnly: true }))
  .catch((error) => toast(error.message, true));


// permissions.request must run directly in the Add/Refresh click, before other I/O.
async function requestSubscriptionAccess(url) {
  const granted = await chrome.permissions.request({ origins: [subscriptionOrigin(url)] });
  if (!granted) throw new Error("مجوز دریافت این سابسکریپشن داده نشده است؛ از دکمه افزودن یا به‌روزرسانی استفاده کنید.");
}

async function initializeLanguage() {
  let saved = {};
  try { saved = await chrome.storage.local.get("uiLanguage"); } catch { /* English fallback. */ }
  setLanguage(saved.uiLanguage || "en");
  applyTranslations();
}

$("#languageButton").addEventListener("click", async () => {
  const button = $("#languageButton");
  button.disabled = true;
  try {
    const next = getLanguage() === "fa" ? "en" : "fa";
    await chrome.storage.local.set({ uiLanguage: next });
    setLanguage(next);
    applyTranslations();
    renderProfiles(); renderSubscriptions(); renderConnection(); renderLatencies(); renderRouting();
    $("#showLogsButton").textContent = t($("#logsBox").classList.contains("hidden") ? "گزارش خطا" : "بستن گزارش");
    $("#toast").classList.remove("show");
    $("#guide-copy-status").textContent = "";
    await checkEngine();
  } catch { toast(t("زبان ذخیره نشد؛ دوباره تلاش کنید."), true); }
  finally { button.disabled = pendingActions > 0; }
});
