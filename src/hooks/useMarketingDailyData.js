// src/hooks/useMarketingDailyData.js
import { useEffect, useMemo, useState } from 'react';
import { MONTHS } from '../config/months';
import { fetchAllDailyRows } from '../lib/sheets';

const EMPTY_METRICS = {
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
  metaTotalPeriodo: 0,
  atingimentoMeta: 0,
  diferencaMeta: 0,
};

function aggregateMetrics(rows) {
  if (!rows || rows.length === 0) {
    return { ...EMPTY_METRICS };
  }

  let receitaTotal = 0;
  let investimentoTotal = 0;
  let sessoesTotal = 0;
  let pedidosTotal = 0;
  let clientesNovosTotal = 0;
  let metaTotalPeriodo = 0;

  rows.forEach((r) => {
    receitaTotal += r.receitaFaturada || 0;
    investimentoTotal += r.investFacebook || 0;
    sessoesTotal += r.sessoes || 0;
    pedidosTotal += r.pedidosAprovados || 0;
    clientesNovosTotal += r.clientesNovos || 0;
    metaTotalPeriodo += r.metaDia || 0;
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

  const atingimentoMeta =
    metaTotalPeriodo > 0 ? receitaTotal / metaTotalPeriodo : 0;

  const diferencaMeta = receitaTotal - metaTotalPeriodo;

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
    metaTotalPeriodo,
    atingimentoMeta,
    diferencaMeta,
  };
}

export function useMarketingDailyData() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const [minDate, setMinDate] = useState(null);
  const [maxDate, setMaxDate] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // --- carregar dados do Google Sheets ---
  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        setErro(null);

        const data = await fetchAllDailyRows(MONTHS);

        const hoje = new Date();
        const hojeMidnight = new Date(
          hoje.getFullYear(),
          hoje.getMonth(),
          hoje.getDate(),
          0,
          0,
          0,
          0,
        );

        // só até hoje
        const filtrado = data.filter((r) => r.date <= hojeMidnight);

        setRows(filtrado);

        if (!filtrado.length) {
          setMinDate(null);
          setMaxDate(null);
          setStartDate(null);
          setEndDate(null);
          return;
        }

        const overallMin = filtrado[0].date;
        const calendarioMax = hojeMidnight;

        setMinDate(overallMin);
        setMaxDate(calendarioMax);

        // seleciona mês atual por padrão
        const anoAtual = hojeMidnight.getFullYear();
        const mesAtual = hojeMidnight.getMonth();

        const linhasMesAtual = filtrado.filter(
          (r) =>
            r.date.getFullYear() === anoAtual &&
            r.date.getMonth() === mesAtual,
        );

        if (linhasMesAtual.length > 0) {
          const inicioMes = linhasMesAtual[0].date;
          const fimMes = linhasMesAtual[linhasMesAtual.length - 1].date;
          setStartDate(inicioMes);
          setEndDate(fimMes);
        } else {
          const fimBase = filtrado[filtrado.length - 1].date;
          setStartDate(overallMin);
          setEndDate(fimBase);
        }
      } catch (e) {
        console.error(e);
        setErro(e.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  // --- filtro por período selecionado ---
  const rowsFiltradas = useMemo(() => {
    if (!rows.length || !startDate || !endDate) return [];
    return rows.filter(
      (r) => r.date >= startDate && r.date <= endDate,
    );
  }, [rows, startDate, endDate]);

  // --- métricas do período atual ---
  const metrics = useMemo(
    () => aggregateMetrics(rowsFiltradas),
    [rowsFiltradas],
  );

  // --- métricas do período anterior (para comparação) ---
  const prevMetrics = useMemo(() => {
    if (!rows.length || !startDate || !endDate) return null;

    const DAY_MS = 24 * 60 * 60 * 1000;
    const diffDays =
      Math.round((endDate - startDate) / DAY_MS) + 1;

    if (diffDays <= 0) return null;

    const prevEnd = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() - 1,
    );
    const prevStart = new Date(
      prevEnd.getFullYear(),
      prevEnd.getMonth(),
      prevEnd.getDate() - (diffDays - 1),
    );

    const globalMin = rows[0].date;
    if (prevEnd < globalMin) return null;

    const startClamped = prevStart < globalMin ? globalMin : prevStart;

    const prevRows = rows.filter(
      (r) => r.date >= startClamped && r.date <= prevEnd,
    );

    if (!prevRows.length) return null;

    return aggregateMetrics(prevRows);
  }, [rows, startDate, endDate]);

  const setPeriodo = (inicio, fim) => {
    setStartDate(inicio);
    setEndDate(fim);
  };

  return {
    loading,
    erro,
    rowsFiltradas,
    metrics,
    prevMetrics,
    minDate,
    maxDate,
    startDate,
    endDate,
    setPeriodo,
  };
}
