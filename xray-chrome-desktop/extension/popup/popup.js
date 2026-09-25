const $ = (selector) => document.querySelector(selector);
let state = { profiles: [], subscriptions: [], latencies: {}, ping: {}, connection: { connected: false } };
let toastTimer;
let pingTimer;
let pingStarting = false;

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
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${name}`));
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
  const selected = state.connection.profileId || select.value;
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
  if (!state.profiles.length) list.textContent = "کانفیگی اضافه نشده است.";
  for (const profile of state.profiles) {
    const row = document.createElement("div");
    row.className = "list-item";
    const main = document.createElement("div");
    main.className = "item-main";
    const name = document.createElement("strong");
    name.className = "item-name";
    name.textContent = profile.name;
    const meta = document.createElement("span");
    meta.className = "item-meta";
    meta.textContent = `${profile.protocol.toUpperCase()} · ${profile.address}:${profile.port} · ${profile.transport}`;
    const heading = document.createElement("div");
    heading.className = "item-heading";
    const ping = document.createElement("span");
    ping.dataset.pingId = profile.id;
    heading.append(name, ping);
    main.append(heading, meta);
    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.append(createButton("⌁", "", "انتخاب برای اتصال", () => {
      select.value = profile.id;
      renderLatencies();
      activateTab("connect");
    }));
    const pingButton = createButton("↻", "", "تست پینگ این کانفیگ", () => startPings({ profileId: profile.id }));
    pingButton.dataset.pingButton = "true";
    actions.append(pingButton);
    actions.append(createButton("×", "danger", "حذف", async () => {
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
  if (!state.subscriptions.length) list.textContent = "سابسکریپشنی اضافه نشده است.";
  for (const subscription of state.subscriptions) {
    const row = document.createElement("div");
    row.className = "list-item";
    const main = document.createElement("div");
    main.className = "item-main";
    const name = document.createElement("strong");
    name.className = "item-name";
    name.textContent = subscription.name;
    const meta = document.createElement("span");
    meta.className = "item-meta";
    meta.textContent = `${faNumber(subscription.count)} کانفیگ${subscription.updatedAt ? " · به‌روز" : ""}`;
    main.append(name, meta);
    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.append(createButton("↻", "", "به‌روزرسانی", async (event) => {
      try {
        await busy(event.currentTarget, () => send("refreshSubscription", { id: subscription.id }));
        await loadState();
        startPings({ missingOnly: true });
        toast("سابسکریپشن به‌روزرسانی شد.");
      } catch (error) { toast(error.message, true); }
    }));
    actions.append(createButton("×", "danger", "حذف", async () => {
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
  $("#heroTitle").textContent = connected ? "اتصال برقرار است" : "آماده اتصال";
  const profile = state.profiles.find((item) => item.id === state.connection.profileId);
  $("#heroSubtitle").textContent = connected && profile ? profile.name : "یک کانفیگ انتخاب کنید";
  const button = $("#connectButton");
  button.textContent = connected ? "قطع اتصال" : "اتصال";
  button.classList.toggle("disconnect", connected);
  button.disabled = !connected && !state.profiles.length;
}

async function checkEngine() {
  try {
    const status = await send("nativeStatus");
    $("#engineStatus").textContent = status.version || (status.running ? "Xray در حال اجرا" : "Xray آماده");
  } catch {
    $("#engineStatus").textContent = "برنامه همراه نصب نیست";
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
  if (state.ping?.pendingIds?.includes(profileId)) {
    return { label: state.ping.activeIds?.includes(profileId) ? "در حال تست…" : "در صف…", className: "testing", title: "اندازه‌گیری پینگ" };
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
    title: `زمان پاسخ HTTPS از مسیر کانفیگ · ${updated}`
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
  $("#pingAllButton").textContent = running ? (state.ping.cancelled ? "در حال توقف…" : "توقف تست") : "↻ پینگ همه";
  const progress = $("#pingProgress");
  progress.classList.toggle("error", Boolean(state.ping?.error));
  progress.textContent = state.ping?.error || (running
    ? `${state.ping.cancelled ? "در حال پایان تست جاری" : "در حال اندازه‌گیری"} · ${faNumber(state.ping.completed)} از ${faNumber(state.ping.total)}`
    : "زمان پاسخ از مسیر هر کانفیگ · نتیجهٔ آخرین تست");
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

$("#profileSelect").addEventListener("change", renderLatencies);
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

document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));

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
  if (!box.classList.contains("hidden")) return box.classList.add("hidden");
  try {
    const response = await send("logs");
    box.textContent = response.logs || "گزارشی ثبت نشده است.";
    box.classList.remove("hidden");
  } catch (error) { toast(error.message, true); }
});

Promise.all([loadState(), checkEngine()])
  .then(() => startPings({ missingOnly: true }))
  .catch((error) => toast(error.message, true));
