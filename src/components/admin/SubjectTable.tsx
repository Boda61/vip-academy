"use client";

import { useState, useMemo } from "react";
import { AdminSubject, AdminSemester, AdminModule } from "@/types";
import { UniversityOption, AcademicYearOption } from "@/services/registrationService";
import { toggleSubjectActive, deleteSubject } from "@/services/adminService";
import { formatCurrency } from "@/utils";
import EditSubjectModal from "./EditSubjectModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import {
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Building2,
  GraduationCap,
  CalendarDays,
  Boxes,
  Loader2,
  RefreshCw,
  Power,
  AlertCircle,
} from "lucide-react";

interface SubjectTableProps {
  subjects: AdminSubject[];
  universities: UniversityOption[];
  academicYears: AcademicYearOption[];
  semesters?: AdminSemester[];
  modules?: AdminModule[];
  onRefresh: (successMsg?: string) => void;
  loading?: boolean;
}

export default function SubjectTable({
  subjects,
  universities,
  academicYears,
  semesters = [],
  modules = [],
  onRefresh,
  loading = false,
}: SubjectTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>("ALL");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("ALL");
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("ALL");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal State
  const [editingSubject, setEditingSubject] = useState<AdminSubject | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Delete State
  const [deletingSubject, setDeletingSubject] = useState<AdminSubject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered Semesters based on selected Academic Year
  const availableSemesters = useMemo(() => {
    if (selectedAcademicYearId === "ALL") return semesters;
    return semesters.filter((s) => s.academic_year_id === selectedAcademicYearId);
  }, [selectedAcademicYearId, semesters]);

  // Filtered Modules based on selected Semester
  const availableModules = useMemo(() => {
    if (selectedSemesterId === "ALL") return modules;
    return modules.filter((m) => m.semester_id === selectedSemesterId);
  }, [selectedSemesterId, modules]);

  // Filtered Subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchAr = subject.name_ar.toLowerCase().includes(term);
        const matchEn = subject.name_en ? subject.name_en.toLowerCase().includes(term) : false;
        if (!matchAr && !matchEn) return false;
      }

      // University
      if (selectedUniversityId !== "ALL" && subject.university_id !== selectedUniversityId) {
        return false;
      }

      // Academic Year
      if (selectedAcademicYearId !== "ALL" && subject.academic_year_id !== selectedAcademicYearId) {
        return false;
      }

      // Semester
      if (selectedSemesterId !== "ALL" && subject.semester_id !== selectedSemesterId) {
        return false;
      }

      // Module
      if (selectedModuleId !== "ALL" && subject.module_id !== selectedModuleId) {
        return false;
      }

      // Status
      if (selectedStatus === "ACTIVE" && !subject.is_active) return false;
      if (selectedStatus === "INACTIVE" && subject.is_active) return false;

      return true;
    });
  }, [
    subjects,
    searchTerm,
    selectedUniversityId,
    selectedAcademicYearId,
    selectedSemesterId,
    selectedModuleId,
    selectedStatus,
  ]);

  const handleEditClick = (subject: AdminSubject) => {
    setEditingSubject(subject);
    setIsEditModalOpen(true);
  };

  const handleToggleActive = async (subject: AdminSubject) => {
    if (togglingId) return;
    try {
      setTogglingId(subject.id);
      setActionError(null);
      await toggleSubjectActive(subject.id, subject.is_active);
      onRefresh(subject.is_active ? "تم تعطيل المادة بنجاح." : "تم تفعيل المادة بنجاح.");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "فشل تغيير حالة تفعيل المادة."
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSubject) return;

    try {
      setIsDeleting(true);
      setActionError(null);
      await deleteSubject(deletingSubject.id);
      setDeletingSubject(null);
      onRefresh("تم حذف المادة بنجاح.");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "تعذر حذف المادة."
      );
      setDeletingSubject(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedUniversityId("ALL");
    setSelectedAcademicYearId("ALL");
    setSelectedSemesterId("ALL");
    setSelectedModuleId("ALL");
    setSelectedStatus("ALL");
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    selectedUniversityId !== "ALL" ||
    selectedAcademicYearId !== "ALL" ||
    selectedSemesterId !== "ALL" ||
    selectedModuleId !== "ALL" ||
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

      {/* Search & Filters Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث باسم المادة بالعربية أو الإنجليزية..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Quick Refresh & Clear */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                إلغاء الفلاتر
              </button>
            )}
            <button
              onClick={() => onRefresh()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-100 transition-colors cursor-pointer disabled:opacity-50"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* University Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>الجامعة</span>
            </label>
            <select
              value={selectedUniversityId}
              onChange={(e) => setSelectedUniversityId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="ALL">جميع الجامعات</option>
              {universities.map((uni) => (
                <option key={uni.id} value={uni.id}>
                  {uni.name_ar}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>الفرقة الدراسية</span>
            </label>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => {
                setSelectedAcademicYearId(e.target.value);
                setSelectedSemesterId("ALL");
                setSelectedModuleId("ALL");
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="ALL">جميع الفرق</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name_ar}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>الترم</span>
            </label>
            <select
              value={selectedSemesterId}
              onChange={(e) => {
                setSelectedSemesterId(e.target.value);
                setSelectedModuleId("ALL");
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="ALL">جميع الترمات</option>
              {availableSemesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.name_ar}
                </option>
              ))}
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5" />
              <span>الموديول</span>
            </label>
            <select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="ALL">جميع الموديولات</option>
              {availableModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name_ar}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>الحالة</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="ALL">الكل</option>
              <option value="ACTIVE">المفعلة فقط</option>
              <option value="INACTIVE">المعطلة فقط</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count Bar */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
        <span>
          عرض <strong className="text-slate-800 font-bold">{filteredSubjects.length}</strong> مادة
          {subjects.length !== filteredSubjects.length && (
            <span> من إجمالي {subjects.length}</span>
          )}
        </span>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3.5 px-5">اسم المادة</th>
                <th className="py-3.5 px-5">الجامعة والفرقة</th>
                <th className="py-3.5 px-5">الترم والموديول</th>
                <th className="py-3.5 px-5">السعر</th>
                <th className="py-3.5 px-5">الحالة</th>
                <th className="py-3.5 px-5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      <span>جاري تحميل المواد...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-600">لا توجد مواد مطابقة للبحث</p>
                      <p className="text-[11px]">
                        جرب تعديل فلاتر البحث أو اختيار ترم أو موديول آخر.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subject) => {
                  const isToggling = togglingId === subject.id;
                  return (
                    <tr
                      key={subject.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900">
                          {subject.name_ar}
                        </div>
                        {subject.name_en && (
                          <div className="text-[11px] text-slate-400 font-sans">
                            {subject.name_en}
                          </div>
                        )}
                      </td>

                      {/* University and Academic Year */}
                      <td className="py-3.5 px-5 text-slate-600">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-800">{subject.universities?.name_ar || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{subject.academic_years?.name_ar || "—"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Semester and Module */}
                      <td className="py-3.5 px-5">
                        <div className="space-y-1">
                          {subject.modules ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <Boxes className="w-3 h-3 text-indigo-500" />
                              <span>{subject.modules.name_ar}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">بدون موديول</span>
                          )}
                          {subject.semesters && (
                            <div className="text-[11px] text-slate-400">
                              {subject.semesters.name_ar}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-5 font-black text-indigo-600 text-sm">
                        {formatCurrency(subject.price)}
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-5">
                        {subject.is_active ? (
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
                            onClick={() => handleEditClick(subject)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="تعديل المادة والسعر"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Toggle Active Button */}
                          <button
                            onClick={() => handleToggleActive(subject)}
                            disabled={isToggling}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              subject.is_active
                                ? "text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                            }`}
                            title={subject.is_active ? "تعطيل المادة" : "تفعيل المادة"}
                          >
                            {isToggling ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingSubject(subject)}
                            disabled={isDeleting || isToggling}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف المادة نهائياً"
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

      {/* Edit Subject Modal */}
      {editingSubject && (
        <EditSubjectModal
          subject={editingSubject}
          universities={universities}
          academicYears={academicYears}
          semesters={semesters}
          modules={modules}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingSubject(null);
          }}
          onSuccess={() => {
            onRefresh("تم حفظ تعديلات المادة بنجاح.");
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingSubject)}
        title="حذف المادة الدراسية"
        itemName={deletingSubject?.name_ar || ""}
        itemTypeLabel="المادة"
        warningText="إذا كانت هذه المادة مسجلة لدى طلاب في طلبات تسجيل سابقة، سيتم منع الحذف تلقائياً لحماية البيانات ويمكنك تعطيلها بدلاً من ذلك."
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingSubject(null)}
      />
    </div>
  );
}
