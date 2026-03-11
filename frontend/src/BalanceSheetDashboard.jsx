import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LabelList,
} from "recharts";

const API_URL = "http://127.0.0.1:8000";

const COLORS = {
  // Brand
  blue:      "#1A6FBF",
  blueLight: "#A8C8E8",
  navy:      "#092A5E",
  red:       "#D40E14",
  green:     "#16A34A",
  grey:      "#9CA3AF",
  // Chart series — more variety
  teal:      "#0D9488",
  tealLight: "#99E6E0",
  amber:     "#D97706",
  amberLight:"#FCD34D",
  purple:    "#7C3AED",
  purpleLight:"#C4B5FD",
};
const PIE_COLORS = ["#0D9488", "#1A6FBF", "#D97706", "#7C3AED", "#092A5E"];

const FISCAL_PERIODS = [
  { period: "P1",  month: "October"   }, { period: "P2",  month: "November"  },
  { period: "P3",  month: "December"  }, { period: "P4",  month: "January"   },
  { period: "P5",  month: "February"  }, { period: "P6",  month: "March"     },
  { period: "P7",  month: "April"     }, { period: "P8",  month: "May"       },
  { period: "P9",  month: "June"      }, { period: "P10", month: "July"      },
  { period: "P11", month: "August"    }, { period: "P12", month: "September" },
];

const fmt     = (n) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const fmtFull = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
const fmtK    = (n) => {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
};

// ── KPI bar sub-component ─────────────────────────────────────────────────────
function KpiBar({ value, prevValue, unit = "", up, formatter, maxVal = 100 }) {
  const display     = formatter ? formatter(value)     : value.toFixed(1);
  const prevDisplay = formatter ? formatter(prevValue) : prevValue.toFixed(1);
  const pct     = Math.min(Math.abs(value)     / Math.max(Math.abs(maxVal), 1) * 100, 100);
  const prevPct = Math.min(Math.abs(prevValue) / Math.max(Math.abs(maxVal), 1) * 100, 100);
  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: COLORS.grey, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 3 }}>Current</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ height: 18, borderRadius: 4, width: `${pct}%`, maxWidth: "65%", minWidth: 6, backgroundColor: up ? COLORS.blue : COLORS.red, transition: "width 0.5s" }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: up ? COLORS.blue : COLORS.red }}>{display}{unit}</span>
        </div>
      </div>
      <div>
        <span style={{ fontSize: 10, color: COLORS.grey, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 3 }}>Previous</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ height: 18, borderRadius: 4, width: `${prevPct}%`, maxWidth: "65%", minWidth: 6, backgroundColor: COLORS.blueLight }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.grey }}>{prevDisplay}{unit}</span>
        </div>
      </div>
    </>
  );
}

