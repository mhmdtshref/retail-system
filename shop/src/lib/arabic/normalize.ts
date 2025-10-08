// Arabic normalization utilities for diacritics-insensitive search

const DIACRITICS_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g; // Tashkeel and Quranic marks

const HAMZA_FORMS = /[\u0623\u0625\u0622\u0624\u0626]/g; // أ إ آ ؤ ئ

const ALEF_VARIANTS = /[\u0625\u0622]/g; // إ آ -> ا (covered by HAMZA_FORMS replacement)

const T_MARBUTA = /\u0629/g; // ة

const ALEF_MAKSURA = /\u0649/g; // ى

function stripDiacritics(input: string): string {
  return input.replace(DIACRITICS_REGEX, '');
}

export type TaMarbutaMode = 'h' | 't';

function normalizeWhitespaceLower(input: string): string {
  return input.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function normalizeArabicName(input: string, opts?: { normalizeHamzaToAlef?: boolean; taMarbutaAs?: TaMarbutaMode }): string {
  if (!input) return '';
  const { normalizeHamzaToAlef = true, taMarbutaAs = 'h' } = opts || {};
  let s = input;
  s = stripDiacritics(s);
  if (normalizeHamzaToAlef) {
    s = s.replace(HAMZA_FORMS, '\u0627'); // convert hamza forms to bare alef ا
  }
  s = s.replace(ALEF_VARIANTS, '\u0627'); // ensure إ آ -> ا
  s = s.replace(ALEF_MAKSURA, '\u064A'); // ى -> ي
  s = s.replace(T_MARBUTA, taMarbutaAs === 'h' ? '\u0647' : '\u062A'); // ة -> ه or ت
  s = normalizeWhitespaceLower(s);
  return s;
}

export function normalizeEnglishName(input: string): string {
  if (!input) return '';
  return normalizeWhitespaceLower(input.normalize('NFKD').replace(/[^\x00-\x7F]/g, ''));
}

export function digitsOnly(input: string): string {
  return (input || '').replace(/\D+/g, '');
}

