# Store listing — 0.7.0

## Name

Xray for Chrome

## Short description — فارسی

مدیریت اتصال Xray در Chrome برای ویندوز و مک؛ نیازمند نصب جداگانه برنامه مکمل و کانفیگ معتبر.

## Short description — English

Manage Xray connections in Chrome on Windows and macOS. Requires a separate companion app and your own valid profile.

## توضیح فارسی

Xray for Chrome به شما امکان می‌دهد کانفیگ‌ها و سابسکریپشن‌های Xray خود را مدیریت و اتصال پروفایل عادی Google Chrome را کنترل کنید.

برای استفاده باید برنامه مکمل مخصوص Windows یا macOS را جداگانه از انتشارهای رسمی پروژه نصب کنید و کانفیگ معتبر یا اشتراک خودتان را داشته باشید. سرور و اشتراک همراه این افزونه ارائه نمی‌شود. راهنمای نصب و دستورهای مخصوص شناسه افزونه داخل تب «آموزش اتصال» قرار دارند.

امکانات:

- فارسی به‌صورت پیش‌فرض، انگلیسی با یک دکمه و ذخیره زبان انتخابی.
- ورود لینک‌های VLESS، VMess AEAD، Shadowsocks و Trojan؛ سازگاری اتصال به نسخه هسته و تنظیمات سرور بستگی دارد.
- دریافت و به‌روزرسانی دستی اشتراک از لینک مستقیم HTTPS، با اجازه دسترسی فقط به دامنه همان اشتراک.
- انتخاب کانفیگ، اتصال و قطع اتصال مرورگر.
- تست HTTPS از مسیر کانفیگ، تست تکی یا همه، حداکثر دو تست هم‌زمان و امکان توقف صف.
- مدیریت کانفیگ‌ها، نمایش وضعیت موتور، گزارش خطا و راهنمای Windows و macOS.

داده‌های کانفیگ و اشتراک محلی ذخیره می‌شوند. تبلیغات یا ارسال آمار استفاده به سازنده وجود ندارد. دریافت اشتراک با ارائه‌دهنده شما، اتصال با سرور انتخابی شما و تست HTTPS با gstatic از مسیر آن سرور ارتباط برقرار می‌کند. نتایج قدیمی پینگ هنگام بازکردن افزونه یا واردکردن کانفیگ خودکار تازه می‌شوند. جزئیات و روش حذف در سیاست حریم خصوصی آمده است.

این افزونه پراکسی کل سیستم یا حالت Incognito نیست. آدرس‌های محلی از پراکسی مستثنا هستند. محدودسازی WebRTC هنگام اتصال در صورت اجازه Chrome اعمال می‌شود. تضمینی برای دسترسی به همه سایت‌ها یا پوشش همه ترافیک دستگاه وجود ندارد.

دریافت برنامه مکمل: https://github.com/pesarakloo/xray-for-chrome/releases
راهنما و پشتیبانی: https://github.com/pesarakloo/xray-for-chrome
وب‌سایت سازنده: https://anisoft.ir

## English description

Xray for Chrome lets you manage your own Xray profiles and subscriptions and control the proxy connection of your regular Google Chrome profile.

You must install the separate Windows or macOS companion app from the project’s official releases and supply your own valid profile or subscription. No server or subscription is included. The in-app Setup guide provides installation commands for the actual ID of your installed extension.

Features:

- Persian by default, with a one-click English switch and saved language preference.
- Import VLESS, VMess AEAD, Shadowsocks and Trojan links. Connection compatibility depends on the core version and server settings.
- Add or manually refresh a subscription using its direct HTTPS URL; grant access only to that subscription’s domain.
- Select a profile and connect or disconnect Chrome.
- Test HTTPS response time through a profile, individually or in a batch, with up to two concurrent tests and queue cancellation.
- Manage profiles, inspect core status and diagnostics, and follow Windows/macOS setup instructions.

