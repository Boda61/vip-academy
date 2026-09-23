import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const configuredSecret = process.env.QR_DISPLAY_SECRET?.trim();

    // 1. Verify display secret if configured in environment
    if (configuredSecret) {
      const headerSecret = request.headers.get("x-display-secret");
      const querySecret = request.nextUrl.searchParams.get("secret");
      const cookieSecret = request.cookies.get("vip_display_secret")?.value;

      const providedSecret = headerSecret || querySecret || cookieSecret;

      if (!providedSecret || providedSecret !== configuredSecret) {
        return NextResponse.json(
          { error: "غير مصرح بالوصول لشاشة العرض" },
          { status: 401 }
        );
      }
    }

    // 2. Initialize server-side Supabase client with service_role privileges
    let supabaseAdmin;
    try {
      supabaseAdmin = getSupabaseServerClient();
    } catch (configErr) {
      const message = configErr instanceof Error ? configErr.message : "Service role configuration error";
      console.error("[API /display/qr] Server configuration error:", message);
      return NextResponse.json(
        { error: "مفتاح SUPABASE_SERVICE_ROLE_KEY غير مضبوط في ملف .env.local على الخادم" },
        { status: 500 }
      );
    }

    // 3. Call protected RPC on Supabase via service role client
    const { data, error } = await supabaseAdmin.rpc("get_or_create_active_qr_token");

    if (error) {
      console.error("[API /display/qr] Supabase RPC execution error:", {
        code: error.code,
        message: error.message,
      });
      return NextResponse.json(
        { error: "تعذر توليد رمز الـ QR من الخادم" },
        { status: 500 }
      );
    }

    if (!data || !data.raw_token || !data.expires_at) {
      console.error("[API /display/qr] Unexpected RPC return structure");
      return NextResponse.json(
        { error: "هيكل استجابة الـ QR غير صالح من قاعدة البيانات" },
        { status: 500 }
      );
    }

    // 4. Set HttpOnly cookie for authenticated display screen session
    const response = NextResponse.json({
      raw_token: data.raw_token,
      expires_at: data.expires_at,
    });

    if (configuredSecret) {
      response.cookies.set("vip_display_secret", configuredSecret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown internal error";
    console.error("[API /display/qr] Unhandled server error:", errorMsg);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع في الخادم" },
      { status: 500 }
    );
  }
}
