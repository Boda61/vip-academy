"use client";

import { useState } from "react";
import { AdminSubject } from "@/types";
import { UniversityOption, AcademicYearOption } from "@/services/registrationService";
import { updateSubject } from "@/services/adminService";
import { X, Loader2, AlertCircle, Info, BookOpen } from "lucide-react";

interface EditSubjectModalProps {
  subject: AdminSubject | null;
  universities: UniversityOption[];
  academicYears: AcademicYearOption[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditSubjectModal({
  subject,
  universities,
  academicYears,
  isOpen,
  onClose,
  onSuccess,
}: EditSubjectModalProps) {
  const [universityId, setUniversityId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state cleanly when subject or isOpen changes (no useEffect setState)
  const currentSubjectId = subject?.id;
  const [prevSubjectId, setPrevSubjectId] = useState<string | undefined>(undefined);

  if (currentSubjectId !== prevSubjectId) {
    setPrevSubjectId(currentSubjectId);
    if (subject) {
      setUniversityId(subject.university_id || universities[0]?.id || "");
      setAcademicYearId(subject.academic_year_id || academicYears[0]?.id || "");
      setNameAr(subject.name_ar || "");
      setNameEn(subject.name_en || "");
      setPrice(subject.price.toString());
      setIsActive(subject.is_active);
      setError(null);
    }
  }

  if (!isOpen || !subject) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!universityId) {
      setError("يرجى اختيار الجامعة.");
      return;
    }

    if (!academicYearId) {
      setError("يرجى اختيار الفرقة الدراسية.");
      return;
    }

    if (!nameAr.trim()) {
      setError("اسم المادة باللغة العربية مطلوب.");
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError("السعر يجب أن يكون رقماً صحيحاً أو عشرياً موجباً (أو صفراً).");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await updateSubject(subject.id, {
        university_id: universityId,
        academic_year_id: academicYearId,
        name_ar: nameAr.trim(),
        name_en: nameEn.trim() || null,
        price: numPrice,
        is_active: isActive,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ التعديلات.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                تعديل بيانات وسعر المادة
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تعديل الجامعة، الفرقة، الاسم، السعر، وحالة التفعيل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* University & Academic Year Selects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الجامعة <span className="text-rose-500">*</span>
                </label>
                <select
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {universities.map((uni) => (
                    <option key={uni.id} value={uni.id}>
                      {uni.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الفرقة الدراسية <span className="text-rose-500">*</span>
                </label>
                <select
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name_ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price Field - Highlighted */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
              <label className="block text-xs font-black text-indigo-800">
                سعر المادة (جنيه مصري) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white border border-indigo-200 text-slate-900 font-black text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-left transition-all"
                  dir="ltr"
                  placeholder="0.00"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  EGP
                </span>
              </div>

              {/* Price Notice Alert */}
              <div className="flex items-start gap-2 pt-1 text-[11px] text-indigo-700 leading-relaxed">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  سيتم تطبيق السعر الجديد فوراً على التسجيلات الجديدة، بينما تظل أسعار التسجيلات السابقة محفوظة كما كانت.
                </span>
              </div>
            </div>

            {/* Name Arabic */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اسم المادة (بالعربية) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Name English */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اسم المادة (بالإنجليزية - اختياري)
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                dir="ltr"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left"
              />
            </div>

            {/* Active Status Switch */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  حالة تفعيل المادة
                </p>
                <p className="text-[11px] text-slate-400">
                  المواد المفعلة فقط هي التي تظهر للطلاب في استمارة التسجيل
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>حفظ التعديلات</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
