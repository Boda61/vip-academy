"use client";

import { useState, useMemo } from "react";
import { AdminSemester } from "@/types";
import { AcademicYearOption } from "@/services/registrationService";
import { toggleSemesterActive, deleteSemester } from "@/services/adminService";
import EditSemesterModal from "./EditSemesterModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import {
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  GraduationCap,
  CalendarDays,
  Loader2,
  Power,
  AlertCircle,
} from "lucide-react";

interface SemesterTableProps {
  semesters: AdminSemester[];
  academicYears: AcademicYearOption[];
  onRefresh: (successMsg?: string) => void;
  loading?: boolean;
}

export default function SemesterTable({
  semesters,
  academicYears,
  onRefresh,
  loading = false,
}: SemesterTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal State
  const [editingSemester, setEditingSemester] = useState<AdminSemester | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Delete State
  const [deletingSemester, setDeletingSemester] = useState<AdminSemester | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered Semesters
  const filteredSemesters = useMemo(() => {
    return semesters.filter((sem) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchAr = sem.name_ar.toLowerCase().includes(term);
        const matchEn = sem.name_en ? sem.name_en.toLowerCase().includes(term) : false;
        if (!matchAr && !matchEn) return false;
      }

      // Academic Year
      if (selectedAcademicYearId !== "ALL" && sem.academic_year_id !== selectedAcademicYearId) {
        return false;
      }

      // Status
      if (selectedStatus === "ACTIVE" && !sem.is_active) return false;
      if (selectedStatus === "INACTIVE" && sem.is_active) return false;

      return true;
    });
  }, [semesters, searchTerm, selectedAcademicYearId, selectedStatus]);

  const handleEditClick = (sem: AdminSemester) => {
    setEditingSemester(sem);
    setIsEditModalOpen(true);
  };

  const handleToggleActive = async (sem: AdminSemester) => {
    if (togglingId) return;
    try {
      setTogglingId(sem.id);
      setActionError(null);
      await toggleSemesterActive(sem.id, sem.is_active);
      onRefresh(sem.is_active ? "تم تعطيل الترم بنجاح." : "تم تفعيل الترم بنجاح.");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "فشل تغيير حالة تفعيل الترم."
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSemester) return;

    try {
      setIsDeleting(true);
      setActionError(null);
      await deleteSemester(deletingSemester.id);
      setDeletingSemester(null);
      onRefresh("تم حذف الترم بنجاح.");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "تعذر حذف الترم."
      );
      setDeletingSemester(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedAcademicYearId("ALL");
    setSelectedStatus("ALL");
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    selectedAcademicYearId !== "ALL" ||
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
            placeholder="ابحث باسم الترم..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Academic Year Filter */}
          <div className="relative">
            <select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-indigo-500 focus:outline-none appearance-none pr-8 pl-4 transition-all cursor-pointer"
            >
              <option value="ALL">جميع الفرق الدراسية</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name_ar}
                </option>
              ))}
            </select>
            <GraduationCap className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                <th className="py-3.5 px-5">الترم</th>
                <th className="py-3.5 px-5">الفرقة الدراسية</th>
                <th className="py-3.5 px-5 text-center">الترتيب</th>
                <th className="py-3.5 px-5 text-center">الحالة</th>
                <th className="py-3.5 px-5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      <span>جاري تحميل الترمات الدراسية...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSemesters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold">لا توجد ترمات مطابقة</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {hasActiveFilters ? "جرب تغيير فلاتر البحث." : "لم يتم تسجيل أي ترمات بعد."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSemesters.map((sem) => {
                  const isToggling = togglingId === sem.id;
                  return (
                    <tr
                      key={sem.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !sem.is_active ? "bg-slate-50/30 text-slate-400" : ""
                      }`}
                    >
                      {/* Name */}
                      <td className="py-4 px-5 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <CalendarDays className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{sem.name_ar}</p>
                            {sem.name_en && (
                              <p className="text-[11px] text-slate-400 font-medium" dir="ltr">
                                {sem.name_en}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Academic Year */}
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                          <span>{sem.academic_years?.name_ar || "غير محدد"}</span>
                        </span>
                      </td>

                      {/* Order */}
                      <td className="py-4 px-5 text-center font-bold text-slate-700">
                        <span className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 text-xs font-black">
                          {sem.semester_order}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            sem.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {sem.is_active ? (
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
                            onClick={() => handleToggleActive(sem)}
                            disabled={isToggling}
                            className={`p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-50 ${
                              sem.is_active
                                ? "text-amber-600 hover:bg-amber-50 border-transparent hover:border-amber-100"
                                : "text-emerald-600 hover:bg-emerald-50 border-transparent hover:border-emerald-100"
                            }`}
                            title={sem.is_active ? "تعطيل الترم" : "تفعيل الترم"}
                          >
                            {isToggling ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditClick(sem)}
                            className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all cursor-pointer"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingSemester(sem)}
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
      <EditSemesterModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSemester(null);
        }}
        onSuccess={() => onRefresh("تم تحديث بيانات الترم بنجاح.")}
        semester={editingSemester}
        academicYears={academicYears}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingSemester)}
        title="حذف الترم الدراسي"
        itemName={deletingSemester ? deletingSemester.name_ar : ""}
        itemTypeLabel="الترم الدراسي"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingSemester(null)}
      />
    </div>
  );
}
