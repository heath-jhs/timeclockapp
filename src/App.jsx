import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabaseClient } from './lib/supabase'; // Adjust if your singleton is in src/lib/supabase.js
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Settings from './pages/Settings';
import EmployeeSettings from './pages/EmployeeSettings';
import InviteSetup from './pages/InviteSetup';
import Profile from './pages/Profile';
import EmployeeSplash from './pages/EmployeeSplash';
import AdminDashboard from './components/AdminDashboard'; // Updated path to match your structure
// Import other components/pages as needed (e.g., from src/components if separate)

function App() {
  const [session, setSession] = useState(null); // Optional for global session tracking

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={session}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<EmployeeDashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/employee-settings" element={<EmployeeSettings />} />
          <Route path="/invite" element={<InviteSetup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/employee" element={<EmployeeSplash />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* Add routes for other components like src/components/ClockIn.jsx if needed */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </SessionContextProvider>
  );
}

export default App;
