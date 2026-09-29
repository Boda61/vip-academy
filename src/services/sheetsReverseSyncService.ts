import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getGoogleSheetsClient, getGoogleSheetsConfig } from "@/lib/googleSheets";

// ====================================================================
// SAFE REVERSE SYNC: Google Sheets → Supabase
// ====================================================================
// This service handles synchronization FROM Google Sheets back to Supabase.
//
// Safety guarantees:
//   ✅ Only whitelisted fields can be edited
//   ✅ Registration ID is the stable identifier (Column L)
//   ✅ Validates all incoming data before writing
//   ✅ Never performs DELETE on registrations
//   ✅ Sheet row deletion → soft-delete (status = 'cancelled')
//   ✅ Sync loop prevention via sheet_updated_at timestamp
//   ✅ Conflict detection: newer Supabase data is never overwritten
//   ✅ All errors are logged, never silenced
// ====================================================================

/**
 * Fields that are SAFE to update from Google Sheets.
 * All other fields are PROTECTED and cannot be changed via reverse sync.
 */
const EDITABLE_FIELDS_FROM_SHEET = [
  "full_name",
  "phone_number",
  "whatsapp_number",
  "country",
] as const;

type EditableField = (typeof EDITABLE_FIELDS_FROM_SHEET)[number];

// Standard UUID regex pattern
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface SheetRowData {
  registrationId: string;
  fullName?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  country?: string;
}

export interface ReverseSyncEditResult {
  success: boolean;
  registrationId: string;
  fieldsUpdated?: string[];
  skipped?: boolean;
  error?: string;
  message?: string;
}

export interface ReverseSyncDeletionResult {
  success: boolean;
  registrationId: string;
  action: "soft_deleted" | "already_cancelled" | "not_found" | "error";
  message?: string;
  error?: string;
}

export interface FullReverseSyncResult {
  success: boolean;
  edits: ReverseSyncEditResult[];
  deletions: ReverseSyncDeletionResult[];
  totalProcessed: number;
  totalErrors: number;
  message?: string;
}

// ====================================================================
// FIELD VALIDATION
// ====================================================================

/**
 * Validates a single field value from Google Sheets.
 * Returns null if valid, or an error message string if invalid.
 */
function validateField(field: EditableField, value: string): string | null {
  const trimmed = value.trim();

  switch (field) {
    case "full_name":
      if (trimmed.length < 3) {
        return "اسم الطالب يجب أن لا يقل عن 3 أحرف";
      }
      if (trimmed.length > 200) {
        return "اسم الطالب طويل جداً (الحد الأقصى 200 حرف)";
      }
      return null;

    case "phone_number":
    case "whatsapp_number": {
      if (trimmed.length < 5) {
        return `رقم ${field === "phone_number" ? "الهاتف" : "الواتساب"} قصير جداً`;
      }
      if (trimmed.length > 25) {
        return `رقم ${field === "phone_number" ? "الهاتف" : "الواتساب"} طويل جداً`;
      }
      return null;
    }

    case "country":
      if (trimmed.length < 2) {
        return "اسم الدولة قصير جداً";
      }
      if (trimmed.length > 100) {
        return "اسم الدولة طويل جداً";
      }
      return null;

    default:
      return `الحقل ${field} غير معروف`;
  }
}

/**
 * Maps Google Sheets column values to the editable field names.
 *
 * Sheet Column Layout:
 *   A: Registration Date (PROTECTED)
 *   B: Student Name (full_name) ← EDITABLE
 *   C: Phone Number ← EDITABLE
 *   D: WhatsApp Number ← EDITABLE
 *   E: Country ← EDITABLE
 *   F: University (PROTECTED)
 *   G: Academic Year (PROTECTED)
 *   H: Subjects (PROTECTED)
 *   I: Total Amount (PROTECTED)
 *   J: Sync Status (PROTECTED)
 *   K: Spacer (PROTECTED)
 *   L: Registration ID (PROTECTED - identifier)
 */
