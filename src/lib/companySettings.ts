export type CompanySettings = {
  store_name: string;
  legal_name: string;
  cpf: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  logo_url: string;
  logo_data_url: string;
  tax_cbs: number;
  tax_ibs: number;
  tax_is: number;
};

const STORAGE_KEY = 'capyops_company_settings_v1';

const DEFAULT_SETTINGS: CompanySettings = {
  store_name: '',
  legal_name: '',
  cpf: '',
  cnpj: '',
  email: '',
  phone: '',
  address: '',
  logo_url: '',
  logo_data_url: '',
  tax_cbs: 0,
  tax_ibs: 0,
  tax_is: 0
};

export function readCompanySettings(): CompanySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<CompanySettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeCompanySettings(next: CompanySettings): CompanySettings {
  if (typeof window === 'undefined') return next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
