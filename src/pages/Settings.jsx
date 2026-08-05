import { useState } from "react";
import {
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase/firebase";
import DashboardNav from "../components/DashboardNav";

function Settings() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const user = auth.currentUser;

  const usesPassword =
    user?.providerData.some(
      (provider) => provider.providerId === "password"
    ) || false;

  const signInMethod = usesPassword
    ? "Email and password"
    : "Google";

  async function handlePasswordReset() {
    if (sending) return;

    setError("");
    setSuccess("");

    if (!user?.email) {
      setError("Your account email could not be found.");
      return;
    }

    if (!usesPassword) {
      setError(
        "This account uses Google Sign-In and does not have an AeroPath password."
      );
      return;
    }

    setSending(true);

    try {
      await sendPasswordResetEmail(auth, user.email);

      setSuccess(
    `A password reset link was sent to ${user.email}. Check your inbox and spam folder.`
      );
    } catch (err) {
      console.error("Password reset error:", err);

      if (err.code === "auth/too-many-requests") {
        setError(
          "Too many attempts. Wait a few minutes and try again."
        );
      } else if (err.code === "auth/network-request-failed") {
        setError(
          "Network error. Check your connection and try again."
        );
      } else {
        setError(
          "The reset email could not be sent. Try again."
        );
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="dashboard-page">
      <DashboardNav />

      <section className="dashboard-header">
        <p className="card-label">SETTINGS</p>
        <h1>Settings</h1>
        <p>Manage your AeroPath account and preferences.</p>
      </section>

      <section className="settings-container">
        <div className="settings-card">
          <p className="card-label">ACCOUNT</p>
          <h2>Account information</h2>

          <div className="settings-detail">
            <span>Email</span>
            <strong>{user?.email || "Not available"}</strong>
          </div>

          <div className="settings-detail">
            <span>Sign-in method</span>
            <strong>{signInMethod}</strong>
          </div>
        </div>

        <div className="settings-card">
          <p className="card-label">SECURITY</p>
          <h2>Password</h2>

          {usesPassword ? (
            <>
              <p>
                Send a secure password-reset link to your
                account email.
              </p>

              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={sending}
              >
                {sending
                  ? "Sending Reset Link..."
                  : "Send Password Reset Link"}
              </button>
            </>
          ) : (
            <p>
              Your account uses Google Sign-In. Manage your
              password through your Google account.
            </p>
          )}

          {error && <p className="auth-error">{error}</p>}
          {success && (
            <p className="auth-success">{success}</p>
          )}
        </div>

        <div className="settings-card danger-zone">
          <p className="card-label">DANGER ZONE</p>
          <h2>Delete account</h2>

          <p>
            Permanently remove your AeroPath account and data.
          </p>

          <button
            type="button"
            className="danger-button"
            disabled
          >
            Delete Account — Coming Next
          </button>
        </div>
      </section>
    </main>
  );
}

export default Settings;