import { useState } from 'react'
import UserManagement from './userManagement';
import DataManagement from './dataManagement';
function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <UserManagement />
      <DataManagement />
    </div>
  );
}

export default App;