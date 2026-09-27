// Host permission is requested by the popup in a direct user gesture.
export function subscriptionOrigin(input) {
  let url;
  try { url = new URL(input); }
  catch { throw new Error("آدرس سابسکریپشن معتبر نیست."); }
  if (url.protocol !== "https:") throw new Error("سابسکریپشن باید با https شروع شود.");
  if (url.username || url.password) throw new Error("این لینک شامل نام کاربری یا رمز در آدرس است؛ لینک HTTPS بدون این بخش وارد کنید.");
  return `https://${url.hostname}/*`;
}

export async function requireSubscriptionAccess(input) {
  const origin = subscriptionOrigin(input);
  if (!await chrome.permissions.contains({ origins: [origin] })) {
    throw new Error("مجوز دریافت این سابسکریپشن داده نشده است؛ از دکمه افزودن یا به‌روزرسانی استفاده کنید.");
  }
}
