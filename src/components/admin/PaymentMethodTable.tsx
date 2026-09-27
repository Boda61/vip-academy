"use client";

import { useState } from "react";
import { AdminPaymentMethod } from "@/types";
import { togglePaymentMethodActive, deletePaymentMethod } from "@/services/adminService";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import {
  Edit,
  Power,
  Trash2,
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Banknote,
} from "lucide-react";

interface PaymentMethodTableProps {
  paymentMethods: AdminPaymentMethod[];
  loading: boolean;
  onEdit: (method: AdminPaymentMethod) => void;
  onRefresh: (successMsg?: string) => void;
}

export default function PaymentMethodTable({
  paymentMethods,
  loading,
  onEdit,
  onRefresh,
}: PaymentMethodTableProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Delete state
  const [deletingMethod, setDeletingMethod] = useState<AdminPaymentMethod | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleActive = async (method: AdminPaymentMethod) => {
    try {
      setTogglingId(method.id);
      setActionError(null);
      await togglePaymentMethodActive(method.id, method.is_active);
      onRefresh(method.is_active ? "تم تعطيل طريقة الدفع بنجاح." : "تم تفعيل طريقة الدفع بنجاح.");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "فشل تغيير حالة تفعيل طريقة الدفع."
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMethod) return;

    try {
      setIsDeleting(true);
      setActionError(null);
      await deletePaymentMethod(deletingMethod.id);
      setDeletingMethod(null);
      onRefresh("تم حذف طريقة الدفع بنجاح.");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "تعذر حذف طريقة الدفع."
      );
      setDeletingMethod(null);
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
                <th className="py-3.5 px-5">طريقة الدفع</th>
                <th className="py-3.5 px-5">الكود البرمجي</th>
                <th className="py-3.5 px-5">الترتيب</th>
                <th className="py-3.5 px-5">الحالة</th>
                <th className="py-3.5 px-5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      <span>جاري تحميل طرق الدفع...</span>
                    </div>
                  </td>
                </tr>
              ) : paymentMethods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CreditCard className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-600">لا توجد طرق دفع مسجلة</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paymentMethods.map((method) => {
                  const isToggling = togglingId === method.id;
                  const isCash = method.code.toLowerCase() === "cash";

                  return (
                    <tr
                      key={method.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {isCash ? (
                              <Banknote className="w-4 h-4" />
                            ) : (
                              <CreditCard className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{method.name_ar}</span>
                              {isCash && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md font-bold">
                                  الافتراضي
                                </span>
                              )}
                            </div>
                            {method.name_en && (
                              <div className="text-[11px] text-slate-400 font-sans">
                                {method.name_en}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-5">
                        <code className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] border border-slate-200/60">
                          {method.code}
                        </code>
                      </td>

                      {/* Order */}
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-xs">
                          {method.display_order}
                        </span>
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-5">
                        {method.is_active ? (
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
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Toggle Active Button */}
                          <button
                            onClick={() => handleToggleActive(method)}
                            disabled={isToggling}
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${
                              method.is_active
                                ? "bg-amber-50 text-amber-600 border-amber-200/80 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-600 border-emerald-200/80 hover:bg-emerald-100"
                            } disabled:opacity-50`}
                            title={method.is_active ? "تعطيل طريقة الدفع" : "تفعيل طريقة الدفع"}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Power className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => onEdit(method)}
                            className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
                            title="تعديل طريقة الدفع"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingMethod(method)}
                            disabled={isCash}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80 hover:bg-rose-100 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isCash ? "لا يمكن حذف وسيلة الدفع الافتراضية" : "حذف طريقة الدفع"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        isOpen={Boolean(deletingMethod)}
        title="حذف طريقة الدفع"
        itemName={deletingMethod?.name_ar || ""}
        itemTypeLabel="طريقة الدفع"
        warningText={`هل أنت متأكد من رغبتك في حذف طريقة الدفع "${deletingMethod?.name_ar}"؟ إذا كانت مرتبطة ببيانات تسجيلات سابقة، يفضل تعطيلها بدلاً من حذفها.`}
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingMethod(null)}
      />
    </div>
  );
}
