import { digitsOnly } from '@/lib/arabic/normalize';

// Basic E.164 normalization using default country; keep lightweight without external deps.
// Assumptions: input contains national numbers; we prepend default country calling code when missing leading '+'

export function normalizeToE164(raw: string, opts: { defaultCountry?: 'SA'|'AE'|'EG'|'JO'|'KW'|'BH'|'QA'|'OM'|'LB'|'MA'|'TN'|'DZ', countryCode?: string } = {}): { e164?: string; digits?: string } {
  const digits = digitsOnly(raw);
  if (!digits) return { e164: undefined, digits: '' };
  // country calling codes map (partial)
  const map: Record<string, string> = {
    SA: '966', AE: '971', EG: '20', JO: '962', KW: '965', BH: '973', QA: '974', OM: '968', LB: '961', MA: '212', TN: '216', DZ: '213'
  };
  const cc = opts.countryCode || map[opts.defaultCountry || 'SA'] || '966';
  // Heuristic: if number starts with '0' and length >= 9, drop leading zero when forming E.164
  let national = digits;
  if (national.startsWith('00')) {
    // 00 prefix -> international
    const intl = '+' + national.slice(2);
    return { e164: intl, digits: digitsOnly(intl) };
  }
  if (national.startsWith('0')) national = national.replace(/^0+/, '');
  // If already starts with country code
  if (national.startsWith(cc)) {
    return { e164: `+${national}`, digits: national };
  }
  return { e164: `+${cc}${national}`, digits: `${cc}${national}` };
}

