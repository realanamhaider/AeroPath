import DashboardNav from "../components/DashboardNav";

function Settings() {
  return (
    <main className="dashboard-page">
      <DashboardNav />

      <section className="dashboard-header">
        <p className="card-label">SETTINGS</p>
        <h1>Settings</h1>
        <p>Manage your AeroPath account and preferences.</p>
      </section>
    </main>
  );
}

export default Settings;