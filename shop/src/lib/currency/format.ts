export function formatMoney(value: number, locale: string, currency: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  } catch {
    return value.toFixed(2) + ' ' + currency;
  }
}

export function arabicDigits(value: string, locale: string): string {
  try {
    const nf = new Intl.NumberFormat(locale);
    const digits = Array.from({ length: 10 }, (_, i) => nf.format(i));
    return value.replace(/[0-9]/g, (d) => digits[Number(d)]);
  } catch {
    return value;
  }
}
