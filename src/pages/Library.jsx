import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import DashboardNav from "../components/DashboardNav";

function formatShortDate(dateString) {
  const [year, month, day] = dateString.split("-");

  return `${month}/${day}/${year.slice(-2)}`;
}

function formatLongDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}

function Library() {
  const [missions, setMissions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const [missionsLoaded, setMissionsLoaded] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) return;

    const missionsQuery = query(
      collection(db, "users", user.uid, "missions"),
      orderBy("createdAt", "desc")
    );

    const projectsQuery = query(
      collection(db, "users", user.uid, "projects"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeMissions = onSnapshot(
      missionsQuery,
      (snapshot) => {
        const missionList = snapshot.docs.map((missionDoc) => ({
          id: missionDoc.id,
          type: "Assignment",
          libraryDate: missionDoc.data().dueDate,
          ...missionDoc.data(),
        }));

        setMissions(missionList);
        setMissionsLoaded(true);
      },
      (err) => {
        setError(err.message || "Could not load assignments.");
        setMissionsLoaded(true);
      }
    );

    const unsubscribeProjects = onSnapshot(
      projectsQuery,
      (snapshot) => {
        const projectList = snapshot.docs.map((projectDoc) => ({
          id: projectDoc.id,
          type: "Project",
          libraryDate: projectDoc.data().deadline,
          ...projectDoc.data(),
        }));

        setProjects(projectList);
        setProjectsLoaded(true);
      },
      (err) => {
        setError(err.message || "Could not load projects.");
        setProjectsLoaded(true);
      }
    );

    return () => {
      unsubscribeMissions();
      unsubscribeProjects();
    };
  }, []);

  const loading = !missionsLoaded || !projectsLoaded;

  const allWork = [...missions, ...projects].filter(
    (item) => item.libraryDate
  );

  const workByDate = allWork.reduce((groups, item) => {
    const date = item.libraryDate;

    if (!groups[date]) {
      groups[date] = [];
    }

    groups[date].push(item);

    return groups;
  }, {});

  const sortedDates = Object.keys(workByDate).sort((a, b) =>
    b.localeCompare(a)
  );

  const selectedItems = selectedDate
    ? workByDate[selectedDate] || []
    : [];

  const today = new Date().toISOString().split("T")[0];

  function getStatus(item) {
    if (item.completed) return "Completed";
    if (item.libraryDate < today) return "Past due";

    return "Active";
  }

  return (
    <main className="dashboard-page">
      <DashboardNav />

      <section className="dashboard-header">
        <p className="card-label">WORK LIBRARY</p>
        <h1>Your work, organized by date.</h1>
        <p>
          Select a date to revisit every project and assignment
          connected to it.
        </p>
      </section>

      <section className="date-library-container">
        {error && <p className="auth-error">{error}</p>}

        {loading ? (
          <p>Loading your library...</p>
        ) : sortedDates.length === 0 ? (
          <div className="empty-missions">
            <h3>Your library is empty.</h3>
            <p>Projects and assignments will appear here by date.</p>
          </div>
        ) : selectedDate ? (
          <div className="selected-date-view">
            <button
              type="button"
              className="library-back-button"
              onClick={() => setSelectedDate(null)}
            >
              ← All dates
            </button>

            <div className="selected-date-heading">
              <p className="card-label">DATE ARCHIVE</p>
              <h2>{formatLongDate(selectedDate)}</h2>
              <p>
                {selectedItems.length}{" "}
                {selectedItems.length === 1 ? "item" : "items"}
              </p>
            </div>

            <div className="date-items-list">
              {selectedItems.map((item) => {
                const status = getStatus(item);

                return (
                  <article
                    className="date-library-item"
                    key={`${item.type}-${item.id}`}
                  >
                    <div>
                      <div className="date-item-labels">
                        <span>{item.type}</span>
                        <span>{item.category || "General"}</span>
                      </div>

                      <h3>{item.title}</h3>

                      {item.description && (
                        <p>{item.description}</p>
                      )}
                    </div>

                    <span
                      className={`library-status ${status
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      {status}
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="date-library-grid">
            {sortedDates.map((date) => (
              <button
                type="button"
                className="date-library-card"
                key={date}
                onClick={() => setSelectedDate(date)}
              >
                <span className="date-card-label">ARCHIVE DATE</span>

                <strong>{formatShortDate(date)}</strong>

                <span>
                  {workByDate[date].length}{" "}
                  {workByDate[date].length === 1 ? "item" : "items"}
                </span>

                <span className="date-card-arrow">→</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Library;