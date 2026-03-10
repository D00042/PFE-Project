import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Pages
import AuthApp        from './AuthApp'
import Accueil        from './Accueil'
import DataManagement from './dataManagement'
import UserManagement from './userManagement'

// Dashboard layout (sidebar wrapper)
import DashboardLayout from './DashboardLayout'

// Dashboard pages
import ProfitabilityDashboard from './ProfitabilityDashboard'
import BalanceSheetDashboard  from './BalanceSheetDashboard'
// import CashFlowDashboard   from './CashFlowDashboard'   ← add future ones here

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public ───────────────────────────────────────────────── */}
        <Route path="/login" element={<AuthApp />} />

        {/* ── Main app pages ───────────────────────────────────────── */}
        <Route path="/home"  element={<Accueil />} />
        <Route path="/data"  element={<DataManagement />} />
        <Route path="/users" element={<UserManagement />} />

        {/* ── Dashboards (all share the sidebar via DashboardLayout) ── */}
        <Route path="/home/dashboard" element={<DashboardLayout />}>
          <Route path="profitability" element={<ProfitabilityDashboard />} />
          <Route path="balance-sheet" element={<BalanceSheetDashboard />} />
          {/* <Route path="cash-flow"   element={<CashFlowDashboard />} /> */}

          {/* Default: /home/dashboard → profitability */}
          <Route index element={<Navigate to="profitability" replace />} />
        </Route>

        {/* ── Fallbacks ─────────────────────────────────────────────── */}
        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App