// ── Reusable grouped bar chart card ──────────────────────────────────────────
function BarCard({ title, subtitle, data, height = 260, currentColor = COLORS.teal, prevColor = COLORS.tealLight }) {
  if (!data || data.length === 0) return (
    <div style={S.chartCard}>
      <p style={S.chartTitle}>{title}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height, color: COLORS.grey, fontSize: 13 }}>No data</div>
    </div>
  );
  return (
    <div style={S.chartCard}>
      <p style={S.chartTitle}>{title}</p>
      {subtitle && <p style={S.chartSub}>{subtitle}</p>}
      <div style={S.legendRow}>
        <span style={S.dot(currentColor)} /><span style={S.legendText}>Current Year</span>
        <span style={S.dot(prevColor)} /><span style={S.legendText}>Previous Year</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ bottom: 32, left: 0, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-28} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={fmt} width={54} />
          <Tooltip formatter={(v) => fmtFull(v)} />
          <Bar dataKey="current"  name="Current Year"  fill={COLORS.blue}      radius={[4,4,0,0]}>
            <LabelList dataKey="current"  position="top" formatter={fmt} style={{ fontSize: 8, fill: COLORS.navy }} />
          </Bar>
          <Bar dataKey="previous" name="Previous Year" fill={COLORS.blueLight} radius={[4,4,0,0]}>
            <LabelList dataKey="previous" position="top" formatter={fmt} style={{ fontSize: 8, fill: COLORS.grey }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Horizontal bar card (better for long labels) ──────────────────────────────
function HBarCard({ title, subtitle, data, height = 280, currentColor = COLORS.teal, prevColor = COLORS.tealLight }) {
  if (!data || data.length === 0) return (
    <div style={S.chartCard}>
      <p style={S.chartTitle}>{title}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height, color: COLORS.grey, fontSize: 13 }}>No data</div>
    </div>
  );
  return (
    <div style={S.chartCard}>
      <p style={S.chartTitle}>{title}</p>
      {subtitle && <p style={S.chartSub}>{subtitle}</p>}
      <div style={S.legendRow}>
        <span style={S.dot(currentColor)} /><span style={S.legendText}>Current Year</span>
<span style={S.dot(prevColor)} /><span style={S.legendText}>Previous Year</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={fmt} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 9 }} width={200} />
          <Tooltip formatter={(v) => fmtFull(v)} />
          <Bar dataKey="current"  name="Current Year"  fill={currentColor} radius={[4,4,0,0]}>

            <LabelList dataKey="current"  position="right" formatter={fmt} style={{ fontSize: 8, fill: COLORS.navy }} />
          </Bar>
          <Bar dataKey="previous" name="Previous Year" fill={prevColor}    radius={[4,4,0,0]}/>

        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function BalanceSheetDashboard() {
  const navigate    = useNavigate();
  const currentYear = new Date().getFullYear();

  const [year,    setYear]    = useState(currentYear);
  const [period,  setPeriod]  = useState("P12");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // ── Re-fetch when year OR period changes ──────────────────────────────────
  useEffect(() => { fetchData(); }, [year, period]);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      // period is now sent to the backend
      const res = await fetch(
        `${API_URL}/dashboard/balance-sheet?year=${year}&period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) { setError("Failed to load balance sheet data."); return; }
      setData(await res.json());
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={S.page}>
      <div style={S.loadingBox}>
        <div style={S.spinner} />
        <p style={{ color: COLORS.navy, marginTop: 16, fontWeight: 600 }}>Loading Balance Sheet...</p>
      </div>
    </div>
  );
  if (error)  return <div style={S.page}><p style={{ color: COLORS.red, textAlign: "center", marginTop: 100 }}>{error}</p></div>;
  if (!data)  return null;

  const { kpis, charts, snapshotMonth } = data;

  const equityRatio    = kpis?.equityRatio    ?? { current: 0, previous: 0 };
  const workingCapital = kpis?.workingCapital ?? { current: 0, previous: 0 };
  const currentRatio   = kpis?.currentRatio   ?? { current: 0, previous: 0 };
  const debtToEquity   = kpis?.debtToEquity   ?? { current: 0, previous: 0 };
  const cash           = kpis?.cash           ?? { current: 0, previous: 0 };

  const equityUp = equityRatio.current    >= equityRatio.previous;
  const wcUp     = workingCapital.current >= workingCapital.previous;
  const cashUp   = cash.current           >= cash.previous;
  const deUp     = debtToEquity.current   <= debtToEquity.previous;

  const crColor = currentRatio.current >= 2 ? COLORS.green : currentRatio.current >= 1 ? COLORS.blue : COLORS.red;
  const deColor = debtToEquity.current <= 1 ? COLORS.green : debtToEquity.current <= 2 ? COLORS.blue : COLORS.red;

  const pieData = (charts?.currentAssetsBreakdown ?? []).filter(d => d.current > 0);

  return (
    <div style={S.page}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => navigate("/home")}>←</button>
        <h1 style={S.pageTitle}>Balance Sheet Overview</h1>
        <img src="/Tui_logo.png" alt="TUI" style={S.logo} />
      </div>

      {/* ── Controls — period tabs just like Profitability ───────────────── */}
      <div style={S.controlBar}>

        {/* Year tabs */}
        <div style={S.yearTabs}>
          {[year - 1, year].map(y => (
            <button key={y} style={year === y ? S.yearTabActive : S.yearTab} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>

        {/* Period tabs P1–P12 — same pattern as Profitability */}
        <div style={S.periodWrap}>
          <span style={S.periodLabel}>Period:</span>
          <div style={S.periodTabs}>
            {FISCAL_PERIODS.map(({ period: p, month }) => (
              <button
                key={p}
                style={period === p ? S.periodTabActive : S.periodTab}
                onClick={() => setPeriod(p)}
                title={month}
              >{p}</button>
            ))}
          </div>
        </div>

        <span style={S.currencyLabel}>Actual Values in EUR</span>
      </div>

      

      {/* ══════════════════════════════════════════════════════════════════
          ROW 1 — 5 KPI cards
      ══════════════════════════════════════════════════════════════════ */}
      <div style={S.kpiRow}>

        <div style={S.kpiCard}>
          <div style={S.kpiHeader}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18M3 9l9-6 9 6M4 20h16"/><path d="M6 9l-3 7h6L6 9zM18 9l-3 7h6l-3-7z"/>
            </svg>
            <p style={S.kpiTitle}>Equity Ratio</p>
          </div>
          <KpiBar value={equityRatio.current} prevValue={equityRatio.previous} unit="%" up={equityUp} maxVal={100} />
          <div style={{ ...S.kpiDelta, color: equityUp ? COLORS.green : COLORS.red }}>
            {equityUp ? "▲" : "▼"} {Math.abs(equityRatio.current - equityRatio.previous).toFixed(1)}% vs prev
          </div>
        </div>

        <div style={S.kpiCard}>
          <div style={S.kpiHeader}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2"/>
              <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/>
              <line x1="12" y1="10" x2="14" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/>
            </svg>
            <p style={S.kpiTitle}>Working Capital</p>
          </div>
          <KpiBar value={workingCapital.current} prevValue={workingCapital.previous} unit="" up={wcUp} formatter={fmtK}
            maxVal={Math.max(Math.abs(workingCapital.current), Math.abs(workingCapital.previous), 1)} />
          <div style={{ ...S.kpiDelta, color: wcUp ? COLORS.green : COLORS.red }}>
            {wcUp ? "▲" : "▼"} {fmtK(Math.abs(workingCapital.current - workingCapital.previous))} vs prev
          </div>
        </div>

        <div style={S.kpiCard}>
          <div style={S.kpiHeader}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
            <p style={S.kpiTitle}>Current Ratio</p>
          </div>
          <p style={{ fontSize: 26, fontWeight: 900, color: crColor, margin: "6px 0 2px" }}>{currentRatio.current.toFixed(2)}</p>
          <p style={{ fontSize: 11, color: COLORS.grey, margin: "0 0 4px" }}>Prev: {currentRatio.previous.toFixed(2)}</p>
          <p style={{ fontSize: 10, color: crColor, fontWeight: 700, margin: 0 }}>
            {currentRatio.current >= 2 ? "● Healthy" : currentRatio.current >= 1 ? "● Adequate" : "● Below 1 — Risk"}
          </p>
          <div style={{ ...S.kpiDelta, color: currentRatio.current >= currentRatio.previous ? COLORS.green : COLORS.red }}>
            {currentRatio.current >= currentRatio.previous ? "▲" : "▼"} {Math.abs(currentRatio.current - currentRatio.previous).toFixed(2)} vs prev
          </div>
        </div>

        <div style={S.kpiCard}>
          <div style={S.kpiHeader}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <p style={S.kpiTitle}>Debt / Equity</p>
          </div>
          <p style={{ fontSize: 26, fontWeight: 900, color: deColor, margin: "6px 0 2px" }}>{debtToEquity.current.toFixed(2)}</p>
          <p style={{ fontSize: 11, color: COLORS.grey, margin: "0 0 4px" }}>Prev: {debtToEquity.previous.toFixed(2)}</p>
          <p style={{ fontSize: 10, color: deColor, fontWeight: 700, margin: 0 }}>
            {debtToEquity.current <= 1 ? "● Low leverage" : debtToEquity.current <= 2 ? "● Moderate" : "● High leverage"}
          </p>
          <div style={{ ...S.kpiDelta, color: deUp ? COLORS.green : COLORS.red }}>
            {deUp ? "▼ improved" : "▲ increased"} {Math.abs(debtToEquity.current - debtToEquity.previous).toFixed(2)} vs prev
          </div>
        </div>

        <div style={S.kpiCard}>
          <div style={S.kpiHeader}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>
              <path d="M6 12h.01M18 12h.01"/>
            </svg>
            <p style={S.kpiTitle}>Cash Position</p>
          </div>
          <p style={{ fontSize: 22, fontWeight: 900, color: cashUp ? COLORS.blue : COLORS.red, margin: "6px 0 2px" }}>{fmtK(cash.current)}</p>
          <p style={{ fontSize: 11, color: COLORS.grey, margin: "0 0 4px" }}>Prev: {fmtK(cash.previous)}</p>
          <div style={{ ...S.kpiDelta, color: cashUp ? COLORS.green : COLORS.red }}>
            {cashUp ? "▲" : "▼"} {fmtK(Math.abs(cash.current - cash.previous))} vs prev
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ROW 2 — Summary overview (4-col, Total Assets spans full height)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={S.section}>
        <p style={S.sectionHeading}>Balance Sheet Overview</p>
      </div>
      <div style={S.chartsGrid}>

        {/* Total Assets — tall, spans 2 rows */}
        <div style={{ gridRow: "1 / 3" }}>
          <div style={{ ...S.chartCard, height: "100%" }}>
            <p style={S.chartTitle}>Total Assets</p>
            <div style={S.legendRow}>
              <span style={S.dot(COLORS.blue)} /><span style={S.legendText}>Current Year</span>
              <span style={S.dot(COLORS.blueLight)} /><span style={S.legendText}>Previous Year</span>
            </div>
            <ResponsiveContainer width="100%" height={460}>
              <BarChart data={charts?.totalAssets ?? []} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmt} width={52} />
                <Tooltip formatter={(v) => fmtFull(v)} />
                <Bar dataKey="current"  name="Current Year"  fill={COLORS.blue}      radius={[4,4,0,0]}>
                  <LabelList dataKey="current"  position="top" formatter={fmt} style={{ fontSize: 8, fill: COLORS.navy }} />
                </Bar>
                <Bar dataKey="previous" name="Previous Year" fill={COLORS.blueLight} radius={[4,4,0,0]}>
                  <LabelList dataKey="previous" position="top" formatter={fmt} style={{ fontSize: 8, fill: COLORS.grey }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <BarCard title="Non Current Assets"      data={charts?.nonCurrentAssets      ?? []} height={220} />

{/* Total Equity — spans both rows, same height as Total Assets */}
<div style={{ gridRow: "1 / 3" }}>
  <div style={{ ...S.chartCard, height: "100%" }}>
    <p style={S.chartTitle}>Total Equity</p>
    <div style={S.legendRow}>
      <span style={S.dot(COLORS.blue)} /><span style={S.legendText}>Current Year</span>
      <span style={S.dot(COLORS.blueLight)} /><span style={S.legendText}>Previous Year</span>
    </div>
    <ResponsiveContainer width="100%" height={460}>
      <BarChart data={charts?.totalEquity ?? []} margin={{ bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 9 }} tickFormatter={fmt} width={52} />
        <Tooltip formatter={(v) => fmtFull(v)} />
        <Bar dataKey="current"  name="Current Year"  fill={COLORS.blue}      radius={[4,4,0,0]}>
          <LabelList dataKey="current"  position="top" formatter={fmt} style={{ fontSize: 8, fill: COLORS.navy }} />
        </Bar>
        <Bar dataKey="previous" name="Previous Year" fill={COLORS.blueLight} radius={[4,4,0,0]}>
          <LabelList dataKey="previous" position="top" formatter={fmt} style={{ fontSize: 8, fill: COLORS.grey }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>

<BarCard title="Non Current Liabilities" data={charts?.nonCurrentLiabilities  ?? []} height={220} />
<BarCard title="Current Assets"          data={charts?.currentAssets          ?? []} height={220} />
{/* spacer removed — Total Equity now fills col 3 row 2 */}
<BarCard title="Current Liabilities"     data={charts?.currentLiabilities     ?? []} height={220} />

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ROW 3 — Detailed breakdowns (the data that was hidden before)
      ══════════════════════════════════════════════════════════════════ */}
      <div style={S.section}>
        <p style={S.sectionHeading}>Detailed Breakdowns By Category</p>
      </div>

      {/* Non-current assets + current assets side by side as horizontal bars */}
      <div style={S.row2}>
        <HBarCard
          title="Non-Current Assets Details"
          data={charts?.nonCurrentAssetsDetail ?? []}
          height={220}
        />
        <HBarCard
          title="Current Assets Details"
          data={charts?.currentAssetsDetail ?? []}
          height={220}
        />
      </div>

      {/* Equity + current liabilities side by side */}
      <div style={S.row2}>
        <HBarCard
          title="Equity Details"
          data={charts?.equityDetail ?? []}
          height={180}
        />
        <HBarCard
          title="Current Liabilities Details"
          data={charts?.currentLiabilitiesDetail ?? []}
          height={250}
        />
      </div>


     

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:       { minHeight: "100vh", background: "linear-gradient(160deg, #D6E8F7 0%, #EAF3FB 40%, #F5F9FD 100%)", fontFamily: "Arial, sans-serif", paddingBottom: 40 },
  topBar:     { background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", padding: "14px 28px", borderBottom: "1px solid #D6E8F7", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 12px rgba(9,42,94,0.07)" },
  backBtn:    { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: COLORS.navy, marginRight: 16, padding: "4px 8px", borderRadius: 8 },
  pageTitle:  { flex: 1, textAlign: "center", color: COLORS.navy, fontSize: 22, fontWeight: 800, margin: 0 },
  logo:       { height: 32 },
  controlBar: { display: "flex", alignItems: "center", flexWrap: "wrap", padding: "10px 28px", gap: 12, background: "white", borderBottom: "1px solid #E5E7EB" },
  yearTabs:   { display: "flex", gap: 4 },
  yearTab:       { padding: "6px 18px", borderRadius: 6, border: "1px solid #CBD5E1", background: "white", cursor: "pointer", fontSize: 13, fontFamily: "Arial, sans-serif", color: "#374151" },
  yearTabActive: { padding: "6px 18px", borderRadius: 6, border: "none", background: COLORS.navy, cursor: "pointer", fontSize: 13, fontFamily: "Arial, sans-serif", color: "white", fontWeight: 700 },
  periodWrap:    { display: "flex", alignItems: "center", gap: 8 },
  periodLabel:   { fontSize: 12, fontWeight: 700, color: COLORS.navy, whiteSpace: "nowrap" },
  periodTabs:    { display: "flex", gap: 2, flexWrap: "wrap" },
  periodTab:       { padding: "4px 8px", borderRadius: 5, border: "1px solid #CBD5E1", background: "white", cursor: "pointer", fontSize: 11, fontFamily: "Arial, sans-serif", color: "#374151" },
  periodTabActive: { padding: "4px 8px", borderRadius: 5, border: "none", background: COLORS.red, cursor: "pointer", fontSize: 11, fontFamily: "Arial, sans-serif", color: "white", fontWeight: 700 },
  currencyLabel:   { marginLeft: "auto", color: COLORS.navy, fontSize: 13, fontWeight: 700 },
  kpiRow:  { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, padding: "16px 28px" },
  kpiCard: { background: "white", borderRadius: 16, padding: "14px 18px", boxShadow: "0 2px 12px rgba(9,42,94,0.08)" },
  kpiHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  kpiTitle:  { color: COLORS.navy, fontSize: 12, fontWeight: 800, margin: 0, lineHeight: 1.3 },
  kpiDelta:  { fontSize: 10, fontWeight: 700, marginTop: 8 },
  // section dividers
  section:     { padding: "8px 28px 4px" },
  sectionHeading: { margin: 0, fontSize: 14, fontWeight: 800, color: COLORS.navy },
  sectionSub:     { margin: "2px 0 0", fontSize: 11, color: COLORS.grey },
  // grids
  chartsGrid:  { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gridTemplateRows: "auto auto", gap: 16, padding: "8px 28px 16px" },
  row2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "0 28px 16px" },
  row3:        { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, padding: "0 28px 16px" },
  chartCard:   { background: "white", borderRadius: 16, padding: "16px 18px", boxShadow: "0 2px 12px rgba(9,42,94,0.08)" },
  chartTitle:  { color: COLORS.navy, fontSize: 13, fontWeight: 700, margin: "0 0 2px" },
  chartSub:    { color: COLORS.grey, fontSize: 10, margin: "0 0 8px", lineHeight: 1.4 },
  legendRow:   { display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 10 },
  dot: (color) => ({ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }),
  legendText:  { color: "#374151", marginRight: 6 },
  loadingBox:  { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" },
  spinner:     { width: 40, height: 40, border: "4px solid #E5E7EB", borderTop: `4px solid ${COLORS.navy}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};