/*src\lib\messages.fa.ts */

// رشته‌های مشترک رابط کاربری — طبق بخش ب.۲ طرح اجرایی.
// هدف: جلوگیری از تکرار رشته‌های عمومی در چند صفحه.
// متن‌های کاملاً محلی/خاص یک صفحه لازم نیست حتماً اینجا باشند.

export const messages = {
  auth: {
    login: "ورود",
    register: "ثبت‌نام",
    logout: "خروج از حساب",
    email: "ایمیل",
    password: "رمز عبور",
    currentPassword: "رمز عبور فعلی",
    newPassword: "رمز عبور جدید",
    confirmNewPassword: "تکرار رمز عبور جدید",
  },

  common: {
    save: "ذخیره",
    saving: "در حال ذخیره...",
    cancel: "لغو",
    delete: "حذف",
    edit: "ویرایش",
    loading: "در حال بارگذاری...",
    submit: "ارسال",
    back: "بازگشت",
    close: "بستن",
    search: "جستجو",
    filter: "فیلتر",
    all: "همه",
    yes: "بله",
    no: "خیر",
    accept: "تأیید",
    reject: "رد",
    viewAll: "مشاهده همه",
    noResults: "موردی یافت نشد",
    somethingWentWrong: "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
  },

  roles: {
    professor: "استاد",
    student: "دانشجو",
    admin: "مدیر سامانه",
  },

  status: {
    pending: "در انتظار بررسی",
    approved: "تأییدشده",
    rejected: "ردشده",
    active: "فعال",
    completed: "تکمیل‌شده",
  },
} as const;
