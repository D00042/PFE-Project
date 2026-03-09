import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, FunnelChart, Funnel,
  LabelList, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

const API_URL = "http://127.0.0.1:8000";

const COLORS = {
  blue:      "#1A6FBF",
  blueLight: "#A8C8E8",
  navy:      "#092A5E",
  red:       "#D40E14",
  green:     "#16A34A",
  grey:      "#9CA3AF",
  positive:  "#1A6FBF",
  negative:  "#D40E14",
  total:     "#092A5E",
};

// Fiscal period map P1=October … P12=September
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

// ── Waterfall custom bar shape ─────────────────────────────
const WaterfallBar = (props) => {
  const { x, y, width, height, fill } = props;
  if (!height || height === 0) return null;
  return <rect x={x} y={y} width={width} height={Math.abs(height)} fill={fill} rx={3} />;
};

export default function ProfitabilityDashboard() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year,      setYear]    = useState(currentYear);
  const [period,    setPeriod]  = useState("P12"); // default = full year
  const [data,      setData]    = useState(null);
  const [loading,   setLoading] = useState(false);
  const [error,     setError]   = useState("");

  useEffect(() => { fetchData(); }, [year]);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(
        `${API_URL}/dashboard/profitability?year=${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) { setError("Failed to load data."); return; }
      setData(await res.json());
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  // ── Period filter: keep only months up to selected period ──
  const selectedPeriodIndex = FISCAL_PERIODS.findIndex(p => p.period === period);
  const activeMonths = useMemo(
    () => FISCAL_PERIODS.slice(0, selectedPeriodIndex + 1).map(p => p.month),
    [selectedPeriodIndex]
  );

  // Filter monthlyTrend to only active months
  const filteredMonthlyTrend = useMemo(() => {
    if (!data) return [];
    return data.monthlyTrend.filter(m => {
      const fullMonth = FISCAL_PERIODS.find(p => p.month.startsWith(m.month))?.month;
      return activeMonths.includes(fullMonth);
    });
  }, [data, activeMonths]);

  // YTD plSummary — sum values only for active months
  // (backend already returns full-year totals; for a proper YTD we use monthlyTrend)
  // We show the backend plSummary as-is and note period filter applies to trend chart
  const filteredOverheads = useMemo(() => {
    if (!data) return [];
    return data.overheadsDetail;
  }, [data]);

  // ── Waterfall data from plSummary ──────────────────────────
  const waterfallData = useMemo(() => {
    if (!data) return [];
    const pl = data.plSummary;
    const get = (label) => pl.find(r => r.label === label)?.current ?? 0;

    const revenue     = get("Revenue");
    const staffCosts  = get("Staff Costs");
    const overhead    = get("Overhead Depreciation");
    const otherOH     = get("Other Overheads");
    const misc        = get("Total Miscellaneous Overheads");
    const interest    = get("Interest");
    const ebit        = get("EBIT");

    // Waterfall: each bar starts where the previous ended
    const steps = [
      { name: "Revenue",         value: revenue,    type: "total"    },
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
        bar: Math.abs(s.value),
        fill: s.value >= 0 ? COLORS.positive : COLORS.negative,
      };
    });
  }, [data]);

  if (loading) return (
    <div style={styles.page}>
      <div style={styles.loadingBox}>
        <div style={styles.spinner} />
        <p style={{ color: COLORS.navy, marginTop: 16, fontWeight: 600 }}>Loading Dashboard...</p>
      </div>
    </div>
  );
  if (error) return (
    <div style={styles.page}>
      <p style={{ color: COLORS.red, textAlign: "center", marginTop: 100 }}>{error}</p>
    </div>
  );
  if (!data) return null;

  const { kpis, plSummary, overheadsDetail, funnel } = data;

  const kpiCards = [
    { label: "Gross Profit Margin", key: "grossMargin",     unit: "%" },
    { label: "EBIT Margin",         key: "ebitMargin",       unit: "%" },
    { label: "Net Profit Margin",   key: "netProfitMargin",  unit: "%" },
    { label: "ROA",                 key: "roa",              unit: "%" },
  ];

  return (
    <div style={styles.page}>

      {/* ── Top bar ── */}
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={() => navigate("/home")}>←</button>
        <h1 style={styles.pageTitle}>Profitability</h1>
        <img src="/Tui_logo.png" alt="TUI" style={styles.logo} />
      </div>

      {/* ── Controls: year tabs + period filter + currency ── */}
      <div style={styles.controlBar}>
        {/* Year tabs */}
        <div style={styles.yearTabs}>
          {[year - 1, year].map(y => (
            <button key={y}
              style={year === y ? styles.yearTabActive : styles.yearTab}
              onClick={() => setYear(y)}
            >{y}</button>
          ))}
        </div>

        {/* Period filter */}
        <div style={styles.periodWrap}>
          <span style={styles.periodLabel}>Period:</span>
          <div style={styles.periodTabs}>
            {FISCAL_PERIODS.map(({ period: p }) => (
              <button key={p}
                style={period === p ? styles.periodTabActive : styles.periodTab}
                onClick={() => setPeriod(p)}
                title={FISCAL_PERIODS.find(x => x.period === p)?.month}
              >{p}</button>
            ))}
          </div>
        </div>

        <span style={styles.currencyLabel}>Actual Values in EUR</span>
      </div>

      {/* ── YTD notice ── */}
      {period !== "P12" && (
        <div style={styles.ytdBanner}>
          📅 Showing YTD up to <strong>{period}</strong> —{" "}
          {FISCAL_PERIODS.find(p2 => p2.period === period)?.month} (trend chart filtered)
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div style={styles.kpiRow}>
        {kpiCards.map(({ label, key, unit }) => {
          const curr = kpis[key]?.current ?? 0;
          const prev = kpis[key]?.previous ?? 0;
          const up   = curr >= prev;
          return (
            <div key={key} style={styles.kpiCard}>
              <p style={styles.kpiLabel}>{label}</p>
              <p style={styles.kpiRowLabel}>Current</p>
              <p style={{ ...styles.kpiValue, color: up ? COLORS.blue : COLORS.red }}>
                {curr.toFixed(1)}{unit}
              </p>
              <p style={styles.kpiRowLabel}>Previous</p>
              <p style={{ ...styles.kpiValueSm, color: COLORS.grey }}>
                {prev.toFixed(1)}{unit}
              </p>
              <div style={{
                marginTop: 6, fontSize: 10, fontWeight: 700,
                color: up ? COLORS.green : COLORS.red,
              }}>
                {up ? "▲" : "▼"} {Math.abs(curr - prev).toFixed(1)}pp vs prev
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Row 1: P&L Summary (vertical bars) + Other Overheads (horizontal bars) ── */}
      <div style={styles.bottomRow}>

        {/* P&L Summary — vertical grouped bar chart */}
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Profit &amp; Loss Summary</p>
          <div style={styles.legendRow}>
            <span style={styles.dot(COLORS.blue)} />
            <span style={styles.legendText}>Current Year</span>
            <span style={styles.dot(COLORS.blueLight)} />
            <span style={styles.legendText}>Previous Year</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={plSummary} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip formatter={(v) => fmtFull(v)} />
              <Bar dataKey="current"  name="Current Year"  fill={COLORS.blue}      radius={[4,4,0,0]} />
              <Bar dataKey="previous" name="Previous Year" fill={COLORS.blueLight} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Other Overheads — horizontal bar chart (swapped) */}
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Other Overheads Details</p>
          <div style={styles.legendRow}>
            <span style={styles.dot(COLORS.blue)} />
            <span style={styles.legendText}>Current Year</span>
            <span style={styles.dot(COLORS.blueLight)} />
            <span style={styles.legendText}>Previous Year</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={filteredOverheads}
              layout="vertical"
              margin={{ left: 140, right: 20 }}
            >
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

      {/* ── Row 2: Waterfall + Funnel ── */}
      <div style={{ ...styles.bottomRow, marginBottom: 16 }}>

        {/* Waterfall chart */}
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>P&amp;L Waterfall — Revenue to EBIT</p>
          <div style={styles.legendRow}>
            <span style={styles.dot(COLORS.total)} /><span style={styles.legendText}>Total</span>
            <span style={styles.dot(COLORS.positive)} /><span style={styles.legendText}>Positive</span>
            <span style={styles.dot(COLORS.negative)} /><span style={styles.legendText}>Deduction</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={waterfallData} margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip
                formatter={(v, name, props) => [fmtFull(props.payload.value), props.payload.name]}
              />
              <ReferenceLine y={0} stroke="#CBD5E1" />
              {/* Invisible base bar to offset stacking */}
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

        {/* Profitability Ratio Funnel */}
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>Profitability Ratio Funnel</p>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
              <Funnel dataKey="value" data={funnel} isAnimationActive>
                {funnel.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? COLORS.blueLight : i === 1 ? COLORS.blue : COLORS.navy} />
                ))}
                <LabelList position="right" fill="#333" fontSize={12} dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 3: Monthly Revenue & EBIT Trend (full width, period-filtered) ── */}
      <div style={{ padding: "0 28px", marginBottom: 24 }}>
        <div style={styles.chartCard}>
          <p style={styles.chartTitle}>
            Monthly Revenue &amp; EBIT Trend
            {period !== "P12" && (
              <span style={{ fontSize: 11, fontWeight: 400, color: COLORS.grey, marginLeft: 8 }}>
                (YTD to {period})
              </span>
            )}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={filteredMonthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip formatter={(v) => fmtFull(v)} />
              <Legend />
              <Line type="monotone" dataKey="revenue"  name="Revenue"        stroke={COLORS.blue}  strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ebit"     name="EBIT"           stroke={COLORS.red}   strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="expenses" name="Total Expenses" stroke={COLORS.grey}  strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #D6E8F7 0%, #EAF3FB 40%, #F5F9FD 100%)",
    fontFamily: "Arial, sans-serif",
    padding: "0 0 40px",
  },
  topBar: {
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(8px)",
    display: "flex", alignItems: "center",
    padding: "14px 28px",
    borderBottom: "1px solid #D6E8F7",
    position: "sticky", top: 0, zIndex: 10,
    boxShadow: "0 2px 12px rgba(9,42,94,0.07)",
  },
  backBtn: {
    background: "none", border: "none",
    fontSize: "22px", cursor: "pointer",
    color: COLORS.navy, marginRight: 16,
    padding: "4px 8px", borderRadius: 8,
  },
  pageTitle: {
    flex: 1, textAlign: "center",
    color: COLORS.navy, fontSize: "22px", fontWeight: "800", margin: 0,
  },
  logo: { height: 32 },
  controlBar: {
    display: "flex", alignItems: "center", flexWrap: "wrap",
    padding: "10px 28px", gap: 12,
    background: "white", borderBottom: "1px solid #E5E7EB",
  },
  yearTabs:       { display: "flex", gap: 4 },
  yearTab: {
    padding: "6px 18px", borderRadius: 6,
    border: "1px solid #CBD5E1", background: "white",
    cursor: "pointer", fontSize: 13, fontFamily: "Arial, sans-serif", color: "#374151",
  },
  yearTabActive: {
    padding: "6px 18px", borderRadius: 6, border: "none",
    background: COLORS.navy, cursor: "pointer",
    fontSize: 13, fontFamily: "Arial, sans-serif", color: "white", fontWeight: 700,
  },
  periodWrap:  { display: "flex", alignItems: "center", gap: 8 },
  periodLabel: { fontSize: 12, fontWeight: 700, color: COLORS.navy, whiteSpace: "nowrap" },
  periodTabs:  { display: "flex", gap: 2, flexWrap: "wrap" },
  periodTab: {
    padding: "4px 8px", borderRadius: 5,
    border: "1px solid #CBD5E1", background: "white",
    cursor: "pointer", fontSize: 11, fontFamily: "Arial, sans-serif", color: "#374151",
  },
  periodTabActive: {
    padding: "4px 8px", borderRadius: 5, border: "none",
    background: COLORS.red, cursor: "pointer",
    fontSize: 11, fontFamily: "Arial, sans-serif", color: "white", fontWeight: 700,
  },
  currencyLabel: { marginLeft: "auto", color: COLORS.navy, fontSize: 13, fontWeight: 700 },
  ytdBanner: {
    margin: "8px 28px 0",
    padding: "8px 16px",
    background: "#FEF9C3", borderLeft: "3px solid #EAB308",
    borderRadius: 8, fontSize: 12, color: "#713F12",
  },
  kpiRow: {
    display: "flex", gap: 12,
    padding: "12px 28px 16px",
    overflowX: "auto",
  },
  kpiCard: {
    background: "white", borderRadius: 12,
    padding: "10px 14px", minWidth: 120,
    boxShadow: "0 2px 12px rgba(9,42,94,0.08)", flex: 1,
  },
  kpiLabel:    { color: COLORS.navy, fontSize: 11, fontWeight: 700, margin: "0 0 6px", lineHeight: 1.3 },
  kpiRowLabel: { color: COLORS.grey, fontSize: 10, margin: "4px 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" },
  kpiValue:    { fontSize: 16, fontWeight: 800, margin: "0 0 4px" },
  kpiValueSm:  { fontSize: 13, fontWeight: 600, margin: 0 },
  bottomRow: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: 16, padding: "0 28px 16px",
  },
  chartCard: {
    background: "white", borderRadius: 16,
    padding: "20px 24px",
    boxShadow: "0 2px 12px rgba(9,42,94,0.08)",
  },
  chartTitle:  { color: COLORS.navy, fontSize: 14, fontWeight: 700, margin: "0 0 8px" },
  legendRow:   { display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 11 },
  dot: (color) => ({ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }),
  legendText:  { color: "#374151", marginRight: 8 },
  loadingBox:  { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" },
  spinner: {
    width: 40, height: 40,
    border: "4px solid #E5E7EB",
    borderTop: `4px solid ${COLORS.navy}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};