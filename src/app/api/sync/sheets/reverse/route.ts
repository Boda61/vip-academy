import { NextRequest, NextResponse } from "next/server";
import {
  processSheetRowEdit,
  processSheetRowDeletion,
  performFullReverseSync,
  SheetRowData,
} from "@/services/sheetsReverseSyncService";

export const dynamic = "force-dynamic";

// Standard UUID regex pattern
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates the shared secret used to authenticate Google Apps Script requests.
 * NEVER exposes or logs the actual secret value.
 */
function validateSyncSecret(request: NextRequest): boolean {
  const secret = process.env.SHEETS_SYNC_SECRET;
  if (!secret || secret.trim().length < 16) {
    console.error(
      "[API /api/sync/sheets/reverse] SHEETS_SYNC_SECRET is not configured or too short."
    );
    return false;
  }

  const authHeader = request.headers.get("x-sync-secret");
  if (!authHeader || authHeader.trim() !== secret.trim()) {
    return false;
  }

  return true;
}

/**
 * POST /api/sync/sheets/reverse
 *
 * Handles reverse synchronization from Google Sheets to Supabase.
 *
 * Request body must include:
 *   - action: "edit" | "delete" | "full_sync"
 *   - For "edit": { registrationId, fullName?, phoneNumber?, whatsappNumber?, country? }
 *   - For "delete": { registrationId }
 *   - For "full_sync": no additional data needed
 *
 * Authentication:
 *   - Requires x-sync-secret header matching SHEETS_SYNC_SECRET env var
 *   - This ensures only the authorized Google Apps Script can trigger syncs
 *
 * Safety:
 *   - NEVER performs DELETE FROM registrations
 *   - Only updates whitelisted fields
 *   - Validates all incoming data
 *   - Logs all operations
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the request
    if (!validateSyncSecret(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing sync secret." },
        { status: 401 }
      );
    }

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const { action } = body || {};

    if (!action || !["edit", "delete", "full_sync"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be one of: "edit", "delete", "full_sync".',
        },
        { status: 400 }
      );
    }

    // 3. Handle each action type
    switch (action) {
      // ---- EDIT: Single row edit from Google Sheets ----
      case "edit": {
        const { registrationId, fullName, phoneNumber, whatsappNumber, country } =
          body as SheetRowData & { action: string };

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

        const result = await processSheetRowEdit({
          registrationId: registrationId.trim(),
          fullName,
          phoneNumber,
          whatsappNumber,
          country,
        });

        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              registration_id: registrationId,
              error: result.error,
            },
            { status: 422 }
          );
        }

        return NextResponse.json({
          success: true,
          registration_id: registrationId,
          fields_updated: result.fieldsUpdated || [],
          skipped: result.skipped || false,
          message: result.message,
        });
      }

      // ---- DELETE: Row removed from Google Sheets ----
      case "delete": {
        const { registrationId } = body;

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

        const result = await processSheetRowDeletion(registrationId.trim());

        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              registration_id: registrationId,
              action: result.action,
              error: result.error,
            },
            { status: 422 }
          );
        }

        return NextResponse.json({
          success: true,
          registration_id: registrationId,
          action: result.action,
          message: result.message,
        });
      }

      // ---- FULL_SYNC: Compare all Sheet rows with Supabase ----
      case "full_sync": {
        const result = await performFullReverseSync();

        return NextResponse.json({
          success: result.success,
          total_processed: result.totalProcessed,
          total_errors: result.totalErrors,
          edits_count: result.edits.length,
          deletions_count: result.deletions.length,
          edits: result.edits,
          deletions: result.deletions,
          message: result.message,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Unknown action." },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[API /api/sync/sheets/reverse] Unhandled error:", errorMsg);

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred during reverse synchronization.",
      },
      { status: 500 }
    );
  }
}
