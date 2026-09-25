"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAdminStats } from "@/services/adminService";
import { AdminStats } from "@/types";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Building2,
  GraduationCap,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        setLoading(true);
        const data = await fetchAdminStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to load admin stats", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>لوحة الإدارة المركزية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            مرحباً بك في لوحة تحكم VIP Academy
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            يمكنك من هنا إدارة الجامعات الشريكة، الفرق الدراسية، المواد وقوائم الأسعار لحظياً، مع التحكم الكامل في العناصر المتاحة للطلاب في استمارة التسجيل.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/subjects"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>المواد والأسعار</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Link
            href="/admin/universities"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-slate-600" />
            <span>إدارة الجامعات</span>
          </Link>
          <Link
            href="/admin/academic-years"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 text-slate-600" />
            <span>الفرق الدراسية</span>
          </Link>
        </div>
      </div>

      {/* Stats Overview Grid */}
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
            <span className="text-xs font-bold text-slate-500">المواد غير المفعلة</span>
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

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Realtime Price & Catalog Sync Info */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-slate-900">
            تزامن فوري ومحكم مع استمارة الطلاب
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            أي تعديل في الجامعات، الفرق، المواد، أو الأسعار ينعكس مباشرة وفورياً في استمارة التسجيل. دالة السيرفر تحسب الأسعار حصراً من جدول المواد المفعل بالداتابيز لمنع أي تلاعب.
          </p>
        </div>

        {/* Database Level Security Info */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-slate-900">
            أمان متكامل على مستوى قاعدة البيانات (RLS)
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            جميع عمليات الإضافة والتعديل والتعطيل مؤمنة بسياسات Row-Level Security في Supabase، ولا يمكن لأي مستخدم عادي أو طرف ثالث إجراء أي تعديلات دون التحقق من صلاحيات المسؤول.
          </p>
        </div>
      </div>
    </div>
  );
}
