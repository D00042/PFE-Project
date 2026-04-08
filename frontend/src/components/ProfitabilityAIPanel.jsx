import { useState } from "react";
import aiInsightService from "../services/aiInsightService";

const C = {
  navy:  "#092A5E",
  red:   "#D40E14",
  green: "#16A34A",
  grey:  "#9CA3AF",
  amber: "#D97706",
  blue:  "#1A6FBF",
};

function Spinner() {
  return (
    <div style={{
      width: 16, height: 16, flexShrink: 0,
      border: "3px solid #E5E7EB",
      borderTop: `3px solid ${C.navy}`,
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

// ── Interpretation result ─────────────────────────────────────────────────────
function InterpretationResult({ data, savedAt }) {
  if (!data) return null;
  const { bullets = [], legal_flags = [] } = data;

  return (
    <div style={S.resultBox}>
      <div style={S.resultHeader}>
        <span style={S.resultLabel}>Interpretation</span>
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
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Recommendation result ─────────────────────────────────────────────────────
function RecommendationResult({ data, targetPeriod, savedAt }) {
  if (!data) return null;
  const { recommendations = [] } = data;

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
    return match
      ? typeColors[match]
      : { bg: "#F1F5F9", border: "#94A3B8", text: "#475569" };
  };

  return (
    <div style={S.resultBox}>
      <div style={S.resultHeader}>
        <span style={S.resultLabel}>Recommendations for {targetPeriod}</span>
        {savedAt && (
          <span style={S.savedTag}>
            ✓ Saved · {new Date(savedAt).toLocaleString()}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        {recommendations.map((rec, i) => {
          const col = getCol(rec.type);
          return (
            <div key={i} style={{
              borderRadius:    10,
              padding:         "12px 16px",
              backgroundColor: col.bg,
              borderLeft:      `4px solid ${col.border}`,
            }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800,
                          textTransform: "uppercase", letterSpacing: "0.06em",
                          color: col.text }}>
                {rec.type}
              </p>
              <p style={{ margin: "0 0 6px", fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
                <strong>Now: </strong>{rec.impact}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: C.blue, lineHeight: 1.5 }}>
                <strong>{targetPeriod}: </strong>{rec.prediction}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── Main panel ────────────────────────────────────────────────────────────────
export default function ProfitabilityAIPanel({ year, period }) {
  const [open,          setOpen]          = useState(false);
  const [tab,           setTab]           = useState("interpretation");

  const [interpResult,  setInterpResult]  = useState(null);
  const [interpSavedAt, setInterpSavedAt] = useState(null);
  const [interpLoading, setInterpLoading] = useState(false);
  const [interpError,   setInterpError]   = useState("");

  const [recResult,     setRecResult]     = useState(null);
  const [recTarget,     setRecTarget]     = useState("");
  const [recSavedAt,    setRecSavedAt]    = useState(null);
  const [recLoading,    setRecLoading]    = useState(false);
  const [recError,      setRecError]      = useState("");

  const handleGenerate = async () => {
    if (tab === "interpretation") {
      setInterpLoading(true);
      setInterpError("");
      try {
        const { data } = await aiInsightService.generateInterpretation(
          year, period, "profitability"
        );
        setInterpResult(data.result);
        setInterpSavedAt(data.savedAt);
      } catch {
        setInterpError("Failed to generate. Please try again.");
      } finally {
        setInterpLoading(false);
      }
    } else {
      setRecLoading(true);
      setRecError("");
      try {
        const { data } = await aiInsightService.generateRecommendation(
          year, period, "profitability"
        );
        setRecResult(data.result);
        setRecTarget(data.targetPeriod);
        setRecSavedAt(data.savedAt);
      } catch {
        setRecError("Failed to generate. Please try again.");
      } finally {
        setRecLoading(false);
      }
    }
  };

  const isLoading = tab === "interpretation" ? interpLoading : recLoading;
  const error     = tab === "interpretation" ? interpError   : recError;

  return (
    <div style={{ padding: "0 28px", marginBottom: 32 }}>
      <div style={S.panel}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={S.panelHeader} onClick={() => setOpen(o => !o)}>
          <div style={S.panelLeft}>
            <img
              src="/statistical-analysis.png"
              alt="AI"
              style={{ width: 20, height: 20 }}
              onError={e => (e.target.style.display = "none")}
            />
            <span style={S.panelTitle}>AI Insights : Profitability</span>
            <span style={S.panelSub}>Interpretations &amp; Recommendations</span>
          </div>
          <div style={S.panelRight}>
            {(interpResult || recResult) && (
              <span style={S.hasResultsBadge}>Results available</span>
            )}
            <span style={{ fontSize: 12, color: C.grey }}>{open ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* ── Collapsible body ────────────────────────────────────────── */}
        {open && (
          <div style={S.panelBody}>

            {/* Tabs */}
            <div style={S.tabs}>
              {["interpretation", "recommendation"].map(t => (
                <button
                  key={t}
                  style={tab === t ? S.tabActive : S.tab}
                  onClick={() => setTab(t)}
                >
                  {t === "interpretation" ? "Interpretation" : "Recommendations"}
                </button>
              ))}
            </div>

            {/* Description */}
            <p style={S.tabDesc}>
              {tab === "interpretation"
                ? `Analyzes profitability data from the database for ${year}, ${period} compared to the same period in ${year - 1}.`
                : `Generates 3 actionable recommendations with predictions for the next fiscal period.`}
            </p>

            {/* Generate button */}
            <button
              style={{
                ...S.genBtn,
                opacity: isLoading || !year ? 0.6 : 1,
                cursor:  isLoading || !year ? "not-allowed" : "pointer",
              }}
              onClick={handleGenerate}
              disabled={isLoading || !year}
            >
              {isLoading
                ? <><Spinner />&nbsp; Analyzing…</>
                : `Generate ${tab === "interpretation" ? "Interpretation" : "Recommendations"}`
              }
            </button>

            {/* Error */}
            {error && (
              <p style={{ color: C.red, fontSize: 12, margin: "0 0 10px" }}>{error}</p>
            )}

            {/* Results */}
            {tab === "interpretation" && interpResult && (
              <InterpretationResult data={interpResult} savedAt={interpSavedAt} />
            )}
            {tab === "recommendation" && recResult && (
              <RecommendationResult
                data={recResult}
                targetPeriod={recTarget}
                savedAt={recSavedAt}
              />
            )}

            {/* History link */}
            <p style={S.historyLink}>
              View all saved insights in the{" "}
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
  panelHeader: {
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "space-between",
    padding:         "14px 20px",
    cursor:          "pointer",
    borderBottom:    "1px solid #F1F5F9",
    backgroundColor: "#F8FAFC",
  },
  panelLeft: {
    display:    "flex",
    alignItems: "center",
    gap:        10,
  },
  panelTitle: {
    fontSize:   14,
    fontWeight: 800,
    color:      C.navy,
  },
  panelSub: {
    fontSize:        11,
    color:           C.grey,
    backgroundColor: "#EEF2FF",
    padding:         "2px 8px",
    borderRadius:    10,
  },
  panelRight: {
    display:    "flex",
    alignItems: "center",
    gap:        10,
  },
  hasResultsBadge: {
    fontSize:        11,
    fontWeight:      700,
    color:           C.green,
    backgroundColor: "#D1FAE5",
    padding:         "2px 8px",
    borderRadius:    10,
  },
  panelBody: {
    padding: "20px 24px",
  },
  tabs: {
    display:      "flex",
    border:       "1px solid #CBD5E1",
    borderRadius: 8,
    overflow:     "hidden",
    width:        "fit-content",
    marginBottom: 10,
  },
  tab: {
    padding:    "7px 20px",
    fontSize:   12,
    fontWeight: 600,
    fontFamily: "Arial, sans-serif",
    border:     "none",
    background: "white",
    color:      "#374151",
    cursor:     "pointer",
  },
  tabActive: {
    padding:    "7px 20px",
    fontSize:   12,
    fontWeight: 700,
    fontFamily: "Arial, sans-serif",
    border:     "none",
    background: C.navy,
    color:      "white",
    cursor:     "pointer",
  },
  tabDesc: {
    fontSize:   12,
    color:      C.grey,
    margin:     "0 0 12px",
    lineHeight: 1.5,
  },
  genBtn: {
    display:         "flex",
    alignItems:      "center",
    gap:             8,
    padding:         "9px 20px",
    backgroundColor: C.navy,
    color:           "white",
    border:          "none",
    borderRadius:    10,
    fontSize:        13,
    fontWeight:      700,
    fontFamily:      "Arial, sans-serif",
    marginBottom:    12,
  },
  resultBox: {
    backgroundColor: "#F8FAFC",
    borderRadius:    12,
    padding:         "16px 18px",
    marginBottom:    12,
  },
  resultHeader: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   10,
    flexWrap:       "wrap",
    gap:            8,
  },
  resultLabel: {
    fontSize:   13,
    fontWeight: 700,
    color:      C.navy,
  },
  savedTag: {
    fontSize:        11,
    color:           C.green,
    backgroundColor: "#D1FAE5",
    padding:         "2px 8px",
    borderRadius:    8,
    fontWeight:      600,
  },
  flagBox: {
    backgroundColor: "#FEF2F2",
    border:          "1px solid #FECACA",
    borderRadius:    8,
    padding:         "10px 14px",
    marginBottom:    12,
  },
  flagTitle: {
    margin:     "0 0 4px",
    fontSize:   12,
    fontWeight: 700,
    color:      C.red,
  },
  flagItem: {
    margin:     "4px 0 0",
    fontSize:   12,
    color:      "#7F1D1D",
    lineHeight: 1.5,
  },
  bulletList: {
    margin:        0,
    padding:       0,
    listStyle:     "none",
    display:       "flex",
    flexDirection: "column",
    gap:           8,
  },
  bulletItem: {
    display:    "flex",
    alignItems: "flex-start",
    gap:        8,
    fontSize:   13,
    color:      "#374151",
    lineHeight: 1.6,
  },
  bulletDot: {
    width:        7,
    height:       7,
    borderRadius: "50%",
    background:   C.navy,
    flexShrink:   0,
    marginTop:    6,
  },
  historyLink: {
    margin:   "8px 0 0",
    fontSize: 12,
    color:    C.grey,
  },
};