import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";

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