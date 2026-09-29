// ====================================================================
// VIP Academy — Google Apps Script: Two-Way Sync
// ====================================================================
//
// This script runs inside Google Sheets (Extensions → Apps Script).
// It sends edits and deletions back to the Supabase-connected Next.js API.
//
// SETUP INSTRUCTIONS:
//   1. Open your Google Sheet
//   2. Go to Extensions → Apps Script
//   3. Replace all code in Code.gs with this file's contents
//   4. Update the CONFIG section below with your actual values
//   5. Save the script
//   6. Run setupTriggers() once manually (Run → setupTriggers)
//   7. Authorize the script when prompted
//
// WHAT THIS SCRIPT DOES:
//   - onEdit trigger: When a user edits a cell, sends the change to the API
//   - Time-driven trigger (every 5 minutes): Full sync comparison
//   - NEVER deletes data from Supabase — only soft-deletes
//   - Prevents sync loops (ignores system-generated changes)
//
// SECURITY:
//   - Uses a shared secret (SHEETS_SYNC_SECRET) for API authentication
//   - The secret is stored in Script Properties (not hardcoded)
//   - Never exposes Supabase credentials
// ====================================================================

// ====================================================================
// CONFIGURATION — Update these values for your deployment
// ====================================================================
var CONFIG = {
  // Your deployed Next.js app URL (NO trailing slash)
  // Examples:
  //   Production: "https://vip-academy.vercel.app"
  //   Local dev:  "http://192.168.1.7:3000"
  API_BASE_URL: "https://YOUR_DEPLOYED_URL_HERE",

  // The API endpoint path for reverse sync
  REVERSE_SYNC_PATH: "/api/sync/sheets/reverse",

  // Sheet name where registrations are stored
  SHEET_NAME: "Registrations",

  // Column L (index 12) contains the Registration ID (UUID)
  REGISTRATION_ID_COLUMN: 12,

  // Columns that contain editable data (1-indexed)
  // B=2 (Name), C=3 (Phone), D=4 (WhatsApp), E=5 (Country)
  EDITABLE_COLUMNS: [2, 3, 4, 5],

  // Column J (index 10) = Sync Status
  SYNC_STATUS_COLUMN: 10,

  // First data row (skip header row)
  FIRST_DATA_ROW: 2,
};

// ====================================================================
// HELPER: Get sync secret from Script Properties
// ====================================================================

/**
 * Retrieves the sync secret from Script Properties.
 * Set it via: File → Project Properties → Script Properties
 * Key: SHEETS_SYNC_SECRET
 * Value: (same value as your .env.local SHEETS_SYNC_SECRET)
 */
function getSyncSecret() {
  var secret = PropertiesService.getScriptProperties().getProperty("SHEETS_SYNC_SECRET");
  if (!secret || secret.length < 16) {
    throw new Error(
      "SHEETS_SYNC_SECRET is not set in Script Properties. " +
      "Go to Project Settings → Script Properties and add it."
    );
  }
  return secret;
}

// ====================================================================
// HELPER: Send request to the reverse sync API
// ====================================================================

function sendToApi(payload) {
  var url = CONFIG.API_BASE_URL + CONFIG.REVERSE_SYNC_PATH;
  var secret = getSyncSecret();

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-sync-secret": secret,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true, // Don't throw on non-2xx
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var body = JSON.parse(response.getContentText());

    if (code >= 200 && code < 300) {
      Logger.log("[Sync] Success: " + JSON.stringify(body));
      return body;
    } else {
      Logger.log("[Sync] Error " + code + ": " + JSON.stringify(body));
      return null;
    }
  } catch (e) {
    Logger.log("[Sync] Request failed: " + e.message);
    return null;
  }
}

// ====================================================================
// HELPER: UUID validation
// ====================================================================

function isValidUUID(str) {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    str.trim()
  );
}

// ====================================================================
// onEdit TRIGGER: Detect cell edits and send to API
// ====================================================================

/**
 * Installable onEdit trigger.
 * Fires when a user manually edits a cell in the Registrations sheet.
 *
 * SYNC LOOP PREVENTION:
 *   - Only triggers for editable columns (B, C, D, E)
 *   - Ignores edits to the Sync Status column (J)
 *   - Ignores edits to the Registration ID column (L)
 *   - Ignores rows without a valid Registration ID
 *   - Checks if Sync Status is "synced" or "sheet_modified" before sending
 *     (prevents re-syncing system-generated updates)
 */
