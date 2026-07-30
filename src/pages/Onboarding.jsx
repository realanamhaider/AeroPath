import { useState } from "react";
import { useNavigate } from "react-router";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

function Onboarding() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [major, setMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [dreamCareer, setDreamCareer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in to complete onboarding.");
      }

      await setDoc(doc(db, "users", user.uid), {
        fullName,
        college,
        major,
        graduationYear,
        dreamCareer,
        email: user.email,
        onboardingComplete: true,
        createdAt: serverTimestamp(),
      });

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card onboarding-card">
        <p className="card-label">MISSION INITIALIZATION</p>

        <h1>Build your flight plan.</h1>

        <p className="auth-description">
          Tell AeroPath where you are now and where you want to go.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Anam Haider"
              required
            />
          </label>

          <label>
            College
            <input
              type="text"
              value={college}
              onChange={(event) => setCollege(event.target.value)}
              placeholder="University of Michigan"
              required
            />
          </label>

          <label>
            Major
            <input
              type="text"
              value={major}
              onChange={(event) => setMajor(event.target.value)}
              placeholder="Aerospace Engineering"
              required
            />
          </label>

          <label>
            Expected graduation year
            <input
              type="number"
              value={graduationYear}
              onChange={(event) => setGraduationYear(event.target.value)}
              placeholder="2028"
              min="2026"
              max="2040"
              required
            />
          </label>

          <label>
            Dream career
            <input
              type="text"
              value={dreamCareer}
              onChange={(event) => setDreamCareer(event.target.value)}
              placeholder="Aerospace Engineer"
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Calculating trajectory..." : "Generate My Flight Plan"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Onboarding;