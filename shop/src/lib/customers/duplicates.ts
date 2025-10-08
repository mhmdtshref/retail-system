import { normalizeArabicName, normalizeEnglishName, digitsOnly } from '@/lib/arabic/normalize';

export type Candidate = {
  _id: string;
  name_ar_norm?: string;
  name_en_norm?: string;
  phones?: string[];
  score: number; // 0..1
};

export function trigram(s: string): Set<string> {
  const set = new Set<string>();
  const str = `  ${s} `;
  for (let i = 0; i < str.length - 2; i++) set.add(str.slice(i, i + 3));
  return set;
}

export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const A = trigram(a);
  const B = trigram(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function detectDuplicates(input: { fullName_ar?: string; fullName_en?: string; phones?: Array<{ e164: string }> }, existing: Array<{ _id: string; search?: { name_ar_norm?: string; name_en_norm?: string; phone_index?: string[] } }>): Candidate[] {
  const inAr = normalizeArabicName(input.fullName_ar || '');
  const inEn = normalizeEnglishName(input.fullName_en || '');
  const inDigits = new Set<string>((input.phones || []).map((p) => digitsOnly(p.e164)));
  const list: Candidate[] = [];
  for (const e of existing) {
    const ar = e.search?.name_ar_norm || '';
    const en = e.search?.name_en_norm || '';
    const ph = new Set<string>((e.search?.phone_index || []));
    let score = 0;
    if (inAr && ar) score = Math.max(score, similarity(inAr, ar));
    if (inEn && en) score = Math.max(score, similarity(inEn, en));
    // phone exact match boosts
    for (const d of inDigits) {
      if (ph.has(d)) { score = Math.max(score, 1.0); break; }
    }
    if (score >= 0.8) {
      list.push({ _id: e._id, name_ar_norm: ar, name_en_norm: en, phones: Array.from(ph), score });
    }
  }
  return list.sort((a, b) => b.score - a.score);
}

