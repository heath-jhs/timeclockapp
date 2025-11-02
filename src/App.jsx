// src/App.jsx
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import EmployeeHistory from './components/EmployeeHistory';
import './index.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let ignore = false;

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (ignore) return; // ← IGNORE DUPLICATE

        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setUser({ ...session.user, ...profile });
        } else {
          setUser(null);
        }
        ignore = true; // ← PREVENT DOUBLE CALL
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

export default App;
