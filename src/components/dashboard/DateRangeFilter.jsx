// src/components/dashboard/DateRangeFilter.jsx
import { useMemo } from 'react';

// formata Date -> yyyy-mm-dd pro input[type=date]
function toInputValue(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clampDate(date, minDate, maxDate) {
  if (!date) return null;
  let d = date;
  if (minDate && d < minDate) d = minDate;
  if (maxDate && d > maxDate) d = maxDate;
  return d;
}

function datesEqual(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DateRangeFilter({
  minDate,
  maxDate,
  startDate,
  endDate,
  onChange,
}) {
  const effectiveMax = maxDate || new Date();

  // identificar preset ativo (se houver)
  const activePreset = useMemo(() => {
    if (!startDate || !endDate || !maxDate) return null;

    // mês atual
    const firstOfMonth = new Date(
      effectiveMax.getFullYear(),
      effectiveMax.getMonth(),
      1,
    );
    const cmStart = clampDate(firstOfMonth, minDate, maxDate);
    const cmEnd = maxDate;
    if (datesEqual(startDate, cmStart) && datesEqual(endDate, cmEnd)) {
      return 'current-month';
    }

    // últimos 7 dias
    const last7End = maxDate;
    const last7Start = clampDate(
      new Date(
        last7End.getFullYear(),
        last7End.getMonth(),
        last7End.getDate() - 6,
      ),
      minDate,
      maxDate,
    );
    if (datesEqual(startDate, last7Start) && datesEqual(endDate, last7End)) {
      return 'last-7';
    }

    // últimos 30 dias
    const last30End = maxDate;
    const last30Start = clampDate(
      new Date(
        last30End.getFullYear(),
        last30End.getMonth(),
        last30End.getDate() - 29,
      ),
      minDate,
      maxDate,
    );
    if (
      datesEqual(startDate, last30Start) &&
      datesEqual(endDate, last30End)
    ) {
      return 'last-30';
    }

    return null;
  }, [startDate, endDate, minDate, maxDate, effectiveMax]);

  const applyPreset = (presetId) => {
    if (!maxDate) return;

    if (presetId === 'current-month') {
      const firstOfMonth = new Date(
        effectiveMax.getFullYear(),
        effectiveMax.getMonth(),
        1,
      );
      const start = clampDate(firstOfMonth, minDate, maxDate);
      const end = maxDate;
      if (start && end) onChange(start, end);
      return;
    }

    if (presetId === 'last-7') {
      const end = maxDate;
      const start = clampDate(
        new Date(
          end.getFullYear(),
          end.getMonth(),
          end.getDate() - 6,
        ),
        minDate,
        maxDate,
      );
      if (start && end) onChange(start, end);
      return;
    }

    if (presetId === 'last-30') {
      const end = maxDate;
      const start = clampDate(
        new Date(
          end.getFullYear(),
          end.getMonth(),
          end.getDate() - 29,
        ),
        minDate,
        maxDate,
      );
      if (start && end) onChange(start, end);
      return;
    }
  };

  const handleStartChange = (e) => {
    const value = e.target.value;
    if (!value) {
      onChange(null, endDate);
      return;
    }
    const d = new Date(`${value}T00:00:00`);
    const clamped = clampDate(d, minDate, maxDate);
    onChange(clamped, endDate);
  };

  const handleEndChange = (e) => {
    const value = e.target.value;
    if (!value) {
      onChange(startDate, null);
      return;
    }
    const d = new Date(`${value}T00:00:00`);
    const clamped = clampDate(d, minDate, maxDate);
    onChange(startDate, clamped);
  };

  return (
    <section className="panel filters-panel">
      <div className="filters-left">
        <div className="filters-label">Período</div>
        <p className="filters-description">
          Selecione o intervalo de datas para analisar os resultados
          diários de marketing.
        </p>
        <div className="period-pills">
          <button
            type="button"
            className={
              'period-pill' +
              (activePreset === 'current-month' ? ' period-pill--active' : '')
            }
            onClick={() => applyPreset('current-month')}
          >
            Mês atual
          </button>
          <button
            type="button"
            className={
              'period-pill' +
              (activePreset === 'last-7' ? ' period-pill--active' : '')
            }
            onClick={() => applyPreset('last-7')}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            className={
              'period-pill' +
              (activePreset === 'last-30' ? ' period-pill--active' : '')
            }
            onClick={() => applyPreset('last-30')}
          >
            Últimos 30 dias
          </button>
        </div>
      </div>

      <div className="filters-right">
        <div className="filters-input-group">
          <div className="filters-input">
            <span className="filters-input-label">Início</span>
            <input
              type="date"
              value={toInputValue(startDate)}
              min={toInputValue(minDate)}
              max={toInputValue(maxDate)}
              onChange={handleStartChange}
            />
          </div>
          <div className="filters-input">
            <span className="filters-input-label">Fim</span>
            <input
              type="date"
              value={toInputValue(endDate)}
              min={toInputValue(minDate)}
              max={toInputValue(maxDate)}
              onChange={handleEndChange}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
