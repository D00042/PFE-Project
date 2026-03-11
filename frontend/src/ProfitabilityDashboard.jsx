import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, FunnelChart, Funnel,
  LabelList, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, ReferenceLine,
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
  // Waterfall 
  positive:  "#0D9488",   
  negative:  "#D40E14",
  total:     "#092A5E",
};

const FISCAL_PERIODS = [
  { period: "P1",  month: "October"   },
  { period: "P2",  month: "November"  },
  { period: "P3",  month: "December"  },
  { period: "P4",  month: "January"   },
  { period: "P5",  month: "February"  },
  { period: "P6",  month: "March"     },
  { period: "P7",  month: "April"     },
  { period: "P8",  month: "May"       },
  { period: "P9",  month: "June"      },
  { period: "P10", month: "July"      },
  { period: "P11", month: "August"    },
  { period: "P12", month: "September" },
];

const fmt     = (n) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const fmtFull = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

export default function ProfitabilityDashboard() {
  const navigate    = useNavigate();
  const currentYear = new Date().getFullYear();

  const [year,    setYear]    = useState(currentYear);
  const [period,  setPeriod]  = useState("P12");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // ── Re-fetch whenever EITHER year OR period changes ──────────────────────
  // This is the core fix: the backend now receives the period and filters
  // the DB query itself, so every chart in the response is already YTD.
  useEffect(() => {
    fetchData();
  }, [year, period]);   // ← period added here

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      // ── period is now sent to the backend ────────────────────────────────
      const res = await fetch(
        `${API_URL}/dashboard/profitability?year=${year}&period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) { setError("Failed to load data."); return; }
      setData(await res.json());
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  // ── Waterfall: built from plSummary (which is already period-filtered) ──
  const waterfallData = useMemo(() => {
    if (!data) return [];
    const pl  = data.plSummary;
    const get = (label) => pl.find(r => r.label === label)?.current ?? 0;

    const revenue    = get("Revenue");
    const staffCosts = get("Staff Costs");
    const overhead   = get("Overhead Depreciation");
    const otherOH    = get("Other Overheads");
    const misc       = get("Total Miscellaneous Overheads");
    const interest   = get("Interest");
    const ebit       = get("EBIT");

    const steps = [
      { name: "Revenue",         value: revenue,     type: "total"    },
      { name: "Staff Costs",     value: -staffCosts, type: "negative" },
      { name: "Ovhd Depr.",      value: -overhead,   type: "negative" },
      { name: "Other Overheads", value: -otherOH,    type: "negative" },
      { name: "Misc. Overheads", value: -misc,       type: "negative" },
      { name: "Interest",        value: -interest,   type: "negative" },
      { name: "EBIT",            value: ebit,        type: "total"    },
    ];

    let running = 0;
    return steps.map((s) => {
      if (s.type === "total") {
        running = s.value;
        return { ...s, base: 0, bar: s.value, fill: COLORS.total };
      }
      const base = running;
      running += s.value;
      return {
        ...s,
        base,
        bar:  Math.abs(s.value),
        fill: s.value >= 0 ? COLORS.positive : COLORS.negative,
      };
    });
  }, [data]);

  // ── Guards ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={S.page}>
      <div style={S.loadingBox}>
        <div style={S.spinner} />
        <p style={{ color: COLORS.navy, marginTop: 16, fontWeight: 600 }}>Loading Dashboard...</p>
      </div>
    </div>
  );
  if (error) return (
    <div style={S.page}>
      <p style={{ color: COLORS.red, textAlign: "center", marginTop: 100 }}>{error}</p>
    </div>
  );
  if (!data) return null;

  const { kpis, plSummary, overheadsDetail, monthlyTrend, funnel } = data;

  const kpiCards = [
  {
    label: "Gross Profit Margin", key: "grossMargin", unit: "%",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
  },
  {
    label: "EBIT Margin", key: "ebitMargin", unit: "%",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  },
  {
    label: "Net Profit Margin", key: "netProfitMargin", unit: "%",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
  },
  {
    label: "ROA", key: "roa", unit: "%",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
  },
  {
    label: "ROE", key: "roe", unit: "%",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
];

  const currentPeriodMonth = FISCAL_PERIODS.find(p => p.period === period)?.month ?? "";

  return (
    <div style={S.page}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => navigate("/home")}>←</button>
        <h1 style={S.pageTitle}>Profitability</h1>
        <img src="/Tui_logo.png" alt="TUI" style={S.logo} />
      </div>

      {/* ── Controls ────────────────────────────────────────────────────── */}
      <div style={S.controlBar}>

        {/* Year tabs */}
        <div style={S.yearTabs}>
          {[year - 1, year].map(y => (
            <button key={y}
              style={year === y ? S.yearTabActive : S.yearTab}
              onClick={() => setYear(y)}
            >{y}</button>
          ))}
        </div>

        {/* Period tabs — clicking any of these now re-fetches everything */}
        <div style={S.periodWrap}>
          <span style={S.periodLabel}>Period:</span>
          <div style={S.periodTabs}>
            {FISCAL_PERIODS.map(({ period: p, month }) => (
              <button key={p}
                style={period === p ? S.periodTabActive : S.periodTab}
                onClick={() => setPeriod(p)}
                title={month}
              >{p}</button>
            ))}
          </div>
        </div>

        <span style={S.currencyLabel}>Actual Values in EUR</span>
      </div>

    

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div style={S.kpiRow}>
        {kpiCards.map(({ label, key, unit, icon }) => {
  const curr = kpis[key]?.current  ?? 0;
  const prev = kpis[key]?.previous ?? 0;
  const up   = curr >= prev;
  return (
    <div key={key} style={S.kpiCard}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {icon}
        <p style={S.kpiTitle}>{label}</p>
      </div>
      <p style={S.kpiRowLabel}>Current</p>
      <p style={{ ...S.kpiValue, color: up ? COLORS.blue : COLORS.red }}>
        {curr.toFixed(1)}{unit}
      </p>
      <p style={S.kpiRowLabel}>Previous</p>
      <p style={{ ...S.kpiValueSm, color: COLORS.grey }}>
        {prev.toFixed(1)}{unit}
      </p>
      <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: up ? COLORS.green : COLORS.red }}>
        {up ? "▲" : "▼"} {Math.abs(curr - prev).toFixed(1)}pp vs prev
      </div>
    </div>
  );
})}
      </div>

      {/* ── Row 1: P&L Summary + Overheads ──────────────────────────────── */}
      <div style={S.row2}>

        <div style={S.chartCard}>
          <p style={S.chartTitle}>Profit &amp; Loss Summary</p>
          <div style={S.legendRow}>
            <span style={S.dot(COLORS.teal)} /><span style={S.legendText}>Current Year</span>
            <span style={S.dot(COLORS.tealLight)} /><span style={S.legendText}>Previous Year</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={plSummary} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip formatter={(v) => fmtFull(v)} />
              <Bar dataKey="current"  name="Current Year"  fill={COLORS.teal}      radius={[4,4,0,0]} />
              <Bar dataKey="previous" name="Previous Year" fill={COLORS.tealLight} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={S.chartCard}>
          <p style={S.chartTitle}>Other Overheads Details</p>
          <div style={S.legendRow}>
            <span style={S.dot(COLORS.blue)} /><span style={S.legendText}>Current Year</span>
            <span style={S.dot(COLORS.blueLight)} /><span style={S.legendText}>Previous Year</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={overheadsDetail} layout="vertical" margin={{ left: 140, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={135} />
              <Tooltip formatter={(v) => fmtFull(v)} />
              <Bar dataKey="current"  name="Current Year"  fill={COLORS.blue}      radius={[0,3,3,0]} />
              <Bar dataKey="previous" name="Previous Year" fill={COLORS.blueLight} radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 2: Waterfall + Funnel ────────────────────────────────────── */}
      <div style={{ ...S.row2, marginBottom: 16 }}>

        <div style={S.chartCard}>
          <p style={S.chartTitle}>P&amp;L Waterfall — Revenue to EBIT</p>
          <div style={S.legendRow}>
            <span style={S.dot(COLORS.total)} /><span style={S.legendText}>Total</span>
            <span style={S.dot(COLORS.positive)} /><span style={S.legendText}>Positive</span>
            <span style={S.dot(COLORS.negative)} /><span style={S.legendText}>Deduction</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={waterfallData} margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip formatter={(v, name, props) => [fmtFull(props.payload.value), props.payload.name]} />
              <ReferenceLine y={0} stroke="#CBD5E1" />
              <Bar dataKey="base" stackId="wf" fill="transparent" />
              <Bar dataKey="bar"  stackId="wf" radius={[4,4,0,0]}
                label={{ position: "top", fontSize: 9, formatter: (v) => fmt(v) }}
              >
                {waterfallData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={S.chartCard}>
          <p style={S.chartTitle}>Profitability Ratio Funnel</p>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
              <Funnel dataKey="value" data={funnel} isAnimationActive>
                {funnel.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? COLORS.blueLight : i === 1 ? COLORS.grey : COLORS.navy} />
                ))}
                <LabelList position="right" fill="#333" fontSize={12} dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 3: Monthly Trend (full width) ───────────────────────────── */}
      <div style={{ padding: "0 28px", marginBottom: 24 }}>
        <div style={S.chartCard}>
          <p style={S.chartTitle}>
            Monthly Revenue &amp; EBIT Trend
            {period !== "P12" && (
              <span style={{ fontSize: 11, fontWeight: 400, color: COLORS.grey, marginLeft: 8 }}>
                (P1 – {period})
              </span>
            )}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            {/* monthlyTrend from backend already contains only the active months */}
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip formatter={(v) => fmtFull(v)} />
              <Legend />
              <Line type="monotone" dataKey="revenue"  name="Revenue"        stroke={COLORS.blue} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ebit"     name="EBIT"           stroke={COLORS.red}  strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="expenses" name="Total Expenses" stroke={COLORS.grey} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:       { minHeight: "100vh", background: "linear-gradient(160deg, #D6E8F7 0%, #EAF3FB 40%, #F5F9FD 100%)", fontFamily: "Arial, sans-serif", padding: "0 0 40px" },
  topBar:     { background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", padding: "14px 28px", borderBottom: "1px solid #D6E8F7", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 12px rgba(9,42,94,0.07)" },
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
  ytdBanner: { margin: "8px 28px 0", padding: "8px 16px", background: "#FEF9C3", borderLeft: "3px solid #EAB308", borderRadius: 8, fontSize: 12, color: "#713F12" },
  kpiRow:  { display: "flex", gap: 12, padding: "12px 28px 16px", overflowX: "auto" },
  kpiCard:   { background: "white", borderRadius: 16, padding: "14px 18px", boxShadow: "0 2px 12px rgba(9,42,94,0.08)", flex: 1 },
  kpiHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  kpiTitle:  { color: COLORS.navy, fontSize: 12, fontWeight: 800, margin: 0, lineHeight: 1.3 },
  kpiDelta:  { fontSize: 10, fontWeight: 700, marginTop: 8 },
  kpiLabel:    { color: COLORS.navy, fontSize: 11, fontWeight: 700, margin: "0 0 6px", lineHeight: 1.3 },
  kpiRowLabel: { color: COLORS.grey, fontSize: 10, margin: "4px 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" },
  kpiValue:    { fontSize: 16, fontWeight: 800, margin: "0 0 4px" },
  kpiValueSm:  { fontSize: 13, fontWeight: 600, margin: 0 },
  row2:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "0 28px 16px" },
  chartCard: { background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 12px rgba(9,42,94,0.08)" },
  chartTitle:  { color: COLORS.navy, fontSize: 14, fontWeight: 700, margin: "0 0 8px" },
  legendRow:   { display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 11 },
  dot: (color) => ({ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }),
  legendText:  { color: "#374151", marginRight: 8 },
  loadingBox:  { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" },
  spinner:     { width: 40, height: 40, border: "4px solid #E5E7EB", borderTop: `4px solid ${COLORS.navy}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};