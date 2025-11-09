// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate, useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import SetPassword from './components/SetPassword';

const App = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('Employee');
  const [error, setError] = useState(null);
  const [appError, setAppError] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        console.log('Checking Supabase session...');

        // Force a timeout after 8 seconds
        const timeout = setTimeout(() => {
          console.warn('Session check timed out — forcing login screen');
          if (mounted) {
            setLoadingSession(false);
            setSessionChecked(true);
          }
        }, 8000);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        clearTimeout(timeout);

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (session?.user && mounted) {
          console.log('Session found:', session.user.email);
          setUser(session.user);

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, has_password')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Profile fetch error:', profileError);
            throw profileError;
          }

          setRole(profile.role || 'Employee');

          if (!profile.has_password) {
            navigate('/set-password');
          }
        } else {
          console.log('No session — showing login');
          setUser(null);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        setAppError(`Session error: ${err.message}`);
      } finally {
        if (mounted) {
          setLoadingSession(false);
          setSessionChecked(true);
        }
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, has_password')
          .eq('id', session.user.id)
          .single();
        setRole(profile?.role || 'Employee');
        if (!profile?.has_password) {
          navigate('/set-password');
        }
      } else {
        setUser(null);
        setRole('Employee');
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const login = async () => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: refreshed } = await supabase.auth.getUser();
      setUser(refreshed.user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', refreshed.user.id)
        .single();

      setRole(profile?.role || 'Employee');
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole('Employee');
  };

  // Show error
  if (appError) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ color: '#dc2626' }}>App Error</h1>
        <p style={{ margin: '20px 0' }}>{appError}</p>
        <button onClick={() => window.location.reload()} style={{ background: '#3b82f6', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none' }}>
          Retry
        </button>
      </div>
    );
  }

  // Show loading (max 8s)
  if (loadingSession) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h2>Loading Session...</h2>
        <p style={{ color: '#6b7280', marginTop: '16px' }}>
          Open browser console (F12) if this takes too long.
        </p>
      </div>
    );
  }

  // Show login if no user
  if (!user) {
    return (
      <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>Login</h1>
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
        />
        <button 
          onClick={login}
          style={{ width: '100%', background: '#22c55e', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
        >
          Login
        </button>
      </div>
    );
  }

  const EmployeeDashboardWrapper = () => {
    const { id } = useParams();
    if (role !== 'Admin' && id) return <Navigate to="/" />;
    return <EmployeeDashboard logout={logout} userId={id} />;
  };

  return (
    <Routes>
      <Route path="/" element={role === 'Admin' || role === 'Manager' ? <AdminDashboard logout={logout} /> : <EmployeeDashboard logout={logout} />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/employee-dashboard/:id" element={<EmployeeDashboardWrapper />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
