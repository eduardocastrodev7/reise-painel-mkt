// src/components/dashboard/DailyResultsDashboard.jsx

import { useEffect, useMemo, useState } from 'react';
import { DateRangeFilter } from './DateRangeFilter';
import { useMarketingDailyData } from '../../hooks/useMarketingDailyData';

// Versão simples de card para não quebrar teu layout se o KpiCard tiver outro nome
function SimpleKpiCard({ title, value, subtitle }) {
  return (
    <div className="panel kpi-card">
      <div className="kpi-card-header">
        <span className="kpi-card-label">{title}</span>
      </div>
      <div className="kpi-card-value">{value}</div>
      {subtitle && (
        <div className="kpi-card-subtitle">{subtitle}</div>
      )}
    </div>
  );
}

const formatCurrencyBR = (value) =>
  (value ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function DailyResultsDashboard() {
  // Hook que já existe no seu projeto
  const {
    loading,
    erro,
    rows,    // array de dias com data + métricas
    minDate,
    maxDate,
  } = useMarketingDailyData();

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Inicializa com o range completo (ex.: mês inteiro) só UMA vez
  useEffect(() => {
    if (minDate && maxDate && !startDate && !endDate) {
      setStartDate(minDate);
      setEndDate(maxDate);
    }
  }, [minDate, maxDate, startDate, endDate]);

  const handlePeriodoChange = ({ startDate, endDate, start, end }) => {
    const s = normalizeDate(startDate || start);
    const e = normalizeDate(endDate || end);
    setStartDate(s);
    setEndDate(e);
  };

  // Usa alguns nomes comuns ("date", "data", "dia")
  const getRowDate = (row) => {
    if (!row) return null;
    const d = row.date || row.data || row.dia;
    return normalizeDate(d);
  };

  // === FILTRO POR PERÍODO (1 dia ou intervalo) ===========================
  const filteredRows = useMemo(() => {
    if (!rows || !rows.length) return [];

    let s = normalizeDate(startDate);
    let e = normalizeDate(endDate);

    // se nada selecionado → tudo
    if (!s && !e) return rows;

    // só uma das pontas → 1 dia
    if (!s && e) s = e;
    if (s && !e) e = s;
    if (!s || !e) return rows;

    // garante s <= e
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

    return rows.filter((row) => {
      const d = getRowDate(row);
      if (!d) return false;
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

  // === AGREGA MÉTRICAS DO PERÍODO ========================================
  const metrics = useMemo(() => {
    if (!filteredRows.length) {
      return {
        receitaTotal: 0,
        pedidosTotal: 0,
        sessoesTotal: 0,
        ticketMedio: 0,
        taxaConversao: 0,
        cps: 0,
      };
    }

    let receita = 0;
    let pedidos = 0;
    let sessoes = 0;
    let investimentoTotal = 0;

    for (const r of filteredRows) {
      // Ajuste os nomes se os seus campos forem diferentes
      const receitaDia =
        r.receitaFaturada ??
        r.receita ??
        r.faturamento ??
        0;
      const pedidosDia =
        r.pedidosAprovados ??
        r.pedidos ??
        r.orders ??
        0;
      const sessoesDia = r.sessoes ?? r.sessions ?? 0;
      const investimentoDia =
        r.investimentoTotal ??
        r.investimentoGeral ??
        r.investimento ??
        0;

      receita += Number(receitaDia) || 0;
      pedidos += Number(pedidosDia) || 0;
      sessoes += Number(sessoesDia) || 0;
      investimentoTotal += Number(investimentoDia) || 0;
    }

    const ticketMedio = pedidos > 0 ? receita / pedidos : 0;
    const taxaConversao =
      sessoes > 0 ? pedidos / sessoes : 0;
    const cps =
      sessoes > 0 ? investimentoTotal / sessoes : 0;

    return {
      receitaTotal: receita,
      pedidosTotal: pedidos,
      sessoesTotal: sessoes,
      ticketMedio,
      taxaConversao,
      cps,
    };
  }, [filteredRows]);

  const {
    receitaTotal,
    pedidosTotal,
    sessoesTotal,
    ticketMedio,
    taxaConversao,
    cps,
  } = metrics;

  // === ESTADOS GERAIS =====================================================
  if (loading) {
    return (
      <div className="panel">
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

  if (!rows || !rows.length) {
    return (
      <div className="panel">
        <h2>Sem dados de resultados diários</h2>
        <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
          Verifique se a planilha diária está preenchida e se o ID/aba
          estão corretos no .env.
        </p>
      </div>
    );
  }

  const hasData = filteredRows.length > 0;

  // === RENDER =============================================================
  return (
    <>
      {/* FILTRO DE PERÍODO */}
      <DateRangeFilter
        minDate={minDate}
        maxDate={maxDate}
        startDate={startDate}
        endDate={endDate}
        onChange={handlePeriodoChange}
      />

      {/* KPIs DO PERÍODO */}
      <section className="kpi-section">
        <div className="kpi-grid">
          <SimpleKpiCard
            title="Receita no período"
            value={formatCurrencyBR(receitaTotal)}
            subtitle="Faturamento total no intervalo selecionado"
          />
          <SimpleKpiCard
            title="Pedidos aprovados"
            value={pedidosTotal.toLocaleString('pt-BR')}
            subtitle="Quantidade de pedidos no período"
          />
          <SimpleKpiCard
            title="Sessões"
            value={sessoesTotal.toLocaleString('pt-BR')}
            subtitle="Sessões totais no site"
          />
          <SimpleKpiCard
            title="Ticket médio"
            value={
              ticketMedio > 0
                ? formatCurrencyBR(ticketMedio)
                : '-'
            }
            subtitle="Receita / pedidos"
          />
          <SimpleKpiCard
            title="Taxa de conversão"
            value={formatPercent(taxaConversao, 2)}
            subtitle="Pedidos / sessões"
          />
          <SimpleKpiCard
            title="Custo por sessão (CPS)"
            value={cps > 0 ? formatCurrencyBR(cps) : '-'}
            subtitle="Investimento total / sessões"
          />
        </div>
      </section>

      {/* TABELA DIÁRIA */}
      {hasData ? (
        <section className="panel table-panel">
          <div className="panel-header">
            <h2>Detalhe diário</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Receita</th>
                  <th>Pedidos</th>
                  <th>Sessões</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, idx) => {
                  const d = getRowDate(r);
                  const receitaDia =
                    r.receitaFaturada ??
                    r.receita ??
                    r.faturamento ??
                    0;
                  const pedidosDia =
                    r.pedidosAprovados ??
                    r.pedidos ??
                    r.orders ??
                    0;
                  const sessoesDia =
                    r.sessoes ?? r.sessions ?? 0;

                  return (
                    <tr key={idx}>
                      <td>{d ? formatDate(d) : '-'}</td>
                      <td>{formatCurrencyBR(receitaDia)}</td>
                      <td>{pedidosDia}</td>
                      <td>{sessoesDia}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="panel">
          <h2>Sem dados para o período selecionado</h2>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
            Ajuste o intervalo de datas ou verifique se há dados na
            planilha para esse período.
          </p>
        </div>
      )}
    </>
  );
}
