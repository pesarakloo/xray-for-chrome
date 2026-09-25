# تغییرات

## 0.3.3 — 2026-09-24

- افزودن تب «درباره ما» با لینک‌های github.com/pesarakloo و t.me/xray_chrome
- حفظ تم تیره، رنگ‌بندی و کارت‌های رابط فارسی
- نمایش پینگ HTTPS هر کانفیگ در فهرست مدیریت، منوی انتخاب و صفحه اتصال
- تست تکی و گروهی با حداکثر دو اجرای هم‌زمان، توقف صف و ذخیره زمان آخرین نتیجه
- اندازه‌گیری مستقل از اتصال فعال با Xray موقت روی پورت Loopback جدا در Windows و macOS
- مدیریت Timeout، کانفیگ نامعتبر، حذف پروفایل حین تست و برنامه همراه قدیمی
- هماهنگ‌کردن نسخه افزونه، بسته و برنامه‌های همراه و اصلاح مجوز اجرای فایل‌های macOS
- به‌روزرسانی تست قدیمی WMI برای هماهنگی با اجرای مستقیم موجود در بسته ارسالی

برای فعال‌شدن پینگ، برنامه همراه این بسته باید دوباره نصب و افزونه Reload شود.

## 0.3.0 — 2026-09-24

- جلوگیری از بسته‌شدن Xray در Windows پس از پایان پیام Native Messaging با اجرای مستقل از طریق WMI
- پشتیبانی متغیرهای share link در 3x-ui برای XHTTP، TLS، REALITY، FinalMask و mKCP
- تبدیل `headerType` و `seed` قدیمی mKCP به `finalmask.udp` از نوع `mkcp-legacy`
- پشتیبانی `obfs-local;obfs=http` در لینک Shadowsocks
- سازگاری با نحو فعلی Xray: `streamSettings.method`، تنظیمات مستقیم outbound و `realitySettings.password`
- اعتبارسنجی ترکیب REALITY/transport و حالت XHTTP پیش از اجرای هسته
- افزودن تست‌های VMess gRPC، XHTTP، FinalMask، TLS پیشرفته و lifecycle ویندوز

## 0.2.1 — 2026-09-24

- رفع خطای Parse نصب‌کننده در Windows PowerShell 5.1 با حذف وابستگی متن اسکریپت به کدگذاری فارسی
- مشخص‌کردن UTF-8 برای کامپایل برنامه همراه Windows
- حذف کامل وابستگی macOS به Xcode، Swift و Command Line Tools
- برنامه همراه سبک macOS بر پایه ابزارهای داخلی سیستم
- دانلود فقط بسته Xray متناسب با Apple Silicon یا Intel

## 0.2.0 — 2026-09-24

- یک افزونه‌ی مشترک برای Windows و macOS
- تفکیک کامل برنامه‌های همراه در `native-hosts/windows` و `native-hosts/macos`
- Native Host بومی macOS با Swift
- نصب خودکار Xray برای Apple Silicon و Intel
- ثبت Native Messaging در مسیر کاربر Google Chrome روی macOS
- بررسی SHA-256 بسته Xray در صورت ارائه digest رسمی
- نصب و حذف مستقل برای هر سیستم‌عامل

## 0.1.0 — 2026-09-24

- نسخه‌ی اولیه Windows
- افزونه Chrome Manifest V3 با رابط فارسی
- پشتیبانی VLESS، VMess AEAD، Shadowsocks و Trojan
- پشتیبانی Subscription و مدیریت کانفیگ
- برنامه‌ی همراه Native Messaging برای اجرای Xray
- پراکسی محدود به Chrome و Loopback
- محدودسازی WebRTC و گزارش خطا
- نصب‌کننده‌ی بدون نیاز به Administrator

## 0.3.1
- Removed WMI process creation on Windows.
- Updated Windows host process startup.
- Parser/config updates retained.
