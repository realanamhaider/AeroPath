import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import DashboardNav from "../components/DashboardNav";

function Projects() {
  const navigate = useNavigate();
  const creatingLocked = useRef(false);

  const [projects, setProjects] = useState([]);
  const [progressDrafts, setProgressDrafts] = useState({});

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Engineering");
  const [deadline, setDeadline] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    const projectsQuery = query(
      collection(db, "users", user.uid, "projects"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      projectsQuery,
      (snapshot) => {
        const projectList = snapshot.docs.map((projectDoc) => ({
          id: projectDoc.id,
          ...projectDoc.data(),
        }));

        setProjects(projectList);
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Could not load your projects.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  async function handleCreateProject(event) {
    event.preventDefault();

    if (creatingLocked.current) return;

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

    creatingLocked.current = true;
    setCreating(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      await addDoc(
        collection(db, "users", user.uid, "projects"),
        {
          title: trimmedTitle,
          description: trimmedDescription,
          category,
          deadline,
          progress: 0,
          completed: false,
          completedAt: null,
          createdAt: serverTimestamp(),
        }
      );

      setTitle("");
      setDescription("");
      setCategory("Engineering");
      setDeadline("");
    } catch (err) {
      setError(err.message || "Could not create your project.");
    } finally {
      creatingLocked.current = false;
      setCreating(false);
    }
  }

  async function toggleProjectComplete(project) {
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
        project.id
      );

      const newCompletedStatus = !project.completed;

      await updateDoc(projectRef, {
        completed: newCompletedStatus,
        progress: newCompletedStatus ? 100 : 0,
        completedAt: newCompletedStatus
          ? serverTimestamp()
          : null,
      });

      setProgressDrafts((current) => {
        const updatedDrafts = { ...current };
        delete updatedDrafts[project.id];
        return updatedDrafts;
      });
    } catch (err) {
      setError(err.message || "Could not update the project.");
    }
  }

  async function saveProjectProgress(project) {
    setError("");

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const progress = Number(
        progressDrafts[project.id] ?? project.progress ?? 0
      );

      if (
        !Number.isFinite(progress) ||
        progress < 0 ||
        progress > 100
      ) {
        setError("Project progress must be between 0 and 100.");
        return;
      }

      const projectRef = doc(
        db,
        "users",
        user.uid,
        "projects",
        project.id
      );

      await updateDoc(projectRef, {
        progress,
        completed: progress === 100,
        completedAt:
          progress === 100 ? serverTimestamp() : null,
      });

      setProgressDrafts((current) => {
        const updatedDrafts = { ...current };
        delete updatedDrafts[project.id];
        return updatedDrafts;
      });
    } catch (err) {
      setError(
        err.message || "Could not update project progress."
      );
    }
  }

  async function removeProject(project) {
    const confirmed = window.confirm(
      `Delete "${project.title}"?`
    );

    if (!confirmed) return;

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "projects",
          project.id
        )
      );
    } catch (err) {
      setError(err.message || "Could not delete the project.");
    }
  }

  const now = new Date();

  const today = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(now.getDate()).padStart(
    2,
    "0"
  )}`;

  const completedProjects = projects.filter(
    (project) => project.completed
  ).length;

  const activeProjects = projects.length - completedProjects;

  const overdueProjects = projects.filter(
    (project) =>
      !project.completed &&
      project.deadline &&
      project.deadline < today
  ).length;

  return (
    <main className="dashboard-page">
      <DashboardNav />

      <section className="dashboard-header">
        <p className="card-label">PROJECTS</p>
        <h1>Your Projects</h1>

        <p>
          Manage your engineering, programming, research, and
          personal projects.
        </p>
      </section>

      <section className="project-stats">
        <div className="stat-card">
          <p className="card-label">TOTAL</p>
          <h2>{projects.length}</h2>
        </div>

        <div className="stat-card">
          <p className="card-label">ACTIVE</p>
          <h2>{activeProjects}</h2>
        </div>

        <div className="stat-card">
          <p className="card-label">COMPLETED</p>
          <h2>{completedProjects}</h2>
        </div>

        <div className="stat-card">
          <p className="card-label">OVERDUE</p>
          <h2>{overdueProjects}</h2>
        </div>
      </section>

      <section className="project-form-card">
        <p className="card-label">NEW PROJECT</p>
        <h2>Begin a new project.</h2>

        <form onSubmit={handleCreateProject}>
          <label>
            Project title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Build an aircraft wing model"
              maxLength={100}
              disabled={creating}
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
              placeholder="Describe the goal and expected result."
              maxLength={500}
              rows={4}
              disabled={creating}
            />
          </label>

          <label>
            Category
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              disabled={creating}
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
              onChange={(event) =>
                setDeadline(event.target.value)
              }
              disabled={creating}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={creating}>
            {creating
              ? "Creating Project..."
              : "Create Project"}
          </button>
        </form>
      </section>

      <section className="projects-list-section">
        <div>
          <p className="card-label">PROJECT HANGAR</p>
          <h2>Your current projects</h2>
        </div>

        {loading ? (
          <p>Loading projects...</p>
        ) : projects.length === 0 ? (
          <div className="empty-missions">
            <h3>No projects yet.</h3>
            <p>Create your first project above.</p>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => {
              const isOverdue =
                !project.completed &&
                project.deadline &&
                project.deadline < today;

              const progressValue =
                progressDrafts[project.id] ??
                project.progress ??
                0;

              return (
                <article
                  key={project.id}
                  className={
                    project.completed
                      ? "user-project-card completed"
                      : "user-project-card"
                  }
                >
                  <div className="project-card-heading">
                    <p className="card-label">
                      {project.category}
                    </p>

                    {isOverdue && (
                      <span className="overdue-badge">
                        Past due
                      </span>
                    )}
                  </div>

                  <h3>{project.title}</h3>

                  {project.description && (
                    <p>{project.description}</p>
                  )}

                  <div className="project-meta">
                    <span>
                      Due {project.deadline || "Not provided"}
                    </span>

                    <span>{project.progress || 0}% complete</span>
                  </div>

                  <div className="project-progress-control">
                    <label>
                      Progress percentage
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={progressValue}
                        onChange={(event) =>
                          setProgressDrafts((current) => ({
                            ...current,
                            [project.id]: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        saveProjectProgress(project)
                      }
                    >
                      Save Progress
                    </button>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progressValue}%`,
                      }}
                    />
                  </div>

                  <div className="project-actions">
                    <button
                      type="button"
                      className="edit-mission-button"
                      onClick={() =>
                        navigate(
                          `/edit-project/${project.id}`
                        )
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleProjectComplete(project)
                      }
                    >
                      {project.completed
                        ? "Mark Active"
                        : "Complete"}
                    </button>

                    <button
                      type="button"
                      className="delete-mission-button"
                      onClick={() => removeProject(project)}
                    >
                      Delete
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

export default Projects;