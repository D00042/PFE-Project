import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import authService from '../services/authService'

const API = "http://localhost:8000"

function Profile() {
  const navigate = useNavigate()

  // Profile info state 
  const [profileForm, setProfileForm] = useState({ fullName: '', email: '', telephone: '' })
  const [profileErrors, setProfileErrors] = useState({})
  const [profileStatus, setProfileStatus] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Password state 
  const [oldPassword, setOldPassword]         = useState("")
  const [password, setPassword]               = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passStatus, setPassStatus]           = useState(null)
  const [passLoading, setPassLoading]         = useState(false)

  // Load current user info on mount 
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { navigate('/login'); return }
    const u = JSON.parse(stored)
    setProfileForm({
      fullName:  u.fullName  || '',
      email:     u.email     || '',
      telephone: u.telephone || '',
    })
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/login")
  }

  // Validators 
  const validateFullName = (v) => {
    if (!v.trim()) return "Full name is required."
    if (v.trim().length < 2) return "Name must be at least 2 characters."
    return ""
  }

  const validateEmail = (v) => {
    if (!v) return "Email is required."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Invalid email address."
    return ""
  }

  const validateTelephone = (v) => {
    if (!v) return "" // telephone is optional
    if (!/^\+?[0-9\s\-().]{7,20}$/.test(v)) return "Invalid phone number format."
    if (v.replace(/\D/g, "").length < 7) return "Phone number too short."
    return ""
  }

  // Handle profile field change with live validation 
  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileForm(p => ({ ...p, [name]: value }))
    let err = ""
    if (name === 'fullName')  err = validateFullName(value)
    if (name === 'email')     err = validateEmail(value)
    if (name === 'telephone') err = validateTelephone(value)
    setProfileErrors(p => ({ ...p, [name]: err }))
  }

  // Save profile info 
  const saveProfile = async () => {
    const nameErr = validateFullName(profileForm.fullName)
    const emailErr = validateEmail(profileForm.email)
    const telErr   = validateTelephone(profileForm.telephone)

    if (nameErr || emailErr || telErr) {
      setProfileErrors({ fullName: nameErr, email: emailErr, telephone: telErr })
      return
    }

    setProfileLoading(true)
    setProfileStatus(null)
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token")
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullName:  profileForm.fullName,
          email:     profileForm.email,
          telephone: profileForm.telephone,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Update failed')
      }
      // Update local storage with new info
      const stored = localStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        localStorage.setItem('user', JSON.stringify({ ...u, ...profileForm }))
      }
      setProfileStatus({ type: 'success', message: 'Profile updated successfully!' })
    } catch (e) {
      setProfileStatus({ type: 'error', message: e.message || 'Something went wrong.' })
    } finally {
      setProfileLoading(false)
    }
  }

  // Password strength 
  const getStrength = (pwd) => {
    let score = 0
    if (pwd.length >= 8)           score++
    if (pwd.length >= 12)          score++
    if (/[A-Z]/.test(pwd))         score++
    if (/[0-9]/.test(pwd))         score++
    if (/[^A-Za-z0-9]/.test(pwd))  score++
    return score
  }

  const strengthInfo = [
    { label: "",            color: "#e5e7eb" },
    { label: "Very weak",   color: "#ef4444" },
    { label: "Weak",        color: "#f97316" },
    { label: "Fair",        color: "#eab308" },
    { label: "Strong",      color: "#22c55e" },
    { label: "Very strong", color: "#15803d" },
  ]

  const score    = getStrength(password)
  const strength = strengthInfo[score]

  const passRules = [
    { label: "At least 8 characters",         ok: password.length >= 8 },
    { label: "At least one uppercase letter",  ok: /[A-Z]/.test(password) },
    { label: "At least one number",            ok: /[0-9]/.test(password) },
    { label: "At least one special character", ok: /[^A-Za-z0-9]/.test(password) },
  ]

  // Change password 
  const changePassword = async () => {
    if (!oldPassword) {
      setPassStatus({ type: "error", message: "Please enter your current password." })
      return
    }
    if (passRules.some(r => !r.ok)) {
      setPassStatus({ type: "error", message: "New password does not meet all requirements." })
      return
    }
    if (password !== confirmPassword) {
      setPassStatus({ type: "error", message: "Passwords do not match." })
      return
    }

    setPassLoading(true)
    setPassStatus(null)
    try {
      await authService.changePassword({ old_password: oldPassword, new_password: password })
      setPassStatus({ type: "success", message: "Password updated! A confirmation email has been sent to you." })
      setOldPassword("")
      setPassword("")
      setConfirmPassword("")
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Something went wrong."
      setPassStatus({ type: "error", message: msg })
    } finally {
      setPassLoading(false)
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
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroAccent} />
        <h1 style={styles.heroTitle}>My Profile</h1>
        <p style={styles.heroSub}>Manage your account information and security settings.</p>
      </div>

      <div style={styles.content}>

        {/* Card 1: Personal Information */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Personal Information</h2>
          <p style={styles.cardSub}>Update your name, email address, and phone number.</p>

          <div style={styles.field}>
            <label style={styles.label}>Full Name *</label>
            <input
              type="text"
              name="fullName"
              value={profileForm.fullName}
              onChange={handleProfileChange}
              placeholder="e.g. Sarah Johnson"
              style={{ ...styles.input, borderColor: profileErrors.fullName ? '#E8002D' : '#ddd' }}
            />
            {profileErrors.fullName && <span style={styles.errMsg}>{profileErrors.fullName}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email Address *</label>
            <input
              type="email"
              name="email"
              value={profileForm.email}
              onChange={handleProfileChange}
              placeholder="sarah@tui.com"
              style={{ ...styles.input, borderColor: profileErrors.email ? '#E8002D' : '#ddd' }}
            />
            {profileErrors.email && <span style={styles.errMsg}>{profileErrors.email}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Phone Number</label>
            <input
              type="text"
              name="telephone"
              value={profileForm.telephone}
              onChange={handleProfileChange}
              placeholder="+216 XX XXX XXX"
              style={{ ...styles.input, borderColor: profileErrors.telephone ? '#E8002D' : '#ddd' }}
            />
            {profileErrors.telephone && <span style={styles.errMsg}>{profileErrors.telephone}</span>}
            <span style={styles.hintMsg}>Optional — format: +216 XX XXX XXX</span>
          </div>

          {profileStatus && (
            <div style={{
              ...styles.statusBox,
              background:  profileStatus.type === 'success' ? '#f0fdf4' : '#fff1f2',
              borderLeft: `4px solid ${profileStatus.type === 'success' ? '#22c55e' : '#E8002D'}`,
              color:       profileStatus.type === 'success' ? '#15803d' : '#b91c1c',
            }}>
              {profileStatus.message}
            </div>
          )}

          <button
            onClick={saveProfile}
            disabled={profileLoading}
            style={{ ...styles.submitBtn, opacity: profileLoading ? 0.6 : 1 }}>
            {profileLoading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Card 2: Change Password */}
        <div style={{ ...styles.card, marginTop: 24 }}>
          <h2 style={styles.cardTitle}>Change Password</h2>
          <p style={styles.cardSub}>You will receive a confirmation email once updated.</p>

          <div style={styles.field}>
            <label style={styles.label}>Current Password</label>
            <input
              type="password"
              placeholder="Enter your current password"
              value={oldPassword}
              onChange={(e) => { setOldPassword(e.target.value); setPassStatus(null) }}
              style={styles.input}
            />
          </div>

          <hr style={styles.divider} />

          <div style={styles.field}>
            <label style={styles.label}>New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPassStatus(null) }}
              style={styles.input}
            />
          </div>

          {password.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={styles.barTrack}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ ...styles.barSegment, background: i <= score ? strength.color : "#e5e7eb" }} />
                ))}
              </div>
              <span style={{ fontSize: "12px", color: strength.color, fontWeight: "600" }}>{strength.label}</span>
              <ul style={styles.ruleList}>
                {passRules.map(r => (
                  <li key={r.label} style={{ ...styles.ruleItem, color: r.ok ? "#15803d" : "#9ca3af" }}>
                    <span style={{ marginRight: "6px" }}>{r.ok ? "✓" : "○"}</span>
                    {r.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Confirm New Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPassStatus(null) }}
              style={{
                ...styles.input,
                borderColor: confirmPassword && confirmPassword !== password ? "#E8002D" : "#ddd",
              }}
            />
            {confirmPassword && confirmPassword !== password && (
              <span style={styles.errMsg}>Passwords do not match</span>
            )}
          </div>

          {passStatus && (
            <div style={{
              ...styles.statusBox,
              background:  passStatus.type === "success" ? "#f0fdf4" : "#fff1f2",
              borderLeft: `4px solid ${passStatus.type === "success" ? "#22c55e" : "#E8002D"}`,
              color:       passStatus.type === "success" ? "#15803d" : "#b91c1c",
            }}>
              {passStatus.message}
            </div>
          )}

          <button
            onClick={changePassword}
            disabled={passLoading}
            style={{ ...styles.submitBtn, opacity: passLoading ? 0.6 : 1 }}>
            {passLoading ? 'Updating…' : 'Update Password'}
          </button>
        </div>

      </div>
    </div>
  )
}

