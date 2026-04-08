import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import aiInsightService from "../services/aiInsightService";

const C = {
  navy:  "#092A5E",
  red:   "#D40E14",
  green: "#16A34A",
  grey:  "#9CA3AF",
  amber: "#D97706",
  blue:  "#1A6FBF",
};

const DASHBOARD_TABS = [
  { key: "global",        label: "Global"       },
  { key: "profitability", label: "Profitability" },
  { key: "balance_sheet", label: "Balance Sheet" },
  { key: "liquidity",     label: "Liquidity"     },
  { key: "dso_dpo",       label: "DSO & DPO"     },
];

function ExpandedDetail({ record }) {
  const isRec = record.insightType === "recommendation";

  if (isRec) {
    const { recommendations = [] } = record.content;
    const typeColors = {
      "Cost Control":  { bg: "#FEF3C7", border: "#D97706", text: C.amber   },
      "Revenue":       { bg: "#DBEAFE", border: "#1A6FBF", text: C.blue    },
      "Profitability": { bg: "#EDE9FE", border: "#7C3AED", text: "#7C3AED" },
      "Liquidity":     { bg: "#D1FAE5", border: "#16A34A", text: C.green   },
    };
    const getCol = (type) => {
      const match = Object.keys(typeColors).find(k =>
        type?.toLowerCase().includes(k.toLowerCase())
      );
      return match ? typeColors[match] : { bg: "#F1F5F9", border: "#94A3B8", text: "#475569" };
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {recommendations.map((rec, i) => {
          const col = getCol(rec.type);
          return (
            <div key={i} style={{
              borderRadius: 8, padding: "12px 14px",
              backgroundColor: col.bg, borderLeft: `4px solid ${col.border}`,
            }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800,
                          textTransform: "uppercase", letterSpacing: "0.06em", color: col.text }}>
                {rec.type}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <p style={S.recLabel}>Current Impact</p>
                  <p style={S.recText}>{rec.impact}</p>
                </div>
                <div>
                  <p style={{ ...S.recLabel, color: C.blue }}>Prediction — {record.targetPeriod}</p>
                  <p style={S.recText}>{rec.prediction}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const { bullets = [], legal_flags = [] } = record.content;
  return (
    <div>
      {legal_flags.length > 0 && (
        <div style={S.flagBox}>
          <p style={S.flagTitle}>⚠ Financial Risk</p>
          {legal_flags.map((f, i) => <p key={i} style={S.flagItem}>{f}</p>)}
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
  );
}

export default function AIInsightsPage() {
  const navigate = useNavigate();
  const [activeTab,  setActiveTab]  = useState("global");
  const [records,    setRecords]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [toast,      setToast]      = useState(null);

  useEffect(() => { fetchRecords(); setExpandedId(null); }, [activeTab]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      if (activeTab === "global") {
        const res = await aiInsightService.getHistory("global", "interpretation");
        setRecords(res.data || []);
      } else {
        const [interpRes, recRes] = await Promise.all([
          aiInsightService.getHistory(activeTab, "interpretation"),
          aiInsightService.getHistory(activeTab, "recommendation"),
        ]);
        const combined = [
          ...(interpRes.data || []),
          ...(recRes.data    || []),
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRecords(combined);
      }
    } catch {
      showToast("Failed to load history.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this insight?")) return;
    try {
      await aiInsightService.deleteInsight(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      if (expandedId === id) setExpandedId(null);
      showToast("Deleted.", "success");
    } catch {
      showToast("Failed to delete.", "error");
    }
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getTypeBadge = (record) => {
    if (record.dashboard === "global")           return { label: "Global",         bg: "#E0E7FF", color: "#3730A3" };
    if (record.insightType === "recommendation") return { label: "Recommendation", bg: "#FEF3C7", color: C.amber  };
    return { label: "Interpretation", bg: "#DBEAFE", color: C.blue };
  };

  const showNextPeriod = activeTab !== "global";

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => navigate("/home/dashboard/profitability")}>←</button>
        <h1 style={S.pageTitle}>AI Insights</h1>
        <img src="/Tui_logo.png" alt="TUI" style={{ height: 32 }}
          onError={e => (e.target.style.display = "none")} />
      </div>

      {/* Dashboard selector */}
      <div style={S.selectorBar}>
        <span style={S.selectorLabel}>Dashboard:</span>
        <div style={S.selectorTabs}>
          {DASHBOARD_TABS.map(tab => (
            <button key={tab.key}
              style={activeTab === tab.key ? S.selectorTabActive : S.selectorTab}
              onClick={() => setActiveTab(tab.key)}>
              {tab.label}
              {tab.key === "global" && (
                <span style={{ marginLeft: 4, fontSize: 10 }}></span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={S.content}>
        {loading ? (
          <div style={S.emptyState}>
            <div style={S.spinner} />
            <p style={{ color: C.grey, marginTop: 12 }}>Loading…</p>
          </div>
        ) : records.length === 0 ? (
          <div style={S.emptyState}>
            <p style={S.emptyTitle}>No insights yet</p>
            <p style={S.emptySub}>
              {activeTab === "global"
                ? "Use the Global Interpretation button in the Profitability Dashboard top bar."
                : `Generate insights from the ${DASHBOARD_TABS.find(t => t.key === activeTab)?.label} dashboard.`}
            </p>
            <button style={S.goBtn} onClick={() => navigate("/home/dashboard/profitability")}>
              Go to Profitability Dashboard
            </button>
          </div>
        ) : (
          <div style={S.tableCard}>
            {/* Table header */}
            <div style={S.tableHead}>
              <div style={{ ...S.th, flex: 2 }}>Date</div>
              <div style={S.th}>Year</div>
              <div style={S.th}>Period</div>
              <div style={S.th}>Type</div>
              {showNextPeriod && <div style={S.th}>Next Period</div>}
              <div style={{ ...S.th, flex: 0.6, textAlign: "right" }}>Actions</div>
            </div>

            {/* Rows */}
            {records.map((record, i) => {
              const badge      = getTypeBadge(record);
              const isExpanded = expandedId === record.id;
              return (
                <div key={record.id}>
                  <div style={{
                    ...S.tableRow,
                    background:   isExpanded ? "#EEF2FF" : i % 2 === 0 ? "white" : "#FAFAFA",
                    borderBottom: isExpanded ? "none" : "1px solid #F0F0F0",
                  }}>
                    <div style={{ ...S.td, flex: 2, fontSize: 12 }}>
                      {new Date(record.createdAt).toLocaleString()}
                    </div>
                    <div style={S.td}>{record.year}</div>
                    <div style={S.td}>{record.period}</div>
                    <div style={S.td}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px",
                        borderRadius: 10, backgroundColor: badge.bg, color: badge.color,
                      }}>
                        {badge.label}
                      </span>
                    </div>
                    {showNextPeriod && (
                      <div style={S.td}>{record.targetPeriod || "—"}</div>
                    )}
                    <div style={{ ...S.td, flex: 0.6, display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button style={S.viewBtn} onClick={() => setExpandedId(prev => prev === record.id ? null : record.id)}>
                        {isExpanded ? "▲" : "▼"}
                      </button>
                      <button style={S.deleteRowBtn} onClick={() => handleDelete(record.id)}>✕</button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={S.expandedRow}>
                      <ExpandedDetail record={record} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div style={{ ...S.toast, background: toast.type === "success" ? C.navy : C.red }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: "linear-gradient(160deg,#DCE8F5 0%,#ECF3FA 40%,#F5F9FD 100%)", fontFamily: "Arial, sans-serif", paddingBottom: 40 },
  topBar: { background: "rgba(255,255,255,0.90)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", padding: "14px 28px", borderBottom: "1px solid #D0DFF0", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 12px rgba(0,31,91,0.07)" },
  backBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.navy, marginRight: 16, padding: "4px 8px", borderRadius: 8 },
  pageTitle: { flex: 1, textAlign: "center", color: C.navy, fontSize: 22, fontWeight: 800, margin: 0 },
  selectorBar: { background: "white", padding: "14px 28px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  selectorLabel: { fontSize: 12, fontWeight: 700, color: C.navy, whiteSpace: "nowrap" },
  selectorTabs: { display: "flex", gap: 6, flexWrap: "wrap" },
  selectorTab: { padding: "6px 14px", borderRadius: 8, border: "1px solid #CBD5E1", background: "white", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Arial, sans-serif", color: "#374151" },
  selectorTabActive: { padding: "6px 14px", borderRadius: 8, border: "none", background: C.navy, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "Arial, sans-serif", color: "white" },
  content: { padding: "24px 28px" },
  tableCard: { background: "white", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,31,91,0.08)", overflow: "hidden" },
  tableHead: { display: "flex", alignItems: "center", background: C.navy, padding: "12px 20px" },
  th: { flex: 1, fontSize: 11, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.06em" },
  tableRow: { display: "flex", alignItems: "center", padding: "12px 20px" },
  td: { flex: 1, fontSize: 13, color: "#374151" },
  expandedRow: { padding: "16px 20px 20px", background: "#EEF2FF", borderBottom: "1px solid #E5E7EB" },
  viewBtn: { padding: "4px 10px", border: "1px solid #CBD5E1", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 11, color: C.navy, fontFamily: "Arial, sans-serif" },
  deleteRowBtn: { padding: "4px 8px", border: "1px solid #FECACA", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 11, color: C.red, fontFamily: "Arial, sans-serif" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12 },
  emptyTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: C.navy },
  emptySub: { margin: 0, fontSize: 13, color: C.grey, textAlign: "center", maxWidth: 400 },
  goBtn: { padding: "10px 24px", backgroundColor: C.navy, color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "Arial, sans-serif", cursor: "pointer", marginTop: 8 },
  spinner: { width: 32, height: 32, border: "4px solid #E5E7EB", borderTop: `4px solid ${C.navy}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  flagBox: { backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 12 },
  flagTitle: { margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: C.red },
  flagItem: { margin: "4px 0 0", fontSize: 12, color: "#7F1D1D", lineHeight: 1.5 },
  bulletList: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 },
  bulletItem: { display: "flex", alignItems: "flex-start", gap: 8 },
  bulletDot: { width: 7, height: 7, borderRadius: "50%", background: C.navy, flexShrink: 0, marginTop: 6 },
  recLabel: { margin: "0 0 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.navy },
  recText: { margin: 0, fontSize: 12, color: "#374151", lineHeight: 1.6 },
  toast: { position: "fixed", bottom: 32, right: 32, color: "white", padding: "12px 24px", borderRadius: 8, fontWeight: 600, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", fontFamily: "Arial, sans-serif" },
};