import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LiquidityAIPanel from "../components/LiquidityAIPanel.jsx";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
  ComposedChart, Cell,
} from "recharts";

const API_URL = "http://127.0.0.1:8000";
//Wraps long axis tick labels onto multiple lines
const WrappedTick = ({ x, y, payload, maxChars = 10, fontSize = 10 }) => {
  const words = String(payload.value).split(" ");
  const lines = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (test.length > maxChars && cur) { lines.push(cur); cur = word; }
    else { cur = test; }
  }
  if (cur) lines.push(cur);
  return (
    <g transform={`translate(${x},${y + 6})`}>
      {lines.map((line, i) => (
        <text key={i} x={0} y={i * (fontSize + 3)} textAnchor="middle" fill="#374151" fontSize={fontSize}>{line}</text>
      ))}
    </g>
  );
};

const C = {
  navy:      "#092A5E",
  blue:      "#1A6FBF",
  blueLight: "#A8C8E8",
  teal:      "#0D9488",
  tealLight: "#99E6E0",
  red:       "#D40E14",
  green:     "#16A34A",
  amber:     "#D97706",
  purple:    "#7C3AED",
  grey:      "#9CA3AF",
  positive:  "#16A34A",
  negative:  "#D40E14",
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
// number formatters

const fmt     = (n) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
const fmtFull = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(9,42,94,0.12)", fontSize: 12 }}>
      <p style={{ margin: "0 0 6px", fontWeight: 700, color: C.navy }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: "2px 0", color: p.color }}>
          {p.name}: <strong>{fmtFull(p.value)}</strong>
        </p>
      ))}
    </div>
  );
};

if (!document.getElementById("liquidity-print-style")) {
  const s = document.createElement("style");
  s.id = "liquidity-print-style";
  s.textContent = `
    @media print {
      body * { visibility: hidden; }
      #liquidity-print, #liquidity-print * { visibility: visible; }
      #liquidity-print { position: absolute; left: 0; top: 0; width: 100%; }
      button, .no-print { display: none !important; }
      @page { size: A3 landscape; margin: 10mm; }
    }
  `;
  document.head.appendChild(s);
}

const exportPDF = () => window.print();

