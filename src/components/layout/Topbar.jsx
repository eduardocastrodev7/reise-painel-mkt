// src/components/layout/Topbar.jsx

export function Topbar({ onOpenMobileMenu }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div>
          <div className="topbar-subtitle">Marketing Analytics</div>
          <h1 className="topbar-title">Dashboard diário</h1>
        </div>
      </div>

      <div className="topbar-right">
        <div className="user-pill">
          <span className="user-avatar">MKT</span>
          <span className="user-name">Time de Marketing</span>
        </div>
      </div>
    </header>
  );
}
