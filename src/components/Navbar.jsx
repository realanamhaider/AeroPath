function Navbar() {
  return (
    <nav className="navbar">
      <div className="brand">
  <img
  src="/favicon.png"
  alt="AeroPath logo"
  className="navbar-logo"
/>
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