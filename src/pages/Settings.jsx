import { useState } from "react";
import { useNavigate } from "react-router";

import {
  sendPasswordResetEmail,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
} from "firebase/auth";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  writeBatch,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebase";

import DashboardNav from "../components/DashboardNav";

async function deleteCollectionInBatches(collectionRef) {
  const batchSize = 400;

  while (true) {
    const snapshot = await getDocs(
      query(collectionRef, limit(batchSize))
    );

    if (snapshot.empty) {
      break;
    }

    const batch = writeBatch(db);

    snapshot.docs.forEach((document) => {
      batch.delete(document.ref);
    });

    await batch.commit();

    if (snapshot.size < batchSize) {
      break;
    }
  }
}

function Settings() {
  const navigate = useNavigate();

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [deleteConfirm, setDeleteConfirm] =
    useState("");

  const [deletePassword, setDeletePassword] =
    useState("");

  const [deleting, setDeleting] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState("");

  const user = auth.currentUser;

  const usesPassword =
    user?.providerData.some(
      (provider) =>
        provider.providerId === "password"
    ) || false;

  const usesGoogle =
    user?.providerData.some(
      (provider) =>
        provider.providerId === "google.com"
    ) || false;

  const signInMethod =
    usesPassword && usesGoogle
      ? "Email/password + Google"
      : usesPassword
        ? "Email and password"
        : usesGoogle
          ? "Google"
          : "Unknown";

  async function handlePasswordReset() {
    if (sending) return;

    setError("");
    setSuccess("");

    if (!user?.email) {
      setError(
        "Your account email could not be found."
      );
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
      await sendPasswordResetEmail(
        auth,
        user.email
      );

      setSuccess(
        `A password reset link was sent to ${user.email}. Check your inbox and spam folder.`
      );
    } catch (err) {
      console.error(
        "Password reset error:",
        err
      );

      if (
        err.code ===
        "auth/too-many-requests"
      ) {
        setError(
          "Too many attempts. Wait a few minutes and try again."
        );
      } else if (
        err.code ===
        "auth/network-request-failed"
      ) {
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

  async function reauthenticateAccount() {
    if (!user) {
      throw new Error(
        "No authenticated user."
      );
    }

    if (usesPassword) {
      if (!user.email) {
        throw new Error(
          "Account email could not be found."
        );
      }

      const credential =
        EmailAuthProvider.credential(
          user.email,
          deletePassword
        );

      await reauthenticateWithCredential(
        user,
        credential
      );

      return;
    }

    if (usesGoogle) {
      const provider =
        new GoogleAuthProvider();

      await reauthenticateWithPopup(
        user,
        provider
      );

      return;
    }

    throw new Error(
      "This sign-in method is not supported for account deletion."
    );
  }

  async function handleDeleteAccount() {
    if (deleting) return;

    setDeleteError("");

    if (!user) {
      setDeleteError(
        "You must be signed in to delete your account."
      );
      return;
    }

    if (
      deleteConfirm.trim() !== "DELETE"
    ) {
      setDeleteError(
        'Type "DELETE" exactly to confirm.'
      );
      return;
    }

    if (
      usesPassword &&
      !deletePassword
    ) {
      setDeleteError(
        "Enter your current password to confirm deletion."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "This permanently deletes your AeroPath account and its data. This cannot be undone. Continue?"
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      /*
        Re-authenticate BEFORE deleting data.

        This prevents us from deleting Firestore
        data and then discovering Firebase Auth
        requires a recent login.
      */
      await reauthenticateAccount();

      const uid = user.uid;

      const userRef = doc(
        db,
        "users",
        uid
      );

      /*
        Firestore does not automatically delete
        subcollections when the parent document
        is deleted.

        Delete AeroPath's known user
        subcollections first.
      */

      await deleteCollectionInBatches(
        collection(
          db,
          "users",
          uid,
          "missions"
        )
      );

      await deleteCollectionInBatches(
        collection(
          db,
          "users",
          uid,
          "projects"
        )
      );

      await deleteCollectionInBatches(
        collection(
          db,
          "users",
          uid,
          "opportunityMatches"
        )
      );

      /*
        Deletes the main user profile document.

        Roadmap/profile/onboarding data stored
        directly on this document is removed here.
      */
      await deleteDoc(userRef);

      /*
        Delete Firebase Authentication account last.

        If Firestore deletion fails, the user's
        authentication account remains available
        so the operation can be retried.
      */
      await deleteUser(user);

      navigate("/signup", {
        replace: true,
      });
    } catch (err) {
      console.error(
        "Account deletion error:",
        err
      );

      if (
        err.code ===
          "auth/invalid-credential" ||
        err.code ===
          "auth/wrong-password"
      ) {
        setDeleteError(
          "Your password is incorrect."
        );
      } else if (
        err.code ===
        "auth/popup-closed-by-user"
      ) {
        setDeleteError(
          "Google verification was cancelled. Your account was not deleted."
        );
      } else if (
        err.code ===
        "auth/requires-recent-login"
      ) {
        setDeleteError(
          "For security, sign in again and then retry account deletion."
        );
      } else if (
        err.code ===
        "auth/network-request-failed"
      ) {
        setDeleteError(
          "Network error. Check your connection and try again."
        );
      } else if (
        err.code ===
        "permission-denied"
      ) {
        setDeleteError(
          "AeroPath could not remove your account data. Nothing further was deleted."
        );
      } else {
        setDeleteError(
          "Your account could not be deleted. Please try again."
        );
      }
    } finally {
      setDeleting(false);
    }
  }

  const deleteReady =
    deleteConfirm.trim() === "DELETE" &&
    (!usesPassword ||
      deletePassword.length > 0);

  return (
    <main className="dashboard-page">
      <DashboardNav />

      <section className="dashboard-header">
        <p className="card-label">
          SETTINGS
        </p>

        <h1>Settings</h1>

        <p>
          Manage your AeroPath account
          and preferences.
        </p>
      </section>

      <section className="settings-container">
        <div className="settings-card">
          <p className="card-label">
            ACCOUNT
          </p>

          <h2>
            Account information
          </h2>

          <div className="settings-detail">
            <span>Email</span>

            <strong>
              {user?.email ||
                "Not available"}
            </strong>
          </div>

          <div className="settings-detail">
            <span>
              Sign-in method
            </span>

            <strong>
              {signInMethod}
            </strong>
          </div>
        </div>

        <div className="settings-card">
          <p className="card-label">
            SECURITY
          </p>

          <h2>Password</h2>

          {usesPassword ? (
            <>
              <p>
                Send a secure
                password-reset link to
                your account email.
              </p>

              <button
                type="button"
                onClick={
                  handlePasswordReset
                }
                disabled={sending}
              >
                {sending
                  ? "Sending Reset Link..."
                  : "Send Password Reset Link"}
              </button>
            </>
          ) : (
            <p>
              Your account uses Google
              Sign-In. Manage your
              password through your
              Google account.
            </p>
          )}

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
        </div>

        <div className="settings-card danger-zone">
          <p className="card-label">
            DANGER ZONE
          </p>

          <h2>Delete account</h2>

          <p>
            Permanently remove your
            AeroPath account, profile,
            missions, projects,
            roadmap, and opportunity
            matches.
          </p>

          <p className="delete-warning">
            This action cannot be
            undone.
          </p>

          <label
            className="delete-field"
            htmlFor="delete-confirm"
          >
            <span>
              Type DELETE to confirm
            </span>

            <input
              id="delete-confirm"
              type="text"
              value={deleteConfirm}
              onChange={(event) =>
                setDeleteConfirm(
                  event.target.value
                )
              }
              placeholder="DELETE"
              autoComplete="off"
              disabled={deleting}
            />
          </label>

          {usesPassword && (
            <label
              className="delete-field"
              htmlFor="delete-password"
            >
              <span>
                Current password
              </span>

              <input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(event) =>
                  setDeletePassword(
                    event.target.value
                  )
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={deleting}
              />
            </label>
          )}

          {!usesPassword &&
            usesGoogle && (
              <p className="delete-auth-note">
                Google will ask you to
                verify your account
                before deletion.
              </p>
            )}

          {deleteError && (
            <p className="auth-error">
              {deleteError}
            </p>
          )}

          <button
            type="button"
            className="danger-button"
            onClick={
              handleDeleteAccount
            }
            disabled={
              deleting ||
              !deleteReady
            }
          >
            {deleting
              ? "Deleting Account..."
              : "Permanently Delete Account"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default Settings;