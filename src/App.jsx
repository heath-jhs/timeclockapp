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
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser({ ...session.user, ...data });
        setRole(data.role);
      }
      setLoading(false);
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setUser({ ...session.user, ...data });
          setRole(data.role);
        } else {
          setUser(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen text-xl">Loading...</div>;
  if (!user) return <Login />;

  if (role === 'admin') return <AdminDashboard user={user} />;
  if (role === 'employee') {
    const CurrentView = window.location.pathname === '/history' ? EmployeeHistory : EmployeeDashboard;
    return <CurrentView user={user} />;
  }

  return <div>Unauthorized</div>;
}

export default App;
