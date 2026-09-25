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
    <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-sm text-center animate-in fade-in zoom-in-95 duration-300">
      {/* Success Icon */}
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-6 text-emerald-600">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <h2 className="text-2xl font-black text-slate-900 mb-2">
        تم التسجيل بنجاح ✅
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed mb-8">
        أهلاً بك يا <span className="font-bold text-slate-900">{fullName}</span>، تم حفظ بياناتك واشتراكك في المحاضرات بنجاح.
      </p>

      {/* Summary Box */}
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
          <span className="text-xs font-bold text-slate-700">
            إجمالي الرسوم:
          </span>
          <span className="text-base font-black text-blue-700">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-2.5 bg-blue-50/70 border border-blue-200/80 p-4 rounded-xl text-right text-xs text-blue-900 mb-6">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
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
