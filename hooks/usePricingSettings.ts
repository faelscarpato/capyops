import { useEffect, useState } from 'react';
import { readCompanySettings, writeCompanySettings } from '../lib/companySettings';
import { readTaxRates, writeTaxRates, DEFAULT_TAX_RATES } from '../lib/taxRates';

export type PricingSettings = {
  mlFeePercent: number;
  taxCbsPercent: number;
  taxIbsPercent: number;
  taxIsPercent: number;
  defaultMarginPercent: number;
};

function safe(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

/**
 * Hook unificado: taxas do Precificador + Nova Venda.
 * - mlFeePercent / defaultMarginPercent persistem via taxRates (localStorage).
 * - CBS/IBS/IS persistem via companySettings (localStorage).
 */
export function usePricingSettings() {
  const company = readCompanySettings();
  const rates = readTaxRates();

  const [settings, setSettings] = useState<PricingSettings>({
    mlFeePercent: safe(rates.mlFee ?? DEFAULT_TAX_RATES.mlFee),
    taxCbsPercent: safe(company.tax_cbs ?? DEFAULT_TAX_RATES.cbs),
    taxIbsPercent: safe(company.tax_ibs ?? DEFAULT_TAX_RATES.ibs),
    taxIsPercent: safe(company.tax_is ?? DEFAULT_TAX_RATES.is),
    defaultMarginPercent: safe(rates.margin ?? DEFAULT_TAX_RATES.margin)
  });

  useEffect(() => {
    writeTaxRates({
      mlFee: safe(settings.mlFeePercent),
      margin: safe(settings.defaultMarginPercent)
    });

    const currentCompany = readCompanySettings();
    writeCompanySettings({
      ...currentCompany,
      tax_cbs: safe(settings.taxCbsPercent),
      tax_ibs: safe(settings.taxIbsPercent),
      tax_is: safe(settings.taxIsPercent)
    });
  }, [settings]);

  return { settings, setSettings };
}
