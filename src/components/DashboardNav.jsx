import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

function DashboardNav() {
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <nav className="dashboard-nav">
      <NavLink to="/dashboard">Flight Plan</NavLink>
      <NavLink to="/projects">Projects</NavLink>
      <NavLink to="/library">Library</NavLink>
      <NavLink to="/internships">Internships</NavLink>
      <NavLink to="/roadmap">Roadmap</NavLink>
      <NavLink to="/profile">Profile</NavLink>
      <NavLink to="/settings">Settings</NavLink>

      <button
        type="button"
        className="signout-button"
        onClick={handleSignOut}
      >
        Sign Out
      </button>
    </nav>
  );
}

export default DashboardNav;