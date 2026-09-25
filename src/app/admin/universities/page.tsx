"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminUniversity } from "@/types";
import { fetchAdminUniversities } from "@/services/adminService";
import UniversityTable from "@/components/admin/UniversityTable";
import AddUniversityModal from "@/components/admin/AddUniversityModal";
import EditUniversityModal from "@/components/admin/EditUniversityModal";
import { Building2, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminUniversitiesPage() {
  const [universities, setUniversities] = useState<AdminUniversity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<AdminUniversity | null>(null);

  const loadData = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchAdminUniversities();
      setUniversities(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل تحميل قائمة الجامعات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const data = await fetchAdminUniversities();
        if (active) {
          setUniversities(data);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "فشل تحميل قائمة الجامعات.");
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-slate-900">
              إدارة الجامعات والكليات
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            إضافة وتعديل بيانات الجامعات، وتفعيلها أو تعطيلها في استمارة التسجيل
          </p>
        </div>

        {/* Add University Action */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة جامعة جديدة</span>
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

      {/* Universities Table */}
      <UniversityTable
        universities={universities}
        loading={loading}
        onEdit={(uni) => setEditingUniversity(uni)}
        onRefresh={(msg) => {
          loadData();
          if (msg) showSuccessNotification(msg);
        }}
      />

      {/* Add University Modal */}
      <AddUniversityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadData();
          showSuccessNotification("تمت إضافة الجامعة بنجاح.");
        }}
      />

      {/* Edit University Modal */}
      <EditUniversityModal
        university={editingUniversity}
        isOpen={Boolean(editingUniversity)}
        onClose={() => setEditingUniversity(null)}
        onSuccess={() => {
          loadData();
          showSuccessNotification("تم حفظ تعديلات الجامعة بنجاح.");
        }}
      />
    </div>
  );
}
