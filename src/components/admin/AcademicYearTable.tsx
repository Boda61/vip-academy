"use client";

import { useState } from "react";
import { AdminAcademicYear } from "@/types";
import { toggleAcademicYearActive, deleteAcademicYear } from "@/services/adminService";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import {
  Edit,
  Power,
  Trash2,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface AcademicYearTableProps {
  academicYears: AdminAcademicYear[];
  loading: boolean;
  onEdit: (year: AdminAcademicYear) => void;
  onRefresh: (successMsg?: string) => void;
}

export default function AcademicYearTable({
  academicYears,
  loading,
  onEdit,
  onRefresh,
}: AcademicYearTableProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Delete state
  const [deletingYear, setDeletingYear] = useState<AdminAcademicYear | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleActive = async (year: AdminAcademicYear) => {
    try {
      setTogglingId(year.id);
      setActionError(null);
      await toggleAcademicYearActive(year.id, year.is_active);
      onRefresh(year.is_active ? "تم تعطيل الفرقة الدراسية بنجاح." : "تم تفعيل الفرقة الدراسية بنجاح.");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "فشل تغيير حالة تفعيل الفرقة الدراسية."
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingYear) return;

    try {
      setIsDeleting(true);
      setActionError(null);
      await deleteAcademicYear(deletingYear.id);
      setDeletingYear(null);
      onRefresh("تم حذف الفرقة الدراسية بنجاح.");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "تعذر حذف الفرقة الدراسية."
      );
      setDeletingYear(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs font-bold underline cursor-pointer hover:text-rose-800"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3.5 px-5">الفرقة الدراسية</th>
                <th className="py-3.5 px-5">الترتيب</th>
                <th className="py-3.5 px-5">الحالة</th>
                <th className="py-3.5 px-5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      <span>جاري تحميل الفرق الدراسية...</span>
                    </div>
                  </td>
                </tr>
              ) : academicYears.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <GraduationCap className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-600">لا توجد فرق دراسية مسجلة</p>
                    </div>
                  </td>
                </tr>
              ) : (
                academicYears.map((year) => {
                  const isToggling = togglingId === year.id;
                  return (
                    <tr
                      key={year.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Names */}
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900">
                          {year.name_ar}
                        </div>
                        {year.name_en && (
                          <div className="text-[11px] text-slate-400 font-sans">
                            {year.name_en}
                          </div>
                        )}
                      </td>

                      {/* Order */}
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-100 font-bold text-xs">
                          الفرقة {year.year_order}
                        </span>
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-5">
                        {year.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>مفعلة</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>معطلة</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => onEdit(year)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="تعديل الفرقة"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Toggle Active Button */}
                          <button
                            onClick={() => handleToggleActive(year)}
                            disabled={isToggling}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              year.is_active
                                ? "text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                            }`}
                            title={year.is_active ? "تعطيل الفرقة" : "تفعيل الفرقة"}
                          >
                            {isToggling ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingYear(year)}
                            disabled={isDeleting || isToggling}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف الفرقة الدراسية نهائياً"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingYear)}
        title="حذف الفرقة الدراسية"
        itemName={deletingYear?.name_ar || ""}
        itemTypeLabel="الفرقة"
        warningText="إذا كانت هذه الفرقة الدراسية مرتبطة بمواد أو طلبات تسجيل لطلاب، سيتم منع الحذف تلقائياً لحماية البيانات ويمكنك تعطيلها بدلاً من ذلك."
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingYear(null)}
      />
    </div>
  );
}
