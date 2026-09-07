import "./BottomNav.css";

function BottomNav({
  activePage,
  onHome,
  onDiscovery,
  onMatches,
  onProfile,
}) {
  return (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav-item ${
          activePage === "home" ? "active" : ""
        }`}
        onClick={onHome}
      >
        <span className="bottom-nav-icon">🏠</span>
        <span>Домой</span>
      </button>

      <button
        className={`bottom-nav-item ${
          activePage === "discovery" ? "active" : ""
        }`}
        onClick={onDiscovery}
      >
        <span className="bottom-nav-icon">🔥</span>
        <span>Знакомства</span>
      </button>

      <button
        className={`bottom-nav-item ${
          activePage === "matches" ? "active" : ""
        }`}
        onClick={onMatches}
      >
        <span className="bottom-nav-icon">💕</span>
        <span>Мэтчи</span>
      </button>

      <button
        className={`bottom-nav-item ${
          activePage === "profile" ? "active" : ""
        }`}
        onClick={onProfile}
      >
        <span className="bottom-nav-icon">👤</span>
        <span>Профиль</span>
      </button>
    </nav>
  );
}

export default BottomNav;
