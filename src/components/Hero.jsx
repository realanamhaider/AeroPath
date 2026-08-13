import { useNavigate } from "react-router";
import Button from "./Button";

function Hero() {
  const navigate = useNavigate();

  return (
    <main className="hero">
      <p className="eyebrow">MISSION CONTROL</p>

      <h1>
        Spend less time planning.
        <br />
        Spend more time becoming.
      </h1>

      <p className="hero-text">
        AeroPath automatically builds your roadmap, tracks your progress,
        and tells you exactly what to do next.
      </p>

      <div className="hero-buttons">
        <Button onClick={() => navigate("/login")}>
          Sign In
        </Button>

        <Button secondary onClick={() => navigate("/signup")}>
          Create Account
        </Button>
      </div>
    </main>
  );
}

export default Hero;