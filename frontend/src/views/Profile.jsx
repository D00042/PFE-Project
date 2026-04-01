import { useState } from "react"
import { useNavigate } from "react-router-dom"
import authService from '../services/authService'

function Profile() {
  const [oldPassword, setOldPassword]         = useState("")
  const [password, setPassword]               = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [status, setStatus]                   = useState(null)
  const navigate = useNavigate()

  // ── CONTROLLER CALL: logout ──────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/login")
  }

  // ── Password strength ────────────────────────────────────────────
  const getStrength = (pwd) => {
    let score = 0
    if (pwd.length >= 8)            score++
    if (pwd.length >= 12)           score++
    if (/[A-Z]/.test(pwd))          score++
    if (/[0-9]/.test(pwd))          score++
    if (/[^A-Za-z0-9]/.test(pwd))   score++
    return score
  }

  const strengthInfo = [
    { label: "",             color: "#e5e7eb" },
    { label: "Very weak",    color: "#ef4444" },
    { label: "Weak",         color: "#f97316" },
    { label: "Fair",         color: "#eab308" },
    { label: "Strong",       color: "#22c55e" },
    { label: "Very strong",  color: "#15803d" },
  ]

  const score    = getStrength(password)
  const strength = strengthInfo[score]

  const rules = [
    { label: "At least 8 characters",         ok: password.length >= 8 },
    { label: "At least one uppercase letter",  ok: /[A-Z]/.test(password) },
    { label: "At least one number",            ok: /[0-9]/.test(password) },
    { label: "At least one special character", ok: /[^A-Za-z0-9]/.test(password) },
  ]

  // ── CONTROLLER CALL: US 1.1 — Change password ───────────────────
  const changePassword = async () => {
    if (!oldPassword) {
      setStatus({ type: "error", message: "Please enter your current password." })
      return
    }
    if (rules.some(r => !r.ok)) {
      setStatus({ type: "error", message: "New password does not meet all requirements." })
      return
    }
    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." })
      return
    }

    try {
      await authService.changePassword({
        old_password: oldPassword,
        new_password: password,
      })

      setStatus({ type: "success", message: "Password updated! A confirmation email has been sent to you." })
      setOldPassword("")
      setPassword("")
      setConfirmPassword("")
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Something went wrong."
      setStatus({ type: "error", message: msg })
    }
  }

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <span style={styles.logo}><span style={styles.logoRed}>✈ TUI</span></span>
          <span style={styles.navDivider} />
          <span style={styles.navTitle}>FINANCIAL INTELLIGENCE PLATFORM</span>
          <span style={styles.navPage}>Profile</span>
        </div>
        <div style={styles.navRight}>
          <button onClick={() => navigate("/home")} style={styles.navLinkBtn}>Home</button>
          <button style={styles.profileBtn}>Profile</button>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroAccent} />
        <h1 style={styles.heroTitle}>My Profile</h1>
        <p style={styles.heroSub}>Manage your account settings and security.</p>
      </div>

      {/* Card */}
      <div style={styles.content}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Change Password</h2>
          <p style={styles.cardSub}>You will receive a confirmation email once updated.</p>

          {/* Current password */}
          <div style={styles.field}>
            <label style={styles.label}>Current Password</label>
            <input
              type="password"
              placeholder="Enter your current password"
              value={oldPassword}
              onChange={(e) => { setOldPassword(e.target.value); setStatus(null) }}
              style={styles.input}
            />
          </div>

          <hr style={styles.divider} />

          {/* New password */}
          <div style={styles.field}>
            <label style={styles.label}>New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setStatus(null) }}
              style={styles.input}
            />
          </div>

          {/* Strength bar */}
          {password.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={styles.barTrack}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{
                    ...styles.barSegment,
                    background: i <= score ? strength.color : "#e5e7eb",
                  }} />
                ))}
              </div>
              <span style={{ fontSize: "12px", color: strength.color, fontWeight: "600" }}>
                {strength.label}
              </span>
              <ul style={styles.ruleList}>
                {rules.map(r => (
                  <li key={r.label} style={{ ...styles.ruleItem, color: r.ok ? "#15803d" : "#9ca3af" }}>
                    <span style={{ marginRight: "6px" }}>{r.ok ? "✓" : "○"}</span>
                    {r.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confirm password */}
          <div style={styles.field}>
            <label style={styles.label}>Confirm New Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setStatus(null) }}
              style={{
                ...styles.input,
                borderColor: confirmPassword && confirmPassword !== password ? "#E8002D" : "#ddd",
              }}
            />
            {confirmPassword && confirmPassword !== password && (
              <span style={{ fontSize: "12px", color: "#E8002D", marginTop: "4px", display: "block" }}>
                Passwords do not match
              </span>
            )}
          </div>

          {/* Status */}
          {status && (
            <div style={{
              ...styles.statusBox,
              background: status.type === "success" ? "#f0fdf4" : "#fff1f2",
              borderLeft: `4px solid ${status.type === "success" ? "#22c55e" : "#E8002D"}`,
              color: status.type === "success" ? "#15803d" : "#b91c1c",
            }}>
              {status.message}
            </div>
          )}

          <button onClick={changePassword} style={styles.submitBtn}>
            Update Password
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Segoe UI', sans-serif" },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#fff", padding: "0 32px", height: "60px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)", position: "sticky", top: 0, zIndex: 100,
  },
  navLeft: { display: "flex", alignItems: "center", gap: "12px" },
  logo: { fontSize: "18px", fontWeight: "800" },
  logoRed: { color: "#E8002D" },
  navDivider: { width: "1px", height: "20px", background: "#ddd" },
  navTitle: { fontSize: "11px", color: "#888", letterSpacing: "0.05em", fontWeight: "600", textTransform: "uppercase" },
  navPage: { fontSize: "15px", fontWeight: "700", color: "#1a2b4a", marginLeft: "8px" },
  navRight: { display: "flex", alignItems: "center", gap: "10px" },
  navLinkBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#444", padding: "6px 10px" },
  profileBtn: {
    background: "#E8002D", color: "#fff", border: "none",
    borderRadius: "6px", padding: "6px 16px", fontWeight: "600", fontSize: "14px", cursor: "pointer",
  },
  logoutBtn: {
    background: "#E8002D", color: "#fff", border: "none",
    borderRadius: "6px", padding: "6px 16px", fontWeight: "600", fontSize: "14px", cursor: "pointer",
  },
  hero: {
    background: "linear-gradient(135deg, #1a2b4a 0%, #2d4a7a 100%)",
    padding: "48px 32px 40px", color: "#fff",
  },
  heroAccent: { width: "48px", height: "4px", background: "#E8002D", borderRadius: "2px", marginBottom: "16px" },
  heroTitle: { margin: "0 0 8px", fontSize: "32px", fontWeight: "800" },
  heroSub: { margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "15px" },
  content: { padding: "40px 32px", maxWidth: "520px" },
  card: { background: "#fff", borderRadius: "12px", padding: "32px", boxShadow: "0 1px 6px rgba(0,0,0,0.08)" },
  cardTitle: { margin: "0 0 6px", fontSize: "18px", fontWeight: "700", color: "#1a2b4a" },
  cardSub: { margin: "0 0 24px", fontSize: "13px", color: "#888" },
  divider: { border: "none", borderTop: "1px solid #f0f0f0", margin: "20px 0" },
  field: { marginBottom: "18px" },
  label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#444", marginBottom: "6px" },
  input: {
    width: "100%", padding: "10px 14px", fontSize: "14px",
    border: "1px solid #ddd", borderRadius: "8px", outline: "none", boxSizing: "border-box",
  },
  barTrack: { display: "flex", gap: "4px", marginBottom: "4px" },
  barSegment: { flex: 1, height: "5px", borderRadius: "3px", transition: "background 0.3s" },
  ruleList: { listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: "4px" },
  ruleItem: { fontSize: "12px", fontWeight: "500" },
  statusBox: { padding: "12px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "500", marginBottom: "18px" },
  submitBtn: {
    background: "#E8002D", color: "#fff", border: "none",
    borderRadius: "8px", padding: "12px 28px", fontWeight: "700",
    fontSize: "14px", cursor: "pointer", width: "100%", marginTop: "4px",
  },
}

export default Profile