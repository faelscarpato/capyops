export type Packaging = {
  id: string;
  name: string;
  type: string;
  cost: number;
  width_cm: number;
  height_cm: number;
  length_cm: number;
  weight_kg: number;
  notes?: string | null;
  is_active: boolean;
  updated_at: string;
};

export type ShippingRate = {
  id: string;
  region: string;
  carrier: string;
  service: string;
  base_cost: number;
  cost_per_kg: number;
  eta_days: number;
  notes?: string | null;
  updated_at: string;
};

const STORAGE_PACKAGING = 'capyops-packaging';
const STORAGE_SHIPPING = 'capyops-shipping-rates';

function safeNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function readPackaging(): Packaging[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PACKAGING);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Packaging>[];
    return (parsed || []).map((p) => ({
      id: String(p.id ?? makeId('pack')),
      name: String(p.name ?? 'Embalagem'),
      type: String(p.type ?? 'Caixa'),
      cost: safeNumber(p.cost),
      width_cm: safeNumber(p.width_cm),
      height_cm: safeNumber(p.height_cm),
      length_cm: safeNumber(p.length_cm),
      weight_kg: safeNumber(p.weight_kg),
      notes: p.notes ?? null,
      is_active: p.is_active !== false,
      updated_at: String(p.updated_at ?? new Date().toISOString())
    }));
  } catch {
    return [];
  }
}

export function writePackaging(items: Packaging[]): Packaging[] {
  if (typeof window === 'undefined') return items;
  const safe = (items || []).map((p) => ({
    ...p,
    cost: safeNumber(p.cost),
    width_cm: safeNumber(p.width_cm),
    height_cm: safeNumber(p.height_cm),
    length_cm: safeNumber(p.length_cm),
    weight_kg: safeNumber(p.weight_kg),
    updated_at: p.updated_at || new Date().toISOString()
  }));
  window.localStorage.setItem(STORAGE_PACKAGING, JSON.stringify(safe));
  return safe;
}

export function upsertPackaging(p: Partial<Packaging> & { name: string }): Packaging[] {
  const current = readPackaging();
  const id = p.id ?? makeId('pack');
  const next: Packaging = {
    id,
    name: p.name,
    type: p.type ?? 'Caixa',
    cost: safeNumber(p.cost),
    width_cm: safeNumber(p.width_cm),
    height_cm: safeNumber(p.height_cm),
    length_cm: safeNumber(p.length_cm),
    weight_kg: safeNumber(p.weight_kg),
    notes: p.notes ?? null,
    is_active: p.is_active !== false,
    updated_at: new Date().toISOString()
  };
  const idx = current.findIndex((x) => x.id === id);
  if (idx >= 0) current[idx] = next;
  else current.push(next);
  return writePackaging(current);
}

export function deletePackaging(id: string): Packaging[] {
  return writePackaging(readPackaging().filter((p) => p.id !== id));
}

export function readShippingRates(): ShippingRate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_SHIPPING);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<ShippingRate>[];
    return (parsed || []).map((r) => ({
      id: String(r.id ?? makeId('ship')),
      region: String(r.region ?? 'BR'),
      carrier: String(r.carrier ?? 'Correios'),
      service: String(r.service ?? 'Padrão'),
      base_cost: safeNumber(r.base_cost),
      cost_per_kg: safeNumber(r.cost_per_kg),
      eta_days: safeNumber(r.eta_days),
      notes: r.notes ?? null,
      updated_at: String(r.updated_at ?? new Date().toISOString())
    }));
  } catch {
    return [];
  }
}

export function writeShippingRates(items: ShippingRate[]): ShippingRate[] {
  if (typeof window === 'undefined') return items;
  const safe = (items || []).map((r) => ({
    ...r,
    base_cost: safeNumber(r.base_cost),
    cost_per_kg: safeNumber(r.cost_per_kg),
    eta_days: safeNumber(r.eta_days),
    updated_at: r.updated_at || new Date().toISOString()
  }));
  window.localStorage.setItem(STORAGE_SHIPPING, JSON.stringify(safe));
  return safe;
}

export function upsertShippingRate(r: Partial<ShippingRate> & { region: string; carrier: string; service: string }): ShippingRate[] {
  const current = readShippingRates();
  const id = r.id ?? makeId('ship');
  const next: ShippingRate = {
    id,
    region: r.region,
    carrier: r.carrier,
    service: r.service,
    base_cost: safeNumber(r.base_cost),
    cost_per_kg: safeNumber(r.cost_per_kg),
    eta_days: safeNumber(r.eta_days),
    notes: r.notes ?? null,
    updated_at: new Date().toISOString()
  };
  const idx = current.findIndex((x) => x.id === id);
  if (idx >= 0) current[idx] = next;
  else current.push(next);
  return writeShippingRates(current);
}

export function deleteShippingRate(id: string): ShippingRate[] {
  return writeShippingRates(readShippingRates().filter((r) => r.id !== id));
}
