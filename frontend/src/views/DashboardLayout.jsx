import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import accessService from "../services/accessService";

// Maps route path → permission key
const PERM_KEY = {
  "/home/dashboard/profitability": "profitability",
  "/home/dashboard/balance-sheet": "balance_sheet",
  "/home/dashboard/liquidity":     "liquidity",
  "/home/dashboard/dso-dpo":       "dpo_dso",
};

const DASHBOARDS = [
  {
    label:   "Profitability",
    path:    "/home/dashboard/profitability",
    permKey: "profitability",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    label:   "Balance Sheet",
    path:    "/home/dashboard/balance-sheet",
    permKey: "balance_sheet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <line x1="3" y1="9"  x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="12" y1="9"  x2="12" y2="21" />
      </svg>
    ),
  },
  {
    label:   "Liquidity",
    path:    "/home/dashboard/liquidity",
    permKey: "liquidity",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
  },
  {
    label:   "DSO & DPO",
    path:    "/home/dashboard/dso-dpo",
    permKey: "dpo_dso",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v2M12 16v2M8.5 9a3.5 3.5 0 0 1 7 0c0 2-3.5 3-3.5 3s-3.5 1-3.5 3a3.5 3.5 0 0 0 7 0"/>
      </svg>
    ),
  },
];


const C = {
  navy:       "#092A5E",
  navyDark:   "#061C40",
  blue:       "#1A6FBF",
  blueLight:  "#A8C8E8",
  accent:     "#70CBF4",
  white:      "#FFFFFF",
  text:       "rgba(255,255,255,0.75)",
  textHover:  "#FFFFFF",
  activeBg:   "rgba(112,203,244,0.18)",
  activeBorder:"#70CBF4",
  divider:    "rgba(255,255,255,0.08)",
};

const SIDEBAR_WIDE     = 220;   // px when expanded
const SIDEBAR_NARROW   = 64;    // px when collapsed
const TRANSITION       = "0.22s cubic-bezier(0.4, 0, 0.2, 1)";


