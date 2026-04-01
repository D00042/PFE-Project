import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, LabelList,
  PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend,ReferenceLine,
} from "recharts";

const API_URL = "http://127.0.0.1:8000";

const COLORS = {
  navy:        "#001F5B",
  blue:        "#1B5EA6",      
  blueLight:   "#A3C4E8",      
  red:         "#C8102E",
  teal:        "#007B8A",
  tealLight:   "#7ECCD4",
  amber:       "#C96A00",
  amberLight:  "#F9C46B",
  purple:      "#5B2D8E",
  purpleLight: "#B89FD4",
  green:       "#0A6B3A",
  grey:        "#8A8E96",
};

const PIE_ASSET_COLORS     = ["#1B5EA6","#007B8A"];
const PIE_LIABILITY_COLORS = ["#5B2D8E","#C8102E"];

const FISCAL_PERIODS = [
  { period:"P1",  month:"October"   }, { period:"P2",  month:"November"  },
  { period:"P3",  month:"December"  }, { period:"P4",  month:"January"   },
  { period:"P5",  month:"February"  }, { period:"P6",  month:"March"     },
  { period:"P7",  month:"April"     }, { period:"P8",  month:"May"       },
  { period:"P9",  month:"June"      }, { period:"P10", month:"July"      },
  { period:"P11", month:"August"    }, { period:"P12", month:"September" },
];

const fmt     = (n) => new Intl.NumberFormat("en-US", { notation:"compact", maximumFractionDigits:1 }).format(n);
const fmtFull = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits:0 }).format(n);
const fmtK    = (n) => {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
};

const lbTop     = { fontSize:8, fill:COLORS.navy, fontWeight:600 };
const lbTopGrey = { fontSize:8, fill:COLORS.grey, fontWeight:500 };
const lbRight   = { fontSize:8, fill:COLORS.navy, fontWeight:600 };

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

const RADIAN = Math.PI / 180;
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

if (!document.getElementById("bs-print-style")) {
  const s = document.createElement("style"); s.id = "bs-print-style";
  s.textContent = `@media print { body *{visibility:hidden} #bs-print,#bs-print *{visibility:visible} #bs-print{position:absolute;left:0;top:0;width:100%} button{display:none!important} .no-print{display:none!important} }`;
  document.head.appendChild(s);
}

function KpiBar({ value, prevValue, unit = "", up, formatter, maxVal = 100 }) {
  const display     = formatter ? formatter(value)     : value.toFixed(1);
  const prevDisplay = formatter ? formatter(prevValue) : prevValue.toFixed(1);
  const pct     = Math.min(Math.abs(value)     / Math.max(Math.abs(maxVal), 1) * 100, 100);
  const prevPct = Math.min(Math.abs(prevValue) / Math.max(Math.abs(maxVal), 1) * 100, 100);
  return (
    <>
      <div style={{ marginBottom:8 }}>
        <span style={{ fontSize:10, color:COLORS.grey, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600, display:"block", marginBottom:3 }}>Current</span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ height:18, borderRadius:4, width:`${pct}%`, maxWidth:"65%", minWidth:6, backgroundColor: up ? COLORS.blue : COLORS.red, transition:"width 0.5s" }}/>
          <span style={{ fontSize:15, fontWeight:800, color: up ? COLORS.blue : COLORS.red }}>{display}{unit}</span>
        </div>
      </div>
      <div>
        <span style={{ fontSize:10, color:COLORS.grey, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600, display:"block", marginBottom:3 }}>Previous</span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ height:18, borderRadius:4, width:`${prevPct}%`, maxWidth:"65%", minWidth:6, backgroundColor:COLORS.blueLight }}/>
          <span style={{ fontSize:13, fontWeight:600, color:COLORS.grey }}>{prevDisplay}{unit}</span>
        </div>
      </div>
    </>
  );
}

