"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fetchAdminStats, fetchRegistrationAnalytics } from "@/services/adminService";
import { AdminStats, RegistrationAnalytics } from "@/types";
import { formatCurrency } from "@/utils";
import RegistrationTrendChart from "@/components/admin/RegistrationTrendChart";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Building2,
  GraduationCap,
  CalendarDays,
  Boxes,
  ArrowLeft,
  Sparkles,
  Users,
  Calendar,
  Clock,
  Coins,
  RefreshCw,
  AlertCircle,
  Activity,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<RegistrationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isInitial = false) => {
    if (!isInitial) setLoading(true);
    setError(null);
    try {
      const [statsData, analyticsData] = await Promise.all([
        fetchAdminStats(),
        fetchRegistrationAnalytics(),
      ]);
      setStats(statsData);
      setAnalytics(analyticsData);
    } catch (err: unknown) {
      console.error("Failed to load dashboard data:", err);
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تحميل بيانات لوحة التحكم.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [statsData, analyticsData] = await Promise.all([
          fetchAdminStats(),
          fetchRegistrationAnalytics(),
        ]);
        if (active) {
          setStats(statsData);
          setAnalytics(analyticsData);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "حدث خطأ أثناء تحميل بيانات لوحة التحكم.");
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

  return (
    <div className="space-y-8" dir="rtl">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>لوحة الإدارة المركزية</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              مرحباً بك في لوحة تحكم VIP Academy
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              إدارة شاملة لطلبات التسجيل، الجامعات الشريكة، الفرق الدراسية، الترمات، الموديولات، والمواد والأسعار مع متابعة مؤشرات النشاط اللحظية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </button>
            <Link
              href="/admin/subjects"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>المواد والأسعار</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Quick Links Row */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-400">روابط سريعة:</span>
          <Link
            href="/admin/universities"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200/60 transition-all cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>إدارة الجامعات</span>
          </Link>
          <Link
            href="/admin/academic-years"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200/60 transition-all cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
            <span>الفرق الدراسية</span>
          </Link>
          <Link
            href="/admin/semesters"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200/60 transition-all cursor-pointer"
          >
            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
            <span>الترمات</span>
          </Link>
          <Link
            href="/admin/modules"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200/60 transition-all cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5 text-slate-500" />
            <span>الموديولات</span>
          </Link>
          <Link
            href="/admin/subjects"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200/60 transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>دليل المواد</span>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">تعذر تحميل بعض البيانات</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => loadData()}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* SECTION 1: REGISTRATION ANALYTICS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              نشاط وتحليلات التسجيلات
            </h2>
            <p className="text-xs text-slate-400">
              إحصائيات التسجيلات المباشرة محسوبة بتوقيت القاهرة
            </p>
          </div>
        </div>

        {/* Analytics Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Today's Registrations */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all hover:border-indigo-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">تسجيلات اليوم</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-indigo-600">
              {loading ? (
                <div className="h-8 w-14 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                analytics?.today_count ?? 0
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">تاريخ اليوم بتوقيت مصر</p>
          </div>

          {/* 2. Last 7 Days */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all hover:border-indigo-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">آخر 7 أيام</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {loading ? (
                <div className="h-8 w-14 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                analytics?.last_7_days_count ?? 0
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">خلال الـ 7 أيام الأخيرة</p>
          </div>

          {/* 3. This Month */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all hover:border-indigo-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">هذا الشهر</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {loading ? (
                <div className="h-8 w-14 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                analytics?.this_month_count ?? 0
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">إجمالي الشهر الحالي</p>
          </div>

          {/* 4. Total Registrations */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all hover:border-indigo-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">إجمالي التسجيلات</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {loading ? (
                <div className="h-8 w-14 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                analytics?.total_registrations ?? 0
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">العدد الكلي للنظام</p>
          </div>

          {/* 5. Today's Total Amount */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all hover:border-indigo-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">قيمة تسجيلات اليوم</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 truncate">
              {loading ? (
                <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                formatCurrency(analytics?.today_amount ?? 0)
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">مبالغ التسجيلات لليوم</p>
          </div>
        </div>

        {/* 7-Day Trend Chart */}
        <RegistrationTrendChart
          trend={analytics?.seven_days_trend || []}
          loading={loading}
        />
      </div>

      {/* SECTION 2: ACADEMIC & CATALOG OVERVIEW */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              حالة دليل المواد والجامعات
            </h2>
            <p className="text-xs text-slate-400">
              ملخص الكليات والفرق والمواد المسجلة في النظام
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Universities */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">عدد الجامعات</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {loading ? "..." : stats?.totalUniversities || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats ? `${stats.activeUniversities} مفعلة` : "جاري التحميل"}
            </p>
          </div>

          {/* Total Academic Years */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">عدد الفرق</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {loading ? "..." : stats?.totalAcademicYears || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats ? `${stats.activeAcademicYears} مفعلة` : "جاري التحميل"}
            </p>
          </div>

          {/* Total Subjects */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">إجمالي المواد</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {loading ? "..." : stats?.totalSubjects || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">كافة المواد بالدليل</p>
          </div>

          {/* Active Subjects */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">المواد المفعلة</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {loading ? "..." : stats?.activeSubjects || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">متاحة للتسجيل حالياً</p>
          </div>

          {/* Inactive Subjects */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">المواد المعطلة</span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-700">
              {loading ? "..." : stats?.inactiveSubjects || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">معطلة ومخفية</p>
          </div>
        </div>
      </div>
    </div>
  );
}
