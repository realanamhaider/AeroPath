import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import DashboardNav from "../components/DashboardNav";

function Internships() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    const matchesRef = collection(
      db,
      "users",
      user.uid,
      "opportunityMatches"
    );

    const unsubscribe = onSnapshot(
      matchesRef,
      (snapshot) => {
        const matches = snapshot.docs
          .map((matchDoc) => ({
            id: matchDoc.id,
            ...matchDoc.data(),
          }))
          .filter((match) => !match.dismissed)
          .sort(
            (first, second) =>
              (second.matchScore || 0) -
              (first.matchScore || 0)
          );

        setOpportunities(matches);
        setLoading(false);
      },
      (err) => {
        setError(
          err.message || "Could not load your opportunity matches."
        );
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  async function toggleSaved(opportunity) {
    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const opportunityRef = doc(
        db,
        "users",
        user.uid,
        "opportunityMatches",
        opportunity.id
      );

      await updateDoc(opportunityRef, {
        saved: !opportunity.saved,
      });
    } catch (err) {
      setError(err.message || "Could not save this opportunity.");
    }
  }

  async function dismissOpportunity(opportunity) {
    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const opportunityRef = doc(
        db,
        "users",
        user.uid,
        "opportunityMatches",
        opportunity.id
      );

      await updateDoc(opportunityRef, {
        dismissed: true,
      });
    } catch (err) {
      setError(
        err.message || "Could not dismiss this opportunity."
      );
    }
  }

  const today = new Date().toISOString().split("T")[0];

  const strongMatches = opportunities.filter(
    (opportunity) => (opportunity.matchScore || 0) >= 80
  ).length;

  const savedMatches = opportunities.filter(
    (opportunity) => opportunity.saved
  ).length;

  const closingSoon = opportunities.filter((opportunity) => {
    if (!opportunity.deadline) return false;

    const deadline = new Date(
      `${opportunity.deadline}T23:59:59`
    );

    const currentDate = new Date();
    const sevenDaysFromNow = new Date();

    sevenDaysFromNow.setDate(currentDate.getDate() + 7);

    return (
      deadline >= currentDate &&
      deadline <= sevenDaysFromNow
    );
  }).length;

  return (
    <main className="dashboard-page">
      <DashboardNav />

      <section className="dashboard-header">
        <p className="card-label">AI OPPORTUNITY RADAR</p>

        <h1>Opportunities selected for you.</h1>

        <p>
          AeroPath analyzes your profile, skills, projects, and
          goals to surface internships that match your trajectory.
        </p>
      </section>

      <section className="internship-stats">
        <div className="stat-card">
          <p className="card-label">MATCHES</p>
          <h2>{opportunities.length}</h2>
        </div>

        <div className="stat-card">
          <p className="card-label">STRONG MATCHES</p>
          <h2>{strongMatches}</h2>
        </div>

        <div className="stat-card">
          <p className="card-label">CLOSING SOON</p>
          <h2>{closingSoon}</h2>
        </div>

        <div className="stat-card">
          <p className="card-label">SAVED</p>
          <h2>{savedMatches}</h2>
        </div>
      </section>

      <section className="opportunity-radar-card">
        <div>
          <p className="card-label">PERSONALIZED SEARCH</p>
          <h2>Your radar is active.</h2>

          <p>
            Matches automatically update as your profile,
            experience, and projects evolve.
          </p>
        </div>

        <div className="radar-status">
          <span className="radar-pulse" />
          AI matching active
        </div>
      </section>

      <section className="internships-list-section">
        <div>
          <p className="card-label">RECOMMENDED FOR YOU</p>
          <h2>Current matches</h2>
        </div>

        {error && <p className="auth-error">{error}</p>}

        {loading ? (
          <div className="empty-missions">
            <h3>Scanning your opportunity radar...</h3>
            <p>AeroPath is loading your personalized matches.</p>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="empty-missions">
            <h3>Your first scan is being prepared.</h3>

            <p>
              Complete your profile and add your skills and
              projects so AeroPath can generate stronger matches.
            </p>
          </div>
        ) : (
          <div className="internships-grid">
            {opportunities.map((opportunity) => {
              const deadlinePassed =
                opportunity.deadline &&
                opportunity.deadline < today;

              return (
                <article
                  className="internship-card"
                  key={opportunity.id}
                >
                  <div className="internship-card-heading">
                    <div>
                      <p className="card-label">
                        {opportunity.source ||
                          "COMPANY CAREERS"}
                      </p>

                      <h3>{opportunity.title}</h3>

                      <p className="opportunity-company">
                        {opportunity.company}
                      </p>
                    </div>

                    <div className="match-score">
                      <strong>
                        {opportunity.matchScore || 0}%
                      </strong>
                      <span>match</span>
                    </div>
                  </div>

                  <div className="internship-meta">
                    <span>
                      {opportunity.location ||
                        "Location not listed"}
                    </span>

                    <span>
                      {opportunity.workType ||
                        "Work type not listed"}
                    </span>

                    {opportunity.deadline && (
                      <span>
                        Deadline {opportunity.deadline}
                      </span>
                    )}
                  </div>

                  {deadlinePassed && (
                    <span className="overdue-badge">
                      Deadline passed
                    </span>
                  )}

                  {opportunity.matchReason && (
                    <div className="match-reason">
                      <p className="card-label">
                        WHY AEROPATH MATCHED YOU
                      </p>

                      <p>{opportunity.matchReason}</p>
                    </div>
                  )}

                  {opportunity.matchedSkills?.length > 0 && (
                    <div className="opportunity-skills">
                      {opportunity.matchedSkills.map((skill) => (
                        <span key={skill}>{skill}</span>
                      ))}
                    </div>
                  )}

                  <div className="internship-actions">
                    {opportunity.applicationUrl && (
                      <a
                        className="primary-button"
                        href={opportunity.applicationUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Opportunity
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        toggleSaved(opportunity)
                      }
                    >
                      {opportunity.saved
                        ? "Saved"
                        : "Save Match"}
                    </button>

                    <button
                      type="button"
                      className="dismiss-opportunity-button"
                      onClick={() =>
                        dismissOpportunity(opportunity)
                      }
                    >
                      Not Interested
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default Internships;