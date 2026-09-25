import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getGoogleSheetsClient, getGoogleSheetsConfig } from "@/lib/googleSheets";

export interface SyncOptions {
  sessionToken?: string;
  allowAdminBypass?: boolean;
}

export interface SyncResult {
  success: boolean;
  registrationId: string;
  isUpdate?: boolean;
  rowNumber?: number;
  alreadySynced?: boolean;
  alreadySyncing?: boolean;
  isUnauthorized?: boolean;
  error?: string;
  message?: string;
}

/**
 * Synchronizes a single registration record from Supabase to Google Sheets.
 *
 * Security:
 * - Requires a matching sessionToken belonging to the registration session (or internal admin bypass).
 * - Never returns or leaks credentials.
 *
 * Concurrency Guard:
 * - Atomically locks sync_status to 'syncing' to prevent concurrent executions from creating duplicate rows.
 * - If already 'syncing' or 'synced', gracefully exits without creating duplicate entries.
 *
 * Idempotency Guarantee:
 * - Scans Column A of the sheet for an existing Registration ID.
 * - If found, updates the existing row in-place.
 * - If not found, appends a new row to the sheet.
 */
export async function syncRegistrationToSheets(
  registrationId: string,
  options?: SyncOptions
): Promise<SyncResult> {
  const supabaseAdmin = getSupabaseServerClient();

  try {
    if (!registrationId || typeof registrationId !== "string") {
      return {
        success: false,
        registrationId: registrationId || "",
        error: "Invalid or missing registration ID.",
      };
    }

    // 1. Fetch registration details and linked session token for authentication
    const { data: registration, error: regError } = await supabaseAdmin
      .from("registrations")
      .select(
        `
        id,
        session_id,
        full_name,
        phone_number,
        whatsapp_number,
        country,
        total_amount,
        status,
        sync_status,
        created_at,
        university_id,
        academic_year_id,
        universities (name_ar, name_en),
        academic_years (name_ar, name_en),
        registration_sessions (session_token)
      `
      )
      .eq("id", registrationId)
      .maybeSingle();

    if (regError || !registration) {
      return {
        success: false,
        registrationId,
        isUnauthorized: true,
        error: "Registration not found or unauthorized.",
      };
    }

    // 2. Authorize request: verify sessionToken matches the registration's session
    const sessionTokenInDb = (
      registration.registration_sessions as { session_token?: string } | null
    )?.session_token;

    const providedToken = options?.sessionToken?.trim();
    const isAdminBypass = options?.allowAdminBypass === true;

    if (!isAdminBypass) {
      if (!providedToken || !sessionTokenInDb || providedToken !== sessionTokenInDb) {
        return {
          success: false,
          registrationId,
          isUnauthorized: true,
          error: "Unauthorized: Invalid or mismatched session token.",
        };
      }
    }

    // 3. Check existing sync state
    if (registration.sync_status === "synced") {
      return {
        success: true,
        registrationId,
        alreadySynced: true,
        message: "Registration is already synchronized.",
      };
    }

    if (registration.sync_status === "syncing") {
      return {
        success: true,
        registrationId,
        alreadySyncing: true,
        message: "Synchronization is already in progress.",
      };
    }

    // 4. Concurrency Guard: Atomically acquire 'syncing' status lock
    const { data: lockedRow, error: lockError } = await supabaseAdmin
      .from("registrations")
      .update({
        sync_status: "syncing",
        sync_error: null,
      })
      .eq("id", registrationId)
      .in("sync_status", ["pending", "failed"])
      .select("id")
      .maybeSingle();

    if (lockError || !lockedRow) {
      // Another concurrent process already acquired the lock
      return {
        success: true,
        registrationId,
        alreadySyncing: true,
        message: "Concurrent synchronization attempt avoided.",
      };
    }

    // 5. Fetch snapshot items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from("registration_items")
      .select("subject_name_snapshot, unit_price_snapshot")
      .eq("registration_id", registrationId);

    if (itemsError) {
      throw new Error(
        `Failed to retrieve registration items: ${itemsError.message}`
      );
    }

    // 6. Resolve university and academic year text
    const universityName =
      (registration.universities as { name_ar?: string; name_en?: string } | null)
        ?.name_ar ||
      (registration.universities as { name_ar?: string; name_en?: string } | null)
        ?.name_en ||
      "غير محدد";

    const academicYearName =
      (registration.academic_years as { name_ar?: string; name_en?: string } | null)
        ?.name_ar ||
      (registration.academic_years as { name_ar?: string; name_en?: string } | null)
        ?.name_en ||
      "غير محدد";

    // 7. Format registered subjects snapshot list
    const registeredSubjectsFormatted =
      items && items.length > 0
        ? items
            .map(
              (item) =>
                `${item.subject_name_snapshot} (${Number(
                  item.unit_price_snapshot
                ).toFixed(2)} EGP)`
            )
            .join(", ")
        : "لا توجد مواد";

    const formattedDate = registration.created_at
      ? new Date(registration.created_at).toISOString()
      : new Date().toISOString();

    // 8. Build row values for Google Sheets (Columns A:K)
    const rowValues = [
      registration.id, // A: Registration ID
      formattedDate, // B: Registration Date
      registration.full_name, // C: Student Name
      registration.phone_number, // D: Phone
      registration.whatsapp_number, // E: WhatsApp
      registration.country, // F: Country
      universityName, // G: University
      academicYearName, // H: Academic Year
      registeredSubjectsFormatted, // I: Registered Subjects
      Number(registration.total_amount).toFixed(2), // J: Total Amount
      "synced", // K: Sync Status
    ];

    // 9. Connect to Google Sheets API
    const sheets = getGoogleSheetsClient();
    const { spreadsheetId, sheetName } = getGoogleSheetsConfig();

    // 10. Check Column A for existing Registration ID (Idempotency)
    const columnAResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const existingRows = columnAResponse.data.values || [];
    let existingRowIndex = -1;

    for (let i = 0; i < existingRows.length; i++) {
      const cellValue = existingRows[i]?.[0];
      if (cellValue && String(cellValue).trim() === registration.id.trim()) {
        existingRowIndex = i + 1; // 1-indexed for Sheets API
        break;
      }
    }

    let isUpdate = false;
    let targetRowNumber = existingRowIndex;

    if (existingRowIndex > 0) {
      // Row exists -> Update in place
      isUpdate = true;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${existingRowIndex}:K${existingRowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowValues],
        },
      });
    } else {
      // Row does not exist -> Append new row
      isUpdate = false;
      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:K`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [rowValues],
        },
      });

      const updatedRange = appendResponse.data.updates?.updatedRange;
      if (updatedRange) {
        const match = updatedRange.match(/A(\d+)/);
        if (match) {
          targetRowNumber = parseInt(match[1], 10);
        }
      }
    }

    // 11. Update Supabase with success status
    const nowIso = new Date().toISOString();
    await supabaseAdmin
      .from("registrations")
      .update({
        sync_status: "synced",
        synced_at: nowIso,
        sync_error: null,
      })
      .eq("id", registrationId);

    return {
      success: true,
      registrationId,
      isUpdate,
      rowNumber: targetRowNumber > 0 ? targetRowNumber : undefined,
    };
  } catch (err: unknown) {
    const rawErrorMessage =
      err instanceof Error ? err.message : "Unknown error during Google Sheets sync";

    const sanitizedError = rawErrorMessage.slice(0, 500);

    const errorStatus =
      (err as { status?: number; code?: number })?.status ||
      (err as { code?: number })?.code;

    console.error("[sheetsSyncService] Google Sheets sync failed:", {
      registrationId,
      error: sanitizedError,
      status: errorStatus,
    });

    // Update Supabase with failed status on error so it can be retried later
    try {
      await supabaseAdmin
        .from("registrations")
        .update({
          sync_status: "failed",
          sync_error: sanitizedError,
        })
        .eq("id", registrationId);
    } catch (dbUpdateErr) {
      console.error("[sheetsSyncService] Failed to record sync failure in database:", dbUpdateErr);
    }

    return {
      success: false,
      registrationId,
      error: sanitizedError,
    };
  }
}
