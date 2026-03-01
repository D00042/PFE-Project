import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthApp from './AuthApp'
import Accueil from './Accueil'
import DataManagement from './dataManagement'
import UserManagement from './userManagement'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthApp />} />
        <Route path="/home"  element={<Accueil />} />
        <Route path="/data"  element={<DataManagement />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/"      element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App