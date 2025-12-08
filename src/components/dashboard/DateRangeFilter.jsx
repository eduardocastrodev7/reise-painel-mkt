// src/components/dashboard/DateRangeFilter.jsx

function toInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // YYYY-MM-DD
}

export function DateRangeFilter({
  minDate,
  maxDate,
  startDate,
  endDate,
  onChange,
}) {
  const minStr = minDate ? toInputValue(minDate) : undefined;
  const maxStr = maxDate ? toInputValue(maxDate) : undefined;

  const emitChange = (nextStart, nextEnd) => {
    if (!onChange) return;

    // Envia nos dois formatos pra ser compatível com todos os dashboards
    onChange({
      startDate: nextStart,
      endDate: nextEnd,
      start: nextStart,
      end: nextEnd,
    });
  };

  const handleStartChange = (e) => {
    const value = e.target.value;
    const date = value ? new Date(`${value}T00:00:00`) : null;

    let nextStart = date;
    let nextEnd = endDate || date; // se não tiver fim ainda, assume 1 dia

    if (!nextStart && nextEnd) nextStart = nextEnd;
    if (nextStart && !nextEnd) nextEnd = nextStart;

    emitChange(nextStart, nextEnd);
  };

  const handleEndChange = (e) => {
    const value = e.target.value;
    const date = value ? new Date(`${value}T00:00:00`) : null;

    let nextStart = startDate || date; // se não tiver início, assume 1 dia
    let nextEnd = date;

    if (!nextStart && nextEnd) nextStart = nextEnd;
    if (nextStart && !nextEnd) nextEnd = nextStart;

    emitChange(nextStart, nextEnd);
  };

  return (
    <section className="panel filters-panel">
      <div className="filters-left">
        <span className="filters-label">Período</span>
        <p className="filters-description">
          Selecione o intervalo de datas para análise. Para ver apenas 1 dia,
          escolha a mesma data em Início e Fim.
        </p>
      </div>

      <div className="filters-right">
        <div className="filters-input-group">
          <div className="filters-input">
            <span className="filters-input-label">Início</span>
            <input
              type="date"
              min={minStr}
              max={maxStr}
              value={startDate ? toInputValue(startDate) : ''}
              onChange={handleStartChange}
            />
          </div>

          <div className="filters-input">
            <span className="filters-input-label">Fim</span>
            <input
              type="date"
              min={minStr}
              max={maxStr}
              value={endDate ? toInputValue(endDate) : ''}
              onChange={handleEndChange}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
