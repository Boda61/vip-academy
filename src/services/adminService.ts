import { supabase } from "@/lib/supabase";
import {
  AdminSubject,
  SubjectMutationInput,
  AdminUniversity,
  UniversityMutationInput,
  AdminAcademicYear,
  AcademicYearMutationInput,
  AdminSemester,
  SemesterMutationInput,
  AdminModule,
  ModuleMutationInput,
  AdminStats,
  RegistrationAnalytics,
} from "@/types";

export interface AdminAuthCheckResponse {
  isAdmin: boolean;
  userId?: string;
  email?: string;
  fullName?: string;
  message?: string;
}

/**
 * Checks current user's session and verifies Admin status in the database.
 */
export async function checkAdminAuth(): Promise<AdminAuthCheckResponse> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return { isAdmin: false, message: "لا توجد جلسة نشطة" };
    }

    const { data, error } = await supabase.rpc("check_admin_status");

    if (error || !data) {
      return { isAdmin: false, message: error?.message || "فشل التحقق من صلاحيات المسؤول" };
    }

    const res = data as { is_admin: boolean; user_id?: string; email?: string; full_name?: string; message?: string };

    if (!res.is_admin) {
      return { isAdmin: false, message: res.message || "الحساب غير مسجل كمسؤول مصرح له" };
    }

    return {
      isAdmin: true,
      userId: res.user_id,
      email: res.email,
      fullName: res.full_name,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء التحقق";
    return { isAdmin: false, message: msg };
  }
}

/**
 * Authenticates an Admin with email and password via Supabase Auth and validates admin privileges.
 */
export async function adminLogin(email: string, password: string): Promise<AdminAuthCheckResponse> {
  if (!email || !password) {
    throw new Error("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (authError || !authData?.user) {
    if (authError?.message?.includes("Invalid login credentials") || authError?.message?.includes("invalid_credentials")) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    }
    throw new Error(authError?.message || "فشل تسجيل الدخول، يرجى المحاولة مرة أخرى.");
  }

  // Verify Admin authorization in the database
  const adminCheck = await checkAdminAuth();

  if (!adminCheck.isAdmin) {
    // If authenticated in Supabase Auth but not an authorized admin, immediately sign out
    await supabase.auth.signOut();
    throw new Error("عذراً، هذا الحساب ليس لديه صلاحيات مسؤول في لوحة التحكم.");
  }

  return adminCheck;
}

/**
 * Signs out the current Admin user.
 */
export async function adminLogout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[AdminService] Logout error:", error);
  }
}

// ==========================================
// UNIVERSITIES MANAGEMENT
// ==========================================

/**
 * Fetches all universities (active and inactive) for admin management.
 */
export async function fetchAdminUniversities(): Promise<AdminUniversity[]> {
  const { data, error } = await supabase
    .from("universities")
    .select("id, name_ar, name_en, code, is_active, created_at")
    .order("name_ar", { ascending: true });

  if (error) {
    console.error("[AdminService] fetchAdminUniversities error:", error);
    throw new Error("تعذر جلب قائمة الجامعات.");
  }

  return (data || []) as AdminUniversity[];
}

/**
 * Creates a new university.
 */
