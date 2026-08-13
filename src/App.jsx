import Library from "./pages/Library";
import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
} from "react-router";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "./firebase/firebase";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import DemoMissionCard from "./components/DemoMissionCard";

import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import AddMission from "./pages/AddMission";
import EditMission from "./pages/EditMission";
import Projects from "./pages/Projects";
import EditProject from "./pages/EditProject";
import Internships from "./pages/Internships";
import Roadmap from "./pages/Roadmap";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

import "./App.css";

function ProtectedRoute({ user, authLoading, children }) {
  if (authLoading) {
    return (
      <main className="auth-page">
        <p>Restoring your AeroPath session...</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="app">
            <Navbar />

            <section className="landing">
              <Hero />
              <DemoMissionCard />
            </section>
          </div>
        }
      />

      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute
            user={user}
            authLoading={authLoading}
          >
            <Onboarding />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            user={user}
            authLoading={authLoading}
          >
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/add-mission"
        element={
          <ProtectedRoute
            user={user}
            authLoading={authLoading}
          >
            <AddMission />
          </ProtectedRoute>
        }
      />

      <Route
        path="/edit-mission/:missionId"
        element={
          <ProtectedRoute
            user={user}
            authLoading={authLoading}
          >
            <EditMission />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects"
        element={
          <ProtectedRoute
            user={user}
            authLoading={authLoading}
          >
            <Projects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-project/:projectId"
        element={
          <ProtectedRoute 
            user={user}
            authLoading={authLoading}
          >

            <EditProject />
          </ProtectedRoute>
        }
      />
      <Route
        path="/library"
        element={
          <ProtectedRoute 
            user={user}
            authLoading={authLoading}
          >
            <Library />
          </ProtectedRoute>
        }
      />
      <Route
        path="/internships"
        element={
          <ProtectedRoute
            user={user}
            authLoading={authLoading}
          >
            <Internships />
          </ProtectedRoute>
        }
      />

      <Route
        path="/roadmap"
        element={
          <ProtectedRoute
            user={user}
            authLoading={authLoading}
          >
            <Roadmap />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute
            user={user}
            authLoading={authLoading}
          >
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute
            user={user}
            authLoading={authLoading}
          >
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;