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

## 🔒 الملاحظات الأمنية (Security Notes)
- لا تضع مفاتيح سرية (Service Role Keys أو كلمات مرور) في الملفات العامة أو كود الواجهة الأمامية.
- تأكد من استخدام المتغيرات التي تبدأ بـ `NEXT_PUBLIC_` فقط للمفاتيح العامة المسموح بظهورها للمتصفح.
