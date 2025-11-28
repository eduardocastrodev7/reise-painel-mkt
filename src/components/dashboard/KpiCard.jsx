// src/components/dashboard/KpiCard.jsx

export function KpiCard({ title, value, subtitle, comparison, description }) {
  return (
    <article className="kpi-card">
      <div className="kpi-header-row">
        <div className="kpi-title">{title}</div>
        {description && (
          <div className="kpi-info">
            <span className="kpi-info-icon">i</span>
            <div className="kpi-info-tooltip">{description}</div>
          </div>
        )}
      </div>

      <div className="kpi-value">{value}</div>

      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}

      {comparison && (
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