export async function createUniversity(input: UniversityMutationInput): Promise<string> {
  if (!input.name_ar || !input.name_ar.trim()) {
    throw new Error("اسم الجامعة باللغة العربية مطلوب.");
  }
  if (!input.code || !input.code.trim()) {
    throw new Error("كود الجامعة مطلوب (مثل CU, ASU).");
  }

  const trimmedCode = input.code.trim().toUpperCase();
  const trimmedNameAr = input.name_ar.trim();
  const trimmedNameEn = input.name_en?.trim() || trimmedNameAr;

  const { data, error } = await supabase
    .from("universities")
    .insert({
      name_ar: trimmedNameAr,
      name_en: trimmedNameEn,
      code: trimmedCode,
      is_active: input.is_active ?? true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[AdminService] createUniversity error:", error);
    if (error.message.includes("code") || error.code === "23505") {
      throw new Error("كود الجامعة أو اسم الجامعة مسجل بالفعل، يرجى اختيار اسم وكود مختلف.");
    }
    throw new Error(error.message || "تعذر إضافة الجامعة الجديدة.");
  }

  return data.id;
}

/**
 * Updates an existing university.
 */
export async function updateUniversity(
  id: string,
  updates: Partial<UniversityMutationInput>
): Promise<void> {
  if (!id) throw new Error("معرف الجامعة مطلوب للتحديث.");

  const payload: Record<string, unknown> = {};

  if (updates.name_ar !== undefined) {
    if (!updates.name_ar.trim()) throw new Error("اسم الجامعة بالعربية لا يمكن أن يكون فارغاً.");
    payload.name_ar = updates.name_ar.trim();
  }
  if (updates.name_en !== undefined) {
    payload.name_en = updates.name_en?.trim() || payload.name_ar || "";
  }
  if (updates.code !== undefined) {
    if (!updates.code.trim()) throw new Error("كود الجامعة لا يمكن أن يكون فارغاً.");
    payload.code = updates.code.trim().toUpperCase();
  }
  if (updates.is_active !== undefined) {
    payload.is_active = Boolean(updates.is_active);
  }

  const { error } = await supabase
    .from("universities")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("[AdminService] updateUniversity error:", error);
    if (error.message.includes("code") || error.code === "23505") {
      throw new Error("كود الجامعة أو اسم الجامعة مسجل بالفعل لجامعة أخرى.");
    }
    throw new Error(error.message || "تعذر حفظ التعديلات على الجامعة.");
  }
}

/**
 * Toggles a university's active status (soft deactivation).
 */
export async function toggleUniversityActive(id: string, currentStatus: boolean): Promise<boolean> {
  const newStatus = !currentStatus;
  await updateUniversity(id, { is_active: newStatus });
  return newStatus;
}

/**
 * Deletes a university. Fails safely if linked to subjects or registrations.
 */
export async function deleteUniversity(id: string): Promise<void> {
  if (!id) throw new Error("معرف الجامعة مطلوب للحذف.");

  const { error } = await supabase
    .from("universities")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[AdminService] deleteUniversity error:", error);
    if (error.code === "23503" || error.message.includes("foreign key") || error.message.includes("violates")) {
      throw new Error("لا يمكن حذف هذه الجامعة لأنها مرتبطة بمواد دراسية أو تسجيلات سابقة. يمكنك تعطيلها بدلاً من الحذف.");
    }
    throw new Error(error.message || "تعذر حذف الجامعة.");
  }
}

// ==========================================
// ACADEMIC YEARS MANAGEMENT
// ==========================================

/**
 * Fetches all academic years (active and inactive) ordered by year_order.
 */
export async function fetchAdminAcademicYears(): Promise<AdminAcademicYear[]> {
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, name_ar, name_en, year_order, is_active, created_at")
    .order("year_order", { ascending: true });

  if (error) {
    console.error("[AdminService] fetchAdminAcademicYears error:", error);
    throw new Error("تعذر جلب قائمة الفرق الدراسية.");
  }

  return (data || []) as AdminAcademicYear[];
}

/**
 * Creates a new academic year.
 */
