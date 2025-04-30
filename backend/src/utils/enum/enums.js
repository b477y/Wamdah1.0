export const Currency = Object.freeze({
  USD: { en: "USD", ar: "دولار أمريكي" },
  EUR: { en: "EGP", ar: "جنيه مصري" },
});

export const Languages = Object.freeze({
  arabic: { en: "AR", ar: "عربي" },
  english: { en: "EN", ar: "إنجليزي" },
});

export const AccentsAndDialects = Object.freeze({
  american: { en: "American", ar: "الامريكية" },
  british: { en: "British", ar: "البريطانية" },
  egyptian: { en: "Egyptian", ar: "المصرية" },
  syrian: { en: "Syrian", ar: "السورية" },
});

export const Genders = Object.freeze({
  female: { en: "Female", ar: "أنثي" },
  male: { en: "Male", ar: "ذكر" },
});

export const UserRole = Object.freeze({
  ADMIN: "Admin",
  USER: "User",
});

export const TokenType = Object.freeze({
  ACCESS: "Access",
  REFRESH: "Refresh",
});
