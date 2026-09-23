"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { claimQrToken, SubmitRegistrationResponse } from "@/services/registrationService";
import RegistrationForm, { RegistrationFormData } from "@/components/registration/RegistrationForm";
import RegistrationSuccess from "@/components/registration/RegistrationSuccess";
import { QrCode, AlertTriangle, Loader2, Sparkles } from "lucide-react";

function RegisterContent() {
  const searchParams = useSearchParams();
  const rawToken = searchParams.get("token");

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    result: SubmitRegistrationResponse;
    formData: RegistrationFormData;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function executeClaim(tokenToClaim: string) {
      try {
        setClaiming(true);
        setClaimError(null);

        const res = await claimQrToken(tokenToClaim);
        if (active) {
          setSessionToken(res.session_token);

          // Security requirement: Remove the raw token from the visible URL immediately
          if (typeof window !== "undefined") {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      } catch (err: unknown) {
        if (active) {
          setClaimError(
            err instanceof Error ? err.message : "تعذر التحقق من رمز الـ QR."
          );
        }
      } finally {
        if (active) {
          setClaiming(false);
        }
      }
    }

    if (rawToken) {
      executeClaim(rawToken);
    }

    return () => {
      active = false;
    };
  }, [rawToken]);

  const hasNoToken = !rawToken && !sessionToken && !claiming && !submissionSuccess;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-between p-4 sm:p-8">
      {/* Top Header */}
      <header className="w-full max-w-2xl flex items-center justify-between py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center font-bold text-slate-950 shadow-md shadow-amber-500/10">
            VIP
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              VIP ACADEMY
            </h1>
            <p className="text-[11px] text-slate-500">نظام تسجيل الطلاب</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>جلسة تسجيل فورية</span>
        </div>
      </header>

      {/* Main Content Flow */}
      <main className="flex-1 flex flex-col items-center justify-center w-full my-8">
        {claiming ? (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
              جاري التحقق من رمز الدخول وتأمين الجلسة...
            </h2>
            <p className="text-xs text-slate-400 mt-1">يرجى الانتظار لبضع ثوانٍ</p>
          </div>
        ) : claimError || hasNoToken ? (
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4 text-rose-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              تعذر بدء جلسة التسجيل
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              {claimError || "لم يتم العثور على رمز تسجيل صالح. يرجى مسح رمز الـ QR من شاشة الأكاديمية."}
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs text-slate-500 mb-6 flex items-center gap-2 text-right">
              <QrCode className="w-5 h-5 text-amber-500 shrink-0" />
              <span>تأكد من مسح الرمز المحدث المعروض حالياً على الشاشة داخل الأكاديمية.</span>
            </div>
          </div>
        ) : submissionSuccess ? (
          <RegistrationSuccess
            fullName={submissionSuccess.formData.fullName}
            totalAmount={submissionSuccess.result.total_amount}
            subjectCount={submissionSuccess.formData.subjectIds.length}
          />
        ) : sessionToken ? (
          <RegistrationForm
            sessionToken={sessionToken}
            onSuccess={(result, formData) => setSubmissionSuccess({ result, formData })}
            onSessionExpired={(msg) => setClaimError(msg)}
          />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-2xl text-center border-t border-slate-200 dark:border-slate-800/60 pt-4 text-xs text-slate-400">
        VIP Academy &copy; {new Date().getFullYear()} — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
