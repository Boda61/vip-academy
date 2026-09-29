"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  UniversityOption,
  AcademicYearOption,
  SemesterOption,
  ModuleOption,
  SubjectOption,
  PaymentMethodOption,
  fetchUniversities,
  fetchAcademicYears,
  fetchSemesters,
  fetchModules,
  fetchSubjects,
  fetchPaymentMethods,
  submitRegistration,
  SubmitRegistrationResponse,
} from "@/services/registrationService";
import PhoneInput from "./PhoneInput";
import CountrySelect from "./CountrySelect";
import SubjectSelector from "./SubjectSelector";
import {
  User,
  Building2,
  GraduationCap,
  CalendarDays,
  Boxes,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
} from "lucide-react";

const registrationSchema = z.object({
  fullName: z
    .string()
    .min(3, "اسم الطالب يجب أن لا يقل عن 3 أحرف")
    .refine((val) => val.trim().length >= 3, "يرجى كتابة الاسم الثلاثي أو الرباعي بشكل صحيح"),
  phoneNumber: z
    .string()
    .min(5, "رقم الهاتف مطلوب بصيغة صحيحة")
    .regex(/^\+[1-9]\d{6,14}$/, "صيغة رقم الهاتف الدولي غير صحيحة"),
  whatsappNumber: z
    .string()
    .min(5, "رقم الواتساب مطلوب بصيغة صحيحة")
    .regex(/^\+[1-9]\d{6,14}$/, "صيغة رقم الواتساب الدولي غير صحيحة"),
  country: z.string().uuid("يرجى اختيار الدولة"),
  universityId: z.string().uuid("يرجى اختيار الجامعة"),
  academicYearId: z.string().uuid("يرجى اختيار الفرقة الدراسية"),
  semesterId: z.string().uuid("يرجى اختيار الترم الدراسي"),
  moduleId: z.string().uuid("يرجى اختيار الموديول"),
  paymentMethodId: z.string().uuid("يرجى اختيار طريقة الدفع").optional().or(z.literal("")),
  subjectIds: z.array(z.string().uuid()).min(1, "يجب اختيار مادة دراسية واحدة على الأقل"),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
  sessionToken: string;
  onSuccess: (result: SubmitRegistrationResponse, formData: RegistrationFormData) => void;
  onSessionExpired: (msg: string) => void;
}

export default function RegistrationForm({
  sessionToken,
  onSuccess,
  onSessionExpired,
}: RegistrationFormProps) {
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);

  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      whatsappNumber: "",
      country: "مصر",
      universityId: "",
      academicYearId: "",
      semesterId: "",
      moduleId: "",
      paymentMethodId: "",
      subjectIds: [],
    },
  });

  const selectedUniversityId = watch("universityId");
  const selectedAcademicYearId = watch("academicYearId");
  const selectedSemesterId = watch("semesterId");
  const selectedModuleId = watch("moduleId");
  const selectedPaymentMethodId = watch("paymentMethodId");

  // 1. Load Universities, Academic Years, and Payment Methods on mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoadingCatalog(true);
        const [unis, years, payments] = await Promise.all([
          fetchUniversities(),
          fetchAcademicYears(),
          fetchPaymentMethods(),
        ]);
        setUniversities(unis);
        setAcademicYears(years);
        setPaymentMethods(payments);

        // Automatically preselect default Cash or first active payment method
        if (payments.length > 0) {
          const defaultCash = payments.find((p) => p.code.toLowerCase() === "cash") || payments[0];
          setValue("paymentMethodId", defaultCash.id);
        }
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : "تعذر تحميل البيانات المرجعية.");
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, [setValue]);

  // 2. Fetch Semesters when Academic Year changes (Cascading Reset)
  useEffect(() => {
    if (!selectedAcademicYearId) {
      setSemesters([]);
      setModules([]);
      setSubjects([]);
      setValue("semesterId", "");
      setValue("moduleId", "");
      setValue("subjectIds", []);
      return;
    }

    async function loadSemesters() {
      try {
        setLoadingSemesters(true);
        setSemesters([]);
        setModules([]);
        setSubjects([]);
        setValue("semesterId", "");
        setValue("moduleId", "");
        setValue("subjectIds", []);

        const list = await fetchSemesters(selectedAcademicYearId);
        setSemesters(list);
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : "تعذر تحميل قائمة الترمات.");
      } finally {
        setLoadingSemesters(false);
      }
    }

    loadSemesters();
  }, [selectedAcademicYearId, setValue]);

  // 3. Fetch Modules when Semester changes (Cascading Reset)
  useEffect(() => {
    if (!selectedSemesterId) {
      setModules([]);
      setSubjects([]);
      setValue("moduleId", "");
      setValue("subjectIds", []);
      return;
    }

    async function loadModules() {
      try {
        setLoadingModules(true);
        setModules([]);
        setSubjects([]);
        setValue("moduleId", "");
        setValue("subjectIds", []);

        const list = await fetchModules(selectedSemesterId);
        setModules(list);
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : "تعذر تحميل قائمة الموديولات.");
      } finally {
        setLoadingModules(false);
      }
    }

    loadModules();
  }, [selectedSemesterId, setValue]);

  // 4. Fetch Subjects when University, Academic Year, Semester, and Module are selected
  useEffect(() => {
    if (!selectedUniversityId || !selectedAcademicYearId || !selectedSemesterId || !selectedModuleId) {
      setSubjects([]);
      setValue("subjectIds", []);
      return;
    }

    async function loadSubjects() {
      try {
        setLoadingSubjects(true);
        const list = await fetchSubjects(
          selectedUniversityId,
          selectedAcademicYearId,
          selectedSemesterId,
          selectedModuleId
        );
        setSubjects(list);
        setValue("subjectIds", []); // Reset selected subjects on module change
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : "تعذر تحميل المواد.");
      } finally {
        setLoadingSubjects(false);
      }
    }

    loadSubjects();
  }, [selectedUniversityId, selectedAcademicYearId, selectedSemesterId, selectedModuleId, setValue]);

  const onSubmit = async (data: RegistrationFormData) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setFormError(null);

      const result = await submitRegistration({
        session_token: sessionToken,
        full_name: data.fullName,
        phone_number: data.phoneNumber,
        whatsapp_number: data.whatsappNumber,
        country: data.country,
        university_id: data.universityId,
        academic_year_id: data.academicYearId,
        semester_id: data.semesterId,
        module_id: data.moduleId,
        payment_method_id: data.paymentMethodId || undefined,
        subject_ids: data.subjectIds,
      });

      // Show success screen immediately to the student without waiting for Google Sheets
      onSuccess(result, data);

      // Trigger Google Sheets sync asynchronously in background (fire-and-forget)
      if (result?.registration_id && sessionToken) {
        fetch("/api/sync/sheets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            registrationId: result.registration_id,
            sessionToken: sessionToken,
          }),
        }).catch((syncErr) => {
          // Log locally; registration in Supabase is already confirmed and safe
          console.warn("[SheetsSync] Background sync request error:", syncErr);
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء إرسال التسجيل.";
      if (msg.includes("جلسة") || msg.includes("مسبقاً") || msg.includes("صلاحية")) {
        onSessionExpired(msg);
      } else {
        setFormError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6"
      dir="rtl"
    >
      {/* Form Header */}
      <div className="border-b border-slate-100 pb-5">
        <h2 className="text-xl font-bold text-slate-900">
          تسجيل محاضرات VIP Academy
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          أكمل بياناتك واختر الموديول والمواد المطلوبة
        </p>
      </div>

      {formError && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{formError}</span>
        </div>
      )}

      {/* 1. Full Name */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700">
          اسم الطالب بالكامل (باللغة العربية) <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
            <User className="w-4 h-4" />
          </div>
          <input
            type="text"
            {...register("fullName")}
            placeholder="مثال: أحمد محمد علي حسن"
            className={`w-full bg-white border rounded-xl pr-10 pl-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
              errors.fullName
                ? "border-rose-300 focus:ring-rose-500/20"
                : "border-slate-200 focus:border-blue-600 focus:ring-blue-500/20"
            }`}
          />
        </div>
        <p className="text-[11px] text-slate-500">
          ⚠️ اكتب اسمك بالعربية كما ستدخله في تطبيق @HOME
        </p>
        {errors.fullName && (
          <p className="text-xs text-rose-600 font-medium">
            {errors.fullName.message}
          </p>
        )}
      </div>

      {/* 2 & 3. Phone & WhatsApp */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          name="phoneNumber"
          control={control}
          render={({ field }) => (
            <PhoneInput
              label="رقم الهاتف"
              value={field.value}
              onChange={field.onChange}
              error={errors.phoneNumber?.message}
            />
          )}
        />

        <Controller
          name="whatsappNumber"
          control={control}
          render={({ field }) => (
            <PhoneInput
              label="رقم WhatsApp"
              isWhatsApp={true}
              value={field.value}
              onChange={field.onChange}
              error={errors.whatsappNumber?.message}
            />
          )}
        />
      </div>

      {/* 4. Country */}
      <Controller
        name="country"
        control={control}
        render={({ field }) => (
          <CountrySelect
            value={field.value}
            onChange={field.onChange}
            error={errors.country?.message}
          />
        )}
      />

      {/* 5 & 6. University & Academic Year */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* University Select */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            الجامعة <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
              <Building2 className="w-4 h-4" />
            </div>
            <select
              {...register("universityId")}
              disabled={loadingCatalog}
              className={`w-full bg-white border rounded-xl pr-10 pl-4 py-3 text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 ${
                errors.universityId
                  ? "border-rose-300 focus:ring-rose-500/20"
                  : "border-slate-200 focus:border-blue-600 focus:ring-blue-500/20"
              }`}
            >
              <option value="" disabled>
                {loadingCatalog ? "جاري التحميل..." : "اختر الجامعة..."}
              </option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name_ar} ({u.name_en})
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors.universityId && (
            <p className="text-xs text-rose-600 font-medium">
              {errors.universityId.message}
            </p>
          )}
        </div>

        {/* Academic Year Select */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            الفرقة الدراسية <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
              <GraduationCap className="w-4 h-4" />
            </div>
            <select
              {...register("academicYearId")}
              disabled={loadingCatalog}
              className={`w-full bg-white border rounded-xl pr-10 pl-4 py-3 text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 ${
                errors.academicYearId
                  ? "border-rose-300 focus:ring-rose-500/20"
                  : "border-slate-200 focus:border-blue-600 focus:ring-blue-500/20"
              }`}
            >
              <option value="" disabled>
                {loadingCatalog ? "جاري التحميل..." : "اختر الفرقة..."}
              </option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name_ar} ({y.name_en})
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors.academicYearId && (
            <p className="text-xs text-rose-600 font-medium">
              {errors.academicYearId.message}
            </p>
          )}
        </div>
      </div>

      {/* 7 & 8. Semester & Module Selects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Semester Select */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            الترم الدراسي <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
              <CalendarDays className="w-4 h-4" />
            </div>
            <select
              {...register("semesterId")}
              disabled={!selectedAcademicYearId || loadingSemesters}
              className={`w-full bg-white border rounded-xl pr-10 pl-4 py-3 text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
                errors.semesterId
                  ? "border-rose-300 focus:ring-rose-500/20"
                  : "border-slate-200 focus:border-blue-600 focus:ring-blue-500/20"
              }`}
            >
              <option value="" disabled>
                {!selectedAcademicYearId
                  ? "اختر الفرقة أولاً..."
                  : loadingSemesters
                  ? "جاري تحميل الترمات..."
                  : semesters.length === 0
                  ? "لا توجد ترمات لهذه الفرقة"
                  : "اختر الترم..."}
              </option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_ar} {s.name_en ? `(${s.name_en})` : ""}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors.semesterId && (
            <p className="text-xs text-rose-600 font-medium">
              {errors.semesterId.message}
            </p>
          )}
        </div>

        {/* Module Select */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            الموديول <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
              <Boxes className="w-4 h-4" />
            </div>
            <select
              {...register("moduleId")}
              disabled={!selectedSemesterId || loadingModules}
              className={`w-full bg-white border rounded-xl pr-10 pl-4 py-3 text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
                errors.moduleId
                  ? "border-rose-300 focus:ring-rose-500/20"
                  : "border-slate-200 focus:border-blue-600 focus:ring-blue-500/20"
              }`}
            >
              <option value="" disabled>
                {!selectedSemesterId
                  ? "اختر الترم أولاً..."
                  : loadingModules
                  ? "جاري تحميل الموديولات..."
                  : modules.length === 0
                  ? "لا توجد موديولات لهذا الترم"
                  : "اختر الموديول..."}
              </option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name_ar} {m.name_en ? `(${m.name_en})` : ""}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors.moduleId && (
            <p className="text-xs text-rose-600 font-medium">
              {errors.moduleId.message}
            </p>
          )}
        </div>
      </div>

      {/* 9. Subjects Multi-select */}
      <Controller
        name="subjectIds"
        control={control}
        render={({ field }) => (
          <SubjectSelector
            subjects={subjects}
            selectedSubjectIds={field.value}
            onChange={field.onChange}
            loading={loadingSubjects}
            hasSelectionCriteria={Boolean(
              selectedUniversityId &&
              selectedAcademicYearId &&
              selectedSemesterId &&
              selectedModuleId
            )}
            error={errors.subjectIds?.message}
          />
        )}
      />

      {/* 10. Payment Method Selection */}
      {paymentMethods.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              طريقة الدفع <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {paymentMethods.length === 1 ? "الدفع النقدي متاح حالياً" : "اختر وسيلة الدفع المناسبة"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paymentMethods.map((pm) => {
              const isSelected = selectedPaymentMethodId === pm.id;
              const isCash = pm.code.toLowerCase() === "cash";

              return (
                <button
                  type="button"
                  key={pm.id}
                  onClick={() => setValue("paymentMethodId", pm.id, { shouldValidate: true })}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs"
                      : "bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white text-slate-500 border border-slate-200"
                      }`}
                    >
                      {isCash ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">{pm.name_ar}</p>
                      {pm.name_en && (
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">{pm.name_en}</p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 mr-2">
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-300 bg-white" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {errors.paymentMethodId && (
            <p className="text-xs text-rose-600 font-medium">
              {errors.paymentMethodId.message}
            </p>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4 border-t border-slate-100">
        <button
          type="submit"
          disabled={submitting || loadingCatalog}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري حفظ وتأكيد التسجيل...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>تأكيد التسجيل</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
