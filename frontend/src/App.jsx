import { useState, useEffect } from "react";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [output, setOutput] = useState("");
  const [user, setUser] = useState(null); // { email, role } after login
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  // Create account form (leader only)
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("member");

  // Fetch /me when token exists (to get role and enforce 401)
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    const fetchMe = async () => {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        setOutput("Session expired. Please log in again.");
        return;
      }
      const data = await res.json();
      setUser({ email: data.email, role: data.role });
    };
    fetchMe();
  }, [token]);

  const login = async () => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("token", data.access_token);
      setToken(data.access_token);
      setOutput("Logged in successfully. Fetching profile…");
    } else {
      setOutput("Login failed: " + (data.detail || JSON.stringify(data)));
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setOutput("Logged out.");
  };

  const createAccount = async () => {
    if (user?.role !== "leader") return;
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        role: newRole,
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setOutput("Account created: " + newEmail);
      setNewEmail("");
      setNewPassword("");
    } else if (response.status === 403) {
      setOutput("403: Only leaders can create accounts.");
    } else {
      setOutput("Error: " + (data.detail || JSON.stringify(data)));
    }
  };

  const callPanel = async (panel) => {
    const response = await fetch(`${API_URL}/auth/${panel}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (response.ok) {
      setOutput(JSON.stringify(data, null, 2));
    } else if (response.status === 401) {
      setOutput("401: Not authenticated. Please log in.");
      logout();
    } else if (response.status === 403) {
      setOutput("403: Not allowed for your role.");
    } else {
      setOutput("Error: " + (data.detail || JSON.stringify(data)));
    }
  };


  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <img src="/Tui_logo.png" alt="TUI Logo" style={styles.logo} />
        <h2 style={styles.title}>Authentication</h2>

        {!user ? (
          <>
            <input
              style={styles.input}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button style={styles.primaryButton} onClick={login}>
              Login
            </button>
          </>
        ) : (
          <>
            <p style={styles.userInfo}>
              Logged in as <strong>{user.email}</strong> ({user.role})
            </p>

            <div style={styles.actions}>
              <button style={styles.panelButton} onClick={() => callPanel("member")}>
                Member panel
              </button>
              <button style={styles.panelButton} onClick={() => callPanel("leader")}>
                Leader panel
              </button>
              <button style={styles.panelButton} onClick={() => callPanel("manager")}>
                Manager panel
              </button>
            </div>

            {user.role === "leader" && (
              <div style={styles.createAccount}>
                <h3 style={styles.subtitle}>Create account (leader only)</h3>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="New user email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <input
                  style={styles.input}
                  type="password"
                  placeholder="New user password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <select
                  style={styles.input}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="member">member</option>
                  <option value="leader">leader</option>
                  <option value="manager">manager</option>
                </select>
                <button style={styles.primaryButton} onClick={createAccount}>
                  Create account
                </button>
              </div>
            )}

            <button style={styles.logoutButton} onClick={logout}>
              Logout
            </button>
          </>
        )}

        <pre style={styles.output}>{output}</pre>
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
    padding: "40px",
    borderRadius: "16px",
    backgroundColor: "#ffffff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  logo: {
    width: "120px",
    marginBottom: "20px",
  },
  title: {
    color: "#002B49",
    marginBottom: "20px",
  },
  subtitle: {
    color: "#002B49",
    fontSize: "14px",
    marginBottom: "12px",
  },
  userInfo: {
    color: "#002B49",
    marginBottom: "16px",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
    borderRadius: "8px",
    border: "1px solid #C3D7EE",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  primaryButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#DA291C",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    marginBottom: "12px",
  },
  panelButton: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#6CACE4",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  createAccount: {
    marginBottom: "20px",
    padding: "12px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    textAlign: "left",
  },
  logoutButton: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#FEDB00",
    color: "#002B49",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    marginBottom: "16px",
  },
  output: {
    backgroundColor: "#002B49",
    color: "#ffffff",
    padding: "15px",
    borderRadius: "8px",
    textAlign: "left",
    fontSize: "12px",
    minHeight: "60px",
    overflow: "auto",
  },
};

export default App;
