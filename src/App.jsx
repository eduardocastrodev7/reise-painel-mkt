// src/App.jsx
import { useEffect, useState } from 'react';
import './styles/app.css';

import { DailyDashboard } from './components/dashboard/DailyDashboard';
import { CrmDashboard } from './components/dashboard/CrmDashboard';
import { useMarketingDailyData } from './hooks/useMarketingDailyData';

/** Ícones SVG simples (stroke = currentColor) */
const IconDaily = () => (
  <svg
    className="sidebar-icon-svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <polyline
      points="4 17 9 11 13 14 20 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 20h16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const IconCrm = () => (
  <svg
    className="sidebar-icon-svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <rect
      x="3.2"
      y="5"
      width="17.6"
      height="14"
      rx="2"
      ry="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <polyline
      points="4 7 12 12.5 20 7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconSocial = () => (
  <svg
    className="sidebar-icon-svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      d="M5 5.5h14c1.1 0 2 .9 2 2v6.5c0 1.1-.9 2-2 2H11l-4 3v-3H5c-1.1 0-2-.9-2-2v-6.5c0-1.1.9-2 2-2Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="9"
      cy="10"
      r="0.9"
      fill="currentColor"
    />
    <circle
      cx="12"
      cy="10"
      r="0.9"
      fill="currentColor"
    />
    <circle
      cx="15"
      cy="10"
      r="0.9"
      fill="currentColor"
    />
  </svg>
);

