import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName: string;
  range: string;
}

/**
 * Retrieves and validates the Google Sheets configuration from environment variables.
 * Never exposes credentials to client-side code.
 */
export function getGoogleSheetsConfig(): GoogleSheetsConfig {
  const spreadsheetId =
    process.env.GOOGLE_SPREADSHEET_ID || "1G6uUU2t9d9R_ymqSFvCyvgZUff1MivfExCkLXcqMF4A";
  const range = process.env.GOOGLE_SHEETS_RANGE || "Registrations!A:K";
  const sheetName = range.split("!")[0] || "Registrations";

  return {
    spreadsheetId,
    sheetName,
    range,
  };
}

/**
 * Normalizes a Google Service Account PEM private key.
 * Handles:
 * - Matching wrapping single or double quotes
 * - Escaped \n and \r\n sequences
 * - Real multiline newlines and CRLF
 * - Preserves standard PEM boundary structure
 */
export function normalizePrivateKey(rawKey: string): string {
  let key = rawKey.trim();

  // Strip wrapping single or double quotes if present (common in Vercel/env pastes)
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Handle both escaped and literal newlines / CRLF
  key = key
    .replace(/\\r\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n");

  // Ensure trailing newline
  if (!key.endsWith("\n")) {
    key += "\n";
  }

  return key;
}

/**
 * Initializes and returns an authenticated Google Sheets API client using a Google Service Account.
 * Supports private keys with escaped newline characters (\n), quotes, and multiline formatting.
 * Throws a descriptive error if server environment variables are missing.
 */
export function getGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();

  const hasEmail = Boolean(clientEmail);
  const hasPrivateKey = Boolean(rawPrivateKey);

  if (!clientEmail) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL is not defined in server environment variables."
    );
  }

  if (!rawPrivateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not defined in server environment variables."
    );
  }

  const privateKey = normalizePrivateKey(rawPrivateKey);

  // Safe diagnostic validation (Never logs the secret itself)
  const startsWithBeginKey = privateKey.trimStart().startsWith("-----BEGIN PRIVATE KEY-----");
  const endsWithEndKey = privateKey.trimEnd().endsWith("-----END PRIVATE KEY-----");

  console.info("[GoogleSheets] Auth Diagnostic Check:", {
    hasEmail,
    hasPrivateKey,
    normalizedKeyLength: privateKey.length,
    hasValidBeginMarker: startsWithBeginKey,
    hasValidEndMarker: endsWithEndKey,
  });

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });

  return google.sheets({ version: "v4", auth });
}