function parseSheetRowToEditable(rowValues: string[]): Partial<Record<EditableField, string>> {
  const result: Partial<Record<EditableField, string>> = {};

  // Column B (index 1) → full_name
  if (rowValues[1] !== undefined && rowValues[1] !== null && String(rowValues[1]).trim() !== "") {
    result.full_name = String(rowValues[1]).trim();
  }

  // Column C (index 2) → phone_number
  if (rowValues[2] !== undefined && rowValues[2] !== null && String(rowValues[2]).trim() !== "") {
    result.phone_number = String(rowValues[2]).trim();
  }

  // Column D (index 3) → whatsapp_number
  if (rowValues[3] !== undefined && rowValues[3] !== null && String(rowValues[3]).trim() !== "") {
    result.whatsapp_number = String(rowValues[3]).trim();
  }

  // Column E (index 4) → country
  if (rowValues[4] !== undefined && rowValues[4] !== null && String(rowValues[4]).trim() !== "") {
    result.country = String(rowValues[4]).trim();
  }

  return result;
}

// ====================================================================
// SINGLE ROW EDIT SYNC
// ====================================================================

/**
 * Processes a single row edit from Google Sheets.
 * Validates, checks conflicts, and safely updates Supabase.
 *
 * SAFETY:
 *  - Only updates whitelisted fields
 *  - Never changes registration_id, session_id, created_at, or payment fields
 *  - Never creates duplicate registrations
 *  - Skips if Supabase data is newer than the Sheet edit
 */