const IconPerformance = () => (
  <svg
    className="sidebar-icon-svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <polyline
      points="4 18 10 11 14 14 20 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="14 6 20 6 20 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function App() {
  const [activeView, setActiveView] = useState('daily'); // 'daily' | 'crm' | 'social' | 'performance'
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

// Hook do dashboard diário de marketing
const {
  loading,
  erro,
  rowsFiltradas,
  metrics,
  prevMetrics,
  minDate,
  maxDate,
  startDate,
  endDate,
  setPeriodo, // <- vem do hook
} = useMarketingDailyData();

// Adiciona logo abaixo:
const handleChangePeriodo = ({ startDate, start, endDate, end }) => {
  const inicio = startDate || start;
  const fim = endDate || end || inicio;

  if (!inicio || !fim) return;
  setPeriodo(inicio, fim);
};

  // tema salvo no localStorage
  useEffect(() => {
    const stored = window.localStorage.getItem('reise-theme');
    if (stored === 'dark') {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      'reise-theme',
      isDarkMode ? 'dark' : 'light',
    );
  }, [isDarkMode]);

  // título da guia
  useEffect(() => {
    document.title = 'Reise | Painel Marketing';
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleTogglePresentation = () => {
    setIsPresentationMode((prev) => !prev);
  };

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const handleMobileMenuToggle = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const themeClass = isDarkMode ? 'theme-dark' : '';
  const presentationClass = isPresentationMode ? 'presentation-mode' : '';
  const showSidebar = !isPresentationMode;

const renderActiveView = () => {
  if (activeView === 'daily') {
    return (
      <DailyDashboard
        loading={loading}
        erro={erro}
        rowsFiltradas={rowsFiltradas}
        metrics={metrics}
        prevMetrics={prevMetrics}
        minDate={minDate}
        maxDate={maxDate}
        startDate={startDate}
        endDate={endDate}
        onChangePeriodo={handleChangePeriodo} // <- agora usa a função nova
        presentationMode={isPresentationMode}
      />
    );
  }

  if (activeView === 'crm') {
    return <CrmDashboard presentationMode={isPresentationMode} />;
  }

  if (activeView === 'social') {
    return (
      <div className="panel">
        <h2>Social Media</h2>
        <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
          Visão de Social ainda em construção.
        </p>
      </div>
    );
  }

  if (activeView === 'performance') {
    return (
      <div className="panel">
        <h2>Performance</h2>
        <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
          Visão de Performance ainda em construção.
        </p>
      </div>
    );
  }

  return null;
};


  // ===== JSX PRINCIPAL =====
  return (
    <div className={`app-root ${themeClass} ${presentationClass}`}>
      {/* Overlay do sidebar no mobile */}
      {showSidebar && isMobileSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      {showSidebar && (
        <aside
          className={
            'sidebar' +
            (isSidebarCollapsed ? ' sidebar--collapsed' : '') +
            (isMobileSidebarOpen ? ' sidebar--mobile-open' : '')
          }
        >
          <div className="sidebar-header">
            <div className="sidebar-logo-mark">
              <img
                src="/logo-reise.png"
                alt="Reise"
                className="sidebar-logo-image"
              />
            </div>

            {!isSidebarCollapsed && (
              <div className="sidebar-logo-text">
                <span className="logo-title">Reise</span>
                <span className="logo-subtitle">Painel Marketing</span>
              </div>
            )}

            {/* Botão de colapsar sidebar (desktop) */}
            <button
              type="button"
              className="sidebar-toggle"
              onClick={handleSidebarToggle}
            >
              <span className="sidebar-toggle-line" />
              <span className="sidebar-toggle-line" />
            </button>
          </div>

          <nav className="sidebar-nav">

            {/* Resultados Diários */}
            <button
              type="button"
              className={
                'sidebar-item' +
                (activeView === 'daily' ? ' active' : '')
              }
              onClick={() => {
                setActiveView('daily');
                setIsMobileSidebarOpen(false);
              }}
            >
              <div className="sidebar-item-left">
                <div className="sidebar-icon-wrap">
                  <IconDaily />
                </div>
                {!isSidebarCollapsed && <span>Resultados Diários</span>}
              </div>
            </button>

            {/* CRM */}
            <button
              type="button"
              className={
                'sidebar-item' + (activeView === 'crm' ? ' active' : '')
              }
              onClick={() => {
                setActiveView('crm');
                setIsMobileSidebarOpen(false);
              }}
            >
              <div className="sidebar-item-left">
                <div className="sidebar-icon-wrap">
                  <IconCrm />
                </div>
                {!isSidebarCollapsed && <span>CRM</span>}
              </div>
            </button>

            {/* Social Media (placeholder) */}
            <button
              type="button"
              className={
                'sidebar-item' +
                (activeView === 'social' ? ' active' : '') +
                ' disabled'
              }
              onClick={() => {}}
            >
              <div className="sidebar-item-left">
                <div className="sidebar-icon-wrap">
                  <IconSocial />
                </div>
                {!isSidebarCollapsed && <span>Social Media</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className="soon-pill">Em breve</span>
              )}
            </button>

            {/* Performance (placeholder) */}
            <button
              type="button"
              className={
                'sidebar-item' +
                (activeView === 'performance' ? ' active' : '') +
                ' disabled'
              }
              onClick={() => {}}
            >
              <div className="sidebar-item-left">
                <div className="sidebar-icon-wrap">
                  <IconPerformance />
                </div>
                {!isSidebarCollapsed && <span>Performance</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className="soon-pill">Em breve</span>
              )}
            </button>
          </nav>
        </aside>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            {/* Botão de menu (mobile) */}
            {showSidebar && (
              <button
                type="button"
                className="topbar-menu-btn"
                onClick={handleMobileMenuToggle}
              >
                <span />
                <span />
              </button>
            )}

            <div>
              <div className="topbar-subtitle">Painel Marketing</div>
              <h1 className="topbar-title">
                {activeView === 'daily' && 'Resultados Diários'}
                {activeView === 'crm' && 'Resultados CRM'}
                {activeView === 'social' && 'Social Media'}
                {activeView === 'performance' && 'Performance'}
              </h1>
            </div>
          </div>

          <div className="topbar-right">
            {/* Modo apresentação */}
            <button
              type="button"
              className={
                'mode-chip' +
                (isPresentationMode ? ' mode-chip--active' : '')
              }
              onClick={handleTogglePresentation}
            >
              <span className="mode-chip-icon">🖥️</span>
              <span className="mode-chip-label">Modo apresentação</span>
              <span className="mode-chip-dot" />
            </button>

            {/* Tema claro/escuro */}
            <button
              type="button"
              className={
                'mode-chip mode-chip--icon' +
                (isDarkMode ? ' mode-chip--active' : '')
              }
              onClick={handleToggleTheme}
            >
              <span className="mode-chip-icon">
                {isDarkMode ? '🌙' : '☀️'}
              </span>
              <span className="mode-chip-label">
                {isDarkMode ? 'Escuro' : 'Claro'}
              </span>
              <span className="mode-chip-dot" />
            </button>
          </div>
        </header>

        {/* VIEW ATIVA */}
        {renderActiveView()}
      </main>
    </div>
  );
}

export default App;
