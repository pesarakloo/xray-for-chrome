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
