import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import NewSaleWizard from '../components/sales/NewSaleWizard';

export default function NewSalePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Nova venda" subtitle="Wizard 3 passos: produtos → detalhes → revisão. Atualiza estoque e lucro estimado." />

      <NewSaleWizard />

      <SectionCard title="Nota operacional">
        <div className="text-sm text-gray-600 dark:text-slate-300">
          No v1, cada item do carrinho é gravado como uma venda separada (compatibilidade com a RPC atual). Frete e desconto
          são rateados automaticamente. Quando migrarmos a RPC para itens múltiplos (sales + sale_items), isso vira uma venda
          única por pedido.
        </div>
      </SectionCard>
    </div>
  );
}