export async function createAcademicYear(input: AcademicYearMutationInput): Promise<string> {
  if (!input.name_ar || !input.name_ar.trim()) {
    throw new Error("اسم الفرقة الدراسية باللغة العربية مطلوب.");
  }
  const yearOrder = Number(input.year_order);
  if (isNaN(yearOrder) || yearOrder < 1 || yearOrder > 5) {
    throw new Error("ترتيب الفرقة الدراسية يجب أن يكون رقماً بين 1 و 5.");
  }

  const trimmedNameAr = input.name_ar.trim();
  const trimmedNameEn = input.name_en?.trim() || trimmedNameAr;

  const { data, error } = await supabase
    .from("academic_years")
    .insert({
      name_ar: trimmedNameAr,
      name_en: trimmedNameEn,
      year_order: yearOrder,
      is_active: input.is_active ?? true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[AdminService] createAcademicYear error:", error);
    if (error.code === "23505" || error.message.includes("year_order")) {
      throw new Error("ترتيب الفرقة الدراسية أو اسمها مسجل بالفعل.");
    }
    throw new Error(error.message || "تعذر إضافة الفرقة الدراسية.");
  }

  return data.id;
}

/**
 * Updates an existing academic year.
 */
export async function updateAcademicYear(
  id: string,
  updates: Partial<AcademicYearMutationInput>
): Promise<void> {
  if (!id) throw new Error("معرف الفرقة الدراسية مطلوب للتحديث.");

  const payload: Record<string, unknown> = {};

  if (updates.name_ar !== undefined) {
    if (!updates.name_ar.trim()) throw new Error("اسم الفرقة الدراسية بالعربية مطلوب.");
    payload.name_ar = updates.name_ar.trim();
  }
  if (updates.name_en !== undefined) {
    payload.name_en = updates.name_en?.trim() || payload.name_ar || "";
  }
  if (updates.year_order !== undefined) {
    const yearOrder = Number(updates.year_order);
    if (isNaN(yearOrder) || yearOrder < 1 || yearOrder > 5) {
      throw new Error("ترتيب الفرقة الدراسية يجب أن يكون رقماً بين 1 و 5.");
    }
    payload.year_order = yearOrder;
  }
  if (updates.is_active !== undefined) {
    payload.is_active = Boolean(updates.is_active);
  }

  const { error } = await supabase
    .from("academic_years")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("[AdminService] updateAcademicYear error:", error);
    if (error.code === "23505" || error.message.includes("year_order")) {
      throw new Error("ترتيب الفرقة الدراسية أو اسمها مسجل بالفعل لفرقة أخرى.");
    }
    throw new Error(error.message || "تعذر حفظ التعديلات على الفرقة الدراسية.");
  }
}

/**
 * Toggles an academic year's active status (soft deactivation).
 */
export async function toggleAcademicYearActive(id: string, currentStatus: boolean): Promise<boolean> {
  const newStatus = !currentStatus;
  await updateAcademicYear(id, { is_active: newStatus });
  return newStatus;
}

/**
 * Deletes an academic year. Fails safely if linked to subjects or registrations.
 */
export async function deleteAcademicYear(id: string): Promise<void> {
  if (!id) throw new Error("معرف الفرقة الدراسية مطلوب للحذف.");

  const { error } = await supabase
    .from("academic_years")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[AdminService] deleteAcademicYear error:", error);
    if (error.code === "23503" || error.message.includes("foreign key") || error.message.includes("violates")) {
      throw new Error("لا يمكن حذف هذه الفرقة لأنها مرتبطة بمواد دراسية أو تسجيلات سابقة. يمكنك تعطيلها بدلاً من الحذف.");
    }
    throw new Error(error.message || "تعذر حذف الفرقة الدراسية.");
  }
}

// ==========================================
// SEMESTERS MANAGEMENT
// ==========================================

/**
 * Fetches all semesters (active and inactive) ordered by semester_order.
 */
export async function fetchAdminSemesters(academicYearId?: string): Promise<AdminSemester[]> {
  let query = supabase
    .from("semesters")
    .select(`
      id,
      academic_year_id,
      name_ar,
      name_en,
      semester_order,
      is_active,
      created_at,
      updated_at,
      academic_years (id, name_ar, name_en, year_order)
    `)
    .order("semester_order", { ascending: true });

  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[AdminService] fetchAdminSemesters error:", error);
    throw new Error("تعذر جلب قائمة الترمات الدراسية.");
  }

  return (data || []).map((row) => ({
    ...row,
    academic_years: Array.isArray(row.academic_years) ? row.academic_years[0] : row.academic_years,
  })) as AdminSemester[];
}

/**
 * Creates a new semester.
 */
