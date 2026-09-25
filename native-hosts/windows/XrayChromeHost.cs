using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Cache;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

namespace XrayChromeHost
{
    internal static class Program
    {
        private const int MaxInputBytes = 16 * 1024 * 1024;
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer
        {
            MaxJsonLength = MaxInputBytes,
            RecursionLimit = 128
        };

        private static readonly string Root = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "XrayChrome");
        private static readonly string XrayExe = Path.Combine(Root, "xray", "xray.exe");
        private static readonly string RuntimeDir = Path.Combine(Root, "runtime");
        private static readonly string LogsDir = Path.Combine(Root, "logs");
        private static readonly string ConfigPath = Path.Combine(RuntimeDir, "config.json");
        private static readonly string StatePath = Path.Combine(RuntimeDir, "state.json");
        private static readonly string ErrorLogPath = Path.Combine(LogsDir, "error.log");

        public static int Main()
        {
            try
            {
                Stream input = Console.OpenStandardInput();
                byte[] lengthBytes = ReadExact(input, 4);
                if (lengthBytes == null) return 0;
                int length = BitConverter.ToInt32(lengthBytes, 0);
                if (length <= 0 || length > MaxInputBytes)
                    throw new InvalidOperationException("اندازه پیام نامعتبر است.");

                byte[] payload = ReadExact(input, length);
                if (payload == null) throw new EndOfStreamException("پیام ناقص دریافت شد.");
                string body = Encoding.UTF8.GetString(payload);
                Dictionary<string, object> request = Json.Deserialize<Dictionary<string, object>>(body);
                Dictionary<string, object> response = Handle(request);
                WriteMessage(response);
                return 0;
            }
            catch (Exception error)
            {
                try { WriteMessage(Fail(CleanError(error))); }
                catch { }
                return 1;
            }
        }

        private static Dictionary<string, object> Handle(Dictionary<string, object> request)
        {
            string action = GetString(request, "action");
            switch (action)
            {
                case "start": return Start(request);
                case "stop": StopOwnedProcess(); return Ok("running", false);
                case "status": return Status();
                case "logs": return Logs();
                case "probe": return Probe(request);
                case "ping":
                    Dictionary<string, object> ping = Ok("hostVersion", "0.3.3");
                    ping["platform"] = "windows";
                    ping["probeVersion"] = 1;
                    return ping;
                default: return Fail("درخواست برنامه همراه شناخته نشد.");
            }
        }

        private static Dictionary<string, object> ProbeResult(string status, int? latencyMs, string error)
        {
            Dictionary<string, object> result = Ok("status", status);
            result["latencyMs"] = latencyMs;
            if (!String.IsNullOrEmpty(error)) result["error"] = error;
            return result;
        }

