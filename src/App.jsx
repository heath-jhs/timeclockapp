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
    // Handle hash from magic link
    const handleHash = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (data.session) {
        fetchUserProfile(data.session.user);
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        setLoading(false);
      }
    };

    handleHash();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          fetchUserProfile(session.user);
        } else {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (sbUser) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', sbUser.id)
      .single();

    if (data) {
      setUser({ ...sbUser, ...data });
      setRole(data.role);
    }
    setLoading(false);
  };

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
