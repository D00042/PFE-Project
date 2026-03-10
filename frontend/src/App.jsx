import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthApp from './AuthApp'
import Accueil from './Accueil'
import DataManagement from './dataManagement'
import UserManagement from './userManagement'
import Profile from './Profile'
import ForgotPassword from './ForgotPassword'
import DashboardAccess from './components/DashboardAccess'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"              element={<AuthApp />} />
        <Route path="/home"               element={<Accueil />} />
        <Route path="/data"               element={<DataManagement />} />
        <Route path="/users"              element={<UserManagement />} />
        <Route path="/profile"            element={<Profile />} />
        <Route path="/forgot-password"    element={<ForgotPassword />} />
        <Route path="/dashboard-access"   element={<DashboardAccess />} /> 
        <Route path="/"                   element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App