"use client";

import { usePathname } from "next/navigation";
import { Menu, ShieldCheck } from "lucide-react";

interface AdminHeaderProps {
  onOpenSidebar: () => void;
  userName?: string;
  userEmail?: string;
}

export default function AdminHeader({
  onOpenSidebar,
  userName,
  userEmail,
}: AdminHeaderProps) {
  const pathname = usePathname();

  const getPageDetails = () => {
    if (pathname === "/admin") {
      return { title: "لوحة التحكم", subtitle: "نظرة عامة على النظام والإحصائيات" };
    }
    if (pathname.startsWith("/admin/universities")) {
      return { title: "إدارة الجامعات", subtitle: "إضافة وتعديل وتفعيل الجامعات الشريكة" };
    }
    if (pathname.startsWith("/admin/academic-years")) {
      return { title: "الفرق الدراسية", subtitle: "إدارة الفرق الأكاديمية وترتيبها" };
    }
    if (pathname.startsWith("/admin/subjects")) {
      return { title: "المواد والأسعار", subtitle: "إدارة المواد الدراسية وقوائم الأسعار" };
    }
    return { title: "لوحة الإدارة", subtitle: "نظام إدارة VIP Academy" };
  };

  const details = getPageDetails();

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Mobile Menu Button + Page Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSidebar}
              className="p-2 -mr-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors"
              title="فتح القائمة الجانبية"
              aria-label="القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {details.title}
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                {details.subtitle}
              </p>
            </div>
          </div>

          {/* User Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {userName || "مسؤول النظام"}
                </p>
                {userEmail && (
                  <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                    {userEmail}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
