// src/components/dashboard/DailyDashboard.jsx
import { useState } from 'react';
import { DateRangeFilter } from './DateRangeFilter';
import { KpiCard } from './KpiCard';
import { KPI_CARDS } from '../../config/kpiCards';
import { PerformanceChart } from './PerformanceChart';
import { formatCurrencyBR } from '../../lib/parsers';

const formatPercent = (v, digits = 2) =>
  v > 0
    ? `${(v * 100).toLocaleString('pt-BR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })}%`
    : '-';

const formatDateFull = (date) =>
  date
    ? date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

const KPI_GROUP_LABELS = {
  volume: 'Receita & Volume',
  eficiencia: 'Eficiência de mídia',
  clientes: 'Clientes & Marketing',
};

export function DailyDashboard({
  loading,
  erro,
  rowsFiltradas,
  metrics,
  prevMetrics,
  minDate,
  maxDate,
  startDate,
  endDate,
  onChangePeriodo,
  presentationMode,
}) {
  const [showAdvancedColumns, setShowAdvancedColumns] = useState(false);

  const hasData = rowsFiltradas && rowsFiltradas.length > 0;

  const receitaTotal = metrics.receitaTotal || 0;
  const metaTotal = metrics.metaTotalPeriodo || 0;
  const atingimentoMeta = metrics.atingimentoMeta || 0;
  const diferencaMeta = metrics.diferencaMeta || 0;
  const roasValor = metrics.roas || 0;
  const sessoesTotais = metrics.sessoesTotal || 0;
  const pedidosTotais = metrics.pedidosTotal || 0;

  // ===== QUALIDADE DOS DADOS =====
  let diasSemDados = 0;
  let diasInvestSemReceita = 0;

  if (hasData) {
    rowsFiltradas.forEach((r) => {
      const receita = r.receitaFaturada || 0;
      const invest =
        (r.investFacebook || 0) +
        (r.investGoogle || 0) +
        (r.investWhatsApp || 0) +
        (r.investimentoTotal || 0);
      const sessoes = r.sessoes || 0;

      if (receita === 0 && invest === 0 && sessoes === 0) {
        diasSemDados += 1;
      }
      if (receita === 0 && invest > 0) {
        diasInvestSemReceita += 1;
      }
    });
  }

  // ===== MELHOR DIA / PIOR DIA =====
  let melhorDia = null;
  let piorDia = null;

  if (hasData) {
    const diasValidos = rowsFiltradas.filter(
      (r) => (r.receitaFaturada || 0) > 0,
    );

    if (diasValidos.length > 0) {
      melhorDia = diasValidos.reduce((acc, r) =>
        r.receitaFaturada > acc.receitaFaturada ? r : acc,
      );
      piorDia = diasValidos.reduce((acc, r) =>
        r.receitaFaturada < acc.receitaFaturada ? r : acc,
      );
    }
  }

  // ===== COMPARAÇÃO PARA OS KPIs DOS CARDS =====
  const buildComparison = (card) => {
    if (!card.showComparison || !prevMetrics) return null;

    const current = metrics[card.metricKey] ?? 0;
    const previous = prevMetrics[card.metricKey] ?? 0;

    if (!previous || !isFinite(previous)) return null;

    const diff = current - previous;
    const pctChange = (diff / previous) * 100;
    const absPct = Math.abs(pctChange).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

    let variant = 'neutral';

    if (card.trendDirection === 'up-good') {
      if (pctChange > 0) variant = 'up';
      else if (pctChange < 0) variant = 'down';
    } else if (card.trendDirection === 'down-good') {
      if (pctChange < 0) variant = 'up';
      else if (pctChange > 0) variant = 'down';
    }

    const sign = pctChange > 0 ? '+' : pctChange < 0 ? '-' : '';
    const arrow = variant === 'up' ? '↑' : variant === 'down' ? '↓' : '';

    const label = `${arrow ? arrow + ' ' : ''}${
      sign ? sign : ''
    }${absPct}% vs período anterior`;

    return { variant, label };
  };

  // ===== AGRUPAMENTO DOS CARDS KPI =====
  const grouped = KPI_CARDS.reduce((acc, card) => {
    if (!acc[card.group]) acc[card.group] = [];
    acc[card.group].push(card);
    return acc;
  }, {});

  const renderKpiGroups = () =>
    Object.entries(grouped).map(([group, cards]) => (
      <div key={group} className="kpi-group">
        <div className="kpi-group-title">
          {KPI_GROUP_LABELS[group] || group}
        </div>
        <div className="kpi-grid">
          {cards.map((card) => {
            const raw = metrics[card.metricKey] ?? 0;
            let valueDisplay = '-';

            switch (card.type) {
              case 'currency':
                valueDisplay = formatCurrencyBR(raw);
                break;
              case 'currency-or-dash':
                valueDisplay = raw > 0 ? formatCurrencyBR(raw) : '-';
                break;
              case 'integer':
                valueDisplay = raw.toLocaleString('pt-BR');
                break;
              case 'percent-1':
                valueDisplay = formatPercent(raw, 1);
                break;
              case 'percent-2':
                valueDisplay = formatPercent(raw, 2);
                break;
              case 'roas':
                valueDisplay = raw > 0 ? `${raw.toFixed(2)}x` : '-';
                break;
              default:
                valueDisplay = String(raw);
            }

            const comparison = buildComparison(card);

            return (
              <KpiCard
                key={card.id}
                title={card.title}
                value={valueDisplay}
                subtitle={card.subtitle}
                comparison={comparison}
                description={card.description}
              />
            );
          })}
        </div>
      </div>
    ));

  // ===== EXPORTAR CSV =====
  const handleExportCsv = () => {
    if (!rowsFiltradas || rowsFiltradas.length === 0) return;

    const headers = [
      'Data',
      'Receita Faturada',
      'Meta do dia',
      'Sessões',
      'Pedidos aprovados',
      'Ticket médio',
      'Taxa de conversão',
      'CPS',
      'Clientes novos',
      'Clientes recorrentes',
      'Investimento total (estimado)',
      'CAC (clientes novos)',
      '% custo MKT',
    ];

    const lines = rowsFiltradas.map((r) => {
      const investimentoDia =
        (r.investFacebook || 0) +
        (r.investGoogle || 0) +
        (r.investWhatsApp || 0) +
        (r.investimentoTotal || 0);

      const sessoesDia = r.sessoes || 0;
      const pedidosDia = r.pedidosAprovados || 0;
      const clientesNovosDia = r.clientesNovos || 0;
      const clientesRecorrentesDia = Math.max(
        0,
        pedidosDia - clientesNovosDia,
      );

      const receitaDia = r.receitaFaturada || 0;
      const ticketMedioDia =
        pedidosDia > 0 ? receitaDia / pedidosDia : 0;
      const taxaConvDia =
        sessoesDia > 0 ? pedidosDia / sessoesDia : 0;
      const cpsDia =
        sessoesDia > 0 ? investimentoDia / sessoesDia : 0;
      const cacDia =
        clientesNovosDia > 0 ? investimentoDia / clientesNovosDia : 0;
      const custoMktDia =
        receitaDia > 0 ? investimentoDia / receitaDia : 0;

      const cols = [
        formatDateFull(r.date),
        receitaDia.toFixed(2).replace('.', ','),
        (r.metaDia || 0).toFixed(2).replace('.', ','),
        sessoesDia.toString(),
        pedidosDia.toString(),
        ticketMedioDia
          ? ticketMedioDia.toFixed(2).replace('.', ',')
          : '',
        (taxaConvDia * 100).toFixed(2).replace('.', ','),
        cpsDia ? cpsDia.toFixed(2).replace('.', ',') : '',
        clientesNovosDia.toString(),
        clientesRecorrentesDia.toString(),
        investimentoDia
          ? investimentoDia.toFixed(2).replace('.', ',')
          : '',
        cacDia ? cacDia.toFixed(2).replace('.', ',') : '',
        (custoMktDia * 100).toFixed(1).replace('.', ','),
      ];

      return cols.join(';');
    });

    const csv = [headers.join(';'), ...lines].join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = 'reise_resultados_diarios.csv';

    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleAdvancedColumns = () => {
    setShowAdvancedColumns((prev) => !prev);
  };

  // ===== LOADING / ERRO =====
  if (loading) {
    return (
      <>
        <section className="panel">
          <div className="skeleton skeleton-label" />
          <div className="skeleton skeleton-title" />
        </section>

        <section className="kpi-section">
          <div className="kpi-grid">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="kpi-card kpi-card--skeleton">
                <div className="skeleton skeleton-text-sm" />
                <div className="skeleton skeleton-number" />
                <div className="skeleton skeleton-text-xs" />
              </div>
            ))}
          </div>
        </section>

        <section className="panel table-panel">
          <div className="skeleton skeleton-text-sm" />
          <div className="skeleton skeleton-table-row" />
          <div className="skeleton skeleton-table-row" />
        </section>
      </>
    );
  }

  if (erro) {
    return (
      <div className="panel panel-error">
        <strong>Ops!</strong> {erro}
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <>
      {/* FILTRO DE PERÍODO */}
      <DateRangeFilter
        minDate={minDate}
        maxDate={maxDate}
        startDate={startDate}
        endDate={endDate}
        onChange={onChangePeriodo}
      />

      {/* META x REALIZADO (vira a “primeira coisa” depois do filtro) */}
      <section className="panel summary-panel">
        <div className="summary-header">
          <div>
            <div className="summary-label">Resumo do período</div>
            <h2 className="summary-title">Meta x realizado</h2>
          </div>

          {metaTotal > 0 && (
            <span
              className={
                'summary-pill ' +
                (atingimentoMeta >= 1
                  ? 'summary-pill-good'
                  : atingimentoMeta >= 0.9
                  ? 'summary-pill-warn'
                  : 'summary-pill-bad')
              }
            >
              {atingimentoMeta >= 1
                ? 'Acima da meta'
                : atingimentoMeta >= 0.9
                ? 'Próximo da meta'
                : 'Abaixo da meta'}
            </span>
          )}
        </div>

        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-item-label">Receita realizada</span>
            <span className="summary-item-value">
              {formatCurrencyBR(receitaTotal)}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-item-label">Meta do período</span>
            <span className="summary-item-value">
              {metaTotal > 0 ? formatCurrencyBR(metaTotal) : '-'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-item-label">% atingimento</span>
            <span className="summary-item-value">
              {metaTotal > 0 ? formatPercent(atingimentoMeta, 1) : '-'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-item-label">Diferença</span>
            <span
              className={
                'summary-item-value ' +
                (diferencaMeta > 0
                  ? 'summary-diff-positive'
                  : diferencaMeta < 0
                  ? 'summary-diff-negative'
                  : '')
              }
            >
              {metaTotal > 0 ? formatCurrencyBR(diferencaMeta) : '-'}
            </span>
          </div>
        </div>

        {/* MELHOR / PIOR DIA */}
        {hasData && (melhorDia || piorDia) && (
          <div className="summary-highlight-days">
            {melhorDia && (
              <div className="summary-highlight-pill summary-highlight-pill--good">
                <span className="summary-highlight-label">
                  Melhor dia
                </span>
                <span className="summary-highlight-date">
                  {formatDateFull(melhorDia.date)}
                </span>
                <span className="summary-highlight-value">
                  {formatCurrencyBR(melhorDia.receitaFaturada)}
                </span>
              </div>
            )}
            {piorDia && (
              <div className="summary-highlight-pill summary-highlight-pill--bad">
                <span className="summary-highlight-label">
                  Pior dia
                </span>
                <span className="summary-highlight-date">
                  {formatDateFull(piorDia.date)}
                </span>
                <span className="summary-highlight-value">
                  {formatCurrencyBR(piorDia.receitaFaturada)}
                </span>
              </div>
            )}
          </div>
        )}

        {hasData && !presentationMode && (
          <div className="summary-data-quality">
            {diasSemDados === 0 && diasInvestSemReceita === 0 && (
              <span>✅ Dados consistentes para o período selecionado.</span>
            )}
            {diasSemDados > 0 && (
              <span>
                ⚠ {diasSemDados} dia(s) sem registro de receita, investimento
                e sessões.
              </span>
            )}
            {diasInvestSemReceita > 0 && (
              <span>
                ⚠ {diasInvestSemReceita} dia(s) com investimento &gt; 0 e
                receita = 0.
              </span>
            )}
          </div>
        )}
      </section>

      {/* GRÁFICO RECEITA x META */}
      {hasData && <PerformanceChart rows={rowsFiltradas} />}

      {/* SEM DADOS */}
      {!hasData ? (
        <div className="panel" style={{ marginTop: 16 }}>
          <h2>Sem dados para o período</h2>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
            Ajuste o intervalo de datas para visualizar os resultados diários
            de marketing.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs AGRUPADOS */}
          <section className="kpi-section">{renderKpiGroups()}</section>

          {/* TABELA DIÁRIA */}
          <section className="panel table-panel">
            <div className="panel-header">
              <h2>Detalhe diário</h2>
              {!presentationMode && (
                <div className="table-actions">
                  <button
                    type="button"
                    className={
                      'btn-ghost ' +
                      (showAdvancedColumns ? 'btn-ghost--active' : '')
                    }
                    onClick={toggleAdvancedColumns}
                  >
                    {showAdvancedColumns ? 'Ocultar detalhes' : 'Ver detalhes'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleExportCsv}
                  >
                    Exportar CSV
                  </button>
                </div>
              )}
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Receita</th>
                    <th>Meta</th>
                    <th>Sessões</th>
                    <th>Pedidos</th>
                    <th>Ticket médio</th>
                    <th>Taxa conv.</th>
                    <th>Investimento</th>
                    {showAdvancedColumns && (
                      <>
                        <th>CPS</th>
                        <th>Clientes novos</th>
                        <th>Clientes recorrentes</th>
                        <th>CAC (clientes novos)</th>
                        <th>% custo MKT</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rowsFiltradas.map((r) => {
                    const investimentoDia =
                      (r.investFacebook || 0) +
                      (r.investGoogle || 0) +
                      (r.investWhatsApp || 0) +
                      (r.investimentoTotal || 0);
                    const sessoesDia = r.sessoes || 0;
                    const pedidosDia = r.pedidosAprovados || 0;
                    const clientesNovosDia = r.clientesNovos || 0;
                    const clientesRecorrentesDia = Math.max(
                      0,
                      pedidosDia - clientesNovosDia,
                    );

                    const receitaDia = r.receitaFaturada || 0;
                    const ticketMedioDia =
                      pedidosDia > 0 ? receitaDia / pedidosDia : 0;
                    const taxaConvDia =
                      sessoesDia > 0 ? pedidosDia / sessoesDia : 0;
                    const cpsDia =
                      sessoesDia > 0
                        ? investimentoDia / sessoesDia
                        : 0;
                    const cacDia =
                      clientesNovosDia > 0
                        ? investimentoDia / clientesNovosDia
                        : 0;
                    const custoMktDia =
                      receitaDia > 0
                        ? investimentoDia / receitaDia
                        : 0;

                    const metaDia = r.metaDia || 0;

                    const hasNoData =
                      receitaDia === 0 &&
                      investimentoDia === 0 &&
                      sessoesDia === 0;
                    const investSemReceita =
                      receitaDia === 0 && investimentoDia > 0;

                    let rowClass = '';
                    if (metaDia > 0) {
                      if (receitaDia >= metaDia) {
                        rowClass = 'row-above-goal';
                      } else {
                        rowClass = 'row-below-goal';
                      }
                    }
                    if (hasNoData) rowClass += ' row-no-data';
                    if (investSemReceita)
                      rowClass += ' row-invest-no-revenue';

                    return (
                      <tr key={r.id} className={rowClass.trim()}>
                        <td>{formatDateFull(r.date)}</td>
                        <td>
                          {hasNoData
                            ? 'Sem registro'
                            : formatCurrencyBR(receitaDia)}
                        </td>
                        <td>{formatCurrencyBR(metaDia)}</td>
                        <td>{sessoesDia.toLocaleString('pt-BR')}</td>
                        <td>{pedidosDia}</td>
                        <td>
                          {ticketMedioDia > 0
                            ? formatCurrencyBR(ticketMedioDia)
                            : '-'}
                        </td>
                        <td>{formatPercent(taxaConvDia, 2)}</td>
                        <td>{formatCurrencyBR(investimentoDia)}</td>
                        {showAdvancedColumns && (
                          <>
                            <td>
                              {cpsDia > 0
                                ? formatCurrencyBR(cpsDia)
                                : '-'}
                            </td>
                            <td>
                              {clientesNovosDia.toLocaleString('pt-BR')}
                            </td>
                            <td>
                              {clientesRecorrentesDia.toLocaleString(
                                'pt-BR',
                              )}
                            </td>
                            <td>
                              {cacDia > 0
                                ? formatCurrencyBR(cacDia)
                                : '-'}
                            </td>
                            <td>{formatPercent(custoMktDia, 1)}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
