// src/components/dashboard/PerformanceChart.jsx
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from 'recharts';
import { formatCurrencyBR } from '../../lib/parsers';

const formatCurrencyShort = (value) => {
  if (value == null) return '';
  const v = Number(value);
  if (!Number.isFinite(v)) return '';
  if (v >= 1_000_000) {
    return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  }
  if (v >= 1_000) {
    return `R$ ${(v / 1_000).toFixed(1)}k`;
  }
  return `R$ ${v.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const receita = payload.find((p) => p.dataKey === 'receita');
  const meta = payload.find((p) => p.dataKey === 'meta');

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{label}</div>
      {receita && (
        <div className="chart-tooltip-row">
          <span className="dot dot-receita" />
          Receita:{' '}
          <strong>{formatCurrencyBR(receita.value || 0)}</strong>
        </div>
      )}
      {meta && (
        <div className="chart-tooltip-row">
          <span className="dot dot-meta" />
          Meta:{' '}
          <strong>{formatCurrencyBR(meta.value || 0)}</strong>
        </div>
      )}
    </div>
  );
};

export function PerformanceChart({ rows }) {
  if (!rows || rows.length === 0) return null;

  const data = rows.map((r) => ({
    date: r.date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }),
    receita: r.receitaFaturada || 0,
    meta: r.metaDia || 0,
  }));

  return (
    <section className="panel chart-panel">
      <div className="panel-header">
        <h2>Evolução diária: Receita x Meta</h2>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickMargin={8}
              fontSize={11}
            />
            <YAxis
              tickFormatter={formatCurrencyShort}
              fontSize={11}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconSize={10}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="receita"
              name="Receita"
              stroke="#ee731b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="meta"
              name="Meta"
              stroke="#8884d8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
