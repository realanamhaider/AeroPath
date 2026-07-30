function Navbar() {
  return (
    <nav className="navbar">
      <div className="brand">
  <img src="/aeropath-logo.png" alt="AeroPath logo" />
  <span>AeroPath</span>
</div>

      <div className="nav-links">
        <a>Flight Deck</a>
        <a>Projects</a>
        <a>Internships</a>
        <a>Roadmap</a>
      </div>
    </nav>
  );
}

export default Navbar;