// ── Generic horizontal bar card (current=dark blue, previous=light blue) ─────
function HBarCard({ title, subtitle, data, height = 280 }) {
  if (!data?.length) return (
    <div style={S.chartCard}>
      <p style={S.chartTitle}>{title}</p>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height, color:COLORS.grey, fontSize:13 }}>No data</div>
    </div>
  );
  return (
    <div style={S.chartCard}>
      <p style={S.chartTitle}>{title}</p>
      {subtitle && <p style={S.chartSub}>{subtitle}</p>}
      <div style={S.legendRow}>
        <span style={S.dot(COLORS.blue)}/><span style={S.legendText}>Current Year</span>
        <span style={S.dot(COLORS.blueLight)}/><span style={S.legendText}>Previous Year</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left:4, right:56, top:4, bottom:4 }}>
          <XAxis type="number" tick={{ fontSize:9 }} tickFormatter={fmt}/>
          <YAxis type="category" dataKey="label" tick={{ fontSize:9 }} width={210}/>
          <Tooltip formatter={(v) => fmtFull(v)}/>
          <Bar dataKey="current"  name="Current Year"  fill={COLORS.blue}      radius={[0,4,4,0]}>
            <LabelList dataKey="current"  position="right" formatter={fmt} style={lbRight}/>
          </Bar>
          <Bar dataKey="previous" name="Previous Year" fill={COLORS.blueLight} radius={[0,4,4,0]}>
            <LabelList dataKey="previous" position="right" formatter={fmt} style={lbTopGrey}/>
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Column (vertical) bar card ────────────────────────────────────────────────
function VBarCard({ title, subtitle, data, height = 280 }) {
  if (!data?.length) return (
    <div style={S.chartCard}>
      <p style={S.chartTitle}>{title}</p>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height, color:COLORS.grey, fontSize:13 }}>No data</div>
    </div>
  );
  return (
    <div style={S.chartCard}>
      <p style={S.chartTitle}>{title}</p>
      {subtitle && <p style={S.chartSub}>{subtitle}</p>}
      <div style={S.legendRow}>
        <span style={S.dot(COLORS.blue)}/><span style={S.legendText}>Current Year</span>
        <span style={S.dot(COLORS.blueLight)}/><span style={S.legendText}>Previous Year</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top:22, right:8, left:8, bottom:8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9"/>
          <XAxis dataKey="label" interval={0} height={52} tick={<WrappedTick maxChars={12} fontSize={9}/>}/>
          <YAxis tick={{ fontSize:9 }} tickFormatter={fmt} width={48}/>
          <Tooltip formatter={(v) => fmtFull(v)} contentStyle={{ borderRadius:8, border:"none", boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}/>
          <Bar dataKey="current"  name="Current Year"  fill={COLORS.blue}      radius={[4,4,0,0]}>
            <LabelList dataKey="current"  position="top" formatter={fmt} style={lbTop}/>
          </Bar>
          <Bar dataKey="previous" name="Previous Year" fill={COLORS.blueLight} radius={[4,4,0,0]}>
            <LabelList dataKey="previous" position="top" formatter={fmt} style={lbTopGrey}/>
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
function DonutCompareCard({ title, currentVal, prevVal, color, prevColor }) {
  const total    = Math.max(currentVal + prevVal, 1);
  const currPct  = Math.round((currentVal / total) * 100);
  const prevPct  = 100 - currPct;
  const donutData = [
    { name: "Current Year", value: currentVal, fill: color },
    { name: "Previous Year", value: prevVal,   fill: prevColor },
  ];
  const fmtK = (n) => {
    if (!n) return "0";
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return (n/1_000_000).toFixed(1)+"M";
    if (abs >= 1_000)     return (n/1_000).toFixed(1)+"K";
    return n.toFixed(0);
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                  padding:"20px 16px", flex:1 }}>
      <p style={{ margin:"0 0 12px", fontSize:12, fontWeight:700,
                  color:COLORS.navy, textAlign:"center" }}>{title}</p>
      <div style={{ position:"relative", width:140, height:140 }}>
        <PieChart width={140} height={140}>
          <Pie data={donutData} cx={65} cy={65} innerRadius={44} outerRadius={66}
               startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
            {donutData.map((entry, i) => <Cell key={i} fill={entry.fill}/>)}
          </Pie>
        </PieChart>
        <div style={{ position:"absolute", top:"50%", left:"50%",
                      transform:"translate(-50%,-50%)", textAlign:"center",
                      pointerEvents:"none" }}>
          <p style={{ margin:0, fontSize:17, fontWeight:900,
                      color:COLORS.navy, lineHeight:1 }}>{fmtK(currentVal)}</p>
          <p style={{ margin:"2px 0 0", fontSize:9, color:COLORS.grey, fontWeight:600,
                      textTransform:"uppercase", letterSpacing:"0.05em" }}>current</p>
        </div>
      </div>
      <div style={{ display:"flex", gap:14, marginTop:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10 }}>
          <span style={{ width:8, height:8, borderRadius:"50%",
                         background:color, display:"inline-block" }}/>
          <span style={{ color:"#374151" }}>Current {currPct}%</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10 }}>
          <span style={{ width:8, height:8, borderRadius:"50%",
                         background:prevColor, display:"inline-block" }}/>
          <span style={{ color:"#374151" }}>Previous {prevPct}%</span>
        </div>
      </div>
      {(() => {
        const delta = currentVal - prevVal;
        const pct   = prevVal > 0 ? ((delta/prevVal)*100).toFixed(1) : null;
        const up    = delta >= 0;
        return (
          <p style={{ margin:"8px 0 0", fontSize:11, fontWeight:700,
                      color: up ? COLORS.green : COLORS.red }}>
            {up ? "▲" : "▼"} {fmtK(Math.abs(delta))}
            {pct !== null && ` (${Math.abs(pct)}%)`} vs prev
          </p>
        );
      })()}
    </div>
  );
}