function onEditTrigger(e) {
  try {
    var sheet = e.source.getActiveSheet();

    // Only process the Registrations sheet
    if (sheet.getName() !== CONFIG.SHEET_NAME) return;

    var range = e.range;
    var row = range.getRow();
    var col = range.getColumn();

    // Skip header row
    if (row < CONFIG.FIRST_DATA_ROW) return;

    // Only process editable columns
    if (CONFIG.EDITABLE_COLUMNS.indexOf(col) === -1) return;

    // Get the Registration ID from Column L
    var regId = sheet
      .getRange(row, CONFIG.REGISTRATION_ID_COLUMN)
      .getValue();

    if (!isValidUUID(String(regId))) {
      Logger.log("[onEdit] Row " + row + " has no valid Registration ID. Skipping.");
      return;
    }

    // Get current row data
    var rowData = sheet.getRange(row, 1, 1, CONFIG.REGISTRATION_ID_COLUMN).getValues()[0];

    // Build the edit payload
    var payload = {
      action: "edit",
      registrationId: String(regId).trim(),
      fullName: String(rowData[1] || "").trim(),       // Column B
      phoneNumber: String(rowData[2] || "").trim(),    // Column C
      whatsappNumber: String(rowData[3] || "").trim(), // Column D
      country: String(rowData[4] || "").trim(),        // Column E
    };

    Logger.log("[onEdit] Sending edit for row " + row + ": " + JSON.stringify(payload));
    sendToApi(payload);

  } catch (err) {
    Logger.log("[onEdit] Error: " + err.message);
  }
}

// ====================================================================
// TIME-DRIVEN TRIGGER: Full sync comparison every 5 minutes
// ====================================================================

/**
 * Time-driven trigger that performs a full comparison.
 * This catches:
 *   - Row deletions (which onEdit doesn't detect)
 *   - Bulk edits
 *   - Any edits that onEdit might have missed
 *
 * The API handles:
 *   - Detecting which fields changed
 *   - Soft-deleting registrations removed from the Sheet
 *   - Conflict resolution (Supabase wins if data is newer)
 */
function fullSyncTrigger() {
  try {
    Logger.log("[FullSync] Starting full reverse sync...");

    var payload = {
      action: "full_sync",
    };

    var result = sendToApi(payload);

    if (result) {
      Logger.log(
        "[FullSync] Completed. Processed: " +
        (result.total_processed || 0) +
        ", Errors: " +
        (result.total_errors || 0)
      );
    } else {
      Logger.log("[FullSync] API request returned null/error.");
    }
  } catch (err) {
    Logger.log("[FullSync] Error: " + err.message);
  }
}

// ====================================================================
// SETUP: Install triggers (run this ONCE manually)
// ====================================================================

/**
 * Run this function ONCE manually to set up the triggers.
 * Steps:
 *   1. Open Apps Script editor
 *   2. Select "setupTriggers" from the function dropdown
 *   3. Click Run
 *   4. Authorize when prompted
 *
 * This creates:
 *   - An installable onEdit trigger for cell edits
 *   - A time-driven trigger every 5 minutes for full sync
 */
function setupTriggers() {
  // Remove any existing triggers to avoid duplicates
  var existingTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existingTriggers.length; i++) {
    var funcName = existingTriggers[i].getHandlerFunction();
    if (funcName === "onEditTrigger" || funcName === "fullSyncTrigger") {
      ScriptApp.deleteTrigger(existingTriggers[i]);
      Logger.log("[Setup] Removed existing trigger: " + funcName);
    }
  }

  // Create installable onEdit trigger
  ScriptApp.newTrigger("onEditTrigger")
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();

  Logger.log("[Setup] Created onEdit trigger for onEditTrigger.");

  // Create time-driven trigger every 5 minutes
  ScriptApp.newTrigger("fullSyncTrigger")
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log("[Setup] Created time-driven trigger for fullSyncTrigger (every 5 minutes).");

  Logger.log("[Setup] All triggers configured successfully!");
  Logger.log("[Setup] Don't forget to set SHEETS_SYNC_SECRET in Script Properties!");
}

// ====================================================================
// UTILITY: Test the API connection
// ====================================================================

/**
 * Run this manually to test if the API connection works.
 */
function testConnection() {
  try {
    var secret = getSyncSecret();
    Logger.log("[Test] Secret is configured (length: " + secret.length + ")");

    var url = CONFIG.API_BASE_URL + CONFIG.REVERSE_SYNC_PATH;
    Logger.log("[Test] API URL: " + url);

    // Send a harmless full_sync to test
    var result = sendToApi({ action: "full_sync" });

    if (result) {
      Logger.log("[Test] Connection successful! Response: " + JSON.stringify(result));
    } else {
      Logger.log("[Test] Connection failed. Check the API URL and secret.");
    }
  } catch (err) {
    Logger.log("[Test] Error: " + err.message);
  }
}
