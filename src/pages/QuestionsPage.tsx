import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, RefreshCw } from 'lucide-react';
import type { MlQuestion, Product } from '../lib/types';
import { answerMlQuestion, createMlQuestion, listMlQuestions, listProducts, setMlQuestionStatus } from '../lib/db';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';

function fmtDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<MlQuestion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  const [newQuestion, setNewQuestion] = useState({
    product_id: '',
    buyer_nickname: '',
    question_text: ''
  });

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const [q, p] = await Promise.all([listMlQuestions(), listProducts()]);
      setQuestions(q);
      setProducts(p);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar perguntas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const pending = useMemo(() => questions.filter((q) => q.status === 'pending'), [questions]);
  const answered = useMemo(() => questions.filter((q) => q.status === 'answered'), [questions]);

  async function createMockQuestion() {
    if (!newQuestion.question_text.trim()) {
      setErr('Informe a pergunta.');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await createMlQuestion({
        ml_question_id: `mock-${Date.now()}`,
        product_id: newQuestion.product_id || null,
        buyer_nickname: newQuestion.buyer_nickname.trim() || null,
        question_text: newQuestion.question_text.trim(),
        status: 'pending'
      });
      setNewQuestion({ product_id: '', buyer_nickname: '', question_text: '' });
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao criar pergunta.');
    } finally {
      setBusy(false);
    }
  }

  async function sendAnswer(id: string) {
    const text = (answerDrafts[id] ?? '').trim();
    if (!text) {
      setErr('Digite a resposta antes de enviar.');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await answerMlQuestion(id, text);
      setAnswerDrafts((prev) => ({ ...prev, [id]: '' }));
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao responder.');
    } finally {
      setBusy(false);
    }
  }

  async function ignoreQuestion(id: string) {
    setErr(null);
    setBusy(true);
    try {
      await setMlQuestionStatus(id, 'ignored');
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao ignorar pergunta.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perguntas ML"
        subtitle="Operacao de Q&A pronta para integrar ao webhook de perguntas."
        actions={
          <button className="btn-ghost" onClick={refresh} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        }
      />

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
          {err}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Pendentes
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{pending.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Respondidas
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{answered.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Total
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{questions.length}</div>
        </div>
      </div>

      <SectionCard
        title="Simular entrada de pergunta"
        action={
          <button className="btn-primary" onClick={createMockQuestion} disabled={busy}>
            {busy ? 'Salvando...' : 'Salvar pergunta'}
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="label mb-1">Produto (opcional)</div>
            <select
              className="input"
              value={newQuestion.product_id}
              onChange={(e) => setNewQuestion((prev) => ({ ...prev, product_id: e.target.value }))}
            >
              <option value="">Sem produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.size_cm ? `${p.size_cm}cm` : ''} • {p.variant}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1">Comprador (opcional)</div>
            <input
              className="input"
              value={newQuestion.buyer_nickname}
              onChange={(e) => setNewQuestion((prev) => ({ ...prev, buyer_nickname: e.target.value }))}
              placeholder="Ex: joao123"
            />
          </div>
          <div className="md:col-span-3">
            <div className="label mb-1">Pergunta</div>
            <textarea
              className="input min-h-[80px]"
              value={newQuestion.question_text}
              onChange={(e) => setNewQuestion((prev) => ({ ...prev, question_text: e.target.value }))}
              placeholder="Digite a pergunta do cliente"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Pendentes" action={<MessageCircle className="h-4 w-4 text-gray-500 dark:text-slate-400" />}>
        <div className="space-y-4">
          {pending.length ? (
            pending.map((q) => {
              const product = q.product_id ? productMap.get(q.product_id) : null;
              return (
                <div key={q.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {q.question_text}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {product ? `${product.name} ${product.size_cm ? `${product.size_cm}cm` : ''} • ${product.variant}` : 'Sem produto'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        Cliente: {q.buyer_nickname ?? '—'} • Recebida: {fmtDateTime(q.received_at)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">Status: pendente</div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <textarea
                      className="input md:col-span-2 min-h-[70px]"
                      placeholder="Digite a resposta (simulada)"
                      value={answerDrafts[q.id] ?? ''}
                      onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                    <div className="flex flex-col gap-2">
                      <button className="btn-primary" onClick={() => sendAnswer(q.id)} disabled={busy}>
                        {busy ? 'Enviando...' : 'Responder (simulado)'}
                      </button>
                      <button className="btn-ghost" onClick={() => ignoreQuestion(q.id)} disabled={busy}>
                        Ignorar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-gray-500 dark:text-slate-400">Nenhuma pergunta pendente.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Respondidas">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Pergunta</th>
                <th className="px-2 py-2 font-semibold">Resposta</th>
                <th className="px-2 py-2 font-semibold">Produto</th>
                <th className="px-2 py-2 text-right font-semibold">Respondida em</th>
              </tr>
            </thead>
            <tbody>
              {answered.map((q) => {
                const product = q.product_id ? productMap.get(q.product_id) : null;
                return (
                  <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900">
                    <td className="px-2 py-3">{q.question_text}</td>
                    <td className="px-2 py-3">{q.answer_text ?? '—'}</td>
                    <td className="px-2 py-3">
                      {product ? `${product.name} ${product.size_cm ? `${product.size_cm}cm` : ''}` : '—'}
                    </td>
                    <td className="px-2 py-3 text-right">{fmtDateTime(q.answered_at)}</td>
                  </tr>
                );
              })}
              {!answered.length ? (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                    Nenhuma pergunta respondida.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
