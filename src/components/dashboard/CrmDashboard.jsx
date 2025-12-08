// src/components/dashboard/CrmDashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { useCrmData } from '../../hooks/useCrmData';
import { DateRangeFilter } from './DateRangeFilter';
import { KpiCard } from './KpiCard';
import { formatCurrencyBR } from '../../lib/parsers';

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

export function CrmDashboard({ presentationMode = false }) {
  const {
    loading,
    erro,
    rows,
    minDate,
    maxDate,
    metaFatCrmMensal,
    monthlyCrmRevenue,
    monthlyCrmOrders,
    siteMonthlyRevenue,
  } = useCrmData();

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Inicializa com o range completo da aba (ex.: mês inteiro)
  useEffect(() => {
    if (minDate && maxDate && !startDate && !endDate) {
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

  // === FILTRO POR PERÍODO (aceita 1 dia) ===================================
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

  // === MÉTRICAS DO PERÍODO ================================================
  const metrics = useMemo(() => {
    if (!rowsFiltradas.length) {
      return {
        receitaTotal: 0,
        pedidosTotal: 0,
        ticketMedio: 0,
        canaisResumo: [],
        cuponsResumo: [],
        dailyResumo: [],
        melhorDia: null,
        piorDia: null,
      };
    }

    let receitaTotal = 0;
    let descontoTotal = 0;

    const pedidosSet = new Set();
    const canaisMap = new Map();
    const cuponsMap = new Map();
    const dailyMap = new Map();

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

      // diário
      const diaKey = r.date.toISOString().slice(0, 10);
      if (!dailyMap.has(diaKey)) {
        dailyMap.set(diaKey, {
          diaKey,
          date: new Date(
            r.date.getFullYear(),
            r.date.getMonth(),
            r.date.getDate(),
          ),
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
    const ticketMedio =
      pedidosTotal > 0 ? receitaTotal / pedidosTotal : 0;

    const canaisResumo = Array.from(canaisMap.values())
      .map((c) => ({
        ...c,
        ticket: c.pedidos > 0 ? c.receita / c.pedidos : 0,
        percentReceita:
          receitaTotal > 0 ? c.receita / receitaTotal : 0,
      }))
      .sort((a, b) => b.receita - a.receita);

    const cuponsResumo = Array.from(cuponsMap.values())
      .map((c) => ({
        ...c,
        ticket: c.pedidos > 0 ? c.receita / c.pedidos : 0,
        percentReceita:
          receitaTotal > 0 ? c.receita / receitaTotal : 0,
      }))
      .sort((a, b) => b.receita - a.receita);

    const dailyResumo = Array.from(dailyMap.values()).sort(
      (a, b) => a.date - b.date,
    );

    let melhorDia = null;
    let piorDia = null;
    for (const d of dailyResumo) {
      if (!melhorDia || d.receita > melhorDia.receita) {
        melhorDia = d;
      }
      if (!piorDia || d.receita < piorDia.receita) {
        piorDia = d;
      }
    }

    return {
      receitaTotal,
      pedidosTotal,
      ticketMedio,
      canaisResumo,
      cuponsResumo,
      dailyResumo,
      melhorDia,
      piorDia,
      descontoTotal,
    };
  }, [rowsFiltradas]);

  const {
    receitaTotal,
    pedidosTotal,
    ticketMedio,
    canaisResumo,
    cuponsResumo,
    dailyResumo,
    melhorDia,
    piorDia,
  } = metrics;

  // Representatividade do CRM nas vendas do site (mês da aba)
  const representatividadeMensal =
    siteMonthlyRevenue > 0
      ? monthlyCrmRevenue / siteMonthlyRevenue
      : null;

  const atingMetaFatMensal =
    metaFatCrmMensal > 0
      ? monthlyCrmRevenue / metaFatCrmMensal
      : null;

  const hasData = rowsFiltradas.length > 0;

  // === ESTADOS GERAIS ======================================================
  if (loading) {
    return (
      <div className="panel">
        <div className="skeleton skeleton-label" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-table-row" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="panel panel-error">
        <strong>Ops!</strong> {erro}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <>
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
            Verifique se o App Script já começou a alimentar o mês
            atual.
          </p>
        </div>
      </>
    );
  }

  // === RENDER ==============================================================
  return (
    <>
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
            title="Receita CRM (período)"
            value={formatCurrencyBR(receitaTotal)}
            subtitle="Pedidos atribuídos ao CRM no intervalo filtrado"
          />
          <KpiCard
            title="Pedidos CRM (período)"
            value={pedidosTotal.toLocaleString('pt-BR')}
            subtitle="Quantidade de pedidos de CRM no período"
          />
          <KpiCard
            title="Ticket médio CRM (período)"
            value={
              ticketMedio > 0 ? formatCurrencyBR(ticketMedio) : '-'
            }
            subtitle="Receita CRM / pedidos CRM no período"
          />

          <KpiCard
            title="Meta CRM (faturamento mês)"
            value={
              metaFatCrmMensal > 0
                ? formatCurrencyBR(metaFatCrmMensal)
                : '-'
            }
            subtitle="Meta mensal de faturamento CRM"
          />
          <KpiCard
            title="% atingimento da meta (mês)"
            value={
              atingMetaFatMensal != null
                ? formatPercent(atingMetaFatMensal, 1)
                : '-'
            }
            subtitle="Faturamento CRM do mês / meta"
          />
          <KpiCard
            title="Representatividade do CRM"
            value={
              representatividadeMensal != null
                ? formatPercent(representatividadeMensal, 1)
                : '-'
            }
            subtitle="Participação do CRM no faturamento total do site"
          />
        </div>
      </section>

      {/* Melhor / pior dia */}
      {hasData && !presentationMode && (
        <section className="panel summary-panel">
          <div className="summary-header">
            <div>
              <div className="summary-label">Evolução diária CRM</div>
              <h2 className="summary-title">Melhor e pior dia</h2>
            </div>
          </div>

          <div className="summary-highlight-days">
            {melhorDia && (
              <div className="summary-highlight-pill summary-highlight-pill--good">
                <span className="summary-highlight-label">
                  Melhor dia
                </span>
                <span className="summary-highlight-date">
                  {formatDate(melhorDia.date)}
                </span>
                <span className="summary-highlight-value">
                  {formatCurrencyBR(melhorDia.receita)}
                </span>
              </div>
            )}
            {piorDia && (
              <div className="summary-highlight-pill summary-highlight-pill--bad">
                <span className="summary-highlight-label">
                  Pior dia
                </span>
                <span className="summary-highlight-date">
                  {formatDate(piorDia.date)}
                </span>
                <span className="summary-highlight-value">
                  {formatCurrencyBR(piorDia.receita)}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Evolução diária – tabela */}
      {hasData && (
        <section className="panel table-panel">
          <div className="panel-header">
            <h2>Evolução diária (CRM)</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Pedidos</th>
                  <th>Receita</th>
                  <th>Descontos</th>
                  <th>Ticket médio</th>
                </tr>
              </thead>
              <tbody>
                {dailyResumo.map((d) => {
                  const ticket =
                    d.pedidos > 0 ? d.receita / d.pedidos : 0;
                  return (
                    <tr key={d.diaKey}>
                      <td>{formatDate(d.date)}</td>
                      <td>{d.pedidos}</td>
                      <td>{formatCurrencyBR(d.receita)}</td>
                      <td>{formatCurrencyBR(d.desconto)}</td>
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

      {/* Por canal */}
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
                    <td>{c.pedidos}</td>
                    <td>{formatCurrencyBR(c.receita)}</td>
                    <td>
                      {c.ticket > 0
                        ? formatCurrencyBR(c.ticket)
                        : '-'}
                    </td>
                    <td>{formatPercent(c.percentReceita, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Top cupons */}
      {hasData && (
        <section className="panel table-panel">
          <div className="panel-header">
            <h2>Top cupons de CRM</h2>
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
                {cuponsResumo.slice(0, 20).map((c) => (
                  <tr key={c.cupom}>
                    <td>{c.cupom}</td>
                    <td>{c.pedidos}</td>
                    <td>{formatCurrencyBR(c.receita)}</td>
                    <td>
                      {c.ticket > 0
                        ? formatCurrencyBR(c.ticket)
                        : '-'}
                    </td>
                    <td>{formatPercent(c.percentReceita, 1)}</td>
                  </tr>
                ))}
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
    </>
  );
}
