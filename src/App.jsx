import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BrowserRouter as Router, Route, Routes, Navigate, useParams } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import SetPassword from './components/SetPassword';
const App = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [appError, setAppError] = useState(null);
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session error:', sessionError); // Debug session issues
          throw sessionError;
        }
        if (session) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error('User fetch error:', userError);
            throw userError;
          }
          console.log('Session refreshed - User ID:', user.id); // Debug active session
          setUser(user);
        } else {
          console.log('No active session - redirecting to login'); // Debug no session
          setUser(null);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        setAppError(err.message);
      }
    };
    checkSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event); // Debug auth events
      setUser(session?.user ?? null);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  const login = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: refreshed } = await supabase.auth.getUser();
      setUser(refreshed.user);
      console.log('User app_metadata:', refreshed.user.app_metadata); // Debug log
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      console.log('Logged out successfully'); // Debug logout
    } catch (err) {
      console.error('Logout error:', err);
      setAppError(err.message);
    }
  };
  if (appError) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
        <h1>App Error</h1>
        <p style={{ color: 'red' }}>{appError}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
  if (!user) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', background: '#f8f9fa' }}>
        <h1 style={{ color: '#1a202c', fontSize: '1.875rem', fontWeight: 'bold' }}>Login</h1>
        {error && <p style={{ color: '#9b2c2c', background: '#fed7d7', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }} />
        <button onClick={login} style={{ width: '100%', background: '#48bb78', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Login</button>
      </div>
    );
  }
  const role = user.app_metadata?.role || 'Employee';
  const EmployeeDashboardWrapper = () => {
    const { id } = useParams();
    if (role !== 'Admin' && id) return <Navigate to="/" />;
    return <EmployeeDashboard logout={logout} userId={id ? id : undefined} />;
  };
  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <div>Login form (as above)</div> : <Navigate to="/" />} />
        <Route path="/" element={user ? (role === 'Admin' ? <AdminDashboard logout={logout} /> : <EmployeeDashboard logout={logout} />) : <Navigate to="/login" />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/employee-dashboard/:id" element={user && role === 'Admin' ? <EmployeeDashboardWrapper /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};
export default App;
