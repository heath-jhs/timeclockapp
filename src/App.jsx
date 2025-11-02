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
          // Try to get profile, but don't wait if it's not there
          let profile = null;
          try {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            profile = data;
          } catch (e) {
            console.log('Profile not found yet, continuing');
          }

          // Always set user — profile is optional
          const fullUser = {
            ...session.user,
            role: profile?.role || 'employee', // Default to employee
            full_name: profile?.full_name || session.user.email.split('@')[0],
          };
          setUser(fullUser);
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
