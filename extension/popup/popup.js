const $ = (selector) => document.querySelector(selector);
let state = { profiles: [], subscriptions: [], latencies: {}, ping: {}, connection: { connected: false } };
let toastTimer;
let pingTimer;
let pingStarting = false;
const tabs = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".tab-panel")];

function faNumber(value) {
  return new Intl.NumberFormat("fa-IR").format(value || 0);
}

function send(action, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, ...data }, (response) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response?.ok) return reject(new Error(response?.error || "خطای ناشناخته"));
      resolve(response.data);
    });
  });
}

function toast(message, isError = false) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.toggle("error", isError);
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 3200);
}

async function busy(button, task) {
  const oldText = button.textContent;
  button.disabled = true;
  button.textContent = "کمی صبر کنید…";
  try { return await task(); }
  finally { button.disabled = false; button.textContent = oldText; }
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
  const heading = document.createElement("strong");
  heading.textContent = title;
  const hint = document.createElement("p");
  hint.textContent = description;
  const button = createButton("افزودن", "row-button", "افزودن کانفیگ یا سابسکریپشن", () => activateTab("import"));
  list.append(heading, hint, button);
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
    const option = new Option("ابتدا یک کانفیگ اضافه کنید", "");
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
  if (!state.profiles.length) showEmptyList(list, "هنوز کانفیگی ندارید", "لینک کانفیگ یا سابسکریپشن را در بخش افزودن وارد کنید.");
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
    meta.textContent = `${String(profile.protocol || "").toUpperCase()} · ${String(profile.transport || "tcp").toUpperCase()} · ${profile.address}:${profile.port}`;
    meta.title = meta.textContent;
    const heading = document.createElement("div");
    heading.className = "item-heading";
    const ping = document.createElement("span");
    ping.dataset.pingId = profile.id;
    heading.append(name, ping);
    main.append(heading, meta);
    const actions = document.createElement("div");
    actions.className = "item-actions";
    const selectButton = createButton("انتخاب", "row-button select-profile", "انتخاب این کانفیگ برای اتصال", () => {
      if (state.connection.connected && state.connection.profileId !== profile.id) {
        toast("برای تغییر کانفیگ، ابتدا اتصال فعلی را قطع کنید.");
        return;
      }
      select.value = profile.id;
      renderLatencies();
      renderConnection();
      activateTab("connect");
    });
    if (state.connection.connected && state.connection.profileId !== profile.id) {
      selectButton.title = "برای تغییر کانفیگ، ابتدا اتصال فعلی را قطع کنید";
      selectButton.setAttribute("aria-label", selectButton.title);
    }
    selectButton.dataset.selectProfile = profile.id;
    actions.append(selectButton);
    const pingButton = createButton("تست پینگ", "row-button", "تست HTTPS از مسیر همین کانفیگ", () => startPings({ profileId: profile.id }));
    pingButton.dataset.pingButton = "true";
    actions.append(pingButton);
    actions.append(createButton("حذف", "row-button danger", "حذف این کانفیگ", async () => {
      if (!confirm(`کانفیگ «${profile.name}» حذف شود؟`)) return;
      try { await send("deleteProfile", { id: profile.id }); await loadState(); toast("کانفیگ حذف شد."); }
      catch (error) { toast(error.message, true); }
    }));
    row.append(main, actions);
    list.append(row);
  }
  $("#profileCount").textContent = faNumber(state.profiles.length);
}

