export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";
export const rtlLocales = new Set<Locale>(["ar"]);

// Always prefix locale in the URL: /ar, /en
export const localePrefix = "always" as const;

export function isRTL(locale: string): boolean {
  return rtlLocales.has(locale as Locale);
}

