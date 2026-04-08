import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dashboardService from '../services/dashboardService';
import ProfitabilityAIPanel from "../components/ProfitabilityAIPanel";
import GlobalAIPanel from "../components/GlobalAIPanel";
import {
  ComposedChart, BarChart, Bar, Line,
  LineChart, PieChart, Pie,
  LabelList, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, Cell, ReferenceLine,
  CartesianGrid,
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
  positive:    "#007B8A",
  negative:    "#C8102E",
  total:       "#001F5B",
};

const PIE_COLORS = ["#1B5EA6","#007B8A","#C96A00","#5B2D8E","#C8102E","#001F5B"];

const FISCAL_PERIODS = [
  { period:"P1",  month:"October"   }, { period:"P2",  month:"November"  },
  { period:"P3",  month:"December"  }, { period:"P4",  month:"January"   },
  { period:"P5",  month:"February"  }, { period:"P6",  month:"March"     },
  { period:"P7",  month:"April"     }, { period:"P8",  month:"May"       },
  { period:"P9",  month:"June"      }, { period:"P10", month:"July"      },
  { period:"P11", month:"August"    }, { period:"P12", month:"September" },
];

const fmt     = (n) => new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:1}).format(n);
const fmtFull = (n) => new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(n);

const lbTop     = { fontSize:8, fill:COLORS.navy,  fontWeight:600 };
const lbTopGrey = { fontSize:8, fill:COLORS.grey,  fontWeight:500 };
const lbRight   = { fontSize:8, fill:COLORS.navy,  fontWeight:600 };

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
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const exportPDF = () => {
  const originalZoom = document.body.style.zoom;
  document.body.style.zoom = "100%";
  window.print();
  document.body.style.zoom = originalZoom;
};
if (!document.getElementById("prof-print-style")) {
  const s = document.createElement("style");
  s.id = "prof-print-style";
  s.textContent = `
  @media print {
    body * { visibility: hidden; }
    #prof-print, #prof-print * { visibility: visible; }
    #prof-print { 
      position: absolute; 
      left: 0; 
      top: 0; 
      width: 100%;
    }
    button { display: none !important; }
    .no-print { display: none !important; }
    @page {
      size: A3 landscape;
      margin: 10mm;
    }
  }
`;
  document.head.appendChild(s);
}

// ── Overhead category filter options ─────────────────────────────────────────
const OVERHEAD_CATS = [
  "All",
  "Property Costs",
  "Communication Costs",
  "Travel And Entertainment",
  "Office Costs",
  "Computer Costs",
  "Professional Fees",
];

export default function ProfitabilityDashboard() {
  const navigate    = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year,    setYear]    = useState(currentYear);
  const [period,  setPeriod]  = useState("P12");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [interpretation, setInterpretation] = useState("");