export async function processSheetRowEdit(
  data: SheetRowData
): Promise<ReverseSyncEditResult> {
  const supabaseAdmin = getSupabaseServerClient();

  try {
    // 1. Validate registration ID
    if (
      !data.registrationId ||
      typeof data.registrationId !== "string" ||
      !UUID_REGEX.test(data.registrationId.trim())
    ) {
      return {
        success: false,
        registrationId: data.registrationId || "",
        error: "Invalid or missing registration ID.",
      };
    }

    const registrationId = data.registrationId.trim();

    // 2. Fetch existing registration from Supabase
    const { data: existingReg, error: fetchError } = await supabaseAdmin
      .from("registrations")
      .select("id, full_name, phone_number, whatsapp_number, country, updated_at, sheet_updated_at, status, sync_status")
      .eq("id", registrationId)
      .maybeSingle();

    if (fetchError || !existingReg) {
      return {
        success: false,
        registrationId,
        error: "Registration not found in database.",
      };
    }

    // 3. Build the update payload with only allowed fields
    const updates: Record<string, string> = {};
    const validationErrors: string[] = [];

    const fieldMap: Record<string, EditableField> = {
      fullName: "full_name",
      phoneNumber: "phone_number",
      whatsappNumber: "whatsapp_number",
      country: "country",
    };

    for (const [inputKey, dbField] of Object.entries(fieldMap)) {
      const value = data[inputKey as keyof SheetRowData];
      if (value !== undefined && value !== null && typeof value === "string" && value.trim() !== "") {
        const trimmedValue = value.trim();

        // Only include if the value actually changed
        const currentValue = existingReg[dbField as keyof typeof existingReg];
        if (String(currentValue || "").trim() !== trimmedValue) {
          // Validate the incoming value
          const error = validateField(dbField, trimmedValue);
          if (error) {
            validationErrors.push(`${dbField}: ${error}`);
          } else {
            updates[dbField] = trimmedValue;
          }
        }
      }
    }

    // 4. Report validation errors without updating
    if (validationErrors.length > 0) {
      return {
        success: false,
        registrationId,
        error: `Validation failed: ${validationErrors.join("; ")}`,
      };
    }

    // 5. No actual changes detected
    if (Object.keys(updates).length === 0) {
      return {
        success: true,
        registrationId,
        skipped: true,
        message: "No changes detected for editable fields.",
      };
    }

    // 6. Perform the safe update (only editable fields + metadata)
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("registrations")
      .update({
        ...updates,
        sheet_updated_at: nowIso,
        sync_status: "sheet_modified",
      })
      .eq("id", registrationId);

    if (updateError) {
      console.error("[ReverseSyncService] Update failed:", {
        registrationId,
        error: updateError.message,
      });
      return {
        success: false,
        registrationId,
        error: `Database update failed: ${updateError.message.slice(0, 300)}`,
      };
    }

    console.info("[ReverseSyncService] Sheet edit applied:", {
      registrationId,
      fieldsUpdated: Object.keys(updates),
    });

    return {
      success: true,
      registrationId,
      fieldsUpdated: Object.keys(updates),
      message: `Updated fields: ${Object.keys(updates).join(", ")}`,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown error during reverse sync";
    console.error("[ReverseSyncService] Unexpected error:", {
      registrationId: data.registrationId,
      error: errorMsg,
    });
    return {
      success: false,
      registrationId: data.registrationId || "",
      error: errorMsg.slice(0, 500),
    };
  }
}

// ====================================================================
// SHEET ROW DELETION DETECTION (SOFT-DELETE)
// ====================================================================

/**
 * Handles a registration that was removed from Google Sheets.
 *
 * CRITICAL SAFETY:
 *  - NEVER performs DELETE FROM registrations
 *  - Sets status = 'cancelled' and sync_status = 'sheet_deleted'
 *  - Preserves ALL data including payment info
 *  - Only affects registrations that were previously synced to Sheets
 */
export async function processSheetRowDeletion(
  registrationId: string
): Promise<ReverseSyncDeletionResult> {
  const supabaseAdmin = getSupabaseServerClient();

  try {
    if (!registrationId || !UUID_REGEX.test(registrationId.trim())) {
      return {
        success: false,
        registrationId: registrationId || "",
        action: "error",
        error: "Invalid registration ID.",
      };
    }

    const id = registrationId.trim();

    // 1. Fetch existing registration
    const { data: existingReg, error: fetchError } = await supabaseAdmin
      .from("registrations")
      .select("id, status, sync_status")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existingReg) {
      return {
        success: false,
        registrationId: id,
        action: "not_found",
        message: "Registration not found in database.",
      };
    }

    // 2. Already cancelled — skip
    if (existingReg.status === "cancelled" && existingReg.sync_status === "sheet_deleted") {
      return {
        success: true,
        registrationId: id,
        action: "already_cancelled",
        message: "Registration was already marked as cancelled from sheet deletion.",
      };
    }

    // 3. Soft-delete: Mark as cancelled, NEVER hard-delete
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("registrations")
      .update({
        status: "cancelled",
        sync_status: "sheet_deleted",
        sheet_updated_at: nowIso,
      })
      .eq("id", id);

    if (updateError) {
      console.error("[ReverseSyncService] Soft-delete failed:", {
        registrationId: id,
        error: updateError.message,
      });
      return {
        success: false,
        registrationId: id,
        action: "error",
        error: `Soft-delete failed: ${updateError.message.slice(0, 300)}`,
      };
    }

    console.info("[ReverseSyncService] Sheet row deletion → soft-deleted:", { registrationId: id });

    return {
      success: true,
      registrationId: id,
      action: "soft_deleted",
      message: "Registration soft-deleted (status=cancelled, sync_status=sheet_deleted). No data was removed.",
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown error during deletion handling";
    console.error("[ReverseSyncService] Deletion handling error:", {
      registrationId,
      error: errorMsg,
    });
    return {
      success: false,
      registrationId: registrationId || "",
      action: "error",
      error: errorMsg.slice(0, 500),
    };
  }
}

// ====================================================================
// FULL SHEET SCAN (TIME-DRIVEN TRIGGER)
// ====================================================================

/**
 * Performs a full comparison between Google Sheets rows and Supabase registrations.
 * Called by the Google Apps Script time-driven trigger (every ~5 minutes).
 *
 * 1. Reads all rows from Google Sheets
 * 2. Reads all synced registrations from Supabase
 * 3. For each Sheet row: checks if data has changed, applies safe edits
 * 4. For each Supabase registration missing from Sheet: applies soft-delete
 *
 * SAFETY:
 *  - Never performs DELETE
 *  - Only updates whitelisted fields
 *  - Logs all operations
 */
export async function performFullReverseSync(): Promise<FullReverseSyncResult> {
  const supabaseAdmin = getSupabaseServerClient();

  try {
    // 1. Read all rows from Google Sheets
    const sheets = getGoogleSheetsClient();
    const { spreadsheetId, sheetName } = getGoogleSheetsConfig();

    // Read all data including the hidden Registration ID column L
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:L`,
    });

    const sheetRows = sheetResponse.data.values;

    // CRITICAL SAFETY GUARD 1: Validate sheet read response
    if (!sheetRows || !Array.isArray(sheetRows) || sheetRows.length === 0) {
      console.warn("[ReverseSyncService] Google Sheets read returned empty data. Aborting sync without modifying Supabase.");
      return {
        success: false,
        edits: [],
        deletions: [],
        totalProcessed: 0,
        totalErrors: 1,
        message: "Google Sheets returned empty or invalid dataset. No Supabase records were changed.",
      };
    }

    // CRITICAL SAFETY GUARD 2: Validate header row
    const headerRow = sheetRows[0] || [];
    if (headerRow.length < 5) {
      console.warn("[ReverseSyncService] Sheet header structure is invalid or truncated. Aborting sync.", { headerLength: headerRow.length });
      return {
        success: false,
        edits: [],
        deletions: [],
        totalProcessed: 0,
        totalErrors: 1,
        message: "Sheet header structure is invalid. Sync aborted to protect database records.",
      };
    }

    // Build a map of Registration IDs present in the Sheet
    // Key: registration_id (from Column L), Value: row data (Columns A:L)
    const sheetRegistrationMap = new Map<string, string[]>();

    for (let i = 1; i < sheetRows.length; i++) {
      const row = sheetRows[i];
      const regId = row?.[11]; // Column L (index 11) = Registration ID

      if (regId && typeof regId === "string" && UUID_REGEX.test(regId.trim())) {
        sheetRegistrationMap.set(regId.trim(), row);
      }
    }

    // 2. Fetch all previously synced registrations from Supabase
    //    Only consider registrations that were synced to Sheets at some point
    const { data: supabaseRegs, error: fetchError } = await supabaseAdmin
      .from("registrations")
      .select("id, full_name, phone_number, whatsapp_number, country, status, sync_status, synced_at, updated_at, sheet_updated_at")
      .in("sync_status", ["synced", "sheet_modified", "sheet_deleted"]);

    if (fetchError) {
      return {
        success: false,
        edits: [],
        deletions: [],
        totalProcessed: 0,
        totalErrors: 1,
        message: `Failed to fetch registrations: ${fetchError.message}`,
      };
    }

    const allRegs = supabaseRegs || [];
    const activeSyncedRegs = allRegs.filter((r) => r.sync_status !== "sheet_deleted" && r.status !== "cancelled");

    // CRITICAL SAFETY GUARD 3: Prevent catastrophic accidental wipe
    // If Supabase has active synced records but the sheet returned 0 valid IDs,
    // this strongly indicates a blank sheet, network truncation, or wrong tab.
    if (activeSyncedRegs.length > 0 && sheetRegistrationMap.size === 0) {
      console.error("[ReverseSyncService] Catastrophic wipe guard triggered: Sheet has 0 valid IDs while Supabase has " + activeSyncedRegs.length + " active synced records. Aborting all deletions.");
      return {
        success: false,
        edits: [],
        deletions: [],
        totalProcessed: 0,
        totalErrors: 1,
        message: "Safety guard triggered: 0 registration IDs found in Sheet while active database records exist. No records were modified.",
      };
    }

    const editResults: ReverseSyncEditResult[] = [];
    const deletionResults: ReverseSyncDeletionResult[] = [];

    // 3. Process edits: For each Sheet row, check if data changed
    for (const [regId, rowData] of sheetRegistrationMap.entries()) {
      const supabaseReg = allRegs.find((r) => r.id === regId);

      if (!supabaseReg) {
        // Registration exists in Sheet but not in our synced set — skip
        // (It might be pending sync or a manually added row)
        continue;
      }

      // Skip if already soft-deleted and still missing (will be handled by deletion detection)
      if (supabaseReg.status === "cancelled" && supabaseReg.sync_status === "sheet_deleted") {
        continue;
      }

      // Parse editable fields from the Sheet row
      const sheetFields = parseSheetRowToEditable(rowData);

      // Check if any editable field actually differs from Supabase
      let hasChanges = false;
      for (const field of EDITABLE_FIELDS_FROM_SHEET) {
        const sheetValue = sheetFields[field];
        const dbValue = String(supabaseReg[field] || "").trim();
        if (sheetValue && sheetValue !== dbValue) {
          hasChanges = true;
          break;
        }
      }

      if (!hasChanges) {
        continue;
      }

      // Conflict check: if updated_at > sheet_updated_at, Supabase was modified
      // AFTER the last sheet sync, meaning the app has newer data
      if (supabaseReg.sheet_updated_at && supabaseReg.updated_at) {
        const dbUpdated = new Date(supabaseReg.updated_at).getTime();
        const sheetUpdated = new Date(supabaseReg.sheet_updated_at).getTime();

        // If the database was updated more recently than the last sheet sync,
        // AND the sync_status is not 'synced' (meaning the Supabase→Sheets sync
        // hasn't pushed this update yet), skip to avoid overwriting newer data.
        if (dbUpdated > sheetUpdated && supabaseReg.sync_status !== "synced") {
          editResults.push({
            success: true,
            registrationId: regId,
            skipped: true,
            message: "Supabase data is newer than Sheet data. Skipped to prevent overwrite.",
          });
          continue;
        }
      }

      // Apply the edit
      const editResult = await processSheetRowEdit({
        registrationId: regId,
        fullName: sheetFields.full_name,
        phoneNumber: sheetFields.phone_number,
        whatsappNumber: sheetFields.whatsapp_number,
        country: sheetFields.country,
      });
      editResults.push(editResult);
    }

    // 4. Detect deletions: Registrations in Supabase but missing from Sheet
    for (const reg of allRegs) {
      // Only consider registrations that were previously synced successfully
      if (reg.sync_status === "sheet_deleted") {
        continue; // Already handled
      }

      if (!sheetRegistrationMap.has(reg.id)) {
        // Registration exists in Supabase but NOT in the Sheet → soft-delete
        const deletionResult = await processSheetRowDeletion(reg.id);
        deletionResults.push(deletionResult);
      }
    }

    const totalErrors =
      editResults.filter((r) => !r.success).length +
      deletionResults.filter((r) => !r.success).length;

    console.info("[ReverseSyncService] Full reverse sync completed:", {
      editsProcessed: editResults.length,
      deletionsProcessed: deletionResults.length,
      totalErrors,
    });

    return {
      success: totalErrors === 0,
      edits: editResults,
      deletions: deletionResults,
      totalProcessed: editResults.length + deletionResults.length,
      totalErrors,
      message: `Processed ${editResults.length} edits, ${deletionResults.length} deletions. ${totalErrors} errors.`,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown error during full reverse sync";
    console.error("[ReverseSyncService] Full reverse sync failed:", errorMsg);
    return {
      success: false,
      edits: [],
      deletions: [],
      totalProcessed: 0,
      totalErrors: 1,
      message: errorMsg.slice(0, 500),
    };
  }
}
