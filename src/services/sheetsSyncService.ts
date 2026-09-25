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
 * Sheet Column Layout:
 * - Columns A:J: Visible registration details (Date, Name, Phone, WhatsApp, Country, University, Academic Year, Subjects, Total, Sync Status).
 * - Column K:    Intentionally left empty as a spacer.
 * - Column L:    Internal Registration ID (UUID) used for idempotency checks.
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
 * - Scans Column L of the sheet for an existing Registration ID.
 * - If found, updates the visible columns (A:J) and ensures Column L has the ID.
 * - If not found, appends visible columns (A:J) and writes the ID to Column L of the newly created row.
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

    // 5. Fetch snapshot items with joined subject and module info
    const { data: items, error: itemsError } = await supabaseAdmin
      .from("registration_items")
      .select(`
        subject_name_snapshot,
        unit_price_snapshot,
        subject_id,
        subjects (
          id,
          name_ar,
          module_id,
          modules (
            id,
            name_ar,
            name_en,
            module_order
          )
        )
      `)
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

    // 7. Format registered subjects grouped by module (Column H)
    // Structure: Module 1 - Subject A, Subject B | Module 2 - Subject C
    interface ModuleGroup {
      moduleId: string;
      moduleName: string;
      moduleOrder: number;
      subjects: string[];
    }

    const groupsMap = new Map<string, ModuleGroup>();
    const legacyItems: string[] = [];

    if (items && items.length > 0) {
      for (const item of items) {
        const subjectObj = item.subjects as {
          id?: string;
          name_ar?: string;
          module_id?: string | null;
          modules?: {
            id?: string;
            name_ar?: string;
            name_en?: string;
            module_order?: number;
          } | {
            id?: string;
            name_ar?: string;
            name_en?: string;
            module_order?: number;
          }[] | null;
        } | null;

        const rawModule = subjectObj?.modules;
        const moduleData = Array.isArray(rawModule) ? rawModule[0] : rawModule;
        const moduleId = subjectObj?.module_id || moduleData?.id;

        if (moduleId && moduleData) {
          const moduleName = moduleData.name_ar || moduleData.name_en || "موديول";
          const moduleOrder =
            typeof moduleData.module_order === "number" ? moduleData.module_order : 999;

          if (!groupsMap.has(moduleId)) {
            groupsMap.set(moduleId, {
              moduleId,
              moduleName,
              moduleOrder,
              subjects: [],
            });
          }
          groupsMap.get(moduleId)!.subjects.push(item.subject_name_snapshot);
        } else {
          // Legacy subject without module (preserve snapshot text)
          legacyItems.push(item.subject_name_snapshot);
        }
      }
    }

    // Sort module groups by module_order ascending
    const sortedGroups = Array.from(groupsMap.values()).sort(
      (a, b) => a.moduleOrder - b.moduleOrder
    );

    const formattedModuleStrings = sortedGroups.map(
      (g) => `${g.moduleName} - ${g.subjects.join(", ")}`
    );

    if (legacyItems.length > 0) {
      formattedModuleStrings.push(legacyItems.join(", "));
    }

    const registeredSubjectsFormatted =
      formattedModuleStrings.length > 0
        ? formattedModuleStrings.join(" | ")
        : "لا توجد مواد";

    const formattedDate = registration.created_at
      ? new Date(registration.created_at).toISOString()
      : new Date().toISOString();

    // 8. Build visible row values for Google Sheets (Columns A:J)
    // Structure:
    // - Columns A:J = Visible registration data
    // - Column K    = Intentionally left empty
    // - Column L    = Internal Registration ID (UUID) used for idempotency
    const rowValues = [
      formattedDate, // A: Registration Date
      registration.full_name, // B: Student Name
      registration.phone_number, // C: Phone
      registration.whatsapp_number, // D: WhatsApp
      registration.country, // E: Country
      universityName, // F: University
      academicYearName, // G: Academic Year
      registeredSubjectsFormatted, // H: Registered Subjects
      Number(registration.total_amount).toFixed(2), // I: Total Amount
      "synced", // J: Sync Status
    ];

    // 9. Connect to Google Sheets API
    const sheets = getGoogleSheetsClient();
    const { spreadsheetId, sheetName } = getGoogleSheetsConfig();

    // 10. Check Column L for existing Registration ID (Idempotency)
    // Column L holds the unique registration UUID so the sheet can be updated without showing UUID in visible columns A:J.
    const columnLResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!L:L`,
    });

    const existingRows = columnLResponse.data.values || [];
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
      // Row exists -> Update visible columns A:J in place
      isUpdate = true;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${existingRowIndex}:J${existingRowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowValues],
        },
      });

      // Ensure internal Registration ID in Column L is set
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!L${existingRowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[registration.id]],
        },
      });
    } else {
      // Row does not exist -> Append visible columns A:J
      isUpdate = false;
      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:J`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [rowValues],
        },
      });

      // Determine the newly created row number from append response
      const updatedRange = appendResponse.data.updates?.updatedRange;
      if (updatedRange) {
        const match = updatedRange.match(/A(\d+)/);
        if (match) {
          targetRowNumber = parseInt(match[1], 10);
        }
      }

      // Write the internal Registration ID to Column L for idempotency tracking
      if (targetRowNumber > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!L${targetRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[registration.id]],
          },
        });
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