export async function createSemester(input: SemesterMutationInput): Promise<string> {
  if (!input.name_ar || !input.name_ar.trim()) {
    throw new Error("اسم الترم باللغة العربية مطلوب.");
  }
  if (!input.academic_year_id) {
    throw new Error("يرجى اختيار الفرقة الدراسية التابع لها الترم.");
  }
  const semesterOrder = Number(input.semester_order);
  if (isNaN(semesterOrder) || semesterOrder < 1 || semesterOrder > 10) {
    throw new Error("ترتيب الترم يجب أن يكون رقماً بين 1 و 10.");
  }

  const trimmedNameAr = input.name_ar.trim();
  const trimmedNameEn = input.name_en?.trim() || trimmedNameAr;

  const { data, error } = await supabase
    .from("semesters")
    .insert({
      academic_year_id: input.academic_year_id,
      name_ar: trimmedNameAr,
      name_en: trimmedNameEn,
      semester_order: semesterOrder,
      is_active: input.is_active ?? true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[AdminService] createSemester error:", error);
    if (error.code === "23505" || error.message.includes("uq_semester_year_name")) {
      throw new Error("يوجد ترم مسجل بنفس الاسم لهذه الفرقة الدراسية.");
    }
    throw new Error(error.message || "تعذر إضافة الترم الجديد.");
  }

  return data.id;
}

/**
 * Updates an existing semester.
 */
export async function updateSemester(
  id: string,
  updates: Partial<SemesterMutationInput>
): Promise<void> {
  if (!id) throw new Error("معرف الترم مطلوب للتحديث.");

  const payload: Record<string, unknown> = {};

  if (updates.name_ar !== undefined) {
    if (!updates.name_ar.trim()) throw new Error("اسم الترم بالعربية مطلوب.");
    payload.name_ar = updates.name_ar.trim();
  }
  if (updates.name_en !== undefined) {
    payload.name_en = updates.name_en?.trim() || payload.name_ar || "";
  }
  if (updates.semester_order !== undefined) {
    const order = Number(updates.semester_order);
    if (isNaN(order) || order < 1 || order > 10) {
      throw new Error("ترتيب الترم يجب أن يكون رقماً بين 1 و 10.");
    }
    payload.semester_order = order;
  }
  if (updates.academic_year_id !== undefined) {
    payload.academic_year_id = updates.academic_year_id;
  }
  if (updates.is_active !== undefined) {
    payload.is_active = Boolean(updates.is_active);
  }

  const { error } = await supabase
    .from("semesters")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("[AdminService] updateSemester error:", error);
    if (error.code === "23505" || error.message.includes("uq_semester_year_name")) {
      throw new Error("يوجد ترم مسجل بنفس الاسم لهذه الفرقة الدراسية.");
    }
    throw new Error(error.message || "تعذر حفظ التعديلات على الترم.");
  }
}

/**
 * Toggles a semester's active status (soft deactivation).
 */
export async function toggleSemesterActive(id: string, currentStatus: boolean): Promise<boolean> {
  const newStatus = !currentStatus;
  await updateSemester(id, { is_active: newStatus });
  return newStatus;
}

/**
 * Deletes a semester safely.
 */
export async function deleteSemester(id: string): Promise<void> {
  if (!id) throw new Error("معرف الترم مطلوب للحذف.");

  const { error } = await supabase
    .from("semesters")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[AdminService] deleteSemester error:", error);
    if (error.code === "23503" || error.message.includes("foreign key") || error.message.includes("violates")) {
      throw new Error("لا يمكن حذف هذا الترم لأنه مرتبط بموديولات أو مواد أو تسجيلات سابقة. يمكنك تعطيله بدلاً من الحذف.");
    }
    throw new Error(error.message || "تعذر حذف الترم.");
  }
}

// ==========================================
// MODULES MANAGEMENT
// ==========================================

/**
 * Fetches all modules (active and inactive) with joined semester and academic year.
 */
