import { CheckCircle2, ShieldCheck, Sparkles, Layers, QrCode } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all">
        {/* Header Badge */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-bold text-xl">
              VIP
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                VIP Academy
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                نظام تسجيل الطلاب والاشتراكات
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            البيئة جاهزة للعمل
          </span>
        </div>

        {/* Welcome Content */}
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-r-4 border-amber-500 p-4 rounded-xl">
            <h2 className="text-base font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              تم تجهيز بنية المشروع بنجاح
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              تم إعداد بيئة العمل وهيكل المجلدات والمكتبات الأساسية (Next.js 16 + App Router + TypeScript + Tailwind CSS + RTL) وهي جاهزة للبدء في الخطوات القادمة.
            </p>
          </div>

          {/* Feature Checklist Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">TypeScript & Tailwind CSS</p>
                <p className="text-[11px] text-slate-500">تم الضبط والتحقق</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Supabase Client & Types</p>
                <p className="text-[11px] text-slate-500">تم الهيكلة بدون مفاتيح صريحة</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Form & QR Libraries</p>
                <p className="text-[11px] text-slate-500">Zod, RHF, QR, Phone</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">RTL & Arabic Typography</p>
                <p className="text-[11px] text-slate-500">خط Cairo واتجاه RTL</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            VIP Academy &copy; {new Date().getFullYear()} — جاهز للانتقال للخطوة التالية
          </p>
        </div>
      </div>
    </main>
  );
}
