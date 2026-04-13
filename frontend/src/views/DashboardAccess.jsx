import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import accessService from "../services/accessService";

const DASHBOARDS = [
  { key: "profitability", label: "Profitability" },
  { key: "balance_sheet", label: "Balance Sheet" },
  { key: "liquidity",     label: "Liquidity Analysis" },
  { key: "dpo_dso",       label: "DPO & DSO" },
]

export default function DashboardAccess() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState(null)
  const [pending, setPending] = useState({})
  const [confirmation, setConfirmation] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // ── CONTROLLER CALL: US 1.5.3 — View all leaders with permissions ──
    accessService.getAllLeadersWithPermissions()
      .then(({ data }) => { setLeaders(data); setLoading(false) })
      .catch(() => { showToast("Failed to load data.", "error"); setLoading(false) })
  }, [])

  const toggle = async (userId, dashboard, currentValue) => {
    const enabled = !currentValue

    // Show confirmation when ENABLING access
    if (enabled) {
      const user = leaders.find(u => u.id === userId)
      const dashboardLabel = DASHBOARDS.find(d => d.key === dashboard)?.label
      setConfirmation({
        userId,
        dashboard,
        userName: user?.fullName || user?.email,
        dashboardLabel,
      })
      return
    }

    // Proceed with toggle (for disabling)
    await executeToggle(userId, dashboard, currentValue)
  }

  const executeToggle = async (userId, dashboard, currentValue) => {
    const key     = `${userId}-${dashboard}`
    const enabled = !currentValue

    // Optimistic update
    setLeaders(prev => prev.map(l =>
      l.id === userId
        ? { ...l, permissions: { ...l.permissions, [dashboard]: enabled } }
        : l
    ))
    setPending(p => ({ ...p, [key]: true }))

    try {
      // ── CONTROLLER CALL: US 1.5.1 / 1.5.2 — Grant or revoke access ──
      const { data } = await accessService.toggleDashboardAccess(userId, dashboard, enabled)
      showToast(data.message, "success")
    } catch {
      // Revert on failure
      setLeaders(prev => prev.map(l =>
        l.id === userId
          ? { ...l, permissions: { ...l.permissions, [dashboard]: currentValue } }
          : l
      ))
      showToast("Server error. Change not applied.", "error")
    } finally {
      setPending(p => { const n = { ...p }; delete n[key]; return n })
    }
  }

  const handleConfirm = () => {
    if (confirmation) {
      executeToggle(confirmation.userId, confirmation.dashboard, false)
      setConfirmation(null)
    }
  }

  const handleCancel = () => {
    setConfirmation(null)
  }

  const showToast = (message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/login")
  }

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <span style={styles.logo}><span style={styles.logoRed}>✈ TUI</span></span>
          <span style={styles.navDivider} />
          <span style={styles.navTitle}>FINANCIAL INTELLIGENCE PLATFORM</span>
          <span style={styles.navPage}>Dashboard Access Control</span>
        </div>
        <div style={styles.navRight}>
          <button onClick={() => navigate("/home")} style={styles.navLinkBtn}>Home</button>
          <button onClick={() => navigate("/profile")} style={styles.profileBtn}>Profile</button>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      <div style={styles.hero}>
        <div style={styles.heroAccent} />
        <h1 style={styles.heroTitle}>Dashboard Access Control</h1>
        <p style={styles.heroSub}>Grant or revoke dashboard access for Team Leaders and Members.</p>
      </div>

      <div style={styles.content}>
        {loading ? (
          <div style={styles.emptyState}>Loading...</div>
        ) : leaders.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>👥</span>
            <p style={styles.emptyText}>No user accounts found.</p>
            <p style={styles.emptySub}>Create Leader or Member accounts first to assign permissions.</p>
          </div>
        ) : (
          <>
            {[
              { roleKey: "leader", roleLabel: "Team Leaders" },
              { roleKey: "member", roleLabel: "Team Members" },
            ].map(({ roleKey, roleLabel }) => {
              const group = leaders.filter(u => u.role === roleKey)
              if (group.length === 0) return null
              return (
                <div key={roleKey} style={styles.groupSection}>
                  <div style={styles.groupHeading}>
                    <span style={{ ...styles.roleBadge, background: roleKey === "leader" ? "#1a2b4a" : "#6b7280" }}>
                      {roleLabel}
                    </span>
                    <span style={styles.groupCount}>{group.length} user{group.length > 1 ? "s" : ""}</span>
                  </div>
                  <div style={styles.tableCard}>
                    <div style={styles.tableHeader}>
                      <div style={{ ...styles.col, flex: 2 }}>User</div>
                      {DASHBOARDS.map(d => (
                        <div key={d.key} style={styles.col}>{d.label}</div>
                      ))}
                    </div>

                    {group.map((user, i) => (
                      <div key={user.id} style={{ ...styles.tableRow, background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <div style={{ ...styles.col, flex: 2 }}>
                          <div style={styles.leaderName}>{user.fullName || user.email}</div>
                          <div style={styles.leaderEmail}>{user.email}</div>
                          {user.team && <div style={styles.leaderTeam}>{user.team}</div>}
                        </div>

                        {DASHBOARDS.map(d => {
                          const isOn = user.permissions[d.key]
                          const key  = `${user.id}-${d.key}`
                          const busy = !!pending[key]
                          return (
                            <div key={d.key} style={styles.col}>
                              <button
                                onClick={() => !busy && toggle(user.id, d.key, isOn)}
                                style={{
                                  ...styles.toggle,
                                  background: isOn ? "#E8002D" : "#e5e7eb",
                                  opacity: busy ? 0.6 : 1,
                                  cursor: busy ? "wait" : "pointer",
                                }}
                              >
                                <span style={{
                                  ...styles.toggleThumb,
                                  transform: isOn ? "translateX(20px)" : "translateX(2px)",
                                }} />
                              </button>
                              <div style={{ ...styles.toggleLabel, color: isOn ? "#E8002D" : "#9ca3af" }}>
                                {isOn ? "Enabled" : "Disabled"}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {toast && (
        <div style={{
          ...styles.toast,
          background: toast.type === "success" ? "#1a2b4a" : "#E8002D",
        }}>
          {toast.message}
        </div>
      )}

      {confirmation && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Confirm Access Grant</h2>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                Grant access to <strong>{confirmation.dashboardLabel}</strong> for <strong>{confirmation.userName}</strong>?
              </p>
              <p style={styles.modalSubText}>
                An email notification will be sent to the user immediately.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button
                onClick={handleCancel}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={styles.confirmBtn}
              >
                Grant Access
              </button>
            </div>
          </div>
        </div>
      )}
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
  content: { padding: "40px 32px" },
  emptyState: { textAlign: "center", padding: "80px 0", color: "#888" },
  emptyIcon: { fontSize: "48px", display: "block", marginBottom: "16px" },
  emptyText: { fontSize: "18px", fontWeight: "600", color: "#1a2b4a", margin: "0 0 8px" },
  emptySub: { fontSize: "14px", color: "#9ca3af", margin: 0 },
  groupSection: { marginBottom: "28px" },
  groupHeading: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" },
  roleBadge: { color: "#fff", fontSize: "12px", fontWeight: "700", padding: "4px 12px", borderRadius: "20px" },
  groupCount: { fontSize: "12px", color: "#9ca3af", fontWeight: "600" },
  tableCard: { background: "#fff", borderRadius: "12px", boxShadow: "0 1px 6px rgba(0,0,0,0.08)", overflow: "hidden" },
  tableHeader: {
    display: "flex", alignItems: "center",
    background: "#1a2b4a", padding: "14px 24px",
    color: "#fff", fontSize: "12px", fontWeight: "700",
    textTransform: "uppercase", letterSpacing: "0.05em",
  },
  tableRow: { display: "flex", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #f0f0f0" },
  col: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" },
  leaderName: { fontWeight: "700", color: "#1a2b4a", fontSize: "14px", alignSelf: "flex-start" },
  leaderEmail: { fontSize: "12px", color: "#888", alignSelf: "flex-start" },
  leaderTeam: { fontSize: "11px", color: "#fff", background: "#1a2b4a", borderRadius: "4px", padding: "2px 8px", alignSelf: "flex-start", marginTop: "2px" },
  toggle: {
    width: "44px", height: "24px", borderRadius: "12px", border: "none",
    position: "relative", transition: "background 0.2s",
  },
  toggleThumb: {
    position: "absolute", top: "2px",
    width: "20px", height: "20px",
    background: "#fff", borderRadius: "50%",
    transition: "transform 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  },
  toggleLabel: { fontSize: "11px", fontWeight: "600" },
  toast: {
    position: "fixed", bottom: "32px", right: "32px",
    color: "#fff", padding: "14px 24px", borderRadius: "8px",
    fontWeight: "600", fontSize: "14px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  },
  modalOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.4)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  modal: {
    background: "#fff", borderRadius: "12px", boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
    width: "90%", maxWidth: "420px", overflow: "hidden",
  },
  modalHeader: {
    padding: "24px 24px 16px", borderBottom: "1px solid #e5e7eb",
  },
  modalTitle: {
    margin: 0, fontSize: "18px", fontWeight: "700", color: "#1a2b4a",
  },
  modalBody: {
    padding: "24px",
  },
  modalText: {
    margin: "0 0 12px", fontSize: "16px", color: "#374151", lineHeight: 1.5,
  },
  modalSubText: {
    margin: 0, fontSize: "13px", color: "#9ca3af", lineHeight: 1.5,
  },
  modalFooter: {
    display: "flex", gap: "12px", padding: "16px 24px",
    borderTop: "1px solid #e5e7eb", justifyContent: "flex-end",
  },
  cancelBtn: {
    padding: "10px 20px", border: "1px solid #d1d5db", background: "#fff",
    borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px",
    color: "#374151", transition: "all 0.2s",
  },
  confirmBtn: {
    padding: "10px 20px", background: "#E8002D", color: "#fff",
    border: "none", borderRadius: "6px", cursor: "pointer",
    fontWeight: "600", fontSize: "14px", transition: "all 0.2s",
  },
}