"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Sparkles, RefreshCw, AlertTriangle, ShieldCheck, Clock, KeyRound, Loader2, LogOut } from "lucide-react";
import { fetchCurrentDisplayQR, logoutDisplayQR, DisplayQRResponse } from "@/services/displayService";

// How long (seconds) the QR is displayed on screen before requesting a new one.
// Must match v_display_seconds in the SQL function get_or_create_active_qr_token.
const DISPLAY_WINDOW_SECONDS = 15;

export default function QRDisplay() {
  const [qrData, setQrData] = useState<DisplayQRResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [savedSecret, setSavedSecret] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(DISPLAY_WINDOW_SECONDS);
  const [loggingOut, setLoggingOut] = useState(false);

  const isFetchingRef = useRef(false);
  const isLoggingOutRef = useRef(false);

  const fetchQR = useCallback(async (secretToUse?: string) => {
    if (isFetchingRef.current || isLoggingOutRef.current) {
      console.log("[QRDisplay] fetchQR skipped — already fetching or logging out");
      return;
    }
    isFetchingRef.current = true;
    const effectiveSecret = secretToUse ?? savedSecret;
    console.log("[QRDisplay] fetchQR called, hasSecret:", !!effectiveSecret);

    try {
      const data = await fetchCurrentDisplayQR(effectiveSecret);
      if (isLoggingOutRef.current) {
        console.log("[QRDisplay] fetchQR ignored — logout occurred during request");
        return;
      }
      if (data?.reused) {
        // Token is still within its 15-second display window.
        // The DB did not issue a new raw_token, so keep the current QR on screen.
        console.log("[QRDisplay] fetchQR — DB returned reused=true, keeping current QR");
        setError(null);
        setNeedsAuth(false);
        // Do NOT reset countdown; let the timer keep ticking normally.
        return;
      }
      console.log("[QRDisplay] fetchQR success — new raw_token received");
      setQrData(data);
      setError(null);
      setNeedsAuth(false);
      setCountdown(DISPLAY_WINDOW_SECONDS);
    } catch (err: unknown) {
      if (isLoggingOutRef.current) return;
      const msg = err instanceof Error ? err.message : "تعذر تحميل رمز الاستجابة السريعة";
      console.error("[QRDisplay] fetchQR error:", msg);
      if (msg.includes("401") || msg.includes("غير مصرح")) {
        setNeedsAuth(true);
        setQrData(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
      console.log("[QRDisplay] fetchQR complete — loading cleared");
    }
  }, [savedSecret]);

  // Combined 10-Second Countdown and Rotation Timer
  useEffect(() => {
    let mounted = true;

    if (needsAuth) {
      console.log("[QRDisplay] Effect skipped — needsAuth=true");
      return;
    }

    console.log("[QRDisplay] Effect running — starting initial fetch and timer");

    // Perform initial fetch asynchronously to avoid synchronous setState in effect
    const initialFetch = async () => {
      if (mounted && !isLoggingOutRef.current && !needsAuth) {
        await fetchQR();
      }
    };
    initialFetch();

    const timer = setInterval(() => {
      if (!mounted || isLoggingOutRef.current || needsAuth) return;
      setCountdown((prev) => {
        if (prev <= 1) {
          // Time to request a new QR from the display handler.
          // The DB will decide whether to rotate or reuse.
          fetchQR();
          return DISPLAY_WINDOW_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(timer);
      console.log("[QRDisplay] Effect cleanup — timer cleared");
    };
  }, [needsAuth, fetchQR]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretInput.trim()) return;
    const secret = secretInput.trim();
    console.log("[QRDisplay] Unlocking display with provided secret");
    setSavedSecret(secret);
    setLoading(true);
    fetchQR(secret);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      isLoggingOutRef.current = true;
      await logoutDisplayQR();

      // Clear all display states immediately upon successful logout
      setQrData(null);
      setSavedSecret("");
      setSecretInput("");
      setError(null);
      setNeedsAuth(true);
      setCountdown(DISPLAY_WINDOW_SECONDS);
      console.log("[QRDisplay] Logged out successfully — polling stopped and auth required");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "فشل تسجيل الخروج. يرجى المحاولة مرة أخرى.";
      console.error("[QRDisplay] Logout error:", msg);
      setError(msg);
    } finally {
      isLoggingOutRef.current = false;
      setLoggingOut(false);
    }
  };

  // Build registration URL from NEXT_PUBLIC_APP_URL env or current origin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const origin = (typeof window !== "undefined" ? window.location.origin : appUrl);
  const registrationUrl = qrData?.raw_token
    ? `${origin}/register?token=${qrData.raw_token}`
    : "";

  if (registrationUrl) {
    console.log("[QRDisplay] Registration URL:", registrationUrl.replace(/token=.+/, "token=***"));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-6 sm:p-10 selection:bg-amber-500 selection:text-white">
      {/* Header Branding */}
      <header className="w-full max-w-5xl flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-2xl">
            VIP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                VIP ACADEMY
              </h1>
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                Medical Center
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              نظام تسجيل الطلاب والمحاضرات الإلكترونية
            </p>
          </div>
        </div>

        {/* Status & Actions Badge */}
        <div className="flex items-center gap-3">
          {/* Live Status Badge */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
            needsAuth
              ? "bg-amber-950/60 border border-amber-800/60 text-amber-400"
              : "bg-emerald-950/60 border border-emerald-800/60 text-emerald-400"
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${needsAuth ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`}></span>
            <span>{needsAuth ? "شاشة العرض مغلقة" : "شاشة العرض متصلة"}</span>
          </div>

          {/* Logout / Lock Button */}
          {!needsAuth && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 hover:border-rose-700 text-rose-400 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="تسجيل الخروج وقفل شاشة العرض"
            >
              {loggingOut ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري تسجيل الخروج...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Display Area */}
      <main className="flex-1 flex flex-col items-center justify-center my-8 w-full max-w-2xl text-center">
        {/* Auth Required View */}
        {needsAuth ? (
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">تفعيل شاشة الاستقبال</h2>
            <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
              يرجى إدخال كلمة سر شاشة العرض (QR Display Secret) للبدء في توليد الرموز التلقائية.
            </p>
            <form onSubmit={handleUnlock} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="password"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder="أدخل الرمز السري لشاشة العرض..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                تفعيل
              </button>
            </form>
          </div>
        ) : loading && !qrData ? (
          /* Loading View */
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4"></div>
            <p className="text-base text-slate-300 font-medium">جاري تجهيز رمز الاستجابة السريعة...</p>
          </div>
        ) : error ? (
          /* Error View */
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-3xl p-8 max-w-md">
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-1">تعذر الاتصال</h2>
            <p className="text-sm text-rose-200/80 mb-6">{error}</p>
            <button
              onClick={() => fetchQR()}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
        ) : (
          /* Active QR Display View */
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            {/* Instruction Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 border border-amber-500/30 text-amber-300 text-sm sm:text-base font-bold mb-6">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>امسح الكود بكاميرا الهاتف لبدء التسجيل</span>
            </div>

            {/* QR Card */}
            <div className="relative p-7 bg-white rounded-3xl shadow-2xl shadow-amber-500/10 border-4 border-slate-800/80 flex items-center justify-center transition-transform hover:scale-[1.01]">
              <div className="p-3 bg-white rounded-2xl">
                {registrationUrl ? (
                  <QRCodeSVG
                    value={registrationUrl}
                    size={320}
                    level="Q"
                    includeMargin={false}
                    className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]"
                  />
                ) : (
                  <div className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] flex items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Details & MM:SS Countdown */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-slate-400">
              <div className="flex items-center gap-2 bg-slate-900/90 px-4 py-2 rounded-2xl border border-slate-800 shadow-inner">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>يتجدد الرمز خلال:</span>
                <span className="font-mono font-black text-sm text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20 min-w-[42px] text-center">
                  {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>رمز آمن للاستخدام لمرة واحدة</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-5xl text-center border-t border-slate-900 pt-6">
        <p className="text-xs text-slate-500">
          VIP Academy &copy; {new Date().getFullYear()} — يتجدد الرمز كل 15 ثانيه تلقائياً، ويبقى صالحاً لمدة 3 دقائق إضافية بعد التجديد لضمان اكتمال التسجيل.
        </p>
      </footer>
    </div>
  );
}