const [loadingAI, setLoadingAI]           = useState(false);
const [aiError, setAiError]               = useState("");

  // ── Individual chart slicers ──────────────────────────────────────────────
  const [overheadCat,  setOverheadCat]  = useState("All");   // Overheads filter
  const [cashFlowType, setCashFlowType] = useState("All");   // Rev vs CF filter: All | positive | negative

  useEffect(() => { fetchData(); }, [year, period]);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(
        `${API_URL}/dashboard/profitability?year=${year}&period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) { setError("Failed to load data."); return; }
      setData(await res.json());
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };
  
  // ── Waterfall (now column + line) ─────────────────────────────────────────
  const waterfallData = useMemo(() => {
    if (!data) return [];
    const pl  = data.plSummary;
    const get = (label) => pl.find(r => r.label === label)?.current ?? 0;
    const steps = [
      { name:"Revenue",         value:  get("Revenue"),                       type:"positive"    },
      { name:"Staff Costs",     value: -get("Staff Costs"),                   type:"negative" },
      { name:"Ovhd Depr.",      value: -get("Overhead Depreciation"),         type:"negative" },
      { name:"Other Overheads", value: -get("Other Overheads"),               type:"negative" },
      { name:"Misc. Overheads", value: -get("Total Miscellaneous Overheads"), type:"negative" },
      { name:"Interest",        value: -get("Interest"),                      type:"negative" },
      { name:"EBIT",            value:  get("EBIT"),                          type:"positive"    },
    ];
    let running = 0;
    return steps.map((s) => {
      if (s.type === "positive") {
        running = s.value; 
        return { ...s, bar: s.value, fill: COLORS.total, cumulative: running };
      }
      running += s.value;
      return { ...s, bar: Math.abs(s.value), fill: s.value >= 0 ? COLORS.positive : COLORS.negative, cumulative: running };
    });
  }, [data]);

  const marginsData = useMemo(() => {
    if (!data) return [];
    return [
      { name:"Gross Margin", current:data.kpis.grossMargin?.current??0,     previous:data.kpis.grossMargin?.previous??0     },
      { name:"EBIT Margin",  current:data.kpis.ebitMargin?.current??0,      previous:data.kpis.ebitMargin?.previous??0      },
      { name:"Net Margin",   current:data.kpis.netProfitMargin?.current??0, previous:data.kpis.netProfitMargin?.previous??0 },
    ];
  }, [data]);

  // ── Overheads sorted descending + filtered ────────────────────────────────
  const sortedOverheads = useMemo(() => {
    if (!data) return [];
    const base = overheadCat === "All"
      ? data.overheadsDetail
      : data.overheadsDetail.filter(d => d.category === overheadCat);
    return [...base].sort((a, b) => b.current - a.current);
  }, [data, overheadCat]);

  // ── Revenue vs Cash Flow data ─────────────────────────────────────────────
  const revVsCFData = useMemo(() => {
    if (!data?.monthlyTrend) return [];
    return data.monthlyTrend.map(m => ({
      month:   m.month,
      revenue: m.revenue,
      // operating CF approximated as ebit + non-cash (ebit as proxy if no CF data)
      operatingCF: m.ebit ?? 0,
    }));
  }, [data]);

  if (loading) return (
    <div style={S.page}><div style={S.loadingBox}><div style={S.spinner}/>
      <p style={{ color:COLORS.navy, marginTop:16, fontWeight:600 }}>Loading Dashboard...</p>
    </div></div>
  );
  if (error) return <div style={S.page}><p style={{ color:COLORS.red, textAlign:"center", marginTop:100 }}>{error}</p></div>;
  if (!data) return null;

  const { kpis, plSummary, monthlyTrend, expensesBreakdown } = data;

  const kpiCards = [
    { label:"Gross Profit Margin", key:"grossMargin",     unit:"%",
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> },
    { label:"EBIT Margin",         key:"ebitMargin",      unit:"%",
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { label:"Net Profit Margin",   key:"netProfitMargin", unit:"%",
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> },
    { label:"ROA", key:"roa", unit:"%",
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> },
    { label:"ROE", key:"roe", unit:"%",
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  ];

  return (
    <div style={S.page} id="prof-print">

      {/* ── Top bar ── */}
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => navigate("/home")}>←</button>
        <h1 style={S.pageTitle}>Profitability Dashboard</h1>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button style={{ ...S.exportBtn, background:COLORS.navy, color:"white", borderColor:COLORS.navy }} onClick={exportPDF}>↓ PDF</button>
          <img src="/Tui_logo.png" alt="TUI" style={S.logo}/>
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={S.controlBar}>
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
      {/* ── Global AI Panel ── */}
<GlobalAIPanel year={year} period={period} />
      {/* ── KPI Cards ── */}
      <div style={S.kpiRow}>
        {kpiCards.map(({ label, key, unit, icon }) => {
          const curr = kpis[key]?.current  ?? 0;
          const prev = kpis[key]?.previous ?? 0;
          const up   = curr >= prev;
          return (
            <div key={key} style={S.kpiCard}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                {icon}<p style={S.kpiTitle}>{label}</p>
              </div>
              <p style={S.kpiRowLabel}>Current Year</p>
              <p style={{ ...S.kpiValue, color: up ? COLORS.blue : COLORS.red }}>{curr.toFixed(1)}{unit}</p>
              <p style={S.kpiRowLabel}>Previous Year</p>
              <p style={{ ...S.kpiValueSm, color:COLORS.grey }}>{prev.toFixed(1)}{unit}</p>
              <div style={{ marginTop:6, fontSize:10, fontWeight:700, color: up ? COLORS.green : COLORS.red }}>
                {up ? "▲" : "▼"} {Math.abs(curr - prev).toFixed(1)}% vs previous year
              </div>
            </div>
          );
        })}
      </div>
      <ProfitabilityAIPanel year={year} period={period} />

   {/* ── Row 1: P&L Summary + Overheads ── */}
      <div style={S.row2}>
        <div style={S.chartCard}>
          <p style={S.chartTitle}>Profit &amp; Loss Summary</p>
          <div style={S.legendRow}>
            <span style={S.dot(COLORS.blue)}/>
            <span style={S.legendText}>Current Year</span>
            <span style={S.dot(COLORS.blueLight)}/>
            <span style={S.legendText}>Previous Year</span>
            <span style={S.dot(COLORS.amber)}/>
            <span style={S.legendText}>Budget</span>
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={plSummary} margin={{ bottom:8, left:8, right:8, top:22 }}>
              <XAxis
                dataKey="label"
                interval={0}
                height={52}
                tick={<WrappedTick maxChars={9} fontSize={9}/>}
              />
              <YAxis tick={{ fontSize:10 }} tickFormatter={fmt}/>
              <Tooltip formatter={(v) => fmtFull(v)}/>
              <Bar dataKey="current"  name="Current Year"  fill={COLORS.blue}      radius={[4,4,0,0]}>
                <LabelList dataKey="current"  position="top" formatter={fmt} style={lbTop}/>
              </Bar>
              <Bar dataKey="previous" name="Previous Year" fill={COLORS.blueLight} radius={[4,4,0,0]}>
                <LabelList dataKey="previous" position="top" formatter={fmt} style={lbTopGrey}/>
              </Bar>
              <Bar dataKey="budget"   name="Budget"        fill={COLORS.amber}     radius={[4,4,0,0]}>
                <LabelList dataKey="budget"   position="top" formatter={fmt}
                  style={{ fontSize:8, fill:COLORS.amber, fontWeight:600 }}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={S.chartCard}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <p style={{ ...S.chartTitle, margin:0 }}>Other Overheads Details</p>
            <select value={overheadCat} onChange={e => setOverheadCat(e.target.value)} style={S.slicerSelect}>
              {OVERHEAD_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={S.legendRow}>
            <span style={S.dot(COLORS.blue)}/><span style={S.legendText}>Current Year</span>
            <span style={S.dot(COLORS.blueLight)}/><span style={S.legendText}>Previous Year</span>
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={sortedOverheads} layout="vertical" margin={{ left:4, right:52, top:8, bottom:8 }}>
              <XAxis type="number" tick={{ fontSize:10 }} tickFormatter={fmt}/>
              <YAxis type="category" dataKey="category" tick={{ fontSize:10 }} width={170}/>
              <Tooltip formatter={(v) => fmtFull(v)}/>
              <Bar dataKey="current"  name="Current Year"  fill={COLORS.blue}      radius={[0,3,3,0]}>
                <LabelList dataKey="current"  position="right" formatter={fmt} style={lbRight}/>
              </Bar>
              <Bar dataKey="previous" name="Previous Year" fill={COLORS.blueLight} radius={[0,3,3,0]}>
                <LabelList dataKey="previous" position="right" formatter={fmt} style={lbTopGrey}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 2: Waterfall + Expenses Pie ── */}
      <div style={S.row2}>
        <div style={S.chartCard}>
          <p style={S.chartTitle}>P&amp;L Waterfall — Revenue to EBIT</p>
          <div style={S.legendRow}>
            <span style={S.dot(COLORS.positive)}/><span style={S.legendText}>Positive</span>
            <span style={S.dot(COLORS.negative)}/><span style={S.legendText}>Deduction</span>
            <span style={{ display:"inline-block", width:16, height:3, background:COLORS.amber, marginRight:4, verticalAlign:"middle", borderRadius:2 }}/>
            <span style={S.legendText}>Running Total</span>
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={waterfallData} margin={{ bottom:8, top:22, left:8, right:8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9"/>
              <XAxis dataKey="name" interval={0} height={48} tick={<WrappedTick maxChars={8} fontSize={9}/>}/>
              <YAxis tick={{ fontSize:10 }} tickFormatter={fmt}/>
              <Tooltip formatter={(v, name, props) => {
                if (name === "Running Total") return [fmtFull(v), "Running Total"];
                return [fmtFull(props.payload.value ?? v), props.payload.name];
              }}/>
              <ReferenceLine y={0} stroke="#CBD5E1"/>
              <Bar dataKey="bar" name="Amount" radius={[4,4,0,0]}>
                <LabelList dataKey="bar" position="top" formatter={fmt} style={{ fontSize:9, fontWeight:600, fill:COLORS.navy }}/>
                {waterfallData.map((e, i) => <Cell key={i} fill={e.fill}/>)}
              </Bar>
              <Line type="monotone" dataKey="cumulative" name="Running Total"
                stroke={COLORS.amber} strokeWidth={2.5} strokeDasharray="5 3"
                dot={{ r:5, fill:COLORS.amber, strokeWidth:0 }} activeDot={{ r:7 }}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div style={S.chartCard}>
          <p style={S.chartTitle}>Expenses Distribution</p>
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie data={expensesBreakdown ?? []} cx="50%" cy="50%" outerRadius={120}
                dataKey="value" nameKey="name" labelLine={false} label={renderPieLabel}>
                {(expensesBreakdown ?? []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v) => fmtFull(v)}/>
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize:11 }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 3: Revenue vs Cash Flow + Monthly EBIT Trend ── */}
      <div style={S.row2}>
        <div style={S.chartCard}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <div>
              <p style={{ ...S.chartTitle, margin:0 }}>Revenue vs Operating Cash Flow</p>
              <p style={S.chartSub}>Detect cash conversion problems</p>
            </div>
            <select value={cashFlowType} onChange={e => setCashFlowType(e.target.value)} style={S.slicerSelect}>
              <option value="All">All months</option>
              <option value="positive">CF Positive only</option>
              <option value="negative">CF Negative only</option>
            </select>
          </div>
          <div style={S.legendRow}>
            <span style={S.dot(COLORS.blue)}/><span style={S.legendText}>Revenue</span>
            <span style={S.dot(COLORS.teal)}/><span style={S.legendText}>Operating Cash Flow (EBIT proxy)</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={cashFlowType === "All" ? revVsCFData :
                revVsCFData.filter(d => cashFlowType === "positive" ? d.operatingCF >= 0 : d.operatingCF < 0)}
              margin={{ top:22, right:16, left:8, bottom:8 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9"/>
              <XAxis dataKey="month" tick={{ fontSize:10 }}/>
              <YAxis tick={{ fontSize:10 }} tickFormatter={fmt} width={52}/>
              <Tooltip formatter={(v, name) => [fmtFull(v), name]}
                contentStyle={{ borderRadius:8, border:"none", boxShadow:"0 4px 16px rgba(0,0,0,0.1)", fontSize:12 }}/>
              <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="4 2"/>
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize:11 }}/>
              <Line type="monotone" dataKey="revenue"     name="Revenue"       stroke={COLORS.blue} strokeWidth={2.5} dot={{ r:4 }} activeDot={{ r:6 }}/>
              <Line type="monotone" dataKey="operatingCF" name="Operating CF"  stroke={COLORS.teal} strokeWidth={2.5} strokeDasharray="6 3" dot={{ r:4 }} activeDot={{ r:6 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={S.chartCard}>
          <p style={S.chartTitle}>
            Monthly EBIT &amp; Expense Trend
            {period !== "P12" && <span style={{ fontSize:11, fontWeight:400, color:COLORS.grey, marginLeft:8 }}>(P1 – {period})</span>}
          </p>
          <div style={S.legendRow}>
            <span style={S.dot(COLORS.blue)}/><span style={S.legendText}>Revenue (bars)</span>
            <span style={S.dot(COLORS.red)}/><span style={S.legendText}>EBIT</span>
            <span style={S.dot(COLORS.grey)}/><span style={S.legendText}>Expenses</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={monthlyTrend} margin={{ bottom:8, left:8, right:16, top:22 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9"/>
              <XAxis dataKey="month" interval={0} height={36} tick={<WrappedTick maxChars={12} fontSize={9}/>}/>
              <YAxis tick={{ fontSize:11 }} tickFormatter={fmt}/>
              <Tooltip formatter={(v, name) => [fmtFull(v), name]}/>
              <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="4 2"/>
              <Bar dataKey="revenue" name="Revenue" fill={COLORS.blueLight} radius={[3,3,0,0]} opacity={0.4}>
                <LabelList dataKey="revenue" position="top" formatter={fmt} style={{ fontSize:8, fill:COLORS.blue, fontWeight:600 }}/>
              </Bar>
              <Line type="monotone" dataKey="ebit"     name="EBIT"     stroke={COLORS.red}  strokeWidth={2} dot={{ r:3 }}/>
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke={COLORS.grey} strokeWidth={2} strokeDasharray="4 3" dot={{ r:3 }}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 4: Revenue vs Budget + Expense vs Net Profit ── */}
      <div style={S.row2}>
        <div style={S.chartCard}>
          <p style={S.chartTitle}>Revenue Forecast</p>
          <div style={S.legendRow}>
            <span style={S.dot(COLORS.blue)}/><span style={S.legendText}>Actual</span>
            <span style={S.dot(COLORS.amberLight)}/><span style={S.legendText}>Budget</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrend} margin={{ bottom:8, left:8, right:8, top:22 }}>
              <XAxis dataKey="month" interval={0} height={36} tick={<WrappedTick maxChars={12} fontSize={9}/>}/>
              <YAxis tick={{ fontSize:10 }} tickFormatter={fmt}/>
              <Tooltip formatter={(v) => fmtFull(v)}/>
              <Bar dataKey="revenue" name="Actual" fill={COLORS.blue}       radius={[4,4,0,0]}>
                <LabelList dataKey="revenue" position="top" formatter={fmt} style={lbTop}/>
              </Bar>
              <Bar dataKey="budget"  name="Budget" fill={COLORS.amberLight} radius={[4,4,0,0]}>
                <LabelList dataKey="budget"  position="top" formatter={fmt} style={{ fontSize:8, fill:COLORS.amber, fontWeight:600 }}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={S.chartCard}>
          <p style={S.chartTitle}>Expense vs Net Profit by Month</p>
          <p style={S.chartSub}>Expenses compared to retained profit per month</p>
          <div style={S.legendRow}>
            <span style={S.dot(COLORS.blueLight)}/><span style={S.legendText}>Expenses</span>
            <span style={S.dot(COLORS.green)}/><span style={S.legendText}>Net Profit (Retained)</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={monthlyTrend.map(m => ({ ...m, retainedDisplay: m.retained ?? 0 }))}
              margin={{ bottom:8, left:8, right:8, top:22 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9"/>
              <XAxis dataKey="month" interval={0} height={36} tick={<WrappedTick maxChars={12} fontSize={9}/>}/>
              <YAxis tick={{ fontSize:10 }} tickFormatter={fmt}/>
              <Tooltip formatter={(v, name) => [fmtFull(v), name]}/>
              <ReferenceLine y={0} stroke="#CBD5E1"/>
              <Bar dataKey="expenses"        name="Expenses"   fill={COLORS.blueLight} radius={[4,4,0,0]}/>
              <Bar dataKey="retainedDisplay" name="Net Profit" fill={COLORS.green}     radius={[4,4,0,0]}>
                <LabelList dataKey="retainedDisplay" position="top" formatter={fmt} style={{ fontSize:8, fill:COLORS.green, fontWeight:600 }}/>
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    

    </div>
  

    
  );
}

const S = {
  page:          { minHeight:"100vh", background:"linear-gradient(160deg,#DCE8F5 0%,#ECF3FA 40%,#F5F9FD 100%)", fontFamily:"Arial,sans-serif", padding:"0 0 40px" },
  topBar:        { background:"rgba(255,255,255,0.90)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", padding:"14px 28px", borderBottom:"1px solid #D0DFF0", position:"sticky", top:0, zIndex:10, boxShadow:"0 2px 12px rgba(0,31,91,0.07)" },
  backBtn:       { background:"none", border:"none", fontSize:22, cursor:"pointer", color:COLORS.navy, marginRight:16, padding:"4px 8px", borderRadius:8 },
  pageTitle:     { flex:1, textAlign:"center", color:COLORS.navy, fontSize:22, fontWeight:800, margin:0 },
  logo:          { height:32, marginLeft:12 },
  exportBtn:     { padding:"6px 14px", borderRadius:8, border:`1px solid ${COLORS.navy}`, background:"white", cursor:"pointer", fontSize:12, fontWeight:700, color:COLORS.navy, fontFamily:"Arial,sans-serif" },
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
  kpiRow:        { display:"flex", gap:12, padding:"12px 28px 16px", overflowX:"auto" },
  kpiCard:       { background:"white", borderRadius:16, padding:"14px 18px", boxShadow:"0 2px 12px rgba(0,31,91,0.08)", flex:1, minWidth:140 },
  kpiTitle:      { color:COLORS.navy, fontSize:12, fontWeight:800, margin:0, lineHeight:1.3 },
  kpiRowLabel:   { color:COLORS.grey, fontSize:10, margin:"4px 0 2px", textTransform:"uppercase", letterSpacing:"0.05em" },
  kpiValue:      { fontSize:16, fontWeight:800, margin:"0 0 4px" },
  kpiValueSm:    { fontSize:13, fontWeight:600, margin:0 },
  row2:          { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, padding:"0 28px 16px" },
  chartCard:     { background:"white", borderRadius:16, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,31,91,0.08)" },
  chartTitle:    { color:COLORS.navy, fontSize:14, fontWeight:700, margin:"0 0 4px" },
  chartSub:      { color:COLORS.grey, fontSize:11, margin:"0 0 10px" },
  legendRow:     { display:"flex", alignItems:"center", gap:8, marginBottom:12, fontSize:11, flexWrap:"wrap" },
  dot:           (c) => ({ width:10, height:10, borderRadius:"50%", background:c, display:"inline-block", flexShrink:0 }),
  legendText:    { color:"#374151", marginRight:8 },
  loadingBox:    { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh" },
  spinner:       { width:40, height:40, border:"4px solid #E5E7EB", borderTop:`4px solid ${COLORS.navy}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  slicerSelect:  { padding:"4px 10px", borderRadius:8, border:"1px solid #CBD5E1", fontSize:11, color:COLORS.navy, background:"white", cursor:"pointer", fontFamily:"Arial,sans-serif", outline:"none" },
  aiPanel: {
    margin: "0 28px 16px",
    backgroundColor: "white",
    borderRadius: 16,
    padding: "20px 24px",
    boxShadow: "0 2px 12px rgba(0,31,91,0.08)",
    borderLeft: `4px solid ${COLORS.navy}`,
},
aiPanelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
},
aiPanelTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.navy,
},
aiBtn: {
    padding: "8px 18px",
    backgroundColor: COLORS.navy,
    color: "white",
    border: "none",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "Arial, sans-serif",
},
aiText: {
    margin: 0,
    fontSize: 14,
    color: "#374151",
    lineHeight: 1.7,
},
aiPlaceholder: {
    margin: 0,
    fontSize: 13,
    color: COLORS.grey,
    fontStyle: "italic",
},
aiError: {
    margin: 0,
    fontSize: 13,
    color: COLORS.red,
},
aiSpinner: {
    width: 18,
    height: 18,
    border: "3px solid #E5E7EB",
    borderTop: `3px solid ${COLORS.navy}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
},
};