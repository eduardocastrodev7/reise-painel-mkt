// src/components/dashboard/DailyTable.jsx
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

export function DailyTable({ rows }) {
  if (!rows || rows.length === 0) {
    return null;
  }

  return (
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
          {rows.map((r) => {
            const investimentoDia = r.investFacebook || 0;
            const sessoesDia = r.sessoes || 0;
            const pedidosDia = r.pedidosAprovados || 0;
            const clientesNovosDia = r.clientesNovos || 0;
            const clientesRecorrentesDia = Math.max(
              0,
              pedidosDia - clientesNovosDia,
            );

            const ticketMedioDia =
              pedidosDia > 0 ? r.receitaFaturada / pedidosDia : 0;
            const taxaConvDia =
              sessoesDia > 0 ? pedidosDia / sessoesDia : 0;
            const cpsDia =
              sessoesDia > 0 ? investimentoDia / sessoesDia : 0;
            const cacDia =
              clientesNovosDia > 0
                ? investimentoDia / clientesNovosDia
                : 0;
            const custoMktDia =
              r.receitaFaturada > 0
                ? investimentoDia / r.receitaFaturada
                : 0;

            const metaDia = r.metaDia || 0;
            let rowClass = '';
            if (metaDia > 0) {
              if (r.receitaFaturada >= metaDia) {
                rowClass = 'row-above-goal';
              } else {
                rowClass = 'row-below-goal';
              }
            }

            return (
              <tr key={r.id} className={rowClass}>
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
                  {cpsDia > 0 ? formatCurrencyBR(cpsDia) : '-'}
                </td>
                <td>{clientesNovosDia.toLocaleString('pt-BR')}</td>
                <td>
                  {clientesRecorrentesDia.toLocaleString('pt-BR')}
                </td>
                <td>{formatCurrencyBR(investimentoDia)}</td>
                <td>
                  {cacDia > 0 ? formatCurrencyBR(cacDia) : '-'}
                </td>
                <td>{formatPercent(custoMktDia, 1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
