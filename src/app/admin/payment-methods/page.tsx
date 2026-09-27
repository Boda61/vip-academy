"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminPaymentMethod } from "@/types";
import { fetchAdminPaymentMethods } from "@/services/adminService";
import PaymentMethodTable from "@/components/admin/PaymentMethodTable";
import AddPaymentMethodModal from "@/components/admin/AddPaymentMethodModal";
import EditPaymentMethodModal from "@/components/admin/EditPaymentMethodModal";
import { CreditCard, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminPaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<AdminPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<AdminPaymentMethod | null>(null);

  const loadData = useCallback(async (isInitial = false) => {
    if (!isInitial) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchAdminPaymentMethods();
      setPaymentMethods(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل تحميل قائمة طرق الدفع.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const data = await fetchAdminPaymentMethods();
        if (active) {
          setPaymentMethods(data);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "فشل تحميل قائمة طرق الدفع.");
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

  const nextOrder = paymentMethods.length > 0 
    ? Math.max(...paymentMethods.map(p => p.display_order)) + 1 
    : 1;

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
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-slate-900">
              إدارة طرق الدفع
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            إدارة وسائل الدفع المتاحة للطلاب (كاش، إنستاباي، فودافون كاش، بطاقات بنكية) والتحكم في تفعيلها
          </p>
        </div>

        {/* Add Payment Method Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة طريقة دفع</span>
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

      {/* Payment Methods Table */}
      <PaymentMethodTable
        paymentMethods={paymentMethods}
        loading={loading}
        onEdit={(method) => setEditingMethod(method)}
        onRefresh={(msg) => {
          loadData();
          if (msg) showSuccessNotification(msg);
        }}
      />

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadData();
          showSuccessNotification("تمت إضافة طريقة الدفع بنجاح.");
        }}
        nextOrder={nextOrder}
      />

      {/* Edit Payment Method Modal */}
      <EditPaymentMethodModal
        method={editingMethod}
        isOpen={Boolean(editingMethod)}
        onClose={() => setEditingMethod(null)}
        onSuccess={() => {
          loadData();
          showSuccessNotification("تم حفظ التعديلات على طريقة الدفع بنجاح.");
        }}
      />
    </div>
  );
}
