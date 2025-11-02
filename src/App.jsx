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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        getRole(session.user.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setUser(session.user);
          getRole(session.user.id);
        } else {
          setUser(null);
          setRole('employee');
          // Redirect to login on logout
          window.location.href = '/';
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const getRole = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    setRole(data?.role || 'employee');
  };

  if (!user) return <Login />;

  if (role === 'admin') return <AdminDashboard user={user} />;
  if (role === 'employee') {
    const CurrentView = window.location.pathname === '/history' ? EmployeeHistory : EmployeeDashboard;
    return <CurrentView user={user} />;
  }

  return <div>Unauthorized</div>;
}
