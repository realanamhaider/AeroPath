import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

function EditMission() {
  const navigate = useNavigate();
  const { missionId } = useParams();
  const savingLocked = useRef(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Academics");
  const [priority, setPriority] = useState("Medium");
  const [timeframe, setTimeframe] = useState("today");
  const [dueDate, setDueDate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMission() {
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
          missionId
        );

        const missionSnapshot = await getDoc(missionRef);

        if (!missionSnapshot.exists()) {
          throw new Error("Mission could not be found.");
        }

        const missionData = missionSnapshot.data();

        setTitle(missionData.title || "");
        setCategory(missionData.category || "Academics");
        setPriority(missionData.priority || "Medium");
        setTimeframe(missionData.timeframe || "today");
        setDueDate(missionData.dueDate || "");
        setEstimatedMinutes(
          missionData.estimatedMinutes?.toString() || ""
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadMission();
  }, [missionId]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (savingLocked.current) return;

    setError("");

    const trimmedTitle = title.trim();
    const minutes = Number(estimatedMinutes);

    if (trimmedTitle.length < 3) {
      setError("Mission title must be at least 3 characters.");
      return;
    }

    if (trimmedTitle.length > 100) {
      setError("Mission title must be 100 characters or fewer.");
      return;
    }

    if (!dueDate) {
      setError("Please choose a due date.");
      return;
    }

    if (
      !Number.isFinite(minutes) ||
      minutes < 5 ||
      minutes > 1440
    ) {
      setError(
        "Estimated time must be between 5 and 1,440 minutes."
      );
      return;
    }

    savingLocked.current = true;
    setSaving(true);

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
        missionId
      );

      await updateDoc(missionRef, {
        title: trimmedTitle,
        category,
        priority,
        timeframe,
        dueDate,
        estimatedMinutes: minutes,
      });

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Could not save your changes.");
    } finally {
      savingLocked.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="auth-page">
        <p>Loading mission...</p>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="card-label">EDIT MISSION</p>

        <h1>Adjust your flight plan.</h1>

        <p className="auth-description">
          Update this mission and save your changes.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Mission title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              disabled={saving}
              required
            />
          </label>

          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={saving}
            >
              <option>Academics</option>
              <option>Career</option>
              <option>Projects</option>
              <option>Fitness</option>
              <option>Personal</option>
            </select>
          </label>

          <label>
            Priority
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              disabled={saving}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>

          <label>
            Flight plan
            <select
              value={timeframe}
              onChange={(event) => setTimeframe(event.target.value)}
              disabled={saving}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </label>

          <label>
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={saving}
              required
            />
          </label>

          <label>
            Estimated time in minutes
            <input
              type="number"
              value={estimatedMinutes}
              onChange={(event) =>
                setEstimatedMinutes(event.target.value)
              }
              min="5"
              max="1440"
              disabled={saving}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={saving}>
            {saving ? "Saving changes..." : "Save Changes"}
          </button>
        </form>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/dashboard")}
          disabled={saving}
        >
          Cancel
        </button>
      </section>
    </main>
  );
}

export default EditMission;