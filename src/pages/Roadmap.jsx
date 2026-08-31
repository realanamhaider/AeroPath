import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebase";

import DashboardNav from "../components/DashboardNav";

import {
  generateRoadmap,
} from "../services/roadmapAI";

function Roadmap() {
  const generationLocked =
    useRef(false);

  const [profile, setProfile] =
    useState(null);

  const [roadmap, setRoadmap] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [addingAction, setAddingAction] =
    useState("");

  const [addedActions, setAddedActions] =
    useState({});

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /* ======================================================
     LOAD PROFILE + ROADMAP + EXISTING ROADMAP MISSIONS
  ====================================================== */

  useEffect(() => {
    async function loadRoadmap() {
      try {
        const user =
          auth.currentUser;

        if (!user) {
          throw new Error(
            "You must be signed in."
          );
        }

        const profileRef = doc(
          db,
          "users",
          user.uid
        );

        const snapshot =
          await getDoc(profileRef);

        if (!snapshot.exists()) {
          throw new Error(
            "Complete your AeroPath profile first."
          );
        }

        const data =
          snapshot.data();

        setProfile(data);

        if (data.roadmap) {
          setRoadmap(
            data.roadmap
          );
        }

        /*
          Restore which roadmap actions have
          already been added to Flight Plan.
        */

        const missionsSnapshot =
          await getDocs(
            collection(
              db,
              "users",
              user.uid,
              "missions"
            )
          );

        const existingActions = {};

        missionsSnapshot.docs.forEach(
          (missionDoc) => {
            const mission =
              missionDoc.data();

            if (
              mission.source ===
                "roadmap" &&
              mission.roadmapAction
            ) {
              const key =
                createActionKey(
                  mission.roadmapAction
                );

              existingActions[key] =
                true;
            }
          }
        );

        setAddedActions(
          existingActions
        );
      } catch (err) {
        setError(
          err.message ||
            "Could not load your roadmap."
        );
      } finally {
        setLoading(false);
      }
    }

    loadRoadmap();
  }, []);

  /* ======================================================
     HELPERS
  ====================================================== */

  function createActionKey(title) {
    return String(title || "")
      .trim()
      .toLowerCase();
  }

  function getMissionCategory(
    actionCategory
  ) {
    if (
      actionCategory ===
      "Coursework"
    ) {
      return "Academics";
    }

    if (
      actionCategory ===
      "Project"
    ) {
      return "Projects";
    }

    return "Career";
  }

  function getMissionTimeframe(
    days
  ) {
    if (days <= 1) {
      return "today";
    }

    if (days <= 7) {
      return "week";
    }

    return "month";
  }

  function getMissionDueDate(
    days
  ) {
    const date = new Date();

    date.setDate(
      date.getDate() +
        Math.max(
          1,
          Number(days) || 7
        )
    );

    return date
      .toISOString()
      .split("T")[0];
  }

  function getEstimatedMinutes(
    actionCategory
  ) {
    if (
      actionCategory ===
      "Project"
    ) {
      return 120;
    }

    if (
      actionCategory ===
      "Coursework"
    ) {
      return 60;
    }

    if (
      actionCategory ===
      "Skill"
    ) {
      return 60;
    }

    if (
      actionCategory ===
      "Application"
    ) {
      return 45;
    }

    return 45;
  }

  /* ======================================================
     GENERATE / REFRESH ROADMAP
  ====================================================== */

  async function handleGenerateRoadmap() {
    if (
      generationLocked.current
    ) {
      return;
    }

    generationLocked.current =
      true;

    setGenerating(true);
    setError("");
    setSuccess("");

    try {
      const user =
        auth.currentUser;

      if (!user) {
        throw new Error(
          "You must be signed in."
        );
      }

      if (!profile) {
        throw new Error(
          "AeroPath could not find your profile."
        );
      }

      const generated =
        await generateRoadmap(
          profile
        );

      const profileRef = doc(
        db,
        "users",
        user.uid
      );

      await updateDoc(
        profileRef,
        {
          roadmap:
            generated,

          roadmapGeneratedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      setRoadmap(
        generated
      );

      setSuccess(
        "Your AeroPath roadmap has been updated."
      );
    } catch (err) {
      console.error(
        "Roadmap generation failed:",
        err
      );

      setError(
        err.message ||
          "AeroPath could not generate your roadmap."
      );
    } finally {
      generationLocked.current =
        false;

      setGenerating(false);
    }
  }

  /* ======================================================
     ADD ROADMAP ACTION TO FLIGHT PLAN
  ====================================================== */

  async function addActionToFlightPlan(
    action
  ) {
    const actionKey =
      createActionKey(
        action.title
      );

    if (
      addingAction ===
        actionKey ||
      addedActions[actionKey]
    ) {
      return;
    }

    setAddingAction(
      actionKey
    );

    setError("");
    setSuccess("");

    try {
      const user =
        auth.currentUser;

      if (!user) {
        throw new Error(
          "You must be signed in."
        );
      }

      const missionsRef =
        collection(
          db,
          "users",
          user.uid,
          "missions"
        );

      /*
        Check Firestore too.

        This prevents duplicates even if:
        - the user refreshed
        - local state reset
        - the button was somehow clicked twice
      */

      const duplicateQuery =
        query(
          missionsRef,
          where(
            "roadmapAction",
            "==",
            action.title
          )
        );

      const duplicateSnapshot =
        await getDocs(
          duplicateQuery
        );

      if (
        !duplicateSnapshot.empty
      ) {
        setAddedActions(
          (current) => ({
            ...current,
            [actionKey]: true,
          })
        );

        setSuccess(
          `"${action.title}" is already in your Flight Plan.`
        );

        return;
      }

      const suggestedDays =
        Math.max(
          1,
          Number(
            action.suggestedDays
          ) || 7
        );

      const missionTitle =
        String(
          action.title || ""
        )
          .trim()
          .replace(
            /^./,
            (letter) =>
              letter.toUpperCase()
          )
          .slice(0, 100);

      if (
        missionTitle.length < 3
      ) {
        throw new Error(
          "This roadmap action needs a valid title before it can be added."
        );
      }

      await addDoc(
        missionsRef,
        {
          title:
            missionTitle,

          category:
            getMissionCategory(
              action.category
            ),

          priority:
            "High",

          timeframe:
            getMissionTimeframe(
              suggestedDays
            ),

          dueDate:
            getMissionDueDate(
              suggestedDays
            ),

          estimatedMinutes:
            getEstimatedMinutes(
              action.category
            ),

          completed:
            false,

          source:
            "roadmap",

          roadmapAction:
            action.title,

          createdAt:
            serverTimestamp(),
        }
      );

      setAddedActions(
        (current) => ({
          ...current,
          [actionKey]: true,
        })
      );

      setSuccess(
        `"${action.title}" was added to your Flight Plan.`
      );
    } catch (err) {
      console.error(
        "Could not add roadmap action:",
        err
      );

      setError(
        err.message ||
          "Could not add this action to your Flight Plan."
      );
    } finally {
      setAddingAction("");
    }
  }

  /* ======================================================
     LOADING STATE
  ====================================================== */

  if (loading) {
    return (
      <main className="dashboard-page">
        <DashboardNav />

        <section className="dashboard-header">
          <p>
            Loading your roadmap...
          </p>
        </section>
      </main>
    );
  }

  /* ======================================================
     PAGE
  ====================================================== */

  return (
    <main className="dashboard-page">
      <DashboardNav />

      {/* HEADER */}

      <section className="dashboard-header">
        <p className="card-label">
          AI CAREER ROADMAP
        </p>

        <h1>
          Turn your goal into a path.
        </h1>

        <p>
          AeroPath analyzes the
          information you approved in
          your profile and turns it into
          practical priorities and next
          actions.
        </p>
      </section>

      {/* GENERATOR */}

      <section className="roadmap-generator-card">
        <div>
          <p className="card-label">
            FLIGHT PATH
          </p>

          <h2>
            {roadmap
              ? "Your roadmap is active."
              : "Build your first roadmap."}
          </h2>

          <p>
            Refresh your roadmap whenever
            your skills, coursework,
            projects, experience, or
            goals change.
          </p>
        </div>

        <button
          type="button"
          onClick={
            handleGenerateRoadmap
          }
          disabled={
            generating
          }
        >
          {generating
            ? "Building Roadmap..."
            : roadmap
              ? "Refresh Roadmap"
              : "Generate My Roadmap"}
        </button>
      </section>

      {/* FEEDBACK */}

      {error && (
        <p className="auth-error">
          {error}
        </p>
      )}

      {success && (
        <p className="auth-success">
          {success}
        </p>
      )}

      {/* EMPTY */}

      {!roadmap ? (
        <section className="empty-missions roadmap-empty">
          <h3>
            Your flight path has not
            been generated yet.
          </h3>

          <p>
            Generate your roadmap to
            identify priorities, gaps,
            and concrete next actions.
          </p>
        </section>
      ) : (
        <section className="roadmap-content">

          {/* TRAJECTORY */}

          <article className="roadmap-overview-card">
            <p className="card-label">
              PRIMARY TRAJECTORY
            </p>

            <h2>
              {roadmap.careerGoal}
            </h2>

            <p>
              {roadmap.summary}
            </p>
          </article>

          {/* PRIORITIES */}

          <div className="roadmap-section-heading">
            <p className="card-label">
              PRIORITIES
            </p>

            <h2>
              What matters most right
              now
            </h2>
          </div>

          <div className="roadmap-priority-grid">
            {roadmap.priorities?.map(
              (
                priority,
                index
              ) => (
                <article
                  className="roadmap-priority-card"
                  key={`${priority.title}-${index}`}
                >
                  <span className="roadmap-number">
                    {String(
                      index + 1
                    ).padStart(
                      2,
                      "0"
                    )}
                  </span>

                  <p className="card-label">
                    {
                      priority.timeframe
                    }
                  </p>

                  <h3>
                    {
                      priority.title
                    }
                  </h3>

                  <p>
                    {
                      priority.reason
                    }
                  </p>
                </article>
              )
            )}
          </div>

          {/* GAPS */}

          <div className="roadmap-section-heading">
            <p className="card-label">
              DEVELOPMENT GAPS
            </p>

            <h2>
              What could strengthen your
              trajectory
            </h2>
          </div>

          <div className="roadmap-gap-list">
            {roadmap.gaps?.map(
              (
                gap,
                index
              ) => (
                <article
                  className="roadmap-gap-card"
                  key={`${gap.title}-${index}`}
                >
                  <div>
                    <span
                      className={`roadmap-priority-badge ${gap.importance}`}
                    >
                      {
                        gap.importance
                      }
                    </span>

                    <h3>
                      {gap.title}
                    </h3>
                  </div>

                  <p>
                    {
                      gap.explanation
                    }
                  </p>
                </article>
              )
            )}
          </div>

          {/* ACTIONS */}

          <div className="roadmap-section-heading">
            <p className="card-label">
              NEXT ACTIONS
            </p>

            <h2>
              Your next moves
            </h2>
          </div>

          <div className="roadmap-action-list">
            {roadmap.nextActions?.map(
              (
                action,
                index
              ) => {
                const actionKey =
                  createActionKey(
                    action.title
                  );

                const alreadyAdded =
                  Boolean(
                    addedActions[
                      actionKey
                    ]
                  );

                const isAdding =
                  addingAction ===
                  actionKey;

                return (
                  <article
                    className="roadmap-action-card"
                    key={`${action.title}-${index}`}
                  >
                    <div className="roadmap-action-main">
                      <span className="roadmap-action-category">
                        {
                          action.category
                        }
                      </span>

                      <h3>
                        {
                          action.title
                        }
                      </h3>

                      <p>
                        {
                          action.description
                        }
                      </p>
                    </div>

                    <div className="roadmap-action-timeline">
                      <span>
                        TARGET
                      </span>

                      <strong>
                        {
                          action.suggestedDays
                        }{" "}
                        days
                      </strong>

                      <button
                        type="button"
                        className="roadmap-add-mission-button"
                        disabled={
                          isAdding ||
                          alreadyAdded
                        }
                        onClick={() =>
                          addActionToFlightPlan(
                            action
                          )
                        }
                      >
                        {alreadyAdded
                          ? "Added ✓"
                          : isAdding
                            ? "Adding..."
                            : "Add to Flight Plan"}
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        </section>
      )}
    </main>
  );
}

export default Roadmap;