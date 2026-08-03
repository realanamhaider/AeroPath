import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

function AddMission() {
  const navigate = useNavigate();
  const submissionLocked = useRef(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Academics");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [timeframe, setTimeframe] = useState("today");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

async function handleSubmit(event) {
  event.preventDefault();

  if (submissionLocked.current) return;

  setError("");

  const trimmedTitle = title
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
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

  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 1440) {
    setError("Estimated time must be between 5 and 1,440 minutes.");
    return;
  }

  submissionLocked.current = true;
  setLoading(true);

  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("You must be signed in to create a mission.");
    }

    await addDoc(collection(db, "users", user.uid, "missions"), {
      title: trimmedTitle,
      category,
      priority,
      timeframe,
      dueDate,
      estimatedMinutes: minutes,
      completed: false,
      createdAt: serverTimestamp(),
    });

    navigate("/dashboard");
  } catch (err) {
    setError(err.message || "Could not create your mission.");
  } finally {
    submissionLocked.current = false;
    setLoading(false);
  }
}

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="card-label">NEW MISSION</p>

        <h1>Add to your flight plan.</h1>

        <p className="auth-description">
          Create a mission and AeroPath will add it to your trajectory.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Mission title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Complete calculus assignment"
              maxLength={100}
              disabled={loading}
              required
            />
          </label>

          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
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
              required
            />
          </label>

          <label>
            Estimated time in minutes
            <input
              type="number"
              value={estimatedMinutes}
              onChange={(event) => setEstimatedMinutes(event.target.value)}
              placeholder="45"
              min="5"
              max="1440"
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Adding mission..." : "Add Mission"}
          </button>
        </form>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/dashboard")}
          disabled={loading}
        >
          Cancel
        </button>
      </section>
    </main>
  );
}

export default AddMission;