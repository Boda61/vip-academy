"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminSubject, AdminSemester, AdminModule } from "@/types";
import {
  UniversityOption,
  AcademicYearOption,
  fetchUniversities,
  fetchAcademicYears,
} from "@/services/registrationService";
import {
  fetchAdminSubjects,
  fetchAdminSemesters,
  fetchAdminModules,
} from "@/services/adminService";
import SubjectTable from "@/components/admin/SubjectTable";
import AddSubjectModal from "@/components/admin/AddSubjectModal";
import { BookOpen, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [semesters, setSemesters] = useState<AdminSemester[]>([]);
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadData = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setLoading(true);
    }
    setError(null);
    try {
      const [subjectsList, unisList, yearsList, semList, modList] = await Promise.all([
        fetchAdminSubjects(),
        fetchUniversities(),
        fetchAcademicYears(),
        fetchAdminSemesters(),
        fetchAdminModules(),
      ]);

      setSubjects(subjectsList);
      setUniversities(unisList);
      setAcademicYears(yearsList);
      setSemesters(semList);
      setModules(modList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل تحميل قائمة المواد الدراسية.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [subjectsList, unisList, yearsList, semList, modList] = await Promise.all([
          fetchAdminSubjects(),
          fetchUniversities(),
          fetchAcademicYears(),
          fetchAdminSemesters(),
          fetchAdminModules(),
        ]);
        if (active) {
          setSubjects(subjectsList);
          setUniversities(unisList);
          setAcademicYears(yearsList);
          setSemesters(semList);
          setModules(modList);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "فشل تحميل قائمة المواد الدراسية.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  const showSuccessNotification = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-slate-900">
              إدارة المواد والأسعار
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            تحديث أسعار المواد، ربطها بالموديولات والترمات، تفعيلها أو تعطيلها، وإضافة مواد جديدة
          </p>
        </div>

        {/* Add Subject Action */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={loading || universities.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>إضافة مادة جديدة</span>
        </button>
      </div>

      {/* Success Notification Toast */}
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-bold">{successToast}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">حدث خطأ أثناء تحميل البيانات</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => loadData()}
            className="px-3 py-1 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Subjects Table & Filters */}
      <SubjectTable
        subjects={subjects}
        universities={universities}
        academicYears={academicYears}
        semesters={semesters}
        modules={modules}
        loading={loading}
        onRefresh={(msg) => {
          loadData();
          if (msg) showSuccessNotification(msg);
        }}
      />

      {/* Add Subject Modal */}
      <AddSubjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        universities={universities}
        academicYears={academicYears}
        semesters={semesters}
        modules={modules}
        onSuccess={() => {
          loadData();
          showSuccessNotification("تمت إضافة المادة بنجاح.");
        }}
      />
    </div>
  );
}
