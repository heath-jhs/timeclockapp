import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';

const App = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      }
    };
    checkSession();
  }, []);

  const login = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user);
      console.log('User metadata:', data.user.user_metadata); // Debug log
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

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

  const role = user.user_metadata?.role || 'Employee';

  return (
    <Router>
      <Routes>
        <Route path="/" element={role === 'Admin' ? <AdminDashboard logout={logout} /> : <EmployeeDashboard logout={logout} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
