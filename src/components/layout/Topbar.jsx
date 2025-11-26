// src/components/layout/Topbar.jsx

export function Topbar({ onOpenMobileMenu }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Botão hambúrguer (aparece só no mobile via CSS) */}
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
          {/* Dashboard diário -> Resultados Diários */}
          <h1 className="topbar-title">Resultados Diários</h1>
        </div>
      </div>

      {/* Removemos o "Time de Marketing" e o chip de usuário */}
      {/* Se quiser algo no canto direito depois (ex: filtro global / perfil), colocamos aqui */}
      <div className="topbar-right" />
    </header>
  );
}
