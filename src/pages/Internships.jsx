import { useEffect, useRef, useState } from "react";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import DashboardNav from "../components/DashboardNav";

import {
  fetchLiveOpportunities,
} from "../services/opportunitySource";

import {
  scoreOpportunities,
} from "../services/opportunityMatchingAI";

const BATCH_SIZE = 5;
const MAX_SCAN_OPPORTUNITIES = 15;

function Internships() {
  const scanningLocked = useRef(false);

  const [opportunities, setOpportunities] =
    useState([]);

  const [viewFilter, setViewFilter] =
    useState("all");

    const [searchTerm, setSearchTerm] =
  useState("");

const [locationFilter, setLocationFilter] =
  useState("");

const [dateFilter, setDateFilter] =
  useState("any");

const [workSettingFilter, setWorkSettingFilter] =
  useState("any");

const [jobTypeFilter, setJobTypeFilter] =
  useState("any");

const [experienceFilter, setExperienceFilter] =
  useState("any");

const [companyFilter, setCompanyFilter] =
  useState("any");

const [matchFilter, setMatchFilter] =
  useState("any");

const [sortBy, setSortBy] =
  useState("best-match");

  const [loading, setLoading] =
    useState(true);

  const [scanning, setScanning] =
    useState(false);

  const [scanProgress, setScanProgress] =
    useState("");

  const [scanSuccess, setScanSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  /* ======================================================
     LIVE FIRESTORE MATCH LISTENER
  ====================================================== */

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    const matchesRef = collection(
      db,
      "users",
      user.uid,
      "opportunityMatches"
    );

    const unsubscribe = onSnapshot(
      matchesRef,

      (snapshot) => {
        const matches = snapshot.docs
          .map((matchDoc) => ({
            id: matchDoc.id,
            ...matchDoc.data(),
          }))
          .filter(
            (match) => !match.dismissed
          )
          .sort(
            (first, second) =>
              (second.matchScore || 0) -
              (first.matchScore || 0)
          );

        setOpportunities(matches);
        setLoading(false);
      },

      (err) => {
        console.error(
          "Opportunity listener failed:",
          err
        );

        setError(
          err.message ||
            "Could not load your opportunity matches."
        );

        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  /* ======================================================
     HELPERS
  ====================================================== */

  function makeSafeDocumentId(externalId) {
    return String(
      externalId || "opportunity"
    )
      .replaceAll("/", "_")
      .replaceAll("\\", "_")
      .slice(0, 500);
  }

  function createBatches(items, size) {
    const batches = [];

    for (
      let index = 0;
      index < items.length;
      index += size
    ) {
      batches.push(
        items.slice(
          index,
          index + size
        )
      );
    }

    return batches;
  }

  function normalizeScore(score) {
    const numericScore = Number(score);

    if (!Number.isFinite(numericScore)) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(numericScore)
      )
    );
  }

  /* ======================================================
     SCAN LIVE OPPORTUNITIES
  ====================================================== */

  async function removeStaleRadarMatches(
  userId,
  incomingExternalIds
) {
  const matchesRef = collection(
    db,
    "users",
    userId,
    "opportunityMatches"
  );

  const snapshot =
    await getDocs(matchesRef);

  const incomingIds =
    new Set(incomingExternalIds);

  const deleteTasks =
    snapshot.docs
      .filter((matchDoc) => {
        const data =
          matchDoc.data();

        const tracked =
          Boolean(data.saved) ||
          [
            "applied",
            "interview",
            "offer",
          ].includes(data.status);

        const stillInNewScan =
          incomingIds.has(
            data.externalId
          );

        return (
          !tracked &&
          !stillInNewScan
        );
      })
      .map((matchDoc) =>
        deleteDoc(matchDoc.ref)
      );

  await Promise.all(deleteTasks);
}

  async function scanOpportunities() {
    
    if (scanningLocked.current) {
      return;
    }

    scanningLocked.current = true;

    setScanning(true);
    setError("");
    setScanSuccess("");

    setScanProgress(
      "Loading your AeroPath profile..."
    );

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error(
          "You must be signed in to scan opportunities."
        );
      }

      /* ------------------------------
         1. LOAD PROFILE
      ------------------------------ */

      const profileRef = doc(
        db,
        "users",
        user.uid
      );

      const profileSnapshot =
        await getDoc(profileRef);

      if (!profileSnapshot.exists()) {
        throw new Error(
          "Complete your AeroPath profile before scanning opportunities."
        );
      }

      const profile =
        profileSnapshot.data();

      if (!profile.onboardingComplete) {
        throw new Error(
          "Finish onboarding before scanning opportunities."
        );
      }

      /* ------------------------------
         2. FETCH LIVE OPPORTUNITIES
      ------------------------------ */

      setScanProgress(
        "Searching live opportunity sources..."
      );

      const liveOpportunities =
        await fetchLiveOpportunities();

      const scanCandidates =
        liveOpportunities.slice(
          0,
          MAX_SCAN_OPPORTUNITIES
        );

      if (
        scanCandidates.length === 0
      ) {
        throw new Error(
          "No suitable student opportunities were available from the current source."
        );
      }

      /* ------------------------------
         3. AI MATCHING
      ------------------------------ */

      const batches =
        createBatches(
          scanCandidates,
          BATCH_SIZE
        );

      const allMatchResults = [];

      for (
        let batchIndex = 0;
        batchIndex < batches.length;
        batchIndex += 1
      ) {
        const batch =
          batches[batchIndex];

        const startingNumber =
          batchIndex * BATCH_SIZE + 1;

        const endingNumber =
          Math.min(
            (batchIndex + 1) *
              BATCH_SIZE,
            scanCandidates.length
          );

        setScanProgress(
          `Analyzing opportunities ${startingNumber}–${endingNumber} of ${scanCandidates.length}...`
        );

        const batchResults =
          await scoreOpportunities(
            profile,
            batch
          );

        allMatchResults.push(
          ...batchResults
        );
      }

      /* ------------------------------
         4. JOIN AI + LIVE DATA
      ------------------------------ */

      const opportunityLookup =
        new Map(
          scanCandidates.map(
            (opportunity) => [
              opportunity.externalId,
              opportunity,
            ]
          )
        );

      const matchesToSave =
        allMatchResults
          .map((match) => {
            const opportunity =
              opportunityLookup.get(
                match.externalId
              );

            if (!opportunity) {
              return null;
            }

            return {
              opportunity,

              match: {
                ...match,

                matchScore:
                  normalizeScore(
                    match.matchScore
                  ),
              },
            };
          })
.filter(Boolean)
.filter(
  ({ match }) =>
    match.matchScore > 0
)
.sort(
  (first, second) =>
    second.match.matchScore -
    first.match.matchScore
)
.slice(0, 10);

      if (
        matchesToSave.length === 0
      ) {
        setScanSuccess(
          "Scan complete. AeroPath did not find a strong enough match in this batch yet."
        );

        setScanProgress("");
        return;
      }

      /* ------------------------------
         5. SAVE MATCHES
      ------------------------------ */

      setScanProgress(
        `Saving ${matchesToSave.length} personalized matches...`
      );

      for (const {
        opportunity,
        match,
      } of matchesToSave) {
        const matchId =
          makeSafeDocumentId(
            opportunity.externalId
          );

        const matchRef = doc(
          db,
          "users",
          user.uid,
          "opportunityMatches",
          matchId
        );

        await setDoc(
          matchRef,

          {
            externalId:
              opportunity.externalId,

            source:
              opportunity.source,

            title:
              opportunity.title,

            company:
              opportunity.company,

            location:
              opportunity.location,

            remote:
              opportunity.remote,

            workType:
              opportunity.workType,

            description:
              opportunity.description,

            tags:
              opportunity.tags,

            applicationUrl:
              opportunity.applicationUrl,

            deadline:
              opportunity.deadline,

            sourcePublishedAt:
              opportunity.sourcePublishedAt,

            matchScore:
              match.matchScore,

            eligible:
              match.eligible,

            matchReason:
              match.matchReason || "",

            matchedSkills:
              Array.isArray(
                match.matchedSkills
              )
                ? match.matchedSkills
                : [],

            missingQualifications:
              Array.isArray(
                match.missingQualifications
              )
                ? match.missingQualifications
                : [],

            matchedAgainstProfileVersion:
              profile.updatedAt || null,

            lastScannedAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          },

          {
            merge: true,
          }
        );
      }

      setScanSuccess(
        `Radar updated with ${matchesToSave.length} personalized opportunities.`
      );

      setScanProgress("");
    } catch (err) {
      console.error(
        "AeroPath opportunity scan failed:",
        err
      );

      setError(
        err.message ||
          "AeroPath could not complete your opportunity scan."
      );

      setScanProgress("");
    } finally {
      scanningLocked.current = false;
      setScanning(false);
    }
  }

  /* ======================================================
     SAVE MATCH
  ====================================================== */

  async function toggleSaved(
    opportunity
  ) {
    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error(
          "You must be signed in."
        );
      }

      const opportunityRef = doc(
        db,
        "users",
        user.uid,
        "opportunityMatches",
        opportunity.id
      );

      await updateDoc(
        opportunityRef,
        {
          saved:
            !opportunity.saved,

          updatedAt:
            serverTimestamp(),
        }
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not save this opportunity."
      );
    }
  }

  /* ======================================================
     APPLICATION STATUS
  ====================================================== */

  async function updateApplicationStatus(
    opportunity,
    status
  ) {
    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error(
          "You must be signed in."
        );
      }

      const opportunityRef = doc(
        db,
        "users",
        user.uid,
        "opportunityMatches",
        opportunity.id
      );

      await updateDoc(
        opportunityRef,
        {
          status,

          updatedAt:
            serverTimestamp(),
        }
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not update application status."
      );
    }
  }

  /* ======================================================
     DISMISS MATCH
  ====================================================== */

  async function dismissOpportunity(
    opportunity
  ) {
    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error(
          "You must be signed in."
        );
      }

      const opportunityRef = doc(
        db,
        "users",
        user.uid,
        "opportunityMatches",
        opportunity.id
      );

      await updateDoc(
        opportunityRef,
        {
          dismissed: true,

          updatedAt:
            serverTimestamp(),
        }
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not dismiss this opportunity."
      );
    }
  }

  /* ======================================================
     STATS
  ====================================================== */

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  const strongMatches =
    opportunities.filter(
      (opportunity) =>
        (opportunity.matchScore || 0) >=
        80
    ).length;

  const savedMatches =
    opportunities.filter(
      (opportunity) =>
        opportunity.saved
    ).length;

  const closingSoon =
    opportunities.filter(
      (opportunity) => {
        if (!opportunity.deadline) {
          return false;
        }

        const deadline = new Date(
          `${opportunity.deadline}T23:59:59`
        );

        const currentDate =
          new Date();

        const sevenDaysFromNow =
          new Date();

        sevenDaysFromNow.setDate(
          currentDate.getDate() + 7
        );

        return (
          deadline >= currentDate &&
          deadline <=
            sevenDaysFromNow
        );
      }
    ).length;

  /* ======================================================
     FILTERS
  ====================================================== */

