// src/components/layout/Sidebar.jsx

function ItemIcon({ id }) {
  const size = 18;
  const stroke = 'currentColor';

  if (id === 'overview') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="10" width="4" height="11" rx="1.5" stroke={stroke} fill="none" strokeWidth="1.5" />
        <rect x="10" y="5" width="4" height="16" rx="1.5" stroke={stroke} fill="none" strokeWidth="1.5" />
        <rect x="17" y="2" width="4" height="19" rx="1.5" stroke={stroke} fill="none" strokeWidth="1.5" />
      </svg>
    );
  }

  if (id === 'crm') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.5" stroke={stroke} fill="none" strokeWidth="1.5" />
        <path
          d="M5 19.5C6.2 16.5 8.8 15 12 15s5.8 1.5 7 4.5"
          stroke={stroke}
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (id === 'social') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M6 10c1.4 0 2.5-1.1 2.5-2.5S7.4 5 6 5 3.5 6.1 3.5 7.5 4.6 10 6 10Zm12 0c1.4 0 2.5-1.1 2.5-2.5S19.4 5 18 5s-2.5 1.1-2.5 2.5S16.6 10 18 10Zm-6 9c1.4 0 2.5-1.1 2.5-2.5S13.4 14 12 14s-2.5 1.1-2.5 2.5S10.6 19 12 19Z"
          stroke={stroke}
          fill="none"
          strokeWidth="1.5"
        />
        <path
          d="M7.8 9.2 10 13m6.2-3.8L14 13m-2 1 0-1"
          stroke={stroke}
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // performance
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 19.5 9.5 9l4 6L20 4.5"
        stroke={stroke}
        fill="none"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 4.5h4v4"
        stroke={stroke}
        fill="none"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sidebar({
  section,
  onChangeSection,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
}) {
  const items = [
    { id: 'overview', label: 'Resultados diários' },
    { id: 'crm', label: 'CRM', disabled: true },
    { id: 'social', label: 'Social Media', disabled: true },
    { id: 'performance', label: 'Performance', disabled: true },
  ];

  const handleClickItem = (itemId, disabled) => {
    if (disabled) return;
    onChangeSection(itemId);
  };

  return (
    <aside
      className={
        'sidebar ' +
        (collapsed ? 'sidebar--collapsed ' : '') +
        (mobileOpen ? 'sidebar--mobile-open' : '')
      }
    >
      <div className="sidebar-header">
        <div className="sidebar-logo-mark">
          {/* Coloque sua logo em public/logo-reise.svg */}
          <img
            src="/logo-reise.png"
            alt="Reise"
            className="sidebar-logo-image"
          />
        </div>

        {!collapsed && (
          <div className="sidebar-logo-text">
            <span className="logo-title">Reise Data</span>
            <span className="logo-subtitle">Marketing Dashboard</span>
          </div>
        )}

        {/* botão de recolher sidebar (desktop) */}
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggleCollapsed}
          aria-label="Recolher/expandir menu"
        >
          <span className="sidebar-toggle-line" />
          <span className="sidebar-toggle-line" />
          <span className="sidebar-toggle-line" />
        </button>
      </div>

      <nav className="sidebar-nav">
        {!collapsed && <div className="sidebar-nav-label">Visões</div>}
        {items.map((item) => (
          <button
            key={item.id}
            className={
              'sidebar-item' +
              (section === item.id ? ' active' : '') +
              (item.disabled ? ' disabled' : '')
            }
            onClick={() => handleClickItem(item.id, item.disabled)}
          >
            <span className="sidebar-item-left">
              <span className="sidebar-icon-wrap">
                <ItemIcon id={item.id} />
              </span>
              {!collapsed && <span>{item.label}</span>}
            </span>
            {!collapsed && item.disabled && (
              <span className="soon-pill">em breve</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
