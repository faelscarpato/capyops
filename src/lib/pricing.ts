export type PricingInputs = {
  productCost: number; // custo do produto
  packagingCost: number; // custo embalagem (por pedido)
  shippingCost: number; // frete pago pela loja (por pedido)
  mlFeePercent: number; // taxa ML em %, ex: 16.5
  taxCbsPercent: number; // CBS %
  taxIbsPercent: number; // IBS %
  taxIsPercent: number; // IS %
  marginPercent: number; // margem desejada %
};

export type PricingResult = {
  finalPrice: number | null; // preço sugerido de venda (unitário)
  totalCost: number; // custo total estimado (custos base + taxas/impostos)
  grossProfit: number; // lucro bruto em moeda
  grossMarginPercent: number; // margem bruta final em %
  breakdown: {
    baseCost: number;
    productCost: number;
    packagingCost: number;
    shippingCost: number;
    mlFeeValue: number;
    taxCbsValue: number;
    taxIbsValue: number;
    taxIsValue: number;
    marginValue: number;
  };
};

function round2(n: number): number {
  return Number(n.toFixed(2));
}

function safe(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

/**
 * Fórmula alinhada com o Precificador atual do CapyOps:
 * price = baseCost / (1 - (ml + cbs + ibs + is + margin))
 *
 * Onde ml/cbs/ibs/is/margin são percentuais aplicados sobre o preço final.
 */
export function calculatePrice(inputs: PricingInputs): PricingResult {
  const productCost = safe(inputs.productCost);
  const packagingCost = safe(inputs.packagingCost);
  const shippingCost = safe(inputs.shippingCost);

  const baseCost = productCost + packagingCost + shippingCost;

  const ml = safe(inputs.mlFeePercent) / 100;
  const cbs = safe(inputs.taxCbsPercent) / 100;
  const ibs = safe(inputs.taxIbsPercent) / 100;
  const is = safe(inputs.taxIsPercent) / 100;
  const margin = safe(inputs.marginPercent) / 100;

  const totalRate = ml + cbs + ibs + is + margin;

  const finalPrice = totalRate >= 1 ? null : baseCost / (1 - totalRate);

  const mlFeeValue = finalPrice == null ? 0 : finalPrice * ml;
  const taxCbsValue = finalPrice == null ? 0 : finalPrice * cbs;
  const taxIbsValue = finalPrice == null ? 0 : finalPrice * ibs;
  const taxIsValue = finalPrice == null ? 0 : finalPrice * is;
  const marginValue = finalPrice == null ? 0 : finalPrice * margin;

  const totalCost = baseCost + mlFeeValue + taxCbsValue + taxIbsValue + taxIsValue;

  const grossProfit = finalPrice == null ? 0 : finalPrice - totalCost;
  const grossMarginPercent = finalPrice && finalPrice > 0 ? (grossProfit / finalPrice) * 100 : 0;

  return {
    finalPrice: finalPrice == null ? null : round2(finalPrice),
    totalCost: round2(totalCost),
    grossProfit: round2(grossProfit),
    grossMarginPercent: round2(grossMarginPercent),
    breakdown: {
      baseCost: round2(baseCost),
      productCost: round2(productCost),
      packagingCost: round2(packagingCost),
      shippingCost: round2(shippingCost),
      mlFeeValue: round2(mlFeeValue),
      taxCbsValue: round2(taxCbsValue),
      taxIbsValue: round2(taxIbsValue),
      taxIsValue: round2(taxIsValue),
      marginValue: round2(marginValue)
    }
  };
}
