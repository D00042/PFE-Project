import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
// Pages — all live in src/views/
import AuthApp        from './views/AuthApp'
import Accueil        from './views/Accueil'
import DataManagement from './views/dataManagement'
import UserManagement from './views/userManagement'
import Profile        from './views/Profile'
import ForgotPassword from './views/ForgotPassword'
import DashboardAccess from './views/DashboardAccess'
import AIInsightsPage from './views/AIInsightsPage'

// Dashboard layout (sidebar wrapper)
import DashboardLayout from './views/DashboardLayout'

// Dashboard pages
import ProfitabilityDashboard from './views/ProfitabilityDashboard'
import BalanceSheetDashboard  from './views/BalanceSheetDashboard'
import LiquidityDashboard     from './views/LiquidityDashboard'
import DSODPODashboard        from './views/DSODPODashboard'

function App() {
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    const user = localStorage.getItem("user")
    if (user) {
      try {
        const userData = JSON.parse(user)
        setUserRole(userData.role)
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e)
      }
    }
  }, [])

  const canViewAIInsights = userRole === 'leader' || userRole === 'manager'

  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public ───────────────────────────────────────────────── */}
        <Route path="/login"           element={<AuthApp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ── Main app pages ───────────────────────────────────────── */}
        <Route path="/home"             element={<Accueil />} />
        <Route path="/data"             element={<DataManagement />} />
        <Route path="/users"            element={<UserManagement />} />
        <Route path="/profile"          element={<Profile />} />
        <Route path="/dashboard-access" element={<DashboardAccess />} />

        {/* ── Dashboards (all share the sidebar via DashboardLayout) ── */}
        <Route path="/home/dashboard" element={<DashboardLayout />}>
          <Route path="profitability" element={<ProfitabilityDashboard />} />
          <Route path="balance-sheet" element={<BalanceSheetDashboard />} />
          <Route path="liquidity"     element={<LiquidityDashboard />} />
          <Route path="dso-dpo"       element={<DSODPODashboard />} />
          <Route path="ai-insights"   element={canViewAIInsights ? <AIInsightsPage /> : <Navigate to="profitability" replace />} />
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