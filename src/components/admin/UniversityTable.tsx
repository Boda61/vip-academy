"use client";

import { useState, useMemo } from "react";
import { AdminUniversity } from "@/types";
import { toggleUniversityActive, deleteUniversity } from "@/services/adminService";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import {
  Search,
  Edit,
  Power,
  Trash2,
  Building2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface UniversityTableProps {
  universities: AdminUniversity[];
  loading: boolean;
  onEdit: (university: AdminUniversity) => void;
  onRefresh: (successMsg?: string) => void;
}

export default function UniversityTable({
  universities,
  loading,
  onEdit,
  onRefresh,
}: UniversityTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Delete modal state
  const [deletingUni, setDeletingUni] = useState<AdminUniversity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered universities
  const filteredUniversities = useMemo(() => {
    return universities.filter((uni) => {
      // Search match
      const matchesSearch =
        searchTerm === "" ||
        uni.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
        uni.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        uni.code.toLowerCase().includes(searchTerm.toLowerCase());

      // Status match
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && uni.is_active) ||
        (statusFilter === "inactive" && !uni.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [universities, searchTerm, statusFilter]);

  const handleToggleActive = async (uni: AdminUniversity) => {
    try {
      setTogglingId(uni.id);
      setActionError(null);
      await toggleUniversityActive(uni.id, uni.is_active);
      onRefresh(uni.is_active ? "تم تعطيل الجامعة بنجاح." : "تم تفعيل الجامعة بنجاح.");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "فشل تغيير حالة تفعيل الجامعة."
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUni) return;

    try {
      setIsDeleting(true);
      setActionError(null);
      await deleteUniversity(deletingUni.id);
      setDeletingUni(null);
      onRefresh("تم حذف الجامعة بنجاح.");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "تعذر حذف الجامعة."
      );
      setDeletingUni(null);
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

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث باسم الجامعة أو الكود..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto self-stretch sm:self-auto justify-center">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            الكل ({universities.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "active"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            المفعلة ({universities.filter((u) => u.is_active).length})
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "inactive"
                ? "bg-white text-slate-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            المعطلة ({universities.filter((u) => !u.is_active).length})
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3.5 px-5">اسم الجامعة</th>
                <th className="py-3.5 px-5">الكود</th>
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
                      <span>جاري تحميل الجامعات...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUniversities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-600">لا توجد جامعات مطابقة</p>
                      <p className="text-[11px]">
                        جرب تعديل كلمات البحث أو الفلاتر أعلاه.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUniversities.map((uni) => {
                  const isToggling = togglingId === uni.id;
                  return (
                    <tr
                      key={uni.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* University Names */}
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900">
                          {uni.name_ar}
                        </div>
                        {uni.name_en && (
                          <div className="text-[11px] text-slate-400 font-sans">
                            {uni.name_en}
                          </div>
                        )}
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-5 font-mono font-bold text-indigo-600">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[11px]">
                          {uni.code}
                        </span>
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-5">
                        {uni.is_active ? (
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
                            onClick={() => onEdit(uni)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="تعديل الجامعة"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Toggle Active Button */}
                          <button
                            onClick={() => handleToggleActive(uni)}
                            disabled={isToggling}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              uni.is_active
                                ? "text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                            }`}
                            title={uni.is_active ? "تعطيل الجامعة" : "تفعيل الجامعة"}
                          >
                            {isToggling ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingUni(uni)}
                            disabled={isDeleting || isToggling}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف الجامعة نهائياً"
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
        isOpen={Boolean(deletingUni)}
        title="حذف الجامعة"
        itemName={deletingUni?.name_ar || ""}
        itemTypeLabel="الجامعة"
        warningText="إذا كانت هذه الجامعة تحتوي على مواد دراسية أو طلبات تسجيل لطلاب، سيتم منع الحذف تلقائياً لحماية البيانات ويمكنك تعطيلها بدلاً من ذلك."
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingUni(null)}
      />
    </div>
  );
}
