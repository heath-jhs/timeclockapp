import React, { useState, useEffect } from 'react';
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
import AdminDashboard from './components/AdminDashboard'; // Correct path

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-600">Something went wrong: {this.state.error.message}. Check console for details.</div>;
    }
    return this.props.children;
  }
}

function App() {
  const [session, setSession] = useState(null);
  useEffect(() => {
    // Optional session listener for debugging
    const { data: listener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);
  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={session}>
      <ErrorBoundary>
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
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </SessionContextProvider>
  );
}

export default App;
