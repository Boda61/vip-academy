"use client";

import { CheckCircle2, Award, Calendar, Sparkles } from "lucide-react";
import { formatCurrency } from "@/utils";

interface RegistrationSuccessProps {
  fullName: string;
  totalAmount: number;
  subjectCount: number;
  onNewScan?: () => void;
}

export default function RegistrationSuccess({
  fullName,
  totalAmount,
  subjectCount,
}: RegistrationSuccessProps) {
  return (
    <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-300">
      {/* Success Icon */}
      <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
        تم التسجيل بنجاح ✅
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
        أهلاً بك يا <span className="font-bold text-slate-900 dark:text-white">{fullName}</span>، تم حفظ بياناتك واشتراكك في المحاضرات بنجاح.
      </p>

      {/* Summary Box */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 mb-8 text-right space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2.5 border-b border-slate-200/60 dark:border-slate-700/60">
          <span className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            عدد المواد المختارة:
          </span>
          <span className="font-bold text-slate-900 dark:text-white">{subjectCount} مادة</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2.5 border-b border-slate-200/60 dark:border-slate-700/60">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-500" />
            حالة الطلب:
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">مؤكد ومسجل</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            إجمالي الرسوم:
          </span>
          <span className="text-base font-black text-amber-600 dark:text-amber-400">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-right text-xs text-amber-900 dark:text-amber-300 mb-6">
        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          يرجى التوجه إلى موظف الاستقبال لتأكيد تفعيل الحساب واستلام جدول المحاضرات.
        </p>
      </div>

      <p className="text-[11px] text-slate-400">
        VIP Academy &copy; {new Date().getFullYear()} — نتمنى لك عاماً دراسياً موفقاً
      </p>
    </div>
  );
}
