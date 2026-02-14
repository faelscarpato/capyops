import { useEffect, useMemo, useState } from 'react';
import SectionCard from '../../ui/SectionCard';
import { addExpense, applyPackingKit, applySale, getPackingKitCost, listProducts } from '../../lib/db';
import type { Product } from '../../lib/types';
import { usePricingSettings } from '../../hooks/usePricingSettings';
import SaleStepProducts from './SaleStepProducts';
import SaleStepDetails from './SaleStepDetails';
import SaleStepReview from './SaleStepReview';
import type { SaleDraftItem } from './types';
import { round2, toNumber } from './types';
import { Button } from '../../ui/primitives/Button';

type Step = 1 | 2 | 3;

function makeId() {
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function isMlChannel(channel: string) {
  return channel === 'mercado_livre_normal' || channel === 'mercado_livre_full';
}

export default function NewSaleWizard() {
  const [step, setStep] = useState<Step>(1);

  const [products, setProducts] = useState<Product[]>([]);
  const [kitCostById, setKitCostById] = useState<Record<string, number | undefined>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [channel, setChannel] = useState<string>('mercado_livre_normal');
  const [region, setRegion] = useState<string>('');

  const [items, setItems] = useState<SaleDraftItem[]>([]);
  const [shippingCost, setShippingCost] = useState<string>('0');
  const [shippingPaidByStore, setShippingPaidByStore] = useState<boolean>(true);
  const [registerShippingExpense, setRegisterShippingExpense] = useState<boolean>(true);
  const [discount, setDiscount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);

  const { settings } = usePricingSettings();

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoadingProducts(true);
        const data = await listProducts();
        if (!alive) return;

        const active = (data ?? []).filter((p) => p.is_active);
        setProducts(active);

        const kitIds = Array.from(new Set(active.map((p) => p.packing_kit_id).filter(Boolean))) as string[];
        if (kitIds.length) {
          const entries = await Promise.all(
            kitIds.map(async (id) => {
              try {
                const cost = await getPackingKitCost(id);
                return [id, Number(cost)] as const;
              } catch {
                return [id, undefined] as const;
              }
            })
          );
          if (alive) {
            setKitCostById((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
          }
        }

        // seed uma linha
        if (alive && active.length && items.length === 0) {
          const first = active[0];
          setItems([
            {
              id: makeId(),
              productId: first.id,
              quantity: 1,
              unitPrice: String(first.price ?? 0),
              packagingCost: String(first.packaging_cost ?? 0),
              useAutoPackaging: true,
              applyKitStock: false
            }
          ]);
        }
      } catch (e) {
        setBanner({ type: 'error', text: 'Falha ao carregar produtos. Verifique a conexão com o Supabase.' });
        console.error(e);
      } finally {
        if (alive) setLoadingProducts(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canGoNextFromStep1 = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((it) => {
      const hasProduct = Boolean(it.productId);
      const qtyOk = Math.max(1, Math.trunc(it.quantity)) > 0;
      const priceOk = toNumber(it.unitPrice) >= 0;
      return hasProduct && qtyOk && priceOk;
    });
  }, [items]);

  const canGoNextFromStep2 = true;

  const resolvedLines = useMemo(() => {
    return items
      .map((it) => {
        const p = products.find((x) => x.id === it.productId);
        if (!p) return null;

        const kitCost =
          p.packing_kit_id && kitCostById[p.packing_kit_id] != null ? Number(kitCostById[p.packing_kit_id]) : null;

        const autoPackaging = p.packaging_cost != null ? Number(p.packaging_cost) : kitCost != null ? kitCost : 0;
        const packaging = it.useAutoPackaging ? autoPackaging : toNumber(it.packagingCost);

        const qty = Math.max(1, Math.trunc(it.quantity));
        const unit = toNumber(it.unitPrice);
        const gross = qty * unit;

        return { it, p, qty, unit, gross, packaging, kitId: p.packing_kit_id };
      })
      .filter(Boolean) as Array<{
      it: SaleDraftItem;
      p: Product;
      qty: number;
      unit: number;
      gross: number;
      packaging: number;
      kitId: string | null;
    }>;
  }, [items, products, kitCostById]);

  const handleConfirm = async () => {
    try {
      setBanner(null);

      if (resolvedLines.length === 0) {
        setBanner({ type: 'error', text: 'Adicione itens válidos antes de confirmar.' });
        return;
      }

      const totalGross = resolvedLines.reduce((acc, l) => acc + l.gross, 0);
      if (totalGross <= 0) {
        setBanner({ type: 'error', text: 'O total bruto ficou zerado. Revise preços e quantidades.' });
        return;
      }

      const shipping = shippingPaidByStore ? Math.max(0, toNumber(shippingCost)) : 0;
      const discountValue = Math.max(0, toNumber(discount));

      setIsSubmitting(true);

      const mlFeeRate = isMlChannel(channel) ? settings.mlFeePercent / 100 : null;

      const saleIds: string[] = [];

      for (let i = 0; i < resolvedLines.length; i++) {
        const line = resolvedLines[i];

        // rateio por peso no bruto
        const weight = line.gross / totalGross;

        const discountShare = discountValue * weight;
        const shippingShare = shipping * weight;

        const grossAfterDiscount = Math.max(0, line.gross - discountShare);
        const unitPriceAdjusted = round2(grossAfterDiscount / line.qty);
        const shippingAdjusted = round2(shippingShare);
        const packagingAdjusted = round2(line.packaging);

        const saleId = await applySale({
          product_id: line.p.id,
          quantity: line.qty,
          channel,
          region: region || null,
          sale_price: unitPriceAdjusted,
          shipping_cost: shippingAdjusted,
          ml_fee_rate: mlFeeRate,
          packaging_cost: packagingAdjusted,
          extra_cost: 0,
          notes: notes || null
        });

        saleIds.push(saleId);

        // opcional: baixa insumos do kit (se houver)
        if (line.it.applyKitStock && line.kitId) {
          try {
            await applyPackingKit(line.kitId);
          } catch (e) {
            console.warn('Falha ao aplicar baixa de kit (insumos) após venda', saleId, e);
          }
        }
      }

      if (shippingPaidByStore && registerShippingExpense && shipping > 0) {
        try {
          const note = `Frete da venda • Canal: ${channel}${region ? ` • Região: ${region}` : ''}${saleIds.length ? ` • Sales: ${saleIds.join(', ')}` : ''}`;
          await addExpense({
            paid_at: new Date().toISOString(),
            category: 'Frete (Venda)',
            amount: shipping,
            payment_method: channel,
            vendor: channel === 'ML' ? 'Mercado Envios' : null,
            notes: note
          });
        } catch (e) {
          console.warn('Falha ao registrar frete como despesa', e);
        }
      }

      setBanner({ type: 'success', text: 'Venda registrada. Estoque atualizado ✅' });

      // reset
      setStep(1);
      setShippingCost('0');
      setShippingPaidByStore(true);
      setRegisterShippingExpense(true);
      setDiscount('0');
      setNotes('');
      if (products.length) {
        const first = products[0];
        setItems([
          {
            id: makeId(),
            productId: first.id,
            quantity: 1,
            unitPrice: String(first.price ?? 0),
            packagingCost: String(first.packaging_cost ?? 0),
            useAutoPackaging: true,
            applyKitStock: false
          }
        ]);
      } else {
        setItems([]);
      }
    } catch (e: any) {
      console.error(e);
      setBanner({ type: 'error', text: e?.message ? String(e.message) : 'Erro ao registrar venda.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepLabel = step === 1 ? 'Produtos' : step === 2 ? 'Detalhes' : 'Revisão';

  return (
    <SectionCard title={`Registrar venda • ${stepLabel}`}>
      {banner ? (
        <div
          className={[
            'mb-4 rounded-lg border px-3 py-2 text-sm',
            banner.type === 'success' && 'alert-success',
            banner.type === 'error' && 'alert-error',
            banner.type === 'info' && 'alert-warning'
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {banner.text}
        </div>
      ) : null}

      {loadingProducts ? (
        <div className="text-sm text-muted">Carregando produtos…</div>
      ) : products.length === 0 ? (
        <div className="text-sm text-muted">
          Nenhum produto ativo encontrado. Cadastre produtos no Estoque para registrar vendas.
        </div>
      ) : (
        <>
          {/* Step header */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
            <div className="flex items-center gap-2">
              <StepDot active={step === 1} done={step > 1}>1</StepDot>
              <span className="hidden sm:inline">Produtos</span>
            </div>
            <Divider />
            <div className="flex items-center gap-2">
              <StepDot active={step === 2} done={step > 2}>2</StepDot>
              <span className="hidden sm:inline">Detalhes</span>
            </div>
            <Divider />
            <div className="flex items-center gap-2">
              <StepDot active={step === 3} done={false}>3</StepDot>
              <span className="hidden sm:inline">Revisão</span>
            </div>
          </div>

          {/* Conteúdo */}
          {step === 1 ? (
            <SaleStepProducts
              products={products}
              kitCostById={kitCostById}
              items={items}
              onChangeItems={setItems}
              channel={channel}
              onChangeChannel={setChannel}
            />
          ) : null}

          {step === 2 ? (
            <SaleStepDetails
              products={products}
              kitCostById={kitCostById}
              items={items}
              channel={channel}
              region={region}
              onChangeRegion={setRegion}
              shippingCost={shippingCost}
              onChangeShippingCost={setShippingCost}
              shippingPaidByStore={shippingPaidByStore}
              onChangeShippingPaidByStore={(v) => {
                setShippingPaidByStore(v);
                if (!v) {
                  setShippingCost('0');
                  setRegisterShippingExpense(false);
                } else {
                  setRegisterShippingExpense(true);
                }
              }}
              registerShippingExpense={registerShippingExpense}
              onChangeRegisterShippingExpense={setRegisterShippingExpense}
              discount={discount}
              onChangeDiscount={setDiscount}
              notes={notes}
              onChangeNotes={setNotes}
              pricingSettings={settings}
              onApplySuggestedUnitPrice={(itemId, suggested) =>
                setItems((prev) => prev.map((x) => (x.id === itemId ? { ...x, unitPrice: String(suggested) } : x)))
              }
            />
          ) : null}

          {step === 3 ? (
            <SaleStepReview
              products={products}
              kitCostById={kitCostById}
              items={items}
              channel={channel}
              region={region}
              shippingCost={shippingCost}
              shippingPaidByStore={shippingPaidByStore}
              registerShippingExpense={registerShippingExpense}
              discount={discount}
              notes={notes}
              pricingSettings={settings}
              isSubmitting={isSubmitting}
              onConfirm={handleConfirm}
            />
          ) : null}

          {/* Navegação */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="order-2 sm:order-1"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
              disabled={step === 1 || isSubmitting}
            >
              Voltar
            </Button>

            {step < 3 ? (
              <Button
                type="button"
                variant="primary"
                className="order-1 sm:order-2"
                onClick={() => setStep((s) => ((s + 1) as Step))}
                disabled={
                  isSubmitting ||
                  (step === 1 && !canGoNextFromStep1) ||
                  (step === 2 && !canGoNextFromStep2)
                }
              >
                Avançar
              </Button>
            ) : null}
          </div>
        </>
      )}
    </SectionCard>
  );
}

function StepDot({
  active,
  done,
  children
}: {
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold',
        active && 'border-[color:var(--primary)] text-[color:var(--primary)]',
        done && 'border-[color:var(--success)] bg-[color:var(--success)] text-white'
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px flex-1 bg-[color:var(--border)]" />;
}
