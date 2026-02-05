export type AdsPlatform = {
  id: string;
  name: string;
  fee_percent: number;
  avg_shipping_cost: number;
  notes?: string | null;
  updated_at: string;
};

export type PaidCampaign = {
  id: string;
  platform: string;
  campaign: string;
  daily_budget: number;
  start_date: string;
  end_date?: string | null;
  status: string;
  updated_at: string;
};

const STORAGE_PLATFORMS = 'capyops-ads-platforms';
const STORAGE_CAMPAIGNS = 'capyops-ads-paid';

function safeNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function readAdsPlatforms(): AdsPlatform[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PLATFORMS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<AdsPlatform>[];
    return (parsed || []).map((p) => ({
      id: String(p.id ?? makeId('ads')),
      name: String(p.name ?? 'Plataforma'),
      fee_percent: safeNumber(p.fee_percent),
      avg_shipping_cost: safeNumber(p.avg_shipping_cost),
      notes: p.notes ?? null,
      updated_at: String(p.updated_at ?? new Date().toISOString())
    }));
  } catch {
    return [];
  }
}

export function writeAdsPlatforms(items: AdsPlatform[]): AdsPlatform[] {
  if (typeof window === 'undefined') return items;
  const safe = (items || []).map((p) => ({
    ...p,
    fee_percent: safeNumber(p.fee_percent),
    avg_shipping_cost: safeNumber(p.avg_shipping_cost),
    updated_at: p.updated_at || new Date().toISOString()
  }));
  window.localStorage.setItem(STORAGE_PLATFORMS, JSON.stringify(safe));
  return safe;
}

export function upsertAdsPlatform(p: Partial<AdsPlatform> & { name: string }): AdsPlatform[] {
  const current = readAdsPlatforms();
  const id = p.id ?? makeId('ads');
  const next: AdsPlatform = {
    id,
    name: p.name,
    fee_percent: safeNumber(p.fee_percent),
    avg_shipping_cost: safeNumber(p.avg_shipping_cost),
    notes: p.notes ?? null,
    updated_at: new Date().toISOString()
  };
  const idx = current.findIndex((x) => x.id === id);
  if (idx >= 0) current[idx] = next;
  else current.push(next);
  return writeAdsPlatforms(current);
}

export function deleteAdsPlatform(id: string): AdsPlatform[] {
  return writeAdsPlatforms(readAdsPlatforms().filter((p) => p.id !== id));
}

export function readPaidCampaigns(): PaidCampaign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_CAMPAIGNS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<PaidCampaign>[];
    return (parsed || []).map((c) => ({
      id: String(c.id ?? makeId('paid')),
      platform: String(c.platform ?? 'Plataforma'),
      campaign: String(c.campaign ?? 'Campanha'),
      daily_budget: safeNumber(c.daily_budget),
      start_date: String(c.start_date ?? new Date().toISOString().slice(0, 10)),
      end_date: c.end_date ?? null,
      status: String(c.status ?? 'ativo'),
      updated_at: String(c.updated_at ?? new Date().toISOString())
    }));
  } catch {
    return [];
  }
}

export function writePaidCampaigns(items: PaidCampaign[]): PaidCampaign[] {
  if (typeof window === 'undefined') return items;
  const safe = (items || []).map((c) => ({
    ...c,
    daily_budget: safeNumber(c.daily_budget),
    updated_at: c.updated_at || new Date().toISOString()
  }));
  window.localStorage.setItem(STORAGE_CAMPAIGNS, JSON.stringify(safe));
  return safe;
}

export function upsertPaidCampaign(c: Partial<PaidCampaign> & { platform: string; campaign: string }): PaidCampaign[] {
  const current = readPaidCampaigns();
  const id = c.id ?? makeId('paid');
  const next: PaidCampaign = {
    id,
    platform: c.platform,
    campaign: c.campaign,
    daily_budget: safeNumber(c.daily_budget),
    start_date: c.start_date ?? new Date().toISOString().slice(0, 10),
    end_date: c.end_date ?? null,
    status: c.status ?? 'ativo',
    updated_at: new Date().toISOString()
  };
  const idx = current.findIndex((x) => x.id === id);
  if (idx >= 0) current[idx] = next;
  else current.push(next);
  return writePaidCampaigns(current);
}

export function deletePaidCampaign(id: string): PaidCampaign[] {
  return writePaidCampaigns(readPaidCampaigns().filter((c) => c.id !== id));
}
