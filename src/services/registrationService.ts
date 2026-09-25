import { supabase } from "@/lib/supabase";

export interface UniversityOption {
  id: string;
  name_ar: string;
  name_en: string;
  code: string;
}

export interface AcademicYearOption {
  id: string;
  name_ar: string;
  name_en: string;
  year_order: number;
}

export interface SemesterOption {
  id: string;
  academic_year_id: string;
  name_ar: string;
  name_en: string | null;
  semester_order: number;
}

export interface ModuleOption {
  id: string;
  semester_id: string;
  name_ar: string;
  name_en: string | null;
  code: string | null;
  module_order: number;
}

export interface SubjectOption {
  id: string;
  name_ar: string;
  name_en: string | null;
  price: number;
  university_id: string;
  academic_year_id: string;
  semester_id?: string | null;
  module_id?: string | null;
}

export interface ClaimTokenResponse {
  success: boolean;
  session_token: string;
  expires_at: string;
}

export interface SubmitRegistrationParams {
  session_token: string;
  full_name: string;
  phone_number: string;
  whatsapp_number: string;
  country: string;
  university_id: string;
  academic_year_id: string;
  semester_id?: string;
  module_id?: string;
  subject_ids: string[];
}

export interface SubmitRegistrationResponse {
  success: boolean;
  registration_id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

/**
 * Claims a raw QR token and creates a 20-minute registration session.
 */
export async function claimQrToken(rawToken: string): Promise<ClaimTokenResponse> {
  const { data, error } = await supabase.rpc("claim_qr_token", {
    p_token: rawToken,
  });

  if (error) {
    // Map database errors to friendly Arabic messages
    if (error.message.includes("P0002") || error.message.includes("بالفعل")) {
      throw new Error("هذا الكود تم استخدامه بالفعل، من فضلك امسح الكود الحالي من الشاشة.");
    }
    if (error.message.includes("P0003") || error.message.includes("صلاحية")) {
      throw new Error("انتهت صلاحية هذا الكود، من فضلك امسح الكود الحالي من الشاشة.");
    }
    if (error.message.includes("P0001") || error.message.includes("غير صالح")) {
      throw new Error("رمز الـ QR غير صالح أو غير موجود، من فضلك امسح الكود مرة أخرى.");
    }
    throw new Error(error.message || "تعذر التحقق من رمز الـ QR.");
  }

  return data as ClaimTokenResponse;
}

/**
 * Fetches active universities from database.
 */
export async function fetchUniversities(): Promise<UniversityOption[]> {
  const { data, error } = await supabase
    .from("universities")
    .select("id, name_ar, name_en, code")
    .eq("is_active", true)
    .order("name_ar");

  if (error) {
    throw new Error("تعذر تحميل قائمة الجامعات من الخادم.");
  }
  return data || [];
}

/**
 * Fetches active academic years from database sorted by year_order.
 */
export async function fetchAcademicYears(): Promise<AcademicYearOption[]> {
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, name_ar, name_en, year_order")
    .eq("is_active", true)
    .order("year_order", { ascending: true });

  if (error) {
    throw new Error("تعذر تحميل الفرق الدراسية من الخادم.");
  }
  return data || [];
}

/**
 * Fetches active semesters for a given academic year.
 */
export async function fetchSemesters(academicYearId: string): Promise<SemesterOption[]> {
  if (!academicYearId) return [];

  const { data, error } = await supabase
    .from("semesters")
    .select("id, academic_year_id, name_ar, name_en, semester_order")
    .eq("is_active", true)
    .eq("academic_year_id", academicYearId)
    .order("semester_order", { ascending: true });

  if (error) {
    throw new Error("تعذر تحميل قائمة الترمات من الخادم.");
  }
  return data || [];
}

/**
 * Fetches active modules for a given semester.
 */
export async function fetchModules(semesterId: string): Promise<ModuleOption[]> {
  if (!semesterId) return [];

  const { data, error } = await supabase
    .from("modules")
    .select("id, semester_id, name_ar, name_en, code, module_order")
    .eq("is_active", true)
    .eq("semester_id", semesterId)
    .order("module_order", { ascending: true });

  if (error) {
    throw new Error("تعذر تحميل قائمة الموديولات من الخادم.");
  }
  return data || [];
}

/**
 * Fetches active subjects matching university, academic year, semester, and module.
 */
export async function fetchSubjects(
  universityId: string,
  academicYearId: string,
  semesterId?: string,
  moduleId?: string
): Promise<SubjectOption[]> {
  if (!universityId || !academicYearId) return [];

  let query = supabase
    .from("subjects")
    .select("id, name_ar, name_en, price, university_id, academic_year_id, semester_id, module_id")
    .eq("is_active", true)
    .eq("university_id", universityId)
    .eq("academic_year_id", academicYearId);

  if (semesterId) {
    query = query.eq("semester_id", semesterId);
  }
  if (moduleId) {
    query = query.eq("module_id", moduleId);
  }

  const { data, error } = await query.order("name_ar");

  if (error) {
    throw new Error("تعذر تحميل المواد الدراسية.");
  }

  return (data || []).map((row) => ({
    ...row,
    price: Number(row.price),
  }));
}

/**
 * Submits student registration atomically to Supabase.
 */
export async function submitRegistration(
  params: SubmitRegistrationParams
): Promise<SubmitRegistrationResponse> {
  const { data, error } = await supabase.rpc("submit_registration", {
    p_session_token: params.session_token,
    p_full_name: params.full_name,
    p_phone: params.phone_number,
    p_whatsapp: params.whatsapp_number,
    p_country: params.country,
    p_university_id: params.university_id,
    p_academic_year_id: params.academic_year_id,
    p_subject_ids: params.subject_ids,
    p_semester_id: params.semester_id || null,
    p_module_id: params.module_id || null,
  });

  if (error) {
    if (error.message.includes("P0010") || error.message.includes("مسبقاً")) {
      throw new Error("تم إتمام التسجيل لهذه الجلسة مسبقاً.");
    }
    if (error.message.includes("P0011") || error.message.includes("جلسة")) {
      throw new Error("انتهت صلاحية جلسة التسجيل، يرجى إعادة مسح الرمز من الشاشة.");
    }
    if (error.message.includes("P0014") || error.message.includes("المواد")) {
      throw new Error("بعض المواد المختارة غير صالحة أو لا تنتمي لنفس الجامعة والفرقة والموديول.");
    }
    throw new Error(error.message || "حدث خطأ أثناء حفظ التسجيل.");
  }

  return data as SubmitRegistrationResponse;
}