function renderSubscriptions() {
  const list = $("#subscriptionList");
  list.replaceChildren();
  list.classList.toggle("empty-list", !state.subscriptions.length);
  if (!state.subscriptions.length) showEmptyList(list, "سابسکریپشنی ثبت نشده", "با افزودن لینک اشتراک، فهرست سرورها را یک‌جا دریافت کنید.");
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
    meta.textContent = `${faNumber(subscription.count)} کانفیگ${subscription.updatedAt && Number.isFinite(Date.parse(subscription.updatedAt)) ? " · به‌روزرسانی: " + new Date(subscription.updatedAt).toLocaleDateString("fa-IR") : ""}`;
    main.append(name, meta);
    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.append(createButton("به‌روزرسانی", "row-button", "دریافت دوباره کانفیگ‌های این اشتراک", async (event) => {
      try {
        await busy(event.currentTarget, () => send("refreshSubscription", { id: subscription.id }));
        await loadState();
        startPings({ missingOnly: true });
        toast("سابسکریپشن به‌روزرسانی شد.");
      } catch (error) { toast(error.message, true); }
    }));
    actions.append(createButton("حذف", "row-button danger", "حذف سابسکریپشن و کانفیگ‌های آن", async () => {
      if (!confirm(`سابسکریپشن «${subscription.name}» و کانفیگ‌های آن حذف شوند؟`)) return;
      try { await send("deleteSubscription", { id: subscription.id }); await loadState(); toast("سابسکریپشن حذف شد."); }
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
  $("#statusText").textContent = connected ? "متصل" : "قطع";
  $(".shield").classList.toggle("connected", connected);
  $(".shield span").textContent = connected ? "✓" : "X";
  const hasProfiles = state.profiles.length > 0;
  $("#heroTitle").textContent = connected ? "اتصال برقرار است" : hasProfiles ? "آماده اتصال" : "اولین کانفیگ را اضافه کنید";
  const profile = state.profiles.find((item) => item.id === (connected ? state.connection.profileId : $("#profileSelect").value));
  $("#heroSubtitle").textContent = profile?.name || "با لینک کانفیگ یا سابسکریپشن شروع کنید.";
  $("#heroSubtitle").title = profile?.name || "";
  $("#emptyConnectButton").classList.toggle("hidden", hasProfiles || connected);
  for (const element of document.querySelectorAll('#profileSelect, label[for="profileSelect"], .selected-latency, .latency-note')) {
    element.classList.toggle("hidden", !hasProfiles);
  }
  const button = $("#connectButton");
  button.textContent = connected ? "قطع اتصال" : "اتصال";
  button.classList.toggle("disconnect", connected);
  button.disabled = !connected && !hasProfiles;
  button.classList.toggle("hidden", !connected && !hasProfiles);
}

async function checkEngine() {
  try {
    const status = await send("nativeStatus");
    const description = status.version || (status.running ? "Xray در حال اجرا" : "Xray آماده");
    $("#engineStatus").textContent = description.split("\n")[0];
    $("#engineStatus").title = description;
    $("#engineHelpButton").classList.add("hidden");
  } catch (error) {
    $("#engineStatus").textContent = "برنامه همراه در دسترس نیست";
    $("#engineStatus").title = error.message;
    $("#engineHelpButton").classList.remove("hidden");
  }
}

async function loadState() {
  state = await send("state");
  renderProfiles();
  renderSubscriptions();
  renderConnection();
  renderLatencies();
  schedulePingPoll();
}

function latencyView(profileId) {
  if (state.ping?.activeIds?.includes(profileId)) {
    return { label: "در حال تست", className: "testing", title: "اندازه‌گیری پاسخ HTTPS از مسیر کانفیگ" };
  }
  if (state.ping?.pendingIds?.includes(profileId)) {
    return { label: "در انتظار", className: "waiting", title: "این کانفیگ در نوبت تست پینگ است" };
  }
  const result = state.latencies?.[profileId];
  if (!result) return { label: "—", className: "", title: "هنوز تست نشده است" };
  const updated = new Date(result.checkedAt).toLocaleString("fa-IR");
  if (result.status !== "ok") {
    return { label: result.status === "timeout" ? "بی‌پاسخ" : "خطا", className: "failed", title: `${result.error || "تست ناموفق"} · ${updated}` };
  }
  return {
    label: `${result.latencyMs} ms`,
    className: result.latencyMs < 200 ? "fast" : result.latencyMs < 600 ? "medium" : "slow",
    title: `زمان پاسخ HTTPS از مسیر این کانفیگ · ${updated}`
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
  element.setAttribute("aria-label", `پینگ: ${view.label}. ${view.title}`);
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
  $("#pingAllButton").textContent = running ? (state.ping.cancelled ? "در حال توقف…" : "توقف تست") : "تست همه";
  const progress = $("#pingProgress");
  progress.classList.toggle("error", Boolean(state.ping?.error));
  const successes = Object.values(state.latencies || {}).filter((item) => item.status === "ok").length;
  progress.textContent = state.ping?.error || (running
    ? `${state.ping.cancelled ? "در حال توقف" : "در حال بررسی"} · ${faNumber(state.ping.completed)} از ${faNumber(state.ping.total)}`
    : state.ping?.cancelled ? `تست متوقف شد · ${faNumber(state.ping.completed)} کانفیگ بررسی شد`
    : successes ? `${faNumber(successes)} کانفیگ با پاسخ موفق` : "");
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
    button.textContent = isConnected ? "متصل" : isSelected ? "انتخاب‌شده" : "انتخاب";
    button.classList.toggle("is-current", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }
}

$("#profileSelect").addEventListener("change", () => { renderLatencies(); renderConnection(); });
$("#emptyConnectButton").addEventListener("click", () => { activateTab("import"); $("#manualLinks").focus(); });
$("#engineHelpButton").addEventListener("click", () => activateTab("guide"));
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
    if (event.key === "ArrowLeft") next = (index + 1) % tabs.length;
    if (event.key === "ArrowRight") next = (index + tabs.length - 1) % tabs.length;
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
      toast("اتصال قطع شد.");
    } else {
      const profileId = $("#profileSelect").value;
      if (!profileId) throw new Error("یک کانفیگ انتخاب کنید.");
      await busy(event.currentTarget, () => send("connect", { profileId }));
      toast("Chrome از Xray عبور می‌کند.");
    }
    await loadState();
    await checkEngine();
  } catch (error) { toast(error.message, true); }
});

