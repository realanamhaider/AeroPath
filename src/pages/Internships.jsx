import DashboardNav from "../components/DashboardNav";

function Internships() {
  return (
    <main className="dashboard-page">
      <DashboardNav />

      <section className="dashboard-header">
        <p className="card-label">INTERNSHIPS</p>
        <h1>Your Opportunities</h1>
        <p>Track internships and applications in one place.</p>
      </section>
    </main>
  );
}

export default Internships;