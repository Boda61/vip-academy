"use client";

import { useState } from "react";
import { updateAcademicYear } from "@/services/adminService";
import { AdminAcademicYear, AcademicYearMutationInput } from "@/types";
import { X, Loader2, GraduationCap, AlertCircle } from "lucide-react";

interface EditAcademicYearModalProps {
  academicYear: AdminAcademicYear | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingOrders: number[];
}

export default function EditAcademicYearModal({
  academicYear,
  isOpen,
  onClose,
  onSuccess,
  existingOrders,
}: EditAcademicYearModalProps) {
  const [formData, setFormData] = useState<AcademicYearMutationInput>({
    name_ar: "",
    name_en: "",
    year_order: 1,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state cleanly when academicYear changes
  const currentId = academicYear?.id;
  const [prevId, setPrevId] = useState<string | undefined>(undefined);

  if (currentId !== prevId) {
    setPrevId(currentId);
    if (academicYear) {
      setFormData({
        name_ar: academicYear.name_ar || "",
        name_en: academicYear.name_en || "",
        year_order: academicYear.year_order,
        is_active: academicYear.is_active,
      });
      setError(null);
    }
  }

  if (!isOpen || !academicYear) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name_ar.trim()) {
      setError("يرجى إدخال اسم الفرقة الدراسية باللغة العربية.");
      return;
    }

    const orderNum = Number(formData.year_order);
    if (isNaN(orderNum) || orderNum < 1 || orderNum > 5) {
      setError("ترتيب الفرقة الدراسية يجب أن يكون رقماً بين 1 و 5.");
      return;
    }

    // Check if order changed and is already taken by another year
    if (orderNum !== academicYear.year_order && existingOrders.includes(orderNum)) {
      setError(`الترتيب رقم (${orderNum}) مسجل بالفعل لفرقة دراسية أخرى.`);
      return;
    }

    try {
      setSaving(true);
      await updateAcademicYear(academicYear.id, {
        name_ar: formData.name_ar.trim(),
        name_en: formData.name_en?.trim() || formData.name_ar.trim(),
        year_order: orderNum,
        is_active: formData.is_active,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل تعديل بيانات الفرقة الدراسية.");
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
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                تعديل الفرقة الدراسية
              </h2>
              <p className="text-xs text-slate-400">
                تحديث مسمى الفرقة أو ترتيبها أو حالة التفعيل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Arabic Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم الفرقة (باللغة العربية) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name_ar}
              onChange={(e) =>
                setFormData({ ...formData, name_ar: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* English Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم الفرقة (باللغة الإنجليزية)
            </label>
            <input
              type="text"
              value={formData.name_en || ""}
              onChange={(e) =>
                setFormData({ ...formData, name_en: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Year Order */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ترتيب الفرقة (1 إلى 5) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="5"
              required
              value={formData.year_order}
              onChange={(e) =>
                setFormData({ ...formData, year_order: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-800">حالة التفعيل</p>
              <p className="text-[11px] text-slate-400">
                عند التعطيل، تختفي الفرقة من استمارة تسجيل الطلاب الجدد مع بقاء التسجيلات السابقة.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
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
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
