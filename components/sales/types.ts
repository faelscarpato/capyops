export type SaleDraftItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string; // input (unitário)
  packagingCost: string; // input (por pedido / linha)
  useAutoPackaging: boolean;
  applyKitStock: boolean;
};

export function toNumber(v: string): number {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function round2(n: number): number {
  return Number(n.toFixed(2));
}

export function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
