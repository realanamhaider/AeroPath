import EditMission from "./pages/EditMission";
import Navbar from "./components/Navbar";
import "./App.css";
import Hero from "./components/Hero";
import DemoMissionCard from "./components/DemoMissionCard";
import { Routes, Route } from "react-router-dom";
import SignUp from "./pages/SignUp";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import AddMission from "./pages/AddMission";
import Projects from "./pages/Projects";
import Internships from "./pages/Internships";
import Roadmap from "./pages/Roadmap";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/add-mission" element={<AddMission />} />
      <Route path="/edit-mission/:missionId" element={<EditMission />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/internships" element={<Internships />} />
      <Route path="/roadmap" element={<Roadmap />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />

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
      <Route path="/onboarding" element={<Onboarding />} />

    </Routes>
  );
}

export default App;
