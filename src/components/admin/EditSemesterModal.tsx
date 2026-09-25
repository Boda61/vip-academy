"use client";

import { useState } from "react";
import { updateSemester } from "@/services/adminService";
import { AdminSemester, SemesterMutationInput } from "@/types";
import { AcademicYearOption } from "@/services/registrationService";
import { X, Loader2, CalendarDays, AlertCircle } from "lucide-react";

interface EditSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  semester: AdminSemester | null;
  academicYears: AcademicYearOption[];
}

export default function EditSemesterModal({
  isOpen,
  onClose,
  onSuccess,
  semester,
  academicYears,
}: EditSemesterModalProps) {
  const [formData, setFormData] = useState<SemesterMutationInput>({
    academic_year_id: "",
    name_ar: "",
    name_en: "",
    semester_order: 1,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state cleanly when semester changes
  const currentId = semester?.id;
  const [prevId, setPrevId] = useState<string | undefined>(undefined);

  if (currentId !== prevId) {
    setPrevId(currentId);
    if (semester) {
      setFormData({
        academic_year_id: semester.academic_year_id,
        name_ar: semester.name_ar,
        name_en: semester.name_en || "",
        semester_order: semester.semester_order,
        is_active: semester.is_active,
      });
      setError(null);
    }
  }

  if (!isOpen || !semester) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.academic_year_id) {
      setError("يرجى اختيار الفرقة الدراسية التابع لها الترم.");
      return;
    }

    if (!formData.name_ar.trim()) {
      setError("يرجى إدخال اسم الترم باللغة العربية.");
      return;
    }

    const orderNum = Number(formData.semester_order);
    if (isNaN(orderNum) || orderNum < 1 || orderNum > 10) {
      setError("ترتيب الترم يجب أن يكون رقماً بين 1 و 10.");
      return;
    }

    try {
      setSaving(true);
      await updateSemester(semester.id, {
        academic_year_id: formData.academic_year_id,
        name_ar: formData.name_ar.trim(),
        name_en: formData.name_en?.trim() || formData.name_ar.trim(),
        semester_order: orderNum,
        is_active: formData.is_active,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل تحديث بيانات الترم.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                تعديل بيانات الترم
              </h2>
              <p className="text-xs text-slate-400">
                تحديث اسم أو ترتيب أو تفعيل الترم
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Academic Year Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              الفرقة الدراسية <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.academic_year_id}
              onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
            >
              <option value="" disabled>اختر الفرقة الدراسية...</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name_ar} ({year.name_en})
                </option>
              ))}
            </select>
          </div>

          {/* Arabic Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              اسم الترم (بالعربية) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
            />
          </div>

          {/* English Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              اسم الترم (بالإنجليزية - اختياري)
            </label>
            <input
              type="text"
              value={formData.name_en || ""}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              dir="ltr"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all text-left"
            />
          </div>

          {/* Semester Order */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              ترتيب الترم في الفرقة <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={formData.semester_order}
              onChange={(e) => setFormData({ ...formData, semester_order: parseInt(e.target.value) || 1 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
            />
          </div>

          {/* Active Status Checkbox */}
          <div className="flex items-center gap-2.5 pt-2">
            <input
              type="checkbox"
              id="edit_is_active_semester"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="edit_is_active_semester" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
              تفعيل الترم وإتاحته للطلاب
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {saving ? (
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
  );
}
