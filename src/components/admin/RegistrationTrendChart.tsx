"use client";

import { RegistrationTrendItem } from "@/types";
import { formatCurrency } from "@/utils";
import { TrendingUp, Calendar } from "lucide-react";

interface RegistrationTrendChartProps {
  trend: RegistrationTrendItem[];
  loading?: boolean;
}

export default function RegistrationTrendChart({
  trend,
  loading = false,
}: RegistrationTrendChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs animate-pulse">
        <div className="h-6 w-48 bg-slate-100 rounded-lg mb-6"></div>
        <div className="h-48 bg-slate-50 rounded-2xl"></div>
      </div>
    );
  }

  // Find max count to scale bar heights appropriately (minimum scale ceiling of 5 for nice visual proportion)
  const maxCount = Math.max(...trend.map((item) => item.count), 5);
  const total7Days = trend.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              التسجيلات خلال آخر 7 أيام
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              متابعة النشاط اليومي للطلاب المسجلين (توقيت القاهرة)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>إجمالي 7 أيام:</span>
            <strong className="text-indigo-600 font-black">{total7Days}</strong>
          </span>
        </div>
      </div>

      {/* Chart Bars Grid */}
      <div className="pt-4 pb-2">
        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-52 px-2">
          {trend.map((item, index) => {
            const heightPercent = Math.max(
              Math.round((item.count / maxCount) * 100),
              item.count > 0 ? 12 : 4
            );
            const isToday = index === trend.length - 1;

            // Format date to DD/MM
            const dateParts = item.date.split("-");
            const shortDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : item.date;

            return (
              <div
                key={item.date}
                className="flex flex-col items-center h-full justify-end group relative"
              >
                {/* Floating Tooltip */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg">
                  <div>{item.count} تسجيل</div>
                  {item.amount > 0 && (
                    <div className="text-indigo-300 font-normal">
                      {formatCurrency(item.amount)}
                    </div>
                  )}
                </div>

                {/* Count indicator on top of bar */}
                <span
                  className={`text-xs font-black mb-1.5 transition-colors ${
                    item.count > 0
                      ? isToday
                        ? "text-indigo-600"
                        : "text-slate-800"
                      : "text-slate-300"
                  }`}
                >
                  {item.count}
                </span>

                {/* Bar Track & Fill */}
                <div className="w-full max-w-[48px] bg-slate-100/80 rounded-xl flex items-end p-1 h-36">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-lg transition-all duration-500 ease-out ${
                      item.count > 0
                        ? isToday
                          ? "bg-indigo-600 shadow-sm shadow-indigo-600/30 group-hover:bg-indigo-700"
                          : "bg-indigo-400 group-hover:bg-indigo-500"
                        : "bg-slate-200/50"
                    }`}
                  />
                </div>

                {/* Day Name & Date Label */}
                <div className="text-center mt-2.5 space-y-0.5">
                  <span
                    className={`block text-[11px] font-bold truncate max-w-[50px] sm:max-w-none ${
                      isToday ? "text-indigo-600 font-black" : "text-slate-700"
                    }`}
                  >
                    {item.day_name_ar}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    {shortDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
