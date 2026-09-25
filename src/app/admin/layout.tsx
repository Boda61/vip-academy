"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { checkAdminAuth, AdminAuthCheckResponse } from "@/services/adminService";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { Loader2, ShieldAlert } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AdminAuthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    let mounted = true;

    async function verifyAuth() {
      if (isLoginPage) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await checkAdminAuth();
        if (mounted) {
          if (!res.isAdmin) {
            router.replace("/admin/login");
          } else {
            setAuthStatus(res);
          }
        }
      } catch {
        if (mounted) {
          router.replace("/admin/login");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    verifyAuth();

    return () => {
      mounted = false;
    };
  }, [pathname, isLoginPage, router]);

  // Render Login page directly without the Admin layout shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-700">
          جاري التحقق من صلاحيات المسؤول...
        </p>
      </div>
    );
  }

  // Unauthorized fallback (while router.replace executes)
  if (!authStatus?.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-4 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-sm font-bold text-slate-900 mb-1">
          غير مصرح بالوصول
        </h2>
        <p className="text-xs text-slate-500">جاري توجيهك إلى صفحة تسجيل الدخول...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex" dir="rtl">
      {/* Admin Sidebar (Fixed right on desktop, drawer on mobile) */}
      <AdminSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        userName={authStatus.fullName}
        userEmail={authStatus.email}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:mr-64 transition-all">
        <AdminHeader
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          userName={authStatus.fullName}
          userEmail={authStatus.email}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="w-full border-t border-slate-200/80 bg-white py-5 text-center text-xs text-slate-400">
          VIP Academy &copy; {new Date().getFullYear()} — نظام الإدارة الأكاديمية والأسعار
        </footer>
      </div>
    </div>
  );
}