        private static Dictionary<string, object> Probe(Dictionary<string, object> request)
        {
            if (!File.Exists(XrayExe)) return Fail("هسته Xray نصب نیست؛ نصب‌کننده را دوباره اجرا کنید.");
            object configObject;
            if (!request.TryGetValue("config", out configObject)) return Fail("کانفیگ تست دریافت نشد.");
            Dictionary<string, object> config = configObject as Dictionary<string, object>;
            if (config == null) return Fail("ساختار کانفیگ تست معتبر نیست.");

            string probeDir = Path.Combine(Path.GetTempPath(), "xray-chrome-probe-" + Guid.NewGuid().ToString("N"));
            Process process = null;
            try
            {
                int port;
                TcpListener listener = new TcpListener(IPAddress.Loopback, 0);
                try
                {
                    listener.Start();
                    port = ((IPEndPoint)listener.LocalEndpoint).Port;
                }
                finally { listener.Stop(); }

                Directory.CreateDirectory(probeDir);
                string probePath = Path.Combine(probeDir, "probe.json");
                config["log"] = new Dictionary<string, object> { { "loglevel", "none" } };
                config["inbounds"] = new object[] {
                    new Dictionary<string, object> {
                        { "tag", "latency-http" }, { "listen", "127.0.0.1" }, { "port", port },
                        { "protocol", "http" }, { "settings", new Dictionary<string, object>() }
                    }
                };
                File.WriteAllText(probePath, Json.Serialize(config), new UTF8Encoding(false));
                // Test processes never read or change the active connection's state/config.
                process = Process.Start(new ProcessStartInfo {
                    FileName = XrayExe,
                    Arguments = "run -c \"" + probePath + "\"",
                    WorkingDirectory = Path.GetDirectoryName(XrayExe),
                    UseShellExecute = false, CreateNoWindow = true,
                    RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true
                });
                if (process == null) return ProbeResult("error", null, "اجرای تست پینگ ناموفق بود.");
                process.StandardInput.Close();
                // Drain both pipes so diagnostics cannot block the short-lived test process.
                process.StandardOutput.ReadToEndAsync();
                process.StandardError.ReadToEndAsync();
                if (!WaitForPort(port, 3000) || process.HasExited)
                    return ProbeResult("error", null, "کانفیگ برای تست اجرا نشد؛ تنظیمات آن را بررسی کنید.");

                ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
                HttpWebRequest probe = (HttpWebRequest)WebRequest.Create("https://www.gstatic.com/generate_204");
                probe.Proxy = new WebProxy("http://127.0.0.1:" + port, false);
                probe.Timeout = 8000;
                probe.ReadWriteTimeout = 8000;
                probe.KeepAlive = false;
                probe.AllowAutoRedirect = false;
                probe.CachePolicy = new RequestCachePolicy(RequestCacheLevel.NoCacheNoStore);
                probe.UserAgent = "XrayChromeLatency/0.3.3";
                Stopwatch timer = Stopwatch.StartNew();
                try
                {
                    using (HttpWebResponse response = (HttpWebResponse)probe.GetResponse())
                    {
                        timer.Stop();
                        if (response.StatusCode != HttpStatusCode.NoContent)
                            return ProbeResult("error", null, "مقصد تست پاسخ مورد انتظار را برنگرداند.");
                        return ProbeResult("ok", (int)Math.Max(1, timer.ElapsedMilliseconds), "");
                    }
                }
                finally { probe.Abort(); }
            }
            catch (WebException error)
            {
                if (error.Response != null) error.Response.Close();
                return error.Status == WebExceptionStatus.Timeout
                    ? ProbeResult("timeout", null, "تا ۸ ثانیه پاسخی از مسیر کانفیگ دریافت نشد.")
                    : ProbeResult("error", null, "درخواست HTTPS از مسیر کانفیگ ناموفق بود.");
            }
            catch (Exception)
            {
                return ProbeResult("error", null, "اندازه‌گیری پینگ ناموفق بود؛ کانفیگ و هسته Xray را بررسی کنید.");
            }
            finally
            {
                if (process != null)
                {
                    try { if (!process.HasExited) process.Kill(); process.WaitForExit(2000); } catch { }
                    process.Dispose();
                }
                try { if (Directory.Exists(probeDir)) Directory.Delete(probeDir, true); } catch { }
            }
        }

        private static Dictionary<string, object> Start(Dictionary<string, object> request)
        {
            if (!File.Exists(XrayExe))
                return Fail("xray.exe نصب نشده است؛ install.ps1 را دوباره اجرا کنید.");
            object configObject;
            if (!request.TryGetValue("config", out configObject) || configObject == null)
                return Fail("کانفیگ Xray دریافت نشد.");

            int port = GetInt(request, "port", 10808);
            if (port < 1024 || port > 65535) return Fail("پورت محلی معتبر نیست.");

            Directory.CreateDirectory(RuntimeDir);
            Directory.CreateDirectory(LogsDir);
            StopOwnedProcess();

            Dictionary<string, object> config = configObject as Dictionary<string, object>;
            if (config == null) return Fail("ساختار کانفیگ Xray معتبر نیست.");
            config["log"] = new Dictionary<string, object>
            {
                { "loglevel", "warning" },
                { "error", ErrorLogPath.Replace("\\", "/") }
            };
            File.WriteAllText(ConfigPath, Json.Serialize(config), new UTF8Encoding(false));

            string testError = ValidateConfig();
            if (!String.IsNullOrEmpty(testError)) return Fail("کانفیگ توسط Xray رد شد: " + testError);

            Process process = StartDetachedXray();
            Thread.Sleep(850);
            if (process.HasExited)
                return Fail("Xray بلافاصله متوقف شد. گزارش خطا را بررسی کنید.");

            Dictionary<string, object> processState = new Dictionary<string, object>
            {
                { "pid", process.Id },
                { "startTicks", process.StartTime.ToUniversalTime().Ticks },
                { "port", port },
                { "xrayExe", XrayExe }
            };
            File.WriteAllText(StatePath, Json.Serialize(processState), new UTF8Encoding(false));

            if (!WaitForPort(port, 4500))
            {
                StopOwnedProcess();
                return Fail("Xray اجرا شد اما پراکسی محلی در دسترس قرار نگرفت.");
            }
            Dictionary<string, object> result = Ok("running", true);
            result["pid"] = process.Id;
            result["port"] = port;
            result["version"] = GetVersion();
            return result;
        }

