import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { getCompetitorAlertCount, getPendingMlQuestionsCount } from '../lib/db';

export default function MarketingPlanPage() {
  const navigate = useNavigate();
  const checklistItems = [
    { id: 'pedidos', label: 'Ver pedidos pagos' },
    { id: 'separar', label: 'Separar produtos' },
    { id: 'defeitos', label: 'Conferir defeitos' },
    { id: 'embalar', label: 'Embalar (caixa dupla + bolha)' },
    { id: 'etiqueta', label: 'Imprimir etiqueta' },
    { id: 'postar', label: 'Postar ate 24h' },
    { id: 'mensagem', label: 'Enviar msg automatica' },
    { id: 'estoque', label: 'Atualizar estoque' },
    { id: 'perguntas', label: 'Responder perguntas' }
  ];
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    () => Object.fromEntries(checklistItems.map((item) => [item.id, false]))
  );

  const [pendingQuestions, setPendingQuestions] = useState(0);
  const [competitorAlerts, setCompetitorAlerts] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [q, c] = await Promise.all([getPendingMlQuestionsCount(), getCompetitorAlertCount()]);
        setPendingQuestions(q);
        setCompetitorAlerts(c);
      } catch {
        // Silencioso: o plano é um painel estático; não queremos quebrar a página por conta disso.
      }
    })();
  }, []);


  return (
    <div className="space-y-6">
      <PageHeader
        title="Kit Inicial de Lancamento - Loja ML"
        subtitle="Plano operacional completo para anuncios, embalagem e execucao diaria."
        actions={
          <button className="btn-ghost" type="button" onClick={() => window.print()}>
            Exportar PDF
          </button>
        }
      />

      <SectionCard title="Alertas e atalhos (fora do menu)">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            type="button"
            className="card p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800"
            onClick={() => navigate('/perguntas')}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Perguntas ML pendentes
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{pendingQuestions}</div>
            <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              Acesso só via alertas ou por aqui.
            </div>
          </button>

          <button
            type="button"
            className="card p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800"
            onClick={() => navigate('/competidores')}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Concorrentes em alerta
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{competitorAlerts}</div>
            <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              Alerta quando last_price ≤ alvo.
            </div>
          </button>

          <button
            type="button"
            className="card p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800"
            onClick={() => navigate('/anuncios')}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Catálogo de anúncios
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">Abrir</div>
            <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              Links, imagens, dias anunciados.
            </div>
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Kit inicial fechado (mix recomendado)">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Produto</th>
                <th className="px-2 py-2 font-semibold">Custo (branco)</th>
                <th className="px-2 py-2 font-semibold">Custo (sombreado)</th>
                <th className="px-2 py-2 font-semibold">Preco ML (branco)</th>
                <th className="px-2 py-2 font-semibold">Preco ML (sombreado)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['São Miguel Arcanjo Gargano 20 cm', 'R$ 45', 'R$ 50', 'R$ 159,90', 'R$ 179,90'],
                ['Carlo Acutis 20 cm', 'R$ 45', 'R$ 50', 'R$ 159,90', 'R$ 179,90'],
                ['Sagrada Familia 20 cm', 'R$ 50', 'R$ 55', 'R$ 179,90', 'R$ 199,90'],
                ['Nossa Senhora Aparecida 23 cm', 'R$ 45', 'R$ 50', 'R$ 169,90', 'R$ 189,90'],
                ['São Miguel Veronese 30 cm', 'R$ 90', 'R$ 100', 'R$ 299,90', 'R$ 349,90']
              ].map((row) => (
                <tr key={row[0]} className="border-b border-gray-100 dark:border-slate-800">
                  {row.map((cell) => (
                    <td key={cell} className="px-2 py-3 text-sm text-gray-700 dark:text-slate-200">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-slate-400">
          Material base: resina marmorizada (resina com po de marmore). Linha premium com acabamento artesanal.
        </div>
      </SectionCard>

      <SectionCard title="Estoque inicial recomendado (baixo risco)">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Produto</th>
                <th className="px-2 py-2 font-semibold">Qtd</th>
                <th className="px-2 py-2 font-semibold">Custo unit</th>
                <th className="px-2 py-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['São Miguel 20 cm Branco', '3', '45', '135'],
                ['São Miguel 20 cm Sombreado', '3', '50', '150'],
                ['Carlo Acutis 20 cm Branco', '3', '45', '135'],
                ['Carlo Acutis 20 cm Sombreado', '3', '50', '150'],
                ['Sagrada Familia 20 cm Branco', '3', '50', '150'],
                ['Aparecida 23 cm Branco', '3', '45', '135'],
                ['São Miguel Veronese Branco', '2', '90', '180']
              ].map((row) => (
                <tr key={row[0]} className="border-b border-gray-100 dark:border-slate-800">
                  {row.map((cell) => (
                    <td key={cell} className="px-2 py-3 text-sm text-gray-700 dark:text-slate-200">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-slate-400">Investimento inicial estimado: R$ 1.035,00.</div>
      </SectionCard>

      <SectionCard title="Peso e medidas para cadastro no ML">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            ['Pecas 20-23 cm', 'Peso: 0,9 kg (produto + embalagem)', 'Caixa: 28 x 18 x 18 cm', 'Classe de frete: Medio'],
            ['Pecas 30 cm', 'Peso: 2,2 kg', 'Caixa: 38 x 22 x 22 cm', 'Classe de frete: Grande']
          ].map((item) => (
            <div key={item[0]} className="rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{item[0]}</div>
              <div className="mt-1 space-y-1 text-sm text-gray-500 dark:text-slate-400">
                <div>{item[1]}</div>
                <div>{item[2]}</div>
                <div>{item[3]}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Preco final ajustado (frete + taxa ML)">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Produto</th>
                <th className="px-2 py-2 font-semibold">Preco branco</th>
                <th className="px-2 py-2 font-semibold">Preco sombreado</th>
                <th className="px-2 py-2 font-semibold">Lucro estimado</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['São Miguel 20 cm', 'R$ 159,90', 'R$ 179,90', 'R$ 70-85'],
                ['Carlo Acutis 20 cm', 'R$ 159,90', 'R$ 179,90', 'R$ 70-85'],
                ['Sagrada Familia 20 cm', 'R$ 179,90', 'R$ 199,90', 'R$ 75-95'],
                ['Aparecida 23 cm', 'R$ 169,90', 'R$ 189,90', 'R$ 70-90'],
                ['São Miguel Veronese 30 cm', 'R$ 299,90', 'R$ 349,90', 'R$ 120-170']
              ].map((row) => (
                <tr key={row[0]} className="border-b border-gray-100 dark:border-slate-800">
                  {row.map((cell) => (
                    <td key={cell} className="px-2 py-3 text-sm text-gray-700 dark:text-slate-200">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Material e descricao oficial">
        <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
          <div>Material: resina marmorizada (resina com po de marmore).</div>
          <div>Descricao curta: imagem decorativa religiosa em resina marmorizada, acabamento branco fosco ou sombreado.</div>
          <div>Observacao legal: produto decorativo, nao e marmore natural macico.</div>
        </div>
      </SectionCard>

      <SectionCard title="Titulos prontos (SEO + conversao)">
        <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
          <div>Imagem São Miguel Arcanjo 20cm Resina Marmorizada Decorativa</div>
          <div>Imagem Carlo Acutis 20cm Resina Marmorizada Estatua Religiosa</div>
          <div>Sagrada Familia 20cm Resina Marmorizada Decoracao Religiosa</div>
          <div>Nossa Senhora Aparecida 23cm Resina Marmorizada Imagem Sacra</div>
          <div>São Miguel Arcanjo Veronese 30cm Resina Marmorizada Premium</div>
        </div>
      </SectionCard>

      <SectionCard title="Descricao padrao (copiar e colar)">
        <pre className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          {`Imagem decorativa religiosa produzida em resina marmorizada (resina com po de marmore),
com acabamento artesanal em pintura branca ou sombreada.

Produto ideal para:
• Decoracao de ambientes
• Presente religioso
• Uso em oratorios
• Datas especiais

Caracteristicas:
• Material: Resina marmorizada
• Acabamento: Branco fosco / Sombreado artesanal
• Uso: Decorativo (nao e marmore natural)
• Alta durabilidade
• Otimo nivel de detalhes

Conteudo da embalagem:
• 1 imagem religiosa
• Embalagem protegida para transporte

Envio rapido em ate 24h uteis apos a compra.`}
        </pre>
      </SectionCard>

      <SectionCard title="Mensagens automaticas + respostas rapidas">
        <div className="space-y-4 text-sm text-gray-600 dark:text-slate-300">
          {[
            [
              'Pos-venda',
              'Ola! Muito obrigado pela sua compra. Sua imagem religiosa sera cuidadosamente embalada e enviada em ate 24h uteis. Qualquer duvida, estamos a disposicao. Que essa peca leve protecao, fe e boas energias ao seu lar.'
            ],
            [
              'Pedido enviado',
              'Ola! Seu pedido ja foi enviado com todo cuidado. Qualquer duvida, estamos por aqui. Agradecemos a preferencia.'
            ],
            [
              'Script rapido - "E marmore?"',
              'A peca e produzida em resina marmorizada (resina com po de marmore), material resistente e com excelente nivel de detalhes. Nao e marmore natural macico.'
            ],
            [
              'Script rapido - "Pode molhar?"',
              'A peca pode ser limpa com pano levemente umido, mas nao e indicada para exposicao permanente ao tempo ou chuva.'
            ],
            ['Script rapido - "Qual o peso?"', '20 cm: entre 500g e 800g. 30 cm: entre 1 kg e 2 kg, dependendo do modelo.']
          ].map(([title, body]) => (
            <div key={title}>
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-slate-300">{body}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Embalagem padrao (anti-quebra)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            [
              'Pecas 20-23 cm',
              '1) Papel de seda • 2) 2 voltas de bolha • 3) Caixa interna com 3-5 cm de amortecimento • 4) Caixa externa 28 x 18 x 18 • 5) Fita em cruz + etiqueta FRAGIL.'
            ],
            [
              'Pecas 30 cm (Veronese)',
              '1) Papel de seda • 2) 3 voltas de bolha • 3) Reforco na cabeca e base • 4) Caixa interna 32-35 cm • 5) Caixa externa 38 x 22 x 22 • 6) Fita em H + FRAGIL.'
            ]
          ].map(([title, body]) => (
            <div key={title}>
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-slate-300">{body}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Roteiro de fotos (minimo 6)">
        <div className="text-sm text-gray-600 dark:text-slate-300">
          1) Hero shot (produto inteiro, fundo branco) • 2) Close do rosto • 3) Close da base • 4) Lateral 45 graus • 5)
          Na mao (escala real) • 6) Produto embalado.
        </div>
      </SectionCard>

      <SectionCard title="Checklist diario de operacao">
        <div className="space-y-2">
          {checklistItems.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={checklist[item.id]}
                onChange={(e) => {
                  const next = e.target.checked;
                  setChecklist((prev) => ({ ...prev, [item.id]: next }));
                }}
                className="h-4 w-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900"
              />
              <span className={checklist[item.id] ? 'line-through text-gray-400 dark:text-slate-500' : ''}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Politica de troca (sem discussao)">
        <div className="text-sm text-gray-600 dark:text-slate-300">
          Aceitar troca ou reembolso para quebra no transporte, defeito visivel ou erro de modelo. Resposta padrao:
          "Sentimos muito pelo ocorrido. Pode enviar uma foto? Vamos resolver rapidamente com troca ou reembolso."
        </div>
      </SectionCard>

      <SectionCard title="Criterio objetivo para migrar para Full">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Criterio</th>
                <th className="px-2 py-2 font-semibold">Regra minima</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Vendas acumuladas', 'Minimo 10'],
                ['Taxa de reclamacao', 'Menor ou igual a 2%'],
                ['Quebra no transporte', '0'],
                ['Lucro liquido medio', 'Minimo R$ 60'],
                ['Giro mensal', 'Minimo 8 un/mes'],
                ['Fornecedor garantido', 'Sim']
              ].map((row) => (
                <tr key={row[0]} className="border-b border-gray-100 dark:border-slate-800">
                  <td className="px-2 py-3 text-sm text-gray-700 dark:text-slate-200">{row[0]}</td>
                  <td className="px-2 py-3 text-sm text-gray-700 dark:text-slate-200">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-slate-400">
          Recomendacao: comecar 100% em ML Normal e migrar somente 1-2 SKUs campeoes apos 30-60 dias.
        </div>
      </SectionCard>

      <SectionCard title="Agenda de postagens - Semana 1">
        <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
          <div>Segunda: apresentacao da loja + CTA Mercado Livre.</div>
          <div>Terca: produto ancora plastico com foco em prazo e preco.</div>
          <div>Quarta: bandeja MDF com antes/depois.</div>
          <div>Quinta: porcelana decorativa com entrega rapida.</div>
          <div>Sexta: kit presente + frete Mercado Envios.</div>
          <div>Sabado: prova social de primeiras entregas.</div>
          <div>Domingo: conteudo leve sobre decoracao.</div>
        </div>
      </SectionCard>

      <SectionCard title="Agenda de produto patrocinado - Semana 1">
        <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
          <div>Produto ancora: organizador plastico (ML Ads) - R$ 15 a 30/dia.</div>
          <div>Ticket medio: bandeja MDF (ML Ads) - R$ 20 a 40/dia.</div>
          <div>Premium: vaso porcelana (Meta Ads) - R$ 20/dia.</div>
        </div>
      </SectionCard>

      <SectionCard title="Semana 2 - Alavancagem">
        <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
          <div>Tema: antes e depois da decoracao. Meta: aumentar ticket e conversao.</div>
          <div>Reels de ambientes, carrossel de uso MDF e stories com cupom relampago.</div>
          <div>Criar combos (cozinha/banheiro/sala) e migrar top 2 para Premium.</div>
          <div>Aumentar 30% ao dia o orçamento dos anuncios vencedores.</div>
        </div>
      </SectionCard>
    </div>
  );
}
