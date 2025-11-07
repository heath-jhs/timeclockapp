import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import SetPassword from './components/SetPassword';

const App = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [appError, setAppError] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;

          setUser(user);

          // Get type from URL query params (global access)
          const params = new URLSearchParams(window.location.search);
          const type = params.get('type');
          if (type === 'recovery') {
            await checkPasswordStatus(user.id);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        setAppError(err.message);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const params = new URLSearchParams(window.location.search);
        const type = params.get('type');
        if (type === 'recovery') {
          await checkPasswordStatus(session.user.id);
        }
      } else {
        setUser(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const checkPasswordStatus = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('has_password')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!profile?.has_password) {
        // Stay on /set-password
        return;
      } else {
        // Password already set — redirect to dashboard
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Password check failed:', err);
    }
  };

  const login = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: refreshed } = await supabase.auth.getUser();
      setUser(refreshed.user);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setAppError(err.message);
    }
  };

  if (appError) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
        <h1>App Error</h1>
        <p style={{ color: 'red', margin: '1rem 0' }}>{appError}</p>
        <button onClick={() => window.location.reload()} style={{ padding: '0.75rem 1.5rem', background: '#4299e1', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', background: '#f8f9fa' }}>
        <h1 style={{ color: '#1a202c', fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1rem' }}>Login</h1>
        {error && (
          <p style={{ color: '#9b2c2c', background: '#fed7d7', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            {error}
          </p>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
        />
        <button
          onClick={login}
          style={{ width: '100%', background: '#48bb78', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
        >
          Login
        </button>
      </div>
    );
  }

  const role = user.app_metadata?.role || 'Employee';

  const EmployeeDashboardWrapper = () => {
    const { id } = useParams();
    if (role !== 'Admin' && id) return <Navigate to="/" />;
    return <EmployeeDashboard logout={logout} userId={id} />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={role === 'Admin' ? <AdminDashboard logout={logout} /> : <EmployeeDashboard logout={logout} />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/employee-dashboard/:id" element={<EmployeeDashboardWrapper />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
