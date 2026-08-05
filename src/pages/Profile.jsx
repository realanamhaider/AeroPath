import { useEffect, useRef, useState } from "react";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import DashboardNav from "../components/DashboardNav";

function Profile() {
  const savingLocked = useRef(false);

  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [major, setMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [dreamCareer, setDreamCareer] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
          throw new Error("Your AeroPath profile could not be found.");
        }

        const profileData = profileSnapshot.data();

        setFullName(profileData.fullName || "");
        setCollege(profileData.college || "");
        setMajor(profileData.major || "");
        setGraduationYear(
          profileData.graduationYear?.toString() || ""
        );
        setDreamCareer(profileData.dreamCareer || "");
      } catch (err) {
        setError(err.message || "Could not load your profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (savingLocked.current) return;

    setError("");
    setSuccess("");

    const trimmedName = fullName.trim();
    const trimmedCollege = college.trim();
    const trimmedMajor = major.trim();
    const trimmedCareer = dreamCareer.trim();
    const year = Number(graduationYear);

    if (trimmedName.length < 2) {
      setError("Enter your full name.");
      return;
    }

    if (!trimmedCollege) {
      setError("Enter your college.");
      return;
    }

    if (!trimmedMajor) {
      setError("Enter your major.");
      return;
    }

    if (!Number.isInteger(year) || year < 2026 || year > 2100) {
      setError("Enter a valid graduation year.");
      return;
    }

    if (!trimmedCareer) {
      setError("Enter your career goal.");
      return;
    }

    savingLocked.current = true;
    setSaving(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const profileRef = doc(db, "users", user.uid);

      await setDoc(
        profileRef,
        {
          fullName: trimmedName,
          college: trimmedCollege,
          major: trimmedMajor,
          graduationYear: year,
          dreamCareer: trimmedCareer,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Could not update your profile.");
    } finally {
      savingLocked.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="auth-page">
        <p>Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <DashboardNav />

      <section className="dashboard-header">
        <p className="card-label">PROFILE</p>
        <h1>Your Profile</h1>
        <p>Manage your personal and academic information.</p>
      </section>

      <section className="profile-form-card">
        <form onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              maxLength={100}
              disabled={saving}
              required
            />
          </label>

          <label>
            College
            <input
              type="text"
              value={college}
              onChange={(event) => setCollege(event.target.value)}
              maxLength={100}
              placeholder="University of Michigan"
              disabled={saving}
              required
            />
          </label>

          <label>
            Major
            <input
              type="text"
              value={major}
              onChange={(event) => setMajor(event.target.value)}
              maxLength={100}
              placeholder="Aerospace Engineering"
              disabled={saving}
              required
            />
          </label>

          <label>
            Graduation year
            <input
              type="number"
              value={graduationYear}
              onChange={(event) =>
                setGraduationYear(event.target.value)
              }
              min="2026"
              max="2100"
              disabled={saving}
              required
            />
          </label>

          <label>
            Career goal
            <input
              type="text"
              value={dreamCareer}
              onChange={(event) =>
                setDreamCareer(event.target.value)
              }
              maxLength={100}
              placeholder="Aerospace Engineer"
              disabled={saving}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button type="submit" disabled={saving}>
            {saving ? "Saving Profile..." : "Save Changes"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Profile;