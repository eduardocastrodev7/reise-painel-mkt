// src/App.jsx
import { useEffect, useState } from 'react';

import { useMarketingDailyData } from './hooks/useMarketingDailyData';

import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DailyDashboard } from './components/dashboard/DailyDashboard';

import './styles/app.css';

function App() {
  const [section, setSection] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

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
    setPeriodo,
  } = useMarketingDailyData();

  // carregar preferências salvas
  useEffect(() => {
    try {
      const theme = localStorage.getItem('reise_theme');
      const presentation =
        localStorage.getItem('reise_presentation');
      if (theme === 'dark') setDarkMode(true);
      if (theme === 'light') setDarkMode(false);
      if (presentation === '1') setPresentationMode(true);
    } catch (e) {
      console.warn(
        'Não foi possível ler preferências salvas',
        e,
      );
    }
  }, []);

  // salvar tema
  useEffect(() => {
    try {
      localStorage.setItem(
        'reise_theme',
        darkMode ? 'dark' : 'light',
      );
    } catch {}
  }, [darkMode]);

  // salvar modo apresentação
  useEffect(() => {
    try {
      localStorage.setItem(
        'reise_presentation',
        presentationMode ? '1' : '0',
      );
    } catch {}
  }, [presentationMode]);

  const toggleMobileMenu = () => {
    if (presentationMode) return;
    setSidebarMobileOpen((prev) => !prev);
  };

  const handleSidebarToggle = () => {
    if (presentationMode) return;

    if (
      typeof window !== 'undefined' &&
      window.innerWidth <= 900
    ) {
      setSidebarMobileOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  const handleChangeSection = (id) => {
    setSection(id);
    setSidebarMobileOpen(false);
  };

  const handleToggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const handleTogglePresentationMode = () => {
    setPresentationMode((prev) => {
      const next = !prev;
      if (next) {
        setSidebarMobileOpen(false);
      }
      return next;
    });
  };

  return (
    <div
      className={
        'app-root ' +
        (darkMode ? 'theme-dark ' : '') +
        (presentationMode ? 'presentation-mode' : '')
      }
    >
      {!presentationMode && (
        <Sidebar
          section={section}
          onChangeSection={handleChangeSection}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={handleSidebarToggle}
          mobileOpen={sidebarMobileOpen}
        />
      )}

      {!presentationMode && sidebarMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      <main
        className={
          'main ' + (sidebarCollapsed ? 'main--wide' : '')
        }
      >
        <Topbar
          onOpenMobileMenu={toggleMobileMenu}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          presentationMode={presentationMode}
          onTogglePresentationMode={
            handleTogglePresentationMode
          }
        />

        {section === 'overview' && (
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
            onChangePeriodo={setPeriodo}
          />
        )}

        {section !== 'overview' && (
          <div className="panel" style={{ marginTop: 16 }}>
            <h2>
              {section === 'crm'
                ? 'Visão de CRM'
                : section === 'social'
                ? 'Visão de Social Media'
                : 'Visão de Performance'}
            </h2>
            <p style={{ fontSize: '0.9rem', marginTop: 6 }}>
              Em breve: aqui vamos plugar os dados específicos
              de {section.toUpperCase()} usando a mesma base da
              plataforma.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
