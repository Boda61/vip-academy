"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  itemTypeLabel?: string;
  warningText?: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  title,
  itemName,
  itemTypeLabel = "العنصر",
  warningText = "إذا كان هذا العنصر مرتبطاً ببيانات تسجيلات سابقة أو مواد أخرى، سيمنع النظام الحذف تلقائياً لحماية سلامة البيانات ويمكنك تعطيله بدلاً من ذلك.",
  loading,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Warning Icon & Header */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تأكيد إجراء الحذف النهائي من النظام
              </p>
            </div>
          </div>

          {/* Item Details Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-4">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">
              {itemTypeLabel} المراد حذفه:
            </span>
            <p className="text-sm font-black text-slate-900 break-words">
              {itemName}
            </p>
          </div>

          {/* Warning Description */}
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            {warningText}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-600/20 hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحذف...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>تأكيد الحذف</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
