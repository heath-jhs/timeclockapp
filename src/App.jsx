// src/App.jsx
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import EmployeeHistory from './components/EmployeeHistory';
import './index.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('employee');

  useEffect(() => {
    // ONLY use onAuthStateChange — reliable after login
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          setUser(session.user);
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          setRole(data?.role || 'employee');
        } else {
          setUser(null);
          setRole('employee');
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!user) return <Login />;

  if (role === 'admin') return <AdminDashboard user={user} />;
  if (role === 'employee') {
    const CurrentView = window.location.pathname === '/history' ? EmployeeHistory : EmployeeDashboard;
    return <CurrentView user={user} />;
  }

  return <div>Unauthorized</div>;
}
