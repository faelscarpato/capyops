import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator, CreditCard, DollarSign, Receipt, TrendingUp, Wallet } from 'lucide-react';
import Card from '../app/v3/components/Card';
import StatCard from '../app/v3/components/StatCard';
import { listExpenses, listMeliOrders } from '../lib/db';

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getOrderDate(order: any): number | null {
  const raw = order?.date_created || order?.date_closed || order?.date_last_updated;
  if (!raw) return null;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function getOrderTotal(order: any): number {
  return Number(order?.total_amount ?? order?.paid_amount ?? 0) || 0;
}

function getPaymentState(order: any): 'paid' | 'pending' | 'cancelled' {
  const status = String(order?.status ?? '').toLowerCase();
  if (status.includes('cancel')) return 'cancelled';
  if (status === 'paid') return 'paid';
  if (Array.isArray(order?.payments)) {
    const hasPaid = order.payments.some((p: any) => {
      const paymentStatus = String(p?.status ?? '').toLowerCase();
      return paymentStatus === 'approved' || paymentStatus === 'paid';
    });
    if (hasPaid) return 'paid';
  }
  return 'pending';
}

async function fetchFinanceOverview() {
  const [orders, expenses] = await Promise.all([listMeliOrders(400), listExpenses()]);
  return { orders: orders ?? [], expenses: expenses ?? [] };
}

export default function FinanceOverviewPage() {
  const overviewQuery = useQuery({
    queryKey: ['finance-overview'],
    queryFn: fetchFinanceOverview
  });

  const loading = overviewQuery.isPending;
  const err = overviewQuery.error instanceof Error ? overviewQuery.error.message : null;

  const metrics = useMemo(() => {
    const rows = overviewQuery.data?.orders ?? [];
    const expenses = overviewQuery.data?.expenses ?? [];
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const normalizedOrders = rows
      .map((row: any) => row?.payload || row)
      .map((order: any) => {
        const ts = getOrderDate(order);
        const payment = getPaymentState(order);
        return { ts, payment, amount: getOrderTotal(order) };
      })
      .filter((o) => o.ts != null && o.payment !== 'cancelled') as Array<{
      ts: number;
      payment: 'paid' | 'pending';
      amount: number;
    }>;

    const monthOrders = normalizedOrders.filter((o) => o.ts >= monthStart);
    const todayOrders = normalizedOrders.filter((o) => o.ts >= todayStart.getTime());
    const paidMonth = monthOrders.filter((o) => o.payment === 'paid');
    const pendingMonth = monthOrders.filter((o) => o.payment === 'pending');

    const revenueToday = todayOrders.reduce((acc, o) => acc + o.amount, 0);
    const grossMonth = monthOrders.reduce((acc, o) => acc + o.amount, 0);
    const paidRevenueMonth = paidMonth.reduce((acc, o) => acc + o.amount, 0);
    const approvalRate = monthOrders.length ? Math.round((paidMonth.length / monthOrders.length) * 100) : 0;
    const avgTicket = paidMonth.length ? paidRevenueMonth / paidMonth.length : 0;

    const monthExpenses = expenses
      .filter((e: any) => {
        const ts = new Date(e.paid_at).getTime();
        return Number.isFinite(ts) && ts >= monthStart;
      })
      .reduce((acc: number, e: any) => acc + Number(e.amount ?? 0), 0);

    const netMonth = paidRevenueMonth - monthExpenses;
    const marginPct = paidRevenueMonth > 0 ? (netMonth / paidRevenueMonth) * 100 : 0;

    return {
      revenueToday,
      ordersToday: todayOrders.length,
      grossMonth,
      paidRevenueMonth,
      monthExpenses,
      netMonth,
      marginPct,
      avgTicket,
      paidOrders: paidMonth.length,
      pendingOrders: pendingMonth.length,
      approvalRate
    };
  }, [overviewQuery.data]);

  return (
    <div className="space-y-4">
      {err ? (
        <Card className="border-[var(--danger)]">
          <p className="text-sm font-semibold text-[var(--danger)]">{err}</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-12 gap-4 lg:gap-5">
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Receita do dia" value={loading ? '—' : fmtBRL(metrics.revenueToday)} progress={metrics.grossMonth > 0 ? Math.round((metrics.revenueToday / metrics.grossMonth) * 100) : 0} icon={<DollarSign className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Pedidos do dia" value={loading ? '—' : String(metrics.ordersToday)} progress={metrics.paidOrders ? Math.min(100, Math.round((metrics.ordersToday / metrics.paidOrders) * 100)) : 0} icon={<Receipt className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Receita paga (mês)" value={loading ? '—' : fmtBRL(metrics.paidRevenueMonth)} progress={metrics.grossMonth ? Math.round((metrics.paidRevenueMonth / metrics.grossMonth) * 100) : 0} icon={<CreditCard className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Despesas (mês)" value={loading ? '—' : fmtBRL(metrics.monthExpenses)} progress={metrics.paidRevenueMonth > 0 ? Math.min(100, Math.round((metrics.monthExpenses / metrics.paidRevenueMonth) * 100)) : 0} icon={<Wallet className="h-4 w-4" />} />
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Lucro líquido (mês)" value={loading ? '—' : fmtBRL(metrics.netMonth)} delta={metrics.marginPct} progress={metrics.paidRevenueMonth > 0 ? Math.max(0, Math.min(100, Math.round((metrics.netMonth / metrics.paidRevenueMonth) * 100))) : 0} icon={<TrendingUp className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Margem líquida" value={loading ? '—' : `${metrics.marginPct.toFixed(1)}%`} progress={Math.max(0, Math.min(100, Math.round(metrics.marginPct)))} icon={<Calculator className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Ticket médio (mês)" value={loading ? '—' : fmtBRL(metrics.avgTicket)} progress={metrics.paidRevenueMonth > 0 ? Math.max(0, Math.min(100, Math.round((metrics.avgTicket / metrics.paidRevenueMonth) * 1000))) : 0} icon={<DollarSign className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Taxa de aprovação" value={loading ? '—' : `${metrics.approvalRate}%`} progress={metrics.approvalRate} icon={<Receipt className="h-4 w-4" />} />
        </div>
      </div>
    </div>
  );
}

