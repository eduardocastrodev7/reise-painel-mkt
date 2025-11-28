// src/config/kpiCards.js

export const KPI_CARDS = [
  // --- Receita & Volume ---
  {
    id: 'receitaTotal',
    title: 'Receita total',
    metricKey: 'receitaTotal',
    type: 'currency',
    subtitle: 'Período selecionado',
    description: 'Soma da receita faturada em todos os dias do período.',
    group: 'volume',
    showComparison: true,
    trendDirection: 'up-good',
  },
  {
    id: 'investimentoTotal',
    title: 'Investimento em mídia',
    metricKey: 'investimentoTotal',
    type: 'currency',
    subtitle: 'Investimento total em anúncios no período.',
    description:
      'Soma do investimento diário em mídia (Facebook, Google, WhatsApp, etc).',
    group: 'volume',
    showComparison: true,
    trendDirection: null, // não colorimos automaticamente
  },
  {
    id: 'pedidosTotal',
    title: 'Pedidos aprovados',
    metricKey: 'pedidosTotal',
    type: 'integer',
    subtitle: 'Total de pedidos aprovados.',
    description: 'Quantidade de pedidos aprovados no período selecionado.',
    group: 'volume',
    showComparison: true,
    trendDirection: 'up-good',
  },
  {
    id: 'sessoesTotal',
    title: 'Sessões',
    metricKey: 'sessoesTotal',
    type: 'integer',
    subtitle: 'Total de sessões na loja.',
    description: 'Soma das sessões (visitas) à loja no período.',
    group: 'volume',
    showComparison: true,
    trendDirection: 'up-good',
  },

  // --- Eficiência & Funil ---
  {
    id: 'roas',
    title: 'ROAS',
    metricKey: 'roas',
    type: 'roas',
    subtitle: 'Receita / Investimento em mídia.',
    description:
      'Retorno sobre investimento em anúncios: quanto de receita entra para cada R$1 investido.',
    group: 'eficiencia',
    showComparison: true,
    trendDirection: 'up-good',
  },
  {
    id: 'ticketMedioGlobal',
    title: 'Ticket médio',
    metricKey: 'ticketMedioGlobal',
    type: 'currency-or-dash',
    subtitle: 'Receita / Pedidos aprovados.',
    description:
      'Valor médio de cada pedido aprovado no período selecionado.',
    group: 'eficiencia',
    showComparison: true,
    trendDirection: 'up-good',
  },
  {
    id: 'taxaConversaoGlobal',
    title: 'Taxa de conversão',
    metricKey: 'taxaConversaoGlobal',
    type: 'percent-2',
    subtitle: 'Pedidos aprovados / Sessões.',
    description:
      'Porcentagem de sessões que viram pedidos aprovados no período.',
    group: 'eficiencia',
    showComparison: true,
    trendDirection: 'up-good',
  },
  {
    id: 'cpsGlobal',
    title: 'CPS (custo por sessão)',
    metricKey: 'cpsGlobal',
    type: 'currency-or-dash',
    subtitle: 'Investimento / Sessões.',
    description:
      'Quanto custa, em média, trazer uma sessão (visita) para a loja.',
    group: 'eficiencia',
    showComparison: true,
    trendDirection: 'down-good', // quanto menor, melhor
  },

  // --- Clientes & Marketing ---
  {
    id: 'clientesNovosTotal',
    title: 'Clientes novos',
    metricKey: 'clientesNovosTotal',
    type: 'integer',
    subtitle: 'Total de novos clientes.',
    description: 'Quantidade de clientes novos no período.',
    group: 'clientes',
    showComparison: true,
    trendDirection: 'up-good',
  },
  {
    id: 'clientesRecorrentesTotal',
    title: 'Clientes recorrentes',
    metricKey: 'clientesRecorrentesTotal',
    type: 'integer',
    subtitle: 'Pedidos aprovados - Clientes novos.',
    description:
      'Estimativa de clientes recorrentes (pedidos aprovados menos clientes novos).',
    group: 'clientes',
    showComparison: true,
    trendDirection: 'up-good',
  },
  {
    id: 'cacGlobal',
    title: 'CAC (clientes novos)',
    metricKey: 'cacGlobal',
    type: 'currency-or-dash',
    subtitle: 'Investimento / Clientes novos.',
    description:
      'Custo de aquisição de cliente novo, considerando apenas investimento em mídia.',
    group: 'clientes',
    showComparison: true,
    trendDirection: 'down-good',
  },
  {
    id: 'custoMktPct',
    title: '% custo de MKT',
    metricKey: 'custoMktPct',
    type: 'percent-1',
    subtitle: 'Investimento / Receita.',
    description:
      'Percentual da receita comprometido com investimento em marketing.',
    group: 'clientes',
    showComparison: true,
    trendDirection: 'down-good',
  },
];
