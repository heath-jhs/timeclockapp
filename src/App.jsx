import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SessionContextProvider, useUser } from '@supabase/auth-helpers-react';
import { supabaseClient } from './lib/supabase';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Settings from './pages/Settings';
import EmployeeSettings from './pages/EmployeeSettings';
import InviteSetup from './pages/InviteSetup';
import Profile from './pages/Profile';
import EmployeeSplash from './pages/EmployeeSplash';
import AdminDashboard from './components/AdminDashboard';

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

function ProtectedRoute({ component: Component, isAdmin = false }) {
  const user = useUser();
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (user) {
      supabaseClient.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        setRole(data?.role);
      });
    }
  }, [user]);

  if (!user) return <Navigate to="/login" />;
  if (role === null) return <div className="p-4">Loading...</div>;
  if (isAdmin && role !== 'Admin') return <Navigate to="/dashboard" />;
  if (!isAdmin && role === 'Admin') return <Navigate to="/admin" />;
  return <Component />;
}

function App() {
  const [session, setSession] = useState(null);
  useEffect(() => {
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
            <Route path="/invite" element={<InviteSetup />} />
            <Route path="/dashboard" element={<ProtectedRoute component={EmployeeDashboard} />} />
            <Route path="/settings" element={<ProtectedRoute component={Settings} />} />
            <Route path="/employee-settings" element={<ProtectedRoute component={EmployeeSettings} />} />
            <Route path="/profile" element={<ProtectedRoute component={Profile} />} />
            <Route path="/employee" element={<ProtectedRoute component={EmployeeSplash} />} />
            <Route path="/admin" element={<ProtectedRoute component={AdminDashboard} isAdmin={true} />} />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </SessionContextProvider>
  );
}

export default App;