export default function LiquidityDashboard() {
  const navigate    = useNavigate();
  const currentYear = new Date().getFullYear();

  const [year,        setYear]        = useState(currentYear);
  const [compareYear, setCompareYear] = useState(currentYear - 1);
  const [period,      setPeriod]      = useState("P12");
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  // Keep compare year in sync with selected year
  useEffect(() => { setCompareYear(year - 1); }, [year]);
  useEffect(() => { fetchData(); }, [year, compareYear, period]);

  // Fetches liquidity data for selected year, period and comparison year
  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/dashboard/liquidity?year=${year}&period=${period}&compare_year=${compareYear}`,
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


  if (loading) return (
    <div style={S.page}>
      <div style={S.loadingBox}>
        <div style={S.spinner} />
        <p style={{ color: C.navy, marginTop: 16, fontWeight: 600 }}>Loading Liquidity Dashboard...</p>
      </div>
    </div>
  );
  if (error) return (
    <div style={S.page}>
      <p style={{ color: C.red, textAlign: "center", marginTop: 100 }}>{error}</p>
    </div>
  );
  if (!data) return null;

  const { kpis, monthlyTrend, cashBalance, cashVsPayables, supplierVsCF, waterfallData } = data;

  // Build waterfall stacking
  const waterfall = (() => {
    let running = 0;
    return (waterfallData || []).map((item) => {
      if (item.type === "total") {
        running = item.value;
        return { ...item, base: 0, bar: item.value, fill: item.value >= 0 ? C.positive : C.negative };
      }
      const base = running;
      running += item.value;
      return { ...item, base, bar: item.value, fill: item.value >= 0 ? C.positive : C.negative };
    });
  })();

  // KPI card definitions with health check functions
  const kpiCards = [
  {
    key: "cashRatio",
    label: "Cash Ratio",
    good: (v) => v >= 0.2,
    format: (v) => v.toFixed(2),
    icon: (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.blue}
           strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  {
    key: "freeCashFlow",
    label: "Free Cash Flow",
    good: (v) => v >= 0,
    format: (v) => fmt(v),
    icon: (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.blue}
           strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
  },
  {
    key: "closingCash",
    label: "Closing Cash Balance",
    good: (v) => v >= 0,
    format: (v) => fmt(v),
    icon: (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.blue}
           strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    key: "openingCash",
    label: "Opening Cash Balance",
    good: (v) => v >= 0,
    format: (v) => fmt(v),
    icon: (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.blue}
           strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
  },
];

  return (
    <div style={S.page} id="liquidity-print">

      {/* Top bar */}
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => navigate("/home")}>←</button>
        <h1 style={S.pageTitle}>Liquidity</h1>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button style={S.exportBtn} onClick={exportPDF}>↓ PDF</button>
          <img src="/Tui_logo.png" alt="TUI" style={S.logo} onError={e => e.target.style.display = "none"} />
        </div>
      </div>

      {/* Controls */}
      <div style={S.controlBar} className="no-print">
        <div style={S.yearTabs}>
          {[year - 1, year].map(y => (
            <button key={y} style={year === y ? S.yearTabActive : S.yearTab} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
        <div style={S.periodWrap}>
          <span style={S.periodLabel}>Period:</span>
          <div style={S.periodTabs}>
            {FISCAL_PERIODS.map(({ period: p, month }) => (
              <button key={p} style={period === p ? S.periodTabActive : S.periodTab}
                onClick={() => setPeriod(p)} title={month}>{p}</button>
            ))}
          </div>
        </div>
        <span style={S.currencyLabel}>Actual Values in EUR</span>
      </div>

<div style={S.kpiSection}>
  {kpiCards.map(({ key, label, good, format, icon }) => {
    const curr = kpis[key]?.current  ?? 0;
    const prev = kpis[key]?.previous ?? 0;
    const ok   = good(curr);
    return (
      <div key={key} style={S.kpiBlock}>
        <div style={S.kpiIcon}>{icon}</div>
        <div style={S.kpiCard}>
          <p style={S.kpiLabel}>{label}</p>
          <p style={S.kpiRowTag}>Current</p>
          <p style={{ ...S.kpiValue, color: ok ? C.green : C.red }}>{format(curr)}</p>
          <p style={S.kpiRowTag}>Previous</p>
          <p style={S.kpiPrev}>{format(prev)}</p>
        </div>
        <div style={S.kpiUnderline} />
      </div>
    );
  })}
</div>

      {/* AI Panel */}
      <LiquidityAIPanel year={year} period={period} />

      {/* Waterfall */}
      <div style={{ padding: "24px 28px 8px" }}>
        <div style={S.chartCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
            <p style={{ ...S.chartTitle, marginBottom: 0 }}>Cash Flow {compareYear} – {year}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.navy, whiteSpace: "nowrap" }}>Compare to:</span>
              <select
                value={compareYear}
                onChange={e => setCompareYear(Number(e.target.value))}
                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12, fontFamily: "Arial, sans-serif", color: "#374151", background: "white", cursor: "pointer" }}
              >
                {Array.from({ length: 5 }, (_, i) => year - 1 - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={S.legendRow}>
            <span style={{ ...S.dot(C.positive), borderRadius: 2 }} />
            <span style={S.legendText}>Current year ({year})</span>
            <span style={{ display: "inline-block", width: 24, height: 2, background: C.navy, borderTop: `2px dashed ${C.navy}`, verticalAlign: "middle", margin: "0 4px 0 12px" }} />
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: C.navy, verticalAlign: "middle", marginRight: 4 }} />
            <span style={S.legendText}>Compare year ({compareYear})</span>
          </div>
          {waterfall.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: C.grey, fontSize: 13 }}>
              No waterfall data — check your cash flow labels in the database.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={waterfall} margin={{ bottom: 48, top: 24, left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" interval={0} height={48} tick={<WrappedTick maxChars={9} fontSize={10}/>}/>
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#CBD5E1" />
                <Bar dataKey="base" stackId="wf" fill="transparent" legendType="none" />
                <Bar dataKey="bar" stackId="wf" name="Current Year" radius={[3, 3, 0, 0]}
                  label={{ position: "top", fontSize: 9, formatter: fmt }}>
                  {waterfall.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
                <Line
                  type="linear"
                  dataKey="prev"
                  name="Previous Year"
                  stroke={C.navy}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ r: 4, fill: C.navy, stroke: "white", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 1 + 2: Monthly Trend + Composition */}
      <div style={S.row2}>
        <div style={S.chartCard}>
          <p style={S.chartTitle}>Monthly Cash Flow Trend</p>
          <p style={S.chartSub}>How cash flow evolves over time</p>
          <div style={S.legendRow}>
            <span style={S.dot(C.blue)}      /><span style={S.legendText}>Net CF</span>
            <span style={S.dot(C.teal)}      /><span style={S.legendText}>Operating</span>
            <span style={S.dot(C.blueLight)} /><span style={S.legendText}>Prev Year</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="net"       name="Net CF"        stroke={C.blue}      strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="operating" name="Operating CF"  stroke={C.teal}      strokeWidth={2}   dot={{ r: 2 }} />
              <Line type="monotone" dataKey="prev_op"   name="Prev Year Op." stroke={C.blueLight} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={S.chartCard}>
          <p style={S.chartTitle}>Cash Flow Composition</p>
          <p style={S.chartSub}>Breakdown of operating, investing & financing</p>
          <div style={S.legendRow}>
            <span style={S.dot(C.blue)}   /><span style={S.legendText}>Operating</span>
            <span style={S.dot(C.amber)}  /><span style={S.legendText}>Investing</span>
            <span style={S.dot(C.purple)} /><span style={S.legendText}>Financing</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#CBD5E1" />
              <Bar dataKey="operating" name="Operating" stackId="cf" fill={C.blue}   />
              <Bar dataKey="investing" name="Investing" stackId="cf" fill={C.amber}  />
              <Bar dataKey="financing" name="Financing" stackId="cf" fill={C.purple} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3 + 4: Cash Balance + Cash vs Payables */}
      <div style={S.row2}>
        <div style={S.chartCard}>
          <p style={S.chartTitle}>Cash Balance Evolution</p>
          <p style={S.chartSub}>Track the evolution of the company cash balance</p>
          <div style={S.legendRow}>
            <span style={S.dot(C.teal)}      /><span style={S.legendText}>Closing Balance</span>
            <span style={S.dot(C.tealLight)} /><span style={S.legendText}>Opening Balance</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={cashBalance}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="closing" name="Closing Balance" stroke={C.teal}      strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="opening" name="Opening Balance" stroke={C.tealLight} strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={S.chartCard}>
          <p style={S.chartTitle}>Cash vs Supplier Payables</p>
          <p style={S.chartSub}>Monitor liquidity risk by comparing cash with payables</p>
          <div style={S.legendRow}>
            <span style={S.dot(C.teal)} /><span style={S.legendText}>Available Cash</span>
            <span style={S.dot(C.red)}  /><span style={S.legendText}>Supplier Payables</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={cashVsPayables}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip content={<CustomTooltip />} />
              <Bar  dataKey="payables" name="Supplier Payables" fill={C.red}  opacity={0.25} radius={[3, 3, 0, 0]} />
              <Line dataKey="cash"     name="Available Cash"    stroke={C.teal} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 5: Supplier Payments vs Cash Flow */}
      <div style={{ padding: "0 28px", marginBottom: 32 }}>
        <div style={S.chartCard}>
          <p style={S.chartTitle}>Supplier Payments vs Cash Flow</p>
          <p style={S.chartSub}>Analyze how supplier payments affect company cash flow</p>
          <div style={S.legendRow}>
            <span style={S.dot(C.blue)}  /><span style={S.legendText}>Operating Cash Flow</span>
            <span style={S.dot(C.amber)} /><span style={S.legendText}>Supplier Payments</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={supplierVsCF}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="operatingCashFlow" name="Operating Cash Flow" stroke={C.blue}  strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="supplierPayments"  name="Supplier Payments"  stroke={C.amber} strokeWidth={2}   dot={{ r: 3 }} activeDot={{ r: 6 }} strokeDasharray="6 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

const S = {
  page:       { minHeight: "100vh", background: "linear-gradient(160deg, #D6E8F7 0%, #EAF3FB 40%, #F5F9FD 100%)", fontFamily: "Arial, sans-serif", padding: "0 0 40px" },
  topBar:     { background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", padding: "14px 28px", borderBottom: "1px solid #D6E8F7", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 12px rgba(9,42,94,0.07)" },
  backBtn:    { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.navy, marginRight: 16, padding: "4px 8px", borderRadius: 8 },
  pageTitle:  { flex: 1, textAlign: "center", color: C.navy, fontSize: 22, fontWeight: 800, margin: 0 },
  logo:       { height: 32 },
  exportBtn:  { padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.navy}`, background: C.navy, color: "white", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "Arial,sans-serif" },
  controlBar: { display: "flex", alignItems: "center", flexWrap: "wrap", padding: "10px 28px", gap: 12, background: "white", borderBottom: "1px solid #E5E7EB" },
  yearTabs:   { display: "flex", gap: 4 },
  yearTab:        { padding: "6px 18px", borderRadius: 6, border: "1px solid #CBD5E1", background: "white", cursor: "pointer", fontSize: 13, fontFamily: "Arial, sans-serif", color: "#374151" },
  yearTabActive:  { padding: "6px 18px", borderRadius: 6, border: "none", background: C.navy, cursor: "pointer", fontSize: 13, fontFamily: "Arial, sans-serif", color: "white", fontWeight: 700 },
  periodWrap:  { display: "flex", alignItems: "center", gap: 8 },
  periodLabel: { fontSize: 12, fontWeight: 700, color: C.navy, whiteSpace: "nowrap" },
  periodTabs:  { display: "flex", gap: 2, flexWrap: "wrap" },
  periodTab:        { padding: "4px 8px", borderRadius: 5, border: "1px solid #CBD5E1", background: "white", cursor: "pointer", fontSize: 11, fontFamily: "Arial, sans-serif", color: "#374151" },
  periodTabActive:  { padding: "4px 8px", borderRadius: 5, border: "none", background: C.red, cursor: "pointer", fontSize: 11, fontFamily: "Arial, sans-serif", color: "white", fontWeight: 700 },
  currencyLabel: { marginLeft: "auto", color: C.navy, fontSize: 13, fontWeight: 700 },
  kpiSection:  { display: "flex", justifyContent: "space-around", alignItems: "flex-end", padding: "32px 60px 0", gap: 32 },
  kpiBlock:    { display: "flex", flexDirection: "column", alignItems: "center", flex: 1 },
  kpiIcon:     { marginBottom: 10, opacity: 0.8 },
  kpiCard:     { background: "white", borderRadius: 16, padding: "18px 28px", boxShadow: "0 4px 20px rgba(9,42,94,0.10)", width: "100%", textAlign: "center" },
  kpiLabel:    { color: C.navy, fontSize: 14, fontWeight: 700, margin: "0 0 10px" },
  kpiRowTag:   { color: C.grey, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "4px 0 2px" },
  kpiValue:    { fontSize: 28, fontWeight: 800, margin: "2px 0 8px" },
  kpiPrev:     { fontSize: 16, fontWeight: 600, color: C.grey, margin: 0 },
  kpiUnderline:{ width: "55%", height: 3, background: C.navy, borderRadius: 2, marginTop: 14, opacity: 0.25 },
  row2:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "8px 28px" },
  chartCard: { background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 12px rgba(9,42,94,0.08)" },
  chartTitle:  { color: C.navy, fontSize: 14, fontWeight: 700, margin: "0 0 2px" },
  chartSub:    { color: C.grey, fontSize: 11, margin: "0 0 10px" },
  legendRow:   { display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 11, flexWrap: "wrap" },
  dot: (color) => ({ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }),
  legendText:  { color: "#374151", marginRight: 6 },
  loadingBox:  { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" },
  spinner:     { width: 40, height: 40, border: "4px solid #E5E7EB", borderTop: `4px solid ${C.navy}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  aiPanel: { margin: "16px 28px", backgroundColor: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 12px rgba(9,42,94,0.08)", borderLeft: `4px solid ${C.navy}` },
  aiPanelHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  aiPanelTitle: { margin: 0, fontSize: 14, fontWeight: 700, color: C.navy },
  aiBtn: { padding: "8px 18px", backgroundColor: C.navy, color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "Arial, sans-serif", cursor: "pointer" },
  aiText: { margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.7 },
  aiPlaceholder: { margin: 0, fontSize: 13, color: C.grey, fontStyle: "italic" },
  aiError: { margin: 0, fontSize: 13, color: C.red },
  aiSpinner: { width: 18, height: 18, border: "3px solid #E5E7EB", borderTop: `3px solid ${C.navy}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 },
};