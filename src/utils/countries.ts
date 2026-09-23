// Arab and international countries list for registration
export interface CountryOption {
  code: string; // ISO 2-letter
  nameAr: string;
  nameEn: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES_LIST: CountryOption[] = [
  { code: "EG", nameAr: "مصر", nameEn: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "SA", nameAr: "السعودية", nameEn: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "AE", nameAr: "الإمارات", nameEn: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { code: "KW", nameAr: "الكويت", nameEn: "Kuwait", dialCode: "+965", flag: "🇰🇼" },
  { code: "QA", nameAr: "قطر", nameEn: "Qatar", dialCode: "+974", flag: "🇶🇦" },
  { code: "BH", nameAr: "البحرين", nameEn: "Bahrain", dialCode: "+973", flag: "🇧🇭" },
  { code: "OM", nameAr: "عُمان", nameEn: "Oman", dialCode: "+968", flag: "🇴🇲" },
  { code: "JO", nameAr: "الأردن", nameEn: "Jordan", dialCode: "+962", flag: "🇯🇴" },
  { code: "IQ", nameAr: "العراق", nameEn: "Iraq", dialCode: "+964", flag: "🇮🇶" },
  { code: "SY", nameAr: "سوريا", nameEn: "Syria", dialCode: "+963", flag: "🇸🇾" },
  { code: "LB", nameAr: "لبنان", nameEn: "Lebanon", dialCode: "+961", flag: "🇱🇧" },
  { code: "PS", nameAr: "فلسطين", nameEn: "Palestine", dialCode: "+970", flag: "🇵🇸" },
  { code: "SD", nameAr: "السودان", nameEn: "Sudan", dialCode: "+249", flag: "🇸🇩" },
  { code: "LY", nameAr: "ليبيا", nameEn: "Libya", dialCode: "+218", flag: "🇱🇾" },
  { code: "YE", nameAr: "اليمن", nameEn: "Yemen", dialCode: "+967", flag: "🇾🇪" },
  { code: "DZ", nameAr: "الجزائر", nameEn: "Algeria", dialCode: "+213", flag: "🇩🇿" },
  { code: "MA", nameAr: "المغرب", nameEn: "Morocco", dialCode: "+212", flag: "🇲🇦" },
  { code: "TN", nameAr: "تونس", nameEn: "Tunisia", dialCode: "+216", flag: "🇹🇳" },
  { code: "US", nameAr: "الولايات المتحدة", nameEn: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "GB", nameAr: "المملكة المتحدة", nameEn: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "CA", nameAr: "كندا", nameEn: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "DE", nameAr: "ألمانيا", nameEn: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", nameAr: "فرنسا", nameEn: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "TR", nameAr: "تركيا", nameEn: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "MY", nameAr: "ماليزيا", nameEn: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { code: "OTHER", nameAr: "دولة أخرى", nameEn: "Other Country", dialCode: "", flag: "🌐" },
];
