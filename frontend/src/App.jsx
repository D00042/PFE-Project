import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Pages
import AuthApp        from './AuthApp'
import Accueil        from './Accueil'
import DataManagement from './dataManagement'
import UserManagement from './userManagement'
import Profile from './Profile'
import ForgotPassword from './ForgotPassword'
import DashboardAccess from './components/DashboardAccess'

// Dashboard layout (sidebar wrapper)
import DashboardLayout from './DashboardLayout'

// Dashboard pages
import ProfitabilityDashboard from './ProfitabilityDashboard'
import BalanceSheetDashboard  from './BalanceSheetDashboard'
import LiquidityDashboard from './LiquidityDashboard'
import DSODPODashboard from './DSODPODashboard'
// import CashFlowDashboard   from './CashFlowDashboard'   ← add future ones here

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public ───────────────────────────────────────────────── */}
        <Route path="/login"           element={<AuthApp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ── Main app pages ───────────────────────────────────────── */}
        <Route path="/home"    element={<Accueil />} />
        <Route path="/data"    element={<DataManagement />} />
        <Route path="/users"   element={<UserManagement />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard-access" element={<DashboardAccess />} />

        {/* ── Dashboards (all share the sidebar via DashboardLayout) ── */}
        <Route path="/home/dashboard" element={<DashboardLayout />}>
          <Route path="profitability" element={<ProfitabilityDashboard />} />
          <Route path="balance-sheet" element={<BalanceSheetDashboard />} />
          <Route path="liquidity"     element={<LiquidityDashboard />} />
          <Route path="dso-dpo" element={<DSODPODashboard />} />
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