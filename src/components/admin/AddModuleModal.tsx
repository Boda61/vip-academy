"use client";

import { useState } from "react";
import { createModule } from "@/services/adminService";
import { ModuleMutationInput, AdminSemester } from "@/types";
import { X, Loader2, Boxes, AlertCircle } from "lucide-react";

interface AddModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  semesters: AdminSemester[];
  defaultSemesterId?: string;
}

export default function AddModuleModal({
  isOpen,
  onClose,
  onSuccess,
  semesters,
  defaultSemesterId,
}: AddModuleModalProps) {
  const [formData, setFormData] = useState<ModuleMutationInput>({
    semester_id: defaultSemesterId || (semesters[0]?.id || ""),
    name_ar: "",
    name_en: "",
    code: "",
    module_order: 1,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.semester_id) {
      setError("يرجى اختيار الترم التابع له الموديول.");
      return;
    }

    if (!formData.name_ar.trim()) {
      setError("يرجى إدخال اسم الموديول باللغة العربية (مثال: 🩸 Blood أو Respiratory).");
      return;
    }

    const orderNum = Number(formData.module_order) || 1;

    try {
      setSaving(true);
      await createModule({
        semester_id: formData.semester_id,
        name_ar: formData.name_ar.trim(),
        name_en: formData.name_en?.trim() || null,
        code: formData.code?.trim().toUpperCase() || null,
        module_order: orderNum,
        is_active: formData.is_active,
      });

      setFormData({
        semester_id: defaultSemesterId || (semesters[0]?.id || ""),
        name_ar: "",
        name_en: "",
        code: "",
        module_order: 1,
        is_active: true,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل إضافة الموديول.");
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
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                إضافة موديول دراسي جديد
              </h2>
              <p className="text-xs text-slate-400">
                إضافة وحدة دراسية / موديول للترم
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

          {/* Semester Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              الترم التابع له <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.semester_id}
              onChange={(e) => setFormData({ ...formData, semester_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
            >
              <option value="" disabled>اختر الترم...</option>
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.academic_years?.name_ar || ""} - {sem.name_ar}
                </option>
              ))}
            </select>
          </div>

          {/* Arabic Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              اسم الموديول (بالعربية / مع الإيموجي) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              placeholder="مثال: 🩸 Blood أو 🫁 Respiratory أو 🩺 GIT"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
            />
          </div>

          {/* English Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              اسم الموديول (بالإنجليزية - اختياري)
            </label>
            <input
              type="text"
              value={formData.name_en || ""}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              placeholder="مثال: Blood, Respiratory, GIT"
              dir="ltr"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all text-left"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Code */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                رمز الموديول (اختياري)
              </label>
              <input
                type="text"
                value={formData.code || ""}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="مثال: BLOOD, RESP, GIT"
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all text-left uppercase"
              />
            </div>

            {/* Module Order */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                ترتيب العرض
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={formData.module_order}
                onChange={(e) => setFormData({ ...formData, module_order: parseInt(e.target.value) || 1 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Active Status Checkbox */}
          <div className="flex items-center gap-2.5 pt-2">
            <input
              type="checkbox"
              id="is_active_module"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="is_active_module" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
              تفعيل الموديول وإتاحته للطلاب
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
                <span>إضافة الموديول</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
