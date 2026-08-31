import {
  useState,
} from "react";

import DashboardNav from "../components/DashboardNav";

function Discover() {
  const [
    activeType,
    setActiveType,
  ] = useState(
    "internships"
  );

  return (
    <main className="dashboard-page">
      <DashboardNav />

      <section className="dashboard-header">
        <p className="card-label">
          OPPORTUNITY RADAR
        </p>

        <h1>
          Discover opportunities.
        </h1>

        <p>
          Find internships and
          scholarships matched to
          your AeroPath profile.
        </p>
      </section>

      <section className="discover-page">
        <div className="discover-tabs">
          <button
            type="button"
            className={
              activeType ===
              "internships"
                ? "discover-tab active"
                : "discover-tab"
            }
            onClick={() =>
              setActiveType(
                "internships"
              )
            }
          >
            Internships
          </button>

          <button
            type="button"
            className={
              activeType ===
              "scholarships"
                ? "discover-tab active"
                : "discover-tab"
            }
            onClick={() =>
              setActiveType(
                "scholarships"
              )
            }
          >
            Scholarships
          </button>
        </div>

        <div className="discover-placeholder">
          <p className="card-label">
            {activeType ===
            "internships"
              ? "INTERNSHIP MATCHES"
              : "SCHOLARSHIP MATCHES"}
          </p>

          <h2>
            Opportunity engine
            loading next.
          </h2>

          <p>
            AeroPath will use your
            approved profile to
            surface opportunities,
            evaluate eligibility,
            and explain each match.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Discover;