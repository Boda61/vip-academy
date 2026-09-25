"use client";

import { SubjectOption } from "@/services/registrationService";
import { BookOpen, Check, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/utils";

interface SubjectSelectorProps {
  subjects: SubjectOption[];
  selectedSubjectIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  hasSelectionCriteria: boolean;
  error?: string;
}

export default function SubjectSelector({
  subjects,
  selectedSubjectIds,
  onChange,
  loading = false,
  hasSelectionCriteria,
  error,
}: SubjectSelectorProps) {
  const toggleSubject = (subjectId: string) => {
    if (selectedSubjectIds.includes(subjectId)) {
      onChange(selectedSubjectIds.filter((id) => id !== subjectId));
    } else {
      onChange([...selectedSubjectIds, subjectId]);
    }
  };

  const selectAll = () => {
    onChange(subjects.map((s) => s.id));
  };

  const deselectAll = () => {
    onChange([]);
  };

  // Calculate live preview total (for UI display only)
  const previewTotal = subjects
    .filter((s) => selectedSubjectIds.includes(s.id))
    .reduce((sum, s) => sum + Number(s.price), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700">
          المواد الدراسية المطلوبة <span className="text-rose-500">*</span>
        </label>
        {subjects.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={selectAll}
              className="text-blue-600 hover:text-blue-700 hover:underline font-semibold cursor-pointer"
            >
              تحديد الكل
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
            >
              إلغاء التحديد
            </button>
          </div>
        )}
      </div>

      {!hasSelectionCriteria ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-500 text-xs">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          يرجى اختيار الجامعة والفرقة الدراسية أولاً لعرض المواد المتاحة.
        </div>
      ) : loading ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-xs">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          جاري تحميل المواد الدراسية...
        </div>
      ) : subjects.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-600 text-xs">
          <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
          لا توجد مواد مسجلة حالياً لهذه الفرقة والجامعة.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {subjects.map((subject) => {
              const isSelected = selectedSubjectIds.includes(subject.id);
              return (
                <div
                  key={subject.id}
                  onClick={() => toggleSubject(subject.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-500 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-300 bg-slate-50"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {subject.name_ar}
                      </p>
                      {subject.name_en && (
                        <p className="text-[11px] text-slate-400 font-medium">
                          {subject.name_en}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                      {formatCurrency(Number(subject.price))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dynamic Total Display */}
          {selectedSubjectIds.length > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 mt-3">
              <span className="text-xs font-bold text-slate-700">
                الإجمالي ({selectedSubjectIds.length} مواد مختارة):
              </span>
              <span className="text-base font-black text-blue-700">
                {formatCurrency(previewTotal)}
              </span>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}