function BalanceSheetTotalsChart({ charts }) {
  const assetsData = [
    { label:"Total Assets",       current: charts?.totalAssets?.[0]?.current       ?? 0, previous: charts?.totalAssets?.[0]?.previous       ?? 0 },
    { label:"Non-Current Assets", current: charts?.nonCurrentAssets?.[0]?.current  ?? 0, previous: charts?.nonCurrentAssets?.[0]?.previous  ?? 0 },
    { label:"Current Assets",     current: charts?.currentAssets?.[0]?.current     ?? 0, previous: charts?.currentAssets?.[0]?.previous     ?? 0 },
  ];
  const equityLiabData = [
    { label:"Total Equity & Liab.", current: charts?.totalEquity?.[0]?.current           ?? 0, previous: charts?.totalEquity?.[0]?.previous           ?? 0 },
    { label:"Non-Current Liab.",    current: charts?.nonCurrentLiabilities?.[0]?.current ?? 0, previous: charts?.nonCurrentLiabilities?.[0]?.previous ?? 0 },
    { label:"Current Liabilities",  current: charts?.currentLiabilities?.[0]?.current   ?? 0, previous: charts?.currentLiabilities?.[0]?.previous   ?? 0 },
  ];
  return (
    <div style={{ ...S.chartCard, gridColumn:"1 / -1" }}>
      <p style={S.chartTitle}>Balance Sheet Key Totals</p>
      <div style={S.legendRow}>
        <span style={S.dot(COLORS.blue)}/><span style={S.legendText}>Current Year</span>
        <span style={S.dot(COLORS.blueLight)}/><span style={S.legendText}>Previous Year</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
        <div>
          <p style={{ fontSize:11, fontWeight:700, color:COLORS.blue, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Assets</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={assetsData} margin={{ top:22, right:16, left:8, bottom:8 }}>
              <XAxis dataKey="label" interval={0} height={48} tick={<WrappedTick maxChars={10} fontSize={9}/>}/>
              <YAxis tick={{ fontSize:9 }} tickFormatter={fmt} width={48}/>
              <Tooltip formatter={(v) => fmtFull(v)} contentStyle={{ borderRadius:8, border:"none", boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}/>
              <Bar dataKey="current"  name="Current Year"  fill={COLORS.blue}      radius={[4,4,0,0]}>
                <LabelList dataKey="current"  position="top" formatter={fmt} style={lbTop}/>
              </Bar>
              <Bar dataKey="previous" name="Previous Year" fill={COLORS.blueLight} radius={[4,4,0,0]}>
                <LabelList dataKey="previous" position="top" formatter={fmt} style={lbTopGrey}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p style={{ fontSize:11, fontWeight:700, color:COLORS.purple, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Equity &amp; Liabilities</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={equityLiabData} margin={{ top:22, right:16, left:8, bottom:8 }}>
              <XAxis dataKey="label" interval={0} height={48} tick={<WrappedTick maxChars={10} fontSize={9}/>}/>
              <YAxis tick={{ fontSize:9 }} tickFormatter={fmt} width={48}/>
              <Tooltip formatter={(v) => fmtFull(v)} contentStyle={{ borderRadius:8, border:"none", boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}/>
              <Bar dataKey="current"  name="Current Year"  fill={COLORS.purple}      radius={[4,4,0,0]}>
                <LabelList dataKey="current"  position="top" formatter={fmt} style={{ fontSize:8, fill:COLORS.purple, fontWeight:700 }}/>
              </Bar>
              <Bar dataKey="previous" name="Previous Year" fill={COLORS.purpleLight} radius={[4,4,0,0]}>
                <LabelList dataKey="previous" position="top" formatter={fmt} style={lbTopGrey}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function BalanceSheetDashboard() {
  const navigate    = useNavigate();
  const currentYear = new Date().getFullYear();

  const [year,    setYear]    = useState(currentYear);
  const [period,  setPeriod]  = useState("P12");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [avlYear, setAvlYear] = useState(currentYear);
  const [avlData, setAvlData] = useState(null);
  const [avlFilter, setAvlFilter] = useState("all");
  const [ncaFilter, setNcaFilter] = useState("all");
  const [caFilter,  setCaFilter]  = useState("all");
  const [nclFilter, setNclFilter] = useState("all");
  const [clFilter,  setClFilter]  = useState("all");


  const exportPDF = () => window.print();

  useEffect(() => { fetchData(); }, [year, period]);

  useEffect(() => {
    const fetchAvl = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        const res = await fetch(`${API_URL}/dashboard/balance-sheet?year=${avlYear}&period=${period}`,
          { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const d = await res.json();
          setAvlData(d.charts?.assetsVsLiabilities ?? []);
        }
      } catch {}
    };
    fetchAvl();
  }, [avlYear, period]);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/dashboard/balance-sheet?year=${year}&period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setError("Failed to load balance sheet data."); return; }
      const d = await res.json();
      setData(d);
      if (avlYear === year) setAvlData(d.charts?.assetsVsLiabilities ?? []);
    } catch { setError("Network error. Is the backend running?"); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div style={S.page}><div style={S.loadingBox}><div style={S.spinner}/>
      <p style={{ color:COLORS.navy, marginTop:16, fontWeight:600 }}>Loading Balance Sheet...</p>
    </div></div>
  );
  if (error) return <div style={S.page}><p style={{ color:COLORS.red, textAlign:"center", marginTop:100 }}>{error}</p></div>;
  if (!data) return null;

  const { kpis, charts } = data;

  const equityRatio    = kpis?.equityRatio    ?? { current:0, previous:0 };
  const workingCapital = kpis?.workingCapital ?? { current:0, previous:0 };
  const currentRatio   = kpis?.currentRatio   ?? { current:0, previous:0 };
  const debtToEquity   = kpis?.debtToEquity   ?? { current:0, previous:0 };
  const cash           = kpis?.cash           ?? { current:0, previous:0 };

  const equityUp = equityRatio.current    >= equityRatio.previous;
  const wcUp     = workingCapital.current >= workingCapital.previous;
  const cashUp   = cash.current           >= cash.previous;
  const deUp     = debtToEquity.current   <= debtToEquity.previous;

  const crColor = currentRatio.current >= 2 ? COLORS.green : currentRatio.current >= 1 ? COLORS.blue : COLORS.red;
  const deColor = debtToEquity.current <= 1 ? COLORS.green : debtToEquity.current <= 2 ? COLORS.blue : COLORS.red;

  const assetPieData     = (charts?.assetStructure     ?? []).filter(d => d.value > 0);
  const liabilityPieData = (charts?.liabilityStructure ?? []).filter(d => d.value > 0);
  const rawAvlData       = avlData ?? charts?.assetsVsLiabilities ?? [];

  // Filter AVL data by slicer
  const displayAvlData = rawAvlData; // bar chart handles which keys to show via slicer in legend

  // Revenue vs Assets data
  const rvaData = (() => {
  const nc_curr = charts?.nonCurrentAssets?.[0]?.current  ?? 0;
  const nc_prev = charts?.nonCurrentAssets?.[0]?.previous ?? 0;
  const ca_curr = charts?.currentAssets?.[0]?.current     ?? 0;
  const ca_prev = charts?.currentAssets?.[0]?.previous    ?? 0;
  const ta_curr = (charts?.totalAssets?.[0]?.current)     ?? (nc_curr + ca_curr);
  const ta_prev = (charts?.totalAssets?.[0]?.previous)    ?? (nc_prev + ca_prev);
  if (ta_curr === 0 && ta_prev === 0) return [];
  return [
    { month: `${year - 1}`, assets: ta_prev, prevAssets: nc_prev, revenue: 0 },
    { month: `${year}`,     assets: ta_curr, prevAssets: nc_curr, revenue: 0 },
  ];
})();
const filterChartData = (data, activeKey) =>
  activeKey === "all" ? data : data.filter(d => d.label === activeKey);

  return (
    <div style={S.page} id="bs-print">

      {/* ── Top bar ── */}
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => navigate("/home")}>←</button>
        <h1 style={S.pageTitle}>Balance Sheet Overview</h1>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button style={S.exportBtn} onClick={exportPDF}>↓ PDF</button>
          <img src="/Tui_logo.png" alt="TUI" style={S.logo}/>
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={S.controlBar} className="no-print">
        <div style={S.yearTabs}>
          {[year - 1, year].map(y => (
            <button key={y} style={year === y ? S.yearTabActive : S.yearTab} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
        <div style={S.periodWrap}>
          <span style={S.periodLabel}>Period:</span>
          <div style={S.periodTabs}>
            {FISCAL_PERIODS.map(({ period:p, month }) => (
              <button key={p} style={period === p ? S.periodTabActive : S.periodTab} onClick={() => setPeriod(p)} title={month}>{p}</button>
            ))}
          </div>
        </div>
        <span style={S.currencyLabel}>Values in EUR</span>
      </div>

      {/* ── KPI Cards ── */}
      <div style={S.kpiRow}>
        <div style={S.kpiCard}>
          <div style={S.kpiHeader}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M3 9l9-6 9 6M4 20h16"/><path d="M6 9l-3 7h6L6 9zM18 9l-3 7h6l-3-7z"/></svg><p style={S.kpiTitle}>Equity Ratio</p></div>
          <KpiBar value={equityRatio.current} prevValue={equityRatio.previous} unit="%" up={equityUp} maxVal={100}/>
          <div style={{ ...S.kpiDelta, color: equityUp ? COLORS.green : COLORS.red }}>{equityUp ? "▲" : "▼"} {Math.abs(equityRatio.current - equityRatio.previous).toFixed(1)}% vs prev</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiHeader}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="12" y1="10" x2="14" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/></svg><p style={S.kpiTitle}>Working Capital</p></div>
          <KpiBar value={workingCapital.current} prevValue={workingCapital.previous} up={wcUp} formatter={fmtK} maxVal={Math.max(Math.abs(workingCapital.current), Math.abs(workingCapital.previous), 1)}/>
          <div style={{ ...S.kpiDelta, color: wcUp ? COLORS.green : COLORS.red }}>{wcUp ? "▲" : "▼"} {fmtK(Math.abs(workingCapital.current - workingCapital.previous))} vs prev</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiHeader}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg><p style={S.kpiTitle}>Current Ratio</p></div>
          <p style={{ fontSize:26, fontWeight:900, color:crColor, margin:"6px 0 2px" }}>{currentRatio.current.toFixed(2)}</p>
          <p style={{ fontSize:11, color:COLORS.grey, margin:"0 0 4px" }}>Prev: {currentRatio.previous.toFixed(2)}</p>
          <p style={{ fontSize:10, color:crColor, fontWeight:700, margin:0 }}>{currentRatio.current >= 2 ? "● Healthy" : currentRatio.current >= 1 ? "● Adequate" : "● Below 1 — Risk"}</p>
          <div style={{ ...S.kpiDelta, color: currentRatio.current >= currentRatio.previous ? COLORS.green : COLORS.red }}>{currentRatio.current >= currentRatio.previous ? "▲" : "▼"} {Math.abs(currentRatio.current - currentRatio.previous).toFixed(2)} vs prev</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiHeader}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><p style={S.kpiTitle}>Debt / Equity</p></div>
          <p style={{ fontSize:26, fontWeight:900, color:deColor, margin:"6px 0 2px" }}>{debtToEquity.current.toFixed(2)}</p>
          <p style={{ fontSize:11, color:COLORS.grey, margin:"0 0 4px" }}>Prev: {debtToEquity.previous.toFixed(2)}</p>
          <p style={{ fontSize:10, color:deColor, fontWeight:700, margin:0 }}>{debtToEquity.current <= 1 ? "● Low leverage" : debtToEquity.current <= 2 ? "● Moderate" : "● High leverage"}</p>
          <div style={{ ...S.kpiDelta, color: deUp ? COLORS.green : COLORS.red }}>{deUp ? "▼ improved" : "▲ increased"} {Math.abs(debtToEquity.current - debtToEquity.previous).toFixed(2)} vs prev</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiHeader}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg><p style={S.kpiTitle}>Cash Position</p></div>
          <p style={{ fontSize:22, fontWeight:900, color: cashUp ? COLORS.blue : COLORS.red, margin:"6px 0 2px" }}>{fmtK(cash.current)}</p>
          <p style={{ fontSize:11, color:COLORS.grey, margin:"0 0 4px" }}>Prev: {fmtK(cash.previous)}</p>
          <div style={{ ...S.kpiDelta, color: cashUp ? COLORS.green : COLORS.red }}>{cashUp ? "▲" : "▼"} {fmtK(Math.abs(cash.current - cash.previous))} vs prev</div>
        </div>
      </div>

      {/* ── Section 1: Overview ── */}
      <div style={S.section}><p style={S.sectionHeading}>Balance Sheet Overview</p></div>
      <div style={{ padding:"0 28px 16px" }}>
        <BalanceSheetTotalsChart charts={charts}/>
      </div>

      {/* ── Section 2: Financial Structure ── */}
      <div style={S.section}><p style={S.sectionHeading}>Financial Structure Analysis</p></div>
      <div style={S.row2}>
        {/* Asset Structure Pie */}
        <div style={S.chartCard}>
          <p style={S.chartTitle}>Asset Structure</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={assetPieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" labelLine={false} label={renderPieLabel}>
                {assetPieData.map((_, i) => <Cell key={i} fill={PIE_ASSET_COLORS[i % PIE_ASSET_COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v) => fmtFull(v)}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:4 }}>
            {assetPieData.map((d, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
                <span style={{ width:10, height:10, borderRadius:"50%", background:PIE_ASSET_COLORS[i], display:"inline-block" }}/>
                <span style={{ color:"#374151" }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Liability Structure Pie */}
        <div style={S.chartCard}>
          <p style={S.chartTitle}>Liability Structure</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={liabilityPieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" labelLine={false} label={renderPieLabel}>
                {liabilityPieData.map((_, i) => <Cell key={i} fill={PIE_LIABILITY_COLORS[i % PIE_LIABILITY_COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v) => fmtFull(v)}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:4 }}>
            {liabilityPieData.map((d, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
                <span style={{ width:10, height:10, borderRadius:"50%", background:PIE_LIABILITY_COLORS[i], display:"inline-block" }}/>
                <span style={{ color:"#374151" }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Assets vs Liabilities with slicer ── */}
      <div style={{ padding:"0 28px 16px" }}>
        <div style={S.chartCard}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <p style={S.chartTitle}>Assets vs Liabilities Comparison</p>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {/* Year toggle */}
              <div style={{ display:"flex", gap:4 }}>
                {[avlYear - 1, currentYear].filter((v,i,a) => a.indexOf(v) === i).slice(0,2).map(y => (
                  <button key={y} style={avlYear === y ? S.yearTabActive : S.yearTab} onClick={() => setAvlYear(y)}>{y}</button>
                ))}
              </div>
              {/* Slicer: show assets only / liabilities only / both */}
              <select value={avlFilter} onChange={e => setAvlFilter(e.target.value)} style={S.slicerSelect}>
                <option value="all">Assets & Liabilities</option>
                <option value="assets">Assets only</option>
                <option value="liabilities">Liabilities only</option>
              </select>
            </div>
          </div>
          <div style={S.legendRow}>
            {(avlFilter === "all" || avlFilter === "assets") && <><span style={S.dot(COLORS.blue)}/><span style={S.legendText}>Assets</span></>}
            {(avlFilter === "all" || avlFilter === "liabilities") && <><span style={S.dot(COLORS.red)}/><span style={S.legendText}>Liabilities</span></>}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={displayAvlData} margin={{ bottom:8, left:8, right:8, top:22 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9"/>
              <XAxis dataKey="label" interval={0} height={36} tick={<WrappedTick maxChars={12} fontSize={10}/>}/>
              <YAxis tick={{ fontSize:10 }} tickFormatter={fmt}/>
              <Tooltip formatter={(v) => fmtFull(v)} contentStyle={{ borderRadius:8, border:"none", boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}/>
              {(avlFilter === "all" || avlFilter === "assets") && (
                <Bar dataKey="assets" name="Assets" fill={COLORS.blue} radius={[4,4,0,0]}>
                  <LabelList dataKey="assets" position="top" formatter={fmt} style={lbTop}/>
                </Bar>
              )}
              {(avlFilter === "all" || avlFilter === "liabilities") && (
                <Bar dataKey="liabilities" name="Liabilities" fill={COLORS.red} radius={[4,4,0,0]}>
                  <LabelList dataKey="liabilities" position="top" formatter={fmt} style={{ fontSize:8, fill:COLORS.red, fontWeight:600 }}/>
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
{/* ── Section 3: Trade Position ── */}
<div style={S.section}><p style={S.sectionHeading}>Trade Position</p></div>
<div style={{ padding:"0 28px 24px" }}>
  <div style={S.chartCard}>
    <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:8 }}>
      <div>
        <p style={{ ...S.chartTitle, margin:0 }}>Trade Receivables vs Trade Payables</p>
       
      </div>
    </div>

    {/* ── Two donuts only ── */}
<div style={{ display:"flex", alignItems:"stretch", gap:32,
              justifyContent:"center",
              padding:"16px 0" }}>

  <DonutCompareCard
    title="Trade Receivables"
    currentVal={charts?.tradePosition?.find(d => d.label === "Trade Receivables")?.current  ?? 0}
    prevVal   ={charts?.tradePosition?.find(d => d.label === "Trade Receivables")?.previous ?? 0}
    color={COLORS.blue}
    prevColor={COLORS.blueLight}
  />

  <DonutCompareCard
    title="Trade Payables"
    currentVal={charts?.tradePosition?.find(d => d.label === "Trade Payables")?.current  ?? 0}
    prevVal   ={charts?.tradePosition?.find(d => d.label === "Trade Payables")?.previous ?? 0}
    color={COLORS.red}
    prevColor={"#F2A8B8"}
  />

  </div>
</div>
</div>

{/* ── Section 4: Detailed Breakdowns ── */}
<div style={S.section}><p style={S.sectionHeading}>Detailed Breakdowns by Category</p></div>

{/* Row 1: Assets */}
<div style={S.row2}>

  {/* Non-Current Assets with filter */}
  <div style={S.chartCard}>
    <p style={S.chartTitle}>Non-Current Assets Details</p>
    <p style={S.chartSub}>Breakdown of fixed and intangible assets</p>
    <div style={{ marginBottom:10 }}>
  <select value={ncaFilter} onChange={e => setNcaFilter(e.target.value)} style={S.slicerSelect}>
    {["all", ...(charts?.nonCurrentAssetsDetail ?? []).map(d => d.label)].map(key => (
      <option key={key} value={key}>{key === "all" ? "All Categories" : key}</option>
    ))}
  </select>
</div>
    <VBarCard
      title=""
      data={filterChartData(charts?.nonCurrentAssetsDetail ?? [], ncaFilter)}
      height={260}
    />
  </div>

  {/* Current Assets with filter */}
  <div style={S.chartCard}>
    <p style={S.chartTitle}>Current Assets Details</p>
    <div style={{ marginBottom:10 }}>
  <select value={caFilter} onChange={e => setCaFilter(e.target.value)} style={S.slicerSelect}>
    {["all", ...(charts?.currentAssetsDetail ?? []).map(d => d.label)].map(key => (
      <option key={key} value={key}>{key === "all" ? "All Categories" : key}</option>
    ))}
  </select>
</div>
    <HBarCard
      title=""
      data={filterChartData(charts?.currentAssetsDetail ?? [], caFilter)}
      height={260}
    />
  </div>

</div>

{/* Row 2: Liabilities */}
<div style={{ ...S.row2, marginBottom:32 }}>

  {/* Non-Current Liabilities with filter */}
  <div style={S.chartCard}>
    <p style={S.chartTitle}>Non-Current Liabilities Details</p>
    <p style={S.chartSub}>Long-term obligations and provisions</p>
    {(() => {
      const nclData = [
        {
          label: "SB Non-current provisions and liabilities",
          current:  charts?.nonCurrentLiabilities?.[0]?.current  ?? 0,
          previous: charts?.nonCurrentLiabilities?.[0]?.previous ?? 0,
        }
      ];
      return (
        <>
          <div style={{ marginBottom:10 }}>
  <select value={nclFilter} onChange={e => setNclFilter(e.target.value)} style={S.slicerSelect}>
    {["all", ...nclData.map(d => d.label)].map(key => (
      <option key={key} value={key}>{key === "all" ? "All Categories" : key}</option>
    ))}
  </select>
</div>
          <VBarCard title="" data={filterChartData(nclData, nclFilter)} height={260}/>
        </>
      );
    })()}
  </div>

  {/* Current Liabilities with filter */}
  <div style={S.chartCard}>
    <p style={S.chartTitle}>Current Liabilities Details</p>
    <div style={{ marginBottom:10 }}>
  <select value={clFilter} onChange={e => setClFilter(e.target.value)} style={S.slicerSelect}>
    {["all", ...(charts?.currentLiabilitiesDetail ?? []).map(d => d.label)].map(key => (
      <option key={key} value={key}>{key === "all" ? "All Categories" : key}</option>
    ))}
  </select>
</div>
    <HBarCard
      title=""
      data={filterChartData(charts?.currentLiabilitiesDetail ?? [], clFilter)}
      height={260}
    />
  </div>

   </div>
    </div> 
  );
}

const S = {
  page:          { minHeight:"100vh", background:"linear-gradient(160deg,#DCE8F5 0%,#ECF3FA 40%,#F5F9FD 100%)", fontFamily:"Arial,sans-serif", paddingBottom:40 },
  topBar:        { background:"rgba(255,255,255,0.90)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", padding:"14px 28px", borderBottom:"1px solid #D0DFF0", position:"sticky", top:0, zIndex:10, boxShadow:"0 2px 12px rgba(0,31,91,0.07)" },
  backBtn:       { background:"none", border:"none", fontSize:22, cursor:"pointer", color:COLORS.navy, marginRight:16, padding:"4px 8px", borderRadius:8 },
  pageTitle:     { flex:1, textAlign:"center", color:COLORS.navy, fontSize:22, fontWeight:800, margin:0 },
  logo:          { height:32, marginLeft:12 },
  exportBtn:     { padding:"6px 14px", borderRadius:8, border:`1px solid ${COLORS.navy}`, background:COLORS.navy, color:"white", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"Arial,sans-serif" },
  controlBar:    { display:"flex", alignItems:"center", flexWrap:"wrap", padding:"10px 28px", gap:12, background:"white", borderBottom:"1px solid #E5E7EB" },
  yearTabs:      { display:"flex", gap:4 },
  yearTab:       { padding:"6px 18px", borderRadius:6, border:"1px solid #CBD5E1", background:"white", cursor:"pointer", fontSize:13, fontFamily:"Arial,sans-serif", color:"#374151" },
  yearTabActive: { padding:"6px 18px", borderRadius:6, border:"none", background:COLORS.navy, cursor:"pointer", fontSize:13, fontFamily:"Arial,sans-serif", color:"white", fontWeight:700 },
  periodWrap:    { display:"flex", alignItems:"center", gap:8 },
  periodLabel:   { fontSize:12, fontWeight:700, color:COLORS.navy, whiteSpace:"nowrap" },
  periodTabs:    { display:"flex", gap:2, flexWrap:"wrap" },
  periodTab:       { padding:"4px 8px", borderRadius:5, border:"1px solid #CBD5E1", background:"white", cursor:"pointer", fontSize:11, fontFamily:"Arial,sans-serif", color:"#374151" },
  periodTabActive: { padding:"4px 8px", borderRadius:5, border:"none", background:COLORS.red, cursor:"pointer", fontSize:11, fontFamily:"Arial,sans-serif", color:"white", fontWeight:700 },
  currencyLabel: { marginLeft:"auto", color:COLORS.navy, fontSize:13, fontWeight:700 },
  kpiRow:        { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, padding:"16px 28px" },
  kpiCard:       { background:"white", borderRadius:16, padding:"14px 18px", boxShadow:"0 2px 12px rgba(0,31,91,0.08)" },
  kpiHeader:     { display:"flex", alignItems:"center", gap:10, marginBottom:10 },
  kpiTitle:      { color:COLORS.navy, fontSize:12, fontWeight:800, margin:0, lineHeight:1.3 },
  kpiDelta:      { fontSize:10, fontWeight:700, marginTop:8 },
  section:       { padding:"8px 28px 4px" },
  sectionHeading:{ margin:0, fontSize:14, fontWeight:800, color:COLORS.navy },
  row2:          { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, padding:"8px 28px 16px" },
  chartCard:     { background:"white", borderRadius:16, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,31,91,0.08)" },
  chartTitle:    { color:COLORS.navy, fontSize:13, fontWeight:700, margin:"0 0 4px" },
  chartSub:      { color:COLORS.grey, fontSize:10, margin:"0 0 10px", lineHeight:1.4 },
  legendRow:     { display:"flex", alignItems:"center", gap:6, marginBottom:10, fontSize:10, flexWrap:"wrap" },
  dot:           (c) => ({ width:8, height:8, borderRadius:"50%", background:c, display:"inline-block", flexShrink:0 }),
  legendText:    { color:"#374151", marginRight:6 },
  loadingBox:    { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh" },
  spinner:       { width:40, height:40, border:"4px solid #E5E7EB", borderTop:`4px solid ${COLORS.navy}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  slicerSelect:  { padding:"4px 10px", borderRadius:8, border:"1px solid #CBD5E1", fontSize:11, color:COLORS.navy, background:"white", cursor:"pointer", fontFamily:"Arial,sans-serif", outline:"none" },
};