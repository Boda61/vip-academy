"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminLogout } from "@/services/adminService";
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  BookOpen,
  LogOut,
  X,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
}

export default function AdminSidebar({
  isOpen,
  onClose,
  userName,
  userEmail,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = [
    {
      label: "الرئيسية",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "الجامعات",
      href: "/admin/universities",
      icon: Building2,
      exact: false,
    },
    {
      label: "الفرق الدراسية",
      href: "/admin/academic-years",
      icon: GraduationCap,
      exact: false,
    },
    {
      label: "المواد والأسعار",
      href: "/admin/subjects",
      icon: BookOpen,
      exact: false,
    },
  ];

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await adminLogout();
      router.replace("/admin/login");
    } catch (err) {
      console.error("Logout failed", err);
      router.replace("/admin/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const isItemActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-64 bg-white border-l border-slate-200 z-50 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "translate-x-full md:shadow-none"
        }`}
      >
        {/* Header / Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
          <Link
            href="/admin"
            onClick={onClose}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              VIP
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight text-slate-900">
                  VIP Academy
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">لوحة التحكم المركزية</p>
            </div>
          </Link>

          {/* Close button for mobile drawer */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 md:hidden transition-colors"
            title="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-6 space-y-1.5">
          <div className="px-3 pb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              القائمة الرئيسية
            </p>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      active ? "text-indigo-600" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {active && (
                  <ChevronLeft className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Admin Footer & Logout */}
        <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/50">
          {/* Admin User Info */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-xs font-bold text-slate-800 truncate">
                {userName || "مسؤول النظام"}
              </p>
              {userEmail && (
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {userEmail}
                </p>
              )}
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
