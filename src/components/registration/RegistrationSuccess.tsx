"use client";

import {
  CheckCircle2,
  Award,
  Calendar,
  Sparkles,
  Download,
  MessageCircle,
  Smartphone,
} from "lucide-react";
import { formatCurrency } from "@/utils";

// ─── App Store Links ────────────────────────────────────────────────────────
const APP_LINKS = {
  ios: "https://apps.apple.com/us/app/home/id1536051773",
  android: "https://play.google.com/store/apps/details?id=com.xapps.athome",
  huawei: "https://appgallery.huawei.com/app/C115358077",
} as const;

// ─── WhatsApp Message Builder ───────────────────────────────────────────────
function buildWhatsAppUrl(whatsappNumber?: string): string {
  const message = encodeURIComponent(
    `📚 *تطبيق VIP Academy - @HOME*\n\nحمّل التطبيق المناسب لجهازك:\n\n` +
      `🍏 *iPhone & iPad (App Store):*\n${APP_LINKS.ios}\n\n` +
      `▶️ *Android (Google Play):*\n${APP_LINKS.android}\n\n` +
      `🔴 *Huawei (AppGallery):*\n${APP_LINKS.huawei}\n\n` +
      `─────────────────\n` +
      `*خطوات الدخول:*\n` +
      `1️⃣ حمّل التطبيق المناسب لجهازك\n` +
      `2️⃣ اكتب اسمك *باللغة العربية* كما سجلت في الأكاديمية\n` +
      `3️⃣ أدخل رقم الموبايل الذي سجلت به (الكود يظهر تلقائياً)\n\n` +
      `_VIP Academy — نتمنى لك عاماً دراسياً موفقاً_ 🎓`
  );

  // Strip non-digit chars for wa.me format
  const cleanNumber = whatsappNumber?.replace(/\D/g, "");
  if (cleanNumber && cleanNumber.length >= 7) {
    return `https://wa.me/${cleanNumber}?text=${message}`;
  }
  // Fallback: open WhatsApp choose-recipient screen
  return `https://wa.me/?text=${message}`;
}

// ─── Sub-component: App Download Button ────────────────────────────────────
interface AppDownloadButtonProps {
  href: string;
  emoji: string;
  storeLabel: string;
  storeName: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
}

function AppDownloadButton({
  href,
  emoji,
  storeLabel,
  storeName,
  colorClass,
  borderClass,
  bgClass,
}: AppDownloadButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${borderClass} ${bgClass} hover:opacity-80 active:scale-95 transition-all duration-150 text-right`}
    >
      <span className="text-2xl shrink-0 leading-none">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-semibold ${colorClass} truncate`}>{storeLabel}</p>
        <p className="text-xs font-black text-slate-900 truncate">{storeName}</p>
      </div>
      <Download className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
    </a>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────
interface RegistrationSuccessProps {
  fullName: string;
  totalAmount: number;
  subjectCount: number;
  whatsappNumber?: string;
  onNewScan?: () => void;
}

export default function RegistrationSuccess({
  fullName,
  totalAmount,
  subjectCount,
  whatsappNumber,
}: RegistrationSuccessProps) {
  const whatsappUrl = buildWhatsAppUrl(whatsappNumber);

  return (
    <div
      className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-sm text-center animate-in fade-in zoom-in-95 duration-300"
      dir="rtl"
    >
      {/* ── Success Icon ──────────────────────────────────────────────────── */}
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-6 text-emerald-600">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <h2 className="text-2xl font-black text-slate-900 mb-2">
        تم التسجيل بنجاح ✅
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed mb-8">
        أهلاً بك يا <span className="font-bold text-slate-900">{fullName}</span>، تم حفظ بياناتك واشتراكك في المحاضرات بنجاح.
      </p>

      {/* ── Summary Box ───────────────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 mb-8 text-right space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-600 pb-2.5 border-b border-slate-200/60">
          <span className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-blue-600" />
            عدد المواد المختارة:
          </span>
          <span className="font-bold text-slate-900">{subjectCount} مادة</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600 pb-2.5 border-b border-slate-200/60">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            حالة الطلب:
          </span>
          <span className="font-bold text-emerald-600">مؤكد ومسجل</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-bold text-slate-700">إجمالي الرسوم:</span>
          <span className="text-base font-black text-blue-700">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* ── Reception Notice ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 bg-blue-50/70 border border-blue-200/80 p-4 rounded-xl text-right text-xs text-blue-900 mb-8">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          يرجى التوجه إلى موظف الاستقبال لتأكيد الدفع وتفعيل الحساب.
        </p>
      </div>

      {/* ── @HOME App Download Section ────────────────────────────────────── */}
      <div className="border border-slate-200 rounded-2xl p-5 mb-4 bg-gradient-to-br from-slate-50 to-white text-right">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Smartphone className="w-[18px] h-[18px] text-white" />
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-slate-900 leading-tight">
              تطبيق المحاضرات أونلاين
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              @HOME — حمّل التطبيق المناسب لجهازك
            </p>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="flex flex-col gap-2.5">
          <AppDownloadButton
            href={APP_LINKS.ios}
            emoji="🍏"
            storeLabel="iPhone & iPad"
            storeName="App Store"
            colorClass="text-slate-500"
            borderClass="border-slate-200"
            bgClass="bg-white hover:bg-slate-50"
          />
          <AppDownloadButton
            href={APP_LINKS.android}
            emoji="▶️"
            storeLabel="Android"
            storeName="Google Play"
            colorClass="text-emerald-600"
            borderClass="border-emerald-100"
            bgClass="bg-emerald-50/50 hover:bg-emerald-50"
          />
          <AppDownloadButton
            href={APP_LINKS.huawei}
            emoji="🔴"
            storeLabel="Huawei"
            storeName="AppGallery"
            colorClass="text-rose-600"
            borderClass="border-rose-100"
            bgClass="bg-rose-50/50 hover:bg-rose-50"
          />
        </div>

        {/* Quick Login Steps */}
        <div className="mt-4 pt-4 border-t border-slate-200/70">
          <p className="text-[11px] font-bold text-slate-700 mb-2.5">
            خطوات الدخول للتطبيق:
          </p>
          <ol className="space-y-1.5 text-right">
            {[
              "حمّل التطبيق المناسب لجهازك من الروابط أعلاه.",
              "اكتب اسمك باللغة العربية كما سجلت في الأكاديمية.",
              "أدخل رقم الموبايل الذي سجلت به (الكود يظهر تلقائياً).",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600">
                <span className="shrink-0 w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-black text-[10px] flex items-center justify-center mt-0.5 leading-none">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ── WhatsApp Share (Secondary CTA) ───────────────────────────────── */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        id="whatsapp-share-app-links"
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 active:scale-95 transition-all duration-150 mb-6"
      >
        <MessageCircle className="w-[18px] h-[18px] shrink-0" />
        <span>📱 أرسل روابط التطبيق لنفسك على واتساب</span>
      </a>

      <p className="text-[11px] text-slate-400">
        VIP Academy &copy; {new Date().getFullYear()} — نتمنى لك عاماً دراسياً موفقاً
      </p>
    </div>
  );
}
