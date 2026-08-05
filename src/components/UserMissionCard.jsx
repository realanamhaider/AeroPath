import {
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";

function formatDueDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-").map(Number);
  const dueDate = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const differenceInDays = Math.round(
    (dueDate - today) / (1000 * 60 * 60 * 24)
  );

  if (differenceInDays === 0) return "Today";
  if (differenceInDays === 1) return "Tomorrow";
  if (differenceInDays === -1) return "Yesterday";

  return dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function UserMissionCard({ mission }) {
  const navigate = useNavigate();

  async function toggleMissionComplete() {
    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const missionRef = doc(
        db,
        "users",
        user.uid,
        "missions",
        mission.id
      );

      await updateDoc(missionRef, {
    completed: !mission.completed,
    completedAt: mission.completed ? null : serverTimestamp(),
    });
    } catch (error) {
      console.error("Could not update mission:", error);
    }
  }

  async function deleteMission() {
    const confirmed = window.confirm(
      `Delete "${mission.title}"?`
    );

    if (!confirmed) return;

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const missionRef = doc(
        db,
        "users",
        user.uid,
        "missions",
        mission.id
      );

      await deleteDoc(missionRef);
    } catch (error) {
      console.error("Could not delete mission:", error);
    }
  }

  return (
    <article
      className={
        mission.completed
          ? "user-mission-card completed"
          : "user-mission-card"
      }
    >
      <div className="mission-card-content">
        <p className="card-label">
          {mission.timeframe || "MISSION"}
        </p>

        <h3>{mission.title}</h3>

        {mission.description && (
          <p className="mission-description">
            {mission.description}
          </p>
        )}
      </div>
      
      <div className="mission-meta">
          {mission.category && <span>{mission.category}</span>}

           {mission.priority && (
         <span>{mission.priority} priority</span>
  )}

  {mission.dueDate && (
    <span>Due {formatDueDate(mission.dueDate)}</span>
  )}

  {mission.estimatedMinutes > 0 && (
    <span>{mission.estimatedMinutes} min</span>
  )}
</div>
      <div className="mission-card-actions">
        <button
           type="button"
           className="edit-mission-button"
           onClick={() => navigate(`/edit-mission/${mission.id}`)}
        >
          Edit
        </button>

        <button
          type="button"
          className="complete-mission-button"
          onClick={toggleMissionComplete}
        >
          {mission.completed ? "Mark Incomplete" : "Complete"}
        </button>

        <button
          type="button"
          className="delete-mission-button"
          onClick={deleteMission}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export default UserMissionCard;