const styles = {
  page:       { minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Segoe UI', sans-serif" },
  nav:        { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "0 32px", height: "60px", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", position: "sticky", top: 0, zIndex: 100 },
  navLeft:    { display: "flex", alignItems: "center", gap: "12px" },
  logo:       { fontSize: "18px", fontWeight: "800" },
  logoRed:    { color: "#E8002D" },
  navDivider: { width: "1px", height: "20px", background: "#ddd" },
  navTitle:   { fontSize: "11px", color: "#888", letterSpacing: "0.05em", fontWeight: "600", textTransform: "uppercase" },
  navPage:    { fontSize: "15px", fontWeight: "700", color: "#1a2b4a", marginLeft: "8px" },
  navRight:   { display: "flex", alignItems: "center", gap: "10px" },
  navLinkBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#444", padding: "6px 10px" },
  logoutBtn:  { background: "#E8002D", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 16px", fontWeight: "600", fontSize: "14px", cursor: "pointer" },
  hero:       { background: "linear-gradient(135deg, #1a2b4a 0%, #2d4a7a 100%)", padding: "48px 32px 40px", color: "#fff" },
  heroAccent: { width: "48px", height: "4px", background: "#E8002D", borderRadius: "2px", marginBottom: "16px" },
  heroTitle:  { margin: "0 0 8px", fontSize: "32px", fontWeight: "800" },
  heroSub:    { margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "15px" },
  content:    { padding: "40px 32px", maxWidth: "560px" },
  card:       { background: "#fff", borderRadius: "12px", padding: "32px", boxShadow: "0 1px 6px rgba(0,0,0,0.08)" },
  cardTitle:  { margin: "0 0 6px", fontSize: "18px", fontWeight: "700", color: "#1a2b4a" },
  cardSub:    { margin: "0 0 24px", fontSize: "13px", color: "#888" },
  divider:    { border: "none", borderTop: "1px solid #f0f0f0", margin: "20px 0" },
  field:      { marginBottom: "18px" },
  label:      { display: "block", fontSize: "13px", fontWeight: "600", color: "#444", marginBottom: "6px" },
  input:      { width: "100%", padding: "10px 14px", fontSize: "14px", border: "1px solid #ddd", borderRadius: "8px", outline: "none", boxSizing: "border-box" },
  errMsg:     { display: "block", fontSize: "11px", color: "#E8002D", marginTop: "4px" },
  hintMsg:    { display: "block", fontSize: "11px", color: "#9CA3AF", marginTop: "4px" },
  statusBox:  { padding: "12px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "500", marginBottom: "18px" },
  submitBtn:  { background: "#E8002D", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 28px", fontWeight: "700", fontSize: "14px", cursor: "pointer", width: "100%", marginTop: "4px" },
  barTrack:   { display: "flex", gap: "4px", marginBottom: "4px" },
  barSegment: { flex: 1, height: "5px", borderRadius: "3px", transition: "background 0.3s" },
  ruleList:   { listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: "4px" },
  ruleItem:   { fontSize: "12px", fontWeight: "500" },
}

export default Profile