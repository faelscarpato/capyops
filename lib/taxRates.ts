export type TaxRates = {
  mlFee: number;
  cbs: number;
  ibs: number;
  is: number;
  margin: number;
};

const STORAGE_KEY = 'capyops-tax-rates';

export const DEFAULT_TAX_RATES: TaxRates = {
  mlFee: 17,
  cbs: 0.9,
  ibs: 0.1,
  is: 0,
  margin: 40
};

export function readTaxRates(): TaxRates {
  if (typeof window === 'undefined') return { ...DEFAULT_TAX_RATES };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TAX_RATES };
    const parsed = JSON.parse(raw) as Partial<TaxRates>;
    return { ...DEFAULT_TAX_RATES, ...parsed };
  } catch {
    return { ...DEFAULT_TAX_RATES };
  }
}

export function writeTaxRates(patch: Partial<TaxRates>): TaxRates {
  if (typeof window === 'undefined') return { ...DEFAULT_TAX_RATES, ...patch };
  const next = { ...readTaxRates(), ...patch };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
