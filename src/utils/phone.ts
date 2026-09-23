import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";

export interface PhoneValidationResult {
  isValid: boolean;
  e164: string;
  errorMessage?: string;
}

/**
 * Validates and formats a phone number with country calling code into standard E.164 format.
 * Example: dialCode="+20", nationalNumber="01012345678" -> e164="+201012345678"
 */
export function formatAndValidatePhone(
  dialCode: string,
  nationalNumber: string,
  countryCodeIso?: string
): PhoneValidationResult {
  const cleanNumber = nationalNumber.replace(/[\s\-()]/g, "");
  if (!cleanNumber) {
    return { isValid: false, e164: "", errorMessage: "يرجى إدخال رقم الهاتف" };
  }

  // Combine dial code if the user didn't type it
  let fullNumber = cleanNumber;
  if (!fullNumber.startsWith("+")) {
    const cleanDialCode = dialCode.startsWith("+") ? dialCode : `+${dialCode}`;
    // Strip leading 0 if present when combining with country code
    const normalizedNational = cleanNumber.startsWith("0")
      ? cleanNumber.substring(1)
      : cleanNumber;
    fullNumber = `${cleanDialCode}${normalizedNational}`;
  }

  try {
    const parsed = parsePhoneNumberFromString(
      fullNumber,
      (countryCodeIso as CountryCode) || undefined
    );

    if (parsed && parsed.isValid()) {
      return {
        isValid: true,
        e164: parsed.format("E.164"),
      };
    } else {
      return {
        isValid: false,
        e164: fullNumber,
        errorMessage: "رقم الهاتف غير صحيح للدولة المحددة",
      };
    }
  } catch {
    return {
      isValid: false,
      e164: fullNumber,
      errorMessage: "صيغة رقم الهاتف غير صحيحة",
    };
  }
}
