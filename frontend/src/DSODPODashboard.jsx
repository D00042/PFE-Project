import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  red:     "#D40E14",
  green:   "#16A34A",
  amber:   "#D97706",
  grey:    "#9CA3AF",
  teal:    "#0D9488",
};

const AGING_COLORS = [
  "#16A34A", "#1A6FBF", "#D97706",
  "#7C3AED", "#D40E14", "#6B7280",
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
        <text x="18"     y="98" fontSize="10" fill={C.grey}>0</text>
        <text x={cx - 10} y="20" fontSize="10" fill={C.grey}>{Math.round(max / 2)}</text>
        <text x="148"    y="98" fontSize="10" fill={C.grey}>{max}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="28" fontWeight="800" fill={color}>{value}</text>
      </svg>
    </div>
  );
};

export default function DSODPODashboard() {
  const navigate    = useNavigate();
  const currentYear = new Date().getFullYear();

  const [year,    setYear]    = useState(currentYear);
  const [period,  setPeriod]  = useState("P12");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

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

  const { kpis, customerAging, supplierAging, topCustomers, topSuppliers, customerDelayDist, supplierDelayDist } = data;
  const filteredCustomerAging = customerAging.filter(d => d.amount > 0);
const filteredSupplierAging = supplierAging.filter(d => d.amount > 0);

  const dso = kpis.dso?.current ?? 0;
  const dpo = kpis.dpo?.current ?? 0;

  const customerPieData = customerAging
    .filter(d => d.amount > 0)
    .map((d, i) => ({ name: d.bucket, value: d.amount, fill: AGING_COLORS[i % AGING_COLORS.length] }));

  const supplierPieData = supplierAging
    .filter(d => d.amount > 0)
    .map((d, i) => ({ name: d.bucket, value: d.amount, fill: AGING_COLORS[i % AGING_COLORS.length] }));

  return (
    <div style={S.page}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => navigate("/home")}>←</button>
        <h1 style={S.pageTitle}>DSO & DPO</h1>
        <img src="/Tui_logo.png" alt="TUI" style={S.logo} onError={e => e.target.style.display = "none"} />
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div style={S.controlBar}>
        <div style={S.yearTabs}>
          {[year - 1, year].map(y => (
            <button key={y} style={year === y ? S.yearTabActive : S.yearTab} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
        <div style={S.periodWrap}>
          <span style={S.periodLabel}>Period:</span>
          <div style={S.periodTabs}>
            {FISCAL_PERIODS.map(({ period: p, month }) => (
              <button key={p}
                style={period === p ? S.periodTabActive : S.periodTab}
                onClick={() => setPeriod(p)}
                title={month}>{p}
              </button>
            ))}
          </div>
        </div>
        <span style={S.currencyLabel}>Actual Values in EUR</span>
      </div>

      {/* ── DSO / DPO Header with gauges ──────────────────────────────────── */}
      <div style={S.dsoSection}>

        {/* DSO side */}
        <div style={S.dsoBlock}>
          <div style={S.dsoHeader}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.navy}
                 strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v2M12 16v2M8.5 9a3.5 3.5 0 0 1 7 0c0 2-3.5 3-3.5 3s-3.5 1-3.5 3a3.5 3.5 0 0 0 7 0"/>
            </svg>
            <h2 style={S.dsoTitle}>Days Sales' Outstanding</h2>
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={S.miniCard}>
              <p style={S.miniTitle}>Customer Aging Overdue</p>
              <ResponsiveContainer width={220} height={160}>
                <BarChart data={filteredCustomerAging} margin={{ top: 16 }}>
                  <XAxis dataKey="bucket" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={fmt} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" name="Amount" radius={[3, 3, 0, 0]}
                    label={{ position: "top", fontSize: 8, formatter: fmt }}>
                    {filteredCustomerAging.map((_, i) => (
  <Cell key={i} fill={i === 0 ? C.purple : C.purpleL} />
))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={S.miniCard}>
              <GaugeChart value={Math.round(dso)} max={Math.max(Math.round(dso) * 2, 88)} color={C.navy} label="DSO" />
              <p style={{ textAlign: "center", fontSize: 11, color: C.grey, margin: "4px 0 0" }}>
                Prev: {kpis.dso?.previous ?? 0} days
              </p>
            </div>
          </div>
        </div>

        <div style={S.dsoDivider} />

        {/* DPO side */}
        <div style={S.dsoBlock}>
          <div style={S.dsoHeader}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.navy}
                 strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v2M12 16v2M8.5 9a3.5 3.5 0 0 1 7 0c0 2-3.5 3-3.5 3s-3.5 1-3.5 3a3.5 3.5 0 0 0 7 0"/>
            </svg>
            <h2 style={S.dsoTitle}>Days Payables' Outstanding</h2>
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={S.miniCard}>
              <p style={S.miniTitle}>Supplier Aging Overdue</p>
              <ResponsiveContainer width={220} height={160}>
                <BarChart data={supplierAging.filter(d => d.amount > 0)} margin={{ top: 16 }}>
                  <XAxis dataKey="bucket" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={fmt} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" name="Amount" radius={[3, 3, 0, 0]}
                    label={{ position: "top", fontSize: 8, formatter: fmt }}>
                    {supplierAging.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? C.purple : C.purpleL} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={S.miniCard}>
              <GaugeChart value={Math.round(dpo)} max={Math.max(Math.round(dpo) * 2, 1000)} color={C.red} label="DPO" />
              <p style={{ textAlign: "center", fontSize: 11, color: C.grey, margin: "4px 0 0" }}>
                Prev: {kpis.dpo?.previous ?? 0} days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 1: Top Unpaid Customer + Top Unpaid Supplier ─────────────── */}
      <div style={S.row2}>
        <div style={S.chartCard}>
          <p style={S.chartTitle}>Top Unpaid Customers</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topCustomers} margin={{ bottom: 48, top: 16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" name="Amount" fill={C.navy} radius={[3, 3, 0, 0]}
                label={{ position: "top", fontSize: 8, formatter: fmt }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={S.chartCard}>
          <p style={S.chartTitle}>Top 5 Unpaid Suppliers</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topSuppliers} margin={{ bottom: 48, top: 16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" name="Amount" fill={C.blue} radius={[3, 3, 0, 0]}
                label={{ position: "top", fontSize: 8, formatter: fmt }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 2: Payment Delay Distribution ────────────────────────────── */}
      <div style={S.row2}>
        <div style={S.chartCard}>
          <p style={S.chartTitle}>Customer Payment Delay Distribution</p>
          <p style={S.chartSub}>Number of customers per delay range</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={customerDelayDist} margin={{ top: 16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Customers" radius={[3, 3, 0, 0]}
                label={{ position: "top", fontSize: 10 }}>
                {customerDelayDist.map((_, i) => (
                  <Cell key={i} fill={AGING_COLORS[i % AGING_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={S.chartCard}>
          <p style={S.chartTitle}>Supplier Payment Delay Distribution</p>
          <p style={S.chartSub}>Number of suppliers per delay range</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={supplierDelayDist} margin={{ top: 16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Suppliers" radius={[3, 3, 0, 0]}
                label={{ position: "top", fontSize: 10 }}>
                {supplierDelayDist.map((_, i) => (
                  <Cell key={i} fill={AGING_COLORS[i % AGING_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 3: Aging Pie Charts ───────────────────────────────────────── */}
      <div style={{ ...S.row2, marginBottom: 32 }}>
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
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}>
                  {customerPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtFull(v)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

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
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}>
                  {supplierPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtFull(v)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
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
  controlBar:  { display: "flex", alignItems: "center", flexWrap: "wrap", padding: "10px 28px", gap: 12, background: "white", borderBottom: "1px solid #E5E7EB" },
  yearTabs:    { display: "flex", gap: 4 },
  yearTab:         { padding: "6px 18px", borderRadius: 6, border: "1px solid #CBD5E1", background: "white", cursor: "pointer", fontSize: 13, fontFamily: "Arial, sans-serif", color: "#374151" },
  yearTabActive:   { padding: "6px 18px", borderRadius: 6, border: "none", background: C.navy, cursor: "pointer", fontSize: 13, fontFamily: "Arial, sans-serif", color: "white", fontWeight: 700 },
  periodWrap:      { display: "flex", alignItems: "center", gap: 8 },
  periodLabel:     { fontSize: 12, fontWeight: 700, color: C.navy, whiteSpace: "nowrap" },
  periodTabs:      { display: "flex", gap: 2, flexWrap: "wrap" },
  periodTab:         { padding: "4px 8px", borderRadius: 5, border: "1px solid #CBD5E1", background: "white", cursor: "pointer", fontSize: 11, fontFamily: "Arial, sans-serif", color: "#374151" },
  periodTabActive:   { padding: "4px 8px", borderRadius: 5, border: "none", background: C.red, cursor: "pointer", fontSize: 11, fontFamily: "Arial, sans-serif", color: "white", fontWeight: 700 },
  currencyLabel:     { marginLeft: "auto", color: C.navy, fontSize: 13, fontWeight: 700 },
  dsoSection:  { display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, padding: "24px 28px", background: "white", margin: "16px 28px", borderRadius: 16, boxShadow: "0 2px 12px rgba(9,42,94,0.08)" },
  dsoBlock:    { padding: "0 16px" },
  dsoDivider:  { width: 1, background: "#E5E7EB", margin: "0 8px" },
  dsoHeader:   { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 },
  dsoTitle:    { color: C.navy, fontSize: 16, fontWeight: 800, margin: 0 },
  miniCard:    { background: "#F8FAFC", borderRadius: 12, padding: "12px 16px", textAlign: "center" },
  miniTitle:   { color: C.navy, fontSize: 12, fontWeight: 700, margin: "0 0 8px" },
  row2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "0 28px 16px" },
  chartCard:   { background: "white", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 12px rgba(9,42,94,0.08)" },
  chartTitle:  { color: C.navy, fontSize: 14, fontWeight: 700, margin: "0 0 2px" },
  chartSub:    { color: C.grey, fontSize: 11, margin: "0 0 10px" },
  loadingBox:  { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" },
  spinner:     { width: 40, height: 40, border: "4px solid #E5E7EB", borderTop: `4px solid ${C.navy}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};