export async function fetchAdminModules(semesterId?: string): Promise<AdminModule[]> {
  let query = supabase
    .from("modules")
    .select(`
      id,
      semester_id,
      name_ar,
      name_en,
      code,
      module_order,
      is_active,
      created_at,
      updated_at,
      semesters (
        id,
        name_ar,
        name_en,
        academic_year_id,
        academic_years (id, name_ar, name_en, year_order)
      )
    `)
    .order("module_order", { ascending: true });

  if (semesterId) {
    query = query.eq("semester_id", semesterId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[AdminService] fetchAdminModules error:", error);
    throw new Error("تعذر جلب قائمة الموديولات.");
  }

  return (data || []).map((row) => {
    const rawSem = Array.isArray(row.semesters) ? row.semesters[0] : row.semesters;
    const rawYear = rawSem?.academic_years
      ? Array.isArray(rawSem.academic_years)
        ? rawSem.academic_years[0]
        : rawSem.academic_years
      : undefined;

    return {
      ...row,
      semesters: rawSem
        ? {
            ...rawSem,
            academic_years: rawYear,
          }
        : undefined,
    };
  }) as AdminModule[];
}

/**
 * Creates a new module.
 */
export async function createModule(input: ModuleMutationInput): Promise<string> {
  if (!input.name_ar || !input.name_ar.trim()) {
    throw new Error("اسم الموديول باللغة العربية مطلوب.");
  }
  if (!input.semester_id) {
    throw new Error("يرجى اختيار الترم التابع له الموديول.");
  }
  const moduleOrder = Number(input.module_order) || 1;

  const trimmedNameAr = input.name_ar.trim();
  const trimmedNameEn = input.name_en?.trim() || trimmedNameAr;
  const trimmedCode = input.code?.trim().toUpperCase() || null;

  const { data, error } = await supabase
    .from("modules")
    .insert({
      semester_id: input.semester_id,
      name_ar: trimmedNameAr,
      name_en: trimmedNameEn,
      code: trimmedCode,
      module_order: moduleOrder,
      is_active: input.is_active ?? true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[AdminService] createModule error:", error);
    if (error.code === "23505" || error.message.includes("uq_module_semester_name")) {
      throw new Error("يوجد موديول مسجل بنفس الاسم لهذا الترم.");
    }
    throw new Error(error.message || "تعذر إضافة الموديول الجديد.");
  }

  return data.id;
}

/**
 * Updates an existing module.
 */
export async function updateModule(
  id: string,
  updates: Partial<ModuleMutationInput>
): Promise<void> {
  if (!id) throw new Error("معرف الموديول مطلوب للتحديث.");

  const payload: Record<string, unknown> = {};

  if (updates.name_ar !== undefined) {
    if (!updates.name_ar.trim()) throw new Error("اسم الموديول بالعربية مطلوب.");
    payload.name_ar = updates.name_ar.trim();
  }
  if (updates.name_en !== undefined) {
    payload.name_en = updates.name_en?.trim() || payload.name_ar || "";
  }
  if (updates.code !== undefined) {
    payload.code = updates.code?.trim().toUpperCase() || null;
  }
  if (updates.module_order !== undefined) {
    payload.module_order = Number(updates.module_order) || 1;
  }
  if (updates.semester_id !== undefined) {
    payload.semester_id = updates.semester_id;
  }
  if (updates.is_active !== undefined) {
    payload.is_active = Boolean(updates.is_active);
  }

  const { error } = await supabase
    .from("modules")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("[AdminService] updateModule error:", error);
    if (error.code === "23505" || error.message.includes("uq_module_semester_name")) {
      throw new Error("يوجد موديول مسجل بنفس الاسم لهذا الترم.");
    }
    throw new Error(error.message || "تعذر حفظ التعديلات على الموديول.");
  }
}

/**
 * Toggles a module's active status (soft deactivation).
 */
export async function toggleModuleActive(id: string, currentStatus: boolean): Promise<boolean> {
  const newStatus = !currentStatus;
  await updateModule(id, { is_active: newStatus });
  return newStatus;
}

/**
 * Deletes a module safely.
 */
export async function deleteModule(id: string): Promise<void> {
  if (!id) throw new Error("معرف الموديول مطلوب للحذف.");

  const { error } = await supabase
    .from("modules")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[AdminService] deleteModule error:", error);
    if (error.code === "23503" || error.message.includes("foreign key") || error.message.includes("violates")) {
      throw new Error("لا يمكن حذف هذا الموديول لأنه مرتبط بمواد دراسية أو تسجيلات سابقة. يمكنك تعطيله بدلاً من الحذف.");
    }
    throw new Error(error.message || "تعذر حذف الموديول.");
  }
}

