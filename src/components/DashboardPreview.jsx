function DashboardPreview() {
  return (
    <section className="dashboard-preview">
      <div className="preview-header">
        <p>MISSION CONTROL</p>
        <span>Demo Profile</span>
      </div>

      <h3> Lamine’s Current Trajectory</h3>

      <div className="task-list">
        <div className="task complete">
          <span>Submit calculus assignment</span>
          <small>Complete</small>
        </div>

        <div className="task">
          <span>Finish résumé revision</span>
          <small>Due Friday</small>
        </div>

        <div className="task">
          <span>Continue portfolio project</span>
          <small>65%</small>
        </div>

        <div className="task">
          <span>Prepare for career fair</span>
          <small>Aug 18</small>
        </div>
      </div>

      <div className="opportunity-unlocked">
        <p className="card-label">NEW OPPORTUNITY UNLOCKED</p>

        <h4>Manufacturing Engineering Internship</h4>

        <p>
          Alex now meets the recommended GPA, project, and résumé requirements.
        </p>
      </div>
    </section>
  );
}

export default DashboardPreview;