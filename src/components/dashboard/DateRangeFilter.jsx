// src/components/dashboard/DateRangeFilter.jsx
import {
  toInputDateValue,
  fromInputDateValue,
} from '../../lib/parsers';

export function DateRangeFilter({
  minDate,
  maxDate,
  startDate,
  endDate,
  onChange,
}) {
  const handleStartChange = (e) => {
    onChange(fromInputDateValue(e.target.value), endDate);
  };

  const handleEndChange = (e) => {
    onChange(startDate, fromInputDateValue(e.target.value));
  };

  return (
    <section className="panel filters-panel">
      <div className="filters-left">
        <div className="filters-label">Período</div>
        <p className="filters-description">
          Ajuste o intervalo de datas para analisar o desempenho diário.
        </p>
      </div>

      <div className="filters-right">
        <div className="filters-input-group">
          <div className="filters-input">
            <span className="filters-input-label">De</span>
            <input
              type="date"
              value={toInputDateValue(startDate)}
              min={minDate ? toInputDateValue(minDate) : undefined}
              max={maxDate ? toInputDateValue(maxDate) : undefined}
              onChange={handleStartChange}
            />
          </div>
          <div className="filters-input">
            <span className="filters-input-label">Até</span>
            <input
              type="date"
              value={toInputDateValue(endDate)}
              min={minDate ? toInputDateValue(minDate) : undefined}
              max={maxDate ? toInputDateValue(maxDate) : undefined}
              onChange={handleEndChange}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
