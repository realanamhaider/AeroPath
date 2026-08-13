import UserMissionCard from "../components/UserMissionCard";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { Navigate, useNavigate } from "react-router";
import DashboardNav from "../components/DashboardNav";


function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [missions, setMissions] = useState([]);
  const [activeFilter, setActiveFilter] = useState("today");

  const navigate = useNavigate();

  useEffect(() => {
  const user = auth.currentUser;

  if (!user) return;

  const missionsQuery = query(
    collection(db, "users", user.uid, "missions"),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(
    missionsQuery,
    (snapshot) => {
      const missionList = snapshot.docs.map((missionDoc) => ({
        id: missionDoc.id,
        ...missionDoc.data(),
      }));

      setMissions(missionList);
    },
    (err) => {
      setError(err.message);
    }
  );

  return unsubscribe;
}, []);

  useEffect(() => {
    async function loadProfile() {
      try {
        const user = auth.currentUser;

        if (!user) {
          setLoading(false);
          return;
        }

        const profileSnapshot = await getDoc(doc(db, "users", user.uid));

        if (!profileSnapshot.exists()) {
          setError("Your AeroPath profile could not be found.");
          return;
        }

        setProfile(profileSnapshot.data());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);
  
const today = new Date().toISOString().split("T")[0];

const filteredMissions = missions.filter((mission) => {
  if (activeFilter === "completed") {
    return mission.completed === true;
  }

  if (activeFilter === "overdue") {
    return (
      mission.completed !== true &&
      mission.dueDate &&
      mission.dueDate < today
    );
  }

  return (
    mission.timeframe === activeFilter &&
    mission.completed !== true
  );
});

const sortedFilteredMissions = [...filteredMissions].sort((a, b) => {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;

  return a.dueDate.localeCompare(b.dueDate);
});

const totalMissions = missions.length;

const completedMissions = missions.filter(
  (mission) => mission.completed === true
).length;

const overdueMissions = missions.filter(
  (mission) =>
    mission.completed !== true &&
    mission.dueDate &&
    mission.dueDate < today
).length;

const todayMissions = missions.filter(
  (mission) =>
    mission.timeframe === "today" &&
    mission.completed !== true
).length;

const remainingMissions = totalMissions - completedMissions;

const completionPercentage =
  totalMissions === 0
    ? 0
    : Math.round((completedMissions / totalMissions) * 100);

const nextMission = missions
  .filter((mission) => !mission.completed && mission.dueDate)
  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

const missionStatus =
  overdueMissions > 0 ? "Needs attention" : "On track";

  if (loading) {
    return (
      <main className="auth-page">
        <p>Loading mission control...</p>
      </main>
    );
  }

  if (!auth.currentUser) {
    return <Navigate to="/signup" replace />;
  }

  return (
    <main className="dashboard-page">
        <DashboardNav />
        
<section className="dashboard-header">
  <p className="card-label">MISSION CONTROL</p>

  <h1>Welcome back, {profile?.fullName || "Student"}.</h1>

  <p>
    Your current trajectory toward becoming a{" "}
    <strong>{profile?.dreamCareer || "Pilot"}</strong>.
  </p>

  <div className="profile-details">
    <p>
      College: <strong>{profile?.college || "Not provided"}</strong>
    </p>

    <p>
      Major: <strong>{profile?.major || "Not provided"}</strong>
    </p>

    <p>
      Graduation:{" "}
      <strong>{profile?.graduationYear || "Not provided"}</strong>
    </p>

    <p>
      Destination:{" "}
      <strong>{profile?.dreamCareer || "Not provided"}</strong>
    </p>
  </div>
</section>

<section className="dashboard-stats">

  <div className="stat-card">
    <p className="card-label">TODAY'S MISSIONS</p>
    <h2>{todayMissions}</h2>
  </div>

  <div className="stat-card">
    <p className="card-label">OVERDUE</p>
    <h2>{overdueMissions}</h2>
  </div>

  <div className="stat-card">
    <p className="card-label">COMPLETED</p>
    <h2>{completedMissions}</h2>
  </div>

  <div className="stat-card">
    <p className="card-label">REMAINING</p>
    <h2>{remainingMissions}</h2>
  </div>

  <div className="progress-card">

    <div className="progress-heading">

      <div>
        <p className="card-label">
          FLIGHT PROGRESS
        </p>

        <h2>{completionPercentage}%</h2>
      </div>

      <p>
        {completedMissions} of {totalMissions} missions complete
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

<section className="mission-status-panel">
  <div>
    <p className="card-label">MISSION STATUS</p>
    <h2
  className={
    overdueMissions > 0 ? "status-warning" : "status-good"
  }
>
  {missionStatus}
</h2>
  </div>

  <div>
    <p className="card-label">NEXT MISSION</p>

    {nextMission ? (
      <>
        <h3>{nextMission.title}</h3>
        <p>Due: {nextMission.dueDate}</p>
      </>
    ) : (
      <p>No upcoming missions.</p>
    )}
  </div>
</section>

      {error && <p className="auth-error">{error}</p>}

<section className="missions-section">
<div className="missions-heading">
  <div>
    <p className="card-label">TODAY'S FLIGHT PLAN</p>
    <h2>Your missions</h2>
  </div>

  <button
    className="primary-button"
    onClick={() => navigate("/add-mission")}
  >
    + Add Mission
  </button>
</div>

<div className="mission-filters">
  <button
    className={activeFilter === "today" ? "filter-button active" : "filter-button"}
    onClick={() => setActiveFilter("today")}
  >
    Today
  </button>

  <button
    className={activeFilter === "week" ? "filter-button active" : "filter-button"}
    onClick={() => setActiveFilter("week")}
  >
    This Week
  </button>

  <button
    className={activeFilter === "month" ? "filter-button active" : "filter-button"}
    onClick={() => setActiveFilter("month")}
  >
    This Month
  </button>
<button
  className={
    activeFilter === "overdue"
      ? "filter-button active"
      : "filter-button"
  }
  onClick={() => setActiveFilter("overdue")}
>
  Overdue
</button>

  <button
    className={
      activeFilter === "completed"
        ? "filter-button active"
        : "filter-button"
    }
    onClick={() => setActiveFilter("completed")}
  >
    Completed
  </button>
</div>

<div className="mission-list">
  {sortedFilteredMissions.length === 0 ? (
    <div className="empty-missions">
      <h3>No missions here yet.</h3>
      <p>Add a mission or choose another flight-plan category.</p>
    </div>
  ) : (
    sortedFilteredMissions.map((mission) => (
      <UserMissionCard key={mission.id} mission={mission} />
    ))
  )}
</div>
</section>
    </main>
    
  );
}

export default Dashboard;