// ==========================================
// SUBJECTS MANAGEMENT
// ==========================================

/**
 * Fetches all subjects (active and inactive) with joined university, academic year, semester, and module.
 */
export async function fetchAdminSubjects(): Promise<AdminSubject[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select(`
      id,
      name_ar,
      name_en,
      price,
      is_active,
      university_id,
      academic_year_id,
      semester_id,
      module_id,
      created_at,
      updated_at,
      universities (id, name_ar, name_en, code),
      academic_years (id, name_ar, name_en, year_order),
      semesters (id, name_ar, name_en),
      modules (id, name_ar, name_en, code)
    `)
    .order("name_ar", { ascending: true });

  if (error) {
    console.error("[AdminService] fetchAdminSubjects error:", error);
    throw new Error("تعذر جلب قائمة المواد الدراسية.");
  }

  // Map to strongly-typed AdminSubject array
  return (data || []).map((row) => ({
    id: row.id,
    name_ar: row.name_ar,
    name_en: row.name_en,
    price: Number(row.price),
    is_active: row.is_active,
    university_id: row.university_id,
    academic_year_id: row.academic_year_id,
    semester_id: row.semester_id,
    module_id: row.module_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    universities: Array.isArray(row.universities) ? row.universities[0] : row.universities,
    academic_years: Array.isArray(row.academic_years) ? row.academic_years[0] : row.academic_years,
    semesters: Array.isArray(row.semesters) ? row.semesters[0] : row.semesters,
    modules: Array.isArray(row.modules) ? row.modules[0] : row.modules,
  })) as AdminSubject[];
}

/**
 * Updates an existing subject's details (price, names, active state, semester, module).
 */
export async function updateSubject(
  id: string,
  updates: Partial<SubjectMutationInput>
): Promise<void> {
  if (!id) throw new Error("معرف المادة مطلوب للتحديث.");

  const payload: Record<string, unknown> = {};

  if (updates.name_ar !== undefined) payload.name_ar = updates.name_ar.trim();
  if (updates.name_en !== undefined) payload.name_en = updates.name_en ? updates.name_en.trim() : null;
  if (updates.price !== undefined) {
    const numPrice = Number(updates.price);
    if (isNaN(numPrice) || numPrice < 0) {
      throw new Error("سعر المادة يجب أن يكون رقماً موجباً أو صفراً.");
    }
    payload.price = numPrice;
  }
  if (updates.is_active !== undefined) payload.is_active = Boolean(updates.is_active);
  if (updates.university_id !== undefined) payload.university_id = updates.university_id;
  if (updates.academic_year_id !== undefined) payload.academic_year_id = updates.academic_year_id;
  if (updates.semester_id !== undefined) payload.semester_id = updates.semester_id || null;
  if (updates.module_id !== undefined) payload.module_id = updates.module_id || null;

  const { error } = await supabase
    .from("subjects")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("[AdminService] updateSubject error:", error);
    if (error.message.includes("idx_uq_subject_uni_mod_name") || error.code === "23505") {
      throw new Error("توجد مادة مسجلة مسبقاً بنفس الاسم لهذا الموديول والجامعة.");
    }
    throw new Error(error.message || "تعذر حفظ التعديلات على المادة.");
  }
}

/**
 * Creates a new subject in the catalog.
 */
