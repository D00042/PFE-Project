import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import dashboardService from "../services/dashboardService.js";
import DSODPOAIPanel from "../components/DSODPOAIPanel.jsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

const API_URL = "http://127.0.0.1:8000";

const C = {
  navy:    "#092A5E",
  blue:    "#1A6FBF",
  purple:  "#4C1D7A",
  purpleL: "#9B7EC8",
  purple2: "#DDD6FE",
  red:     "#D40E14",
  green:   "#16A34A",
  amber:   "#D97706",
  grey:    "#9CA3AF",
};

const AGING_COLORS = [
  "#16A34A", "#1A6FBF", "#D97706",
  "#7C3AED", "#D40E14", "#6B7280",
];

const EXPENSE_CAT_COLORS = [
  "#1A6FBF", "#0D9488", "#D97706", "#7C3AED",
  "#D40E14", "#16A34A", "#4C1D7A", "#0891B2",
  "#B45309", "#6B7280",
];

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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(9,42,94,0.12)", fontSize: 12 }}>
      <p style={{ margin: "0 0 6px", fontWeight: 700, color: C.navy }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: "2px 0", color: p.color }}>
          {p.name}: <strong>{typeof p.value === "number" && p.value > 100 ? fmtFull(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const GaugeChart = ({ value, max, color, label }) => {
  const pct      = Math.min(value / max, 1);
  const angle    = pct * 180;
  const r        = 70;
  const cx       = 90;
  const cy       = 90;
  const toRad    = (deg) => (deg * Math.PI) / 180;
  const startX   = cx - r;
  const startY   = cy;
  const endAngle = 180 - angle;
  const endX     = cx + r * Math.cos(toRad(endAngle));
  const endY     = cy - r * Math.sin(toRad(endAngle));
  const largeArc = angle > 90 ? 1 : 0;

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: C.navy, fontWeight: 700, fontSize: 13, margin: "0 0 4px" }}>{label}</p>
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path d={`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#E5E7EB" strokeWidth="16" strokeLinecap="round" />
        {value > 0 && (
          <path d={`M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`}
            fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" />
        )}
        <text x="18"      y="98" fontSize="10" fill={C.grey}>0</text>
        <text x={cx - 10} y="20" fontSize="10" fill={C.grey}>{Math.round(max / 2)}</text>
        <text x="148"     y="98" fontSize="10" fill={C.grey}>{max}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="28" fontWeight="800" fill={color}>{value}</text>
      </svg>
    </div>
  );
};

if (!document.getElementById("dso-print-style")) {
  const s = document.createElement("style");
  s.id = "dso-print-style";
  s.textContent = `@media print { body *{visibility:hidden} #dso-print,#dso-print *{visibility:visible} #dso-print{position:absolute;left:0;top:0;width:100%} button{display:none!important} .no-print{display:none!important} }`;
  document.head.appendChild(s);
}

const exportPDF = () => window.print();

export default function DSODPODashboard() {
  const navigate    = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [year,      setYear]      = useState(currentYear);
  const [period,    setPeriod]    = useState("P12");
  const [category,  setCategory]  = useState("all"); // "all" | "customer" | "supplier"
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => { fetchData(); }, [year, period]);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(
        `${API_URL}/dashboard/dso-dpo?year=${year}&period=${period}`,
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
        <p style={{ color: C.navy, marginTop: 16, fontWeight: 600 }}>Loading DSO & DPO Dashboard...</p>
      </div>
    </div>
  );
  if (error) return (
    <div style={S.page}>
      <p style={{ color: C.red, textAlign: "center", marginTop: 100 }}>{error}</p>
    </div>
  );
  if (!data) return null;

  const {
    kpis,
    counts,
    customerAging, supplierAging,
    supplierAgingByYear,
    supplierAgingDetail,
    topCustomers, topSuppliers,
    customerDelayDist, supplierDelayDist,
    supplierExpenseCategories,
    years,
  } = data;

  const yr      = years?.current ?? year;
  const prevYr  = years?.prev    ?? year - 1;
  const prev2Yr = years?.prev2   ?? year - 2;

  const dso = kpis.dso?.current ?? 0;
  const dpo = kpis.dpo?.current ?? 0;

  // Filter based on category
  const showCustomer = category === "all" || category === "customer";
  const showSupplier = category === "all" || category === "supplier";

  const customerPieData = (customerAging || [])
    .filter(d => d.amount > 0)
    .map((d, i) => ({ name: d.bucket, value: d.amount, fill: AGING_COLORS[i % AGING_COLORS.length] }));

  const supplierPieData = (supplierAging || [])
    .filter(d => d.amount > 0)
    .map((d, i) => ({ name: d.bucket, value: d.amount, fill: AGING_COLORS[i % AGING_COLORS.length] }));

  return (
    <div style={S.page} id="dso-print">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => navigate("/home")}>←</button>
        <h1 style={S.pageTitle}>DSO & DPO</h1>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button style={S.exportBtn} onClick={exportPDF}>↓ PDF</button>
          <img src="/Tui_logo.png" alt="TUI" style={S.logo} onError={e => e.target.style.display = "none"} />
        </div>
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
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

        {/* ── Category filter ── */}
        <div style={S.categoryWrap}>
          <span style={S.periodLabel}>Category:</span>
          <div style={S.categoryTabs}>
            {[
              { value: "all",      label: "All" },
              { value: "customer", label: "Customers" },
              { value: "supplier", label: "Suppliers" },
            ].map(({ value, label }) => (
              <button key={value}
                style={category === value ? S.categoryTabActive : S.categoryTab}
                onClick={() => setCategory(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <span style={S.currencyLabel}>Actual Values in EUR</span>
      </div>

      {/* ── Count Cards ──────────────────────────────────────────────────── */}
      <div style={S.countRow}>
        <div style={{ ...S.countCard, borderTop: `4px solid ${C.navy}` }}>
          <p style={S.countLabel}>Total Clients</p>
          <p style={{ ...S.countValue, color: C.navy }}>{counts?.totalClients ?? 0}</p>
          <p style={S.countSub}>Customers + Suppliers</p>
        </div>
        <div style={{ ...S.countCard, borderTop: `4px solid ${C.blue}`, opacity: category === "supplier" ? 0.4 : 1 }}>
          <p style={S.countLabel}>Total Customers</p>
          <p style={{ ...S.countValue, color: C.blue }}>{counts?.totalCustomers ?? 0}</p>
          <p style={S.countSub}>Accounts receivable</p>
        </div>
        <div style={{ ...S.countCard, borderTop: `4px solid ${C.purple}`, opacity: category === "customer" ? 0.4 : 1 }}>
          <p style={S.countLabel}>Total Suppliers</p>
          <p style={{ ...S.countValue, color: C.purple }}>{counts?.totalSuppliers ?? 0}</p>
          <p style={S.countSub}>Accounts payable</p>
        </div>
      </div>

      {/* ── AI Panel ── */}
      <DSODPOAIPanel year={year} period={period} />

      {/* ── DSO / DPO Section ────────────────────────────────────────────── */}
      <div style={S.dsoSection}>

        {/* DSO side */}
        {showCustomer && (
          <div style={S.dsoBlock}>
            <div style={S.dsoHeader}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.navy}
                   strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v2M12 16v2M8.5 9a3.5 3.5 0 0 1 7 0c0 2-3.5 3-3.5 3s-3.5 1-3.5 3a3.5 3.5 0 0 0 7 0"/>
              </svg>
              <h2 style={S.dsoTitle}>Days Sales' Outstanding</h2>
            </div>
            <div style={S.dsoRow}>
              <div style={S.miniCard}>
                <p style={S.miniTitle}>Customer Aging Overdue</p>
                {(customerAging || []).filter(d => d.amount > 0).length === 0 ? (
                  <p style={{ color: C.grey, fontSize: 12, padding: "20px 0" }}>No data</p>
                ) : (
                  <ResponsiveContainer width={240} height={180}>
                    <BarChart data={(customerAging || []).filter(d => d.amount > 0)} margin={{ top: 20, bottom: 8 }}>
                      <XAxis dataKey="bucket" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={fmt} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" name="Amount" radius={[3,3,0,0]}
                        label={{ position: "top", fontSize: 8, formatter: fmt }}>
                        {(customerAging || []).filter(d => d.amount > 0).map((_, i) => (
                          <Cell key={i} fill={i === 0 ? C.purple : C.purpleL} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div style={S.miniCard}>
                <GaugeChart value={Math.round(dso)} max={Math.max(Math.round(dso) * 2, 88)} color={C.navy} label="DSO" />
                <p style={{ textAlign: "center", fontSize: 11, color: C.grey, margin: "4px 0 0" }}>
                  Prev: {kpis.dso?.previous ?? 0} days
                </p>
              </div>
            </div>
          </div>
        )}

        {showCustomer && showSupplier && <div style={S.dsoDivider} />}

        {/* DPO side */}
        {showSupplier && (
          <div style={S.dsoBlock}>
            <div style={S.dsoHeader}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.navy}
                   strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v2M12 16v2M8.5 9a3.5 3.5 0 0 1 7 0c0 2-3.5 3-3.5 3s-3.5 1-3.5 3a3.5 3.5 0 0 0 7 0"/>
              </svg>
              <h2 style={S.dsoTitle}>Days Payables' Outstanding</h2>
            </div>
            <div style={S.dsoRow}>
              <div style={S.miniCard}>
                <p style={S.miniTitle}>Supplier Aging Overdue</p>
                {(!supplierAgingByYear || supplierAgingByYear.length === 0) ? (
                  <p style={{ color: C.grey, fontSize: 12, padding: "20px 0" }}>No data</p>
                ) : (
                  <ResponsiveContainer width={260} height={180}>
                    <BarChart data={supplierAgingByYear} margin={{ top: 20, bottom: 8 }}>
                      <XAxis dataKey="bucket" tick={{ fontSize: 8 }} />
                      <YAxis tick={{ fontSize: 8 }} tickFormatter={fmt} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                      <Bar dataKey={String(yr)}      name={String(yr)}      fill={C.purple}  radius={[2,2,0,0]} label={{ position: "top", fontSize: 7, formatter: fmt }} />
                      <Bar dataKey={String(prevYr)}  name={String(prevYr)}  fill={C.purpleL} radius={[2,2,0,0]} />
                      <Bar dataKey={String(prev2Yr)} name={String(prev2Yr)} fill={C.purple2} radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div style={S.miniCard}>
                <GaugeChart value={Math.round(dpo)} max={Math.max(Math.round(dpo) * 2, 1000)} color={C.red} label="DPO" />
                <p style={{ textAlign: "center", fontSize: 11, color: C.grey, margin: "4px 0 0" }}>
                  Prev: {kpis.dpo?.previous ?? 0} days
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Row 1: Top Unpaid ─────────────────────────────────────────────── */}
      <div style={S.row2}>
        {showCustomer && (
          <div style={S.chartCard}>
            <p style={S.chartTitle}>Top Unpaid Customers</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topCustomers} margin={{ bottom: 48, top: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" name="Amount" fill={C.navy} radius={[3,3,0,0]}
                  label={{ position: "top", fontSize: 8, formatter: fmt }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {showSupplier && (
          <div style={S.chartCard}>
            <p style={S.chartTitle}>Top 5 Unpaid Suppliers</p>
            {/* Two-column layout: bar (+ optional aging pie) | expense category pie */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* Left: bar chart + optional aging pie */}
              <div>
                <p style={{ fontSize: 11, color: C.grey, margin: "0 0 8px" }}>
                  Click a bar to see aging breakdown
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topSuppliers} margin={{ bottom: 48, top: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="amount"
                      name="Amount"
                      radius={[3,3,0,0]}
                      label={{ position: "top", fontSize: 8, formatter: fmt }}
                      onClick={(data) => {
                        const name = data?.name;
                        if (!name) return;
                        setSelectedSupplier(prev => prev === name ? null : name);
                      }}
                      cursor="pointer"
                    >
                      {(topSuppliers || []).map((entry, i) => (
                        <Cell
                          key={i}
                          fill={selectedSupplier === entry.name ? C.red : C.blue}
                          opacity={selectedSupplier && selectedSupplier !== entry.name ? 0.4 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Aging Pie — shown when a supplier is selected */}
                {selectedSupplier && (() => {
                  const detail = data?.supplierAgingDetail?.[selectedSupplier] || [];
                  const pieData = detail.map((d, i) => ({
                    name: d.bucket,
                    value: d.amount,
                    fill: AGING_COLORS[i % AGING_COLORS.length],
                  }));
                  return (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: 0 }}>
                          {selectedSupplier}
                        </p>
                        <button
                          onClick={() => setSelectedSupplier(null)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: C.grey, fontSize: 16 }}>
                          ✕
                        </button>
                      </div>
                      <p style={{ fontSize: 11, color: C.grey, margin: "0 0 4px" }}>Aging breakdown</p>
                      {pieData.length === 0 ? (
                        <p style={{ color: C.grey, textAlign: "center", padding: "20px 0", fontSize: 12 }}>No aging data</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%" cy="50%"
                              outerRadius={65}
                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                              fontSize={10}>
                              {pieData.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v) => fmtFull(v)} />
                            <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Right: Expense Category Breakdown */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: "0 0 2px" }}>Expense Category Breakdown</p>
                <p style={S.chartSub}>Distribution of supplier payables by expense category</p>
                {(!supplierExpenseCategories || supplierExpenseCategories.length === 0) ? (
                  <p style={{ color: C.grey, textAlign: "center", padding: "40px 0", fontSize: 13 }}>
                    No expense category data
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={supplierExpenseCategories}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%" cy="50%"
                        outerRadius={85}
                        label={({ percent }) => percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ""}
                        labelLine={false}
                        fontSize={11}
                      >
                        {supplierExpenseCategories.map((_, i) => (
                          <Cell key={i} fill={EXPENSE_CAT_COLORS[i % EXPENSE_CAT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => fmtFull(v)} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} formatter={(value) => value} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Row 2: Delay Distribution ─────────────────────────────────────── */}
      <div style={S.row2}>
        {showCustomer && (
          <div style={S.chartCard}>
            <p style={S.chartTitle}>Customer Payment Delay Distribution</p>
            <p style={S.chartSub}>Number of customers per delay range</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={customerDelayDist} margin={{ top: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Customers" radius={[3,3,0,0]}
                  label={{ position: "top", fontSize: 10 }}>
                  {(customerDelayDist || []).map((_, i) => (
                    <Cell key={i} fill={AGING_COLORS[i % AGING_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {showSupplier && (
          <div style={S.chartCard}>
            <p style={S.chartTitle}>Supplier Payment Delay Distribution</p>
            <p style={S.chartSub}>Number of suppliers per delay range</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={supplierDelayDist} margin={{ top: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Suppliers" radius={[3,3,0,0]}
                  label={{ position: "top", fontSize: 10 }}>
                  {(supplierDelayDist || []).map((_, i) => (
                    <Cell key={i} fill={AGING_COLORS[i % AGING_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Row 3: Aging Pie ──────────────────────────────────────────────── */}
      <div style={{ ...S.row2, marginBottom: 32 }}>
        {showCustomer && (
          <div style={S.chartCard}>
            <p style={S.chartTitle}>Customer Aging Distribution</p>
            <p style={S.chartSub}>Monitor customer payment delays across aging buckets</p>
            {customerPieData.length === 0 ? (
              <p style={{ color: C.grey, textAlign: "center", padding: "40px 0" }}>No overdue customers</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={customerPieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={90}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false} fontSize={10}>
                    {customerPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtFull(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
        {showSupplier && (
          <div style={S.chartCard}>
            <p style={S.chartTitle}>Supplier Aging Distribution</p>
            <p style={S.chartSub}>Monitor supplier payment delays across aging buckets</p>
            {supplierPieData.length === 0 ? (
              <p style={{ color: C.grey, textAlign: "center", padding: "40px 0" }}>No overdue suppliers</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={supplierPieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={90}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false} fontSize={10}>
                    {supplierPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtFull(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>


    </div>
  );
}

const S = {
  page:        { minHeight: "100vh", background: "linear-gradient(160deg, #D6E8F7 0%, #EAF3FB 40%, #F5F9FD 100%)", fontFamily: "Arial, sans-serif", padding: "0 0 40px" },
  topBar:      { background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", padding: "14px 28px", borderBottom: "1px solid #D6E8F7", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 12px rgba(9,42,94,0.07)" },
  backBtn:     { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.navy, marginRight: 16, padding: "4px 8px", borderRadius: 8 },
  pageTitle:   { flex: 1, textAlign: "center", color: C.navy, fontSize: 22, fontWeight: 800, margin: 0 },
  logo:        { height: 32 },
  exportBtn:   { padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.navy}`, background: C.navy, color: "white", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "Arial,sans-serif" },
  controlBar:  { display: "flex", alignItems: "center", flexWrap: "wrap", padding: "10px 28px", gap: 12, background: "white", borderBottom: "1px solid #E5E7EB" },
  yearTabs:    { display: "flex", gap: 4 },
  yearTab:         { padding: "6px 18px", borderRadius: 6, border: "1px solid #CBD5E1", background: "white", cursor: "pointer", fontSize: 13, fontFamily: "Arial, sans-serif", color: "#374151" },
  yearTabActive:   { padding: "6px 18px", borderRadius: 6, border: "none", background: C.navy, cursor: "pointer", fontSize: 13, fontFamily: "Arial, sans-serif", color: "white", fontWeight: 700 },
  periodWrap:      { display: "flex", alignItems: "center", gap: 8 },
  periodLabel:     { fontSize: 12, fontWeight: 700, color: C.navy, whiteSpace: "nowrap" },
  periodTabs:      { display: "flex", gap: 2, flexWrap: "wrap" },
  periodTab:         { padding: "4px 8px", borderRadius: 5, border: "1px solid #CBD5E1", background: "white", cursor: "pointer", fontSize: 11, fontFamily: "Arial, sans-serif", color: "#374151" },
  periodTabActive:   { padding: "4px 8px", borderRadius: 5, border: "none", background: C.red, cursor: "pointer", fontSize: 11, fontFamily: "Arial, sans-serif", color: "white", fontWeight: 700 },
  categoryWrap:    { display: "flex", alignItems: "center", gap: 8 },
  categoryTabs:    { display: "flex", gap: 4 },
  categoryTab:       { padding: "4px 14px", borderRadius: 20, border: "1px solid #CBD5E1", background: "white", cursor: "pointer", fontSize: 12, fontFamily: "Arial, sans-serif", color: "#374151" },
  categoryTabActive: { padding: "4px 14px", borderRadius: 20, border: "none", background: C.navy, cursor: "pointer", fontSize: 12, fontFamily: "Arial, sans-serif", color: "white", fontWeight: 700 },
  currencyLabel:     { marginLeft: "auto", color: C.navy, fontSize: 13, fontWeight: 700 },

  // Count cards
  countRow:  { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, padding: "20px 28px 8px" },
  countCard: { background: "white", borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 12px rgba(9,42,94,0.08)", transition: "opacity 0.3s" },
  countLabel:  { color: C.grey, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" },
  countValue:  { fontSize: 36, fontWeight: 800, margin: "0 0 4px" },
  countSub:    { color: C.grey, fontSize: 12, margin: 0 },

  dsoSection:  { display: "grid", gridTemplateColumns: "1fr auto 1fr", padding: "16px 28px", background: "white", margin: "8px 28px", borderRadius: 16, boxShadow: "0 2px 12px rgba(9,42,94,0.08)" },
  dsoBlock:    { padding: "0 16px" },
  dsoDivider:  { width: 1, background: "#E5E7EB", margin: "0 8px" },
  dsoHeader:   { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 },
  dsoTitle:    { color: C.navy, fontSize: 16, fontWeight: 800, margin: 0 },
  dsoRow:      { display: "flex", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", gap: 16 },
  miniCard:    { background: "#F8FAFC", borderRadius: 12, padding: "12px 16px", textAlign: "center" },
  miniTitle:   { color: C.navy, fontSize: 12, fontWeight: 700, margin: "0 0 8px" },
  row2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "0 28px 16px" },
  chartCard:   { background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 12px rgba(9,42,94,0.08)" },
  chartTitle:  { color: C.navy, fontSize: 14, fontWeight: 700, margin: "0 0 2px" },
  chartSub:    { color: C.grey, fontSize: 11, margin: "0 0 10px" },
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