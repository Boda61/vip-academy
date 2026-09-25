"use client";

import { useState } from "react";
import { COUNTRIES_LIST, CountryOption } from "@/utils/countries";
import { formatAndValidatePhone } from "@/utils/phone";
import { Phone, MessageSquare } from "lucide-react";

interface PhoneInputProps {
  label: string;
  isWhatsApp?: boolean;
  value: string; // Stored E.164 value
  onChange: (e164Value: string) => void;
  error?: string;
  defaultCountryCode?: string;
}

export default function PhoneInput({
  label,
  isWhatsApp = false,
  onChange,
  error,
  defaultCountryCode = "EG",
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(() => {
    return COUNTRIES_LIST.find((c) => c.code === defaultCountryCode) || COUNTRIES_LIST[0];
  });
  const [nationalNumber, setNationalNumber] = useState("");

  const handleCountryChange = (countryCode: string) => {
    const found = COUNTRIES_LIST.find((c) => c.code === countryCode);
    if (found) {
      setSelectedCountry(found);
      const res = formatAndValidatePhone(found.dialCode, nationalNumber, found.code);
      onChange(res.e164);
    }
  };

  const handleNumberChange = (rawText: string) => {
    setNationalNumber(rawText);
    const res = formatAndValidatePhone(selectedCountry.dialCode, rawText, selectedCountry.code);
    onChange(res.e164);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-700">
        {label} <span className="text-rose-500">*</span>
      </label>
      <div className="flex gap-2" dir="ltr">
        {/* Country Dial Code Selector */}
        <div className="relative w-36 shrink-0">
          <select
            value={selectedCountry.code}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 truncate"
          >
            {COUNTRIES_LIST.filter((c) => c.dialCode).map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.dialCode} ({c.code})
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* National Number Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            {isWhatsApp ? (
              <MessageSquare className="w-4 h-4 text-emerald-600" />
            ) : (
              <Phone className="w-4 h-4 text-blue-600" />
            )}
          </div>
          <input
            type="tel"
            value={nationalNumber}
            onChange={(e) => handleNumberChange(e.target.value)}
            placeholder="010XXXXXXXX"
            className={`w-full bg-white border rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
              error
                ? "border-rose-300 focus:ring-rose-500/20"
                : "border-slate-200 focus:border-blue-600 focus:ring-blue-500/20"
            }`}
          />
        </div>
      </div>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}
