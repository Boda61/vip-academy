import { NextRequest, NextResponse } from "next/server";
import { syncRegistrationToSheets } from "@/services/sheetsSyncService";

export const dynamic = "force-dynamic";

// Standard UUID regex pattern
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const { registrationId, sessionToken } = body || {};

    // 1. Validate registrationId format
    if (
      !registrationId ||
      typeof registrationId !== "string" ||
      !UUID_REGEX.test(registrationId.trim())
    ) {
      return NextResponse.json(
        { success: false, error: "A valid registrationId (UUID) is required." },
        { status: 400 }
      );
    }

    // 2. Validate sessionToken presence and format
    if (
      !sessionToken ||
      typeof sessionToken !== "string" ||
      sessionToken.trim().length < 16
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: A valid session token is required to authorize synchronization.",
        },
        { status: 401 }
      );
    }

    // 3. Execute server-side sync with session validation and concurrency guard
    const syncResult = await syncRegistrationToSheets(registrationId.trim(), {
      sessionToken: sessionToken.trim(),
    });

    if (syncResult.isUnauthorized) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Session token does not match this registration.",
        },
        { status: 403 }
      );
    }

    if (syncResult.alreadySynced) {
      return NextResponse.json({
        success: true,
        registration_id: registrationId,
        already_synced: true,
        message: syncResult.message || "Registration already synced.",
      });
    }

    if (syncResult.alreadySyncing) {
      return NextResponse.json({
        success: true,
        registration_id: registrationId,
        already_syncing: true,
        message: syncResult.message || "Synchronization in progress.",
      });
    }

    if (!syncResult.success) {
      return NextResponse.json(
        {
          success: false,
          registration_id: registrationId,
          error: syncResult.error || "Failed to synchronize to Google Sheets.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      registration_id: registrationId,
      is_update: syncResult.isUpdate ?? false,
      row_number: syncResult.rowNumber,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    console.error("[API /api/sync/sheets] Unhandled error:", errorMsg);

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred during synchronization.",
      },
      { status: 500 }
    );
  }
}