export async function createSubject(input: SubjectMutationInput): Promise<string> {
  if (!input.name_ar || !input.name_ar.trim()) {
    throw new Error("اسم المادة باللغة العربية مطلوب.");
  }
  if (!input.university_id) {
    throw new Error("يرجى اختيار الجامعة.");
  }
  if (!input.academic_year_id) {
    throw new Error("يرجى اختيار الفرقة الدراسية.");
  }
  const numPrice = Number(input.price);
  if (isNaN(numPrice) || numPrice < 0) {
    throw new Error("سعر المادة يجب أن يكون رقماً موجباً أو صفراً.");
  }

  const { data, error } = await supabase
    .from("subjects")
    .insert({
      name_ar: input.name_ar.trim(),
      name_en: input.name_en ? input.name_en.trim() : null,
      price: numPrice,
      university_id: input.university_id,
      academic_year_id: input.academic_year_id,
      semester_id: input.semester_id || null,
      module_id: input.module_id || null,
      is_active: input.is_active ?? true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[AdminService] createSubject error:", error);
    if (error.message.includes("idx_uq_subject_uni_mod_name") || error.code === "23505") {
      throw new Error("توجد مادة مسجلة مسبقاً بنفس الاسم لهذا الموديول والجامعة.");
    }
    throw new Error(error.message || "تعذر إضافة المادة الجديدة.");
  }

  return data.id;
}

/**
 * Toggles a subject's active status directly.
 */
export async function toggleSubjectActive(id: string, currentStatus: boolean): Promise<boolean> {
  const newStatus = !currentStatus;
  await updateSubject(id, { is_active: newStatus });
  return newStatus;
}

/**
 * Deletes a subject. Fails safely if linked to registrations.
 */
export async function deleteSubject(id: string): Promise<void> {
  if (!id) throw new Error("معرف المادة مطلوب للحذف.");

  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[AdminService] deleteSubject error:", error);
    if (error.code === "23503" || error.message.includes("foreign key") || error.message.includes("violates")) {
      throw new Error("لا يمكن حذف هذه المادة لأنها مسجلة لدى طلاب في طلبات تسجيل سابقة. يمكنك تعطيلها بدلاً من الحذف.");
    }
    throw new Error(error.message || "تعذر حذف المادة.");
  }
}

/**
 * Calculates dashboard statistics for Admin overview.
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const [subjectsRes, unisRes, yearsRes, semestersRes, modulesRes] = await Promise.all([
    supabase.from("subjects").select("id, is_active"),
    supabase.from("universities").select("id, is_active"),
    supabase.from("academic_years").select("id, is_active"),
    supabase.from("semesters").select("id, is_active"),
    supabase.from("modules").select("id, is_active"),
  ]);

  const allSubjects = subjectsRes.data || [];
  const totalSubjects = allSubjects.length;
  const activeSubjects = allSubjects.filter((s) => s.is_active).length;
  const inactiveSubjects = totalSubjects - activeSubjects;

  const allUnis = unisRes.data || [];
  const totalUniversities = allUnis.length;
  const activeUniversities = allUnis.filter((u) => u.is_active).length;

  const allYears = yearsRes.data || [];
  const totalAcademicYears = allYears.length;
  const activeAcademicYears = allYears.filter((y) => y.is_active).length;

  const allSemesters = semestersRes.data || [];
  const totalSemesters = allSemesters.length;
  const activeSemesters = allSemesters.filter((s) => s.is_active).length;

  const allModules = modulesRes.data || [];
  const totalModules = allModules.length;
  const activeModules = allModules.filter((m) => m.is_active).length;

  return {
    totalSubjects,
    activeSubjects,
    inactiveSubjects,
    totalUniversities,
    activeUniversities,
    totalAcademicYears,
    activeAcademicYears,
    totalSemesters,
    activeSemesters,
    totalModules,
    activeModules,
  };
}

/**
 * Fetches registration analytics via admin-only RPC (Africa/Cairo timezone).
 */
export async function fetchRegistrationAnalytics(): Promise<RegistrationAnalytics> {
  const { data, error } = await supabase.rpc("get_admin_registration_analytics");

  if (error) {
    console.error("[AdminService] fetchRegistrationAnalytics error:", error);
    throw new Error("تعذر جلب إحصائيات وتحليلات التسجيلات.");
  }

  return data as RegistrationAnalytics;
}

