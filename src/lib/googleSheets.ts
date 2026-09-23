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
 * Initializes and returns an authenticated Google Sheets API client using a Google Service Account.
 * Supports private keys with escaped newline characters (\n).
 * Throws a descriptive error if server environment variables are missing.
 */
export function getGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();

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

  // Handle both escaped and literal newlines in private key securely
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });

  return google.sheets({ version: "v4", auth });
}
