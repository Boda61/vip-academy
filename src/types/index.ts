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
