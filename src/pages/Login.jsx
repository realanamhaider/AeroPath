import { useState } from "react";
import { useNavigate } from "react-router";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function goToCorrectPage(user) {
  const userDoc = await getDoc(doc(db, "users", user.uid));

  if (
    userDoc.exists() &&
    userDoc.data().onboardingComplete === true
  ) {
    navigate("/dashboard");
  } else {
    navigate("/onboarding");
  }
}

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const credentials = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      await goToCorrectPage(credentials.user
      );
      navigate("/dashboard");
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);
      await goToCorrectPage(result.user);
    } catch (error) {
      console.error(error);
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="card-label">RETURN TO MISSION CONTROL</p>

        <h1>Welcome back.</h1>

        <p className="auth-description">
          Sign in to continue your AeroPath trajectory.
        </p>

        <form onSubmit={handleLogin}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button
            type="button"
            className="forgot-password-link"
            onClick={() => navigate("/forgot-password")}
          >
            Forgot password?
          </button>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Accessing mission control..." : "Sign In"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="google-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          Continue with Google
        </button>

        <p className="auth-switch-text">
          New to AeroPath?
        </p>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/signup")}
        >
          Create an Account
        </button>
      </section>
    </main>
  );
}

export default Login;