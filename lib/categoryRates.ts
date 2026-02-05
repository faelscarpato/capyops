export type CategoryRate = {
  id: string;
  category: string;
  channel?: string | null;
  mlFeePercent: number;
  taxCbsPercent: number;
  taxIbsPercent: number;
  taxIsPercent: number;
  marginPercent: number;
  updated_at: string;
};

const STORAGE_KEY = 'capyops-category-rates';

function safeNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `rate_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function readCategoryRates(): CategoryRate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<CategoryRate>[];
    return (parsed || []).map((r) => ({
      id: String(r.id ?? makeId()),
      category: String(r.category ?? 'Geral'),
      channel: r.channel ?? null,
      mlFeePercent: safeNumber(r.mlFeePercent),
      taxCbsPercent: safeNumber(r.taxCbsPercent),
      taxIbsPercent: safeNumber(r.taxIbsPercent),
      taxIsPercent: safeNumber(r.taxIsPercent),
      marginPercent: safeNumber(r.marginPercent),
      updated_at: String(r.updated_at ?? new Date().toISOString())
    }));
  } catch {
    return [];
  }
}

export function writeCategoryRates(rates: CategoryRate[]): CategoryRate[] {
  if (typeof window === 'undefined') return rates;
  const safe = (rates || []).map((r) => ({
    ...r,
    mlFeePercent: safeNumber(r.mlFeePercent),
    taxCbsPercent: safeNumber(r.taxCbsPercent),
    taxIbsPercent: safeNumber(r.taxIbsPercent),
    taxIsPercent: safeNumber(r.taxIsPercent),
    marginPercent: safeNumber(r.marginPercent),
    updated_at: r.updated_at || new Date().toISOString()
  }));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  return safe;
}

export function upsertCategoryRate(rate: Partial<CategoryRate> & { category: string }): CategoryRate[] {
  const current = readCategoryRates();
  const id = rate.id ?? makeId();
  const next = {
    id,
    category: rate.category,
    channel: rate.channel ?? null,
    mlFeePercent: safeNumber(rate.mlFeePercent),
    taxCbsPercent: safeNumber(rate.taxCbsPercent),
    taxIbsPercent: safeNumber(rate.taxIbsPercent),
    taxIsPercent: safeNumber(rate.taxIsPercent),
    marginPercent: safeNumber(rate.marginPercent),
    updated_at: new Date().toISOString()
  } as CategoryRate;
  const idx = current.findIndex((r) => r.id === id);
  if (idx >= 0) {
    current[idx] = next;
  } else {
    current.push(next);
  }
  return writeCategoryRates(current);
}

export function deleteCategoryRate(id: string): CategoryRate[] {
  const current = readCategoryRates();
  const next = current.filter((r) => r.id !== id);
  return writeCategoryRates(next);
}
