// src/components/dashboard/KpiCard.jsx

// Este componente é o MESMO padrão que o painel de Resultados Diários usava.
// Ele também funciona para o CRM, usando as mesmas classes de CSS (.kpi-card, .kpi-title, etc).

export function KpiCard({
  title,
  value,
  subtitle,
  comparison,   // { label: string, variant: 'up' | 'down' | 'neutral' }
  description,  // texto do tooltip "i"
  status,       // opcional: 'good' | 'warn' | 'bad' (muda a cor da barrinha)
}) {
  const classNames = ['kpi-card'];

  if (status === 'good') classNames.push('kpi-card--good');
  if (status === 'warn') classNames.push('kpi-card--warn');
  if (status === 'bad') classNames.push('kpi-card--bad');

  return (
    <article className={classNames.join(' ')}>
      {/* Título + ícone de informação (igual Resultados Diários) */}
      <div className="kpi-header-row">
        <div className="kpi-title">{title}</div>

        {description && (
          <div className="kpi-info">
            <span className="kpi-info-icon">i</span>
            <div className="kpi-info-tooltip">{description}</div>
          </div>
        )}
      </div>

      {/* Valor principal grande */}
      <div className="kpi-value">{value}</div>

      {/* Texto logo abaixo do valor (ex: "Período selecionado") */}
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}

      {/* Badge de comparação (ex: "+ 3,2% vs período anterior") */}
      {comparison && comparison.label && (
        <div className="kpi-comparison-line">
          <span
            className={
              'comparison-badge ' +
              (comparison.variant === 'up'
                ? 'comparison-badge--up'
                : comparison.variant === 'down'
                ? 'comparison-badge--down'
                : 'comparison-badge--neutral')
            }
          >
            {comparison.label}
          </span>
        </div>
      )}
    </article>
  );
}
