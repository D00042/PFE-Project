import { useState } from "react";

const C = {
  navy:  "#092A5E",
  red:   "#D40E14",
  green: "#16A34A",
  grey:  "#9CA3AF",
  blue:  "#1A6FBF",
};

const API_URL = "http://localhost:8000";

function Spinner() {
  return (
    <div style={{
      width: 16, height: 16, flexShrink: 0,
      border: "3px solid rgba(255,255,255,0.4)",
      borderTop: "3px solid white",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

// year and period come directly from the profitability dashboard filters
export default function GlobalAIPanel({ year, period }) {
  // Check user role from localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const canGenerate = user && (user.role === "leader" || user.role === "manager");

  // Hide panel entirely for members
  if (!canGenerate) return null;

  const [open,    setOpen]    = useState(false);
  const [result,  setResult]  = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/ai-insights/generate/global`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ year, period, dashboard: "global" }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.detail === "string"
          ? data.detail
          : Array.isArray(data.detail)
            ? data.detail.map(e => e.msg).join(", ")
            : "Request failed.";
        setError(msg);
        return;
      }
      setResult(data.result);
      setSavedAt(data.savedAt);
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const { bullets = [], legal_flags = [] } = result || {};

  return (
    <div style={{ padding: "0 28px 16px" }}>
      <div style={S.panel}>

        {/* ── Header (clickable to collapse/expand) ── */}
        <div style={S.header} onClick={() => setOpen(o => !o)}>
          <div style={S.headerLeft}>
            <div>
              <p style={S.title}>Global Financial Interpretation</p>
              <p style={S.sub}>
                Analyses all four dashboards · Year {year} · {period}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {result && (
              <span style={S.savedBadge}>✓ Result available</span>
            )}
            <span style={{ fontSize: 12, color: C.grey }}>{open ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* ── Body ── */}
        {open && (
          <div style={S.body}>

            {/* Generate button row */}
            <div style={S.controlsRow}>
              <p style={S.description}>
                This interpretation reads data from all four dashboards.
              </p>
              <button
                style={{
                  ...S.genBtn,
                  opacity: loading ? 0.6 : 1,
                  cursor:  loading ? "not-allowed" : "pointer",
                  flexShrink: 0,
                }}
                onClick={generate}
                disabled={loading}
              >
                {loading
                  ? <><Spinner />&nbsp; Analysing…</>
                  : "Generate"
                }
              </button>
            </div>

            {error && (
              <p style={{ color: C.red, fontSize: 12, margin: "0 0 10px" }}>{error}</p>
            )}

            {/* Result */}
            {result && (
              <div style={S.resultBox}>
                <div style={S.resultHeader}>
                  <span style={S.resultLabel}>
                    Global Interpretation — {year} · {period}
                  </span>
                  {savedAt && (
                    <span style={S.savedTag}>
                      ✓ Saved · {new Date(savedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {legal_flags.length > 0 && (
                  <div style={S.flagBox}>
                    <p style={S.flagTitle}>⚠ Financial Risk</p>
                    {legal_flags.map((f, i) => (
                      <p key={i} style={S.flagItem}>{f}</p>
                    ))}
                  </div>
                )}

                <ul style={S.bulletList}>
                  {bullets.map((b, i) => (
                    <li key={i} style={S.bulletItem}>
                      <span style={S.bulletDot} />
                      <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p style={S.historyNote}>
              View all saved global interpretations on the{" "}
              <a href="/home/dashboard/ai-insights" style={{ color: C.blue, fontWeight: 700 }}>
                AI Insights page
              </a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  panel: {
    background:   "white",
    borderRadius: 16,
    boxShadow:    "0 2px 12px rgba(0,31,91,0.08)",
    border:       "1px solid #E5E7EB",
    overflow:     "hidden",
  },
  header: {
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "space-between",
    padding:         "14px 20px",
    cursor:          "pointer",
    backgroundColor: "#F0F4FF",
    borderBottom:    "1px solid #E5E7EB",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  title: { margin: 0, fontSize: 14, fontWeight: 800, color: C.navy },
  sub:   { margin: 0, fontSize: 11, color: C.grey },
  savedBadge: {
    fontSize: 11, fontWeight: 700, color: C.green,
    backgroundColor: "#D1FAE5", padding: "2px 8px", borderRadius: 10,
  },
  body: { padding: "16px 20px" },
  controlsRow: {
    display:        "flex",
    alignItems:     "flex-start",
    justifyContent: "space-between",
    gap:            16,
    marginBottom:   12,
  },
  description: {
    margin: 0, fontSize: 12, color: C.grey, lineHeight: 1.6, flex: 1,
  },
  genBtn: {
    display:         "flex",
    alignItems:      "center",
    gap:             8,
    padding:         "8px 18px",
    backgroundColor: C.navy,
    color:           "white",
    border:          "none",
    borderRadius:    10,
    fontSize:        13,
    fontWeight:      700,
    fontFamily:      "Arial, sans-serif",
  },
  resultBox: {
    backgroundColor: "#F8FAFC",
    borderRadius:    12,
    padding:         "16px 18px",
    marginBottom:    10,
  },
  resultHeader: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   10,
    flexWrap:       "wrap",
    gap:            8,
  },
  resultLabel: { fontSize: 13, fontWeight: 700, color: C.navy },
  savedTag: {
    fontSize: 11, color: C.green,
    backgroundColor: "#D1FAE5", padding: "2px 8px", borderRadius: 8, fontWeight: 600,
  },
  flagBox: {
    backgroundColor: "#FEF2F2", border: "1px solid #FECACA",
    borderRadius: 8, padding: "10px 14px", marginBottom: 12,
  },
  flagTitle: { margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: C.red },
  flagItem:  { margin: "4px 0 0", fontSize: 12, color: "#7F1D1D", lineHeight: 1.5 },
  bulletList: {
    margin: 0, padding: 0, listStyle: "none",
    display: "flex", flexDirection: "column", gap: 8,
  },
  bulletItem: { display: "flex", alignItems: "flex-start", gap: 8 },
  bulletDot: {
    width: 7, height: 7, borderRadius: "50%", background: C.navy,
    flexShrink: 0, marginTop: 6,
  },
  historyNote: { margin: "8px 0 0", fontSize: 12, color: C.grey },
};