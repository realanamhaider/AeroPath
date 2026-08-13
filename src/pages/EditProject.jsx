import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import DashboardNav from "../components/DashboardNav";

function EditProject() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const savingLocked = useRef(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Engineering");
  const [deadline, setDeadline] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProject() {
      try {
        const user = auth.currentUser;

        if (!user) {
          throw new Error("You must be signed in.");
        }

        const projectRef = doc(
          db,
          "users",
          user.uid,
          "projects",
          projectId
        );

        const projectSnapshot = await getDoc(projectRef);

        if (!projectSnapshot.exists()) {
          throw new Error("Project could not be found.");
        }

        const projectData = projectSnapshot.data();

        setTitle(projectData.title || "");
        setDescription(projectData.description || "");
        setCategory(projectData.category || "Engineering");
        setDeadline(projectData.deadline || "");
      } catch (err) {
        setError(err.message || "Could not load the project.");
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [projectId]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (savingLocked.current) return;

    setError("");

    const trimmedTitle = title
      .trim()
      .replace(/^./, (letter) => letter.toUpperCase());

    const trimmedDescription = description.trim();

    if (trimmedTitle.length < 3) {
      setError("Project title must be at least 3 characters.");
      return;
    }

    if (trimmedTitle.length > 100) {
      setError("Project title must be 100 characters or fewer.");
      return;
    }

    if (trimmedDescription.length > 500) {
      setError("Description must be 500 characters or fewer.");
      return;
    }

    if (!deadline) {
      setError("Choose a project deadline.");
      return;
    }

    savingLocked.current = true;
    setSaving(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const projectRef = doc(
        db,
        "users",
        user.uid,
        "projects",
        projectId
      );

      await updateDoc(projectRef, {
        title: trimmedTitle,
        description: trimmedDescription,
        category,
        deadline,
      });

      navigate("/projects");
    } catch (err) {
      setError(err.message || "Could not save the project.");
    } finally {
      savingLocked.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="auth-page">
        <p>Loading project...</p>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <DashboardNav />

      <section className="project-form-card">
        <p className="card-label">EDIT PROJECT</p>
        <h1>Update your project.</h1>

        <form onSubmit={handleSubmit}>
          <label>
            Project title
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
            Description
            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              maxLength={500}
              rows={4}
              disabled={saving}
            />
          </label>

          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={saving}
            >
              <option>Engineering</option>
              <option>Programming</option>
              <option>Research</option>
              <option>Academic</option>
              <option>Career</option>
              <option>Personal</option>
            </select>
          </label>

          <label>
            Deadline
            <input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              disabled={saving}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={saving}>
            {saving ? "Saving Project..." : "Save Changes"}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/projects")}
            disabled={saving}
          >
            Cancel
          </button>
        </form>
      </section>
    </main>
  );
}

export default EditProject;