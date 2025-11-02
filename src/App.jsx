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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUser(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          fetchUser(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchUser = async (sbUser) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', sbUser.id)
      .single();

    if (data && !error) {
      setUser({ ...sbUser, ...data });
    } else {
      console.error('User not found in DB:', error);
      setUser(null);
    }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center items-center h-screen text-xl">Loading...</div>;
  if (!user) return <Login />;

  if (user.role === 'admin') return <AdminDashboard user={user} />;
  if (user.role === 'employee') {
    const CurrentView = window.location.pathname === '/history' ? EmployeeHistory : EmployeeDashboard;
    return <CurrentView user={user} />;
  }

  return <div>Unauthorized</div>;
}

export default App;
