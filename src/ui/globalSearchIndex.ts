export type GlobalSearchItem = {
  id: string;
  label: string;
  hint?: string;
  to: string;
  keywords?: string[];
};

export const GLOBAL_SEARCH_ITEMS: GlobalSearchItem[] = [
  { id: 'overview', label: 'Visão geral', hint: 'Dashboard principal', to: '/app', keywords: ['inicio', 'home', 'resumo'] },
  { id: 'ops', label: 'Operações', hint: 'Hub de execução diária', to: '/app/operacoes', keywords: ['operacional'] },
  { id: 'catalog', label: 'Catálogo', hint: 'Produtos e anúncios', to: '/app/catalogo', keywords: ['produto', 'estoque', 'listing'] },
  { id: 'finance', label: 'Financeiro', hint: 'Custos e margem', to: '/app/financeiro', keywords: ['lucro', 'despesas', 'receita'] },
  { id: 'config', label: 'Configurações', hint: 'Preferências e integrações', to: '/app/config', keywords: ['ajustes', 'settings'] },

  { id: 'ops-orders', label: 'Pedidos', hint: 'Operações > Pedidos', to: '/app/operacoes?tab=pedidos', keywords: ['vendas', 'sales history'] },
  { id: 'ops-shipments', label: 'Expedição', hint: 'Operações > Expedição', to: '/app/operacoes?tab=expedicao', keywords: ['envios', 'shipment'] },
  { id: 'ops-pending', label: 'Pendências', hint: 'Operações > Pendências', to: '/app/operacoes?tab=pendencias', keywords: ['tarefas'] },
  { id: 'ops-alerts', label: 'Alertas operacionais', hint: 'Operações > Alertas', to: '/app/operacoes?tab=alertas', keywords: ['risco', 'competidor'] },
  { id: 'ops-messages', label: 'Mensagens ML', hint: 'Operações > Mensagens', to: '/app/operacoes?tab=mensagens', keywords: ['inbox'] },
  { id: 'ops-feedback', label: 'Feedback', hint: 'Operações > Feedback', to: '/app/operacoes?tab=feedback', keywords: ['avaliacao'] },
  { id: 'ops-questions', label: 'Perguntas pendentes', hint: 'Operações > Perguntas', to: '/app/operacoes?tab=perguntas', keywords: ['duvidas'] },
  { id: 'ops-quotes', label: 'Orçamentos', hint: 'Operações > Orçamentos', to: '/app/operacoes?tab=orcamentos', keywords: ['cotacao', 'compra'] },
  { id: 'ops-new-sale', label: 'Nova venda', hint: 'Operações > CTA Nova venda', to: '/app/operacoes?venda=nova', keywords: ['wizard'] },
  { id: 'ops-competitors', label: 'Competidores', hint: 'Operações > Competidores', to: '/app/operacoes?tab=competidores', keywords: ['preco concorrente'] },
  { id: 'ops-marketing', label: 'Plano MKT', hint: 'Operações > Plano marketing', to: '/app/operacoes?tab=plano-mkt', keywords: ['marketing'] },

  { id: 'cat-products', label: 'Cadastro de produtos', hint: 'Catálogo > Produtos', to: '/app/catalogo?catalogTab=produtos', keywords: ['registro'] },
  { id: 'cat-listings', label: 'Anúncios ML', hint: 'Catálogo > Anúncios', to: '/app/catalogo?catalogTab=anuncios', keywords: ['mercado livre'] },
  { id: 'cat-kits', label: 'Kits', hint: 'Catálogo > Kits', to: '/app/catalogo?catalogTab=kits', keywords: ['packing'] },
  { id: 'cat-supplies', label: 'Insumos', hint: 'Catálogo > Insumos', to: '/app/catalogo?catalogTab=insumos', keywords: ['fornecedor', 'material'] },
  { id: 'cat-stock', label: 'Estoque', hint: 'Catálogo > Estoque', to: '/app/catalogo?catalogTab=estoque', keywords: ['inventario'] },
  { id: 'cat-forecast', label: 'Estoque preditivo', hint: 'Catálogo > Previsão', to: '/app/catalogo?catalogTab=previsao', keywords: ['ruptura', 'forecast'] },

  { id: 'fin-summary', label: 'Resumo financeiro', hint: 'Financeiro > Resumo', to: '/app/financeiro?tab=resumo', keywords: ['kpi'] },
  { id: 'fin-costs', label: 'Custos / despesas', hint: 'Financeiro > Custos', to: '/app/financeiro?tab=custos', keywords: ['expense'] },
  { id: 'fin-margin', label: 'Precificador', hint: 'Financeiro > Margem', to: '/app/financeiro?tab=margem', keywords: ['preco'] },
  { id: 'fin-reports', label: 'Relatórios', hint: 'Financeiro > Relatórios', to: '/app/financeiro?tab=relatorios', keywords: ['exportar'] },

  { id: 'cfg-preferences', label: 'Preferências', hint: 'Config > Preferências', to: '/app/config?tab=preferencias', keywords: ['tema', 'loja'] },
  { id: 'cfg-integrations', label: 'Integrações ML', hint: 'Config > Integrações', to: '/app/config?tab=integracoes', keywords: ['token', 'mercado livre'] }
];
