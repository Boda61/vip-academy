"use client";

import { useState, useMemo } from "react";
import { UniversityOption, AcademicYearOption } from "@/services/registrationService";
import { createSubject } from "@/services/adminService";
import { AdminSemester, AdminModule } from "@/types";
import { X, Loader2, AlertCircle, BookOpen } from "lucide-react";

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  universities: UniversityOption[];
  academicYears: AcademicYearOption[];
  semesters?: AdminSemester[];
  modules?: AdminModule[];
  onSuccess: () => void;
}

export default function AddSubjectModal({
  isOpen,
  onClose,
  universities,
  academicYears,
  semesters = [],
  modules = [],
  onSuccess,
}: AddSubjectModalProps) {
  const [universityId, setUniversityId] = useState(universities[0]?.id || "");
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id || "");
  const [semesterId, setSemesterId] = useState<string>("");
  const [moduleId, setModuleId] = useState<string>("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtered Semesters for the selected Academic Year
  const availableSemesters = useMemo(() => {
    if (!academicYearId) return [];
    return semesters.filter((s) => s.academic_year_id === academicYearId && s.is_active);
  }, [academicYearId, semesters]);

  // Filtered Modules for the selected Semester
  const availableModules = useMemo(() => {
    if (!semesterId) return [];
    return modules.filter((m) => m.semester_id === semesterId && m.is_active);
  }, [semesterId, modules]);

  // Reset semester and module when academic year changes
  const handleAcademicYearChange = (newYearId: string) => {
    setAcademicYearId(newYearId);
    setSemesterId("");
    setModuleId("");
  };

  // Reset module when semester changes
  const handleSemesterChange = (newSemesterId: string) => {
    setSemesterId(newSemesterId);
    setModuleId("");
  };

  if (!isOpen) return null;

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
      setError("السعر يجب أن يكون رقماً صحيحاً أو عشرياً موجباً.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await createSubject({
        name_ar: nameAr.trim(),
        name_en: nameEn.trim() || null,
        price: numPrice,
        university_id: universityId,
        academic_year_id: academicYearId,
        semester_id: semesterId || null,
        module_id: moduleId || null,
        is_active: isActive,
      });

      // Reset form
      setNameAr("");
      setNameEn("");
      setPrice("");
      setSemesterId("");
      setModuleId("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء إضافة المادة.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
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
                إضافة مادة دراسية جديدة
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تحديد الجامعة، الفرقة، الترم، الموديول، والسعر
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
            {/* University and Academic Year */}
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
                  onChange={(e) => handleAcademicYearChange(e.target.value)}
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

            {/* Semester and Module (Cascading) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الترم الدراسي (اختياري)
                </label>
                <div className="relative">
                  <select
                    value={semesterId}
                    onChange={(e) => handleSemesterChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="">-- بدون ترم محدد --</option>
                    {availableSemesters.map((sem) => (
                      <option key={sem.id} value={sem.id}>
                        {sem.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الموديول (اختياري)
                </label>
                <div className="relative">
                  <select
                    value={moduleId}
                    onChange={(e) => setModuleId(e.target.value)}
                    disabled={!semesterId || availableModules.length === 0}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <option value="">
                      {!semesterId
                        ? "-- اختر الترم أولاً --"
                        : availableModules.length === 0
                        ? "-- لا توجد موديولات لهذا الترم --"
                        : "-- بدون موديول محدد --"}
                    </option>
                    {availableModules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Price Field */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <label className="block text-xs font-black text-indigo-900 mb-1.5">
                سعر المادة (EGP) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white border border-indigo-200 text-slate-900 font-black text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition-all"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-xs font-bold text-indigo-600">
                  ج.م
                </div>
              </div>
            </div>

            {/* Arabic Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اسم المادة (بالعربية) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: فسيولوجيا طبية (Physiology)"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* English Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اسم المادة (بالإنجليزية - اختياري)
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="مثال: Medical Physiology"
                dir="ltr"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left"
              />
            </div>

            {/* Active Status Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
              <div>
                <p className="text-xs font-bold text-slate-900">حالة التفعيل</p>
                <p className="text-[11px] text-slate-400">
                  عند التعطيل لن تظهر المادة للطلاب في الاستمارة
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
                    <span>جاري الإضافة...</span>
                  </>
                ) : (
                  <span>إضافة المادة</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
