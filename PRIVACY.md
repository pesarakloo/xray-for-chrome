# حریم خصوصی — Xray for Chrome

نسخه 0.7.0 · به‌روزرسانی: 2026-09-27

<div dir="rtl">

## هدف و محدوده

Xray for Chrome محصول آنی‌سافت برای مدیریت کانفیگ و سابسکریپشن و تنظیم پراکسی پروفایل عادی Chrome در Windows و macOS است. برنامه مکمل جداگانه روی دستگاه اجرا می‌شود. این پروژه سرویس VPN یا سرور اشتراک ارائه نمی‌کند.

## داده‌های محلی

لینک‌ها و نام کانفیگ‌ها، آدرس و پورت سرورها، اطلاعات احراز هویت مانند UUID و رمز، پارامترهای TLS و انتقال، نشانی و توکن سابسکریپشن، اطلاعات سهمیه دریافتی از ارائه‌دهنده، نتایج و زمان پینگ، وضعیت اتصال و زبان در chrome.storage.local ذخیره می‌شوند. از Chrome Sync استفاده نمی‌شود. برنامه مکمل تنظیمات لازم و اطلاعات احراز هویت را از Native Messaging دریافت می‌کند و کانفیگ اجرا و گزارش‌های خطا را روی دستگاه نگه می‌دارد. این فایل‌ها رمزگذاری اختصاصی برنامه ندارند و اشخاص دارای دسترسی به حساب کاربری دستگاه می‌توانند به آن‌ها دسترسی داشته باشند.

## ارتباط‌های شبکه

اشتراک تنها پس از اقدام افزودن یا به‌روزرسانی و اعطای مجوز دامنه، از لینک مستقیم HTTPS واردشده دریافت می‌شود. ارائه‌دهنده نشانی شبکه و درخواست شامل توکن احتمالی لینک را دریافت می‌کند. هنگام اتصال، ترافیک مرورگر از هسته محلی به سرور انتخابی کاربر می‌رود؛ اپراتور این سرور می‌تواند اطلاعات اتصال و مقصدها و، در ترافیک رمزگذاری‌نشده، محتوا را ببیند. میزان حفاظت به کانفیگ، پروتکل و سرور انتخابی بستگی دارد. افزونه محتوای صفحه، کوکی‌ها یا تاریخچه Chrome را با API مرورگر نمی‌خواند و تاریخچه مرور را برای سازنده ثبت نمی‌کند.

## تست خودکار و دریافت هسته

با بازکردن پنجره افزونه یا افزودن و به‌روزرسانی کانفیگ‌ها، نتایج ثبت‌نشده یا قدیمی‌تر از پنج دقیقه خودکار تست می‌شوند؛ تست دستی و توقف صف نیز وجود دارد. هر تست از مسیر همان کانفیگ به https://www.gstatic.com/generate_204 درخواست می‌فرستد. مقصد تست، نشانی خروجی پراکسی و فراداده معمول درخواست را می‌بیند؛ لینک اشتراک یا رمز کانفیگ برای این مقصد ارسال نمی‌شود. نصب‌کننده جداگانه، هسته Xray را از GitHub و پروژه XTLS/Xray-core دریافت می‌کند؛ GitHub اطلاعات معمول درخواست دانلود را دریافت می‌کند. لینک‌های وب‌سایت، GitHub و تلگرام فقط با انتخاب کاربر باز می‌شوند و تابع سیاست همان خدمات هستند.

## استفاده و اشتراک‌گذاری

در این نسخه کد تبلیغات، تحلیل رفتار یا ارسال خودکار کانفیگ‌ها و گزارش‌ها به آنی‌سافت وجود ندارد. داده‌ها برای مدیریت اتصال، دریافت اشتراک و تست اتصال استفاده می‌شوند و برای تبلیغات، فروش داده یا ارزیابی اعتبار مالی استفاده یا منتقل نمی‌شوند. استفاده از اطلاعات دریافت‌شده از APIهای Google مطابق Chrome Web Store User Data Policy و الزامات Limited Use محدود به قابلیت‌های اعلام‌شده است. سازنده تنها زمانی محتوای ارسالی شما را برای پشتیبانی می‌بیند که خودتان آن را ارسال کنید. قبل از ارسال، رمزها، توکن‌ها و اطلاعات شخصی را حذف کنید.

## مجوزها

proxy برای اعمال و پاک‌کردن پراکسی Chrome؛ nativeMessaging برای ارتباط با برنامه مکمل؛ storage برای داده‌ها و زبان محلی؛ privacy برای محدودسازی WebRTC غیرپراکسی هنگام اتصال. دسترسی اختیاری HTTPS تنها برای دامنه اشتراک در زمان افزودن یا به‌روزرسانی درخواست می‌شود. محتوای دریافتی اشتراک به‌عنوان فهرست کانفیگ پردازش می‌شود و کد JavaScript دانلودشده اجرا نمی‌شود.

