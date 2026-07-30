import DashboardNav from "../components/DashboardNav";

function Projects() {
  return (
    <main className="dashboard-page">
      <DashboardNav />

      <section className="dashboard-header">
        <p className="card-label">PROJECTS</p>
        <h1>Your Engineering Projects</h1>
        <p>Manage all of your personal, engineering, and programming projects.</p>
      </section>
    </main>
  );
}

export default Projects;