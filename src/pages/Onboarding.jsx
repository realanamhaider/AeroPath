import { useState } from "react";
import { useNavigate } from "react-router";
import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
import { analyzeProfileDocuments } from "../services/profileDocumentAI";
import CoursePicker from "../components/CoursePicker";

const TOTAL_STEPS = 5;

function Onboarding() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

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

  const [documents, setDocuments] = useState({
    resume: null,
    transcript: null,
    credentials: [],
  });

  const [analysisResult, setAnalysisResult] =
    useState(null);

  const [consentChecked, setConsentChecked] =
    useState(false);

  const [usedDocumentImport, setUsedDocumentImport] =
    useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentCourses, setCurrentCourses] =
  useState([]);

const [completedCourses, setCompletedCourses] =
  useState([]);

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

  function convertToList(value) {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function arrayToText(value) {
    if (!Array.isArray(value)) return "";

    return value.join("\n");
  }

  function isSupportedDocument(file) {
    if (!file) return false;

    const allowedMimeTypes = [
      "application/pdf",
      "text/plain",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const name = file.name.toLowerCase();

    const allowedExtension =
      name.endsWith(".pdf") ||
      name.endsWith(".txt") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".png") ||
      name.endsWith(".webp");

    return (
      allowedMimeTypes.includes(file.type) ||
      allowedExtension
    );
  }

  function validateDocument(file) {
    if (!isSupportedDocument(file)) {
      setError(
        "Use PDF, TXT, JPG, PNG, or WEBP files for Smart Import."
      );

      return false;
    }

    if (file.size > 12 * 1024 * 1024) {
      setError(
        `${file.name} is too large. Keep each document under 12 MB.`
      );

      return false;
    }

    return true;
  }

  function selectSingleDocument(type, event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    if (!validateDocument(file)) {
      event.target.value = "";
      return;
    }

    setDocuments((current) => ({
      ...current,
      [type]: file,
    }));

    setAnalysisResult(null);
    event.target.value = "";
  }

  function selectCredentials(event) {
    const newFiles = Array.from(
      event.target.files || []
    );

    if (newFiles.length === 0) return;

    setError("");

    const validFiles = [];

    for (const file of newFiles) {
      if (!validateDocument(file)) {
        event.target.value = "";
        return;
      }

      validFiles.push(file);
    }

    setDocuments((current) => ({
      ...current,

      credentials: [
        ...current.credentials,
        ...validFiles,
      ].slice(0, 5),
    }));

    setAnalysisResult(null);
    event.target.value = "";
  }

  function removeSingleDocument(type) {
    setDocuments((current) => ({
      ...current,
      [type]: null,
    }));

    setAnalysisResult(null);
  }

  function removeCredential(index) {
    setDocuments((current) => ({
      ...current,

      credentials: current.credentials.filter(
        (_, credentialIndex) =>
          credentialIndex !== index
      ),
    }));

    setAnalysisResult(null);
  }

  function hasAnyDocument() {
    return Boolean(
      documents.resume ||
        documents.transcript ||
        documents.credentials.length > 0
    );
  }

  function normalizeAcademicLevel(value) {
    if (!value) return "";

    const normalized = value.toLowerCase();

    if (
      normalized.includes("first") ||
      normalized.includes("freshman")
    ) {
      return "First-year";
    }

    if (normalized.includes("sophomore")) {
      return "Sophomore";
    }

    if (normalized.includes("junior")) {
      return "Junior";
    }

    if (normalized.includes("senior")) {
      return "Senior";
    }

    if (normalized.includes("graduate")) {
      return "Graduate";
    }

    return "";
  }

  function normalizeGpaScale(value) {
    const scale = Number(value);

    if (scale === 4) return "4";
    if (scale === 5) return "5";
    if (scale === 100) return "100";

    return "";
  }

  async function analyzeDocuments() {
    setError("");

    if (!hasAnyDocument()) {
      setError(
        "Choose at least one document before analyzing."
      );

      return;
    }

    if (!consentChecked) {
      setError(
        "Confirm document analysis before continuing."
      );

      return;
    }

    setAnalyzing(true);

    try {
      const result =
        await analyzeProfileDocuments({
          resume: documents.resume,
          transcript: documents.transcript,
          credentials: documents.credentials,
        });

      setAnalysisResult(result);
    } catch (err) {
      console.error(
        "AeroPath document analysis failed:",
        err
      );

      setError(
        err.message ||
          "AeroPath could not analyze your documents."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function applyAnalysisAndContinue() {
    if (!analysisResult) return;

    const extractedLevel =
      normalizeAcademicLevel(
        analysisResult.academicLevel
      );

    const extractedScale =
      normalizeGpaScale(
        analysisResult.gpaScale
      );

    setFormData((current) => ({
      ...current,

      fullName:
        analysisResult.fullName ||
        current.fullName,

      college:
        analysisResult.college ||
        current.college,

      major:
        analysisResult.major ||
        current.major,

      academicLevel:
        extractedLevel ||
        current.academicLevel,

      graduationYear:
        analysisResult.graduationYear ||
        current.graduationYear,

      gpaScale:
        extractedScale ||
        current.gpaScale,

      currentGpa:
        analysisResult.currentGpa ||
        current.currentGpa,

      previousGpa:
        analysisResult.previousGpa ||
        current.previousGpa,

      currentClasses:
        analysisResult.currentClasses?.length
          ? arrayToText(
              analysisResult.currentClasses
            )
          : current.currentClasses,

      completedClasses:
        analysisResult.completedClasses?.length
          ? arrayToText(
              analysisResult.completedClasses
            )
          : current.completedClasses,

      skills:
        analysisResult.skills?.length
          ? arrayToText(analysisResult.skills)
          : current.skills,

      certifications:
        analysisResult.certifications?.length
          ? arrayToText(
              analysisResult.certifications
            )
          : current.certifications,

      schoolProjects:
        analysisResult.schoolProjects?.length
          ? arrayToText(
              analysisResult.schoolProjects
            )
          : current.schoolProjects,

      personalProjects:
        analysisResult.personalProjects?.length
          ? arrayToText(
              analysisResult.personalProjects
            )
          : current.personalProjects,

      experience:
        analysisResult.experience?.length
          ? arrayToText(
              analysisResult.experience
            )
          : current.experience,

      awards:
        analysisResult.awards?.length
          ? arrayToText(analysisResult.awards)
          : current.awards,

      scholarships:
        analysisResult.scholarships?.length
          ? arrayToText(
              analysisResult.scholarships
            )
          : current.scholarships,

      competitions:
        analysisResult.competitions?.length
          ? arrayToText(
              analysisResult.competitions
            )
          : current.competitions,

      publications:
        analysisResult.publications?.length
          ? arrayToText(
              analysisResult.publications
            )
          : current.publications,

      honors:
        analysisResult.honors?.length
          ? arrayToText(analysisResult.honors)
          : current.honors,
    }));

    setUsedDocumentImport(true);
    setError("");
    setStep(2);
  }

  function enterManually() {
    setError("");
    setStep(2);
  }

  function validateGpa() {
    const maximumGpa =
      Number(formData.gpaScale);

    const currentGpa =
      formData.currentGpa === ""
        ? null
        : Number(formData.currentGpa);

    const previousGpa =
      formData.previousGpa === ""
        ? null
        : Number(formData.previousGpa);

    if (
      currentGpa !== null &&
      (!Number.isFinite(currentGpa) ||
        currentGpa < 0 ||
        currentGpa > maximumGpa)
    ) {
      setError(
        `Current GPA must be between 0 and ${maximumGpa}.`
      );

      return false;
    }

    if (
      previousGpa !== null &&
      (!Number.isFinite(previousGpa) ||
        previousGpa < 0 ||
        previousGpa > maximumGpa)
    ) {
      setError(
        `Previous GPA must be between 0 and ${maximumGpa}.`
      );

      return false;
    }

    return true;
  }

  function continueOnboarding() {
    setError("");

    if (step === 2) {
      if (
        !formData.fullName.trim() ||
        !formData.college.trim() ||
        !formData.major.trim() ||
        !formData.academicLevel ||
        !formData.graduationYear
      ) {
        setError(
          "Complete all required academic information."
        );

        return;
      }

      const year = Number(
        formData.graduationYear
      );

      if (
        !Number.isInteger(year) ||
        year < 2026 ||
        year > 2100
      ) {
        setError(
          "Enter a valid graduation year."
        );

        return;
      }

      if (!validateGpa()) {
        return;
      }
    }

    if (step < TOTAL_STEPS) {
      setStep((current) => current + 1);
    }
  }

  function returnToPreviousStep() {
    setError("");

    setStep((current) =>
      Math.max(1, current - 1)
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!formData.dreamCareer.trim()) {
      setError(
        "Enter your primary career goal."
      );

      return;
    }

    if (
      convertToList(
        formData.targetRoles
      ).length === 0
    ) {
      setError(
        "Enter at least one target role."
      );

      return;
    }

    if (!validateGpa()) {
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error(
          "You must be signed in to complete onboarding."
        );
      }

      const currentGpa =
        formData.currentGpa === ""
          ? null
          : Number(formData.currentGpa);

      const previousGpa =
        formData.previousGpa === ""
          ? null
          : Number(formData.previousGpa);

      const userProfile = {
        fullName: formData.fullName.trim(),
        college: formData.college.trim(),
        major: formData.major.trim(),
        academicLevel:
          formData.academicLevel,

        graduationYear: Number(
          formData.graduationYear
        ),

        gpa: {
          scale: Number(formData.gpaScale),
          current: currentGpa,
          previous: previousGpa,
        },

        coursework: {
  current: currentCourses.map(
    (course) =>
      `${course.name} — ${course.number}`
  ),

  completed: completedCourses.map(
    (course) =>
      `${course.name} — ${course.number}`
  ),
},

courseworkStructured: {
  current: currentCourses,
  completed: completedCourses,
},

        skills: convertToList(
          formData.skills
        ),

        certifications: convertToList(
          formData.certifications
        ),

        projects: {
          school: convertToList(
            formData.schoolProjects
          ),

          personal: convertToList(
            formData.personalProjects
          ),
        },

        experience: convertToList(
          formData.experience
        ),

        achievements: {
          awards: convertToList(
            formData.awards
          ),

          scholarships: convertToList(
            formData.scholarships
          ),

          competitions: convertToList(
            formData.competitions
          ),

          publications: convertToList(
            formData.publications
          ),

          honors: convertToList(
            formData.honors
          ),
        },

        career: {
          dreamCareer:
            formData.dreamCareer.trim(),

          goals:
            formData.careerGoals.trim(),

          targetRoles: convertToList(
            formData.targetRoles
          ),

          preferredIndustries:
            convertToList(
              formData.preferredIndustries
            ),

          preferredLocations:
            convertToList(
              formData.preferredLocations
            ),

          workPreferences:
            formData.workPreferences,
        },

        email: user.email,

        onboardingComplete: true,
        onboardingVersion: 2,

        profileDataSource:
          usedDocumentImport
            ? "user-approved-document-import"
            : "user-provided",

        documentImportUsed:
          usedDocumentImport,

        onboardingCompletedAt:
          serverTimestamp(),

        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "users", user.uid),
        userProfile,
        { merge: true }
      );

      navigate("/dashboard");
    } catch (err) {
      console.error(
        "Onboarding save failed:",
        err
      );

      setError(
        err.message ||
          "Could not complete onboarding."
      );
    } finally {
      setLoading(false);
    }
  }

  function analysisItemCount(value) {
    if (Array.isArray(value)) {
      return value.length;
    }

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return 1;
    }

    return 0;
  }

  const analysisCount = analysisResult
    ? Object.entries(analysisResult)
        .filter(
          ([key]) =>
            key !== "extractionNotes"
        )
        .reduce(
          (total, [, value]) =>
            total +
            analysisItemCount(value),
          0
        )
    : 0;

  return (
    <main className="auth-page">
      <section className="auth-card onboarding-card">
        <div className="onboarding-progress-heading">
          <p className="card-label">
            MISSION INITIALIZATION
          </p>

          <span>
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>

        <div className="onboarding-progress-track">
          <div
            className="onboarding-progress-fill"
            style={{
              width: `${
                (step / TOTAL_STEPS) * 100
              }%`,
            }}
          />
        </div>

        <h1>
          {step === 1
            ? "Build your flight record."
            : "Build your flight plan."}
        </h1>

        <p className="auth-description">
          AeroPath builds your profile only from
          information you provide and approve.
        </p>

        <form onSubmit={handleSubmit}>
          {/* =========================================
              STEP 1 — SMART IMPORT
          ========================================== */}

          {step === 1 && (
            <section className="onboarding-step smart-import-step">
              <p className="card-label">
                SMART PROFILE BUILDER
              </p>

              <h2>
                Start with what you already have.
              </h2>

              <p className="auth-description">
                Upload your resume, transcript, or
                credentials. AeroPath will identify
                useful profile information and let
                you review everything before it is
                saved.
              </p>

              <div className="document-upload-grid onboarding-document-grid">
                {/* RESUME */}

                <article className="document-upload-card">
                  <div className="document-upload-top">
                    <div>
                      <p className="card-label">
                        RESUME
                      </p>

                      <h3>
                        Experience & Skills
                      </h3>
                    </div>

                    <span className="document-icon">
                      CV
                    </span>
                  </div>

                  <p>
                    Experience, projects, leadership,
                    skills, certifications, and
                    achievements.
                  </p>

                  {documents.resume ? (
                    <div className="selected-document">
                      <div>
                        <strong>
                          {documents.resume.name}
                        </strong>

                        <span>
                          Ready to analyze
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeSingleDocument(
                            "resume"
                          )
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
                        accept=".pdf,.txt,.jpg,.jpeg,.png,.webp"
                        onChange={(event) =>
                          selectSingleDocument(
                            "resume",
                            event
                          )
                        }
                      />
                    </label>
                  )}
                </article>

                {/* TRANSCRIPT */}

                <article className="document-upload-card">
                  <div className="document-upload-top">
                    <div>
                      <p className="card-label">
                        TRANSCRIPT
                      </p>

                      <h3>
                        Academic Record
                      </h3>
                    </div>

                    <span className="document-icon">
                      TR
                    </span>
                  </div>

                  <p>
                    GPA, coursework, school,
                    academic standing, and honors
                    when clearly listed.
                  </p>

                  {documents.transcript ? (
                    <div className="selected-document">
                      <div>
                        <strong>
                          {
                            documents.transcript
                              .name
                          }
                        </strong>

                        <span>
                          Ready to analyze
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeSingleDocument(
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
                        accept=".pdf,.txt,.jpg,.jpeg,.png,.webp"
                        onChange={(event) =>
                          selectSingleDocument(
                            "transcript",
                            event
                          )
                        }
                      />
                    </label>
                  )}
                </article>

                {/* CREDENTIALS */}

                <article className="document-upload-card">
                  <div className="document-upload-top">
                    <div>
                      <p className="card-label">
                        CREDENTIALS
                      </p>

                      <h3>
                        Awards & Recognition
                      </h3>
                    </div>

                    <span className="document-icon">
                      +
                    </span>
                  </div>

                  <p>
                    Awards, certificates,
                    scholarships, publications,
                    competition results, and other
                    credentials.
                  </p>

                  <label className="document-upload-button">
                    Add Credentials

                    <input
                      type="file"
                      multiple
                      accept=".pdf,.txt,.jpg,.jpeg,.png,.webp"
                      onChange={
                        selectCredentials
                      }
                    />
                  </label>

                  {documents.credentials.length >
                    0 && (
                    <div className="credential-file-list">
                      {documents.credentials.map(
                        (file, index) => (
                          <div
                            className="selected-document"
                            key={`${file.name}-${index}`}
                          >
                            <div>
                              <strong>
                                {file.name}
                              </strong>

                              <span>
                                Ready to analyze
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeCredential(
                                  index
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </article>
              </div>

              {hasAnyDocument() && (
                <label className="smart-import-consent">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(event) =>
                      setConsentChecked(
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    I understand that the selected
                    documents will be sent to the
                    document-analysis service so
                    AeroPath can extract profile
                    information. The original files
                    will not be saved to my AeroPath
                    profile.
                  </span>
                </label>
              )}

              {analysisResult && (
                <div className="analysis-result-card">
                  <div className="analysis-result-header">
                    <div>
                      <p className="card-label">
                        ANALYSIS COMPLETE
                      </p>

                      <h3>
                        AeroPath found{" "}
                        {analysisCount} profile
                        details.
                      </h3>
                    </div>

                    <span className="analysis-status">
                      READY
                    </span>
                  </div>

                  <p>
                    Nothing has been saved yet.
                    Continue to review and edit the
                    extracted information.
                  </p>

                  {analysisResult.extractionNotes
                    ?.length > 0 && (
                    <div className="analysis-notes">
                      <strong>
                        Review notes
                      </strong>

                      {analysisResult.extractionNotes.map(
                        (note) => (
                          <p key={note}>
                            {note}
                          </p>
                        )
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={
                      applyAnalysisAndContinue
                    }
                  >
                    Use Findings & Review
                  </button>
                </div>
              )}

              {error && (
                <p className="auth-error">
                  {error}
                </p>
              )}

              <div className="smart-import-actions">
                <button
                  type="button"
                  onClick={analyzeDocuments}
                  disabled={
                    analyzing ||
                    !hasAnyDocument()
                  }
                >
                  {analyzing
                    ? "Analyzing Flight Record..."
                    : "Analyze My Documents"}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={enterManually}
                  disabled={analyzing}
                >
                  Enter Manually Instead
                </button>
              </div>
            </section>
          )}

          {/* =========================================
              STEP 2 — ACADEMIC RECORD
          ========================================== */}

          {step === 2 && (
            <section className="onboarding-step">
              <p className="card-label">
                ACADEMIC RECORD
              </p>

              <h2>
                Review your academic position.
              </h2>

              {usedDocumentImport && (
                <p className="import-review-banner">
                  AeroPath pre-filled what it could
                  verify from your documents.
                  Review every field before
                  continuing.
                </p>
              )}

              <label>
                Full name
                <input
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={updateField}
                  placeholder="Your full name"
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
                  required
                />
              </label>

              <label>
                Current academic level
                <select
                  name="academicLevel"
                  value={formData.academicLevel}
                  onChange={updateField}
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
                  value={
                    formData.graduationYear
                  }
                  onChange={updateField}
                  placeholder="2028"
                  min="2026"
                  max="2100"
                  required
                />
              </label>

              <div className="onboarding-divider" />

              <label>
                GPA scale
                <select
                  name="gpaScale"
                  value={formData.gpaScale}
                  onChange={updateField}
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
                  placeholder="Optional"
                  min="0"
                  max={formData.gpaScale}
                  step="0.01"
                />
              </label>

              <label>
                Previous GPA
                <input
                  name="previousGpa"
                  type="number"
                  value={formData.previousGpa}
                  onChange={updateField}
                  placeholder="Optional"
                  min="0"
                  max={formData.gpaScale}
                  step="0.01"
                />
              </label>

        <CoursePicker
  title="Current Courses"
  courses={currentCourses}
  onChange={setCurrentCourses}
/>

<CoursePicker
  title="Completed Courses"
  courses={completedCourses}
  onChange={setCompletedCourses}
/>
            </section>
          )}

          {/* =========================================
              STEP 3 — CAPABILITIES
          ========================================== */}

          {step === 3 && (
            <section className="onboarding-step">
              <p className="card-label">
                CAPABILITIES
              </p>

              <h2>
                What have you built and learned?
              </h2>

              <p className="auth-description">
                Keep what AeroPath found, edit it,
                remove it, or add anything that was
                missed.
              </p>

              <label>
                Skills
                <textarea
                  name="skills"
                  value={formData.skills}
                  onChange={updateField}
                  placeholder={
                    "CAD\nC++\nTechnical writing\nData analysis"
                  }
                  rows={5}
                />
              </label>

              <label>
                Certifications
                <textarea
                  name="certifications"
                  value={
                    formData.certifications
                  }
                  onChange={updateField}
                  placeholder={
                    "One certification per line"
                  }
                  rows={4}
                />
              </label>

              <label>
                School projects
                <textarea
                  name="schoolProjects"
                  value={
                    formData.schoolProjects
                  }
                  onChange={updateField}
                  placeholder="One relevant project per line"
                  rows={5}
                />
              </label>

              <label>
                Personal projects
                <textarea
                  name="personalProjects"
                  value={
                    formData.personalProjects
                  }
                  onChange={updateField}
                  placeholder="One project per line"
                  rows={5}
                />
              </label>

              <label>
                Work, volunteer, leadership, or
                research experience
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={updateField}
                  placeholder="One experience per line"
                  rows={6}
                />
              </label>
            </section>
          )}

          {/* =========================================
              STEP 4 — ACHIEVEMENTS
          ========================================== */}

          {step === 4 && (
            <section className="onboarding-step">
              <p className="card-label">
                ACHIEVEMENTS
              </p>

              <h2>
                What distinguishes your record?
              </h2>

              <p className="auth-description">
                These fields are optional, but they
                can help AeroPath understand
                qualifications that a basic resume
                might miss.
              </p>

              <label>
                Awards
                <textarea
                  name="awards"
                  value={formData.awards}
                  onChange={updateField}
                  placeholder="One award per line"
                  rows={4}
                />
              </label>

              <label>
                Scholarships
                <textarea
                  name="scholarships"
                  value={
                    formData.scholarships
                  }
                  onChange={updateField}
                  placeholder="One scholarship or grant per line"
                  rows={4}
                />
              </label>

              <label>
                Competitions
                <textarea
                  name="competitions"
                  value={
                    formData.competitions
                  }
                  onChange={updateField}
                  placeholder="Hackathons, research competitions, engineering challenges..."
                  rows={4}
                />
              </label>

              <label>
                Publications or presentations
                <textarea
                  name="publications"
                  value={
                    formData.publications
                  }
                  onChange={updateField}
                  placeholder="Research papers, posters, conference presentations..."
                  rows={4}
                />
              </label>

              <label>
                Honors & academic recognition
                <textarea
                  name="honors"
                  value={formData.honors}
                  onChange={updateField}
                  placeholder="Dean's List, honor societies, academic distinctions..."
                  rows={4}
                />
              </label>
            </section>
          )}

          {/* =========================================
              STEP 5 — TRAJECTORY
          ========================================== */}

          {step === 5 && (
            <section className="onboarding-step">
              <p className="card-label">
                CAREER TRAJECTORY
              </p>

              <h2>
                Where do you want to go?
              </h2>

              <p className="auth-description">
                AeroPath uses these goals together
                with your approved profile to
                determine which opportunities are
                actually relevant to you.
              </p>

              <label>
                Primary career goal
                <input
                  name="dreamCareer"
                  type="text"
                  value={formData.dreamCareer}
                  onChange={updateField}
                  placeholder="Aerospace Engineer"
                  required
                />
              </label>

              <label>
                Long-term career goals
                <textarea
                  name="careerGoals"
                  value={
                    formData.careerGoals
                  }
                  onChange={updateField}
                  placeholder="Describe where you want your career to go."
                  rows={5}
                />
              </label>

              <label>
                Target internship roles
                <textarea
                  name="targetRoles"
                  value={formData.targetRoles}
                  onChange={updateField}
                  placeholder={
                    "Aerospace Engineering Intern\nMechanical Engineering Intern\nCAD Intern"
                  }
                  rows={5}
                  required
                />
              </label>

              <label>
                Preferred industries
                <textarea
                  name="preferredIndustries"
                  value={
                    formData.preferredIndustries
                  }
                  onChange={updateField}
                  placeholder={
                    "Aerospace\nAviation\nSpace systems"
                  }
                  rows={4}
                />
              </label>

              <label>
                Preferred locations
                <textarea
                  name="preferredLocations"
                  value={
                    formData.preferredLocations
                  }
                  onChange={updateField}
                  placeholder={
                    "Chicago, Illinois\nMichigan\nRemote"
                  }
                  rows={4}
                />
              </label>

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
                        toggleWorkPreference(
                          preference
                        )
                      }
                    />

                    {preference}
                  </label>
                ))}
              </fieldset>
            </section>
          )}

          {step !== 1 && error && (
            <p className="auth-error">
              {error}
            </p>
          )}

          {step > 1 && (
            <div className="onboarding-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={
                  returnToPreviousStep
                }
                disabled={loading}
              >
                Back
              </button>

              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={
                    continueOnboarding
                  }
                  disabled={loading}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Building Flight Plan..."
                    : "Build My Flight Plan"}
                </button>
              )}
            </div>
          )}
        </form>
      </section>
    </main>
  );
}

export default Onboarding;