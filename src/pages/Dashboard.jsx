import UserMissionCard from "../components/UserMissionCard";

import {
  buildNotifications,
} from "../services/notificationEngine";

import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebase";

import {
  Navigate,
  useNavigate,
} from "react-router";

import DashboardNav from "../components/DashboardNav";

function Dashboard() {
  const [
  notificationsOpen,
  setNotificationsOpen,
] = useState(false);

  const [profile, setProfile] =
    useState(null);

  const [missions, setMissions] =
    useState([]);

  const [projects, setProjects] =
    useState([]);

  const [
    opportunities,
    setOpportunities,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    activeFilter,
    setActiveFilter,
  ] = useState("today");

  const navigate =
    useNavigate();

  /* ======================================================
     LOAD PROFILE
  ====================================================== */

  useEffect(() => {
    async function loadProfile() {
      try {
        const user =
          auth.currentUser;

        if (!user) {
          setLoading(false);
          return;
        }

        const profileSnapshot =
          await getDoc(
            doc(
              db,
              "users",
              user.uid
            )
          );

        if (
          !profileSnapshot.exists()
        ) {
          setError(
            "Your AeroPath profile could not be found."
          );

          return;
        }

        setProfile(
          profileSnapshot.data()
        );
      } catch (err) {
        setError(
          err.message ||
            "Could not load your AeroPath profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  /* ======================================================
     LIVE MISSIONS
  ====================================================== */

  useEffect(() => {
    const user =
      auth.currentUser;

    if (!user) {
      return undefined;
    }

    const missionsQuery =
      query(
        collection(
          db,
          "users",
          user.uid,
          "missions"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const unsubscribe =
      onSnapshot(
        missionsQuery,
        (snapshot) => {
          const missionList =
            snapshot.docs.map(
              (missionDoc) => ({
                id:
                  missionDoc.id,

                ...missionDoc.data(),
              })
            );

          setMissions(
            missionList
          );
        },
        (err) => {
          console.error(
            "Mission listener failed:",
            err
          );

          setError(
            err.message ||
              "Could not load your missions."
          );
        }
      );

    return unsubscribe;
  }, []);

  /* ======================================================
     LIVE PROJECTS
  ====================================================== */

  useEffect(() => {
    const user =
      auth.currentUser;

    if (!user) {
      return undefined;
    }

    const unsubscribe =
      onSnapshot(
        collection(
          db,
          "users",
          user.uid,
          "projects"
        ),
        (snapshot) => {
          const projectList =
            snapshot.docs.map(
              (projectDoc) => ({
                id:
                  projectDoc.id,

                ...projectDoc.data(),
              })
            );

          setProjects(
            projectList
          );
        },
        (err) => {
          console.error(
            "Project listener failed:",
            err
          );
        }
      );

    return unsubscribe;
  }, []);

  /* ======================================================
     LIVE OPPORTUNITY MATCHES
  ====================================================== */

  useEffect(() => {
    const user =
      auth.currentUser;

    if (!user) {
      return undefined;
    }

    const unsubscribe =
      onSnapshot(
        collection(
          db,
          "users",
          user.uid,
          "opportunityMatches"
        ),
        (snapshot) => {
          const opportunityList =
            snapshot.docs.map(
              (
                opportunityDoc
              ) => ({
                id:
                  opportunityDoc.id,

                ...opportunityDoc.data(),
              })
            );

          setOpportunities(
            opportunityList
          );
        },
        (err) => {
          console.error(
            "Opportunity listener failed:",
            err
          );
        }
      );

    return unsubscribe;
  }, []);

  /* ======================================================
     GENERAL VALUES
  ====================================================== */

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  const careerGoal =
    profile?.career
      ?.dreamCareer ||
    profile?.dreamCareer ||
    "Not provided";

  /* ======================================================
     MISSION FILTERING
  ====================================================== */

  const filteredMissions =
    missions.filter(
      (mission) => {
        if (
          activeFilter ===
          "completed"
        ) {
          return (
            mission.completed ===
            true
          );
        }

        if (
          activeFilter ===
          "overdue"
        ) {
          return (
            mission.completed !==
              true &&
            mission.dueDate &&
            mission.dueDate <
              today
          );
        }

        return (
          mission.timeframe ===
            activeFilter &&
          mission.completed !==
            true
        );
      }
    );

  const sortedFilteredMissions =
    [
      ...filteredMissions,
    ].sort((a, b) => {
      if (
        !a.dueDate &&
        !b.dueDate
      ) {
        return 0;
      }

      if (!a.dueDate) {
        return 1;
      }

      if (!b.dueDate) {
        return -1;
      }

      return a.dueDate.localeCompare(
        b.dueDate
      );
    });

  /* ======================================================
     MISSION STATS
  ====================================================== */

  const totalMissions =
    missions.length;

  const completedMissions =
    missions.filter(
      (mission) =>
        mission.completed ===
        true
    ).length;

  const overdueMissions =
    missions.filter(
      (mission) =>
        mission.completed !==
          true &&
        mission.dueDate &&
        mission.dueDate <
          today
    ).length;

  const todayMissions =
    missions.filter(
      (mission) =>
        mission.timeframe ===
          "today" &&
        mission.completed !==
          true
    ).length;

  const remainingMissions =
    totalMissions -
    completedMissions;

  const completionPercentage =
    totalMissions === 0
      ? 0
      : Math.round(
          (completedMissions /
            totalMissions) *
            100
        );

  /* ======================================================
     DASHBOARD INTELLIGENCE
  ====================================================== */

  const priorityRank = {
    High: 3,
    Medium: 2,
    Low: 1,
  };

  const nextMission =
    missions
      .filter(
        (mission) =>
          !mission.completed
      )
      .sort((a, b) => {
        const aOverdue =
          Boolean(
            a.dueDate &&
              a.dueDate <
                today
          );

        const bOverdue =
          Boolean(
            b.dueDate &&
              b.dueDate <
                today
          );

        if (
          aOverdue !==
          bOverdue
        ) {
          return aOverdue
            ? -1
            : 1;
        }

        const priorityDifference =
          (priorityRank[
            b.priority
          ] || 0) -
          (priorityRank[
            a.priority
          ] || 0);

        if (
          priorityDifference !==
          0
        ) {
          return priorityDifference;
        }

        if (
          a.dueDate &&
          b.dueDate
        ) {
          return a.dueDate.localeCompare(
            b.dueDate
          );
        }

        if (a.dueDate) {
          return -1;
        }

        if (b.dueDate) {
          return 1;
        }

        return 0;
      })[0] || null;

  const activeProject =
    projects
      .filter(
        (project) =>
          project.completed !==
          true
      )
      .sort((a, b) => {
        if (
          a.deadline &&
          b.deadline
        ) {
          return a.deadline.localeCompare(
            b.deadline
          );
        }

        if (a.deadline) {
          return -1;
        }

        if (b.deadline) {
          return 1;
        }

        return (
          (b.progress || 0) -
          (a.progress || 0)
        );
      })[0] || null;

  const strongestOpportunity =
    opportunities
      .filter(
        (opportunity) =>
          !opportunity.dismissed &&
          opportunity.status !==
            "rejected"
      )
      .sort(
        (a, b) =>
          (b.matchScore || 0) -
          (a.matchScore || 0)
      )[0] || null;

  const roadmapPriority =
    Array.isArray(
      profile?.roadmap
        ?.priorities
    )
      ? profile.roadmap
          .priorities[0] ||
        null
      : null;

  const notifications =
  buildNotifications({
    missions,
    opportunities,
    roadmap:
      profile?.roadmap ||
      null,
  });

const notificationCount =
  notifications.length;

function handleNotificationAction(
  notification
) {
  setNotificationsOpen(false);

  if (notification.filter) {
    setActiveFilter(
      notification.filter
    );

    setTimeout(() => {
      document
        .getElementById(
          "flight-plan"
        )
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }, 50);

    return;
  }

  if (notification.route) {
    navigate(
      notification.route
    );
  }
}

  const missionStatus =
    overdueMissions > 0
      ? "Needs attention"
      : totalMissions === 0
        ? "Awaiting missions"
        : "On track";

        const bestNextMove = (() => {
  const overdueMission = missions
    .filter(
      (mission) =>
        !mission.completed &&
        mission.dueDate &&
        mission.dueDate < today
    )
    .sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate)
    )[0];

  if (overdueMission) {
    return {
      type: "mission",
      label: "RECOVER TRAJECTORY",
      title: overdueMission.title,
      description: `This mission is overdue. Complete it or reschedule it before adding more work.`,
      buttonLabel: "View Overdue Missions",
      action: () =>
        setActiveFilter("overdue"),
    };
  }

  const todayMission = missions
    .filter(
      (mission) =>
        !mission.completed &&
        mission.timeframe === "today"
    )
    .sort((a, b) => {
      const priorityRank = {
        High: 3,
        Medium: 2,
        Low: 1,
      };

      return (
        (priorityRank[b.priority] || 0) -
        (priorityRank[a.priority] || 0)
      );
    })[0];

  if (todayMission) {
    return {
      type: "mission",
      label: "BEST NEXT MOVE",
      title: todayMission.title,
      description:
        "This is the strongest immediate mission in your current Flight Plan.",
      buttonLabel: "Open Today's Flight Plan",
      action: () =>
        setActiveFilter("today"),
    };
  }

  if (
    strongestOpportunity &&
    (strongestOpportunity.matchScore || 0) >= 80
  ) {
    return {
      type: "opportunity",
      label: "OPPORTUNITY SIGNAL",
      title: strongestOpportunity.title,
      description: `${strongestOpportunity.company || "This company"} currently has one of your strongest AeroPath match scores at ${strongestOpportunity.matchScore}%.`,
      buttonLabel: "Review Opportunity",
      action: () =>
        navigate("/internships"),
    };
  }

  if (roadmapPriority) {
    return {
      type: "roadmap",
      label: "STRATEGIC PRIORITY",
      title: roadmapPriority.title,
      description:
        roadmapPriority.reason ||
        "This is currently the highest-priority item on your AeroPath Roadmap.",
      buttonLabel: "Open Roadmap",
      action: () =>
        navigate("/roadmap"),
    };
  }

  if (activeProject) {
    return {
      type: "project",
      label: "PROJECT MOMENTUM",
      title: activeProject.title,
      description:
        "You have an active project without a more urgent mission or opportunity competing for attention.",
      buttonLabel: "Continue Project",
      action: () =>
        navigate("/projects"),
    };
  }

  return {
    type: "mission",
    label: "START TRAJECTORY",
    title: "Create your next mission",
    description:
      "Your Flight Plan is clear. Add one concrete action to move your trajectory forward.",
    buttonLabel: "Add Mission",
    action: () =>
      navigate("/add-mission"),
  };
})();

  /* ======================================================
     LOADING / AUTH
  ====================================================== */

  if (loading) {
    return (
      <main className="auth-page">
        <p>
          Loading mission
          control...
        </p>
      </main>
    );
  }

  if (!auth.currentUser) {
    return (
      <Navigate
        to="/signup"
        replace
      />
    );
  }

  /* ======================================================
     PAGE
  ====================================================== */

  return (
    <main className="dashboard-page">
      <DashboardNav />
      <div className="notification-center">
  <button
    type="button"
    className="notification-bell"
    aria-label="Open notifications"
    aria-expanded={
      notificationsOpen
    }
    onClick={() =>
      setNotificationsOpen(
        (current) =>
          !current
      )
    }
  >
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>

    {notificationCount >
      0 && (
      <span className="notification-count">
        {notificationCount >
        9
          ? "9+"
          : notificationCount}
      </span>
    )}
  </button>

  {notificationsOpen && (
    <div className="notification-panel">
      <div className="notification-panel-header">
        <div>
          <p className="card-label">
            FLIGHT ALERTS
          </p>

          <h3>
            Notifications
          </h3>
        </div>

        <button
          type="button"
          className="notification-close"
          aria-label="Close notifications"
          onClick={() =>
            setNotificationsOpen(
              false
            )
          }
        >
          ×
        </button>
      </div>

      {notifications.length ===
      0 ? (
        <div className="notification-empty">
          <strong>
            All clear.
          </strong>

          <p>
            No current flight
            alerts need your
            attention.
          </p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map(
            (
              notification
            ) => (
              <article
                className={`notification-item ${notification.severity}`}
                key={
                  notification.id
                }
              >
                <div className="notification-item-heading">
                  <span
                    className={`notification-severity ${notification.severity}`}
                  >
                    {
                      notification.severity
                    }
                  </span>
                </div>

                <h4>
                  {
                    notification.title
                  }
                </h4>

                <p>
                  {
                    notification.message
                  }
                </p>

                <button
                  type="button"
                  onClick={() =>
                    handleNotificationAction(
                      notification
                    )
                  }
                >
                  {
                    notification.actionLabel
                  }
                </button>
              </article>
            )
          )}
        </div>
      )}
    </div>
  )}
</div>

      {/* HEADER */}

      <section className="dashboard-header">
        <p className="card-label">
          MISSION CONTROL
        </p>

        <h1>
          Welcome back,{" "}
          {profile?.fullName ||
            "Student"}.
        </h1>

        <p>
          Your current trajectory
          toward{" "}
          <strong>
            {careerGoal}
          </strong>
          .
        </p>

        <div className="profile-details">
          <p>
            College:{" "}
            <strong>
              {profile?.college ||
                "Not provided"}
            </strong>
          </p>

          <p>
            Major:{" "}
            <strong>
              {profile?.major ||
                "Not provided"}
            </strong>
          </p>

          <p>
            Graduation:{" "}
            <strong>
              {profile
                ?.graduationYear ||
                "Not provided"}
            </strong>
          </p>

          <p>
            Destination:{" "}
            <strong>
              {careerGoal}
            </strong>
          </p>
        </div>
      </section>

      {/* CORE STATS */}

      <section className="dashboard-stats">
        <div className="stat-card">
          <p className="card-label">
            TODAY'S MISSIONS
          </p>

          <h2>
            {todayMissions}
          </h2>
        </div>

        <div className="stat-card">
          <p className="card-label">
            OVERDUE
          </p>

          <h2>
            {overdueMissions}
          </h2>
        </div>

        <div className="stat-card">
          <p className="card-label">
            COMPLETED
          </p>

          <h2>
            {completedMissions}
          </h2>
        </div>

        <div className="stat-card">
          <p className="card-label">
            REMAINING
          </p>

          <h2>
            {remainingMissions}
          </h2>
        </div>

        <div className="progress-card">
          <div className="progress-heading">
            <div>
              <p className="card-label">
                FLIGHT PROGRESS
              </p>

              <h2>
                {
                  completionPercentage
                }
                %
              </h2>
            </div>

            <p>
              {completedMissions}{" "}
              of {totalMissions}{" "}
              missions complete
            </p>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${completionPercentage}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* INTELLIGENCE */}

      <section className="dashboard-intelligence-section">
        <article className="best-next-move-card">
  <div>
    <p className="card-label">
      {bestNextMove.label}
    </p>

    <h2>
      {bestNextMove.title}
    </h2>

    <p>
      {bestNextMove.description}
    </p>
  </div>

  <button
    type="button"
    onClick={bestNextMove.action}
  >
    {bestNextMove.buttonLabel}
  </button>
</article>
        <div className="dashboard-intelligence-heading">
          <div>
            <p className="card-label">
              TRAJECTORY
              INTELLIGENCE
            </p>

            <h2>
              What matters next.
            </h2>
          </div>

          <span
            className={
              overdueMissions >
              0
                ? "trajectory-status warning"
                : "trajectory-status good"
            }
          >
            {missionStatus}
          </span>
        </div>

        <div className="dashboard-intelligence-grid">

          {/* NEXT MISSION */}

          <article className="intelligence-card">
            <div className="intelligence-card-top">
              <p className="card-label">
                NEXT MISSION
              </p>

              <span>
                01
              </span>
            </div>

            {nextMission ? (
              <>
                <h3>
                  {
                    nextMission.title
                  }
                </h3>

                <p>
                  {nextMission.dueDate
                    ? `Due ${nextMission.dueDate}`
                    : "No due date"}
                </p>

                <div className="intelligence-meta">
                  <span>
                    {nextMission.priority ||
                      "Medium"}{" "}
                    priority
                  </span>

                  <span>
                    {nextMission.estimatedMinutes ||
                      "—"}{" "}
                    min
                  </span>
                </div>
              </>
            ) : (
              <>
                <h3>
                  No active
                  missions.
                </h3>

                <p>
                  Add a mission or
                  pull one from your
                  Roadmap.
                </p>
              </>
            )}

            <button
              type="button"
              className="intelligence-link-button"
              onClick={() =>
                nextMission
                  ? setActiveFilter(
                      nextMission.timeframe ||
                        "today"
                    )
                  : navigate(
                      "/add-mission"
                    )
              }
            >
              {nextMission
                ? "View Flight Plan"
                : "Add Mission"}
            </button>
          </article>

          {/* PROJECT */}

          <article className="intelligence-card">
            <div className="intelligence-card-top">
              <p className="card-label">
                ACTIVE PROJECT
              </p>

              <span>
                02
              </span>
            </div>

            {activeProject ? (
              <>
                <h3>
                  {
                    activeProject.title
                  }
                </h3>

                <p>
                  {activeProject.description ||
                    "Active project in your AeroPath hangar."}
                </p>

                <div className="mini-progress">
                  <div className="mini-progress-heading">
                    <span>
                      Progress
                    </span>

                    <strong>
                      {activeProject.progress ||
                        0}
                      %
                    </strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${activeProject.progress || 0}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3>
                  No active
                  project.
                </h3>

                <p>
                  Start a project
                  that strengthens
                  your trajectory.
                </p>
              </>
            )}

            <button
              type="button"
              className="intelligence-link-button"
              onClick={() =>
                navigate(
                  "/projects"
                )
              }
            >
              View Projects
            </button>
          </article>

          {/* OPPORTUNITY */}

          <article className="intelligence-card">
            <div className="intelligence-card-top">
              <p className="card-label">
                BEST OPPORTUNITY
              </p>

              <span>
                03
              </span>
            </div>

            {strongestOpportunity ? (
              <>
                <div className="dashboard-match-heading">
                  <h3>
                    {
                      strongestOpportunity.title
                    }
                  </h3>

                  <strong>
                    {strongestOpportunity.matchScore ||
                      0}
                    %
                  </strong>
                </div>

                <p>
                  {strongestOpportunity.company ||
                    "Company not listed"}
                </p>

                <div className="intelligence-meta">
                  <span>
                    {strongestOpportunity.location ||
                      "Location not listed"}
                  </span>

                  <span>
                    match
                  </span>
                </div>
              </>
            ) : (
              <>
                <h3>
                  Radar awaiting
                  results.
                </h3>

                <p>
                  Run an
                  Opportunity Radar
                  scan to find your
                  strongest match.
                </p>
              </>
            )}

            <button
              type="button"
              className="intelligence-link-button"
              onClick={() =>
                navigate(
                  "/internships"
                )
              }
            >
              Open Radar
            </button>
          </article>

          {/* ROADMAP */}

          <article className="intelligence-card">
            <div className="intelligence-card-top">
              <p className="card-label">
                ROADMAP PRIORITY
              </p>

              <span>
                04
              </span>
            </div>

            {roadmapPriority ? (
              <>
                <h3>
                  {
                    roadmapPriority.title
                  }
                </h3>

                <p>
                  {
                    roadmapPriority.reason
                  }
                </p>

                <div className="intelligence-meta">
                  <span>
                    {roadmapPriority.timeframe ||
                      "Current priority"}
                  </span>
                </div>
              </>
            ) : (
              <>
                <h3>
                  No roadmap
                  generated.
                </h3>

                <p>
                  Generate your
                  AeroPath Roadmap
                  to identify your
                  next strategic
                  priority.
                </p>
              </>
            )}

            <button
              type="button"
              className="intelligence-link-button"
              onClick={() =>
                navigate(
                  "/roadmap"
                )
              }
            >
              View Roadmap
            </button>
          </article>
        </div>
      </section>

      {error && (
        <p className="auth-error">
          {error}
        </p>
      )}

      {/* FLIGHT PLAN */}

      <section
  className="missions-section"
  id="flight-plan"
>
        <div className="missions-heading">
          <div>
            <p className="card-label">
              FLIGHT PLAN
            </p>

            <h2>
              Your missions
            </h2>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate(
                "/add-mission"
              )
            }
          >
            + Add Mission
          </button>
        </div>

        <div className="mission-filters">
          {[
            [
              "today",
              "Today",
            ],
            [
              "week",
              "This Week",
            ],
            [
              "month",
              "This Month",
            ],
            [
              "overdue",
              "Overdue",
            ],
            [
              "completed",
              "Completed",
            ],
          ].map(
            ([
              value,
              label,
            ]) => (
              <button
                type="button"
                key={value}
                className={
                  activeFilter ===
                  value
                    ? "filter-button active"
                    : "filter-button"
                }
                onClick={() =>
                  setActiveFilter(
                    value
                  )
                }
              >
                {label}
              </button>
            )
          )}
        </div>

        <div className="mission-list">
          {sortedFilteredMissions.length ===
          0 ? (
            <div className="empty-missions">
              <h3>
                No missions here
                yet.
              </h3>

              <p>
                Add a mission,
                choose another
                flight-plan
                category, or add
                an action from
                your Roadmap.
              </p>
            </div>
          ) : (
            sortedFilteredMissions.map(
              (mission) => (
                <UserMissionCard
                  key={
                    mission.id
                  }
                  mission={
                    mission
                  }
                />
              )
            )
          )}
        </div>
      </section>
    </main>
  );
}

export default Dashboard;