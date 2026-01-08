// src/components/dashboard/CrmDashboard.jsx

import { useEffect, useMemo, useState } from 'react';
import { useCrmData } from '../../hooks/useCrmData';
import { useMarketingDailyData } from '../../hooks/useMarketingDailyData';
import { DateRangeFilter } from './DateRangeFilter';
import { KpiCard } from './KpiCard';
import { formatCurrencyBR } from '../../lib/parsers';
import '../../styles/crm.css';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLOR_PRIMARY = '#ee731b';
const COLOR_SECONDARY = '#9ca3af';

const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

const formatPercent = (value, digits = 2) => {
  if (!Number.isFinite(value) || value === 0) return '-';
  return `${(value * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
};

const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (date) =>
  date
    ? date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

function filterRowsByRange(rows, start, end) {
  if (!rows || !rows.length || !start || !end) return [];
  const startMs = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();
  const endMs = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();

  return rows.filter((r) => {
    const d = r.date;
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return false;
    const dMs = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      12,
      0,
      0,
      0,
    ).getTime();
    return dMs >= startMs && dMs <= endMs;
  });
}

function computeCrmMetrics(rows) {
  if (!rows || !rows.length) {
    return {
      receitaTotal: 0,
      pedidosTotal: 0,
      ticketMedio: 0,
      canaisResumo: [],
      cuponsResumo: [],
      dailyResumo: [],
      descontoTotal: 0,
    };
  }

  let receitaTotal = 0;
  let descontoTotal = 0;
  const pedidosSet = new Set();
  const canaisMap = new Map();
  const cuponsMap = new Map();
  const dailyMap = new Map();

  for (const r of rows) {
    receitaTotal += r.valorTotal;
    descontoTotal += r.valorDesconto;
    pedidosSet.add(r.pedido);

    const canalKey = r.canal || 'Outro';
    if (!canaisMap.has(canalKey)) {
      canaisMap.set(canalKey, {
        canal: canalKey,
        pedidos: 0,
        receita: 0,
        desconto: 0,
      });
    }
    const canal = canaisMap.get(canalKey);
    canal.pedidos += 1;
    canal.receita += r.valorTotal;
    canal.desconto += r.valorDesconto;

    const cupomKey = r.cupom || 'Sem cupom';
    if (!cuponsMap.has(cupomKey)) {
      cuponsMap.set(cupomKey, {
        cupom: cupomKey,
        pedidos: 0,
        receita: 0,
        desconto: 0,
      });
    }
    const cupom = cuponsMap.get(cupomKey);
    cupom.pedidos += 1;
    cupom.receita += r.valorTotal;
    cupom.desconto += r.valorDesconto;

    const d = r.date;
    const diaKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(d.getDate()).padStart(2, '0')}`;

    if (!dailyMap.has(diaKey)) {
      const normalizedDate = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
      );
      dailyMap.set(diaKey, {
        key: diaKey,
        date: normalizedDate,
        pedidos: 0,
        receita: 0,
        desconto: 0,
      });
    }
    const dia = dailyMap.get(diaKey);
    dia.pedidos += 1;
    dia.receita += r.valorTotal;
    dia.desconto += r.valorDesconto;
  }

  const pedidosTotal = pedidosSet.size;
  const ticketMedio = pedidosTotal > 0 ? receitaTotal / pedidosTotal : 0;

  const canaisResumo = Array.from(canaisMap.values())
    .map((c) => ({
      ...c,
      ticket: c.pedidos > 0 ? c.receita / c.pedidos : 0,
      percentReceita: receitaTotal > 0 ? c.receita / receitaTotal : 0,
    }))
    .sort((a, b) => b.receita - a.receita);

  const cuponsResumo = Array.from(cuponsMap.values())
    .map((c) => ({
      ...c,
      ticket: c.pedidos > 0 ? c.receita / c.pedidos : 0,
      percentReceita: receitaTotal > 0 ? c.receita / receitaTotal : 0,
    }))
    .sort((a, b) => b.receita - a.receita);

  const dailyResumo = Array.from(dailyMap.values()).sort(
    (a, b) => a.date - b.date,
  );

  return {
    receitaTotal,
    pedidosTotal,
    ticketMedio,
    canaisResumo,
    cuponsResumo,
    dailyResumo,
    descontoTotal,
  };
}

