// VIP Academy Registration Type Definitions

export type University = "Cairo University" | "Ain Shams University";

export type AcademicYear =
  | "First year"
  | "Second year"
  | "Third year"
  | "Fourth year"
  | "Fifth year";

export interface SubjectItem {
  id: string;
  name: string;
  price: number;
  academicYear: AcademicYear;
  university: University;
}

export interface StudentRegistrationInput {
  fullName: string;
  nationalId?: string;
  phoneNumber: string;
  whatsappNumber: string;
  country: string;
  university: University;
  academicYear: AcademicYear;
  selectedSubjectIds: string[];
  qrToken?: string;
}

export interface RegistrationRecord extends StudentRegistrationInput {
  id: string;
  totalAmount: number;
  createdAt: string;
  isSyncedToSheets: boolean;
}

export interface QRTokenSession {
  token: string;
  isValid: boolean;
  expiresAt?: string;
  usedAt?: string;
}

// Admin & Catalog Types
export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
}

export interface AdminUniversity {
  id: string;
  name_ar: string;
  name_en: string;
  code: string;
  is_active: boolean;
  created_at?: string;
}

export interface UniversityMutationInput {
  name_ar: string;
  name_en?: string;
  code: string;
  is_active?: boolean;
}

export interface AdminAcademicYear {
  id: string;
  name_ar: string;
  name_en: string;
  year_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface AcademicYearMutationInput {
  name_ar: string;
  name_en?: string;
  year_order: number;
  is_active?: boolean;
}

export interface AdminSemester {
  id: string;
  academic_year_id: string;
  name_ar: string;
  name_en: string | null;
  semester_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  academic_years?: {
    id: string;
    name_ar: string;
    name_en: string;
    year_order: number;
  };
}

export interface SemesterMutationInput {
  academic_year_id: string;
  name_ar: string;
  name_en?: string | null;
  semester_order: number;
  is_active?: boolean;
}

export interface AdminModule {
  id: string;
  semester_id: string;
  name_ar: string;
  name_en: string | null;
  code: string | null;
  module_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  semesters?: {
    id: string;
    name_ar: string;
    name_en: string | null;
    academic_year_id: string;
    academic_years?: {
      id: string;
      name_ar: string;
      name_en: string;
      year_order: number;
    };
  };
}

export interface ModuleMutationInput {
  semester_id: string;
  name_ar: string;
  name_en?: string | null;
  code?: string | null;
  module_order: number;
  is_active?: boolean;
}

export interface AdminSubject {
  id: string;
  name_ar: string;
  name_en: string | null;
  price: number;
  is_active: boolean;
  university_id: string;
  academic_year_id: string;
  semester_id?: string | null;
  module_id?: string | null;
  created_at?: string;
  updated_at?: string;
  universities?: {
    id: string;
    name_ar: string;
    name_en: string;
    code: string;
  };
  academic_years?: {
    id: string;
    name_ar: string;
    name_en: string;
    year_order: number;
  };
  semesters?: {
    id: string;
    name_ar: string;
    name_en: string | null;
  } | null;
  modules?: {
    id: string;
    name_ar: string;
    name_en: string | null;
    code: string | null;
  } | null;
}

export interface SubjectMutationInput {
  name_ar: string;
  name_en?: string | null;
  price: number;
  university_id: string;
  academic_year_id: string;
  semester_id?: string | null;
  module_id?: string | null;
  is_active?: boolean;
}

export interface AdminStats {
  totalSubjects: number;
  activeSubjects: number;
  inactiveSubjects: number;
  totalUniversities: number;
  activeUniversities: number;
  totalAcademicYears: number;
  activeAcademicYears: number;
  totalSemesters?: number;
  activeSemesters?: number;
  totalModules?: number;
  activeModules?: number;
}

export interface RegistrationTrendItem {
  date: string;
  day_name_ar: string;
  count: number;
  amount: number;
}

export interface RegistrationAnalytics {
  today_count: number;
  today_amount: number;
  last_7_days_count: number;
  this_month_count: number;
  total_registrations: number;
  seven_days_trend: RegistrationTrendItem[];
}