export default function DashboardLayout() {
  const [collapsed,    setCollapsed]    = useState(false);
  const [permissions,  setPermissions]  = useState(null);  // null = loading
  const navigate  = useNavigate();
  const location  = useLocation();

  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const isManager = user.role === "manager";

  useEffect(() => {
    if (isManager) {
      // Managers see everything — no need to fetch
      setPermissions({ profitability: true, balance_sheet: true, liquidity: true, dpo_dso: true });
      return;
    }
    accessService.getMyPermissions()
      .then(({ data }) => setPermissions(data))
      .catch(() => setPermissions({ profitability: false, balance_sheet: false, liquidity: false, dpo_dso: false }));
  }, []);

  const sidebarWidth = collapsed ? SIDEBAR_NARROW : SIDEBAR_WIDE;

  // Dashboards this user is allowed to see
  const allowedDashboards = permissions
    ? DASHBOARDS.filter(d => permissions[d.permKey])
    : [];

  // Check if the current route is accessible
  const currentPermKey = PERM_KEY[location.pathname];
  const isAccessDenied = permissions && currentPermKey && !permissions[currentPermKey];

  return (
    <div style={S.root}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{ ...S.sidebar, width: sidebarWidth }}>

        {/* Logo + collapse toggle */}
        <div style={S.sidebarTop}>
          {!collapsed && (
            <img
              src="/Tui_logo.png"
              alt="TUI"
              style={S.logo}
              onError={e => { e.target.style.display = "none"; }}
            />
          )}
          <button
            style={{ ...S.collapseBtn, marginLeft: collapsed ? "auto" : undefined, marginRight: collapsed ? "auto" : undefined }}
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {/* Hamburger / arrow icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 width="18" height="18"
                 style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: `transform ${TRANSITION}` }}>
              <line x1="3"  y1="6"  x2="21" y2="6"  />
              <line x1="3"  y1="12" x2="21" y2="12" />
              <line x1="3"  y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        {/* Section label */}
        {!collapsed && (
          <p style={S.sectionLabel}>Dashboards</p>
        )}
        {collapsed && <div style={{ height: 16 }} />}

        {/* Dashboard nav items */}
        <nav style={S.nav}>
          {permissions === null ? (
            // Loading state — show skeleton placeholders
            [1,2,3,4].map(i => (
              <div key={i} style={{ height: 40, margin: "2px 8px", borderRadius: 10, background: "rgba(255,255,255,0.06)" }} />
            ))
          ) : allowedDashboards.length === 0 ? (
            !collapsed && (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", padding: "8px 18px", margin: 0 }}>
                No dashboards assigned
              </p>
            )
          ) : allowedDashboards.map(({ label, path, icon }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                title={collapsed ? label : undefined}
                style={{
                  ...S.navItem,
                  ...(isActive ? S.navItemActive : {}),
                  justifyContent: collapsed ? "center" : "flex-start",
                  paddingLeft:    collapsed ? 0 : 18,
                }}
              >
                {isActive && <span style={S.activeStrip} />}
                <span style={{ ...S.navIcon, color: isActive ? C.accent : C.text }}>
                  {icon}
                </span>
                {!collapsed && (
                  <span style={{ ...S.navLabel, color: isActive ? C.white : C.text, fontWeight: isActive ? 700 : 400 }}>
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div style={S.divider} />

        {/* Back to Home */}
        <button
          style={{
            ...S.homeBtn,
            justifyContent: collapsed ? "center" : "flex-start",
            paddingLeft:    collapsed ? 0 : 18,
          }}
          onClick={() => navigate("/home")}
          title={collapsed ? "Back to Home" : undefined}
        >
          <span style={S.navIcon}>
            {/* Home icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                 width="20" height="20">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
              <path d="M9 21V12h6v9" />
            </svg>
          </span>
          {!collapsed && <span style={{ ...S.navLabel, color: C.text }}>Back to Home</span>}
        </button>

      </aside>

      {/* ── Main content (the active dashboard renders here) ─────────────── */}
      <main style={S.main}>
        {isAccessDenied ? (
          <div style={S.deniedWrap}>
            <div style={S.deniedCard}>
              <div style={S.deniedIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#D40E14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <h2 style={S.deniedTitle}>Access Restricted</h2>
              <p style={S.deniedSub}>You don't have permission to view this dashboard. Please contact your manager to request access.</p>
              <button style={S.deniedBtn} onClick={() => {
                const first = allowedDashboards[0];
                navigate(first ? first.path : "/home");
              }}>
                {allowedDashboards[0] ? "Go to my dashboards" : "Back to Home"}
              </button>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ④ Styles
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  root: {
    display:  "flex",
    height:   "100vh",
    overflow: "hidden",
    fontFamily: "Arial, sans-serif",
  },

  // ── Sidebar ──
  sidebar: {
    display:         "flex",
    flexDirection:   "column",
    background:      `linear-gradient(180deg, ${C.navyDark} 0%, ${C.navy} 100%)`,
    height:          "100vh",
    transition:      `width ${TRANSITION}`,
    overflowX:       "hidden",
    overflowY:       "auto",
    flexShrink:      0,
    boxShadow:       "4px 0 20px rgba(0,0,0,0.25)",
    position:        "relative",
    zIndex:          20,
  },

  sidebarTop: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    padding:        "16px 12px 12px",
    minHeight:      60,
    borderBottom:   `1px solid ${C.divider}`,
  },

  logo: {
    height:  28,
    filter:  "brightness(0) invert(1)",
    flexShrink: 0,
  },

  collapseBtn: {
    background:   "none",
    border:       "none",
    cursor:       "pointer",
    color:        C.text,
    padding:      6,
    borderRadius: 6,
    display:      "flex",
    alignItems:   "center",
    justifyContent: "center",
    transition:   `background ${TRANSITION}`,
  },

  sectionLabel: {
    fontSize:      10,
    fontWeight:    700,
    color:         "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    padding:       "14px 18px 6px",
    margin:        0,
  },

  nav: {
    display:       "flex",
    flexDirection: "column",
    gap:           2,
    padding:       "0 8px",
  },

  navItem: {
    display:        "flex",
    alignItems:     "center",
    gap:            12,
    width:          "100%",
    padding:        "10px 0",
    borderRadius:   10,
    border:         "none",
    background:     "none",
    cursor:         "pointer",
    position:       "relative",
    transition:     `background ${TRANSITION}, color ${TRANSITION}`,
    textAlign:      "left",
    whiteSpace:     "nowrap",
    overflow:       "hidden",
  },

  navItemActive: {
    background: C.activeBg,
  },

  activeStrip: {
    position:     "absolute",
    left:         0,
    top:          "20%",
    bottom:       "20%",
    width:        3,
    borderRadius: "0 3px 3px 0",
    background:   C.activeBorder,
  },

  navIcon: {
    flexShrink:     0,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    width:          24,
    color:          C.text,
  },

  navLabel: {
    fontSize:   13,
    transition: `color ${TRANSITION}`,
    overflow:   "hidden",
    textOverflow: "ellipsis",
  },

  divider: {
    margin:     "12px 16px",
    borderTop:  `1px solid ${C.divider}`,
  },

  homeBtn: {
    display:        "flex",
    alignItems:     "center",
    gap:            12,
    width:          "100%",
    padding:        "10px 0",
    borderRadius:   10,
    border:         "none",
    background:     "none",
    cursor:         "pointer",
    transition:     `background ${TRANSITION}`,
    textAlign:      "left",
    whiteSpace:     "nowrap",
    overflow:       "hidden",
    marginBottom:   8,
    paddingLeft:    18,
  },

  // ── Main content area ──
  main: {
    flex:        1,
    overflowY:   "auto",
    height:      "100vh",
    minWidth:    0,
  },

  // ── Access denied ──
  deniedWrap: {
    display: "flex", alignItems: "center", justifyContent: "center",
    height: "100%", background: "linear-gradient(160deg, #D6E8F7 0%, #EAF3FB 40%, #F5F9FD 100%)",
  },
  deniedCard: {
    background: "white", borderRadius: 20, padding: "48px 48px 40px",
    boxShadow: "0 4px 24px rgba(9,42,94,0.12)", textAlign: "center", maxWidth: 440,
  },
  deniedIcon:  { marginBottom: 20 },
  deniedTitle: { color: "#092A5E", fontSize: 22, fontWeight: 800, margin: "0 0 12px" },
  deniedSub:   { color: "#6B7280", fontSize: 14, lineHeight: 1.6, margin: "0 0 28px" },
  deniedBtn: {
    padding: "10px 28px", background: "#092A5E", color: "white",
    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: "Arial, sans-serif",
  },
};