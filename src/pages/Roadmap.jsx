import DashboardNav from "../components/DashboardNav";

function Roadmap() {
    return (
        <main className="dashboard-page">
            <DashboardNav />

            <section className="dashboard-header">
                <p className="card-label">ROADMAP</p>
                <h1>Your Roadmap</h1>
                <p>Track your progress and plan your next steps.</p>
            </section>
        </main>
    );
}

export default Roadmap;