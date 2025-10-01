export type ParsedLine = {
  code?: string;
  name?: string;
  size?: string;
  color?: string;
  quantity?: number;
  unitCost?: number;
  total?: number;
  raw?: string;
};

// Parser version for auditing
export const PARSER_VERSION = 'dev-0.1';

// Accept lines like:
// CODE SIZE COLOR QTY COST [TOTAL]
// Examples:
// TSHIRT-001-BLK-M M أسود 10 25.00 250.00
// PANTS-010-NVY-32 32 كحلي 5 80 400
// Also support Arabic numerals and "x" multiplicative notations: 10x25, 10×25

function normalizeArabicDigits(input: string): string {
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternArabicIndic = '۰۱۲۳۴۵۶۷۸۹';
  let out = '';
  for (const ch of input) {
    const idxA = arabicIndic.indexOf(ch);
    if (idxA !== -1) { out += String(idxA); continue; }
    const idxE = easternArabicIndic.indexOf(ch);
    if (idxE !== -1) { out += String(idxE); continue; }
    out += ch;
  }
  return out;
}

export function parseRawText(raw: string): ParsedLine[] {
  const lines = normalizeArabicDigits(raw)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: ParsedLine[] = [];
  const regex = /^([A-Za-z0-9\-_.]+)\s+(\S+)\s+(\S+)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)(?:\s+(\d+(?:[.,]\d+)?))?$/;
  const altMul = /^([A-Za-z0-9\-_.]+)\s+(\S+)\s+(\S+)\s+(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)(?:\s*=\s*(\d+(?:[.,]\d+)?))?$/i;

  for (const line of lines) {
    const m = line.match(regex) || line.match(altMul);
    if (!m) {
      // Attempt more lenient split
      const parts = line.split(/\s+/);
      if (parts.length >= 5) {
        const [code, size, color, qtyStr, costStr, totalStr] = parts;
        const qty = Number((qtyStr || '').replace(',', '.'));
        const cost = Number((costStr || '').replace(',', '.'));
        const tot = Number((totalStr || '').replace(',', '.'));
        if (!isNaN(qty) && !isNaN(cost)) {
          out.push({ code, size, color, quantity: qty, unitCost: cost, total: !isNaN(tot) ? tot : undefined, raw: line });
        } else {
          out.push({ raw: line });
        }
      } else {
        out.push({ raw: line });
      }
      continue;
    }
    const code = m[1];
    const size = m[2];
    const color = m[3];
    const quantity = Number(String(m[4]).replace(',', '.'));
    const unitCost = Number(String(m[5]).replace(',', '.'));
    const tot = m[6] ? Number(String(m[6]).replace(',', '.')) : undefined;
    out.push({ code, size, color, quantity, unitCost, total: tot, raw: line });
  }

  return out;
}

