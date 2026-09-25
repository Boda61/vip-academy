"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminSemester } from "@/types";
import { fetchAdminSemesters, fetchAdminAcademicYears } from "@/services/adminService";
import { AcademicYearOption } from "@/services/registrationService";
import SemesterTable from "@/components/admin/SemesterTable";
import AddSemesterModal from "@/components/admin/AddSemesterModal";
import { CalendarDays, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminSemestersPage() {
  const [semesters, setSemesters] = useState<AdminSemester[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadData = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setLoading(true);
    }
    setError(null);
    try {
      const [semestersData, yearsData] = await Promise.all([
        fetchAdminSemesters(),
        fetchAdminAcademicYears(),
      ]);
      setSemesters(semestersData);
      setAcademicYears(yearsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل تحميل قائمة الترمات الدراسية.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [semestersData, yearsData] = await Promise.all([
          fetchAdminSemesters(),
          fetchAdminAcademicYears(),
        ]);
        if (active) {
          setSemesters(semestersData);
          setAcademicYears(yearsData);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "فشل تحميل قائمة الترمات الدراسية.");
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
              <CalendarDays className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-slate-900">
              إدارة الترمات الدراسية
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            إدارة الفصول الدراسية لكل فرقة، ترتيبها، وتفعيلها أو تعطيلها في استمارة التسجيل
          </p>
        </div>

        {/* Add Semester Action */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة ترم جديد</span>
        </button>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-bold">{successToast}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadData()}
            className="px-3 py-1 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Semesters Table */}
      <SemesterTable
        semesters={semesters}
        academicYears={academicYears}
        loading={loading}
        onRefresh={(msg) => {
          loadData();
          if (msg) showSuccessNotification(msg);
        }}
      />

      {/* Add Semester Modal */}
      <AddSemesterModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadData();
          showSuccessNotification("تمت إضافة الترم بنجاح.");
        }}
        academicYears={academicYears}
      />
    </div>
  );
}
