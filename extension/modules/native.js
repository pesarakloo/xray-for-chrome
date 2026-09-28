export const HOST_NAME = "com.anicloud.xray_chrome";

export function nativeSend(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(HOST_NAME, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error("برنامه همراه پیدا نشد. نصب‌کننده‌ی سیستم‌عامل خود را از پوشه native-hosts اجرا و Chrome را دوباره باز کنید."));
        return;
      }
      if (!response) {
        reject(new Error("برنامه همراه پاسخی برنگرداند."));
        return;
      }
      if (response.ok === false) {
        reject(new Error(response.error || "اجرای Xray ناموفق بود."));
        return;
      }
      resolve(response);
    });
  });
}

export function nativeProbeBatch(targets, { signal, timeoutMs, onResult }) {
  return new Promise((resolve, reject) => {
    let port;
    let settled = false;
    let watchdog;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      signal?.removeEventListener("abort", abort);
      try { port?.disconnect(); } catch { }
      error ? reject(error) : resolve();
    };
    const abort = () => finish(new DOMException("تست متوقف شد.", "AbortError"));
    if (signal?.aborted) return abort();
    try {
      // One native host owns the batch; disconnecting cancels its pending sockets.
      port = chrome.runtime.connectNative(HOST_NAME);
      port.onMessage.addListener((message) => {
        if (settled) return;
        try {
          if (message?.ok === false) throw new Error(message.error || "تست TCP ناموفق بود.");
          if (message?.type === "result") onResult(message);
          else if (message?.type === "done") finish();
          else throw new Error("پاسخ برنامه مکمل معتبر نیست.");
        } catch (error) { finish(error); }
      });
      port.onDisconnect.addListener(() => {
        const error = chrome.runtime.lastError;
        if (!settled) finish(new Error(error?.message || "ارتباط با برنامه مکمل پیش از پایان تست قطع شد."));
      });
      signal?.addEventListener("abort", abort, { once: true });
      watchdog = setTimeout(() => finish(new Error("برنامه مکمل در مهلت تست TCP پاسخ نداد.")), Math.max(15000, targets.length * 30 + timeoutMs + 5000));
      port.postMessage({ action: "probeTcpBatch", targets, timeoutMs });
    } catch (error) { finish(error); }
  });
}
