// src/App.jsx
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import EmployeeHistory from './components/EmployeeHistory';
import './index.css';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      }
    );

    // Check if session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!user) return <Login />;

  // Default to employee if no role
  const role = user.role || 'employee';

  if (role === 'admin') return <AdminDashboard user={user} />;
  if (role === 'employee') {
    const CurrentView = window.location.pathname === '/history' ? EmployeeHistory : EmployeeDashboard;
    return <CurrentView user={user} />;
  }

  return <div>Unauthorized</div>;
}
