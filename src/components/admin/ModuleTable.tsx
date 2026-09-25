"use client";

import { useState, useMemo } from "react";
import { AdminModule, AdminSemester } from "@/types";
import { toggleModuleActive, deleteModule } from "@/services/adminService";
import EditModuleModal from "./EditModuleModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import {
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Boxes,
  Loader2,
  Power,
  AlertCircle,
} from "lucide-react";

interface ModuleTableProps {
  modules: AdminModule[];
  semesters: AdminSemester[];
  onRefresh: (successMsg?: string) => void;
  loading?: boolean;
}

export default function ModuleTable({
  modules,
  semesters,
  onRefresh,
  loading = false,
}: ModuleTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal State
  const [editingModule, setEditingModule] = useState<AdminModule | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Delete State
  const [deletingModule, setDeletingModule] = useState<AdminModule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered Modules
  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchAr = m.name_ar.toLowerCase().includes(term);
        const matchEn = m.name_en ? m.name_en.toLowerCase().includes(term) : false;
        const matchCode = m.code ? m.code.toLowerCase().includes(term) : false;
        if (!matchAr && !matchEn && !matchCode) return false;
      }

      // Semester
      if (selectedSemesterId !== "ALL" && m.semester_id !== selectedSemesterId) {
        return false;
      }

      // Status
      if (selectedStatus === "ACTIVE" && !m.is_active) return false;
      if (selectedStatus === "INACTIVE" && m.is_active) return false;

      return true;
    });
  }, [modules, searchTerm, selectedSemesterId, selectedStatus]);

  const handleEditClick = (m: AdminModule) => {
    setEditingModule(m);
    setIsEditModalOpen(true);
  };

  const handleToggleActive = async (m: AdminModule) => {
    if (togglingId) return;
    try {
      setTogglingId(m.id);
      setActionError(null);
      await toggleModuleActive(m.id, m.is_active);
      onRefresh(m.is_active ? "تم تعطيل الموديول بنجاح." : "تم تفعيل الموديول بنجاح.");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "فشل تغيير حالة تفعيل الموديول."
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingModule) return;

    try {
      setIsDeleting(true);
      setActionError(null);
      await deleteModule(deletingModule.id);
      setDeletingModule(null);
      onRefresh("تم حذف الموديول بنجاح.");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "تعذر حذف الموديول."
      );
      setDeletingModule(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSemesterId("ALL");
    setSelectedStatus("ALL");
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    selectedSemesterId !== "ALL" ||
    selectedStatus !== "ALL";

  return (
    <div className="space-y-4" dir="rtl">
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

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الموديول أو الرمز..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Semester Filter */}
          <div className="relative">
            <select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-indigo-500 focus:outline-none appearance-none pr-8 pl-4 transition-all cursor-pointer"
            >
              <option value="ALL">جميع الترمات</option>
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.academic_years?.name_ar || ""} - {sem.name_ar}
                </option>
              ))}
            </select>
            <CalendarDays className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-indigo-500 focus:outline-none appearance-none pr-8 pl-4 transition-all cursor-pointer"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="ACTIVE">المفعلة فقط</option>
              <option value="INACTIVE">المعطلة فقط</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 transition-colors cursor-pointer"
            >
              إلغاء الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">الموديول</th>
                <th className="py-3.5 px-5">الترم والفرقة</th>
                <th className="py-3.5 px-5 text-center">الرمز</th>
                <th className="py-3.5 px-5 text-center">الترتيب</th>
                <th className="py-3.5 px-5 text-center">الحالة</th>
                <th className="py-3.5 px-5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      <span>جاري تحميل الموديولات الدراسية...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold">لا توجد موديولات مطابقة</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {hasActiveFilters ? "جرب تغيير فلاتر البحث." : "لم يتم تسجيل أي موديولات بعد."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredModules.map((m) => {
                  const isToggling = togglingId === m.id;
                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !m.is_active ? "bg-slate-50/30 text-slate-400" : ""
                      }`}
                    >
                      {/* Name */}
                      <td className="py-4 px-5 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Boxes className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{m.name_ar}</p>
                            {m.name_en && (
                              <p className="text-[11px] text-slate-400 font-medium" dir="ltr">
                                {m.name_en}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Semester and Academic Year */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{m.semesters?.name_ar || "غير محدد"}</span>
                          </span>
                          {m.semesters?.academic_years && (
                            <p className="text-[11px] text-slate-400">
                              {m.semesters.academic_years.name_ar}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-4 px-5 text-center font-bold text-slate-700">
                        {m.code ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-mono">
                            {m.code}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Order */}
                      <td className="py-4 px-5 text-center font-bold text-slate-700">
                        <span className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 text-xs font-black">
                          {m.module_order}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            m.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {m.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>مفعل</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>معطل</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Toggle Active Button */}
                          <button
                            onClick={() => handleToggleActive(m)}
                            disabled={isToggling}
                            className={`p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-50 ${
                              m.is_active
                                ? "text-amber-600 hover:bg-amber-50 border-transparent hover:border-amber-100"
                                : "text-emerald-600 hover:bg-emerald-50 border-transparent hover:border-emerald-100"
                            }`}
                            title={m.is_active ? "تعطيل الموديول" : "تفعيل الموديول"}
                          >
                            {isToggling ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditClick(m)}
                            className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all cursor-pointer"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingModule(m)}
                            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                            title="حذف"
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

      {/* Edit Modal */}
      <EditModuleModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingModule(null);
        }}
        onSuccess={() => onRefresh("تم تحديث بيانات الموديول بنجاح.")}
        moduleItem={editingModule}
        semesters={semesters}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingModule)}
        title="حذف الموديول الدراسي"
        itemName={deletingModule ? deletingModule.name_ar : ""}
        itemTypeLabel="الموديول الدراسي"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingModule(null)}
      />
    </div>
  );
}
