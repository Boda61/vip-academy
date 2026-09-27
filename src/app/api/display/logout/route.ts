import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: "تم تسجيل الخروج بنجاح" });

    // Invalidate and delete the display secret cookie
    response.cookies.set("vip_display_secret", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error during logout";
    console.error("[API /display/logout] Server error:", errorMsg);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الخروج" },
      { status: 500 }
    );
  }
}
