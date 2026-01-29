import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import type { MlListing } from '../lib/types';
import { deleteMlListing, listMlListings, upsertMlListing } from '../lib/db';

function daysBetween(iso: string | null) {
  if (!iso) return null;
  const start = new Date(iso).getTime();
  const now = Date.now();
  if (!Number.isFinite(start)) return null;
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return diff;
}

const emptyDraft: Partial<MlListing> = {
  ml_listing_id: '',
  title: '',
  url: '',
  images_count: null,
  description_chars: null,
  has_full_description: null,
  listed_at: null,
  notes: null
};

export default function ListingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MlListing[]>([]);
  const [draft, setDraft] = useState<Partial<MlListing>>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const rows = await listMlListings();
      setItems(rows);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar anúncios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const ok = items.filter((x) => (x.images_count ?? 0) >= 6 && x.has_full_description).length;
    const weakDesc = items.filter((x) => x.has_full_description === false).length;
    const lowImgs = items.filter((x) => (x.images_count ?? 0) < 6).length;
    return { total, ok, weakDesc, lowImgs };
  }, [items]);

  function startNew() {
    setEditingId('new');
    setDraft({ ...emptyDraft, listed_at: new Date().toISOString() });
  }

  function startEdit(item: MlListing) {
    setEditingId(item.id);
    setDraft({ ...item });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  async function save() {
    const ml_listing_id = String(draft.ml_listing_id || '').trim();
    const title = String(draft.title || '').trim();
    if (!ml_listing_id || !title) {
      setError('Preencha ao menos o ID do anúncio e o título.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await upsertMlListing({
        ...draft,
        ml_listing_id,
        title,
        url: draft.url ? String(draft.url) : null,
        images_count: draft.images_count == null ? null : Number(draft.images_count),
        description_chars: draft.description_chars == null ? null : Number(draft.description_chars),
        has_full_description: draft.has_full_description ?? null,
        listed_at: draft.listed_at ?? null,
        notes: draft.notes ?? null
      });
      await refresh();
      cancelEdit();
    } catch (e: any) {
      setError(e?.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: MlListing) {
    if (!confirm(`Excluir anúncio "${item.title}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteMlListing(item.id);
      await refresh();
      if (editingId === item.id) cancelEdit();
    } catch (e: any) {
      setError(e?.message || 'Falha ao excluir.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anúncios (ML)"
        subtitle="Checklist prático por anúncio: imagens, descrição e tempo no ar."
        actions={
          <button className="btn-primary" onClick={startNew}>
            <Plus className="h-4 w-4" /> Novo anúncio
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SectionCard title="Total" className="md:col-span-1">
          <div className="text-3xl font-semibold">{loading ? '—' : stats.total}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Anúncios cadastrados</div>
        </SectionCard>
        <SectionCard title="OK" className="md:col-span-1">
          <div className="text-3xl font-semibold">{loading ? '—' : stats.ok}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">≥ 6 imagens + descrição completa</div>
        </SectionCard>
        <SectionCard title="Descrição fraca" className="md:col-span-1">
          <div className="text-3xl font-semibold">{loading ? '—' : stats.weakDesc}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Marque e melhore no ML</div>
        </SectionCard>
        <SectionCard title="Poucas imagens" className="md:col-span-1">
          <div className="text-3xl font-semibold">{loading ? '—' : stats.lowImgs}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Abaixo de 6 fotos</div>
        </SectionCard>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
          <div className="font-semibold">Atenção</div>
          <div className="mt-1 whitespace-pre-wrap">{error}</div>
          <div className="mt-2 text-xs opacity-80">
            Se aparecer erro "relation \"ml_listings\" does not exist", rode o SQL de criação da tabela de anúncios.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionCard title="Lista">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Anúncio</th>
                    <th>Imagens</th>
                    <th>Descrição</th>
                    <th>Dias no ar</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                        Nenhum anúncio cadastrado.
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => {
                      const days = daysBetween(it.listed_at);
                      const okImgs = (it.images_count ?? 0) >= 6;
                      const okDesc = it.has_full_description === true;
                      return (
                        <tr key={it.id} className={editingId === it.id ? 'bg-gray-50 dark:bg-slate-800/40' : ''}>
                          <td>
                            <div className="font-medium">{it.title}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">{it.ml_listing_id}</div>
                            {it.url && (
                              <a
                                href={it.url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-700 hover:underline dark:text-cyan-300"
                              >
                                Abrir no ML <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </td>
                          <td>
                            <span className={okImgs ? 'badge-ok' : 'badge-warn'}>{it.images_count ?? 0}</span>
                          </td>
                          <td>
                            <span className={okDesc ? 'badge-ok' : 'badge-warn'}>
                              {okDesc ? 'Completa' : 'Pendente'}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm">{days == null ? '—' : `${days}d`}</span>
                          </td>
                          <td className="text-right">
                            <div className="flex justify-end gap-2">
                              <button className="btn-secondary" onClick={() => startEdit(it)}>
                                Editar
                              </button>
                              <button className="btn-danger" onClick={() => remove(it)}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-5">
          <SectionCard
            title={editingId ? 'Editar anúncio' : 'Cadastro rápido'}
            action={
              editingId ? (
                <button className="btn-secondary" onClick={cancelEdit}>
                  Cancelar
                </button>
              ) : null
            }
          >
            <div className="grid grid-cols-1 gap-3">
              <label className="space-y-1">
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300">ID do anúncio (ML)</span>
                <input
                  className="input"
                  value={draft.ml_listing_id ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, ml_listing_id: e.target.value }))}
                  placeholder="ex: MLB123456789"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Título</span>
                <input
                  className="input"
                  value={draft.title ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Nome do anúncio"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300">URL (opcional)</span>
                <input
                  className="input"
                  value={draft.url ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                  placeholder="https://produto.mercadolivre.com.br/..."
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Qtd. imagens</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={draft.images_count ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, images_count: e.target.value === '' ? null : Number(e.target.value) }))}
                    placeholder="6"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Descrição completa?</span>
                  <select
                    className="input"
                    value={draft.has_full_description == null ? '' : draft.has_full_description ? 'yes' : 'no'}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        has_full_description: e.target.value === '' ? null : e.target.value === 'yes'
                      }))
                    }
                  >
                    <option value="">Não informado</option>
                    <option value="yes">Sim</option>
                    <option value="no">Não</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Data de publicação (opcional)</span>
                <input
                  className="input"
                  value={draft.listed_at ? new Date(draft.listed_at).toISOString().slice(0, 10) : ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      listed_at: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : null
                    }))
                  }
                  type="date"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Notas</span>
                <textarea
                  className="input min-h-[96px]"
                  value={draft.notes ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                  placeholder="Ex: falta vídeo, melhorar fotos, ajustar descrição"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button className="btn-primary" onClick={save} disabled={saving}>
                  <Save className="h-4 w-4" /> Salvar
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Notas" className="text-sm text-gray-600 dark:text-slate-400">
        Use esta tela como um <span className="font-medium">checklist operacional</span>: o objetivo é manter cada anúncio com
        pelo menos <span className="font-medium">6 imagens</span> e <span className="font-medium">descrição completa</span>.
        O campo “dias no ar” ajuda a priorizar anúncios com tempo alto e performance ruim (aqui você pode cruzar com vendas no CapyOps).
      </SectionCard>
    </div>
  );
}
