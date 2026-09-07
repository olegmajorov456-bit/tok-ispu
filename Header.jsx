import "./Header.css";

function Header({ onHome, onSupport }) {
  return (
    <header className="app-header">
      <button
        className="app-header-logo"
        onClick={onHome}
        aria-label="ТОК — главная"
      >
        <img
          src="/tok-logo.png"
          alt="ТОК — Знакомства в ИГЭУ"
        />
      </button>

      <div className="app-header-actions">
        <button
          className="header-action support"
          onClick={onSupport}
          title="Техническая поддержка"
          aria-label="Техническая поддержка"
        >
          <span className="header-action-icon">
            💬
          </span>

          <span className="header-action-text">
            Поддержка
          </span>
        </button>

        <button
          className="header-action creator"
          onClick={() =>
            window.open(
              "https://tbank.ru/cf/AWf42bsf9Ry",
              "_blank",
              "noopener,noreferrer"
            )
          }
          title="Поддержать создателя"
          aria-label="Поддержать создателя"
        >
          <span className="header-action-icon">
            ❤️
          </span>

          <span className="header-action-text">
            Поддержать
          </span>
        </button>
      </div>
    </header>
  );
}

export default Header;