import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authController from "../controllers/authController.js";

function AuthApp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user  = localStorage.getItem("user");
    if (token && user) {
      navigate("/home");
    }
  }, [navigate]);

  const login = async () => {
    setLoading(true);
    setOutput("");
    try {
      // ── CONTROLLER CALL: US 1.1 Basic Scenario ──────────────────
      const { data } = await authController.login({ email, password });

      localStorage.setItem("token", data.access_token);

      // ── CONTROLLER CALL: US 1.1 — fetch role after login ────────
      const { data: meData } = await authController.getProfile();
      const userData = { id: meData.id, email: meData.email, role: meData.role };
      localStorage.setItem("user", JSON.stringify(userData));

      navigate("/home");

    } catch (err) {
      // ── Alternative Scenario 3.2: deactivated account ───────────
      if (err?.response?.status === 403) {
        setOutput("Your account has been disabled. Please contact your Team Leader.");
      // ── Alternative Scenario 3.1: invalid credentials ───────────
      } else if (err?.response?.status === 401) {
        setOutput("Login failed: Invalid credentials.");
      } else {
        setOutput("Network error. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") login();
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <img src="/Tui_logo.png" alt="TUI Logo" style={styles.logo} />
        <h2 style={styles.title}>Sign In</h2>
        <p style={styles.subtitle}>Financial Intelligence Platform</p>

        <input
          style={styles.input}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="email"
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="current-password"
        />

        <button
          style={{ ...styles.primaryButton, opacity: loading ? 0.7 : 1 }}
          onClick={login}
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>

        {output && (
          <pre style={styles.output}>{output}</pre>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    backgroundColor: "#F5F7FA",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "420px",
    padding: "48px 40px",
    borderRadius: "20px",
    backgroundColor: "#ffffff",
    boxShadow: "0 10px 40px rgba(0,0,0,0.10)",
    textAlign: "center",
  },
  logo: {
    width: "120px",
    marginBottom: "24px",
  },
  title: {
    color: "#092A5E",
    marginBottom: "4px",
    fontSize: "24px",
    fontWeight: "800",
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: "13px",
    marginBottom: "28px",
    margin: "0 0 28px",
  },
  input: {
    width: "100%",
    padding: "13px 16px",
    marginBottom: "14px",
    borderRadius: "12px",
    border: "2px solid #E5E7EB",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
    transition: "border-color 0.2s",
  },
  primaryButton: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#D40E14",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "15px",
    marginBottom: "16px",
    fontFamily: "Arial, sans-serif",
  },
  output: {
    backgroundColor: "#FEF2F2",
    color: "#D40E14",
    padding: "12px 15px",
    borderRadius: "10px",
    textAlign: "left",
    fontSize: "12px",
    border: "1px solid #FECACA",
    overflow: "auto",
    whiteSpace: "pre-wrap",
  },
};

export default AuthApp;