        private static Process StartDetachedXray()
        {
            ProcessStartInfo info = new ProcessStartInfo
            {
                FileName = XrayExe,
                Arguments = "run -c \"" + ConfigPath + "\"",
                WorkingDirectory = Path.GetDirectoryName(XrayExe),
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };

            Process process = Process.Start(info);
            if (process == null)
                throw new InvalidOperationException("Xray process could not be started.");

            return process;
        }

        private static string ValidateConfig()
        {
            ProcessStartInfo info = new ProcessStartInfo
            {
                FileName = XrayExe,
                Arguments = "run -test -c \"" + ConfigPath + "\"",
                WorkingDirectory = Path.GetDirectoryName(XrayExe),
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
            using (Process process = Process.Start(info))
            {
                if (process == null) return "فرایند اعتبارسنجی اجرا نشد.";
                Task<string> output = process.StandardOutput.ReadToEndAsync();
                Task<string> error = process.StandardError.ReadToEndAsync();
                if (!process.WaitForExit(15000))
                {
                    try { process.Kill(); } catch { }
                    return "زمان اعتبارسنجی به پایان رسید.";
                }
                Task.WaitAll(new Task[] { output, error }, 2000);
                if (process.ExitCode == 0) return "";
                return Limit((error.Result + " " + output.Result).Trim(), 900);
            }
        }

        private static Dictionary<string, object> Status()
        {
            Dictionary<string, object> state;
            Process process;
            bool running = TryGetOwnedProcess(out state, out process);
            Dictionary<string, object> result = Ok("running", running);
            result["version"] = File.Exists(XrayExe) ? GetVersion() : "Xray نصب نیست";
            if (running)
            {
                result["pid"] = process.Id;
                result["port"] = state.ContainsKey("port") ? state["port"] : 10808;
            }
            return result;
        }

        private static Dictionary<string, object> Logs()
        {
            string content = ReadTail(ErrorLogPath, 65536);
            Dictionary<string, object> result = Ok("logs", content);
            result["running"] = IsRunning();
            return result;
        }

        private static void StopOwnedProcess()
        {
            Dictionary<string, object> state;
            Process process;
            if (TryGetOwnedProcess(out state, out process))
            {
                try
                {
                    process.Kill();
                    process.WaitForExit(3000);
                }
                catch { }
            }
            try { if (File.Exists(StatePath)) File.Delete(StatePath); }
            catch { }
        }

        private static bool IsRunning()
        {
            Dictionary<string, object> state;
            Process process;
            return TryGetOwnedProcess(out state, out process);
        }

        private static bool TryGetOwnedProcess(out Dictionary<string, object> state, out Process process)
        {
            state = null;
            process = null;
            try
            {
                if (!File.Exists(StatePath)) return false;
                state = Json.Deserialize<Dictionary<string, object>>(File.ReadAllText(StatePath, Encoding.UTF8));
                int pid = Convert.ToInt32(state["pid"]);
                long expectedTicks = Convert.ToInt64(state["startTicks"]);
                process = Process.GetProcessById(pid);
                if (process.HasExited || !process.ProcessName.Equals("xray", StringComparison.OrdinalIgnoreCase)) return false;
                long actualTicks = process.StartTime.ToUniversalTime().Ticks;
                return Math.Abs(actualTicks - expectedTicks) < TimeSpan.FromSeconds(3).Ticks;
            }
            catch { return false; }
        }

        private static bool WaitForPort(int port, int timeoutMs)
        {
            Stopwatch timer = Stopwatch.StartNew();
            while (timer.ElapsedMilliseconds < timeoutMs)
            {
                try
                {
                    using (TcpClient client = new TcpClient())
                    {
                        IAsyncResult attempt = client.BeginConnect("127.0.0.1", port, null, null);
                        if (attempt.AsyncWaitHandle.WaitOne(250) && client.Connected)
                        {
                            client.EndConnect(attempt);
                            return true;
                        }
                    }
                }
                catch { }
                Thread.Sleep(120);
            }
            return false;
        }

        private static string GetVersion()
        {
            try
            {
                ProcessStartInfo info = new ProcessStartInfo
                {
                    FileName = XrayExe,
                    Arguments = "version",
                    WorkingDirectory = Path.GetDirectoryName(XrayExe),
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };
                using (Process process = Process.Start(info))
                {
                    if (process == null) return "Xray";
                    string output = process.StandardOutput.ReadLine();
                    if (!process.WaitForExit(4000)) try { process.Kill(); } catch { }
                    return String.IsNullOrWhiteSpace(output) ? "Xray" : output.Trim();
                }
            }
            catch { return "Xray"; }
        }

        private static string ReadTail(string path, int maxBytes)
        {
            if (!File.Exists(path)) return "";
            try
            {
                using (FileStream stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                {
                    long start = Math.Max(0, stream.Length - maxBytes);
                    stream.Seek(start, SeekOrigin.Begin);
                    byte[] buffer = new byte[(int)(stream.Length - start)];
                    int read = stream.Read(buffer, 0, buffer.Length);
                    string text = Encoding.UTF8.GetString(buffer, 0, read);
                    if (start > 0)
                    {
                        int newline = text.IndexOf('\n');
                        if (newline >= 0) text = text.Substring(newline + 1);
                    }
                    return text;
                }
            }
            catch (Exception error) { return "خواندن گزارش ممکن نشد: " + error.Message; }
        }

        private static byte[] ReadExact(Stream stream, int count)
        {
            byte[] result = new byte[count];
            int offset = 0;
            while (offset < count)
            {
                int read = stream.Read(result, offset, count - offset);
                if (read == 0) return null;
                offset += read;
            }
            return result;
        }

        private static void WriteMessage(Dictionary<string, object> response)
        {
            byte[] payload = Encoding.UTF8.GetBytes(Json.Serialize(response));
            byte[] length = BitConverter.GetBytes(payload.Length);
            Stream output = Console.OpenStandardOutput();
            output.Write(length, 0, length.Length);
            output.Write(payload, 0, payload.Length);
            output.Flush();
        }

        private static string GetString(Dictionary<string, object> dictionary, string key)
        {
            object value;
            return dictionary.TryGetValue(key, out value) && value != null ? Convert.ToString(value) : "";
        }

        private static int GetInt(Dictionary<string, object> dictionary, string key, int fallback)
        {
            object value;
            if (!dictionary.TryGetValue(key, out value) || value == null) return fallback;
            try { return Convert.ToInt32(value); }
            catch { return fallback; }
        }

        private static Dictionary<string, object> Ok(string key, object value)
        {
            return new Dictionary<string, object> { { "ok", true }, { key, value } };
        }

        private static Dictionary<string, object> Fail(string message)
        {
            return new Dictionary<string, object> { { "ok", false }, { "error", Limit(message, 1200) } };
        }

        private static string CleanError(Exception error)
        {
            return error is UnauthorizedAccessException
                ? "دسترسی لازم برای اجرای برنامه همراه وجود ندارد."
                : error.Message;
        }

        private static string Limit(string value, int max)
        {
            if (String.IsNullOrEmpty(value) || value.Length <= max) return value;
            return value.Substring(0, max) + "…";
        }
    }
}