function summarizeAcoesPeriodo(acoesDetalhes, start, end) {
  if (!acoesDetalhes || !acoesDetalhes.length || !start || !end) {
    return { lista: [], totalReceita: 0, totalPedidos: 0 };
  }

  const sMs = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();
  const eMs = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();

  const map = new Map();
  let totalReceita = 0;
  let totalPedidos = 0;

  for (const a of acoesDetalhes) {
    const d = a.date;
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) continue;
    const dMs = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      12,
      0,
      0,
      0,
    ).getTime();
    if (dMs < sMs || dMs > eMs) continue;

    const key = a.acao.toUpperCase();
    const prev =
      map.get(key) || { acao: a.acao, pedidos: 0, receita: 0 };
    prev.pedidos += a.pedidos || 0;
    prev.receita += a.receita || 0;
    map.set(key, prev);

    totalReceita += a.receita || 0;
    totalPedidos += a.pedidos || 0;
  }

  const lista = Array.from(map.values()).sort(
    (a, b) => b.receita - a.receita,
  );

  return { lista, totalReceita, totalPedidos };
}

export function CrmDashboard({ presentationMode = false }) {
  const {
    loading: crmLoading,
    erro: crmErro,
    rows,
    minDate,
    maxDate,
    metaByMonth,
    acoesSemCupomDetalhes,
  } = useCrmData();

  const {
    loading: dailyLoading,
    erro: dailyErro,
    metrics: dailyMetrics,
    setPeriodo: setDailyPeriodo,
  } = useMarketingDailyData();

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // range inicial: mês atual (limitado pelo range disponível)
  useEffect(() => {
    if (!minDate || !maxDate) return;
    if (startDate || endDate) return;

    const hoje = new Date();
    const monthStart = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const monthEnd = new Date(
      hoje.getFullYear(),
      hoje.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    let s = monthStart < minDate ? minDate : monthStart;
    let e = monthEnd > maxDate ? maxDate : monthEnd;

    if (s > e) {
      s = minDate;
      e = maxDate;
    }

    setStartDate(s);
    setEndDate(e);
  }, [minDate, maxDate, startDate, endDate]);

  const handleChangePeriodo = ({ startDate, endDate }) => {
    const s = normalizeDate(startDate);
    const e = normalizeDate(endDate);
    setStartDate(s);
    setEndDate(e);
  };

  // informar período pro hook de Resultados Diários (site)
  useEffect(() => {
    if (!startDate || !endDate) return;
    if (typeof setDailyPeriodo !== 'function') return;
    setDailyPeriodo(startDate, endDate);
  }, [startDate, endDate, setDailyPeriodo]);

  // info do período atual e anterior
  const periodInfo = useMemo(() => {
    const sNorm = normalizeDate(startDate);
    const eNorm = normalizeDate(endDate);
    if (!sNorm || !eNorm) return null;

    let s = sNorm;
    let e = eNorm;
    if (e < s) {
      const tmp = s;
      s = e;
      e = tmp;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const startMid = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const endMid = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    const days =
      Math.round((endMid.getTime() - startMid.getTime()) / msPerDay) + 1;

    const prevEndMs = startMid.getTime() - 1;
    const prevEnd = new Date(prevEndMs);
    const prevStart = new Date(prevEndMs - (days - 1) * msPerDay);

    return { start: startMid, end: endMid, prevStart, prevEnd, days };
  }, [startDate, endDate]);

  const rowsAtual = useMemo(
    () =>
      periodInfo
        ? filterRowsByRange(rows, periodInfo.start, periodInfo.end)
        : [],
    [rows, periodInfo],
  );

  const rowsAnterior = useMemo(
    () =>
      periodInfo
        ? filterRowsByRange(rows, periodInfo.prevStart, periodInfo.prevEnd)
        : [],
    [rows, periodInfo],
  );

  // se existe período anterior com dados, podemos comparar
  const compareEnabled = rowsAnterior && rowsAnterior.length > 0;

  // monta objeto de comparação { label, variant } pro KpiCard
  const buildComparison = (current, previous) => {
    if (!compareEnabled) return null;
    if (!Number.isFinite(previous) || previous === 0) return null;

    const delta = current / previous - 1;
    if (!Number.isFinite(delta)) return null;

    const variant = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';
    const absPct = Math.abs(delta * 100);
    const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';

    const label = `${sign} ${absPct.toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}% vs período anterior`;

    return { label, variant };
  };

  // métricas base CRM (só cupons)
  const metricsAtualBase = useMemo(
    () => computeCrmMetrics(rowsAtual),
    [rowsAtual],
  );
  const metricsAnteriorBase = useMemo(
    () => computeCrmMetrics(rowsAnterior),
    [rowsAnterior],
  );

  const receitaCrmBaseAtual = metricsAtualBase.receitaTotal;
  const pedidosCrmBaseAtual = metricsAtualBase.pedidosTotal;
  const ticketMedioCrmBaseAtual = metricsAtualBase.ticketMedio;
  const canaisResumo = metricsAtualBase.canaisResumo;
  const cuponsResumo = metricsAtualBase.cuponsResumo;
  const dailyResumo = metricsAtualBase.dailyResumo;

  const receitaCrmBaseAnterior = metricsAnteriorBase.receitaTotal;
  const pedidosCrmBaseAnterior = metricsAnteriorBase.pedidosTotal;
  const ticketMedioCrmBaseAnterior = metricsAnteriorBase.ticketMedio;
  const dailyResumoAnterior = metricsAnteriorBase.dailyResumo;

  // ações sem cupom: atual e anterior
  const acoesAtual = useMemo(
    () =>
      periodInfo
        ? summarizeAcoesPeriodo(
            acoesSemCupomDetalhes,
            periodInfo.start,
            periodInfo.end,
          )
        : { lista: [], totalReceita: 0, totalPedidos: 0 },
    [acoesSemCupomDetalhes, periodInfo],
  );

  const acoesAnterior = useMemo(
    () =>
      periodInfo
        ? summarizeAcoesPeriodo(
            acoesSemCupomDetalhes,
            periodInfo.prevStart,
            periodInfo.prevEnd,
          )
        : { lista: [], totalReceita: 0, totalPedidos: 0 },
    [acoesSemCupomDetalhes, periodInfo],
  );

  const receitaCrmTotal = receitaCrmBaseAtual + acoesAtual.totalReceita;
  const pedidosCrmTotal = pedidosCrmBaseAtual + acoesAtual.totalPedidos;
  const ticketMedioCrm =
    pedidosCrmTotal > 0 ? receitaCrmTotal / pedidosCrmTotal : 0;

  const receitaCrmTotalAnterior =
    receitaCrmBaseAnterior + acoesAnterior.totalReceita;
  const pedidosCrmTotalAnterior =
    pedidosCrmBaseAnterior + acoesAnterior.totalPedidos;
  const ticketMedioCrmAnterior =
    pedidosCrmTotalAnterior > 0
      ? receitaCrmTotalAnterior / pedidosCrmTotalAnterior
      : 0;

  // meta CRM (faturamento/pedidos) proporcional ao período
  const metaResumoPeriodo = useMemo(() => {
    if (!periodInfo) {
      return { metaFat: null, metaPed: null, diasPeriodo: 0 };
    }
    if (!metaByMonth || Object.keys(metaByMonth).length === 0) {
      return { metaFat: null, metaPed: null, diasPeriodo: 0 };
    }

    const { start, end } = periodInfo;
    const msPorDia = 24 * 60 * 60 * 1000;
    let metaFat = 0;
    let metaPed = 0;
    let diasPeriodo = 0;

    for (
      let d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      d <= end;
      d = new Date(d.getTime() + msPorDia)
    ) {
      diasPeriodo++;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0',
      )}`;
      const metaMes = metaByMonth[key];
      if (!metaMes) continue;

      const diasNoMes = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
      ).getDate();

      if (metaMes.metaReceita && metaMes.metaReceita > 0) {
        metaFat += metaMes.metaReceita / diasNoMes;
      }

      let metaDia = 0;
      if (metaMes.metaPedidosDia && metaMes.metaPedidosDia > 0) {
        metaDia = metaMes.metaPedidosDia;
      } else if (metaMes.metaPedidos && metaMes.metaPedidos > 0) {
        metaDia = metaMes.metaPedidos / diasNoMes;
      }
      metaPed += metaDia;
    }

    return {
      metaFat: metaFat || null,
      metaPed: metaPed || null,
      diasPeriodo,
    };
  }, [periodInfo, metaByMonth]);

  const metaFatCrmPeriodo = metaResumoPeriodo.metaFat;
  const metaPedCrmPeriodo = metaResumoPeriodo.metaPed;
  const diasPeriodo = metaResumoPeriodo.diasPeriodo;
  const metaPedidosDiaPeriodo =
    metaPedCrmPeriodo != null && diasPeriodo > 0
      ? metaPedCrmPeriodo / diasPeriodo
      : null;

  // projeção mês (não usada nos cards, mas deixei calculada se quiser usar depois)
  const projMes = useMemo(() => {
    if (!periodInfo) return null;
    const { start, end } = periodInfo;

    if (
      start.getFullYear() !== end.getFullYear() ||
      start.getMonth() !== end.getMonth()
    ) {
      return null;
    }

    const key = `${start.getFullYear()}-${String(
      start.getMonth() + 1,
    ).padStart(2, '0')}`;
    const metaMes = metaByMonth[key];
    if (!metaMes || !metaMes.metaReceita || metaMes.metaReceita <= 0) {
      return null;
    }

    const diasNoMes = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      0,
    ).getDate();
    const diasSelecionados = end.getDate() - start.getDate() + 1;
    if (diasSelecionados <= 0) return null;

    const mediaDia =
      receitaCrmTotal > 0 ? receitaCrmTotal / diasSelecionados : 0;
    if (!Number.isFinite(mediaDia) || mediaDia <= 0) return null;

    const projReceita = mediaDia * diasNoMes;
    const pctMeta = projReceita / metaMes.metaReceita;

    return { projReceita, pctMetaProjecao: pctMeta };
  }, [periodInfo, metaByMonth, receitaCrmTotal]);

  // clientes novos x recorrentes (clientes únicos)
  const clientesResumo = useMemo(() => {
    if (!rowsAtual.length) {
      return {
        clientesNovos: 0,
        clientesRecorrentes: 0,
        totalClientes: 0,
      };
    }
    const map = new Map();
    for (const r of rowsAtual) {
      const email = (r.email || '').toString().trim().toLowerCase();
      if (!email) continue;
      const flagNovo = (r.clienteNovo || '').toUpperCase() === 'SIM';
      const current = map.get(email);
      if (!current) {
        map.set(email, { novo: flagNovo, pedidos: 1 });
      } else {
        current.pedidos += 1;
        current.novo = current.novo && flagNovo;
      }
    }
    let clientesNovos = 0;
    let clientesRecorrentes = 0;
    for (const info of map.values()) {
      if (info.novo) clientesNovos++;
      else clientesRecorrentes++;
    }
    return {
      clientesNovos,
      clientesRecorrentes,
      totalClientes: map.size,
    };
  }, [rowsAtual]);

  const { clientesNovos, clientesRecorrentes, totalClientes } = clientesResumo;

  const clientesChartData = useMemo(() => {
    if (!totalClientes) return [];
    return [
      { name: 'Novos', value: clientesNovos },
      { name: 'Recorrentes', value: clientesRecorrentes },
    ];
  }, [clientesNovos, clientesRecorrentes, totalClientes]);

  // canais x clientes
  const canaisClientesResumo = useMemo(() => {
    if (!rowsAtual.length) return [];
    const map = new Map();

    for (const r of rowsAtual) {
      const canal = r.canal || 'Outro';
      const email = (r.email || '').toString().trim().toLowerCase();
      if (!email) continue;
      const novo = (r.clienteNovo || '').toUpperCase() === 'SIM';

      let entry = map.get(canal);
      if (!entry) {
        entry = {
          canal,
          emailsNovos: new Set(),
          emailsRec: new Set(),
        };
        map.set(canal, entry);
      }
      if (novo) entry.emailsNovos.add(email);
      else entry.emailsRec.add(email);
    }

    const arr = [];
    for (const entry of map.values()) {
      const novos = entry.emailsNovos.size;
      const rec = entry.emailsRec.size;
      const total = novos + rec;
      if (!total) continue;
      arr.push({
        canal: entry.canal,
        clientesNovos: novos,
        clientesRecorrentes: rec,
        totalClientes: total,
        pctNovos: total > 0 ? novos / total : 0,
      });
    }

    return arr.sort((a, b) => b.totalClientes - a.totalClientes);
  }, [rowsAtual]);

  // top 5 cupons
  const top5Cupons = useMemo(
    () => (cuponsResumo ? cuponsResumo.slice(0, 5) : []),
    [cuponsResumo],
  );

  // gráfico diário
  const dailyChartData = useMemo(() => {
    const atual = dailyResumo || [];
    const anterior = dailyResumoAnterior || [];
    if (!atual.length && !anterior.length) return [];

    const len = Math.max(atual.length, anterior.length);
    const data = [];

    for (let i = 0; i < len; i++) {
      const da = atual[i];
      const dp = anterior[i];
      if (!da && !dp) continue;

      const baseDate = da?.date || dp?.date;
      const label = baseDate
        ? baseDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          })
        : `Dia ${i + 1}`;

      data.push({
        index: i + 1,
        dateLabel: label,
        receitaAtual: da ? da.receita : null,
        receitaAnterior: dp ? dp.receita : null,
      });
    }

    return data;
  }, [dailyResumo, dailyResumoAnterior]);

  const siteRevenuePeriodo = dailyMetrics?.receitaTotal || 0;

  const atingMetaFatPeriodo =
    metaFatCrmPeriodo && metaFatCrmPeriodo > 0
      ? receitaCrmTotal / metaFatCrmPeriodo
      : null;

  const representatividadePeriodo =
    siteRevenuePeriodo && siteRevenuePeriodo > 0
      ? receitaCrmTotal / siteRevenuePeriodo
      : null;

  const hasData = rowsAtual.length > 0;

  const weekdayResumo = useMemo(() => {
    if (!rowsAtual.length) return [];

    const map = new Map();
    for (const r of rowsAtual) {
      const d = r.date;
      if (!(d instanceof Date) || Number.isNaN(d.getTime())) continue;
      const w = d.getDay();
      if (!map.has(w)) {
        map.set(w, { weekday: w, pedidos: 0, receita: 0 });
      }
      const agg = map.get(w);
      agg.pedidos += 1;
      agg.receita += r.valorTotal;
    }

    return Array.from(map.values())
      .map((w) => ({
        ...w,
        ticket: w.pedidos > 0 ? w.receita / w.pedidos : 0,
      }))
      .sort((a, b) => a.weekday - b.weekday);
  }, [rowsAtual]);

  let metaStatus = null;
  if (atingMetaFatPeriodo != null) {
    if (atingMetaFatPeriodo >= 1) metaStatus = 'good';
    else if (atingMetaFatPeriodo >= 0.8) metaStatus = 'warn';
    else metaStatus = 'bad';
  }

  // loading / erro
  if (crmLoading || dailyLoading) {
    return (
      <div className="panel">
        <div className="skeleton skeleton-label" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-table-row" />
      </div>
    );
  }

  if (crmErro) {
    return (
      <div className="panel panel-error">
        <strong>Ops!</strong> {crmErro}
      </div>
    );
  }

  if (!rows || !rows.length) {
    return (
      <div className="crm-dashboard-page">
        <DateRangeFilter
          minDate={minDate}
          maxDate={maxDate}
          startDate={startDate}
          endDate={endDate}
          onChange={handleChangePeriodo}
        />

        <div className="panel" style={{ marginTop: 12 }}>
          <h2>Sem dados de CRM</h2>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
            Ainda não encontramos registros de CRM na planilha CRM_DADOS.
          </p>
        </div>
      </div>
    );
  }

  if (dailyErro) {
    console.warn(
      'Erro ao carregar Resultados Diários para representatividade CRM:',
      dailyErro,
    );
  }

  return (
    <div className="crm-dashboard-page">
      {/* PERÍODO – usa o mesmo componente do painel de Resultados Diários */}
      <DateRangeFilter
        minDate={minDate}
        maxDate={maxDate}
        startDate={startDate}
        endDate={endDate}
        onChange={handleChangePeriodo}
      />

      {/* KPIs PRINCIPAIS – 2 linhas de 5 cards, grid só do CRM */}
      <section className="crm-kpi-section">
        <div className="crm-kpi-grid">
          <KpiCard
            title="Receita CRM"
            value={formatCurrencyBR(receitaCrmTotal)}
            subtitle="Período selecionado."
            description="Faturamento atribuído ao CRM no período, incluindo ações sem cupom."
            comparison={buildComparison(
              receitaCrmTotal,
              receitaCrmTotalAnterior,
            )}
          />

          <KpiCard
            title="Pedidos CRM"
            value={Math.round(pedidosCrmTotal).toLocaleString('pt-BR')}
            subtitle="Período selecionado."
            description="Total de pedidos atribuídos ao CRM no período selecionado."
            comparison={buildComparison(
              pedidosCrmTotal,
              pedidosCrmTotalAnterior,
            )}
          />

          <KpiCard
            title="Ticket médio CRM"
            value={
              ticketMedioCrm > 0 ? formatCurrencyBR(ticketMedioCrm) : '-'
            }
            subtitle="Receita CRM / pedidos CRM."
            description="Média de receita por pedido atribuída ao CRM no período."
            comparison={buildComparison(
              ticketMedioCrm,
              ticketMedioCrmAnterior,
            )}
          />

          <KpiCard
            title="Meta CRM (faturamento período)"
            value={
              metaFatCrmPeriodo && metaFatCrmPeriodo > 0
                ? formatCurrencyBR(metaFatCrmPeriodo)
                : '-'
            }
            subtitle="Meta do período selecionado."
            description="Meta de faturamento CRM proporcional aos dias do período."
            status={metaStatus}
          />

          <KpiCard
            title="% atingimento da meta"
            value={
              atingMetaFatPeriodo != null
                ? formatPercent(atingMetaFatPeriodo, 1)
                : '-'
            }
            subtitle="Meta de CRM atingida no período."
            description="Percentual da meta de faturamento CRM alcançada no período."
            status={metaStatus}
          />

          <KpiCard
            title="Representatividade CRM"
            value={
              representatividadePeriodo != null
                ? formatPercent(representatividadePeriodo, 1)
                : '-'
            }
            subtitle="Participação da receita CRM no site."
            description="Participação da receita de CRM na receita total do site no período selecionado."
          />

          <KpiCard
            title="Meta pedidos CRM (período)"
            value={
              metaPedCrmPeriodo != null
                ? Math.round(metaPedCrmPeriodo).toLocaleString('pt-BR')
                : '-'
            }
            subtitle="Meta de pedidos CRM no período."
            description="Quantidade de pedidos CRM desejada no período, conforme aba de metas CRM."
          />

          <KpiCard
            title="Meta pedidos/dia (período)"
            value={
              metaPedidosDiaPeriodo != null
                ? metaPedidosDiaPeriodo.toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })
                : '-'
            }
            subtitle="Meta média diária de pedidos CRM."
            description="Quantidade média de pedidos CRM por dia necessária para atingir a meta do período."
          />

          <KpiCard
            title="Clientes novos CRM"
            value={clientesNovos.toLocaleString('pt-BR')}
            subtitle="Clientes únicos novos no período."
            description="Quantidade de clientes únicos que fizeram o primeiro pedido (cliente novo) no período."
          />

          <KpiCard
            title="Clientes recorrentes CRM"
            value={clientesRecorrentes.toLocaleString('pt-BR')}
            subtitle="Clientes com mais de um pedido."
            description="Quantidade de clientes únicos que já possuem mais de um pedido na Shopify."
          />
        </div>
      </section>

      {/* Evolução diária (gráfico) */}
      {hasData && dailyChartData.length > 0 && (
        <section className="panel chart-panel">
          <div className="panel-header">
            <h2>Evolução diária (CRM)</h2>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={dailyChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#ececec"
                />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#dddddd' }}
                  minTickGap={12}
                />
                <YAxis
                  tickFormatter={(v) =>
                    v.toLocaleString('pt-BR', {
                      maximumFractionDigits: 0,
                    })
                  }
                  tickLine={false}
                  axisLine={{ stroke: '#dddddd' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #eee',
                    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)',
                  }}
                  formatter={(value, name) => {
                    const numero = Number(value) || 0;
                    const valorFormatado = numero.toLocaleString(
                      'pt-BR',
                      {
                        style: 'currency',
                        currency: 'BRL',
                        maximumFractionDigits: 2,
                      },
                    );
                    const labelName =
                      name === 'receitaAtual'
                        ? 'Receita CRM (período)'
                        : 'Receita CRM (período anterior)';
                    return [valorFormatado, labelName];
                  }}
                  labelFormatter={(label) => `Dia ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="receitaAtual"
                  name="Receita CRM (período)"
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  stroke={COLOR_PRIMARY}
                  strokeWidth={2.3}
                />
                {dailyChartData.some((d) => d.receitaAnterior != null) && (
                  <Line
                    type="monotone"
                    dataKey="receitaAnterior"
                    name="Receita CRM (período anterior)"
                    dot={false}
                    stroke={COLOR_SECONDARY}
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Evolução diária – tabela */}
      {hasData && (
        <section className="panel table-panel">
          <div className="panel-header">
            <h2>Evolução diária (tabela)</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Pedidos</th>
                  <th>Receita</th>
                  <th>Desconto</th>
                </tr>
              </thead>
              <tbody>
                {dailyResumo.map((d) => (
                  <tr key={d.key}>
                    <td>{formatDate(d.date)}</td>
                    <td>{d.pedidos.toLocaleString('pt-BR')}</td>
                    <td>{formatCurrencyBR(d.receita)}</td>
                    <td>{formatCurrencyBR(d.desconto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Clientes + canais */}
      {hasData && (
        <section className="panel two-column-panel">
          <div className="panel-column">
            <div className="panel-header">
              <h2>Clientes novos x recorrentes</h2>
            </div>
            <div className="chart-wrapper small-chart">
              {clientesChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={clientesChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                    >
                      {clientesChartData.map((entry, idx) => (
                        <Cell
                          key={entry.name}
                          fill={idx === 0 ? COLOR_PRIMARY : '#f97316aa'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        value.toLocaleString('pt-BR'),
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ fontSize: '0.85rem' }}>
                  Sem clientes no período selecionado.
                </p>
              )}
            </div>
          </div>

          <div className="panel-column">
            <div className="panel-header">
              <h2>Clientes por canal de CRM</h2>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Canal</th>
                    <th>Clientes novos</th>
                    <th>Clientes recorrentes</th>
                    <th>Total clientes</th>
                    <th>% novos</th>
                  </tr>
                </thead>
                <tbody>
                  {canaisClientesResumo.map((c) => (
                    <tr key={c.canal}>
                      <td>{c.canal}</td>
                      <td>{c.clientesNovos.toLocaleString('pt-BR')}</td>
                      <td>
                        {c.clientesRecorrentes.toLocaleString('pt-BR')}
                      </td>
                      <td>{c.totalClientes.toLocaleString('pt-BR')}</td>
                      <td>{formatPercent(c.pctNovos, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Top 5 cupons + ações sem cupom */}
      {hasData && (
        <section className="panel two-column-panel">
          <div className="panel-column">
            <div className="panel-header">
              <h2>Top 5 cupons de CRM (por receita)</h2>
            </div>
            <div className="chart-wrapper small-chart">
              {top5Cupons.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={top5Cupons.map((c) => ({
                      cupom: c.cupom,
                      receita: c.receita,
                    }))}
                    margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#ececec"
                    />
                    <XAxis
                      dataKey="cupom"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: '#dddddd' }}
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      tickFormatter={(v) =>
                        v.toLocaleString('pt-BR', {
                          maximumFractionDigits: 0,
                        })
                      }
                      tickLine={false}
                      axisLine={{ stroke: '#dddddd' }}
                    />
                    <Tooltip
                      formatter={(value) => {
                        const numero = Number(value) || 0;
                        const valorFormatado = numero.toLocaleString(
                          'pt-BR',
                          {
                            style: 'currency',
                            currency: 'BRL',
                          },
                        );
                        return [valorFormatado, 'Receita'];
                      }}
                    />
                    <Bar
                      dataKey="receita"
                      radius={[4, 4, 0, 0]}
                      fill={COLOR_PRIMARY}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ fontSize: '0.85rem' }}>
                  Não há cupons no período selecionado.
                </p>
              )}
            </div>
          </div>

          <div className="panel-column">
            <div className="panel-header">
              <h2>Ações sem cupom (por receita)</h2>
            </div>
            <div className="chart-wrapper small-chart">
              {acoesAtual.lista.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={acoesAtual.lista.slice(0, 8).map((a) => ({
                      acao: a.acao,
                      receita: a.receita,
                    }))}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 80, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#ececec"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(v) =>
                        v.toLocaleString('pt-BR', {
                          maximumFractionDigits: 0,
                        })
                      }
                      tickLine={false}
                      axisLine={{ stroke: '#dddddd' }}
                    />
                    <YAxis
                      dataKey="acao"
                      type="category"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: '#dddddd' }}
                      width={120}
                    />
                    <Tooltip
                      formatter={(value) => {
                        const numero = Number(value) || 0;
                        const valorFormatado = numero.toLocaleString(
                          'pt-BR',
                          {
                            style: 'currency',
                            currency: 'BRL',
                          },
                        );
                        return [valorFormatado, 'Receita'];
                      }}
                    />
                    <Bar
                      dataKey="receita"
                      radius={[4, 4, 4, 4]}
                      fill={COLOR_PRIMARY}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ fontSize: '0.85rem' }}>
                  Não há ações sem cupom no período selecionado.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Performance por dia da semana */}
      {hasData && weekdayResumo.length > 0 && (
        <section className="panel table-panel">
          <div className="panel-header">
            <h2>Performance por dia da semana (CRM)</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Pedidos</th>
                  <th>Receita</th>
                  <th>Ticket médio</th>
                </tr>
              </thead>
              <tbody>
                {weekdayResumo.map((w) => (
                  <tr key={w.weekday}>
                    <td>{WEEKDAY_LABELS[w.weekday]}</td>
                    <td>{w.pedidos.toLocaleString('pt-BR')}</td>
                    <td>{formatCurrencyBR(w.receita)}</td>
                    <td>
                      {w.ticket > 0 ? formatCurrencyBR(w.ticket) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Performance por canal */}
      {hasData && (
        <section className="panel table-panel">
          <div className="panel-header">
            <h2>Performance por canal de CRM</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Canal</th>
                  <th>Pedidos</th>
                  <th>Receita</th>
                  <th>Ticket médio</th>
                  <th>% da receita CRM</th>
                </tr>
              </thead>
              <tbody>
                {canaisResumo.map((c) => (
                  <tr key={c.canal}>
                    <td>{c.canal}</td>
                    <td>{c.pedidos.toLocaleString('pt-BR')}</td>
                    <td>{formatCurrencyBR(c.receita)}</td>
                    <td>
                      {c.ticket > 0 ? formatCurrencyBR(c.ticket) : '-'}
                    </td>
                    <td>{formatPercent(c.percentReceita, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Performance por cupom */}
      {hasData && (
        <section className="panel table-panel">
          <div className="panel-header">
            <h2>Performance por cupom de CRM</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cupom</th>
                  <th>Pedidos</th>
                  <th>Receita</th>
                  <th>Ticket médio</th>
                  <th>% da receita CRM</th>
                </tr>
              </thead>
              <tbody>
                {cuponsResumo.map((c) => (
                  <tr key={c.cupom}>
                    <td>{c.cupom}</td>
                    <td>{c.pedidos.toLocaleString('pt-BR')}</td>
                    <td>{formatCurrencyBR(c.receita)}</td>
                    <td>
                      {c.ticket > 0 ? formatCurrencyBR(c.ticket) : '-'}
                    </td>
                    <td>{formatPercent(c.percentReceita, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ações sem cupom – tabela */}
      {hasData &&
        acoesAtual.lista &&
        acoesAtual.lista.length > 0 && (
          <section className="panel table-panel">
            <div className="panel-header">
              <h2>Resumo por ação sem cupom (período)</h2>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Ação</th>
                    <th>Pedidos</th>
                    <th>Receita</th>
                    <th>Ticket médio</th>
                  </tr>
                </thead>
                <tbody>
                  {acoesAtual.lista.map((a) => {
                    const ticket =
                      a.pedidos > 0 ? a.receita / a.pedidos : 0;
                    return (
                      <tr key={a.acao}>
                        <td>{a.acao}</td>
                        <td>{a.pedidos.toLocaleString('pt-BR')}</td>
                        <td>{formatCurrencyBR(a.receita)}</td>
                        <td>
                          {ticket > 0
                            ? formatCurrencyBR(ticket)
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

      {!hasData && (
        <div className="panel">
          <h2>Sem dados de CRM para o período selecionado</h2>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
            Ajuste o intervalo de datas ou verifique se há registros de CRM
            nesse período.
          </p>
        </div>
      )}
    </div>
  );
}
