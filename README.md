# Xray for Chrome — Windows + macOS

یک افزونه‌ی مشترک Chrome با دو برنامه‌ی همراه مستقل است. افزونه در هر دو سیستم دقیقاً یکسان است؛ برنامه‌ی همراه Windows و macOS جداگانه نصب می‌شود. پراکسی فقط در تنظیمات خود Chrome فعال می‌شود و تنظیمات شبکه‌ی کل سیستم را تغییر نمی‌دهد.

## ساختار بسته

```text
extension/                    افزونه مشترک Chrome Manifest V3
native-hosts/windows/         برنامه همراه و نصب‌کننده Windows
native-hosts/macos/           برنامه همراه و نصب‌کننده macOS
tests/                        تست‌های Parser، کانفیگ و ساختار بسته
```

## امکانات نسخه 0.3.9

- تب «درباره ما» با لینک [گیت‌هاب](https://github.com/pesarakloo) و [کانال تلگرام](https://t.me/xray_chrome)
- نمایش پینگ هر کانفیگ در فهرست مدیریت، منوی انتخاب و صفحه اتصال
- تست پینگ تکی و گروهی، نمایش پیشرفت و توقف صف تست
- VLESS، VMess AEAD، Shadowsocks و Trojan
- افزودن یک یا چند لینک کانفیگ
- افزودن، به‌روزرسانی و حذف Subscription
- RAW/TCP، WebSocket، gRPC، HTTPUpgrade، XHTTP و mKCP
- متغیرهای لینک 3x-ui برای TLS، REALITY، XHTTP، FinalMask و mKCP
- TLS و REALITY با ساختار فعلی Xray (`method` و فیلد `password` در REALITY)
- رابط فارسی یکسان در Windows و macOS
- SOCKS5 محلی فقط روی `127.0.0.1:10808`
- اعمال پراکسی فقط روی Google Chrome
- محدودکردن UDP غیرپراکسی WebRTC هنگام اتصال
- اعتبارسنجی کانفیگ با `xray run -test`
- گزارش خطای Xray داخل افزونه
- نصب در سطح کاربر بدون تغییر پراکسی سیستم‌عامل

شناسه‌ی ثابت افزونه در هر دو سیستم:

```text
kcefgbldpcaoicjpdcmilahhlcbcflpj
```

## نصب روی Windows

پیش‌نیازها: Windows 10/11، Chrome 116 یا جدیدتر و .NET Framework 4.8.

در PowerShell و از پوشه‌ی اصلی پروژه اجرا کنید:

```powershell
powershell -ExecutionPolicy Bypass -File .\native-hosts\windows\install.ps1
```

برای ارتقا از نسخه قبلی نیز همین دستور را دوباره اجرا کنید. نصب‌کننده Host قدیمی را جایگزین و Xray درحال‌اجرا را به‌شکل امن متوقف می‌کند.

اگر Xray از قبل نصب است، برای به‌روزرسانی برنامه همراه بدون دانلود دوبارهٔ هسته:

```powershell
powershell -ExecutionPolicy Bypass -File .\native-hosts\windows\install.ps1 -SkipDownload
```

اگر GitHub در دسترس نبود و `xray.exe` را دارید:

```powershell
powershell -ExecutionPolicy Bypass -File .\native-hosts\windows\install.ps1 -XrayExe "C:\Path\To\xray.exe"
```

حذف برنامه همراه Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\native-hosts\windows\uninstall.ps1
```

## نصب روی macOS

پیش‌نیازها: macOS 12 یا جدیدتر و Google Chrome. این نسخه به Xcode یا Command Line Tools نیاز ندارد؛ نصب‌کننده فقط بسته‌ی Xray مناسب دستگاه را دانلود می‌کند (معمولاً حدود چند ده مگابایت).

در Terminal و از پوشه‌ی اصلی پروژه اجرا کنید:

```bash
chmod +x ./native-hosts/macos/install.command
./native-hosts/macos/install.command
```

نصب‌کننده معماری را خودکار تشخیص می‌دهد:

- Macهای M1/M2/M3/M4: `Xray-macos-arm64-v8a.zip`
- Macهای Intel: `Xray-macos-64.zip`

اگر Xray را قبلاً دانلود کرده‌اید:

```bash
./native-hosts/macos/install.command --xray "/path/to/xray"
```

اگر Terminal اکنون داخل پوشه‌ی `extension` است، به‌جای دستور بالا از مسیر یک سطح بالاتر استفاده کنید:

```bash
chmod +x ../native-hosts/macos/install.command
../native-hosts/macos/install.command
```

برنامه‌ی همراه macOS با ابزارهای داخلی خود سیستم (`zsh`، `plutil` و `osascript`) اجرا می‌شود و مرحله‌ی کامپایل ندارد.

حذف برنامه همراه macOS:

```bash
chmod +x ./native-hosts/macos/uninstall.command
./native-hosts/macos/uninstall.command
```

## بارگذاری افزونه؛ در هر دو سیستم یکسان

1. Google Chrome را باز کنید و وارد `chrome://extensions` شوید.
2. گزینه‌ی **Developer mode** را روشن کنید.
3. روی **Load unpacked** بزنید.
4. پوشه‌ی `extension` را انتخاب کنید.
5. Chrome را کاملاً ببندید و دوباره باز کنید.
6. لینک کانفیگ یا Subscription را از تب «افزودن» وارد کنید.

اگر Extension ID با مقدار درج‌شده در بالا متفاوت بود، Chrome کلید `manifest.json` را نپذیرفته یا فایل تغییر کرده است؛ در این حالت برنامه‌ی همراه عمداً اتصال افزونه را رد می‌کند.

## روش کار

1. افزونه لینک را Parse و کانفیگ Xray را تولید می‌کند.
2. Native Host مخصوص سیستم‌عامل کانفیگ را اعتبارسنجی می‌کند.
3. Xray فقط روی Loopback اجرا می‌شود.
4. افزونه Chrome را روی SOCKS5 محلی تنظیم می‌کند.
5. در Windows پردازش Xray مستقل از عمر کوتاه Native Messaging اجرا می‌شود و هنگام قطع اتصال به‌کمک PID ثبت‌شده متوقف می‌شود.
6. هنگام قطع اتصال، پراکسی Chrome پاک و پردازش Xray متوقف می‌شود.

## پینگ کانفیگ‌ها

- پس از بازکردن افزونه یا افزودن کانفیگ، نتیجه‌های ثبت‌نشده یا قدیمی‌تر از ۵ دقیقه خودکار تست می‌شوند. دکمه «تست پینگ» یا «پینگ همه» تست تازه را اجرا می‌کند.
- عدد `ms` زمان پاسخ یک درخواست HTTPS به `https://www.gstatic.com/generate_204` از مسیر همان کانفیگ است؛ شامل برقراری تونل و TLS می‌شود و پینگ ICMP نیست. زمان راه‌اندازی Xray در عدد محاسبه نمی‌شود.
- برای هر تست، یک Xray موقت روی پورت محلی جداگانه اجرا می‌شود. پراکسی Chrome و اتصال فعال تغییر نمی‌کنند. حداکثر دو کانفیگ هم‌زمان تست می‌شوند.
- فقط پاسخ HTTPS معتبر با وضعیت 204 موفق محسوب می‌شود. مهلت درخواست ۸ ثانیه است. «بی‌پاسخ» یا «خطا» می‌تواند به کانفیگ، شبکه یا دسترسی به مقصد تست مربوط باشد.
- نتیجه‌ها با زمان آخرین تست ذخیره می‌شوند؛ قرارگرفتن نشانگر روی پینگ جزئیات را نشان می‌دهد. بستن پنجره افزونه صف جاری را متوقف نمی‌کند. «توقف تست» موارد در صف را لغو می‌کند و تست‌های جاری ظرف مهلت خود تمام می‌شوند.
- **برای فعال‌شدن پینگ پس از ارتقا، نصب‌کنندهٔ برنامه همراه Windows یا macOS همین بسته را دوباره اجرا کنید** و افزونه را در `chrome://extensions` با Reload به‌روز کنید. حذف افزونه لازم نیست؛ شناسه و کانفیگ‌های ذخیره‌شده حفظ شده‌اند.

## مسیر فایل‌های نصب‌شده

Windows:

```text
%LOCALAPPDATA%\XrayChrome
```

macOS:

```text
~/Library/Application Support/XrayChrome
```

Manifest برنامه همراه macOS:

```text
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.anicloud.xray_chrome.json
```

## حریم خصوصی و امنیت

- Telemetry وجود ندارد.
- اطلاعات کانفیگ و Subscription در `chrome.storage.local` ذخیره می‌شود.
- Native Host فقط افزونه با شناسه‌ی ثابت پروژه را می‌پذیرد.
- Xray فقط روی `127.0.0.1` گوش می‌دهد و برای شبکه محلی قابل دسترسی نیست.
- نصب‌کننده‌ها Xray را از مخزن رسمی `XTLS/Xray-core` می‌گیرند.
- در صورت وجود digest رسمی GitHub، SHA-256 پیش از نصب بررسی می‌شود.
- هیچ فرمان Shell از کانفیگ کاربر ساخته یا اجرا نمی‌شود.

## محدودیت‌ها

- Clash YAML و sing-box JSON هنوز وارد نمی‌شوند؛ Subscription باید فهرست URI ساده یا Base64 آن باشد.
- VMess قدیمی با `alterId` غیرصفر پشتیبانی نمی‌شود.
- از پلاگین‌های Shadowsocks فقط `obfs-local;obfs=http` قابل تبدیل به RAW HTTP است؛ `v2ray-plugin` پشتیبانی نمی‌شود.
- نسخه فعلی فقط پروفایل عادی Chrome را تنظیم می‌کند، نه Incognito.
- برای انتشار در Chrome Web Store، امضا و توزیع جداگانه‌ی برنامه‌های همراه لازم است.

## تست توسعه

با Node.js 20 یا جدیدتر:

```bash
npm test
npm run check
```

این تست‌ها Parser لینک‌ها، تولید کانفیگ Xray، اتصال Loopback، شناسه ثابت افزونه، تفکیک Hostها و انتخاب معماری macOS را بررسی می‌کنند.

تست‌های پینگ نیز صف دو‌تایی، ذخیره نتایج، کش، توقف صف، خطا/Timeout و حذف یا تغییر کانفیگ هنگام تست را با پاسخ‌های شبیه‌سازی‌شده بررسی می‌کنند. تست زنده Native Host به Windows یا macOS و کانفیگ قابل‌اتصال نیاز دارد.

## عیب‌یابی

- **برنامه همراه پیدا نشد:** نصب‌کننده‌ی سیستم‌عامل را دوباره اجرا و Chrome را Restart کنید.
- **پراکسی توسط افزونه دیگری کنترل می‌شود:** افزونه‌های Proxy/VPN دیگر را موقتاً غیرفعال کنید.
- **کانفیگ توسط Xray رد شد:** گزارش خطای افزونه را باز کنید.
- **Xray در Windows بلافاصله متوقف می‌شود:** نسخه 0.3.0 را نصب و `install.ps1` را دوباره اجرا کنید؛ Host جدید Xray را مستقل از پردازش Chrome ایجاد می‌کند.
- **دانلود Xray انجام نمی‌شود:** فایل Xray مناسب سیستم‌عامل را جداگانه دانلود و مسیر آن را به نصب‌کننده بدهید.
- **VMess وصل نمی‌شود:** ساعت سیستم باید دقیق و `alterId` برابر صفر باشد.
