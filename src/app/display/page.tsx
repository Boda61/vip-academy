import type { Metadata } from "next";
import QRDisplay from "@/components/display/QRDisplay";

export const metadata: Metadata = {
  title: "شاشة التسجيل | VIP Academy",
  description: "شاشة عرض رمز الاستجابة السريعة (QR) لتسجيل الطلاب في الأكاديمية",
};

export default function DisplayPage() {
  return <QRDisplay />;
}
