// src/components/dashboard/CrmDashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { useCrmData } from '../../hooks/useCrmData';
import { useMarketingDailyData } from '../../hooks/useMarketingDailyData';
import { DateRangeFilter } from './DateRangeFilter';
import { KpiCard } from './KpiCard';
import { formatCurrencyBR } from '../../lib/parsers';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const formatPercent = (value, digits = 2) => {
  if (!Number.isFinite(value) || value === 0) return '-';
  return `${(value * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
};

const formatDate = (date) =>
  date
    ? date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Título do card com "i" de informação
const KpiTitle = ({ label, info }) => (
  <div className="kpi-title-with-info">
    <span>{label}</span>
    <span className="kpi-info" title={info}>
      i
    </span>
  </div>
);

const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

// Cor principal do CRM
const COLOR_PRIMARY = '#ee731b';

export function CrmDashboard({ presentationMode = false }) {
  // === CRM (planilha de CRM) ===============================================
  const crm = useCrmData();
  const {
    loading: crmLoading,
    erro: crmErro,
    rows = [],
    minDate,
    maxDate,
    metaByMonth,
    acoesSemCupomResumo,
    acoesSemCupomByMonth,
  } = crm;

  // === SITE (Resultados Diários) ===========================================
  const {
    loading: dailyLoading,
    erro: dailyErro,
    metrics: dailyMetrics,
    setPeriodo: setDailyPeriodo,
  } = useMarketingDailyData();

  // Período selecionado na aba de CRM
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Ao carregar, seleciona o MÊS ATUAL (interseção entre mês atual e range de dados)
  useEffect(() => {
    if (!minDate || !maxDate) return;
    if (startDate || endDate) return;

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // limita pelo range que existe na planilha
    const rangeStart = monthStart < minDate ? minDate : monthStart;
    const rangeEnd = monthEnd > maxDate ? maxDate : monthEnd;

    if (rangeStart <= rangeEnd) {
      setStartDate(rangeStart);
      setEndDate(rangeEnd);
    } else {
      // se não tiver dados no mês atual, cai pro range inteiro
      setStartDate(minDate);
      setEndDate(maxDate);
    }
  }, [minDate, maxDate, startDate, endDate]);

  const handleChangePeriodo = ({ startDate, endDate }) => {
    const s = normalizeDate(startDate);
    const e = normalizeDate(endDate);
    setStartDate(s);
    setEndDate(e);
  };

  // Sincroniza o período do CRM com o período dos Resultados Diários
  useEffect(() => {
    if (!startDate || !endDate) return;
    if (typeof setDailyPeriodo !== 'function') return;
    setDailyPeriodo(startDate, endDate);
  }, [startDate, endDate, setDailyPeriodo]);

  // Meses efetivamente carregados no CRM (para meta proporcional)
  const loadedMonthKeys = useMemo(() => {
    const set = new Set();
    for (const r of rows) {
      const d = r.date;
      if (!(d instanceof Date) || Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0',
      )}`;
      set.add(key);
    }
    return set;
  }, [rows]);

  // === FILTRO POR PERÍODO (CRM) ============================================
  const rowsFiltradas = useMemo(() => {
    if (!rows.length) return [];

    const sNorm = normalizeDate(startDate);
    const eNorm = normalizeDate(endDate);

    if (!sNorm && !eNorm) return rows;

    let s = sNorm || eNorm;
    let e = eNorm || sNorm || s;

    if (!s || !e) return rows;

    if (e < s) {
      const tmp = s;
      s = e;
      e = tmp;
    }

    const startMs = new Date(
      s.getFullYear(),
      s.getMonth(),
      s.getDate(),
      0,
      0,
      0,
      0,
    ).getTime();
    const endMs = new Date(
      e.getFullYear(),
      e.getMonth(),
      e.getDate(),
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
  }, [rows, startDate, endDate]);

  // === META DO PERÍODO (proporcional a dias + respeita meses carregados) ====
  const metaFatCrmPeriodo = useMemo(() => {
    if (!startDate || !endDate) return null;
    if (!metaByMonth || Object.keys(metaByMonth).length === 0) return null;

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

    const msPorDia = 24 * 60 * 60 * 1000;
    let totalMeta = 0;

    for (
      let d = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      d <= e;
      d = new Date(d.getTime() + msPorDia)
    ) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0',
      )}`;

      // só considera meta de meses carregados no CRM
      if (!loadedMonthKeys.has(key)) continue;

      const metaMes = metaByMonth[key];
      if (!metaMes || !Number.isFinite(metaMes) || metaMes <= 0) continue;

      const diasNoMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      totalMeta += metaMes / diasNoMes;
    }

    return totalMeta;
  }, [startDate, endDate, metaByMonth, loadedMonthKeys]);

  // === MÉTRICAS DO PERÍODO (CRM, só A:G) ===================================
  const metricsCrmBase = useMemo(() => {
    if (!rowsFiltradas.length) {
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
    const dailyMap = new Map(); // chave: data local YYYY-MM-DD

    for (const r of rowsFiltradas) {
      receitaTotal += r.valorTotal;
      descontoTotal += r.valorDesconto;
      pedidosSet.add(r.pedido);

      // canal
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

      // cupom
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

      // diário (agrupando pela data LOCAL, pra não duplicar dia 01)
      const d = r.date;
      if (d instanceof Date && !Number.isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = d.getMonth();
        const day = d.getDate();

        const diaKey = `${year}-${String(month + 1).padStart(
          2,
          '0',
        )}-${String(day).padStart(2, '0')}`;

        if (!dailyMap.has(diaKey)) {
          const normalizedDate = new Date(year, month, day); // meia-noite local
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
  }, [rowsFiltradas]);

  const {
    receitaTotal: receitaCrmBase,
    pedidosTotal: pedidosCrmBase,
    canaisResumo,
    cuponsResumo,
    dailyResumo,
  } = metricsCrmBase;

  // === DADOS PARA O GRÁFICO DE EVOLUÇÃO DIÁRIA =============================
  const dailyChartData = useMemo(
    () =>
      dailyResumo.map((d) => ({
        dateLabel: d.date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        receita: d.receita,
        pedidos: d.pedidos,
      })),
    [dailyResumo],
  );

  // === FATURAMENTO DO SITE NO PERÍODO (Resultados Diários) =================
  const siteRevenuePeriodo = dailyMetrics?.receitaTotal || 0;

  // === AÇÕES SEM CUPOM NO PERÍODO (proporcional por dia do mês) ============
  const acoesSemCupomPeriodo = useMemo(() => {
    if (!startDate || !endDate) {
      return { pedidos: 0, receita: 0 };
    }

    if (
      !acoesSemCupomByMonth ||
      Object.keys(acoesSemCupomByMonth).length === 0
    ) {
      return { pedidos: 0, receita: 0 };
    }

    const sNorm = normalizeDate(startDate);
    const eNorm = normalizeDate(endDate);
    if (!sNorm || !eNorm) {
      return { pedidos: 0, receita: 0 };
    }

    let s = sNorm;
    let e = eNorm;
    if (e < s) {
      const tmp = s;
      s = e;
      e = tmp;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    let totalPedidos = 0;
    let totalReceita = 0;

    for (
      let d = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      d <= e;
      d = new Date(d.getTime() + msPerDay)
    ) {
      const monthKey = `${d.getFullYear()}-${String(
        d.getMonth() + 1,
      ).padStart(2, '0')}`;
      const agg = acoesSemCupomByMonth[monthKey];
      if (!agg) continue;

      const diasNoMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      totalPedidos += agg.pedidos / diasNoMes;
      totalReceita += agg.receita / diasNoMes;
    }

    return { pedidos: totalPedidos, receita: totalReceita };
  }, [startDate, endDate, acoesSemCupomByMonth]);

  // === CRM FINAL (pedidos + receita incluindo ações sem cupom) =============
  const receitaCrmTotal =
    receitaCrmBase + (acoesSemCupomPeriodo.receita || 0);
  const pedidosCrmTotal =
    pedidosCrmBase + (acoesSemCupomPeriodo.pedidos || 0);

  const ticketMedioCrm =
    pedidosCrmTotal > 0 ? receitaCrmTotal / pedidosCrmTotal : 0;

  // === DIA DA SEMANA (CRM, só base A:G) ====================================
  const weekdayResumo = useMemo(() => {
    if (!rowsFiltradas.length) return [];

    const map = new Map(); // weekday -> { weekday, pedidos, receita }

    for (const r of rowsFiltradas) {
      const d = r.date;
      if (!(d instanceof Date) || Number.isNaN(d.getTime())) continue;
      const w = d.getDay(); // 0 domingo, 6 sábado

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
  }, [rowsFiltradas]);

  // === DERIVADOS ===========================================================
  const atingMetaFatPeriodo =
    metaFatCrmPeriodo && metaFatCrmPeriodo > 0
      ? receitaCrmTotal / metaFatCrmPeriodo
      : null;

  const representatividadePeriodo =
    siteRevenuePeriodo && siteRevenuePeriodo > 0
      ? receitaCrmTotal / siteRevenuePeriodo
      : null;

  const hasData = rowsFiltradas.length > 0;

  // === ESTADOS GERAIS (LOADING / ERRO) =====================================
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

  if (!rows.length) {
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
            Ainda não encontramos registros de CRM nessa planilha.
            Verifique se o App Script já começou a alimentar os dados.
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

  // === RENDER ==============================================================

  return (
    <div className="crm-dashboard-page">
      <DateRangeFilter
        minDate={minDate}
        maxDate={maxDate}
        startDate={startDate}
        endDate={endDate}
        onChange={handleChangePeriodo}
      />

      {/* KPIs PRINCIPAIS */}
      <section className="kpi-section">
        <div className="kpi-grid">
          <KpiCard
            title={
              <KpiTitle
                label="Receita CRM"
                info="Somatório de faturamento dos pedidos atribuídos ao CRM no período filtrado, incluindo ações sem cupom."
              />
            }
            value={formatCurrencyBR(receitaCrmTotal)}
          />

          <KpiCard
            title={
              <KpiTitle
                label="Pedidos CRM"
                info="Quantidade de pedidos atribuídos ao CRM no período, incluindo ações sem cupom."
              />
            }
            value={Math.round(pedidosCrmTotal).toLocaleString('pt-BR')}
          />

          <KpiCard
            title={
              <KpiTitle
                label="Ticket médio CRM"
                info="Receita CRM (incluindo ações sem cupom) dividida pela quantidade de pedidos de CRM no período."
              />
            }
            value={
              ticketMedioCrm > 0 ? formatCurrencyBR(ticketMedioCrm) : '-'
            }
          />

          <KpiCard
            title={
              <KpiTitle
                label="Meta CRM (período)"
                info="Meta de faturamento CRM proporcional aos dias selecionados (com base na aba Metas_CRM)."
              />
            }
            value={
              metaFatCrmPeriodo && metaFatCrmPeriodo > 0
                ? formatCurrencyBR(metaFatCrmPeriodo)
                : '-'
            }
          />

          <KpiCard
            title={
              <KpiTitle
                label="% atingimento da meta"
                info="Faturamento CRM (incluindo ações sem cupom) do período dividido pela meta do período."
              />
            }
            value={
              atingMetaFatPeriodo != null
                ? formatPercent(atingMetaFatPeriodo, 1)
                : '-'
            }
          />

          <KpiCard
            title={
              <KpiTitle
                label="Representatividade CRM"
                info="Quanto o CRM (incluindo ações sem cupom) representa do faturamento total do site no mesmo período."
              />
            }
            value={
              representatividadePeriodo != null
                ? formatPercent(representatividadePeriodo, 1)
                : '-'
            }
          />
        </div>
      </section>

      {/* GRÁFICO PRINCIPAL – EVOLUÇÃO DIÁRIA */}
      {hasData && dailyChartData.length > 0 && (
        <section className="panel chart-panel">
          <div className="panel-header">
            <h2>Evolução diária</h2>
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
                  formatter={(value) => {
                    const numero = Number(value) || 0;
                    const valorFormatado = numero.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      maximumFractionDigits: 2,
                    });
                    return [valorFormatado, 'Receita CRM'];
                  }}
                  labelFormatter={(label) => `Dia ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="receita"
                  name="Receita CRM"
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  stroke={COLOR_PRIMARY}
                  strokeWidth={2.3}
                />
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

      {/* Performance por dia da semana – tabela */}
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

      {/* Performance por canal – tabela */}
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

      {/* Performance por cupom – tabela */}
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

      {/* Resumo por ação sem cupom – tabela */}
      {hasData &&
        acoesSemCupomResumo &&
        acoesSemCupomResumo.length > 0 && (
          <section className="panel table-panel">
            <div className="panel-header">
              <h2>Resumo por ação sem cupom</h2>
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
                  {acoesSemCupomResumo.map((a) => {
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
