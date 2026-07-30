function DemoMissionCard() {
  return (
    <section className="mission-card">
      <p className="card-label">DEMO PROFILE</p>

      <div className="demo-student">
        <div>
          <p className="student-name">Lamine Haider</p>
          <p className="student-details">
            Mechanical Engineering · Sophomore
          </p>
        </div>

        <span className="demo-badge">Preview</span>
      </div>

      <h3>Secure a Summer Engineering Internship</h3>

      <div className="progress-row">
        <span>Mission Readiness</span>
        <span>68%</span>
      </div>

      <div className="progress-bar">
        <div className="progress-fill"></div>
      </div>

      <div className="flight-plan">
        <p>Today’s Flight Plan</p>

        <ul>
          <li>✓ Submit calculus assignment</li>
          <li>□ Finish résumé revision</li>
          <li>□ Continue portfolio project</li>
        </ul>
      </div>
    </section>
  );
}

export default DemoMissionCard;