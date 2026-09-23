# VIP Academy Registration System

نظام تسجيل الطلاب والاشتراكات الخاص بـ **VIP Academy**.

---

## 🚀 نظرة عامة على المشروع (Project Overview)

تم بناء هذا النظام لتسهيل وأتمتة عملية تسجيل الطلاب عبر نظام يعتمد على مسح رمز الاستجابة السريعة (QR Code Flow)، والتحقق من رموز الاستخدام لمرة واحدة (One-time QR tokens)، وجمع بيانات الطلاب والمواد الدراسية بدقة وإرسالها إلى قاعدة بيانات Supabase مع إمكانية المزامنة مع Google Sheets وإدارة المشرفين لاحقاً.

---

## 🛠 التقنيات المستخدمة (Tech Stack)

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) + [@hookform/resolvers](https://github.com/react-hook-form/resolvers)
- **Phone Validation**: [libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js)
- **QR Engine**: [qrcode.react](https://github.com/zpao/qrcode.react)
- **Backend / Database**: [Supabase](https://supabase.com/)
- **Localization**: Arabic RTL Native Support (خط Cairo)

---

## 📂 هيكل المشروع (Project Structure)

```text
vip-academy-registration/
├── public/                 # الملفات الثابتة والأصول
├── src/
│   ├── app/                # صفحات وتوجيهات Next.js App Router
│   │   ├── globals.css     # التنسيقات العامة و Tailwind CSS
│   │   ├── layout.tsx      # الهيكل العام (RTL + Arabic Font)
│   │   └── page.tsx        # صفحة التأكيد والبداية
│   ├── components/         # المكونات القابلة لإعادة الاستخدام (UI & Features)
│   ├── hooks/              # Custom React Hooks
│   ├── lib/                # عملاء ومكتبات الربط (Supabase Client)
│   ├── services/           # دوال الاتصال بالـ API وقواعد البيانات
│   ├── types/              # تعريفات الأنواع (TypeScript Types/Interfaces)
│   └── utils/              # دوال المساعدة العامة (Formatting, Validation)
├── .env.local.example      # نموذج للمتغيرات البيئية المطلوبة
├── package.json            # تعريف التبعيات والأوامر
├── tsconfig.json           # إعدادات TypeScript
└── README.md               # توثيق المشروع
```

---

## ⚙️ التثبيت والتشغيل المحلي (Getting Started)

### 1. تثبيت الحزم (Install Dependencies)
```bash
npm install
```

### 2. إعداد المتغيرات البيئية (Environment Variables)
قم بنسخ ملف `.env.local.example` إلى `.env.local` وأضف القيم الخاصة بمشروع Supabase:
```bash
cp .env.local.example .env.local
```

### 3. تشغيل السيرفر المحلي للتطوير (Development Server)
```bash
npm run dev
```
افتح المتصفح على: [http://localhost:3000](http://localhost:3000)

---

## 🧪 أوامر الفحص والتحقق (Scripts & Verification)

- **فحص الكود والتنسيق (Linting)**:
  ```bash
  npm run lint
  ```
- **بناء المشروع للإنتاج (Production Build Check)**:
  ```bash
  npm run build
  ```
- **تشغيل نسخة الإنتاج (Production Preview)**:
  ```bash
  npm run start
  ```

---

---

## 📊 مزامنة Google Sheets (Google Sheets Synchronization)

يتضمن النظام محرك مزامنة من جانب الخادم (Server-side Sync Engine) يقوم بتصدير بيانات تسجيلات الطلاب تلقائياً إلى جدول بيانات Google Sheets بعد إتمام التسجيل بنجاح في Supabase.

### 1. إعداد Google Cloud & Service Account
1. الدخول إلى [Google Cloud Console](https://console.cloud.google.com/).
2. إنشاء مشروع جديد وتفعيل **Google Sheets API**.
3. إنشاء **Service Account** وإنشاء مفتاح مفوض بصيغة **JSON Key**.
4. استخراج `client_email` و `private_key` من ملف الـ JSON.

### 2. إعداد جدول البيانات (Google Spreadsheet)
1. الـ Spreadsheet المستهدف:
   - **Spreadsheet ID**: `1G6uUU2t9d9R_ymqSFvCyvgZUff1MivfExCkLXcqMF4A`
   - **Sheet/Tab Name**: `Registrations`
   - **Range**: `Registrations!A:K`
2. إضافة صف العناوين في الصف الأول (Row 1):
   `Registration ID | Registration Date | Student Name | Phone | WhatsApp | Country | University | Academic Year | Registered Subjects | Total Amount | Sync Status`
3. **مهم جداً (Permissions)**: مشاركة ملف الـ Spreadsheet مع إيميل الـ Service Account بصلاحية **Editor**.

### 3. المتغيرات البيئية المطلوبة (.env.local)
```env
# Google Sheets Synchronization (Server-side ONLY)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=1G6uUU2t9d9R_ymqSFvCyvgZUff1MivfExCkLXcqMF4A
GOOGLE_SHEETS_RANGE=Registrations!A:K
```

### 4. آلية العمل وعدم التكرار (Idempotency & Retry)
- **استقلالية التسجيل (UX Independence)**: نجاح تسجيل الطالب لا يتوقف على Google Sheets. يتم حفظ التسجيل في Supabase أولاً كـ Source of Truth، ثم تُطلق المزامنة في الخلفية. إذا تعذر الاتصال بـ Google Sheets، يظل تسجيل الطالب مؤكداً بنجاح وتُسجل الحالة `sync_status = 'failed'`.
- **منع التكرار (Idempotency)**: قبل إضافة أي صف جديد، يفحص النظام العمود A في الشيت؛ إذا وُجد `Registration ID` مسبقاً، يتم تحديث الصف نفسه بدلاً من إضافة صف مكرر.
- **إعادة المحاولة (Retry Mechanism)**: يمكن إعادة مزامنة أي تسجيل متعثر في أي وقت عبر استدعاء المسار الداخلي `/api/sync/sheets` بإرسال `{ "registrationId": "<UUID>" }`.

---

## 🔒 الملاحظات الأمنية (Security Notes)
- لا تضع مفاتيح سرية (Service Role Keys، Google Private Keys، أو كلمات مرور) في الملفات العامة أو كود الواجهة الأمامية.
- تأكد من استخدام المتغيرات التي تبدأ بـ `NEXT_PUBLIC_` فقط للمفاتيح العامة المسموح بظهورها للمتصفح.
- يتم تخزين والتعامل مع `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` حصرياً على الخادم (Server-Side) ولا يتم تضمينها في حزم الـ Client bundle.