$("#importButton").addEventListener("click", async (event) => {
  const text = $("#manualLinks").value.trim();
  if (!text) return toast("حداقل یک لینک وارد کنید.", true);
  try {
    const result = await busy(event.currentTarget, () => send("importManual", { text }));
    $("#manualLinks").value = "";
    await loadState();
    toast(`${faNumber(result.added)} کانفیگ اضافه شد${result.skipped ? `؛ ${faNumber(result.skipped)} مورد رد شد` : ""}.`);
    activateTab("connect");
    startPings({ missingOnly: true });
  } catch (error) { toast(error.message, true); }
});

$("#addSubscriptionButton").addEventListener("click", async (event) => {
  const name = $("#subscriptionName").value.trim();
  const url = $("#subscriptionUrl").value.trim();
  if (!url) return toast("لینک سابسکریپشن را وارد کنید.", true);
  try {
    const result = await busy(event.currentTarget, () => send("addSubscription", { name, url }));
    $("#subscriptionName").value = "";
    $("#subscriptionUrl").value = "";
    await loadState();
    toast(`${faNumber(result.added)} کانفیگ از سابسکریپشن دریافت شد.`);
    activateTab("connect");
    startPings({ missingOnly: true });
  } catch (error) { toast(error.message, true); }
});

$("#showLogsButton").addEventListener("click", async () => {
  const box = $("#logsBox");
  const button = $("#showLogsButton");
  if (!box.classList.contains("hidden")) {
    box.classList.add("hidden");
    button.textContent = "گزارش خطا";
    button.setAttribute("aria-expanded", "false");
    return;
  }
  try {
    const response = await send("logs");
    box.textContent = response.logs || "گزارشی ثبت نشده است.";
    box.classList.remove("hidden");
    button.textContent = "بستن گزارش";
    button.setAttribute("aria-expanded", "true");
  } catch (error) { toast(error.message, true); }
});

Promise.all([loadState(), checkEngine()])
  .then(() => startPings({ missingOnly: true }))
  .catch((error) => toast(error.message, true));