Profiles and subscriptions are stored locally. There are no ads or developer analytics. Subscription retrieval contacts your provider; connections use your selected server; HTTPS tests contact gstatic through that server. Stale latency results are refreshed automatically when you open the popup or import profiles. See the privacy policy for data handling and deletion details.

This is not a system-wide proxy and does not cover Incognito. Local addresses bypass the proxy. Non-proxied WebRTC is restricted while connected when Chrome permits it. Access to all websites and coverage of all device traffic are not guaranteed.

Companion download: https://github.com/pesarakloo/xray-for-chrome/releases
Help and support: https://github.com/pesarakloo/xray-for-chrome
Developer website: https://anisoft.ir

## Single purpose

Manage user-provided Xray connection profiles and subscriptions, and connect the regular Chrome profile through a locally installed Xray companion to the user’s selected proxy server.

## Permission justifications

| Permission | Suggested justification |
| --- | --- |
| proxy | Sets a regular-profile SOCKS5 proxy at 127.0.0.1 when the user connects, and clears this extension’s setting on disconnect. Local destinations are bypassed. |
| nativeMessaging | Sends start, stop, status, diagnostics and HTTPS probe requests to the separately installed local companion com.anicloud.xray_chrome. The companion runs Xray on Windows/macOS. |
| storage | Stores user-provided profiles, subscriptions, cached latency results, connection state and language locally. No Chrome Sync or developer telemetry is used. |
| privacy | Sets WebRTC IP handling to disable_non_proxied_udp while connected when Chrome allows it, and clears this extension’s setting on disconnect. |
| Optional HTTPS host access | Requests only the specific subscription host after a direct Add or Refresh click. Needed to fetch the user’s subscription text. No content scripts, page scraping, cookie forwarding or redirect following. Manual profile import does not require host access. |

## Remote code and companion disclosure

All extension JavaScript, styles and translation strings are bundled. The extension does not download or execute remote JavaScript, use eval, inject content scripts or interpret subscription data as code. It uses documented Native Messaging to a separately installed local companion. That installer can download the official Xray executable from XTLS/Xray-core on GitHub; the extension does not install that executable itself. Companion source and installer source are included in the public project release. Disclose this dependency in reviewer notes; do not hide it under a generic “no remote code” statement.

## Data handling notes for the dashboard

Match the dashboard’s current questions to the implementation; do not claim the product handles no user data just because storage is local.

| Data | Actual handling |
| --- | --- |
| Authentication information | Profile passwords/UUIDs and subscription tokens are supplied by users, stored locally, passed to the local companion as needed and used with the user-selected provider. |
| URLs and network destinations | Subscription URLs are stored and requested; proxy destinations and traffic pass through the selected server. The extension does not read Chrome’s history API or store a browsing-history database. |
| Website traffic/content | The companion transports browser network payloads as needed for the proxy feature. The extension does not scrape the DOM or send page contents to the developer. End-to-end HTTPS stays encrypted between browser and destination. |
| Diagnostics and preference | Local core logs may include network/server details; latency timestamps and UI language are local. No automatic log upload. |
| Third parties | User-selected proxy/subscription providers, Google’s gstatic test endpoint, and GitHub during companion/core installation. See PRIVACY.md for scope and deletion. |

## Reviewer instructions

1. Use Google Chrome 116+ on Windows 10/11 or macOS 12+.
2. Download and fully extract the project release from the companion link above.
3. Open Setup guide in this installed extension. Copy the platform’s install command; it contains this extension’s actual ID. Run it from the extracted project root as the current user. Restart Chrome.
4. Import the valid reviewer-only profile supplied privately by the publisher. No functional server credentials are shipped in the public source.
5. Connect, open a test website, then disconnect. Test individual and batch HTTPS latency and toggle the UI between Persian and English.
6. For subscription testing, use the final HTTPS URL; accept only its domain permission. Test denial as well.
7. Remove the companion with the included uninstaller after disconnecting. Remove the extension separately if desired.

Publisher action before submission: supply a valid review-only configuration in the private reviewer field, verify the public companion and privacy links, and attach real screenshots. These credentials and screenshots are not included in this source package.
