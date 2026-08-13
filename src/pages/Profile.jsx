import { useEffect, useRef, useState } from "react";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import DashboardNav from "../components/DashboardNav";

function Profile() {
  const savingLocked = useRef(false);

  const [formData, setFormData] = useState({
    fullName: "",
    college: "",
    major: "",
    academicLevel: "",
    graduationYear: "",

    gpaScale: "4",
    currentGpa: "",
    previousGpa: "",

    currentClasses: "",
    completedClasses: "",

    skills: "",
    certifications: "",

    schoolProjects: "",
    personalProjects: "",
    experience: "",

    awards: "",
    scholarships: "",
    competitions: "",
    publications: "",
    honors: "",

    dreamCareer: "",
    careerGoals: "",
    targetRoles: "",
    preferredIndustries: "",
    preferredLocations: "",
    workPreferences: [],
  });

  const [selectedDocuments, setSelectedDocuments] = useState({
    resume: null,
    transcript: null,
    credentials: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function listToText(value) {
    if (Array.isArray(value)) {
      return value.join("\n");
    }

    if (typeof value === "string") {
      return value;
    }

    return "";
  }

  function textToList(value) {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function hasText(value) {
    return Boolean(value && value.trim());
  }

  function updateField(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function toggleWorkPreference(preference) {
    setFormData((current) => {
      const alreadySelected =
        current.workPreferences.includes(preference);

      return {
        ...current,
        workPreferences: alreadySelected
          ? current.workPreferences.filter(
              (item) => item !== preference
            )
          : [...current.workPreferences, preference],
      };
    });
  }

  function handleDocumentSelection(type, event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    const allowedExtension =
      file.name.toLowerCase().endsWith(".pdf") ||
      file.name.toLowerCase().endsWith(".doc") ||
      file.name.toLowerCase().endsWith(".docx") ||
      file.name.toLowerCase().endsWith(".txt");

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtension
    ) {
      setError(
        "Upload a PDF, DOC, DOCX, or TXT document."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("Documents must be 20 MB or smaller.");
      event.target.value = "";
      return;
    }

    setError("");

    setSelectedDocuments((current) => ({
      ...current,
      [type]: file,
    }));
  }

  function removeSelectedDocument(type) {
    setSelectedDocuments((current) => ({
      ...current,
      [type]: null,
    }));
  }

  useEffect(() => {
    async function loadProfile() {
      try {
        const user = auth.currentUser;

        if (!user) {
          throw new Error("You must be signed in.");
        }

        const profileRef = doc(db, "users", user.uid);
        const profileSnapshot = await getDoc(profileRef);

        if (!profileSnapshot.exists()) {
          throw new Error(
            "Your AeroPath profile could not be found."
          );
        }

        const data = profileSnapshot.data();

        setFormData({
          fullName: data.fullName || "",
          college: data.college || "",
          major: data.major || "",
          academicLevel: data.academicLevel || "",

          graduationYear:
            data.graduationYear?.toString() || "",

          gpaScale:
            data.gpa?.scale?.toString() || "4",

          currentGpa:
            data.gpa?.current !== null &&
            data.gpa?.current !== undefined
              ? data.gpa.current.toString()
              : "",

          previousGpa:
            data.gpa?.previous !== null &&
            data.gpa?.previous !== undefined
              ? data.gpa.previous.toString()
              : "",

          currentClasses: listToText(
            data.coursework?.current
          ),

          completedClasses: listToText(
            data.coursework?.completed
          ),

          skills: listToText(data.skills),

          certifications: listToText(
            data.certifications
          ),

          schoolProjects: listToText(
            data.projects?.school
          ),

          personalProjects: listToText(
            data.projects?.personal
          ),

          experience: listToText(data.experience),

          awards: listToText(
            data.achievements?.awards
          ),

          scholarships: listToText(
            data.achievements?.scholarships
          ),

          competitions: listToText(
            data.achievements?.competitions
          ),

          publications: listToText(
            data.achievements?.publications
          ),

          honors: listToText(
            data.achievements?.honors
          ),

          dreamCareer:
            data.career?.dreamCareer ||
            data.dreamCareer ||
            "",

          careerGoals:
            data.career?.goals || "",

          targetRoles: listToText(
            data.career?.targetRoles
          ),

          preferredIndustries: listToText(
            data.career?.preferredIndustries
          ),

          preferredLocations: listToText(
            data.career?.preferredLocations
          ),

          workPreferences: Array.isArray(
            data.career?.workPreferences
          )
            ? data.career.workPreferences
            : [],
        });
      } catch (err) {
        setError(
          err.message || "Could not load your profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function validateProfile() {
    const year = Number(formData.graduationYear);
    const gpaScale = Number(formData.gpaScale);

    const currentGpa =
      formData.currentGpa === ""
        ? null
        : Number(formData.currentGpa);

    const previousGpa =
      formData.previousGpa === ""
        ? null
        : Number(formData.previousGpa);

    if (formData.fullName.trim().length < 2) {
      setError("Enter your full name.");
      return false;
    }

    if (!formData.college.trim()) {
      setError("Enter your college or university.");
      return false;
    }

    if (!formData.major.trim()) {
      setError("Enter your major.");
      return false;
    }

    if (!formData.academicLevel) {
      setError("Select your academic level.");
      return false;
    }

    if (
      !Number.isInteger(year) ||
      year < 2026 ||
      year > 2100
    ) {
      setError("Enter a valid graduation year.");
      return false;
    }

    if (
      currentGpa !== null &&
      (!Number.isFinite(currentGpa) ||
        currentGpa < 0 ||
        currentGpa > gpaScale)
    ) {
      setError(
        `Current GPA must be between 0 and ${gpaScale}.`
      );
      return false;
    }

    if (
      previousGpa !== null &&
      (!Number.isFinite(previousGpa) ||
        previousGpa < 0 ||
        previousGpa > gpaScale)
    ) {
      setError(
        `Previous GPA must be between 0 and ${gpaScale}.`
      );
      return false;
    }

    if (!formData.dreamCareer.trim()) {
      setError("Enter your primary career goal.");
      return false;
    }

    if (textToList(formData.targetRoles).length === 0) {
      setError("Enter at least one target role.");
      return false;
    }

    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (savingLocked.current) return;

    setError("");
    setSuccess("");

    if (!validateProfile()) return;

    savingLocked.current = true;
    setSaving(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const currentGpa =
        formData.currentGpa === ""
          ? null
          : Number(formData.currentGpa);

      const previousGpa =
        formData.previousGpa === ""
          ? null
          : Number(formData.previousGpa);

      const profileRef = doc(db, "users", user.uid);

      await updateDoc(profileRef, {
        fullName: formData.fullName.trim(),
        college: formData.college.trim(),
        major: formData.major.trim(),
        academicLevel: formData.academicLevel,

        graduationYear: Number(
          formData.graduationYear
        ),

        "gpa.scale": Number(formData.gpaScale),
        "gpa.current": currentGpa,
        "gpa.previous": previousGpa,

        "coursework.current": textToList(
          formData.currentClasses
        ),

        "coursework.completed": textToList(
          formData.completedClasses
        ),

        skills: textToList(formData.skills),

        certifications: textToList(
          formData.certifications
        ),

        "projects.school": textToList(
          formData.schoolProjects
        ),

        "projects.personal": textToList(
          formData.personalProjects
        ),

        experience: textToList(
          formData.experience
        ),

        "achievements.awards": textToList(
          formData.awards
        ),

        "achievements.scholarships": textToList(
          formData.scholarships
        ),

        "achievements.competitions": textToList(
          formData.competitions
        ),

        "achievements.publications": textToList(
          formData.publications
        ),

        "achievements.honors": textToList(
          formData.honors
        ),

        "career.dreamCareer":
          formData.dreamCareer.trim(),

        "career.goals":
          formData.careerGoals.trim(),

        "career.targetRoles": textToList(
          formData.targetRoles
        ),

        "career.preferredIndustries": textToList(
          formData.preferredIndustries
        ),

        "career.preferredLocations": textToList(
          formData.preferredLocations
        ),

        "career.workPreferences":
          formData.workPreferences,

        profileDataSource: "user-provided",
        updatedAt: serverTimestamp(),
      });

      setSuccess(
        "Flight record updated. AeroPath will use your latest approved information for future opportunity matching."
      );
    } catch (err) {
      setError(
        err.message || "Could not update your profile."
      );
    } finally {
      savingLocked.current = false;
      setSaving(false);
    }
  }

  const completionChecks = [
    hasText(formData.fullName),
    hasText(formData.college),
    hasText(formData.major),
    hasText(formData.academicLevel),
    hasText(formData.graduationYear),
    hasText(formData.currentGpa),
    hasText(formData.currentClasses) ||
      hasText(formData.completedClasses),
    hasText(formData.skills),
    hasText(formData.schoolProjects) ||
      hasText(formData.personalProjects),
    hasText(formData.experience),
    hasText(formData.certifications),
    hasText(formData.awards) ||
      hasText(formData.scholarships) ||
      hasText(formData.competitions) ||
      hasText(formData.publications) ||
      hasText(formData.honors),
    hasText(formData.dreamCareer),
    hasText(formData.careerGoals),
    hasText(formData.targetRoles),
    hasText(formData.preferredIndustries),
    hasText(formData.preferredLocations),
    formData.workPreferences.length > 0,
  ];

  const completedChecks = completionChecks.filter(
    Boolean
  ).length;

  const profileStrength = Math.round(
    (completedChecks / completionChecks.length) * 100
  );

  if (loading) {
    return (
      <main className="auth-page">
        <p>Loading your flight record...</p>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <DashboardNav />

      <section className="dashboard-header profile-hero">
        <div>
          <p className="card-label">FLIGHT RECORD</p>

          <h1>
            {formData.fullName
              ? formData.fullName
              : "Your Profile"}
          </h1>

          <p>
            Your academic record, capabilities, achievements,
            and career trajectory in one place.
          </p>
        </div>

        <div className="profile-strength-card">
          <div className="profile-strength-heading">
            <div>
              <p className="card-label">
                PROFILE STRENGTH
              </p>

              <strong>{profileStrength}%</strong>
            </div>
          </div>

          <div className="profile-strength-track">
            <div
              className="profile-strength-fill"
              style={{
                width: `${profileStrength}%`,
              }}
            />
          </div>

          <p>
            More complete profiles produce stronger opportunity
            matches.
          </p>
        </div>
      </section>

      <section className="profile-form-card">
        <form onSubmit={handleSubmit}>

          <div className="profile-section">
            <div className="profile-section-heading">
              <div>
                <p className="card-label">
                  ACADEMIC POSITION
                </p>

                <h2>Education</h2>
              </div>

              <span className="profile-section-number">
                01
              </span>
            </div>

            <div className="profile-field-grid">
              <label>
                Full name
                <input
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={updateField}
                  disabled={saving}
                  required
                />
              </label>

              <label>
                College or university
                <input
                  name="college"
                  type="text"
                  value={formData.college}
                  onChange={updateField}
                  placeholder="University of Michigan"
                  disabled={saving}
                  required
                />
              </label>

              <label>
                Major
                <input
                  name="major"
                  type="text"
                  value={formData.major}
                  onChange={updateField}
                  placeholder="Aerospace Engineering"
                  disabled={saving}
                  required
                />
              </label>

              <label>
                Academic level
                <select
                  name="academicLevel"
                  value={formData.academicLevel}
                  onChange={updateField}
                  disabled={saving}
                  required
                >
                  <option value="">
                    Select your level
                  </option>

                  <option value="First-year">
                    First-year
                  </option>

                  <option value="Sophomore">
                    Sophomore
                  </option>

                  <option value="Junior">
                    Junior
                  </option>

                  <option value="Senior">
                    Senior
                  </option>

                  <option value="Graduate">
                    Graduate student
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </label>

              <label>
                Expected graduation year
                <input
                  name="graduationYear"
                  type="number"
                  value={formData.graduationYear}
                  onChange={updateField}
                  min="2026"
                  max="2100"
                  disabled={saving}
                  required
                />
              </label>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-heading">
              <div>
                <p className="card-label">
                  ACADEMIC RECORD
                </p>

                <h2>GPA & Coursework</h2>
              </div>

              <span className="profile-section-number">
                02
              </span>
            </div>

            <div className="profile-field-grid">
              <label>
                GPA scale
                <select
                  name="gpaScale"
                  value={formData.gpaScale}
                  onChange={updateField}
                  disabled={saving}
                >
                  <option value="4">
                    4.0 scale
                  </option>

                  <option value="5">
                    5.0 scale
                  </option>

                  <option value="100">
                    100-point scale
                  </option>
                </select>
              </label>

              <label>
                Current GPA
                <input
                  name="currentGpa"
                  type="number"
                  value={formData.currentGpa}
                  onChange={updateField}
                  min="0"
                  max={formData.gpaScale}
                  step="0.01"
                  placeholder="Optional"
                  disabled={saving}
                />
              </label>

              <label>
                Previous GPA
                <input
                  name="previousGpa"
                  type="number"
                  value={formData.previousGpa}
                  onChange={updateField}
                  min="0"
                  max={formData.gpaScale}
                  step="0.01"
                  placeholder="Optional"
                  disabled={saving}
                />
              </label>
            </div>

            <div className="profile-field-grid profile-field-grid-wide">
              <label>
                Current classes
                <textarea
                  name="currentClasses"
                  value={formData.currentClasses}
                  onChange={updateField}
                  rows={5}
                  placeholder="One course per line"
                  disabled={saving}
                />
              </label>

              <label>
                Completed relevant classes
                <textarea
                  name="completedClasses"
                  value={formData.completedClasses}
                  onChange={updateField}
                  rows={5}
                  placeholder="One course per line"
                  disabled={saving}
                />
              </label>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-heading">
              <div>
                <p className="card-label">
                  CAPABILITIES
                </p>

                <h2>Skills & Experience</h2>
              </div>

              <span className="profile-section-number">
                03
              </span>
            </div>

            <div className="profile-field-grid profile-field-grid-wide">
              <label>
                Skills
                <textarea
                  name="skills"
                  value={formData.skills}
                  onChange={updateField}
                  rows={5}
                  placeholder="C++, CAD, React, technical writing..."
                  disabled={saving}
                />
              </label>

              <label>
                Certifications
                <textarea
                  name="certifications"
                  value={formData.certifications}
                  onChange={updateField}
                  rows={5}
                  placeholder="One certification per line"
                  disabled={saving}
                />
              </label>

              <label>
                School projects
                <textarea
                  name="schoolProjects"
                  value={formData.schoolProjects}
                  onChange={updateField}
                  rows={6}
                  placeholder="Describe relevant school projects"
                  disabled={saving}
                />
              </label>

              <label>
                Personal projects
                <textarea
                  name="personalProjects"
                  value={formData.personalProjects}
                  onChange={updateField}
                  rows={6}
                  placeholder="Describe relevant personal projects"
                  disabled={saving}
                />
              </label>
            </div>

            <label className="profile-full-width-field">
              Work, volunteer, leadership, or research experience
              <textarea
                name="experience"
                value={formData.experience}
                onChange={updateField}
                rows={6}
                placeholder="One experience per line"
                disabled={saving}
              />
            </label>
          </div>

          <div className="profile-section">
            <div className="profile-section-heading">
              <div>
                <p className="card-label">
                  ACHIEVEMENTS
                </p>

                <h2>Recognition & Accolades</h2>
              </div>

              <span className="profile-section-number">
                04
              </span>
            </div>

            <p className="profile-section-description">
              Add accomplishments that help AeroPath understand
              the full strength of your background.
            </p>

            <div className="profile-field-grid profile-field-grid-wide">
              <label>
                Awards
                <textarea
                  name="awards"
                  value={formData.awards}
                  onChange={updateField}
                  rows={4}
                  placeholder="Academic awards, departmental recognition..."
                  disabled={saving}
                />
              </label>

              <label>
                Scholarships
                <textarea
                  name="scholarships"
                  value={formData.scholarships}
                  onChange={updateField}
                  rows={4}
                  placeholder="Scholarships or grants"
                  disabled={saving}
                />
              </label>

              <label>
                Competitions
                <textarea
                  name="competitions"
                  value={formData.competitions}
                  onChange={updateField}
                  rows={4}
                  placeholder="Hackathons, research competitions, engineering challenges..."
                  disabled={saving}
                />
              </label>

              <label>
                Publications or presentations
                <textarea
                  name="publications"
                  value={formData.publications}
                  onChange={updateField}
                  rows={4}
                  placeholder="Research publications, posters, conference presentations..."
                  disabled={saving}
                />
              </label>
            </div>

            <label className="profile-full-width-field">
              Honors & academic recognition
              <textarea
                name="honors"
                value={formData.honors}
                onChange={updateField}
                rows={4}
                placeholder="Dean's List, honor societies, academic distinctions..."
                disabled={saving}
              />
            </label>
          </div>

          <div className="profile-section document-intelligence-section">
            <div className="profile-section-heading">
              <div>
                <p className="card-label">
                  DOCUMENT INTELLIGENCE
                </p>

                <h2>Smart Import</h2>
              </div>

              <span className="profile-section-number">
                05
              </span>
            </div>

            <p className="profile-section-description">
              Select documents that AeroPath can eventually use
              to extract profile information for your review.
              Nothing from a document should enter your profile
              without your approval.
            </p>

            <div className="document-upload-grid">
              <article className="document-upload-card">
                <div className="document-upload-top">
                  <div>
                    <p className="card-label">
                      RESUME
                    </p>

                    <h3>Resume Intelligence</h3>
                  </div>

                  <span className="document-icon">
                    CV
                  </span>
                </div>

                <p>
                  Skills, projects, experience, leadership,
                  certifications, and achievements.
                </p>

                {selectedDocuments.resume ? (
                  <div className="selected-document">
                    <div>
                      <strong>
                        {selectedDocuments.resume.name}
                      </strong>

                      <span>
                        Ready for analysis
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeSelectedDocument("resume")
                      }
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="document-upload-button">
                    Choose Resume

                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(event) =>
                        handleDocumentSelection(
                          "resume",
                          event
                        )
                      }
                    />
                  </label>
                )}
              </article>

              <article className="document-upload-card">
                <div className="document-upload-top">
                  <div>
                    <p className="card-label">
                      TRANSCRIPT
                    </p>

                    <h3>Academic Record</h3>
                  </div>

                  <span className="document-icon">
                    TR
                  </span>
                </div>

                <p>
                  GPA, coursework, grades, academic standing,
                  and honors when explicitly listed.
                </p>

                {selectedDocuments.transcript ? (
                  <div className="selected-document">
                    <div>
                      <strong>
                        {selectedDocuments.transcript.name}
                      </strong>

                      <span>
                        Ready for analysis
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeSelectedDocument(
                          "transcript"
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="document-upload-button">
                    Choose Transcript

                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(event) =>
                        handleDocumentSelection(
                          "transcript",
                          event
                        )
                      }
                    />
                  </label>
                )}
              </article>

              <article className="document-upload-card">
                <div className="document-upload-top">
                  <div>
                    <p className="card-label">
                      CREDENTIALS
                    </p>

                    <h3>Other Recognition</h3>
                  </div>

                  <span className="document-icon">
                    +
                  </span>
                </div>

                <p>
                  Certificates, awards, scholarships,
                  publications, or other credentials.
                </p>

                {selectedDocuments.credentials ? (
                  <div className="selected-document">
                    <div>
                      <strong>
                        {selectedDocuments.credentials.name}
                      </strong>

                      <span>
                        Ready for analysis
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeSelectedDocument(
                          "credentials"
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="document-upload-button">
                    Choose Credential

                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(event) =>
                        handleDocumentSelection(
                          "credentials",
                          event
                        )
                      }
                    />
                  </label>
                )}
              </article>
            </div>

            <div className="document-intelligence-notice">
              <p className="card-label">
                REVIEW BEFORE IMPORT
              </p>

              <p>
                Document AI is not connected yet. These files
                currently remain selected only in your browser
                and are not uploaded or saved. The next build
                step will analyze them and show the extracted
                information for approval before changing the
                profile.
              </p>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-heading">
              <div>
                <p className="card-label">
                  CAREER TRAJECTORY
                </p>

                <h2>Goals & Preferences</h2>
              </div>

              <span className="profile-section-number">
                06
              </span>
            </div>

            <div className="profile-field-grid">
              <label>
                Primary career goal
                <input
                  name="dreamCareer"
                  type="text"
                  value={formData.dreamCareer}
                  onChange={updateField}
                  placeholder="Aerospace Engineer"
                  disabled={saving}
                  required
                />
              </label>

              <label>
                Target internship roles
                <textarea
                  name="targetRoles"
                  value={formData.targetRoles}
                  onChange={updateField}
                  rows={5}
                  placeholder="Aerospace Engineering Intern&#10;Mechanical Engineering Intern&#10;CAD Intern"
                  disabled={saving}
                  required
                />
              </label>
            </div>

            <label className="profile-full-width-field">
              Long-term career goals
              <textarea
                name="careerGoals"
                value={formData.careerGoals}
                onChange={updateField}
                rows={5}
                placeholder="Describe where you want your career to go."
                disabled={saving}
              />
            </label>

            <div className="profile-field-grid profile-field-grid-wide">
              <label>
                Preferred industries
                <textarea
                  name="preferredIndustries"
                  value={formData.preferredIndustries}
                  onChange={updateField}
                  rows={4}
                  placeholder="Aerospace&#10;Aviation&#10;Space systems"
                  disabled={saving}
                />
              </label>

              <label>
                Preferred locations
                <textarea
                  name="preferredLocations"
                  value={formData.preferredLocations}
                  onChange={updateField}
                  rows={4}
                  placeholder="Chicago, Illinois&#10;Michigan&#10;Remote"
                  disabled={saving}
                />
              </label>
            </div>

            <fieldset className="work-preference-fieldset">
              <legend>
                Preferred work arrangements
              </legend>

              {[
                "On-site",
                "Hybrid",
                "Remote",
                "Paid only",
                "Open to relocation",
              ].map((preference) => (
                <label
                  className="checkbox-option"
                  key={preference}
                >
                  <input
                    type="checkbox"
                    checked={formData.workPreferences.includes(
                      preference
                    )}
                    onChange={() =>
                      toggleWorkPreference(preference)
                    }
                    disabled={saving}
                  />

                  {preference}
                </label>
              ))}
            </fieldset>
          </div>

          <div className="profile-data-notice">
            <p className="card-label">
              YOUR DATA, YOUR TRAJECTORY
            </p>

            <p>
              AeroPath bases opportunity matching on information
              you intentionally provide or approve. Missing
              qualifications are never invented, and document
              findings will require review before they become
              part of your profile.
            </p>
          </div>

          {error && (
            <p className="auth-error">{error}</p>
          )}

          {success && (
            <p className="auth-success">{success}</p>
          )}

          <button
            className="profile-save-button"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Updating Flight Record..."
              : "Save Flight Record"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Profile;