import DashboardNav from "../components/DashboardNav";

function Profile() {
  return (
    <main className="dashboard-page">
      <DashboardNav />

      <section className="dashboard-header">
        <p className="card-label">PROFILE</p>
        <h1>Your Profile</h1>
        <p>Manage your personal and academic information.</p>
      </section>
    </main>
  );
}

export default Profile;