function parseOpportunityDate(value) {
  if (!value) return null;

  if (
    typeof value === "number" ||
    /^\d+$/.test(String(value))
  ) {
    const numericValue = Number(value);

    const milliseconds =
      numericValue < 1000000000000
        ? numericValue * 1000
        : numericValue;

    const date =
      new Date(milliseconds);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function getWorkSetting(opportunity) {
  if (opportunity.remote) {
    return "remote";
  }

  const value =
    String(
      opportunity.workType || ""
    ).toLowerCase();

  if (
    value.includes("hybrid") &&
    !value.includes("not specified")
  ) {
    return "hybrid";
  }

  if (
    value.includes("on-site") ||
    value.includes("onsite")
  ) {
    return "onsite";
  }

  return "unknown";
}

function getJobType(opportunity) {
  const value = `
    ${opportunity.employmentType || ""}
    ${opportunity.title || ""}
  `.toLowerCase();

  if (
    value.includes("intern")
  ) {
    return "internship";
  }

  if (
    value.includes("co-op") ||
    value.includes("coop")
  ) {
    return "coop";
  }

  if (
    value.includes("part-time") ||
    value.includes("part time")
  ) {
    return "part-time";
  }

  if (
    value.includes("full-time") ||
    value.includes("full time")
  ) {
    return "full-time";
  }

  return "unknown";
}

function getExperienceLevel(
  opportunity
) {
  const title =
    String(
      opportunity.title || ""
    ).toLowerCase();

  const seniority =
    Array.isArray(
      opportunity.seniority
    )
      ? opportunity.seniority
          .join(" ")
          .toLowerCase()
      : "";

  if (
    title.includes("intern") ||
    title.includes("student") ||
    title.includes("graduate") ||
    title.includes("new grad") ||
    title.includes("co-op")
  ) {
    return "student";
  }

  if (
    seniority.includes(
      "entry-level"
    ) ||
    seniority.includes(
      "entry level"
    ) ||
    title.includes("junior")
  ) {
    return "entry";
  }

  return "unknown";
}

const companyOptions = [
  ...new Set(
    opportunities
      .map(
        (opportunity) =>
          opportunity.company
      )
      .filter(Boolean)
  ),
].sort();

function clearOpportunityFilters() {
  setSearchTerm("");
  setLocationFilter("");
  setDateFilter("any");
  setWorkSettingFilter("any");
  setJobTypeFilter("any");
  setExperienceFilter("any");
  setCompanyFilter("any");
  setMatchFilter("any");
  setSortBy("best-match");
}

const filteredOpportunities =
  opportunities
    .filter((opportunity) => {
      /* APPLICATION PIPELINE */

      if (
        viewFilter === "saved" &&
        !opportunity.saved
      ) {
        return false;
      }

      if (
        viewFilter === "applied" &&
        opportunity.status !==
          "applied"
      ) {
        return false;
      }

      if (
        viewFilter === "interview" &&
        opportunity.status !==
          "interview"
      ) {
        return false;
      }

      if (
        viewFilter === "offer" &&
        opportunity.status !==
          "offer"
      ) {
        return false;
      }

      /* SEARCH */

      const searchableText = `
        ${opportunity.title || ""}
        ${opportunity.company || ""}
        ${opportunity.description || ""}
        ${
          Array.isArray(
            opportunity.tags
          )
            ? opportunity.tags.join(" ")
            : ""
        }
      `.toLowerCase();

      if (
        searchTerm.trim() &&
        !searchableText.includes(
          searchTerm
            .trim()
            .toLowerCase()
        )
      ) {
        return false;
      }

      /* LOCATION */

      if (
        locationFilter.trim() &&
        !String(
          opportunity.location || ""
        )
          .toLowerCase()
          .includes(
            locationFilter
              .trim()
              .toLowerCase()
          )
      ) {
        return false;
      }

      /* DATE POSTED */

      if (dateFilter !== "any") {
        const publishedDate =
          parseOpportunityDate(
            opportunity.sourcePublishedAt
          );

        if (!publishedDate) {
          return false;
        }

        const ageMilliseconds =
          Date.now() -
          publishedDate.getTime();

        const ageDays =
          ageMilliseconds /
          (1000 * 60 * 60 * 24);

        if (
          ageDays >
          Number(dateFilter)
        ) {
          return false;
        }
      }

      /* WORK SETTING */

      if (
        workSettingFilter !==
          "any" &&
        getWorkSetting(
          opportunity
        ) !== workSettingFilter
      ) {
        return false;
      }

      /* JOB TYPE */

      if (
        jobTypeFilter !== "any" &&
        getJobType(
          opportunity
        ) !== jobTypeFilter
      ) {
        return false;
      }

      /* EXPERIENCE */

      if (
        experienceFilter !==
          "any" &&
        getExperienceLevel(
          opportunity
        ) !== experienceFilter
      ) {
        return false;
      }

      /* COMPANY */

      if (
        companyFilter !== "any" &&
        opportunity.company !==
          companyFilter
      ) {
        return false;
      }

      /* MATCH */

      if (
        matchFilter !== "any" &&
        (opportunity.matchScore ||
          0) <
          Number(matchFilter)
      ) {
        return false;
      }

      return true;
    })
    .sort((first, second) => {
      if (
        sortBy === "newest"
      ) {
        const firstDate =
          parseOpportunityDate(
            first.sourcePublishedAt
          );

        const secondDate =
          parseOpportunityDate(
            second.sourcePublishedAt
          );

        return (
          (secondDate?.getTime() ||
            0) -
          (firstDate?.getTime() ||
            0)
        );
      }

      if (
        sortBy ===
        "deadline-soon"
      ) {
        if (
          !first.deadline &&
          !second.deadline
        ) {
          return 0;
        }

        if (!first.deadline) {
          return 1;
        }

        if (!second.deadline) {
          return -1;
        }

        return (
          new Date(
            first.deadline
          ) -
          new Date(
            second.deadline
          )
        );
      }

      if (
        sortBy ===
        "fewest-gaps"
      ) {
        return (
          (first
            .missingQualifications
            ?.length || 0) -
          (second
            .missingQualifications
            ?.length || 0)
        );
      }

      /* BEST MATCH */

      return (
        (second.matchScore || 0) -
        (first.matchScore || 0)
      );
    });

  /* ======================================================
     PAGE
  ====================================================== */

  return (
    <main className="dashboard-page">
      <DashboardNav />

      {/* HEADER */}

      <section className="dashboard-header">
        <p className="card-label">
          AI OPPORTUNITY RADAR
        </p>

        <h1>
          Opportunities selected for you.
        </h1>

        <p>
          AeroPath compares live
          opportunities against the
          academic record, skills,
          projects, experience, and goals
          you approved in your profile.
        </p>
      </section>

      {/* STATS */}

      <section className="internship-stats">
        <div className="stat-card">
          <p className="card-label">
            MATCHES
          </p>

          <h2>
            {opportunities.length}
          </h2>
        </div>

        <div className="stat-card">
          <p className="card-label">
            STRONG MATCHES
          </p>

          <h2>
            {strongMatches}
          </h2>
        </div>

        <div className="stat-card">
          <p className="card-label">
            CLOSING SOON
          </p>

          <h2>
            {closingSoon}
          </h2>
        </div>

        <div className="stat-card">
          <p className="card-label">
            SAVED
          </p>

          <h2>
            {savedMatches}
          </h2>
        </div>
      </section>

      {/* RADAR */}

      <section className="opportunity-radar-card">
        <div>
          <p className="card-label">
            PERSONALIZED SEARCH
          </p>

          <h2>
            Your radar is active.
          </h2>

          <p>
            Run a scan whenever your
            coursework, projects, skills,
            or career goals change.
          </p>

          {scanProgress && (
            <p className="radar-scan-progress">
              {scanProgress}
            </p>
          )}

          {scanSuccess && (
            <p className="auth-success">
              {scanSuccess}
            </p>
          )}
        </div>

        <div className="radar-controls">
          <div className="radar-status">
            <span className="radar-pulse" />

            {scanning
              ? "Scanning"
              : "AI matching ready"}
          </div>

          <button
            type="button"
            className="radar-scan-button"
            onClick={
              scanOpportunities
            }
            disabled={scanning}
          >
            {scanning
              ? "Scanning Opportunities..."
              : "Scan My Opportunities"}
          </button>
        </div>
      </section>

      {/* MATCHES */}

      <section className="internships-list-section">
        <div className="opportunity-list-heading">
<p className="card-label">
  OPPORTUNITY RADAR
</p>

<h2>
  Opportunity Feed
</h2>

<div className="opportunity-search-panel">
  <div className="opportunity-search-main">
    <input
      type="text"
      value={searchTerm}
      onChange={(event) =>
        setSearchTerm(event.target.value)
      }
      placeholder="Search roles, companies, skills..."
    />

    <input
      type="text"
      value={locationFilter}
      onChange={(event) =>
        setLocationFilter(event.target.value)
      }
      placeholder="Location"
    />
  </div>

  <div className="opportunity-filter-controls">
    <select
      value={dateFilter}
      onChange={(event) =>
        setDateFilter(event.target.value)
      }
    >
      <option value="any">Date Posted</option>
      <option value="1">Past 24 hours</option>
      <option value="3">Past 3 days</option>
      <option value="7">Past 7 days</option>
      <option value="14">Past 14 days</option>
      <option value="30">Past 30 days</option>
    </select>

    <select
      value={workSettingFilter}
      onChange={(event) =>
        setWorkSettingFilter(event.target.value)
      }
    >
      <option value="any">Work Setting</option>
      <option value="remote">Remote</option>
      <option value="hybrid">Hybrid</option>
      <option value="onsite">On-site</option>
    </select>

    <select
      value={jobTypeFilter}
      onChange={(event) =>
        setJobTypeFilter(event.target.value)
      }
    >
      <option value="any">Job Type</option>
      <option value="internship">Internship</option>
      <option value="coop">Co-op</option>
      <option value="part-time">Part-time</option>
      <option value="full-time">Full-time</option>
    </select>

    <select
      value={experienceFilter}
      onChange={(event) =>
        setExperienceFilter(event.target.value)
      }
    >
      <option value="any">Experience</option>
      <option value="student">Student / Intern</option>
      <option value="entry">Entry-level</option>
    </select>

    <select
      value={companyFilter}
      onChange={(event) =>
        setCompanyFilter(event.target.value)
      }
    >
      <option value="any">Company</option>

      {companyOptions.map((company) => (
        <option key={company} value={company}>
          {company}
        </option>
      ))}
    </select>

    <select
      value={matchFilter}
      onChange={(event) =>
        setMatchFilter(event.target.value)
      }
    >
      <option value="any">Match Score</option>
      <option value="50">50%+ Match</option>
      <option value="70">70%+ Match</option>
      <option value="80">80%+ Match</option>
      <option value="90">90%+ Match</option>
    </select>

    <select
      value={sortBy}
      onChange={(event) =>
        setSortBy(event.target.value)
      }
    >
      <option value="best-match">
        Sort: Best Match
      </option>

      <option value="newest">
        Sort: Newest
      </option>

      <option value="deadline-soon">
        Sort: Deadline Soon
      </option>

      <option value="fewest-gaps">
        Sort: Fewest Gaps
      </option>
    </select>

    <button
      type="button"
      className="clear-opportunity-filters"
      onClick={clearOpportunityFilters}
    >
      Clear
    </button>
  </div>
</div>

<div className="opportunity-feed-meta">
  {filteredOpportunities.length} opportunities
</div>

          <div className="opportunity-tracking-tabs">
      {[
        ["all", "All"],
        ["saved", "Saved"],
        ["applied", "Applied"],
        ["interview", "Interviews"],
        ["offer", "Offers"],
      ].map(
              ([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={
                    viewFilter === value
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setViewFilter(
                      value
                    )
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>

        {error && (
          <p className="auth-error">
            {error}
          </p>
        )}

        {loading ? (
          <div className="empty-missions">
            <h3>
              Loading your opportunity
              radar...
            </h3>

            <p>
              AeroPath is restoring your
              personalized matches.
            </p>
          </div>
        ) : opportunities.length ===
          0 ? (
          <div className="empty-missions">
            <h3>
              Your radar is ready for its
              first scan.
            </h3>

            <p>
              Run a scan to compare your
              approved AeroPath profile
              against live student
              opportunities.
            </p>
          </div>
        ) : filteredOpportunities.length ===
          0 ? (
          <div className="empty-missions">
            <h3>
              No matches in this view.
            </h3>

            <p>
              Try another filter or scan
              for new opportunities.
            </p>
          </div>
        ) : (
          <div className="internships-grid">
            {filteredOpportunities.map(
              (opportunity) => {
                const deadlinePassed =
                  opportunity.deadline &&
                  opportunity.deadline <
                    today;

                return (
                  <article
                    className="internship-card"
                    key={opportunity.id}
                  >
                    {/* CARD HEADER */}

                    <div className="internship-card-heading">
                      <div>
                        <p className="card-label">
                          {opportunity.source ||
                            "COMPANY CAREERS"}
                        </p>

                        <h3>
                          {
                            opportunity.title
                          }
                        </h3>

                        <p className="opportunity-company">
                          {
                            opportunity.company
                          }
                        </p>
                      </div>

                      <div className="match-score">
                        <strong>
                          {opportunity.matchScore ||
                            0}
                          %
                        </strong>

                        <span>
                          match
                        </span>
                      </div>
                    </div>

                    {/* META */}

                    <div className="internship-meta">
                      <span>
                        {opportunity.location ||
                          "Location not listed"}
                      </span>

                      <span>
                        {opportunity.workType ||
                          "Work type not listed"}
                      </span>

                      {opportunity.deadline && (
                        <span>
                          Deadline{" "}
                          {
                            opportunity.deadline
                          }
                        </span>
                      )}
                    </div>

                    {deadlinePassed && (
                      <span className="overdue-badge">
                        Deadline passed
                      </span>
                    )}

                    {/* MATCH REASON */}

                    {opportunity.matchReason && (
                      <div className="match-reason">
                        <p className="card-label">
                          WHY AEROPATH MATCHED
                          YOU
                        </p>

                        <p>
                          {
                            opportunity.matchReason
                          }
                        </p>
                      </div>
                    )}

                    {/* MATCHED SKILLS */}

                    {opportunity
                      .matchedSkills
                      ?.length > 0 && (
                      <div className="opportunity-skills">
                        {opportunity.matchedSkills.map(
                          (skill) => (
                            <span
                              key={skill}
                            >
                              {skill}
                            </span>
                          )
                        )}
                      </div>
                    )}

                    {/* POSSIBLE GAPS */}

                    {opportunity
                      .missingQualifications
                      ?.length > 0 && (
                      <div className="qualification-gaps">
                        <p className="card-label">
                          POSSIBLE GAPS
                        </p>

                        {opportunity.missingQualifications.map(
                          (gap) => (
                            <p key={gap}>
                              △ {gap}
                            </p>
                          )
                        )}
                      </div>
                    )}

                    {/* APPLICATION STATUS */}

                    <div className="application-status-control">
                      <label>
                        APPLICATION STATUS

                        <select
                          value={
                            opportunity.status ||
                            "recommended"
                          }
                          onChange={(
                            event
                          ) =>
                            updateApplicationStatus(
                              opportunity,
                              event.target
                                .value
                            )
                          }
                        >
                          <option value="recommended">
                            Recommended
                          </option>

                          <option value="applied">
                            Applied
                          </option>

                          <option value="interview">
                            Interview
                          </option>

                          <option value="offer">
                            Offer
                          </option>

                          <option value="rejected">
                            Rejected
                          </option>
                        </select>
                      </label>
                    </div>

                    {/* ACTIONS */}

                    <div className="internship-actions">
                      {opportunity.applicationUrl && (
                        <a
                          className="primary-button"
                          href={
                            opportunity.applicationUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          View Opportunity
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          toggleSaved(
                            opportunity
                          )
                        }
                      >
                        {opportunity.saved
                          ? "Saved"
                          : "Save Match"}
                      </button>

                      <button
                        type="button"
                        className="dismiss-opportunity-button"
                        onClick={() =>
                          dismissOpportunity(
                            opportunity
                          )
                        }
                      >
                        Not Interested
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default Internships;