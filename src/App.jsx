// src/App.jsx
import { useEffect, useMemo, useState } from 'react';

import { MONTHS } from './config/months';
import { fetchAllDailyRows } from './lib/sheets';
import { formatCurrencyBR } from './lib/parsers';

import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DateRangeFilter } from './components/dashboard/DateRangeFilter';
import { KpiCard } from './components/dashboard/KpiCard';

import './styles/app.css';

// helper para porcentagens em pt-BR
const formatPercent = (v, digits = 2) =>
  v > 0
    ? `${(v * 100).toLocaleString('pt-BR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })}%`
    : '-';

// data completa dd/mm/aaaa
const formatDateFull = (date) =>
  date
    ? date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

function App() {
  const [section, setSection] = useState('overview');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const [minDate, setMinDate] = useState(null);
  const [maxDate, setMaxDate] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Carrega todos os meses da planilha
  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        setErro(null);

        const data = await fetchAllDailyRows(MONTHS);
        setRows(data);

        if (data.length > 0) {
          const first = data[0].date;
          const last = data[data.length - 1].date;
          setMinDate(first);
          setMaxDate(last);
          setStartDate(first);
          setEndDate(last);
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

  // Aplica filtro de período
  const rowsFiltradas = useMemo(() => {
    if (!rows.length) return [];
    return rows.filter((r) => {
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      return true;
    });
  }, [rows, startDate, endDate]);

  // Calcula KPIs do período
  const metrics = useMemo(() => {
    if (!rowsFiltradas.length) {
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
      receitaTotal += r.receitaFaturada;
      investimentoTotal += r.investFacebook;
      sessoesTotal += r.sessoes;
      pedidosTotal += r.pedidosAprovados;
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
  }, [rowsFiltradas]);

  return (
    <div className="app-root">
      {/* Sidebar (desktop + mobile) */}
      <Sidebar
        section={section}
        onChangeSection={(id) => {
          setSection(id);
          setSidebarMobileOpen(false); // fecha menu no mobile ao clicar
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() =>
          setSidebarCollapsed((prev) => !prev)
        }
        mobileOpen={sidebarMobileOpen}
      />

      {/* Overlay pro mobile quando menu estiver aberto */}
      {sidebarMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      {/* Área principal */}
      <main className={`main ${sidebarCollapsed ? 'main--wide' : ''}`}>
        <Topbar
          onOpenMobileMenu={() =>
            setSidebarMobileOpen((prev) => !prev) // <<< TOGGLE: abre e fecha
          }
        />

        {loading && <div className="panel">Carregando dados...</div>}

        {!loading && erro && (
          <div className="panel panel-error">
            <strong>Ops!</strong> {erro}
          </div>
        )}

        {!loading && !erro && (
          <>
            <DateRangeFilter
              minDate={minDate}
              maxDate={maxDate}
              startDate={startDate}
              endDate={endDate}
              onChange={(inicio, fim) => {
                setStartDate(inicio);
                setEndDate(fim);
              }}
            />

            {section === 'overview' && (
              <>
                {/* CARDS DE KPI */}
                <section className="kpi-section">
                  <div className="kpi-grid">
                    {/* linha 1: visão geral */}
                    <KpiCard
                      title="Receita total"
                      value={formatCurrencyBR(metrics.receitaTotal)}
                      subtitle="Período selecionado"
                    />
                    <KpiCard
                      title="Investimento em mídia"
                      value={formatCurrencyBR(metrics.investimentoTotal)}
                      subtitle="Investimento total do período"
                    />
                    <KpiCard
                      title="Pedidos aprovados"
                      value={metrics.pedidosTotal.toLocaleString('pt-BR')}
                      subtitle="Total de pedidos"
                    />
                    <KpiCard
                      title="Sessões"
                      value={metrics.sessoesTotal.toLocaleString('pt-BR')}
                      subtitle="Total de sessões"
                    />

                    {/* linha 2: eficiência */}
                    <KpiCard
                      title="ROAS"
                      value={
                        metrics.roas > 0 ? `${metrics.roas.toFixed(2)}x` : '-'
                      }
                      subtitle="Receita / Investimento"
                    />
                    <KpiCard
                      title="Ticket médio"
                      value={
                        metrics.ticketMedioGlobal > 0
                          ? formatCurrencyBR(metrics.ticketMedioGlobal)
                          : '-'
                      }
                      subtitle="Receita / Pedidos aprovados"
                    />
                    <KpiCard
                      title="Taxa de conversão"
                      value={formatPercent(metrics.taxaConversaoGlobal, 2)}
                      subtitle="Pedidos / Sessões"
                    />
                    <KpiCard
                      title="CPS (custo por sessão)"
                      value={
                        metrics.cpsGlobal > 0
                          ? formatCurrencyBR(metrics.cpsGlobal)
                          : '-'
                      }
                      subtitle="Investimento / Sessões"
                    />

                    {/* linha 3: clientes e marketing */}
                    <KpiCard
                      title="Clientes novos"
                      value={metrics.clientesNovosTotal.toLocaleString('pt-BR')}
                      subtitle="Total no período"
                    />
                    <KpiCard
                      title="Clientes recorrentes"
                      value={metrics.clientesRecorrentesTotal.toLocaleString(
                        'pt-BR',
                      )}
                      subtitle="Pedidos aprovados - Clientes novos"
                    />
                    <KpiCard
                      title="CAC (clientes novos)"
                      value={
                        metrics.cacGlobal > 0
                          ? formatCurrencyBR(metrics.cacGlobal)
                          : '-'
                      }
                      subtitle="Investimento / Clientes novos"
                    />
                    <KpiCard
                      title="% custo de MKT"
                      value={formatPercent(metrics.custoMktPct, 1)}
                      subtitle="Investimento / Receita"
                    />
                  </div>
                </section>

                {/* TABELA DIÁRIA */}
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
                          <th>Meta</th>
                          <th>Sessões</th>
                          <th>Pedidos</th>
                          <th>Ticket médio</th>
                          <th>Taxa conv.</th>
                          <th>CPS</th>
                          <th>Clientes novos</th>
                          <th>Clientes recorrentes</th>
                          <th>Investimento</th>
                          <th>CAC (clientes novos)</th>
                          <th>% custo MKT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowsFiltradas.map((r) => {
                          const investimentoDia = r.investFacebook || 0;
                          const sessoesDia = r.sessoes || 0;
                          const pedidosDia = r.pedidosAprovados || 0;
                          const clientesNovosDia = r.clientesNovos || 0;
                          const clientesRecorrentesDia = Math.max(
                            0,
                            pedidosDia - clientesNovosDia,
                          );

                          const ticketMedioDia =
                            pedidosDia > 0
                              ? r.receitaFaturada / pedidosDia
                              : 0;
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
                            r.receitaFaturada > 0
                              ? investimentoDia / r.receitaFaturada
                              : 0;

                          return (
                            <tr key={r.id}>
                              <td>{formatDateFull(r.date)}</td>
                              <td>{formatCurrencyBR(r.receitaFaturada)}</td>
                              <td>{formatCurrencyBR(r.metaDia)}</td>
                              <td>{sessoesDia.toLocaleString('pt-BR')}</td>
                              <td>{pedidosDia}</td>
                              <td>
                                {ticketMedioDia > 0
                                  ? formatCurrencyBR(ticketMedioDia)
                                  : '-'}
                              </td>
                              <td>{formatPercent(taxaConvDia, 2)}</td>
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
                                {formatCurrencyBR(investimentoDia)}
                              </td>
                              <td>
                                {cacDia > 0
                                  ? formatCurrencyBR(cacDia)
                                  : '-'}
                              </td>
                              <td>{formatPercent(custoMktDia, 1)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {section !== 'overview' && (
              <div className="panel">
                <h2>
                  {section === 'crm'
                    ? 'Visão de CRM'
                    : section === 'social'
                    ? 'Visão de Social Media'
                    : 'Visão de Performance'}
                </h2>
                <p>
                  Em breve: aqui vamos plugar os dados específicos de{' '}
                  {section.toUpperCase()} usando a mesma base da
                  plataforma.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
