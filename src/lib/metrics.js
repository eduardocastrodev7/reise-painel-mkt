// src/lib/metrics.js

/**
 * Calcula as métricas agregadas do período a partir das linhas filtradas.
 * @param {Array} rowsFiltradas - linhas já filtradas por data
 */
export function calculateMetrics(rowsFiltradas) {
  if (!rowsFiltradas || rowsFiltradas.length === 0) {
    return {
      receitaTotal: 0,
      investimentoTotal: 0,
      sessoesTotal: 0,
      pedidosTotal: 0,
      clientesNovosTotal: 0,
      clientesRecorrentesTotal: 0,
      ticketMedioGlobal: 0,
      taxaConversaoGlobal: 0,
      cpsGlobal: 0,
      cacGlobal: 0,
      custoMktPct: 0,
      roas: 0,
    };
  }

  let receitaTotal = 0;
  let investimentoTotal = 0;
  let sessoesTotal = 0;
  let pedidosTotal = 0;
  let clientesNovosTotal = 0;

  rowsFiltradas.forEach((r) => {
    receitaTotal += r.receitaFaturada || 0;
    investimentoTotal += r.investFacebook || 0; // hoje só Facebook
    sessoesTotal += r.sessoes || 0;
    pedidosTotal += r.pedidosAprovados || 0;
    clientesNovosTotal += r.clientesNovos || 0;
  });

  const clientesRecorrentesTotal = Math.max(
    0,
    pedidosTotal - clientesNovosTotal,
  );

  const ticketMedioGlobal =
    pedidosTotal > 0 ? receitaTotal / pedidosTotal : 0;

  const taxaConversaoGlobal =
    sessoesTotal > 0 ? pedidosTotal / sessoesTotal : 0;

  const cpsGlobal =
    sessoesTotal > 0 ? investimentoTotal / sessoesTotal : 0;

  const cacGlobal =
    clientesNovosTotal > 0 ? investimentoTotal / clientesNovosTotal : 0;

  const custoMktPct =
    receitaTotal > 0 ? investimentoTotal / receitaTotal : 0;

  const roas =
    investimentoTotal > 0 ? receitaTotal / investimentoTotal : 0;

  return {
    receitaTotal,
    investimentoTotal,
    sessoesTotal,
    pedidosTotal,
    clientesNovosTotal,
    clientesRecorrentesTotal,
    ticketMedioGlobal,
    taxaConversaoGlobal,
    cpsGlobal,
    cacGlobal,
    custoMktPct,
    roas,
  };
}
