"use client";

import { COUNTRIES_LIST } from "@/utils/countries";
import { Globe } from "lucide-react";

interface CountrySelectProps {
  value: string;
  onChange: (countryName: string) => void;
  error?: string;
}

export default function CountrySelect({ value, onChange, error }: CountrySelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
        الدولة <span className="text-rose-500">*</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
          <Globe className="w-4 h-4" />
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-white dark:bg-slate-900 border rounded-2xl pr-10 pl-4 py-3 text-sm text-slate-900 dark:text-white transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 ${
            error
              ? "border-rose-300 dark:border-rose-800 focus:ring-rose-500/20"
              : "border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-amber-500/20"
          }`}
        >
          <option value="" disabled>
            اختر الدولة...
          </option>
          {COUNTRIES_LIST.map((c) => (
            <option key={c.code} value={c.nameAr}>
              {c.flag} {c.nameAr} ({c.nameEn})
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">{error}</p>}
    </div>
  );
}