## نگهداری و حذف

داده‌ها تا زمان حذف آن‌ها یا افزونه، محلی باقی می‌مانند. در مدیریت می‌توانید کانفیگ یا اشتراک و نتایج وابسته را حذف کنید. حذف پروفایل از افزونه لزوماً نسخه کانفیگ یا گزارش قدیمی روی دیسک برنامه مکمل را پاک نمی‌کند. برای حذف کامل ابتدا اتصال را قطع کنید، برنامه مکمل را با uninstall-windows.cmd یا uninstall.command حذف کنید و سپس افزونه را از chrome://extensions بردارید. حذف افزونه به‌تنهایی برنامه مکمل را حذف نمی‌کند. دسترسی دامنه‌های اشتراک را می‌توانید در تنظیمات دسترسی سایتِ افزونه در Chrome لغو کنید. سیاست نگهداری ارائه‌دهنده پراکسی، اشتراک، Google و GitHub جداگانه اعمال می‌شود.

## تماس و تغییرات

وب‌سایت: https://anisoft.ir — مخزن و پشتیبانی: https://github.com/pesarakloo/xray-for-chrome/issues — کانال: https://t.me/xray_chrome. تغییر رفتار داده‌ها در نسخه جدید باید همراه به‌روزرسانی این سیاست و توضیحات انتشار اعلام شود.

</div>

# Privacy policy — Xray for Chrome

Version 0.7.0 · Updated: 2026-09-27

## Purpose and scope

Xray for Chrome, by Anisoft, manages profiles and subscriptions and configures a proxy for the regular Chrome profile on Windows and macOS. A separate companion app runs locally. This project does not supply a VPN service, servers or subscriptions.

## Local data

Profile links and names, server addresses and ports, credentials such as UUIDs and passwords, TLS and transport settings, subscription URLs and tokens, quota metadata returned by providers, latency results and timestamps, connection state and language are stored in chrome.storage.local. Chrome Sync is not used. The companion receives configuration and credentials through Native Messaging and stores its runtime configuration and error logs on the device. These records do not have application-level encryption; people with access to the operating-system account may access them.

## Network connections

Subscriptions are fetched only when you add or refresh them and grant access to the requested domain, using the direct HTTPS URL you provide. The provider receives the network address and request, including any token in the URL. While connected, browser traffic goes through the local core to your selected proxy server. Its operator may see connection metadata and destinations and, for unencrypted traffic, content. Protection depends on your configuration, protocol and provider. The extension does not read page content, cookies or Chrome history through browser APIs and does not record browsing history for the developer.

## Automatic tests and core downloads

Opening the popup or importing/refreshing profiles automatically tests missing latency results or results older than five minutes. Manual tests and queue cancellation are also available. Each test requests https://www.gstatic.com/generate_204 through that profile. The endpoint sees the proxy exit address and ordinary request metadata; it does not receive your profile password or subscription URL. The separate installer downloads Xray from GitHub’s XTLS/Xray-core project; GitHub receives normal download-request metadata. Website, GitHub and Telegram links open only when selected and are governed by those services’ policies.

## Use and sharing

This version contains no advertising, behavioral analytics or automatic upload of profiles or diagnostics to Anisoft. Data is used for connection management, subscription retrieval and connection testing, and is not used or transferred for advertising, data sales or credit assessment. Use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements, and is limited to the disclosed features. The developer sees support material only when you choose to send it. Remove credentials, tokens and personal information before sharing.

## Permissions

proxy applies and clears Chrome proxy settings; nativeMessaging communicates with the companion; storage holds local data and language; privacy requests a restriction on non-proxied WebRTC while connected. Optional HTTPS access is requested for the subscription domain when adding or refreshing it. Subscription content is parsed as configuration data; downloaded JavaScript is not executed.

## Retention and deletion

Records stay locally until deleted or the extension is removed. Manage lets you delete profiles or subscriptions and their related results. Deleting a profile does not necessarily erase an old runtime configuration or log on the companion’s disk. For full local removal, disconnect, uninstall the companion with uninstall-windows.cmd or uninstall.command, then remove the extension in chrome://extensions. Removing the extension alone does not remove the companion. Revoke subscription-domain access in Chrome’s extension site-access settings. Proxy providers, subscription providers, Google and GitHub have separate retention policies.

## Contact and changes

Website: https://anisoft.ir — Repository and support: https://github.com/pesarakloo/xray-for-chrome/issues — Channel: https://t.me/xray_chrome. Changes to data handling must be accompanied by an updated policy and release information.
