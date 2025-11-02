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
      async (event, session) => {
        if (session) {
          let profile = null;
          let attempts = 0;

          // Poll until profile exists
          while (!profile && attempts < 10) {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (data) {
              profile = data;
            } else {
              await new Promise(resolve => setTimeout(resolve, 300));
              attempts++;
            }
          }

          if (profile) {
            setUser({ ...session.user, ...profile });
          }
        } else {
          setUser(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!user) return <Login />;

  if (user.role === 'admin') return <AdminDashboard user={user} />;
  if (user.role === 'employee') {
    const CurrentView = window.location.pathname === '/history' ? EmployeeHistory : EmployeeDashboard;
    return <CurrentView user={user} />;
  }

  return <div>Unauthorized</div>;
}
